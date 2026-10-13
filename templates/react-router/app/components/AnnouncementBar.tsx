import type { ReactElement } from "react";

interface Announcement {
  content: ReactElement;
}

// Add announcements as JSX elements here.
const ANNOUNCEMENTS: Announcement[] = [];

export function AnnouncementBar() {
  if (ANNOUNCEMENTS.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Announcement"
      className="bg-on-surface px-margin py-2.5 text-center"
    >
      <ul role="list">
        {ANNOUNCEMENTS.map((announcement, index) => (
          <AnnouncementBarItem key={index} {...announcement} />
        ))}
      </ul>
    </div>
  );
}

function AnnouncementBarItem({ content }: Announcement) {
  return <li className="type-body-sm text-surface wrap-anywhere">{content}</li>;
}
