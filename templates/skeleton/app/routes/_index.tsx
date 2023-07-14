// TODO: Decide what content to show on the homepage
export default function Homepage() {
  return (
    <section className="home">
      <Logo />
      <br />
      <h1>SKELETON TEMPLATE</h1>
      <p>
        This template seeds the <code>shopify hydrogen generate</code> command
        of the hydrogen cli.
      </p>
      <br />
      <h4>Principles</h4>
      <p>
        The skeleton template is a bare bones template that is meant to be
        extended and customized to your needs.
      </p>
      <br />
      <ul>
        <li>
          Basic CSS styling via the <code>styles/reset.css</code>
          in <code>styles/skeleton.css</code>
        </li>
        <li>Focus on functional correctness and performance</li>
        <li>Focus on sematic HTML</li>
        <li>Focus on accessibility</li>
      </ul>
      <br />
      <h4>What&apos;s next?</h4>
      <ul>
        <li>Show link to the docs</li>
        <li>Show link to our blog</li>
        <li>Show link to our github discussions</li>
        <li>Show link to our Editions videos</li>
      </ul>
    </section>
  );
}

function Logo() {
  return (
    <svg
      className="hydrogen"
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      fill="none"
    >
      <path
        fillRule="evenodd"
        fill="#fff"
        d="M16.1 16.04 1 8.02 6.16 5.3l5.82 3.09 4.88-2.57-5.82-3.1L16.21 0l15.1 8.02-5.17 2.72-5.5-2.91-4.88 2.57 5.5 2.92-5.16 2.72Z"
      />
      <path
        fill="#fff"
        fillRule="evenodd"
        d="M16.1 32 1 23.98l5.16-2.72 5.82 3.08 4.88-2.57-5.82-3.08 5.17-2.73 15.1 8.02-5.17 2.72-5.5-2.92-4.88 2.58 5.5 2.92L16.1 32Z"
      />
    </svg>
  );
}
