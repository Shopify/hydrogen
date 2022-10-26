import * as RTL from "@testing-library/react";
import * as Mocks from "~/mocks";

import * as RemixReact from "@remix-run/react";

export default function About() {
  return (
    <main>
      <h1>About Page</h1>
      <p>
        <RemixReact.Link to="..">Go back home.</RemixReact.Link>
      </p>
    </main>
  );
}

if (process.env.NODE_ENV === "test" && import.meta.vitest) {
  let { describe, test, expect, vi } = import.meta.vitest;

  vi.mock("@remix-run/react", () =>
    Mocks.createRemixReactMock({ path: "/about" })
  );

  describe("component", () => {
    test("renders link back home", () => {
      let { getByRole } = RTL.render(<About />);
      expect(getByRole("link").getAttribute("href")).toBe("/");
    });
  });
}
