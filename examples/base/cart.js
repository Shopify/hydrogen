// Cart drawer: shared across every page in the base example.
//
// Renders a single <dialog> at end of <body>, intercepts clicks on any
// element with [data-open-cart] to open it, and handles close via the X
// button, ESC, and clicks on the backdrop.
//
// All cart contents are static — this file owns presentation only.

(() => {
  const STYLE = `
    dialog#cart-drawer {
      position: fixed;
      inset-block: 0;
      right: 0;
      left: auto;
      margin: 0;
      width: 100%;
      max-width: 28rem;
      height: 100dvh;
      max-height: none;
      border: 0;
      padding: 0;
      background: white;
      color: black;
      box-shadow: -10px 0 40px rgb(0 0 0 / 0.08);
    }
    dialog#cart-drawer::backdrop {
      background: rgb(0 0 0 / 0.3);
    }
    dialog#cart-drawer[open] {
      animation: cart-drawer-in 250ms cubic-bezier(0.22, 1, 0.36, 1);
    }
    dialog#cart-drawer[open]::backdrop {
      animation: cart-drawer-backdrop-in 250ms ease-out;
    }
    @keyframes cart-drawer-in {
      from { transform: translateX(100%); }
      to   { transform: translateX(0); }
    }
    @keyframes cart-drawer-backdrop-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    body.cart-drawer-open { overflow: hidden; }
  `;

  const HTML = `
    <dialog id="cart-drawer" aria-labelledby="cart-drawer-title">
      <div class="flex h-full flex-col">

        <header class="flex items-center justify-between px-6 pt-6 pb-5">
          <div class="flex items-center gap-3">
            <h2 id="cart-drawer-title" class="text-2xl font-black tracking-tight">Cart</h2>
            <span class="grid h-6 min-w-6 place-items-center rounded-full bg-black/10 px-2 text-xs font-bold">1</span>
          </div>
          <button data-close-cart aria-label="Close cart" class="-mr-2 grid h-9 w-9 place-items-center rounded-full hover:bg-black/5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>
          </button>
        </header>

        <ul class="flex-1 overflow-y-auto px-6">
          <li class="flex gap-4 py-4">
            <a href="/products/hoodie" class="block h-20 w-20 shrink-0 overflow-hidden rounded-md bg-neutral-100">
              <img src="https://cdn.shopify.com/s/files/1/0688/1755/1382/products/Differentwhiteleathersneakers01.jpg?v=1675447428" alt="" class="h-full w-full object-cover" />
            </a>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-3">
                <h3 class="text-sm font-semibold leading-snug">
                  <a href="/products/hoodie" class="hover:underline">White Leather Sneakers</a>
                </h3>
                <p class="shrink-0 text-sm font-bold">$90.00</p>
              </div>
              <p class="mt-1 text-xs text-black/60">4</p>
              <p class="mt-1 text-sm font-bold">$90.00</p>
              <div class="mt-3 flex items-center gap-2">
                <div class="flex h-9 items-center rounded-full border border-black/15">
                  <button aria-label="Decrease quantity" class="grid h-9 w-9 place-items-center text-base">–</button>
                  <span class="w-7 text-center text-sm font-semibold">1</span>
                  <button aria-label="Increase quantity" class="grid h-9 w-9 place-items-center text-base">+</button>
                </div>
                <button aria-label="Remove" class="grid h-9 w-9 place-items-center rounded-full hover:bg-black/5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="m19 6-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                </button>
              </div>
            </div>
          </li>
        </ul>

        <footer class="border-t border-black/10 px-6 pt-2 pb-6">
          <details class="group border-b border-black/10">
            <summary class="flex cursor-pointer list-none items-center justify-between py-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
              Discount
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="transition-transform group-open:rotate-45"><path d="M12 5v14M5 12h14"/></svg>
            </summary>
            <div class="pb-4">
              <div class="flex items-center gap-2">
                <input type="text" placeholder="Discount code" class="h-10 flex-1 rounded-full border border-black/15 px-4 text-sm focus:border-black focus:outline-none" />
                <button class="h-10 rounded-full bg-black px-5 text-sm font-semibold text-white">Apply</button>
              </div>
            </div>
          </details>

          <div class="mt-5 flex items-baseline justify-between">
            <p class="text-base font-black">Estimated total</p>
            <p class="text-base font-black">$90.00 <span class="text-sm font-medium text-black/60">CAD</span></p>
          </div>
          <p class="mt-2 text-xs text-black/60">Taxes and <span class="font-semibold text-black">shipping</span> calculated at checkout.</p>

          <button class="mt-5 h-12 w-full rounded-full bg-black text-sm font-semibold text-white hover:opacity-90">Check out</button>

          <div class="mt-2 grid grid-cols-2 gap-2">
            <button aria-label="Pay with Shop Pay" class="flex h-12 items-center justify-center rounded-full bg-[#5a31f4] text-white">
              <svg viewBox="0 0 60 24" height="14" fill="currentColor" aria-hidden="true"><text x="0" y="18" font-family="Inter, sans-serif" font-weight="900" font-style="italic" font-size="20">shop</text><text x="44" y="18" font-family="Inter, sans-serif" font-weight="500" font-style="italic" font-size="20">Pay</text></svg>
            </button>
            <button aria-label="Pay with Google Pay" class="flex h-12 items-center justify-center gap-1.5 rounded-full bg-black text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M21.6 12.2c0-.7-.06-1.4-.18-2.06H12v3.9h5.4a4.6 4.6 0 0 1-2 3.04v2.5h3.23c1.9-1.74 2.97-4.3 2.97-7.38Z"/>
                <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.42l-3.22-2.5c-.9.6-2.05.95-3.4.95-2.62 0-4.83-1.76-5.62-4.13H3.05v2.58A10 10 0 0 0 12 22Z"/>
                <path fill="#FBBC04" d="M6.38 13.9a6 6 0 0 1 0-3.8V7.52H3.05a10 10 0 0 0 0 8.96l3.33-2.58Z"/>
                <path fill="#EA4335" d="M12 5.96c1.47 0 2.8.5 3.83 1.5l2.86-2.86A10 10 0 0 0 12 2a10 10 0 0 0-8.95 5.52l3.33 2.58C7.17 7.72 9.38 5.96 12 5.96Z"/>
              </svg>
              <span class="text-sm font-semibold">Pay</span>
            </button>
          </div>
        </footer>

      </div>
    </dialog>
  `;

  function init() {
    const styleEl = document.createElement("style");
    styleEl.textContent = STYLE;
    document.head.appendChild(styleEl);

    const tpl = document.createElement("template");
    tpl.innerHTML = HTML.trim();
    document.body.appendChild(tpl.content);

    const dialog = document.getElementById("cart-drawer");

    const open = () => {
      dialog.showModal();
      document.body.classList.add("cart-drawer-open");
    };
    const close = () => dialog.close();

    document.querySelectorAll("[data-open-cart]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        open();
      });
    });

    dialog.querySelector("[data-close-cart]").addEventListener("click", close);

    // Click on backdrop closes (clicks on the dialog itself land on its
    // children; only direct hits on the dialog element are backdrop clicks).
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) close();
    });

    dialog.addEventListener("close", () => {
      document.body.classList.remove("cart-drawer-open");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
