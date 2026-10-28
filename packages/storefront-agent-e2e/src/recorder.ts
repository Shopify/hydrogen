import type { BrowserContext } from "@playwright/test";
import { z } from "zod";

// What the shopper clicked, described the way a Playwright locator would find it again.
const clickTargetSchema = z.object({
  role: z.string().nullable(),
  name: z.string(),
  text: z.string(),
  scope: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("page") }),
    z.object({ kind: z.literal("dialog"), name: z.string() }),
    z.object({ kind: z.literal("landmark"), role: z.string() }),
  ]),
  /** Index among elements in the same scope with the same role and name, when ambiguous. */
  nth: z.number().int().nullable(),
  x: z.number(),
  y: z.number(),
  url: z.string(),
});

export type ClickTarget = z.infer<typeof clickTargetSchema>;

export type ClickRecording = {
  /** Clicks in the order the page received them. */
  readonly clicks: () => readonly ClickTarget[];
};

const BINDING = "__storefrontAgentRecordClick";

// Records each trusted click in every page of the context, before the click takes effect, so a
// click that navigates is still described. Agent clicks arrive as real input events over CDP.
export async function recordClicks(context: BrowserContext): Promise<ClickRecording> {
  const clicks: ClickTarget[] = [];
  await context.exposeBinding(BINDING, (_source, payload: unknown) => {
    const parsed = clickTargetSchema.safeParse(payload);
    if (parsed.success) clicks.push(parsed.data);
  });
  await context.addInitScript(installClickRecorder, BINDING);
  return { clicks: () => clicks };
}

