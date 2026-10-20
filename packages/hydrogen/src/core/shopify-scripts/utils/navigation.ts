const navigationCallbacks = new Set<() => void>();
let stopObservingNavigation: (() => void) | undefined;

export function observeNavigation(callback: () => void) {
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
    navigation.addEventListener("currententrychange", notifyNavigationCallbacks);
    return () => navigation.removeEventListener("currententrychange", notifyNavigationCallbacks);
  }

  const restorePushState = patchHistoryMethod("pushState");
  const restoreReplaceState = patchHistoryMethod("replaceState");
  window.addEventListener("popstate", notifyNavigationCallbacks);

  return () => {
    restorePushState();
    restoreReplaceState();
    window.removeEventListener("popstate", notifyNavigationCallbacks);
  };
}

function notifyNavigationCallbacks() {
  for (const callback of navigationCallbacks) callback();
}

function patchHistoryMethod(method: "pushState" | "replaceState") {
  const original = window.history[method];
  const patched: History[typeof method] = function (this: History, data, unused, url) {
    original.call(this, data, unused, url);
    notifyNavigationCallbacks();
  };

  window.history[method] = patched;

  return () => {
    if (window.history[method] === patched) window.history[method] = original;
  };
}
