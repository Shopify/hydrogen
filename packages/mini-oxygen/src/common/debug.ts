export function isO2Verbose() {
  return !!(process.env.DEBUG === '*' || process.env.DEBUG?.includes('o2:*'));
}
