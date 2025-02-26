/**
 * @description Helper utility to enable PartyTown atomic mode
 * @see: https://partytown.builder.io/atomics
 */
export function partytownAtomicHeaders() {
  return {
    'Cross-Origin-Embedder-Policy': 'credentialless',
    'Cross-Origin-Opener-Policy': 'same-origin',
  };
}
