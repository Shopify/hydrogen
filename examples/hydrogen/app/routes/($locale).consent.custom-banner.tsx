import { Link } from "react-router";

import { useLocalizedPath } from "~/lib/locale-path";

export default function CustomConsentExample() {
  const localizedPath = useLocalizedPath();
  return (
    <div>
      <h1>Custom consent banner</h1>
      <p>
        This example waits for your privacy choice before delivering analytics. You can keep
        browsing while the banner is open.
      </p>
      <Link to={localizedPath("/")}>Continue shopping</Link>
    </div>
  );
}
