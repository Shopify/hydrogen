import groq from 'groq';

export const LANDING_PAGES_QUERY = groq`*[_type == "landingPage" && defined(slug.current)] | order(_createdAt desc)`;
export const LANDING_PAGE_QUERY = groq`*[_type == "landingPage" && slug.current == $slug][0]`;
