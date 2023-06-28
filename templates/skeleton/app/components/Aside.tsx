export function Aside({
  id = 'aside',
  children,
}: {
  id?: string;
  children?: React.ReactNode;
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
        <AsideClose />
        <div className="content">{children}</div>
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
