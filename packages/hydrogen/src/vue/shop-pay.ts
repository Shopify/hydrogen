import { defineComponent, h, type PropType } from "vue";

import {
  getShopPayButtonElementContentHtml,
  SHOP_PAY_BUTTON_TAG_NAME,
  type ShopPayButtonOptions,
} from "../core/shop-pay/shop-pay";

export type ShopPayButtonProps = ShopPayButtonOptions;

export const ShopPayButton = defineComponent({
  name: "ShopPayButton",
  inheritAttrs: false,
  props: {
    variants: {
      type: Array as PropType<ShopPayButtonOptions["variants"]>,
      default: undefined,
    },
    checkoutUrl: {
      type: String,
      default: undefined,
    },
    paymentOption: {
      type: String as PropType<ShopPayButtonOptions["paymentOption"]>,
      default: undefined,
    },
    source: {
      type: String,
      default: undefined,
    },
    sourceToken: {
      type: String,
      default: undefined,
    },
    channel: {
      type: String as PropType<ShopPayButtonOptions["channel"]>,
      default: undefined,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    width: {
      type: String,
      default: undefined,
    },
    borderRadius: {
      type: String,
      default: undefined,
    },
    accessibilityLabel: {
      type: String,
      default: undefined,
    },
    buttonText: {
      type: String,
      default: undefined,
    },
  },
  setup(props, { attrs }) {
    return () => {
      const { class: className, style, ...anchorAttrs } = attrs;

      return h(SHOP_PAY_BUTTON_TAG_NAME, {
        innerHTML: getShopPayButtonElementContentHtml(props, {
          ...serializeAttrs(anchorAttrs),
          class: serializeClass(className),
          style: serializeStyle(style),
        }),
      });
    };
  },
});

function serializeAttrs(attrs: Record<string, unknown>): Record<string, string | undefined> {
  const serialized: Record<string, string | undefined> = {};

  for (const [name, value] of Object.entries(attrs)) {
    if (name.startsWith("on") || value === null || value === undefined || value === false) continue;
    serialized[name] = value === true ? "" : serializePrimitive(value);
  }

  return serialized;
}

function serializeClass(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(serializeClass).filter(Boolean).join(" ");
  if (!isRecord(value)) return undefined;

  return Object.entries(value)
    .filter((entry) => Boolean(entry[1]))
    .map((entry) => entry[0])
    .join(" ");
}

function serializeStyle(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(serializeStyle).filter(Boolean).join(";");
  if (!isRecord(value)) return undefined;

  return Object.entries(value)
    .map(([name, styleValue]) => {
      const serialized = serializePrimitive(styleValue);
      return serialized ? `${hyphenateStyleName(name)}:${serialized}` : undefined;
    })
    .filter(Boolean)
    .join(";");
}

function serializePrimitive(value: unknown): string | undefined {
  return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hyphenateStyleName(name: string): string {
  if (name.startsWith("--")) return name;
  return name.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}
