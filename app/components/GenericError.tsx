import { Button } from "./Button";
import { FeaturedSection } from "./FeaturedSection";
import { PageHeader, Text } from "./Text";

export function GenericError() {
  const heading = `Something’s wrong here.`;
  const description = `We found an error while loading this page.`;

  return (
    <>
      <PageHeader heading={heading}>
        <Text width="narrow" as="p">
          {description}
        </Text>
        <Button width="auto" variant="secondary" to={"/"}>
          Take me to the home page
        </Button>
      </PageHeader>
      <FeaturedSection />
    </>
  );
}
