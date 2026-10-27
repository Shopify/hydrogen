// SPIKE ONLY (agentic storefront E2E). Never merge into the template.
// Injects storefront bugs for calibration runs by rewriting cart "add" requests
// before Hydrogen's cart handler sees them. The page UI is untouched.
import { gql, type StorefrontClient } from "@shopify/hydrogen";

export type SpikeFault = "wrong-variant" | "quantity-ignored";

const SPIKE_FAULTS: readonly SpikeFault[] = ["wrong-variant", "quantity-ignored"];
const CART_API_PATH = "/api/cart";

const DEFAULT_VARIANT_QUERY = gql(`
  query SpikeDefaultVariant($id: ID!) {
    node(id: $id) {
      ... on ProductVariant {
        product {
          variants(first: 1) {
            nodes {
              id
            }
          }
        }
      }
    }
  }
`);

type FaultedLine = { merchandiseId: string; quantity: number };

/** Healthy UX variants: the storefront still works, it just looks or flows differently. */
export type SpikeUx = "cart-page" | "newsletter-modal" | "discount-banner";

const SPIKE_UX_VARIANTS: readonly SpikeUx[] = ["cart-page", "newsletter-modal", "discount-banner"];

export function parseSpikeUx(value: string | undefined): SpikeUx | null {
  if (!value) return null;
  const variant = SPIKE_UX_VARIANTS.find((candidate) => candidate === value);
  if (!variant)
    throw new Error(`Unknown SPIKE_UX "${value}". Use: ${SPIKE_UX_VARIANTS.join(", ")}`);
  return variant;
}

export function parseSpikeFault(value: string | undefined): SpikeFault | null {
  if (!value) return null;
  const fault = SPIKE_FAULTS.find((candidate) => candidate === value);
  if (!fault) throw new Error(`Unknown SPIKE_FAULT "${value}". Use: ${SPIKE_FAULTS.join(", ")}`);
  return fault;
}

export async function applySpikeFault(
  request: Request,
  fault: SpikeFault | null,
  storefrontClient: StorefrontClient,
): Promise<Request> {
  if (!fault || request.method !== "POST") return request;
  if (new URL(request.url).pathname !== CART_API_PATH) return request;

  const applyFault = (merchandiseId: string, quantity: unknown) =>
    faultedLine(fault, merchandiseId, quantity, storefrontClient);
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return faultJsonRequest(request, applyFault);
  if (contentType.includes("form")) return faultFormRequest(request, applyFault);
  return request;
}

async function faultJsonRequest(
  request: Request,
  fault: (merchandiseId: string, quantity: unknown) => Promise<FaultedLine>,
): Promise<Request> {
  const body: unknown = await request.clone().json();
  if (!isRecord(body) || !Array.isArray(body.lines)) return request;
  if (body.intent !== undefined && body.intent !== "add") return request;
  const lines = await Promise.all(
    body.lines.map(async (line: unknown) => {
      if (!isRecord(line) || typeof line.merchandiseId !== "string" || "id" in line) return line;
      return { ...line, ...(await fault(line.merchandiseId, line.quantity)) };
    }),
  );
  return new Request(request, { method: "POST", body: JSON.stringify({ ...body, lines }) });
}

async function faultFormRequest(
  request: Request,
  fault: (merchandiseId: string, quantity: unknown) => Promise<FaultedLine>,
): Promise<Request> {
  const form = await request.clone().formData();
  const merchandiseId = form.get("merchandiseId");
  const intent = form.get("intent");
  if (typeof merchandiseId !== "string" || (intent && intent !== "add")) return request;
  const faulted = await fault(merchandiseId, form.get("quantity"));
  form.set("merchandiseId", faulted.merchandiseId);
  form.set("quantity", String(faulted.quantity));
  const headers = new Headers(request.headers);
  headers.delete("content-type");
  headers.delete("content-length");
  return new Request(request, { method: "POST", body: form, headers });
}

async function faultedLine(
  fault: SpikeFault,
  merchandiseId: string,
  rawQuantity: unknown,
  storefrontClient: StorefrontClient,
): Promise<FaultedLine> {
  const quantity = Number(rawQuantity ?? 1) || 1;
  if (fault === "quantity-ignored") return { merchandiseId, quantity: 1 };

  const result = await storefrontClient.graphql(DEFAULT_VARIANT_QUERY, {
    variables: { id: merchandiseId },
  });
  const node = result.data?.node;
  const defaultId = node && "product" in node ? node.product.variants.nodes[0]?.id : undefined;
  return { merchandiseId: defaultId ?? merchandiseId, quantity };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
