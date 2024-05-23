---
'@shopify/hydrogen-react': minor
---

Add a RichText component to easily render \`rich_text_field\` metafields. Thank you @bastienrobert for the original implementation. Example usage:

```tsx
import {RichText} from '@shopify/hydrogen-react';

export function MainRichText({text}: {text: string}) {
  return (
    <RichText
      data={JSON.parse(text)}
      components={{
        // Customize how a paragraph is rendered. `next` must be called on
        // children nodes to recursively render the rich text output
        paragraph({node, next}) {
          return <p className="customClass">{node.children.map(next)}</p>;
        },
      }}
    />
  );
}
```
