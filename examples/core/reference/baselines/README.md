# CORE reference baselines

These PNGs are **fresh CORE reference render anchors** for the example
visual-review loop. They are non-authoritative, regenerable, and never
pixel-diff targets. The authoritative fidelity sources remain the CORE reference
HTML in `examples/core/reference/*.html` and the page checklists in
`examples/core/notes/*.md`.

Regenerate with:

```bash
cd gates/<framework>
pnpm gate:reference
# or run pnpm gate:capture, which refreshes these before app screenshots
```

Regeneration requires network access to jsDelivr because the reference HTML uses
CDN Tailwind (`https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4`). If the CDN
is unavailable, keep this directory and run the script again from an environment
with network access. Do **not** fake placeholder PNGs.

Expected files are one per page and viewport:

- pages: `home`, `product`, `collection`, `collections`, `search`
- viewports: `mobile` (390), `tablet` (834), `desktop` (1280), `wide` (1920)
