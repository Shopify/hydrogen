import clsx from "clsx";
import { MediaFile } from "@shopify/hydrogen-react";

import { Heading, Text, Link } from "~/components";

export function Hero({
  byline,
  cta,
  handle,
  heading,
  height,
  loading,
  spread,
  spreadSecondary,
  top,
}) {
  return (
    <Link to={`/collections/${handle}`}>
      <section
        className={clsx(
          "relative justify-end flex flex-col w-full",
          top && "-mt-nav",
          height === "full"
            ? "h-screen"
            : "aspect-[4/5] sm:aspect-square md:aspect-[5/4] lg:aspect-[3/2] xl:aspect-[2/1]"
        )}
      >
        <div className="absolute inset-0 grid flex-grow grid-flow-col pointer-events-none auto-cols-fr -z-10 content-stretch overflow-clip">
          {spread?.reference && (
            <div>
              <SpreadMedia
                scale={2}
                sizes={
                  spreadSecondary?.reference
                    ? "(min-width: 80em) 700px, (min-width: 48em) 450px, 500px"
                    : "(min-width: 80em) 1400px, (min-width: 48em) 900px, 500px"
                }
                widths={
                  spreadSecondary?.reference
                    ? [500, 450, 700]
                    : [500, 900, 1400]
                }
                width={spreadSecondary?.reference ? 375 : 750}
                data={spread.reference}
                loading={loading}
              />
            </div>
          )}

          {spreadSecondary?.reference && (
            <div className="hidden md:block">
              <SpreadMedia
                sizes="(min-width: 80em) 700, (min-width: 48em) 450, 500"
                widths={[450, 700]}
                width={375}
                data={spreadSecondary.reference}
              />
            </div>
          )}
        </div>
        <div className="flex flex-col items-baseline justify-between gap-4 px-6 py-8 sm:px-8 md:px-12 bg-gradient-to-t dark:from-contrast/60 dark:text-primary from-primary/60 text-contrast">
          {heading?.value && (
            <Heading format as="h2" size="display" className="max-w-md">
              {heading.value}
            </Heading>
          )}

          {byline?.value && (
            <Text format width="narrow" as="p" size="lead">
              {byline.value}
            </Text>
          )}

          {cta?.value && <Text size="lead">{cta.value}</Text>}
        </div>
      </section>
    </Link>
  );
}

function SpreadMedia({ data, loading, scale, sizes, width, widths }) {
  return (
    <MediaFile
      data={data}
      alt={data.alt}
      className="block object-cover w-full h-full"
      // @ts-expect-error Need to update the types in H-UI to allow optional properties on this object
      mediaOptions={{
        video: {
          controls: false,
          muted: true,
          loop: true,
          playsInline: true,
          autoPlay: true,
          width: (scale ?? 1) * width,
          previewImageOptions: { scale, src: data.previewImage?.url ?? "" },
        },

        image: {
          loading,
          loaderOptions: { scale, crop: "center" },
          widths,
          sizes,
          width,
        },
      }}
    />
  );
}
