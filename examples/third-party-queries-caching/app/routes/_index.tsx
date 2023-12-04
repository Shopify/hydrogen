import {json, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';
import {CacheShort} from '@shopify/hydrogen';

export async function loader({context}: LoaderFunctionArgs) {
  const {characters} = await context.rickAndMorty.query(CHARACTERS_QUERY, {
    cache: CacheShort(),
  });
  return json({characters});
}

type Character = {
  name: string;
  id: string;
};

export default function Homepage() {
  const {characters} = useLoaderData<typeof loader>();
  return (
    <div>
      <h1>Rick & Morty Characters</h1>
      <ul>
        {(characters.results || []).map(
          (character: Character, index: number) => (
            <li key={character.name + index}>{character.name}</li>
          ),
        )}
      </ul>
    </div>
  );
}

const CHARACTERS_QUERY = `#graphql:rickAndMorty
  query {
    characters(page: 1) {
      results {
        name
        id
      }
    }
  }
`;
