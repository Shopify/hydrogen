import "server-only";
import { isCustomerLoggedIn } from "@/lib/customer-account";
import { isCustomerAccountsAvailable } from "@/lib/storefront-config";

const accountLinkClassName =
  "button-icon focus-visible:outline-accent inline-flex h-11 w-11 items-center justify-center rounded no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition motion-safe:active:scale-[0.97] hover:opacity-70";

/**
 * Header account link — an async Server Component resolved under `<Suspense>`
 * by `AppShell`. Uses plain `<a>` (not `next/link`) for both `/account` and
 * `/account/login`: `/account/login` is a Hydrogen-owned route intercepted in
 * `proxy.ts` (no app route file), and a `next/link` client-side RSC navigation
 * is fragile when the proxy responds to an RSC data fetch with a 303-to-
 * external. A plain `<a>` forces a full-page navigation the proxy intercepts
 * cleanly — the native choice for handler-intercepted paths.
 *
 * `/account/login` only exists when Customer Account handlers are registered.
 * Keep the icon visible for mock/unconfigured stores by linking to `/account`,
 * where the page explains the required setup.
 */
export async function HeaderAccountLink() {
  const available = isCustomerAccountsAvailable(); // sync — no await
  if (!available) return <AccountIconLink href="/account" label="Account" />;

  const loggedIn = await isCustomerLoggedIn();
  if (loggedIn) return <AccountIconLink href="/account" label="Account" />;

  return <AccountIconLink href="/account/login" label="Log in" />;
}

function AccountIconLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className={accountLinkClassName} aria-label={label}>
      <img
        src="/icons/icon-user.svg"
        width="20"
        height="20"
        alt=""
        className="size-5"
        aria-hidden="true"
      />
    </a>
  );
}

export function HeaderAccountLinkFallback() {
  // Icon-sized placeholder (not the word "Account"): the resolved link renders
  // a 20px user icon, so showing text here would flash and swap to an icon.
  // A dimmed icon matches the header's icon-button sizing.
  return (
    <span
      role="status"
      aria-live="polite"
      aria-busy
      aria-label="Loading account"
      className="inline-flex h-11 w-11 items-center justify-center opacity-40"
    >
      <img
        src="/icons/icon-user.svg"
        width="20"
        height="20"
        alt=""
        className="size-5"
        aria-hidden="true"
      />
    </span>
  );
}
