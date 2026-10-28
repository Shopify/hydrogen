// Language the agent uses when the store did not do what it expected and it had to correct or
// work around something. A passing run with any of these passed "with friction": the shopper
// could finish, but something was off, and that should be visible rather than a plain PASS.
const FRICTION_PATTERNS: readonly RegExp[] = [
  /\bonly (?:1|one) item\b/i,
  /\b(?:still|again) (?:shows?|showing|says|has)\b/i,
  /\binstead of\b/i,
  /\b(?:wrong|incorrect|unexpected)\b/i,
  /\berror\b/i,
  /\b(?:didn'?t|did not|doesn'?t|does not) (?:seem to )?(?:work|change|update|respond)\b/i,
  /\btry (?:again|once more|a different|another)\b/i,
  /\bnot (?:where|what) I expected\b/i,
];

/** Returns the agent notes that show it correcting or working around the store. */
export function detectFriction(thoughts: readonly string[]): string[] {
  return thoughts.filter((thought) => FRICTION_PATTERNS.some((pattern) => pattern.test(thought)));
}
