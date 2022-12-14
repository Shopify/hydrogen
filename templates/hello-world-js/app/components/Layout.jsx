export function Layout({ children, title, description }) {
  return (
    <div className="Layout">
      <h1>{title}</h1>
      <h2>{description}</h2>
      {children}
    </div>
  );
}
