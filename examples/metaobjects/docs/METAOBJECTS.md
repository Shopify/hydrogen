# Metaobjects Overview

This document describes the high-level content architecture and metaobject definitions
to create a basic content management system (CMS) based on metaobjects.

## 1. Content Architecture

```bash
Metaobject Definitions
┌─────────────────────────────────────────────────┐
│                                                 │
│   Route                                         │
│                                                 │
│   ┌─────────────────────────────────────────┐   │
│   │                                         │   │
│   │ Sections                                │   │
│   │                                         │   │
│   │ ┌─────────────────────────────────────┐ │   │
│   │ │ SectionHero                         │ │   │
│   │ ├─────────────────────────────────────┤ │   │
│   │ │ SectionFeaturedProducts             │ │   │
│   │ └─────────────────────────────────────┘ │   │
│   │  ...                                    │   │
│   │                                         │   │
│   └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 2. Metaobject Definitions

The following is the list of metaojects that are used in this example:

![Metaobject definitions list](./images/definitions_list.png "Metaobject Definitions List")

### Route Definition

A route is a container metaobject that holds one or many `Section` metaobject entries
you wish to render in a given Hydrogen route.

#### Route fields

![Route Definition](./images/definition_route.png "Metaobject Route Definition"))

### SectionHero Definition

This definition includes a basic set of fields to render a typical Hero section.

### SectionHero fields

![SectionHero Definition](./images/definition_section_hero.png "Metaobject SectionHero Definition")

### SectionFeaturedProducts Definition

This definition includes a basic set of fields to render a typical grid of products
that a merchant can curate via the admin.

#### SectionFeaturedProducts fields

![SectionFeaturedProducts Definition](./images/definition_section_featured_products.png "Metaobject SectionFeaturedProducts Definition")

### SectionFeaturedCollections Definition

This definition includes a basic set of fields to render a typical grid of collections
that a merchant can curate via the admin.

#### SectionFeaturedCollections fields

![SectionFeaturedCollections Definition](./images/definition_section_featured_collections.png "Metaobject SectionFeaturedCollections Definition")

### Store Definition

This definition includes a basic set of fields to describe the basic structure of
a store branch.

#### Store fields

![Store Definition](./images/definition_store.png "Metaobject Store Definition")

### SectionStoreProfile Definition

This definition includes a reference field to associate a given store entry with
section entry.

#### SectionSetoreProfile fields

![SectionStoreProfile Definition](./images/definition_section_store_profile.png "Metaobject SectionStoreProfile Definition")

### SectionStoreGrid Definition

This definition includes a stores field that allows the merchant to create a collection
of stores to display in grid.

#### SectionStoreGrid fields

![SectionStoreGrid Definition](./images/definition_section_store_grid.png "Metaobject SectionStoreGrid Definition")

---

## 3. Structure of a Section component

Section components have a one-to-one relationship with Section metaobject definitions.

In other words, they are a react version of the definition that you will use to
render the section entry in the frontend.

### Creating new Sections

Define the section component that will be used to render a new metaobject section
definition

```ts
export function SectionExample(props: SectionExampleFragment) {}
```

Define the section's fragment that will be used for querying. The fragment should
include all the fields from the given definition in the admin.

```ts
const EXAMPLE_MEDIA_IMAGE_FRAGMENT = '#graphql
  fragment MediaImage on MediaImage {
    image {
      altText
      url
      width
      height
    }
  }
';

export const SECTION_HERO_FRAGMENT = '#graphql
  fragment SectionExample on Metaobject {
    type
    heading: field(key: "heading") {
      key
      value
    }
    subheading: field(key: "subheading") {
      key
      value
    }
    # other fields ...
  }
  ${EXAMPLE_MEDIA_IMAGE_FRAGMENT}
';
```

Pass the props to the `parseSection` to parse the metaobject fields and simplify
the resulting route content structure.

```ts
export function SectionExample(props: SectionExampleFragment) {
  const section = parseSection<
    SectionHeroFragment,
    {
      heading?: ParsedMetafields['single_line_text_field'];
      subheading?: ParsedMetafields['single_line_text_field'];
    }
  >(props);
}
```

Add the markup that defines the section

```ts
export function SectionExample(props: SectionExampleFragment) {
  const section = parseSection<
    SectionHeroFragment,
    {
      heading?: ParsedMetafields['single_line_text_field'];
      subheading?: ParsedMetafields['single_line_text_field'];
    }
  >(props);

  const {image, heading, subheading, link} = section;

  const backgroundImage = image?.image?.url
    ? `url("${image.image.url}")`
    : undefined;

  return (
    <section
      className="section-hero"
      style={{
        backgroundImage,
        height: '50%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        position: 'relative',
        minHeight: '500px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          paddingLeft: '2rem',
          position: 'absolute',
          top: 0,
          right: 0,
          left: 0,
          bottom: 0,
        }}
      >
        {heading && <h1 style={{marginBottom: 0}}>{heading.parsedValue}</h1>}
        {subheading && <p>{subheading.value}</p>}
      </div>
    </section>
  );
}
```

### Including the Section in the Sections component

The final step is to import and include our new section in the list of renderable
sections in the Sections component

```ts
// other imported sections ...
import {SECTION_EXAMPLE_FRAGMENT, SectionExample} from '~/sections/SectionExample';

import type {SectionsFragment} from 'storefrontapi.generated';

export function Sections({sections}: {sections: SectionsFragment}) {
  return (
    <div className="sections">
      {sections?.references?.nodes.map((section) => {
        switch (section.type) {
          // other sections....
          case 'section_example':
             return <SectionExample />;
          default:
            // eslint-disable-next-line no-console
            console.log(`Unsupported section type: ${section.type}`);
            return null;
        }
      })}
    </div>
  );
}

export const SECTIONS_FRAGMENT = `#graphql
  fragment Sections on MetaobjectField {
    ... on MetaobjectField {
      references(first: 10) {
        nodes {
          ... on Metaobject {
            id
            type
            ...SectionHero
            ...SectionFeaturedProducts
            ...SectionFeaturedCollections
            ...SectionRichText
            ...SectionStores
            ...SectionStoreProfile
          }
        }
      }
    }
  }
  # All section fragments
  # other section fragments ...
  ${SECTION_EXAMPLE_FRAGMENT}
`;
```
