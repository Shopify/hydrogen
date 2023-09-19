interface LayoutProps {
  children?: React.ReactNode;
  title?: string;
  description?: string | null;
}

export function Layout({children, title, description}: LayoutProps) {
  return <div className="Layout">{children}</div>;
}
