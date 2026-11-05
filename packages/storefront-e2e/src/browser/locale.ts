import { randomUUID } from "node:crypto";

import type { Page } from "playwright-core";

import type { EvidenceRecord } from "../evidence.ts";
import { LocaleUnavailableError } from "../storefront-locale-error.ts";
import { isRecord } from "./cdp.ts";
import type { BrowserSession } from "./session.ts";

/** Country (ISO 3166-1 alpha-2) and Storefront API `LanguageCode` of the storefront page. */
export type StorefrontLocale = { country: string; language: string };

/** Evidence kind of locale observations of the main tested page. */
export const STOREFRONT_LOCALE_KIND = "storefront-locale";

const READ_TIMEOUT_MS = 5_000;
const READ_RETRY_MS = 100;
const OBSERVE_INTERVAL_MS = 250;
const MAX_RAW_LENGTH = 64;

// Storefront API `LanguageCode` values.
const LANGUAGE_CODES = new Set(
  (
    "AF AK AM AR AS AZ BE BG BM BN BO BR BS CA CE CKB CS CU CY DA DE DZ EE EL EN EO ES ET EU FA " +
    "FF FI FIL FO FR FY GA GD GL GU GV HA HE HI HR HU HY IA ID IG II IS IT JA JV KA KI KK KL KM " +
    "KN KO KS KU KW KY LA LB LG LN LO LT LU LV MG MI MK ML MN MO MR MS MT MY NB ND NE NL NN NO OM " +
    "OR OS PA PL PS PT PT_BR PT_PT QU RM RN RO RU RW SA SC SD SE SG SH SI SK SL SN SO SQ SR SU SV " +
    "SW TA TE TG TH TI TK TO TR TT UG UK UR UZ VI VO WO XH YI YO ZH ZH_CN ZH_TW ZU"
  ).split(" "),
);
// BCP 47 shape: language, optional script, optional region, optional variants.
const LANGUAGE_TAG =
  /^([a-z]{2,3})(?:[-_]([a-z]{4}))?(?:[-_]([a-z]{2}|\d{3}))?(?:[-_](?:[a-z\d]{5,8}|\d[a-z\d]{3}))*$/i;

/**
 * Reads the standard public Shopify globals in the page. `Shopify.locale` is the storefront
 * language. `Shopify.language` is used only when `Shopify.locale` is not set. It never writes
 * to the page. Each value is reported as absent (undefined or null), a bounded string, or
 * invalid (any other type), so a partial or invalid value is never mistaken for an absent one.
 * Returns `undefined` when reading the globals throws.
 */
const READ_SOURCE = `() => {
  const field = (value) =>
    value === undefined || value === null
      ? { state: "absent" }
      : typeof value === "string"
        ? { state: "string", value: value.slice(0, ${MAX_RAW_LENGTH}) }
        : { state: "invalid" };
  try {
    const shopify = window.Shopify;
    if (shopify === undefined || shopify === null) {
      return { country: { state: "absent" }, language: { state: "absent" } };
    }
    if (typeof shopify !== "object") {
      return { country: { state: "invalid" }, language: { state: "invalid" } };
    }
    const locale = shopify.locale;
    const language = locale === undefined || locale === null ? shopify.language : locale;
    return { country: field(shopify.country), language: field(language) };
  } catch {
    return undefined;
  }
}`;

/** One Shopify global, as reported by the page. Only bounded primitives leave the page. */
type RawField = { state: "absent" } | { state: "string"; value: string } | { state: "invalid" };
type RawLocale = { country: RawField; language: RawField };

/**
 * Normalizes raw storefront values to an ISO country code and a Storefront API language code:
 * `us` becomes `US`, `en` and `en-US` become `EN`, `pt-BR` becomes `PT_BR`, `zh-Hant-TW` becomes
 * `ZH_TW`. Returns `undefined` for values that are not valid codes. It does not guess.
 */
export function normalizeStorefrontLocale(raw: {
  country: unknown;
  language: unknown;
}): StorefrontLocale | undefined {
  const country = typeof raw.country === "string" ? raw.country.trim() : "";
  const language = typeof raw.language === "string" ? normalizeLanguage(raw.language.trim()) : "";
  if (!/^[a-z]{2}$/i.test(country) || language === undefined || language === "") return undefined;
  return { country: country.toUpperCase(), language };
}

function normalizeLanguage(tag: string): string | undefined {
  const match = LANGUAGE_TAG.exec(tag);
  const primary = match?.[1]?.toUpperCase();
  if (primary === undefined) return undefined;
  const region = match?.[3]?.toUpperCase();
  const regional = region === undefined ? undefined : `${primary}_${region}`;
  if (regional !== undefined && LANGUAGE_CODES.has(regional)) return regional;
  return LANGUAGE_CODES.has(primary) ? primary : undefined;
}

/**
 * Reads the locale of the storefront page in `session.page` from `window.Shopify.country` and
 * `window.Shopify.locale`. Waits up to 5 seconds for the storefront to set them. It never falls
 * back to a default or to the browser language. When no valid pair is read, it throws:
 *
 * - {@link LocaleUnavailableError} only when the last read succeeded, both values were absent,
 *   and no read saw any value;
 * - another `Error` when a read saw a partial or invalid value (it is not an absence), or when
 *   the page did not answer, closed, or threw on the last read.
 */
