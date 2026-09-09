import { expect, setTestStore, test } from "../../fixtures";

setTestStore("hydrogenPreviewStorefront");

test.describe("Subrequest cache", () => {
  test("caches Storefront API fetches and exposes Cache-Status", async ({ request }) => {
    const key = `subrequest-cache-${Date.now()}-${Math.random()}`;
    const path = `/e2e/subrequest-cache?key=${encodeURIComponent(key)}&country=US`;

    const first = await request.get(path);
    expect(first.ok()).toBe(true);
    expect(first.headers()["cache-status"]).toContain("Hydrogen; fwd=uri-miss; stored");

    const firstBody = await first.json();
    expect(firstBody.data.shop.name).toBeTruthy();

    const second = await request.get(path);
    expect(second.ok()).toBe(true);
    expect(second.headers()["cache-status"]).toContain("Hydrogen; hit");
    await expect(second.json()).resolves.toEqual(firstBody);

    const differentVariables = await request.get(
      `/e2e/subrequest-cache?key=${encodeURIComponent(key)}&country=CA`,
    );
    expect(differentVariables.ok()).toBe(true);
    expect(differentVariables.headers()["cache-status"]).toContain(
      "Hydrogen; fwd=uri-miss; stored",
    );
  });
});
