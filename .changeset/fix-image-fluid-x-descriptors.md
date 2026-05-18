---
"@shopify/hydrogen-react": patch
"@shopify/hydrogen": patch
---

Fix `Image` component generating `1x/2x/3x` density descriptors instead of `w` descriptors for fluid (responsive) images whose source dimensions cap the srcset to exactly 3 entries.

**What was happening:** When a product image stored in Shopify was small enough that the default srcset ladder (200px, 400px, 600px, 800px, …) was filtered down to exactly 3 entries by the source-dimension cap, the `Image` component incorrectly switched to density descriptors (`1x`/`2x`/`3x`) and silently ignored the `sizes` attribute. On a DPR-1 screen this caused the smallest srcset entry (200px) to be used regardless of the rendered image size, resulting in blurry images.

**The fix:** Descriptor type (density vs width) is now determined by whether the image is in fixed or fluid mode — not by how many srcset entries happen to survive source-dimension filtering.
