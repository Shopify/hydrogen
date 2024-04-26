function titleize(name = "") {
  return name.replace(/[\W_]+/g, " ").split(" ").filter((word) => word.length > 0).map(
    (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(" ");
}

export { titleize };
