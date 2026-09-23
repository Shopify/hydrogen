import assert from "node:assert/strict";
import test from "node:test";

import { createRequestSessionManager } from "../app/lib/session.ts";

const SECRET = "test-session-secret-that-is-long-enough";
const ORIGIN = "https://shop.example";

async function commitCookie(manager: Awaited<ReturnType<typeof createRequestSessionManager>>) {
  const headers = new Headers((await manager.commit?.()) ?? undefined);
  return headers.get("set-cookie");
}

function requestWithCookie(setCookie: string | null) {
  const cookie = setCookie?.split(";")[0];
  return new Request(ORIGIN, { headers: cookie ? { cookie } : {} });
}

test("round-trips session items through a signed, HttpOnly cookie", async () => {
  const first = await createRequestSessionManager(new Request(ORIGIN), SECRET);
  assert.equal(first.getSessionOrigin(), ORIGIN);
  await first.setSessionItem("customerAccount", { tokens: { accessToken: "token" } });

  const setCookie = await commitCookie(first);
  assert.match(setCookie ?? "", /^__Host-session=/);
  assert.match(setCookie ?? "", /HttpOnly/);
  assert.match(setCookie ?? "", /Secure/);

  const second = await createRequestSessionManager(requestWithCookie(setCookie), SECRET);
  assert.deepEqual(await second.getSessionItem("customerAccount"), {
    tokens: { accessToken: "token" },
  });
});

test("does not write a cookie when the session is unchanged", async () => {
  const manager = await createRequestSessionManager(new Request(ORIGIN), SECRET);
  assert.equal(await commitCookie(manager), null);
});

test("expires the cookie once the last item is removed", async () => {
  const first = await createRequestSessionManager(new Request(ORIGIN), SECRET);
  await first.setSessionItem("customerAccount", {});
  const setCookie = await commitCookie(first);

  const second = await createRequestSessionManager(requestWithCookie(setCookie), SECRET);
  await second.removeSessionItem("customerAccount");
  assert.match((await commitCookie(second)) ?? "", /Max-Age=0/);
});

test("ignores cookies signed with a different secret", async () => {
  const first = await createRequestSessionManager(new Request(ORIGIN), SECRET);
  await first.setSessionItem("customerAccount", {});
  const setCookie = await commitCookie(first);

  const second = await createRequestSessionManager(
    requestWithCookie(setCookie),
    "a-different-secret-that-is-long-enough",
  );
  assert.equal(await second.getSessionItem("customerAccount"), undefined);
});
