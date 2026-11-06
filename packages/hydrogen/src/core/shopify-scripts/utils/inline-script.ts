type InlineScriptSource = (...args: never[]) => unknown;

type InlineScript<T extends InlineScriptSource> = {
  readonly code: string;
  attributes(config: NonNullable<Parameters<T>[0]>): { "data-config": string };
};

export function asInlineScript<T extends InlineScriptSource>(script: T): InlineScript<T>;
export function asInlineScript(script: InlineScriptSource): unknown {
  return {
    code: script,
    attributes: (config: unknown) => ({
      "data-config": JSON.stringify(config),
    }),
  };
}
