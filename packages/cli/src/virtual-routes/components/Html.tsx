import {Links, Meta} from '@remix-run/react';
import styles from '../assets/styles.css';

export function Html(props: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <head>
        <Meta />
        <link href={styles} rel="stylesheet" />
        <Links />
        <title>Hydrogen & Remix</title>
      </head>
      <body>{props.children}</body>
    </html>
  );
}
