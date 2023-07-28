/*
 * TODO: This component should be autogenrated
 * based on the sections in the schema
 */
import {ImageText} from './ImageText';
import {KitchenSink} from './KitchenSink';
import type {
  ImageTextFragment,
  KitchenSinkFragment,
} from 'storefrontapi.generated';

export type SectionTypes = ImageTextFragment | KitchenSinkFragment;
export type RouteSections = Array<SectionTypes>;

export function Sections({sections}: {sections: Array<SectionTypes>}) {
  return (
    <>
      {sections.map((section) => {
        switch (section.type) {
          case 'section_image_text':
            return <ImageText {...section} key={section.id} />;
          case 'section_kitchen_sink':
            return <KitchenSink {...section} key={section.id} />;
          default:
            return null;
        }
      })}
    </>
  );
}
