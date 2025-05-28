interface PageLayoutProps {
  children?: React.ReactNode;
}

export function PageLayout({children = null}: PageLayoutProps) {
  return <main>{children}</main>;
}
