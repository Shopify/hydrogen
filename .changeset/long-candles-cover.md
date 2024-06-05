---
'@shopify/hydrogen-react': patch
---

Add a RichText component to easily render \`rich_text_field\` metafields. Thank you @bastienrobert for the original implementation. Example usage:

```tsx
import {RichText} from '@shopify/hydrogen-react';

export function MainRichText({metaFieldData}: {metaFieldData: string}) {
  return (
    <RichText
      data={metaFieldData}
      components={{
        paragraph({node}) {
          return <p className="customClass">{node.children}</p>;
        },
      }}
    />
  );
}
```
