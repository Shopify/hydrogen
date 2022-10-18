import { Button } from "./Button";
import { FeaturedSection } from "./FeaturedSection";
import { PageHeader, Text } from "./Text";

export function GenericError({
  error,
}: {
  error?: { message: string; stack?: string };
}) {
  const heading = `Something’s wrong here.`;
  let description = `We found an error while loading this page.`;

  // TODO hide error in prod?
  if (error) {
    description += `\n${error.message}`;
    console.error(error);
  }

  return (
    <>
      <PageHeader heading={heading}>
        <Text width="narrow" as="p">
          {description}
        </Text>
        {error?.stack && (
          <pre
            style={{
              padding: "2rem",
              background: "hsla(10, 50%, 50%, 0.1)",
              color: "red",
              overflow: "auto",
              maxWidth: "100%",
            }}
          >
            {error.stack}
          </pre>
        )}
        <Button width="auto" variant="secondary" to={"/"}>
          Take me to the home page
        </Button>
      </PageHeader>
      <FeaturedSection />
    </>
  );
}
