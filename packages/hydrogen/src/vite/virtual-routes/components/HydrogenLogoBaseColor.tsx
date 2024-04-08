import * as React from 'react';
import {SVGProps} from 'react';

export const HydrogenLogoBaseColor = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={76}
    height={81}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M37.817 80.149 0 60.057l12.934-6.817 14.561 7.733 12.218-6.441-14.561-7.733 12.933-6.833 37.818 20.091-12.934 6.817-13.757-7.307-12.236 6.457 13.775 7.308-12.934 6.817Z"
      fill="#000"
    />
    <path
      d="M37.818 40.183 0 20.092l12.934-6.818 14.562 7.733 12.218-6.441-14.562-7.733L38.086 0l37.817 20.091-12.934 6.817-13.756-7.307-12.236 6.457 13.774 7.308-12.933 6.817Z"
      fill="url(#a)"
    />
    <defs>
      <linearGradient
        id="a"
        x1={74.48}
        y1={21.654}
        x2={18.735}
        y2={51.694}
        gradientUnits="userSpaceOnUse"
      >
        <stop offset={0.002} stopColor="#430470" />
        <stop offset={0.385} stopColor="#8E01F0" />
        <stop offset={0.635} stopColor="#354CF6" />
        <stop offset={1} stopColor="#01FFFF" />
      </linearGradient>
    </defs>
  </svg>
);
