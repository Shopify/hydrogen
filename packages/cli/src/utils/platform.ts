export function isWebContainer() {
  const {webcontainer} = process.versions;
  return !!webcontainer && typeof webcontainer === 'string';
}