// Runs in the page. Must be self-contained: Playwright serializes it into an init script.
/* oxlint-disable unicorn/consistent-function-scoping -- helpers must live inside: this function is serialized into the page */
function installClickRecorder(binding: string) {
  const flag = "__storefrontAgentRecorderInstalled";
  if (Reflect.get(window, flag)) return;
  Reflect.set(window, flag, true);

  const INTERACTIVE = [
    "a[href]",
    "button",
    "input",
    "select",
    "textarea",
    "summary",
    "[role=button]",
    "[role=link]",
    "[role=checkbox]",
    "[role=radio]",
    "[role=tab]",
    "[role=menuitem]",
    "[role=option]",
    "[role=switch]",
    "[role=combobox]",
  ].join(",");
  const LANDMARKS: Record<string, string> = {
    MAIN: "main",
    HEADER: "banner",
    NAV: "navigation",
    FOOTER: "contentinfo",
  };
  const INPUT_ROLES: Record<string, string> = {
    checkbox: "checkbox",
    radio: "radio",
    number: "spinbutton",
    range: "slider",
    search: "searchbox",
    submit: "button",
    button: "button",
    reset: "button",
  };

  const parentAcross = (node: Node): Element | null => {
    if (node.parentElement) return node.parentElement;
    const root = node.getRootNode();
    return root instanceof ShadowRoot ? root.host : null;
  };
  const closestAcross = (start: Element, test: (el: Element) => boolean): Element | null => {
    for (let el: Element | null = start; el; el = parentAcross(el)) if (test(el)) return el;
    return null;
  };
  const deepQueryAll = (root: ParentNode, selector: string): Element[] => {
    const found = [...root.querySelectorAll(selector)];
    for (const el of root.querySelectorAll("*")) {
      if (el.shadowRoot) found.push(...deepQueryAll(el.shadowRoot, selector));
    }
    return found;
  };
  const collapse = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();
  // Counts like "Cart (2 items)" change between runs; keep the stable part.
  const stable = (text: string) => collapse(text.replace(/\(\s*\d+[^)]*\)/g, " "));

  const roleOf = (el: Element): string | null => {
    const explicit = el.getAttribute("role");
    if (explicit) return explicit.split(/\s+/)[0] ?? null;
    if (el instanceof HTMLAnchorElement && el.hasAttribute("href")) return "link";
    if (el instanceof HTMLButtonElement) return "button";
    if (el instanceof HTMLSelectElement) return el.multiple ? "listbox" : "combobox";
    if (el instanceof HTMLTextAreaElement) return "textbox";
    if (el instanceof HTMLInputElement) return INPUT_ROLES[el.type] ?? "textbox";
    if (el.tagName === "DIALOG") return "dialog";
    return null;
  };
  const visibleText = (el: Element) =>
    collapse(el instanceof HTMLElement ? el.innerText : el.textContent);
  const labelledByName = (el: Element): string => {
    const labelledBy = el.getAttribute("aria-labelledby");
    if (!labelledBy) return "";
    const root = el.getRootNode();
    const byId = (id: string) =>
      (root instanceof ShadowRoot || root instanceof Document ? root.getElementById(id) : null) ??
      document.getElementById(id);
    const text = labelledBy
      .split(/\s+/)
      .map((id) => byId(id)?.textContent)
      .join(" ");
    return collapse(text);
  };
  const formControlName = (el: Element): string => {
    if (
      !(
        el instanceof HTMLInputElement ||
        el instanceof HTMLSelectElement ||
        el instanceof HTMLTextAreaElement
      )
    )
      return "";
    const fromLabel = collapse(el.labels?.[0]?.textContent);
    if (fromLabel) return fromLabel;
    return "placeholder" in el && el.placeholder ? collapse(el.placeholder) : "";
  };
  // Accessible-name sources in priority order, roughly as getByRole sees them.
  const nameOf = (el: Element): string => {
    const sources = [
      () => collapse(el.getAttribute("aria-label")),
      () => labelledByName(el),
      () => formControlName(el),
      () => visibleText(el),
      () => collapse(el.querySelector("img[alt]")?.getAttribute("alt")),
      () => collapse(el.getAttribute("title")),
    ];
    for (const source of sources) {
      const name = source();
      if (name) return name;
    }
    return "";
  };

  const scopeOf = (target: Element) => {
    const dialog = closestAcross(
      target,
      (el) => el.tagName === "DIALOG" || el.getAttribute("role") === "dialog",
    );
    if (dialog) return { el: dialog, scope: { kind: "dialog", name: stable(nameOf(dialog)) } };
    const landmark = closestAcross(target, (el) => el.tagName in LANDMARKS);
    if (landmark) {
      return { el: landmark, scope: { kind: "landmark", role: LANDMARKS[landmark.tagName] } };
    }
    return { el: document.body, scope: { kind: "page" } };
  };
  const nthAmongMatches = (
    target: Element,
    scopeEl: Element,
    role: string | null,
    name: string,
  ) => {
    if (!role) return null;
    const needle = name.toLowerCase();
    // getByRole ignores hidden elements (closed drawers, mobile nav), so .nth() must too.
    const matches = deepQueryAll(scopeEl, INTERACTIVE).filter(
      (el) =>
        el.checkVisibility() &&
        roleOf(el) === role &&
        stable(nameOf(el)).toLowerCase().includes(needle),
    );
    const index = matches.indexOf(target);
    return matches.length > 1 && index >= 0 ? index : null;
  };

  let pendingLabelControl: Element | null = null;
  document.addEventListener(
    "click",
    (event) => {
      const origin = event.composedPath()[0];
      const record: unknown = Reflect.get(window, binding);
      if (!event.isTrusted || !(origin instanceof Element) || typeof record !== "function") return;
      // Implicit form submits (Enter) are trusted clicks with detail 0: a side effect, not a click.
      if (event.detail === 0) return;
      // Clicking a <label> also fires a trusted detail-1 click on its control in the same task.
      // Record the label click only.
      if (origin === pendingLabelControl) return;
      const label = closestAcross(origin, (el) => el instanceof HTMLLabelElement);
      if (label instanceof HTMLLabelElement && label.control) {
        pendingLabelControl = label.control;
        setTimeout(() => (pendingLabelControl = null), 0);
      }
      const target = closestAcross(origin, (el) => el.matches(INTERACTIVE)) ?? origin;
      const { el: scopeEl, scope } = scopeOf(target);
      const role = roleOf(target);
      const name = stable(nameOf(target));
      record({
        role,
        name,
        text: stable(visibleText(target)).slice(0, 80),
        scope,
        nth: nthAmongMatches(target, scopeEl, role, name),
        x: Math.round(event.clientX),
        y: Math.round(event.clientY),
        url: location.href,
      });
    },
    { capture: true },
  );
}
