// Streaming fallback for this route segment. Its pages read request data, so
// they stream behind this boundary instead of blocking the shared root layout.
export default function Loading() {
  return <div className="bg-surface text-on-surface-secondary flex-1" aria-busy="true" />;
}
