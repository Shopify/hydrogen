import * as React from 'react';
import type {Story} from '@ladle/react';
import {RichText} from './RichText.js';
import {RICH_TEXT_CONTENT} from './RichText.test.helpers.js';

type RichTextProps = React.ComponentProps<typeof RichText>;

const Template: Story<RichTextProps> = (props: RichTextProps) => {
  return <RichText {...props}>Add to cart</RichText>;
};

export const Default = Template.bind({});
Default.args = {
  as: 'div',
  data: JSON.stringify(RICH_TEXT_CONTENT),
};
