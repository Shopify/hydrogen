export function titleize(name: string = '') {
  return name
    .replace(/[\W_]+/g, ' ')
    .split(' ')
    .filter((word) => word.length > 0)
    .map(
      (word: string) =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(' ');
}
