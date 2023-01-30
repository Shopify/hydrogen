import {IconTwitter, IconDiscord, IconGithub} from '~/images';
interface LayoutProps {
  children?: React.ReactNode;
  storeName?: string;
}

export function Layout({children, storeName}: LayoutProps) {
  return (
    <div className="Layout">
      <header>
        <h1>{storeName?.toUpperCase()}</h1>
        <p>Dev Mode</p>
        <nav>
          <a href="/">
            <IconDiscord />
          </a>
          <a href="/">
            <IconGithub />
          </a>
          <a href="/">
            <IconTwitter />
          </a>
        </nav>
      </header>
      <main>{children}</main>
      <footer>
        <div>
          <p>© 2023 / Shopify, Inc.</p>
        </div>
      </footer>
    </div>
  );
}
