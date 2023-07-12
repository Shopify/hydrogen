export function Aside({
  children,
  heading,
  id = 'aside',
}: {
  children?: React.ReactNode;
  heading: string;
  id?: string;
}) {
  return (
    <div aria-modal className="overlay" id={id} role="dialog">
      <button
        className="close-outside"
        onClick={() => {
          history.go(-1);
          window.location.hash = '';
        }}
      />
      <aside>
        <header>
          <h3>{heading}</h3>
          <AsideClose />
        </header>
        <hr />
        <main>{children}</main>
      </aside>
    </div>
  );
}

function AsideClose() {
  return (
    /* eslint-disable-next-line jsx-a11y/anchor-is-valid */
    <a className="close" href="#" onChange={() => history.go(-1)}>
      &times;
    </a>
  );
}

/*
      <Link
        to="/cart"
        onClick={() => {
          window.location.href = '/cart';
        }}
      >
        <h2>Cart</h2>
      </Link>
      <hr />
      <br />

*/
