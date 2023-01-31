import {Links} from '@remix-run/react';
import styles from '../assets/styles.css';

export function Html(props: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <head>
        <link href={styles} rel="stylesheet" />
        <Links />
        <title>Hydrogen & Remix</title>
      </head>
      <body className="hydrogen-virtual-route">{props.children}</body>
    </html>
  );
}
