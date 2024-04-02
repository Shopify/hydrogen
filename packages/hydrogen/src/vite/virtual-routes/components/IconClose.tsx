import {SVGProps} from 'react';

export function IconClose(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20px"
      height="20px"
      {...props}
      stroke={props.stroke || 'currentColor'}
    >
      <title>Close</title>
      <line
        x1="4.44194"
        y1="4.30806"
        x2="15.7556"
        y2="15.6218"
        strokeWidth="1.25"
      />
      <line
        y1="-0.625"
        x2="16"
        y2="-0.625"
        transform="matrix(-0.707107 0.707107 0.707107 0.707107 16 4.75)"
        strokeWidth="1.25"
      />
    </svg>
  );
}
