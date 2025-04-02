import type {SanityDocument} from '@sanity/client';

export default function LandingPageContent({
  landingPageContent,
}: {
  landingPageContent: SanityDocument[];
}) {
  return (
    <main className="container mx-auto grid grid-cols-1 divide-y divide-blue-100">
      {landingPageContent?.length > 0 ? (
        landingPageContent.map((post) => (
          <h2 className="p-4 hover:bg-blue-50" key={post._id}>
            {post.title}
          </h2>
        ))
      ) : (
        <div className="p-4 text-red-500">No posts found</div>
      )}
    </main>
  );
}
