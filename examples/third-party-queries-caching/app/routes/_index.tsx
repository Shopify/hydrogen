import {useLoaderData, type LoaderFunctionArgs} from 'react-router';
import {CacheShort} from '@shopify/hydrogen';

export async function loader(args: LoaderFunctionArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context}: LoaderFunctionArgs) {
  /***********************************************/
  /**********  EXAMPLE UPDATE STARTS  ************/
  // 1. Fetch characters from the Rick & Morty GraphQL API
  const {characters} = await context.rickAndMorty.query(CHARACTERS_QUERY, {
    cache: CacheShort(),
  });
  /**********   EXAMPLE UPDATE END   ************/
  /***********************************************/

  return {
    /***********************************************/
    /**********  EXAMPLE UPDATE STARTS  ************/
    characters,
    /**********   EXAMPLE UPDATE END   ************/
    /***********************************************/
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: LoaderFunctionArgs) {
  // No deferred data for this example
  return {};
}

type Character = {
  name: string;
  id: string;
};

export default function Homepage() {
  const {characters} = useLoaderData<typeof loader>();
  return (
    <div>
      {/***********************************************/}
      {/**********  EXAMPLE UPDATE STARTS  ************/}
      <h1>Rick & Morty Characters</h1>
      {/* 2. Render data from the Rick & Morty GraphQL API: */}
      <ul>
        {(characters.results || []).map((character: Character) => (
          <li key={character.name}>{character.name}</li>
        ))}
      </ul>
      {/**********   EXAMPLE UPDATE END   ************/}
      {/***********************************************/}
    </div>
  );
}

// 3. The Rick & Morty characters GraphQL query
// NOTE: https://rickandmortyapi.com/documentation/#graphql
const CHARACTERS_QUERY = `#graphql:rickAndMorty
  query Characters {
    characters(page: 1) {
      results {
        name
        id
      }
    }
  }
`;
