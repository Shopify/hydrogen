import { describe, expect, it } from "vitest";

import { acceptsCertificateInstallation } from "./certificate-prompt";

describe("acceptsCertificateInstallation", () => {
  it.each([
    ["", true],
    ["y", true],
    ["YES", true],
    ["n", false],
    ["no", false],
  ])("parses %j as %s", (answer, expected) => {
    expect(acceptsCertificateInstallation(answer)).toBe(expected);
  });
});
