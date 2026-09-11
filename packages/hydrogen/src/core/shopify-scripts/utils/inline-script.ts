type InlineScriptSource = (...args: never[]) => unknown;

type InlineScriptFactory<T extends InlineScriptSource> = (...args: Parameters<T>) => string;

export function asInlineScript<T extends InlineScriptSource>(script: T): InlineScriptFactory<T>;
export function asInlineScript(script: InlineScriptSource) {
  return script;
}
