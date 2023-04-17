import {useLoaderData} from '@remix-run/react';
import {LoaderArgs} from '@shopify/remix-oxygen';
import {useEffect, useState} from 'react';
import {Link} from '~/components';
import {
  generateChallenge,
  generateCodeVerifier,
} from '~/utilities/code-verifier';

export default function Logout() {
  return (
    <div>
      <h1 style={{fontSize: '3em'}}>Logged out</h1>
      <p>You&lsquo;ve been logged out successfully.</p>
    </div>
  );
}
