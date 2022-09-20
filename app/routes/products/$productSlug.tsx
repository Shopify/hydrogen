import { useParams } from "@remix-run/react";

export default function Product() {
  const { productSlug } = useParams();
  return <h1>Product: {productSlug}</h1>;
}
