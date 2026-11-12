import { useCart, useCartForm } from "~/lib/cart";
import { openCartDrawer } from "~/lib/cart-drawer";
import type { GlobalCatalogItem } from "~/lib/global-catalog";
import { formatPrice } from "~/lib/money";

function ListenNowCard({ item }: { item: GlobalCatalogItem }) {
  const seller = item.seller.handle;
  const { formProps, register } = useCartForm({ seller });
  const adding = useCart(
    (state) =>
      state.pending.lines.size > 0 &&
      state.data.lines.nodes.some(
        (line) => state.pending.lines.has(line.id) && line.merchandise?.id === item.variantId,
      ),
    { seller },
  );

  return (
    <article className="flex flex-col gap-2" aria-label={item.title} data-testid="listen-now-card">
      <div className="rounded-card bg-surface-secondary aspect-square overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : null}
      </div>
      <div className="flex flex-col gap-0.5 text-left">
        <h3 className="type-body-sm text-on-surface line-clamp-2 font-medium">
          <a href={item.url} className="text-on-surface no-underline">
            {item.title}
          </a>
        </h3>
        <p className="text-on-surface-secondary text-xs">{item.seller.name}</p>
        <p className="text-on-surface text-sm font-medium">
          <span className="sr-only">Price: </span>
          {formatPrice(item.price)}
        </p>
      </div>
      <form {...formProps({ afterSubmit: openCartDrawer })} className="mt-1">
        <input type="hidden" {...register("merchandiseId", { value: item.variantId })} />
        <input type="hidden" {...register("quantity", { value: 1 })} />
        <button
          type="submit"
          {...register("add")}
          className={`rounded-button button-secondary focus-visible:outline-accent inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97] ${adding ? "opacity-60" : ""}`}
          {...(adding ? { "aria-busy": "true" } : {})}
        >
          Add<span className="sr-only"> {item.title}</span> to cart
        </button>
      </form>
    </article>
  );
}

export function ListenNow({ items }: { items: readonly GlobalCatalogItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="bg-surface w-full py-12" aria-labelledby="listen-now-heading">
      <div className="max-w-page px-margin mx-auto mb-4">
        <h2 id="listen-now-heading" className="type-heading-xl">
          Listen Now
        </h2>
        <p className="text-on-surface-secondary mt-1 text-sm">
          Headphones from other Shopify stores, each in its own cart
        </p>
      </div>
      <ul
        role="list"
        className="max-w-page px-margin mx-auto grid grid-cols-1 gap-x-1 gap-y-10 md:grid-cols-3"
      >
        {items.map((item) => (
          <li key={item.variantId}>
            <ListenNowCard item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}
