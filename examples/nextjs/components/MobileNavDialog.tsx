"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { content } from "@/lib/content";

const navItemHref: Record<(typeof content.header.navItems)[number], string> = {
  Collections: "/collections",
  Men: "/collections/men",
  Women: "/collections/women",
  Accessories: "/collections/accessories",
};

/**
 * Mobile nav — a `<dialog>` opened via state, with an always-rendered fallback
 * link list (F4). The hamburger button is the client trigger; the dialog
 * contains the same nav items as the desktop nav. Server-rendered baseline is
 * the hidden dialog content (links are real `<Link>`s).
 */
export function MobileNavDialog() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <div className="-ms-2 hidden max-md:block">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="button-icon focus-visible:outline-accent inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        aria-label={content.header.menu}
      >
        <img
          src="/icons/icon-menu.svg"
          width="20"
          height="20"
          alt=""
          className="size-5"
          aria-hidden="true"
        />
      </button>
      <dialog
        ref={dialogRef}
        id="mobile-nav-drawer"
        className="drawer-left bg-surface text-on-surface"
        aria-labelledby="mobile-nav-title"
        onClose={() => setOpen(false)}
      >
        <div className="flex h-full flex-col">
          <div className="relative flex min-h-[52px] shrink-0 items-center px-4 py-1">
            <span
              className="text-on-surface pointer-events-none absolute left-1/2 -translate-x-1/2 text-sm font-medium"
              id="mobile-nav-title"
              aria-live="polite"
            >
              {content.header.mobileNavigation}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="button-icon focus-visible:outline-accent ms-auto inline-flex h-11 w-11 items-center justify-center rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              aria-label={content.general.close}
            >
              <img
                src="/icons/icon-x.svg"
                width="20"
                height="20"
                alt=""
                className="size-5"
                aria-hidden="true"
              />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <nav aria-label={content.header.mobileNavigation}>
              <ul role="list" className="flex flex-col">
                {content.header.navItems.map((item) => (
                  <li key={item}>
                    <Link
                      href={navItemHref[item]}
                      onClick={() => setOpen(false)}
                      className="text-on-surface flex items-center rounded-sm py-3 text-xl font-normal no-underline hover:opacity-70 motion-safe:transition-opacity"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </dialog>
    </div>
  );
}
