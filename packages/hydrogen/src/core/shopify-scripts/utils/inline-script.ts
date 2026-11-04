type InlineScriptSource = (...args: never[]) => unknown;

type InlineScript<T extends InlineScriptSource> = {
  readonly code: string;
  serializeConfig(config: NonNullable<Parameters<T>[0]>): string;
};

export function asInlineScript<T extends InlineScriptSource>(script: T): InlineScript<T>;
export function asInlineScript(script: InlineScriptSource): unknown {
  return { code: script, serializeConfig: JSON.stringify };
}
