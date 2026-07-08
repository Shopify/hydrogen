export function createRequestSessionManager(request: Request) {
  const data = new Map<string, unknown>();
  const origin = new URL(request.url).origin;

  return {
    getSessionOrigin() {
      return origin;
    },
    getSessionItem(key: string) {
      return data.get(key);
    },
    setSessionItem(key: string, value: unknown) {
      data.set(key, value);
    },
    removeSessionItem(key: string) {
      data.delete(key);
    },
  };
}
