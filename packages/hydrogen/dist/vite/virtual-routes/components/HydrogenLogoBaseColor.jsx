import { jsx, jsxs } from "react/jsx-runtime";
const HydrogenLogoBaseColor = (props) => /* @__PURE__ */ jsxs(
  "svg",
  {
    width: 76,
    height: 81,
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    ...props,
    children: [
      /* @__PURE__ */ jsx(
        "path",
        {
          d: "M37.817 80.149 0 60.057l12.934-6.817 14.561 7.733 12.218-6.441-14.561-7.733 12.933-6.833 37.818 20.091-12.934 6.817-13.757-7.307-12.236 6.457 13.775 7.308-12.934 6.817Z",
          fill: "#000"
        }
      ),
      /* @__PURE__ */ jsx(
        "path",
        {
          d: "M37.818 40.183 0 20.092l12.934-6.818 14.562 7.733 12.218-6.441-14.562-7.733L38.086 0l37.817 20.091-12.934 6.817-13.756-7.307-12.236 6.457 13.774 7.308-12.933 6.817Z",
          fill: "url(#a)"
        }
      ),
      /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs(
        "linearGradient",
        {
          id: "a",
          x1: 74.48,
          y1: 21.654,
          x2: 18.735,
          y2: 51.694,
          gradientUnits: "userSpaceOnUse",
          children: [
            /* @__PURE__ */ jsx("stop", { offset: 2e-3, stopColor: "#430470" }),
            /* @__PURE__ */ jsx("stop", { offset: 0.385, stopColor: "#8E01F0" }),
            /* @__PURE__ */ jsx("stop", { offset: 0.635, stopColor: "#354CF6" }),
            /* @__PURE__ */ jsx("stop", { offset: 1, stopColor: "#01FFFF" })
          ]
        }
      ) })
    ]
  }
);
export {
  HydrogenLogoBaseColor
};
