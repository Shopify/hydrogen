import type { Page } from "@playwright/test";

export const AGENT_VIEWPORT = { width: 1280, height: 800 } as const;

// Stagehand screenshots the real browser window, so Playwright's viewport emulation must be off
// (viewport: null) and the window itself sized so its content area is exactly the agent viewport.
// Window chrome differs by platform, so measure it instead of hard-coding a window size.
export async function sizeWindowToViewport(page: Page): Promise<void> {
  const session = await page.context().newCDPSession(page);
  try {
    const { windowId } = await session.send("Browser.getWindowForTarget");
    const measure = () =>
      page.evaluate(() => ({
        chromeWidth: outerWidth - innerWidth,
        chromeHeight: outerHeight - innerHeight,
      }));
    const { chromeWidth, chromeHeight } = await measure();
    await session.send("Browser.setWindowBounds", {
      windowId,
      bounds: {
        width: AGENT_VIEWPORT.width + chromeWidth,
        height: AGENT_VIEWPORT.height + chromeHeight,
      },
    });
    const actual = await page.evaluate(() => `${innerWidth}x${innerHeight}`);
    const wanted = `${AGENT_VIEWPORT.width}x${AGENT_VIEWPORT.height}`;
    if (actual !== wanted)
      throw new Error(`Window content is ${actual} after resizing, wanted ${wanted}`);
  } finally {
    await session.detach().catch(() => undefined);
  }
}
