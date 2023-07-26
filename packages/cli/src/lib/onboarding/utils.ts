interface Global {
  Deno?: {
    version: {
      typescript: string;
    };
  };
}

export function isDenoSupported() {
  return Number((globalThis as Global).Deno?.version?.typescript[0]) >= 5;
}

export function denoBuild(dir: string) {
  throw new Error('Not implemented');
}
