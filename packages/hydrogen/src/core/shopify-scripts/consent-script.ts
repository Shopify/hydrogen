import type { ShopifyGlobal } from "../../globals";
import type { ConsentConfig } from "../analytics/types";

type RuntimeCustomerPrivacy = Partial<NonNullable<ShopifyGlobal["customerPrivacy"]>>;
type RuntimeShopifyGlobal = Partial<Omit<ShopifyGlobal, "customerPrivacy">> & {
  customerPrivacy?: RuntimeCustomerPrivacy;
};
type VisitorConsentEventDetail = {
  source?: "initial" | "interaction";
};

export type ShopifyConsentTrackingConfig = {
  eventName: string;
  mode: NonNullable<ConsentConfig["mode"]>;
  scriptId: string;
};

function isVisitorConsentEventDetail(value: unknown): value is VisitorConsentEventDetail {
  return typeof value === "object" && value !== null;
}

// This module is serialized and inlined into every HTML response; importing
// the logging module would inline it too. Hardcode the sink's prefix instead.
function logConsentError(message: string, error?: unknown) {
  const args: unknown[] = [`[hydrogen:error:consent] ${message}`];
  if (error !== undefined) args.push(error);
  // oxlint-disable-next-line no-console -- Sanctioned exception: serialized inline script (see skills/error-reporting).
  console.error(...args);
}

export default function initializeShopifyConsentTracking(config: ShopifyConsentTrackingConfig) {
  const shopifyWindow: Window & { Shopify?: RuntimeShopifyGlobal } = window;
  const usesDefaultBanner = config.mode === "default-banner";

  // The consent event and the script element load event can arrive in either
  // order. Remote script code runs before its script element dispatches "load",
  // so privacy-banner can emit visitorConsentCollected while load is still pending.
  let consentScriptReady = false;
  let consentGateReady = false;
  let nextConsentEventSource: "initial" | "interaction" = "initial";

  const getCustomerPrivacy = () => shopifyWindow.Shopify?.customerPrivacy;

  const markConsentStatusLoaded = () => {
    const privacy = getCustomerPrivacy();
    if (privacy) privacy.consentStatus = "loaded";
  };

  const markConsentReady = () => {
    consentGateReady = true;
    if (consentScriptReady) markConsentStatusLoaded();
  };

  const requestInitialConsent = () => {
    const setTrackingConsent = getCustomerPrivacy()?.setTrackingConsent;
    if (typeof setTrackingConsent !== "function") {
      logConsentError("unable to request initial consent");
      return markConsentReady();
    }

    setTrackingConsent({ headlessStorefront: true }, (result) => {
      if (result?.error) {
        logConsentError("unable to request initial consent", result.error);
        return;
      }

      markConsentReady();
    });
  };

  const isConsentApiReady = () => {
    const privacy = getCustomerPrivacy();

    return (
      typeof privacy?.setTrackingConsent === "function" ||
      typeof privacy?.shouldShowBanner === "function" ||
      typeof window.privacyBanner === "object"
    );
  };

  const handleConsentScriptReady = () => {
    if (consentScriptReady) return;
    consentScriptReady = true;

    if (!usesDefaultBanner) {
      requestInitialConsent();
    } else if (consentGateReady) {
      // In default-banner mode, privacy-banner owns the initial consent request.
      // If it emitted the consent event during script execution, finish marking
      // consent loaded now that the script element load event has fired.
      markConsentReady();
    }
  };

  // Annotate the event so that other scripts can know if the consent was collected
  // from the initial page load or from a user interaction.
  // This will be done in consent-tracking-api library eventually.
  document.addEventListener(
    config.eventName,
    (event) => {
      const detail = "detail" in event ? event.detail : undefined;
      if (isVisitorConsentEventDetail(detail)) {
        detail.source ??= nextConsentEventSource;
      }

      nextConsentEventSource = "interaction";
    },
    { capture: true },
  );

  // consentStatus only means the initial consent state is available. Analytics
  // replay still decides separately whether an initial banner event is actionable.
  document.addEventListener(config.eventName, markConsentReady, { capture: true });

  const consentScript = document.getElementById(config.scriptId);
  if (isConsentApiReady()) {
    handleConsentScriptReady();
  } else {
    // ShopifyScripts renders this inline bootstrap immediately after the async
    // consent script tag, so the tag is already in the DOM and can be observed.
    consentScript?.addEventListener("load", handleConsentScriptReady, { once: true });
  }
}
