import {useLocation} from "@remix-run/react";
import {useEffect, useRef} from "react";

declare global {
  interface Window {
    Shopify?: {
      analytics?: {
        replayQueue?: Array<any>;
        publish?: (e: string, n?: any, a?: any) => boolean;
      };
    };
    webPixelsManager?: any;
  }
}

var hasInit = false;

export function WebPixel ({publicStoreDomain}: {publicStoreDomain: string}) {

  const WebPixelManagerApiRef = useRef<any>(null);
  const location = useLocation();
  const lastLocationKey = useRef<string>('');

  useEffect(() => {
    if (WebPixelManagerApiRef.current !== null) return;

    console.log('WebPixel useEffect init');

    (function e(e, n, a, t, r) {
      var o = "function" == typeof BigInt && -1 !== BigInt.toString().indexOf("[native code]") ? "modern" : "legacy";
      window.Shopify = window.Shopify || {};
      var i = window.Shopify;
      i.analytics = i.analytics || {};
      var s = i.analytics;
      s.replayQueue = [], s.publish = function(e, n, a) {
          return s.replayQueue?.push([e, n, a]), !0
      };
      try {
          self.performance.mark("wpm:start")
      } catch (e) {}
      var l = [a, "/wpm", "/b", r, o.substring(0, 1), ".js"].join("");
      // @ts-ignore
      !function(e) {
          var n = e.src,
              a = e.async,
              t = void 0 === a || a,
              r = e.onload,
              o = e.onerror,
              i = document.createElement("script"),
              s = document.head,
              l = document.body;
          i.async = t, i.src = n, r && i.addEventListener("load", r), o && i.addEventListener("error", o), s ? s.appendChild(i) : l ? l.appendChild(i) : console.error("Did not find a head or body element to append the script")
      }({
          src: l,
          async: !0,
          onload: function() {
              var a = window.webPixelsManager.init(e);
              n(a);
              // @ts-ignore
              var t = window.Shopify.analytics;
              // @ts-ignore
              t.replayQueue.forEach((function(e) {
                  var n = e[0],
                      t = e[1],
                      r = e[2];
                  a.publishCustomEvent(n, t, r)
              })), t.replayQueue = [], t.publish = a.publishCustomEvent, t.visitor = a.visitor
          },
          onerror: function() {}
      })
    })({
        shopId: 11786682427,
        storefrontBaseUrl: `https://${publicStoreDomain}`,
        cdnBaseUrl: `https://${publicStoreDomain}/cdn`,
        surface: "storefront-renderer",
        enabledBetaFlags: ["f6570685"],
        webPixelsConfigList: [{
            "id": "shopify-app-pixel",
            "configuration": "{}",
            "eventPayloadVersion": "v1",
            "runtimeContext": "STRICT",
            "scriptVersion": "0575",
            "apiClientId": "shopify-pixel",
            "type": "APP",
            "purposes": ["ANALYTICS"]
        }, {
            "id": "shopify-custom-pixel",
            "eventPayloadVersion": "v1",
            "runtimeContext": "LAX",
            "scriptVersion": "0575",
            "apiClientId": "shopify-pixel",
            "type": "CUSTOM",
            "purposes": ["ANALYTICS"]
        }],
        initData: {
            "cart": {},
            "checkout": null,
            "customer": null,
            "productVariants": []
        },
    }, function pageEvents(webPixelsManagerAPI: any) {
        WebPixelManagerApiRef.current = webPixelsManagerAPI;
        webPixelsManagerAPI.subscribe('page_viewed', () => {console.log('WPM page viewed')})
        webPixelsManagerAPI.publish("page_viewed");
        hasInit = true;

    // This version and hash are unique to the connecting store
    }, "/cdn", "0.0.437", "ab25c7c4w45ec1cb7pc150f670md46fec52", );
  }, []);

  useEffect(() => {
    if (lastLocationKey.current === location.key) return;
    lastLocationKey.current = location.key;

    hasInit && WebPixelManagerApiRef.current && WebPixelManagerApiRef.current.publish("page_viewed");
  });

  return null;
}
