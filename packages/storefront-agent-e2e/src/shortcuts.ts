import type { AgentStep } from "./agent";

// Typed text a shopper would only type into an address bar.
const URL_LIKE =
  /^\s*(?:https?:\/\/|www\.|\/[\w-]|(?:[\w-]+\.)+(?:com|net|org|io|shop|store|app|dev)\b)/i;
// Browser chrome shortcuts: address bar, new tab/window, devtools, view source.
const BROWSER_SHORTCUT =
  /(?:^|[+\s])(?:ctrl|cmd|meta|super|alt)\+(?:l|t|n|d|u|shift\+[ijc])\b|^\s*f(?:6|12)\s*$/i;

/**
 * Lists steps where the agent tried to leave the page's own UI: typing an address or using a
 * browser shortcut. A run with any of these says nothing about whether the storefront works.
 */
export function findShortcuts(steps: readonly AgentStep[]): string[] {
  return steps.flatMap((step, index) => {
    const label = `step ${index + 1} ${step.action}`;
    if (step.action === "type") {
      const text = typeof step.args.text === "string" ? step.args.text : "";
      return URL_LIKE.test(text) ? [`${label}: typed "${text}"`] : [];
    }
    if (step.action === "keypress") {
      const keys = Array.isArray(step.args.keys) ? step.args.keys : [step.args.text];
      const combos = keys.filter((key): key is string => typeof key === "string");
      return combos.some((combo) => BROWSER_SHORTCUT.test(combo))
        ? [`${label}: pressed ${combos.join(" ")}`]
        : [];
    }
    return [];
  });
}
