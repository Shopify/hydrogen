export function AnnouncementBar({ message }: { message: string | null }) {
  const announcement = message?.trim();
  // Without a configured message, no announcement or spacing is rendered.
  if (!announcement) return null;

  return (
    <div
      role="region"
      aria-label="Announcement"
      className="bg-on-surface px-margin py-2.5 text-center"
    >
      <p className="type-body-sm text-surface wrap-anywhere">{announcement}</p>
    </div>
  );
}
