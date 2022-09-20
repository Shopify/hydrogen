import { useParams } from "@remix-run/react";

export default function Product() {
  const { productHandle } = useParams();
  return <h1>Product: {productHandle}</h1>;
}