export async function readStorefrontLocale(session: BrowserSession): Promise<StorefrontLocale> {
  const { page } = session;
  const deadline = Date.now() + READ_TIMEOUT_MS;
  let invalid: RawLocale | undefined;
  let lastAbsent = false;
  for (;;) {
    const remaining = deadline - Date.now();
    if (remaining <= 0 || page.isClosed()) break;
    const raw = await readOnce(page, remaining);
    lastAbsent =
      raw !== undefined && raw.country.state === "absent" && raw.language.state === "absent";
    if (raw !== undefined && !lastAbsent) {
      const locale = normalizeStorefrontLocale({
        country: fieldValue(raw.country),
        language: fieldValue(raw.language),
      });
      if (locale !== undefined) return locale;
      invalid = raw;
    }
    await delay(Math.min(READ_RETRY_MS, Math.max(0, deadline - Date.now())));
  }
  if (invalid !== undefined) {
    throw new Error(
      `Storefront locale is not valid: window.Shopify.country ${describe(invalid.country)} and locale ${describe(invalid.language)} are not a supported country and Storefront API language.`,
    );
  }
  if (lastAbsent && !page.isClosed()) {
    throw new LocaleUnavailableError();
  }
  throw new Error(
    "Storefront locale is not readable: the page did not answer, closed, or failed to evaluate within 5 seconds.",
  );
}

function fieldValue(field: RawField): string | undefined {
  return field.state === "string" ? field.value : undefined;
}

export interface LocaleObserver {
  /** Stops recording. Later observations are ignored. */
  stop(): void;
}

/**
 * Records `storefront-locale` evidence when the locale of the main frame of `page` changes.
 * Install it before the first navigation. The page script runs in every new top-level document
 * of this page only (not popups or frames). It reads on `DOMContentLoaded`, `pageshow`,
 * `shopify:page:view`, and every 250 ms, and reports only readable values that differ from the
 * last report of the document. A document without the globals (for example a blocked checkout
 * error page) reports nothing, so the last record stays the most recent known locale.
 */
export async function installLocaleObserver(
  page: Page,
  emit: (record: EvidenceRecord) => void,
): Promise<LocaleObserver> {
  const bindingName = `__storefrontE2ELocale${randomUUID().replaceAll("-", "")}`;
  let stopped = false;
  let last: string | undefined;
  await page.exposeBinding(bindingName, (source, payload: unknown) => {
    if (stopped || source.page !== page || source.frame !== page.mainFrame()) return;
    if (!isRecord(payload)) return;
    const locale = normalizeStorefrontLocale({
      country: payload.country,
      language: payload.language,
    });
    if (locale === undefined) return;
    const key = `${locale.country}|${locale.language}`;
    if (key === last) return;
    last = key;
    emit({
      kind: STOREFRONT_LOCALE_KIND,
      timestamp: Date.now(),
      data: { ...locale, url: pageUrl(payload.url) },
    });
  });
  await page.addInitScript({ content: observerScript(bindingName) });
  return {
    stop: () => {
      stopped = true;
    },
  };
}

function observerScript(bindingName: string): string {
  return `(() => {
  if (window.top !== window) return;
  const binding = ${JSON.stringify(bindingName)};
  const read = ${READ_SOURCE};
  let last;
  const check = () => {
    const raw = read();
    if (!raw || raw.country.state !== "string" || raw.language.state !== "string") return;
    const value = { country: raw.country.value, language: raw.language.value };
    const key = value.country + "|" + value.language;
    const send = window[binding];
    if (key === last || typeof send !== "function") return;
    last = key;
    try {
      const sent = send({ country: value.country, language: value.language, url: location.href });
      if (sent && typeof sent.catch === "function") sent.catch(() => {});
    } catch {}
  };
  const options = { capture: true, passive: true };
  addEventListener("DOMContentLoaded", check, options);
  addEventListener("pageshow", () => { last = undefined; check(); }, options);
  addEventListener("shopify:page:view", check, options);
  setInterval(check, ${OBSERVE_INTERVAL_MS});
  check();
})()`;
}

/** One read. `undefined` when the page did not answer in time, threw, or closed. */
async function readOnce(page: Page, timeoutMs: number): Promise<RawLocale | undefined> {
  const evaluation = page.evaluate<unknown>(`(${READ_SOURCE})()`);
  // A page that never answers (navigation, hung script) must not outlive the deadline.
  evaluation.catch(() => undefined);
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => resolve(undefined), timeoutMs);
  });
  try {
    const value = await Promise.race([evaluation, timeout]);
    if (!isRecord(value)) return undefined;
    const country = rawField(value.country);
    const language = rawField(value.language);
    return country === undefined || language === undefined ? undefined : { country, language };
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

function rawField(value: unknown): RawField | undefined {
  if (!isRecord(value)) return undefined;
  if (value.state === "absent" || value.state === "invalid") return { state: value.state };
  return value.state === "string" && typeof value.value === "string"
    ? { state: "string", value: value.value.slice(0, MAX_RAW_LENGTH) }
    : undefined;
}

/** Origin and path only. Query strings and fragments can hold tokens. */
function pageUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "";
  }
}

function describe(field: RawField): string {
  if (field.state === "absent") return "(missing)";
  return field.state === "string" && /^[\w-]{1,35}$/.test(field.value)
    ? JSON.stringify(field.value)
    : "(unreadable)";
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
