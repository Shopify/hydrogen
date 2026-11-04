import { expectTypeOf, it } from "vitest";

import {
  createContentSecurityPolicy,
  getShopifyCspDirectives,
  type CreateContentSecurityPolicyOptions,
} from "../index";

it("accepts immutable source arrays and exposes response header application", () => {
  const policy = createContentSecurityPolicy({
    directives: { scriptSrc: ["'self'"] as const, frameAncestors: null, upgradeInsecureRequests: true },
  });
  expectTypeOf(policy.nonce).toEqualTypeOf<string>();
  expectTypeOf(policy.header).toEqualTypeOf<string>();
  expectTypeOf(policy.applyResponseHeaders).toEqualTypeOf<(headers: Headers) => void>();
  expectTypeOf(getShopifyCspDirectives().scriptSrc).toEqualTypeOf<string[]>();
});

it("infers nonce mode for default, disabled, and broad options", () => {
  expectTypeOf(createContentSecurityPolicy().nonce).toEqualTypeOf<string>();
  expectTypeOf(createContentSecurityPolicy({}).nonce).toEqualTypeOf<string>();
  expectTypeOf(createContentSecurityPolicy({ nonce: undefined }).nonce).toEqualTypeOf<string>();
  expectTypeOf(createContentSecurityPolicy({ nonce: false }).nonce).toEqualTypeOf<undefined>();

  const nonce: false | undefined = Math.random() > 0.5 ? false : undefined;
  const options: CreateContentSecurityPolicyOptions = { nonce };
  expectTypeOf(createContentSecurityPolicy(options).nonce).toEqualTypeOf<string | undefined>();
  expectTypeOf(createContentSecurityPolicy({ nonce }).nonce).toEqualTypeOf<string | undefined>();

  const optionalOptions: CreateContentSecurityPolicyOptions | undefined =
    Math.random() > 0.5 ? options : undefined;
  expectTypeOf(createContentSecurityPolicy(optionalOptions).nonce).toEqualTypeOf<string | undefined>();
});

it("rejects ambiguous directive values and unsupported option names", () => {
  // @ts-expect-error development defaults are selected through package exports
  () => getShopifyCspDirectives({}, { development: true });
  // @ts-expect-error source lists must be arrays, not whitespace-separated strings
  () => createContentSecurityPolicy({ directives: { scriptSrc: "'self'" } });
  // @ts-expect-error flags are booleans
  () => createContentSecurityPolicy({ directives: { upgradeInsecureRequests: [] } });
  // @ts-expect-error source lists are not boolean flags
  () => createContentSecurityPolicy({ directives: { connectSrc: true } });
  // @ts-expect-error overrides belong under directives
  () => createContentSecurityPolicy({ scriptSrc: ["'self'"] });
  // @ts-expect-error nonce generation is enabled by default rather than with true
  () => createContentSecurityPolicy({ nonce: true });
  // @ts-expect-error caller-supplied nonces are not accepted
  () => createContentSecurityPolicy({ nonce: "manual-nonce" });
  // @ts-expect-error directives are an object, not a callback
  () => createContentSecurityPolicy({ directives: () => ({ connectSrc: [] }) });
});
