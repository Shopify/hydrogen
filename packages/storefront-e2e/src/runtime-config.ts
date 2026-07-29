const DEFAULT_WORKER_COUNT = 4;
const CI_WORKER_COUNT = 2;
const MAX_WORKER_COUNT = 12;
const MIN_WORKER_COUNT = 1;

export function getStorefrontBaseUrl(): string {
  const rawBaseUrl = process.env.STOREFRONT_BASE_URL;

  if (rawBaseUrl === undefined || rawBaseUrl.trim() === "") {
    throw new Error(
      "Missing STOREFRONT_BASE_URL. Run with STOREFRONT_BASE_URL=https://your-storefront.example pnpm test:e2e:storefront.",
    );
  }

  const baseUrl = new URL(rawBaseUrl);

  if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
    throw new Error(
      "STOREFRONT_BASE_URL must use http or https, received " + baseUrl.protocol + ".",
    );
  }

  return baseUrl.toString();
}

export function getStorefrontE2EWorkerCount(): number {
  const rawWorkerCount = process.env.STOREFRONT_E2E_WORKERS;

  if (rawWorkerCount === undefined || rawWorkerCount.trim() === "") {
    return process.env.CI === "true" ? CI_WORKER_COUNT : DEFAULT_WORKER_COUNT;
  }

  const workerCount = Number(rawWorkerCount);
  if (
    !Number.isInteger(workerCount) ||
    workerCount < MIN_WORKER_COUNT ||
    workerCount > MAX_WORKER_COUNT
  ) {
    throw new Error(
      `STOREFRONT_E2E_WORKERS must be an integer from ${MIN_WORKER_COUNT} to ${MAX_WORKER_COUNT}.`,
    );
  }

  return workerCount;
}
