const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "long" });

export function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}
