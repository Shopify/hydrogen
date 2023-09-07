import {forwardRef} from 'react';
import {useNonce} from './csp';

type ScriptProps = JSX.IntrinsicElements['script'];

export const Script = forwardRef<HTMLScriptElement, ScriptProps>(
  (props, ref) => {
    const nonce = useNonce();
    return (
      <script suppressHydrationWarning {...props} nonce={nonce} ref={ref} />
    );
  },
);
