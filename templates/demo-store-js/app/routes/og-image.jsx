import { getShareableImage } from "~/lib/seo/image";

function SharableImage(props) {
  const { title } = props;
  return (
    <svg>
      <text>{title}</text>
    </svg>
  );
}

export const loader = async ({ request }) => {
  const searchParams = new URL(request.url).searchParams;
  const props = Object.fromEntries(searchParams.entries());
  const response = await getShareableImage(<SharableImage {...props} />);

  return response;
};
