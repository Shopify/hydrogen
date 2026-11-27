/** How the current history entry changed, when the browser reports it. */
type HistoryChangeType = "push" | "replace" | "reload" | "traverse";

type NavigationCallback = (type: HistoryChangeType | undefined) => void;

const navigationCallbacks = new Set<NavigationCallback>();
let stopObservingNavigation: (() => void) | undefined;

export function observeNavigation(callback: NavigationCallback) {
  navigationCallbacks.add(callback);
  stopObservingNavigation ??= startObservingNavigation();

  return () => {
    navigationCallbacks.delete(callback);
    if (navigationCallbacks.size > 0) return;

    stopObservingNavigation?.();
    stopObservingNavigation = undefined;
  };
}

function startObservingNavigation() {
  const navigation = Reflect.get(window, "navigation");
  if (navigation instanceof EventTarget) {
    const onCurrentEntryChange = (event: Event) =>
      notifyNavigationCallbacks(toHistoryChangeType(Reflect.get(event, "navigationType")));
    navigation.addEventListener("currententrychange", onCurrentEntryChange);
    return () => navigation.removeEventListener("currententrychange", onCurrentEntryChange);
  }

  const restorePushState = patchHistoryMethod("pushState");
  const restoreReplaceState = patchHistoryMethod("replaceState");
  const onPopState = () => notifyNavigationCallbacks("traverse");
  window.addEventListener("popstate", onPopState);

  return () => {
    restorePushState();
    restoreReplaceState();
    window.removeEventListener("popstate", onPopState);
  };
}

function toHistoryChangeType(value: unknown): HistoryChangeType | undefined {
  return value === "push" || value === "replace" || value === "reload" || value === "traverse"
    ? value
    : undefined;
}

function notifyNavigationCallbacks(type: HistoryChangeType | undefined) {
  for (const callback of navigationCallbacks) callback(type);
}

function patchHistoryMethod(method: "pushState" | "replaceState") {
  const original = window.history[method];
  const patched: History[typeof method] = function (this: History, data, unused, url) {
    original.call(this, data, unused, url);
    notifyNavigationCallbacks(method === "pushState" ? "push" : "replace");
  };

  window.history[method] = patched;

  return () => {
    if (window.history[method] === patched) window.history[method] = original;
  };
}
