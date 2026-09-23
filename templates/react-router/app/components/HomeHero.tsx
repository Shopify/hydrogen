import { useState } from "react";
import { Link } from "react-router";

import type { HomeHeroData } from "~/lib/home-hero";

export function HomeHero({ hero }: { hero: HomeHeroData }) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const image = hero.image && hero.image.url !== failedImageUrl ? hero.image : null;

  return (
    <section className="max-w-page px-margin mx-auto w-full" aria-labelledby="hero-heading">
      <div className="bleed-full bg-surface-secondary relative overflow-hidden">
        {image ? (
          <>
            <img
              src={image.url}
              alt={image.altText ?? hero.heading}
              className="absolute inset-0 h-full w-full object-cover"
              loading="eager"
              fetchPriority="high"
              onError={() => setFailedImageUrl(image.url)}
            />
            <div className="overlay-dark pointer-events-none absolute inset-0" aria-hidden="true" />
          </>
        ) : null}
        <div
          className={`max-w-page px-margin relative z-10 mx-auto flex flex-col items-start justify-end ${image ? "text-interactive-text min-h-hero p-8 pb-12" : "text-on-surface py-16 md:py-20"}`}
        >
          <h1 id="hero-heading" className="type-display max-w-2xl wrap-anywhere">
            {hero.heading}
          </h1>
          {hero.description ? (
            <p className="type-body-lg mt-3 max-w-prose wrap-anywhere whitespace-pre-line opacity-90">
              {hero.description}
            </p>
          ) : null}
          <Link
            to={hero.to}
            className="rounded-button button-primary focus-visible:outline-accent mt-6 inline-flex h-11 shrink-0 items-center justify-center gap-2 px-5 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
          >
            Shop now
          </Link>
        </div>
      </div>
    </section>
  );
}
