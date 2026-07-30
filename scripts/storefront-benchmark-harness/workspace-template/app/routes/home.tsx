import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Hydrogen Benchmark" }];
}

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-semibold tracking-[0.24em] text-blue-600 uppercase">
        Hydrogen Benchmark
      </p>
      <h1 className="mt-6 text-5xl font-black tracking-tight text-slate-950">
        Build this into a Shopify storefront.
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
        This starter app uses Vite, TypeScript, Tailwind, and React Router framework mode. The
        benchmark provides Hydrogen as a local npm-style tarball dependency.
      </p>
    </main>
  );
}
