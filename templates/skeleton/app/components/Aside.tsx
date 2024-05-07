/**
 * A side bar component with Overlay
 * @example
 * ```jsx
 * <Aside heading="SEARCH">
 *  <input type="search" />
 *  ...
 * </Aside>
 * ```
 */
export function Aside({
  children,
  heading,
  expanded,
  setExpanded,
}: {
  children?: React.ReactNode;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  heading: React.ReactNode;
}) {
  return (
    <div
      aria-modal
      className={`overlay ${expanded ? 'expanded' : ''}`}
      role="dialog"
    >
      <button className="close-outside" onClick={() => setExpanded(false)} />
      <aside>
        <header>
          <h3>{heading}</h3>
          <CloseAside setExpanded={setExpanded} />
        </header>
        <main>{children}</main>
      </aside>
    </div>
  );
}

function CloseAside({setExpanded}: {setExpanded: (expanded: boolean) => void}) {
  return (
    <button className="close reset" onClick={() => setExpanded(false)}>
      &times;
    </button>
  );
}
