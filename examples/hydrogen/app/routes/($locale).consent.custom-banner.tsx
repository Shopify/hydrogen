import { Link } from "react-router";

export default function CustomConsentExample() {
  return (
    <div>
      <h1>Custom consent banner</h1>
      <p>
        This example waits for your privacy choice before delivering analytics. You can keep
        browsing while the banner is open.
      </p>
      <Link to="/">Continue shopping</Link>
    </div>
  );
}
