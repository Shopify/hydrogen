interface LayoutProps {
  children?: React.ReactNode;
  title?: string;
  description?: string | null;
}

export function Layout({children, title, description}: LayoutProps) {
  return (
    <div className="Layout">
      <h1>{title} (skeleton)</h1>
      <h2>{description}</h2>
      {children}
    </div>
  );
}
