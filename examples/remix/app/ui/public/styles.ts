import { css } from "remix/component";

/** A button or link without browser chrome, such as an aside's close button. */
export const resetButton = css({
  background: "inherit",
  border: "0",
  fontSize: "inherit",
  "& > *": { margin: "0" },
  "&:not(:has(> *))": { height: "1.5rem", lineHeight: "1.5rem" },
  "&:hover:not(:has(> *))": { cursor: "pointer", textDecoration: "underline" },
});

/** A header or mobile menu link. */
export const menuItem = css({ cursor: "pointer" });
