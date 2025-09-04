=== CI CHECKS COMPREHENSIVE REPORT ===
Date: Thu Sep  4 08:58:17 PDT 2025
TypeScript Version: 5.9.2

## 1. TYPECHECK RESULTS
```

> typecheck
> turbo typecheck --parallel

turbo 2.3.4

• Packages in scope: @shopify/cli-hydrogen, @shopify/create-hydrogen, @shopify/hydrogen, @shopify/hydrogen-codegen, @shopify/hydrogen-react, @shopify/mini-oxygen, @shopify/remix-oxygen, docs-preview, example-b2b, example-custom-cart-method, example-gtm, example-hydrogen-express, example-infinite-scroll, example-legacy-customer-account-flow, example-metaobjects, example-multipass, example-partytown, example-subscriptions, example-third-party-queries-caching, skeleton
• Running typecheck in 20 packages
• Remote caching disabled
example-third-party-queries-caching:build: cache miss, executing 0d4664dcf5cbe841
@shopify/hydrogen-react:build: cache miss, executing 444fc29dba7ed9e5
example-subscriptions:build: cache miss, executing 7e1311fa69452edc
example-custom-cart-method:build: cache miss, executing 5f3163564e00b195
example-multipass:build: cache miss, executing 0169865d4e900f4d
@shopify/mini-oxygen:build: cache miss, executing d4a92c597c8e7274
example-b2b:build: cache miss, executing 04d617b91d6e66cc
@shopify/hydrogen-codegen:build: cache miss, executing a726936b46df0496
example-infinite-scroll:build: cache miss, executing 7fe5692fa9f88a4e
example-hydrogen-express:build: cache miss, executing 8c9542a42e8c35e9
example-custom-cart-method:build: 
example-custom-cart-method:build: > build
example-custom-cart-method:build: > shopify hydrogen build --codegen --diff
example-custom-cart-method:build: 
example-subscriptions:build: 
example-subscriptions:build: > build
example-subscriptions:build: > shopify hydrogen build --codegen --diff
example-subscriptions:build: 
example-third-party-queries-caching:build: 
example-third-party-queries-caching:build: > build
example-third-party-queries-caching:build: > shopify hydrogen build --codegen --diff
example-third-party-queries-caching:build: 
example-multipass:build: 
example-multipass:build: > build
example-multipass:build: > shopify hydrogen build --codegen --diff
example-multipass:build: 
@shopify/mini-oxygen:build: 
@shopify/mini-oxygen:build: > @shopify/mini-oxygen@3.2.1 build
@shopify/mini-oxygen:build: > tsup
@shopify/mini-oxygen:build: 
example-hydrogen-express:build: 
example-hydrogen-express:build: > build
example-hydrogen-express:build: > react-router build
example-hydrogen-express:build: 
example-b2b:build: 
example-b2b:build: > build
example-b2b:build: > shopify hydrogen build --codegen --diff
example-b2b:build: 
@shopify/hydrogen-react:build: 
@shopify/hydrogen-react:build: > @shopify/hydrogen-react@2025.5.0 build
@shopify/hydrogen-react:build: > npm-run-all --sequential clean-dist --parallel build:vite:* build:tsc:es --parallel build:tsc:cjs copy-storefront-types
@shopify/hydrogen-react:build: 
@shopify/hydrogen-codegen:build: 
@shopify/hydrogen-codegen:build: > @shopify/hydrogen-codegen@0.3.3 build
@shopify/hydrogen-codegen:build: > tsup --clean
@shopify/hydrogen-codegen:build: 
example-infinite-scroll:build: 
example-infinite-scroll:build: > build
example-infinite-scroll:build: > shopify hydrogen build --codegen --diff
example-infinite-scroll:build: 
@shopify/mini-oxygen:build: CLI Building entry: src/vite/worker-entry.ts
@shopify/mini-oxygen:build: CLI Using tsconfig: tsconfig.json
@shopify/mini-oxygen:build: CLI tsup v8.4.0
@shopify/mini-oxygen:build: CLI Using tsup config: /Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/mini-oxygen/tsup.config.ts
@shopify/mini-oxygen:build: CLI Building entry: src/common/compat.ts, src/common/debug.ts, src/common/error-page.ts, src/common/find-port.ts, src/common/headers.ts, src/node/core.ts, src/node/index.ts, src/node/server.ts, src/node/storage.ts, src/vite/entry-error.ts, src/vite/plugin.ts, src/vite/server-middleware.ts, src/vite/utils.ts, src/worker/assets.ts, src/worker/devtools.ts, src/worker/handler.ts, src/worker/index.ts, src/worker/inspector.ts, src/worker/logger.ts, src/worker/utils.ts
@shopify/mini-oxygen:build: CLI Using tsconfig: tsconfig.json
@shopify/mini-oxygen:build: CLI tsup v8.4.0
@shopify/mini-oxygen:build: CLI Using tsup config: /Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/mini-oxygen/tsup.config.ts
@shopify/mini-oxygen:build: CLI Target: es2022
@shopify/mini-oxygen:build: ESM Build start
@shopify/mini-oxygen:build: CLI Target: es2022
@shopify/mini-oxygen:build: ESM Build start
@shopify/mini-oxygen:build: ESM dist/vite/worker-entry.js 54.48 KB
@shopify/mini-oxygen:build: ESM ⚡️ Build success in 15ms
@shopify/mini-oxygen:build: ESM dist/worker/utils.js           0 B
@shopify/mini-oxygen:build: ESM dist/worker/inspector.js       7.13 KB
@shopify/mini-oxygen:build: ESM dist/worker/logger.js          7.81 KB
@shopify/mini-oxygen:build: ESM dist/node/storage.js           842.00 B
@shopify/mini-oxygen:build: ESM dist/vite/entry-error.js       2.48 KB
@shopify/mini-oxygen:build: ESM dist/worker/index.js           6.47 KB
@shopify/mini-oxygen:build: ESM dist/common/error-page.js      452.00 B
@shopify/mini-oxygen:build: ESM dist/vite/plugin.js            4.17 KB
@shopify/mini-oxygen:build: ESM dist/vite/utils.js             1018.00 B
@shopify/mini-oxygen:build: ESM dist/vite/server-middleware.js 6.06 KB
@shopify/mini-oxygen:build: ESM dist/worker/devtools.js        7.35 KB
@shopify/mini-oxygen:build: ESM dist/common/debug.js           132.00 B
@shopify/mini-oxygen:build: ESM dist/common/compat.js          129.00 B
@shopify/mini-oxygen:build: ESM dist/node/core.js              5.70 KB
@shopify/mini-oxygen:build: ESM dist/node/index.js             3.78 KB
@shopify/mini-oxygen:build: ESM dist/common/headers.js         1.20 KB
@shopify/mini-oxygen:build: ESM dist/worker/handler.js         2.15 KB
@shopify/mini-oxygen:build: ESM dist/node/server.js            7.24 KB
@shopify/mini-oxygen:build: ESM dist/worker/assets.js          2.75 KB
@shopify/mini-oxygen:build: ESM dist/common/find-port.js       210.00 B
@shopify/mini-oxygen:build: ESM ⚡️ Build success in 14ms
@shopify/hydrogen-codegen:build: CLI Building entry: src/defaults.ts, src/index.ts, src/preset.ts, src/schema.ts
@shopify/hydrogen-codegen:build: CLI Using tsconfig: tsconfig.json
@shopify/hydrogen-codegen:build: CLI tsup v8.4.0
@shopify/hydrogen-codegen:build: CLI Using tsup config: /Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen-codegen/tsup.config.ts
@shopify/hydrogen-codegen:build: CLI Building entry: src/defaults.ts, src/index.ts, src/preset.ts, src/schema.ts
@shopify/hydrogen-codegen:build: CLI Using tsconfig: tsconfig.json
@shopify/hydrogen-codegen:build: CLI tsup v8.4.0
@shopify/hydrogen-codegen:build: CLI Using tsup config: /Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen-codegen/tsup.config.ts
@shopify/hydrogen-codegen:build: CLI Target: esnext
@shopify/hydrogen-codegen:build: CLI Target: esnext
@shopify/hydrogen-codegen:build: CLI Cleaning output folder
@shopify/hydrogen-codegen:build: ESM Build start
@shopify/hydrogen-codegen:build: CLI Cleaning output folder
@shopify/hydrogen-codegen:build: CJS Build start
@shopify/hydrogen-codegen:build: ESM dist/esm/defaults.js     1.49 KB
@shopify/hydrogen-codegen:build: ESM dist/esm/index.js        226.00 B
@shopify/hydrogen-codegen:build: ESM dist/esm/schema.js       705.00 B
@shopify/hydrogen-codegen:build: ESM dist/esm/preset.js       935.00 B
@shopify/hydrogen-codegen:build: ESM dist/esm/defaults.js.map 2.76 KB
@shopify/hydrogen-codegen:build: ESM dist/esm/index.js.map    89.00 B
@shopify/hydrogen-codegen:build: ESM dist/esm/schema.js.map   1.68 KB
@shopify/hydrogen-codegen:build: ESM dist/esm/preset.js.map   1.83 KB
@shopify/hydrogen-codegen:build: ESM ⚡️ Build success in 77ms
@shopify/hydrogen-codegen:build: CJS dist/cjs/defaults.cjs     1.53 KB
@shopify/hydrogen-codegen:build: CJS dist/cjs/schema.cjs       731.00 B
@shopify/hydrogen-codegen:build: CJS dist/cjs/index.cjs        847.00 B
@shopify/hydrogen-codegen:build: CJS dist/cjs/preset.cjs       971.00 B
@shopify/hydrogen-codegen:build: CJS dist/cjs/defaults.cjs.map 2.76 KB
@shopify/hydrogen-codegen:build: CJS dist/cjs/schema.cjs.map   1.68 KB
@shopify/hydrogen-codegen:build: CJS dist/cjs/index.cjs.map    90.00 B
@shopify/hydrogen-codegen:build: CJS dist/cjs/preset.cjs.map   1.86 KB
@shopify/hydrogen-codegen:build: CJS ⚡️ Build success in 77ms
@shopify/hydrogen-react:build: 
@shopify/hydrogen-react:build: > @shopify/hydrogen-react@2025.5.0 clean-dist
@shopify/hydrogen-react:build: > rimraf ./dist
@shopify/hydrogen-react:build: 
@shopify/mini-oxygen:build: DTS Build start
@shopify/hydrogen-react:build: 
@shopify/hydrogen-react:build: > @shopify/hydrogen-react@2025.5.0 build:vite:browser-prod
@shopify/hydrogen-react:build: > vite build
@shopify/hydrogen-react:build: 
@shopify/hydrogen-react:build: 
@shopify/hydrogen-react:build: > @shopify/hydrogen-react@2025.5.0 build:tsc:es
@shopify/hydrogen-react:build: > tsc --emitDeclarationOnly --project tsconfig.typeoutput.json
@shopify/hydrogen-react:build: 
@shopify/hydrogen-react:build: 
@shopify/hydrogen-react:build: > @shopify/hydrogen-react@2025.5.0 build:vite:node-dev
@shopify/hydrogen-react:build: > vite build --mode devbuild --ssr
@shopify/hydrogen-react:build: 
@shopify/hydrogen-react:build: 
@shopify/hydrogen-react:build: > @shopify/hydrogen-react@2025.5.0 build:vite:umddev
@shopify/hydrogen-react:build: > vite build --mode umdbuilddev
@shopify/hydrogen-react:build: 
@shopify/hydrogen-react:build: 
@shopify/hydrogen-react:build: > @shopify/hydrogen-react@2025.5.0 build:vite:browser-dev
@shopify/hydrogen-react:build: > vite build --mode devbuild
@shopify/hydrogen-react:build: 
@shopify/hydrogen-react:build: 
@shopify/hydrogen-react:build: > @shopify/hydrogen-react@2025.5.0 build:vite:node-prod
@shopify/hydrogen-react:build: > vite build --ssr
@shopify/hydrogen-react:build: 
@shopify/hydrogen-react:build: 
@shopify/hydrogen-react:build: > @shopify/hydrogen-react@2025.5.0 build:vite:umdprod
@shopify/hydrogen-react:build: > vite build --mode umdbuild
@shopify/hydrogen-react:build: 
example-hydrogen-express:build: Error: Route config in "routes.ts" is invalid.
example-hydrogen-express:build: 
example-hydrogen-express:build: ../../../packages/hydrogen/dist/production/index.js:1:622
example-hydrogen-express:build: 1  |  import {createContext,forwardRef,useContext,lazy,useMemo,useEffect,useRef,useState,createElement,Fragment as Fragment$1,Suspense}from'react';import {useFetcher,useFetchers,useNavigation,useLocation,useNavigate,Link,useMatches}from'react-router';import {jsx,jsxs,Fragment}from'react/jsx-runtime';import {useLoadScript,createStorefrontClient,SHOPIFY_STOREFRONT_ID_HEADER,getShopifyCookies,SHOPIFY_Y,SHOPIFY_STOREFRONT_Y_HEADER,SHOPIFY_S,SHOPIFY_STOREFRONT_S_HEADER,flattenConnection,RichText,ShopPayButton,useShopifyCookies,parseGid,sendShopifyAnalytics,AnalyticsEventName,AnalyticsPageType,getClientBrowserParameters}from'@shopify/hydrogen-react';export{AnalyticsEventName,AnalyticsPageType,ExternalVideo,IMAGE_FRAGMENT,Image,MediaFile,ModelViewer,Money,ShopifySalesChannel,Video,customerAccountApiCustomScalars,decodeEncodedVariant,flattenConnection,getAdjacentAndFirstAvailableVariants,getClientBrowserParameters,getProductOptions,getShopifyCookies,isOptionValueCombinationInEncodedVariant,mapSelectedProductOptionToObject,parseGid,parseMetafield,sendShopifyAnalytics,storefrontApiCustomScalars,useLoadScript,useMoney,useSelectedOptionInUrlParam,useShopifyCookies}from'@shopify/hydrogen-react';import {createGraphQLClient}from'@shopify/graphql-client';import {parse,stringify}from'worktop/cookie';import fa from'content-security-policy-builder';function pe(e){let{type:t,data:r={},customData:n}=e,o=useLocation(),{publish:a,cart:s,prevCart:c,shop:i,customData:u}=j(),p=o.pathname+o.search,l={...r,customData:{...u,...n},cart:s,prevCart:c,shop:i};return useEffect(()=>{i?.shopId&&(l={...l,url:window.location.href},a(t,l));},[a,p,i?.shopId]),null}function Yt(e){return jsx(pe,{...e,type:"page_viewed"})}function Jt(e){return jsx(pe,{...e,type:"product_viewed"})}function zt(e){return jsx(pe,{...e,type:"collection_viewed"})}function Xt(e){return jsx(pe,{...e,type:"cart_viewed"})}function Zt(e){return jsx(pe,{...e,type:"search_viewed"})}function er(e){return jsx(pe,{...e})}var F={PAGE_VIEWED:"page_viewed",PRODUCT_VIEWED:"product_viewed",COLLECTION_VIEWED:"collection_viewed",CART_VIEWED:"cart_viewed",SEARCH_VIEWED:"search_viewed",CART_UPDATED:"cart_updated",PRODUCT_ADD_TO_CART:"product_added_to_cart",PRODUCT_REMOVED_FROM_CART:"product_removed_from_cart",CUSTOM_EVENT:"custom_"};var Eo="https://cdn.shopify.com/shopifycloud/consent-tracking-api/v0.1/consent-tracking-api.js",bo="https://cdn.shopify.com/shopifycloud/privacy-banner/storefront-banner.js";function tt(e){console.error(`[h2:error:useCustomerPrivacy] Unable to setup Customer Privacy API: Missing consent.${e} configuration.`);}function rt(e){let{withPrivacyBanner:t=false,onVisitorConsentCollected:r,onReady:n,...o}=e;useLoadScript(t?bo:Eo,{attributes:{id:"customer-privacy-api"}});let{observing:a,setLoaded:s}=wo({withPrivacyBanner:t,onLoaded:n}),c=useMemo(()=>{let{checkoutDomain:u,storefrontAccessToken:p}=o;return u||tt("checkoutDomain"),p||tt("storefrontAccessToken"),(p.startsWith("shpat_")||p.length!==32)&&console.error("[h2:error:useCustomerPrivacy] It looks like you passed a private access token, make sure to use the public token"),{checkoutRootDomain:u,storefrontAccessToken:p,storefrontRootDomain:or(u),country:o.country,locale:o.locale}},[o,or,tt]);useEffect(()=>{let u=p=>{r&&r(p.detail);};return document.addEventListener("visitorConsentCollected",u),()=>{document.removeEventListener("visitorConsentCollected",u);}},[r]),useEffect(()=>{if(!t||a.current.privacyBanner)return;a.current.privacyBanner=true;let u=window.privacyBanner||void 0;Object.defineProperty(window,"privacyBanner",{configurable:true,get(){return u},set(l){if(typeof l=="object"&&l!==null&&"showPreferences"in l&&"loadBanner"in l){let g=l;g.loadBanner(c),u=ar({privacyBanner:g,config:c}),s.privacyBanner(),rr();}}});},[t,c,ar,s.privacyBanner]),useEffect(()=>{if(a.current.customerPrivacy)return;a.current.customerPrivacy=true;let u=null,p=window.Shopify||void 0;Object.defineProperty(window,"Shopify",{configurable:true,get(){return p},set(l){typeof l=="object"&&l!==null&&Object.keys(l).length===0&&(p=l,Object.defineProperty(window.Shopify,"customerPrivacy",{configurable:true,get(){return u},set(g){if(typeof g=="object"&&g!==null&&"setTrackingConsent"in g){let m=g;u={...m,setTrackingConsent:nr({customerPrivacy:m,config:c})},p={...p,customerPrivacy:u},s.customerPrivacy(),rr();}}}));}});},[c,nr,s.customerPrivacy]);let i={customerPrivacy:le()};return t&&(i.privacyBanner=Le()),i}var tr=false;function rr(){if(tr)return;tr=true;let e=new CustomEvent("shopifyCustomerPrivacyApiLoaded");document.dispatchEvent(e);}function wo({withPrivacyBanner:e,onLoaded:t}){let r=useRef({customerPrivacy:false,privacyBanner:false}),[n,o]=useState(e?[false,false]:[false]),a=n.every(Boolean),s={customerPrivacy:()=>{o(e?c=>[true,c[1]]:()=>[true]);},privacyBanner:()=>{e&&o(c=>[c[0],true]);}};return useEffect(()=>{a&&t&&t();},[a,t]),{observing:r,setLoaded:s}}function or(e){if(typeof window>"u")return;let t=window.document.location.host,r=e.split(".").reverse(),n=t.split(".").reverse(),o=[];return r.forEach((a,s)=>{a===n[s]&&o.push(a);}),o.reverse().join(".")}function nr({customerPrivacy:e,config:t}){let r=e.setTrackingConsent,{locale:n,country:o,...a}=t;function s(c,i){r({...a,headlessStorefront:true,...c},i);}return s}function ar({privacyBanner:e,config:t}){let r=e.loadBanner,n=e.showPreferences;function o(s){if(typeof s=="object"){r({...t,...s});return}r(t);}function a(s){if(typeof s=="object"){n({...t,...s});return}n(t);}return {loadBanner:o,showPreferences:a}}function le(){try{return window.Shopify&&window.Shopify.customerPrivacy?window.Shopify?.customerPrivacy:null}catch{return null}}function Le(){try{return window&&window?.privacyBanner?window.privacyBanner:null}catch{return null}}var sr="2025.5.0";function Uo(){let e=le();if(!e)throw new Error("Shopify Customer Privacy API not available. Must be used within a useEffect. Make sure to load the Shopify Customer Privacy API with useCustomerPrivacy() or <AnalyticsProvider>.");return e}function ur({consent:e,onReady:t,domain:r}){let{subscribe:n,register:o,canTrack:a}=j(),[s,c]=useState(false),[i,u]=useState(false),p=useRef(false),{checkoutDomain:l,storefrontAccessToken:g,language:m}=e,{ready:d}=o("Internal_Shopify_Analytics");return rt({...e,locale:m,checkoutDomain:l||"mock.shop",storefrontAccessToken:g||"abcdefghijklmnopqrstuvwxyz123456",onVisitorConsentCollected:()=>u(true),onReady:()=>u(true)}),useShopifyCookies({hasUserConsent:i?a():true,domain:r,checkoutDomain:l}),useEffect(()=>{p.current||(p.current=true,n(F.PAGE_VIEWED,ko),n(F.PRODUCT_VIEWED,No),n(F.COLLECTION_VIEWED,Mo),n(F.SEARCH_VIEWED,Vo),n(F.PRODUCT_ADD_TO_CART,Fo),c(true));},[n]),useEffect(()=>{s&&i&&(d(),t());},[s,i,t]),null}function ke(e){console.error(`[h2:error:ShopifyAnalytics] Unable to send Shopify analytics: Missing shop.${e} configuration.`);}function ve(e){let t=Uo(),r=t.analyticsProcessingAllowed();if(!e?.shop?.shopId){ke("shopId");return}if(!e?.shop?.acceptedLanguage){ke("acceptedLanguage");return}if(!e?.shop?.currency){ke("currency");return}if(!e?.shop?.hydrogenSubchannelId){ke("hydrogenSubchannelId");return}return {shopifySalesChannel:"hydrogen",assetVersionId:sr,...e.shop,hasUserConsent:r,...getClientBrowserParameters(),ccpaEnforced:!t.saleOfDataAllowed(),gdprEnforced:!(t.marketingAllowed()&&t.analyticsProcessingAllowed()),analyticsAllowed:t.analyticsProcessingAllowed(),marketingAllowed:t.marketingAllowed(),saleOfDataAllowed:t.saleOfDataAllowed()}}function Lo(e,t){if(t===null)return;let r=ve(e);return r?{...r,cartId:t.id}:void 0}var te={};function ko(e){let t=ve(e);t&&(sendShopifyAnalytics({eventName:AnalyticsEventName.PAGE_VIEW_2,payload:{...t,...te}}),te={});}function No(e){let t=ve(e);if(t&&pr({type:"product",products:e.products})){let r=ot(e.products);te={pageType:AnalyticsPageType.product,resourceId:r[0].productGid},t={...t,...te,products:ot(e.products)},sendShopifyAnalytics({eventName:AnalyticsEventName.PRODUCT_VIEW,payload:t});}}function Mo(e){let t=ve(e);t&&(te={pageType:AnalyticsPageType.collection,resourceId:e.collection.id},t={...t,...te,collectionHandle:e.collection.handle,collectionId:e.collection.id},sendShopifyAnalytics({eventName:AnalyticsEventName.COLLECTION_VIEW,payload:t}));}function Vo(e){let t=ve(e);t&&(te={pageType:AnalyticsPageType.search},t={...t,...te,searchString:e.searchTerm},sendShopifyAnalytics({eventName:AnalyticsEventName.SEARCH_VIEW,payload:t}));}function Fo(e){let{cart:t,currentLine:r}=e,n=Lo(e,t);!n||!r?.id||qo({matchedLine:r,eventPayload:n});}function qo({matchedLine:e,eventPayload:t}){let r={id:e.merchandise.product.id,variantId:e.merchandise.id,title:e.merchandise.product.title,variantTitle:e.merchandise.title,vendor:e.merchandise.product.vendor,price:e.merchandise.price.amount,quantity:e.quantity,productType:e.merchandise.product.productType,sku:e.merchandise.sku};pr({type:"cart",products:[r]})&&sendShopifyAnalytics({eventName:AnalyticsEventName.ADD_TO_CART,payload:{...t,products:ot([r])}});}function se(e,t,r,n){if(e==="cart"){let o=`${r?"merchandise":"merchandise.product"}.${t}`;console.error(`[h2:error:ShopifyAnalytics] Can't set up cart analytics events because the \`cart.lines[].${o}\` value is missing from your GraphQL cart query. In your project, search for where \`fragment CartLine on CartLine\` is defined and make sure \`${o}\` is part of your cart query. Check the Hydrogen Skeleton template for reference: https://github.com/Shopify/hydrogen/blob/main/templates/skeleton/app/lib/fragments.ts#L25-L56.`);}else {let o=`${n||t}`;console.error(`[h2:error:ShopifyAnalytics] Can't set up product view analytics events because the \`${o}\` is missing from your \`<Analytics.ProductView>\`. Make sure \`${o}\` is part of your products data prop. Check the Hydrogen Skeleton template for reference: https://github.com/Shopify/hydrogen/blob/main/templates/skeleton/app/routes/products.%24handle.tsx#L159-L165.`);}}function pr({type:e,products:t}){return !t||t.length===0?(se(e,"",false,"data.products"),false):(t.forEach(r=>{if(!r.id)return se(e,"id",false),false;if(!r.title)return se(e,"title",false),false;if(!r.price)return se(e,"price.amount",true,"price"),false;if(!r.vendor)return se(e,"vendor",false),false;if(!r.variantId)return se(e,"id",true,"variantId"),false;if(!r.variantTitle)return se(e,"title",true,"variantTitle"),false}),true)}function ot(e){return e.map(t=>{let r={productGid:t.id,variantGid:t.variantId,name:t.title,variantName:t.variantTitle,brand:t.vendor,price:t.price,quantity:t.quantity||1,category:t.productType};return t.sku&&(r.sku=t.sku),t.productType&&(r.category=t.productType),r})}function yr(e){console.error(`[h2:error:CartAnalytics] Can't set up cart analytics events because the \`cart.${e}\` value is missing from your GraphQL cart query. In your project, search for where \`fragment CartApiQuery on Cart\` is defined and make sure \`${e}\` is part of your cart query. Check the Hydrogen Skeleton template for reference: https://github.com/Shopify/hydrogen/blob/main/templates/skeleton/app/lib/fragments.ts#L59.`);}function fr({cart:e,setCarts:t}){let{publish:r,shop:n,customData:o,canTrack:a,cart:s,prevCart:c}=j(),i=useRef(null);return useEffect(()=>{if(e)return Promise.resolve(e).then(u=>{if(u&&u.lines){if(!u.id){yr("id");return}if(!u.updatedAt){yr("updatedAt");return}}t(({cart:p,prevCart:l})=>u?.updatedAt!==p?.updatedAt?{cart:u,prevCart:p}:{cart:p,prevCart:l});}),()=>{}},[t,e]),useEffect(()=>{if(!s||!s?.updatedAt||s?.updatedAt===c?.updatedAt)return;let u;try{u=JSON.parse(localStorage.getItem("cartLastUpdatedAt")||"");}catch{u=null;}if(s.id===u?.id&&s.updatedAt===u?.updatedAt)return;let p={eventTimestamp:Date.now(),cart:s,prevCart:c,shop:n,customData:o};if(s.updatedAt===i.current)return;i.current=s.updatedAt,r("cart_updated",p),localStorage.setItem("cartLastUpdatedAt",JSON.stringify({id:s.id,updatedAt:s.updatedAt}));let l=c?.lines?flattenConnection(c?.lines):[],g=s.lines?flattenConnection(s.lines):[];l?.forEach(m=>{let d=g.filter(y=>m.id===y.id);if(d?.length===1){let y=d[0];m.quantity<y.quantity?r("product_added_to_cart",{...p,prevLine:m,currentLine:y}):m.quantity>y.quantity&&r("product_removed_from_cart",{...p,prevLine:m,currentLine:y});}else r("product_removed_from_cart",{...p,prevLine:m});}),g?.forEach(m=>{let d=l.filter(y=>m.id===y.id);(!d||d.length===0)&&r("product_added_to_cart",{...p,currentLine:m});});},[s,c,r,n,o,a]),null}var Wo="https://cdn.shopify.com/shopifycloud/perf-kit/shopify-perf-kit-spa.min.js";function mr({shop:e}){let t=useRef(false),{subscribe:r,register:n}=j(),{ready:o}=n("Internal_Shopify_Perf_Kit"),a=useLoadScript(Wo,{attributes:{id:"perfkit","data-application":"hydrogen","data-shop-id":parseGid(e.shopId).id.toString(),"data-storefront-id":e.hydrogenSubchannelId,"data-monorail-region":"global","data-spa-mode":"true","data-resource-timing-sampling-rate":"100"}});return useEffect(()=>{a!=="done"||t.current||(t.current=true,r(F.PAGE_VIEWED,()=>{window.PerfKit?.navigate();}),r(F.PRODUCT_VIEWED,()=>{window.PerfKit?.setPageType("product");}),r(F.COLLECTION_VIEWED,()=>{window.PerfKit?.setPageType("collection");}),r(F.SEARCH_VIEWED,()=>{window.PerfKit?.setPageType("search");}),r(F.CART_VIEWED,()=>{window.PerfKit?.setPageType("cart");}),o());},[r,o,a]),null}var gr=new Set,K=e=>{gr.has(e)||(console.warn(e),gr.add(e));},hr=new Set,at=e=>{hr.has(e)||(console.error(new Error(e)),hr.add(e));};var Xo={canTrack:()=>false,cart:null,customData:{},prevCart:null,publish:()=>{},shop:null,subscribe:()=>{},register:()=>({ready:()=>{}}),customerPrivacy:null,privacyBanner:null},Ir=createContext(Xo),Ve=new Map,Ie={};function Tr(){return Object.values(Ie).every(Boolean)}function Cr(e,t){Ve.has(e)||Ve.set(e,new Map),Ve.get(e)?.set(t.toString(),t);}var Fe=new Map;function Ar(e,t){if(!Tr()){Fe.set(e,t);return}Rr(e,t);}function Rr(e,t){(Ve.get(e)??new Map).forEach((r,n)=>{try{r(t);}catch(o){typeof o=="object"&&o instanceof Error?console.error("Analytics publish error",o.message,n,o.stack):console.error("Analytics publish error",o,n);}});}function Pr(e){return Ie.hasOwnProperty(e)||(Ie[e]=false),{ready:()=>{Ie[e]=true,Tr()&&Fe.size>0&&(Fe.forEach((t,r)=>{Rr(r,t);}),Fe.clear());}}}function Sr(){try{return window.Shopify.customerPrivacy.analyticsProcessingAllowed()}catch{}return  false}function vr(e,t){return `[h2:error:Analytics.Provider] - ${e} is required. Make sure ${t} is defined in your environment variables. See https://h2o.fyi/analytics/consent to learn how to setup environment variables in the Shopify admin.`}function Zo({canTrack:e,cart:t,children:r,consent:n,customData:o={},shop:a=null,cookieDomain:s}){let c=useRef(false),{shop:i}=en(a),[u,p]=useState(!!e),[l,g]=useState({cart:null,prevCart:null}),[m,d]=useState(e?()=>e:()=>Sr);if(i)if(/\/68817551382$/.test(i.shopId))K("[h2:error:Analytics.Provider] - Mock shop is used. Analytics will not work properly.");else {if(!n.checkoutDomain){let A=vr("consent.checkoutDomain","PUBLIC_CHECKOUT_DOMAIN");at(A);}if(!n.storefrontAccessToken){let A=vr("consent.storefrontAccessToken","PUBLIC_STOREFRONT_API_TOKEN");at(A);}n?.country||(n.country="US"),n?.language||(n.language="EN"),n.withPrivacyBanner===void 0&&(n.withPrivacyBanner=false);}let y=useMemo(()=>({canTrack:m,...l,customData:o,publish:m()?Ar:()=>{},shop:i,subscribe:Cr,register:Pr,customerPrivacy:le(),privacyBanner:Le()}),[u,m,l,l.cart?.updatedAt,l.prevCart,Ar,Cr,o,i,Pr,JSON.stringify(Ie),le,Le]);return jsxs(Ir.Provider,{value:y,children:[r,!!i&&jsx(Yt,{}),!!i&&!!t&&jsx(fr,{cart:t,setCarts:g}),!!i&&n.checkoutDomain&&jsx(ur,{consent:n,onReady:()=>{c.current=true,p(true),d(e?()=>e:()=>Sr);},domain:s}),!!i&&jsx(mr,{shop:i})]})}function j(){let e=useContext(Ir);if(!e)throw new Error("[h2:error:useAnalytics] 'useAnalytics()' must be a descendent of <AnalyticsProvider/>");return e}function en(e){let[t,r]=useState(null);return useEffect(()=>(Promise.resolve(e).then(r),()=>{}),[r,e]),{shop:t}}async function tn({storefront:e,publicStorefrontId:t="0"}){return e.query(rn,{cache:e.CacheLong()}).then(({shop:r,localization:n})=>({shopId:r.id,acceptedLanguage:n.language.isoCode,currency:n.country.currency.isoCode,hydrogenSubchannelId:t}))}var rn=`#graphql
example-hydrogen-express:build:    |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               ^
example-hydrogen-express:build: 2  |    query ShopData(
example-hydrogen-express:build: 3  |      $country: CountryCode
example-hydrogen-express:build:     at createConfigLoader (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/@react-router/dev/dist/vite.js:589:11)
example-hydrogen-express:build:     at config (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/@react-router/dev/dist/vite.js:3082:35)
example-hydrogen-express:build:     at runConfigHook (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/vite/dist/node/chunks/dep-DrOo5SEf.js:54681:17)
example-hydrogen-express:build:     at Module.resolveConfig (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/vite/dist/node/chunks/dep-DrOo5SEf.js:53990:12)
example-hydrogen-express:build:     at resolveViteConfig (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/@react-router/dev/dist/cli/index.js:1435:20)
example-hydrogen-express:build:     at viteBuild (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/@react-router/dev/dist/cli/index.js:1861:20)
example-hydrogen-express:build:     at build (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/@react-router/dev/dist/cli/index.js:1787:10)
example-hydrogen-express:build:     at build2 (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/@react-router/dev/dist/cli/index.js:2124:5)
example-hydrogen-express:build:     at run2 (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/@react-router/dev/dist/cli/index.js:2405:7)
example-hydrogen-express:build: npm error Lifecycle script `build` failed with error:
example-hydrogen-express:build: npm error code 1
example-hydrogen-express:build: npm error path /Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/examples/express
example-hydrogen-express:build: npm error workspace example-hydrogen-express
example-hydrogen-express:build: npm error location /Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/examples/express
example-hydrogen-express:build: npm error command failed
example-hydrogen-express:build: npm error command sh -c react-router build
example-hydrogen-express:build: ERROR: command finished with error: command (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/examples/express) /opt/homebrew/bin/npm run build exited (1)
example-gtm:build: cache miss, executing 2bb6e621a64e62c1
example-legacy-customer-account-flow:build: cache miss, executing 4220cbd6af73dd98
example-partytown:build: cache miss, executing 724ae9b5cf7228c6
example-metaobjects:build: cache miss, executing 98e2bc43db98d0cd
example-hydrogen-express#build: command (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/examples/express) /opt/homebrew/bin/npm run build exited (1)

 Tasks:    0 successful, 14 total
Cached:    0 cached, 14 total
  Time:    1.376s 
Failed:    example-hydrogen-express#build

 ERROR  run failed: command  exited (1)
```

## 2. TEST RESULTS
```

> test
> turbo run test --parallel

turbo 2.3.4

• Packages in scope: @shopify/cli-hydrogen, @shopify/create-hydrogen, @shopify/hydrogen, @shopify/hydrogen-codegen, @shopify/hydrogen-react, @shopify/mini-oxygen, @shopify/remix-oxygen, docs-preview, example-b2b, example-custom-cart-method, example-gtm, example-hydrogen-express, example-infinite-scroll, example-legacy-customer-account-flow, example-metaobjects, example-multipass, example-partytown, example-subscriptions, example-third-party-queries-caching, skeleton
• Running test in 20 packages
• Remote caching disabled
@shopify/hydrogen:test: cache miss, executing db79bf8d8b2f0dc8
@shopify/mini-oxygen:test: cache miss, executing bfc5ed608497d097
@shopify/cli-hydrogen:test: cache miss, executing 45408ef2b7581fe3
@shopify/hydrogen-codegen:test: cache miss, executing b125be5f1f28cd2a
@shopify/hydrogen-react:test: cache miss, executing f339a0451b6c8e95
@shopify/mini-oxygen:build: cache miss, executing d4a92c597c8e7274
@shopify/hydrogen-codegen:build: cache miss, executing a726936b46df0496
@shopify/hydrogen-codegen:build: 
@shopify/hydrogen-codegen:build: > @shopify/hydrogen-codegen@0.3.3 build
@shopify/hydrogen-codegen:build: > tsup --clean
@shopify/hydrogen-codegen:build: 
@shopify/hydrogen:test: 
@shopify/hydrogen:test: > @shopify/hydrogen@2025.5.0 test
@shopify/hydrogen:test: > vitest run
@shopify/hydrogen:test: 
@shopify/mini-oxygen:test: 
@shopify/mini-oxygen:test: > @shopify/mini-oxygen@3.2.1 test
@shopify/mini-oxygen:test: > NODE_OPTIONS=--experimental-vm-modules vitest run --test-timeout=60000
@shopify/mini-oxygen:test: 
@shopify/mini-oxygen:build: 
@shopify/mini-oxygen:build: > @shopify/mini-oxygen@3.2.1 build
@shopify/mini-oxygen:build: > tsup
@shopify/mini-oxygen:build: 
@shopify/cli-hydrogen:test: 
@shopify/cli-hydrogen:test: > @shopify/cli-hydrogen@11.1.3 test
@shopify/cli-hydrogen:test: > cross-env SHOPIFY_UNIT_TEST=1 LANG=en-US.UTF-8 vitest run --test-timeout=60000
@shopify/cli-hydrogen:test: 
@shopify/hydrogen-codegen:test: 
@shopify/hydrogen-codegen:test: > @shopify/hydrogen-codegen@0.3.3 test
@shopify/hydrogen-codegen:test: > cross-env SHOPIFY_UNIT_TEST=1 vitest run --typecheck
@shopify/hydrogen-codegen:test: 
@shopify/hydrogen-react:test: 
@shopify/hydrogen-react:test: > @shopify/hydrogen-react@2025.5.0 test
@shopify/hydrogen-react:test: > vitest run --coverage
@shopify/hydrogen-react:test: 
@shopify/mini-oxygen:test: 
@shopify/mini-oxygen:test:  RUN  v1.0.4 /Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/mini-oxygen
@shopify/mini-oxygen:test: 
@shopify/hydrogen:test: (node:52456) [DEP0180] DeprecationWarning: fs.Stats constructor is deprecated.
@shopify/hydrogen:test: (Use `node --trace-deprecation ...` to show where the warning was created)
@shopify/mini-oxygen:build: CLI Building entry: src/vite/worker-entry.ts
@shopify/mini-oxygen:build: CLI Using tsconfig: tsconfig.json
@shopify/mini-oxygen:build: CLI tsup v8.4.0
@shopify/mini-oxygen:build: CLI Using tsup config: /Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/mini-oxygen/tsup.config.ts
@shopify/mini-oxygen:build: CLI Building entry: src/common/compat.ts, src/common/debug.ts, src/common/error-page.ts, src/common/find-port.ts, src/common/headers.ts, src/node/core.ts, src/node/index.ts, src/node/server.ts, src/node/storage.ts, src/vite/entry-error.ts, src/vite/plugin.ts, src/vite/server-middleware.ts, src/vite/utils.ts, src/worker/assets.ts, src/worker/devtools.ts, src/worker/handler.ts, src/worker/index.ts, src/worker/inspector.ts, src/worker/logger.ts, src/worker/utils.ts
@shopify/mini-oxygen:build: CLI Using tsconfig: tsconfig.json
@shopify/mini-oxygen:build: CLI tsup v8.4.0
@shopify/mini-oxygen:build: CLI Using tsup config: /Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/mini-oxygen/tsup.config.ts
@shopify/hydrogen-codegen:build: CLI Building entry: src/defaults.ts, src/index.ts, src/preset.ts, src/schema.ts
@shopify/hydrogen-codegen:build: CLI Using tsconfig: tsconfig.json
@shopify/hydrogen-codegen:build: CLI tsup v8.4.0
@shopify/hydrogen-codegen:build: CLI Using tsup config: /Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen-codegen/tsup.config.ts
@shopify/hydrogen-codegen:build: CLI Building entry: src/defaults.ts, src/index.ts, src/preset.ts, src/schema.ts
@shopify/hydrogen-codegen:build: CLI Using tsconfig: tsconfig.json
@shopify/hydrogen-codegen:build: CLI tsup v8.4.0
@shopify/hydrogen-codegen:build: CLI Using tsup config: /Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen-codegen/tsup.config.ts
@shopify/mini-oxygen:build: CLI Target: es2022
@shopify/mini-oxygen:build: ESM Build start
@shopify/mini-oxygen:build: CLI Target: es2022
@shopify/mini-oxygen:build: ESM Build start
@shopify/hydrogen:test: 
@shopify/hydrogen:test:  RUN  v1.0.4 /Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen
@shopify/hydrogen:test: 
@shopify/hydrogen-codegen:build: CLI Target: esnext
@shopify/hydrogen-codegen:build: CLI Target: esnext
@shopify/hydrogen-codegen:build: CLI Cleaning output folder
@shopify/hydrogen-codegen:build: CJS Build start
@shopify/hydrogen-codegen:build: CLI Cleaning output folder
@shopify/hydrogen-codegen:build: ESM Build start
@shopify/hydrogen-react:test: [33mThe CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.[39m
@shopify/mini-oxygen:build: ESM dist/vite/worker-entry.js 54.48 KB
@shopify/mini-oxygen:build: ESM ⚡️ Build success in 150ms
@shopify/mini-oxygen:build: ESM dist/worker/index.js           6.47 KB
@shopify/mini-oxygen:build: ESM dist/worker/utils.js           0 B
@shopify/mini-oxygen:build: ESM dist/node/storage.js           842.00 B
@shopify/mini-oxygen:build: ESM dist/common/compat.js          129.00 B
@shopify/mini-oxygen:build: ESM dist/worker/inspector.js       7.13 KB
@shopify/mini-oxygen:build: ESM dist/vite/entry-error.js       2.48 KB
@shopify/mini-oxygen:build: ESM dist/worker/logger.js          7.81 KB
@shopify/mini-oxygen:build: ESM dist/vite/plugin.js            4.17 KB
@shopify/mini-oxygen:build: ESM dist/vite/server-middleware.js 6.06 KB
@shopify/mini-oxygen:build: ESM dist/worker/handler.js         2.15 KB
@shopify/mini-oxygen:build: ESM dist/common/debug.js           132.00 B
@shopify/mini-oxygen:build: ESM dist/vite/utils.js             1018.00 B
@shopify/mini-oxygen:build: ESM dist/worker/assets.js          2.75 KB
@shopify/mini-oxygen:build: ESM dist/common/find-port.js       210.00 B
@shopify/mini-oxygen:build: ESM dist/common/headers.js         1.20 KB
@shopify/mini-oxygen:build: ESM dist/node/index.js             3.78 KB
@shopify/mini-oxygen:build: ESM dist/node/core.js              5.70 KB
@shopify/mini-oxygen:build: ESM dist/common/error-page.js      452.00 B
@shopify/mini-oxygen:build: ESM dist/worker/devtools.js        7.35 KB
@shopify/mini-oxygen:build: ESM dist/node/server.js            7.24 KB
@shopify/mini-oxygen:build: ESM ⚡️ Build success in 153ms
@shopify/cli-hydrogen:test: (node:52641) [DEP0180] DeprecationWarning: fs.Stats constructor is deprecated.
@shopify/cli-hydrogen:test: (Use `node --trace-deprecation ...` to show where the warning was created)
@shopify/cli-hydrogen:test: 
@shopify/cli-hydrogen:test:  RUN  v1.0.4 /Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/cli
@shopify/cli-hydrogen:test: 
@shopify/hydrogen-codegen:test: Testing types with tsc and vue-tsc is an experimental feature.
@shopify/hydrogen-codegen:test: Breaking changes might not follow SemVer, please pin Vitest's version when using it.
@shopify/hydrogen-codegen:test: 
@shopify/hydrogen-codegen:test:  RUN  v1.0.4 /Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen-codegen
@shopify/hydrogen-codegen:test: 
@shopify/hydrogen-codegen:test: (node:52643) [DEP0180] DeprecationWarning: fs.Stats constructor is deprecated.
@shopify/hydrogen-codegen:test: (Use `node --trace-deprecation ...` to show where the warning was created)
@shopify/hydrogen-react:test: (node:52648) [DEP0180] DeprecationWarning: fs.Stats constructor is deprecated.
@shopify/hydrogen-react:test: (Use `node --trace-deprecation ...` to show where the warning was created)
@shopify/hydrogen-codegen:build: ESM dist/esm/index.js        226.00 B
@shopify/hydrogen-codegen:build: ESM dist/esm/defaults.js     1.49 KB
@shopify/hydrogen-codegen:build: ESM dist/esm/schema.js       705.00 B
@shopify/hydrogen-codegen:build: ESM dist/esm/preset.js       935.00 B
@shopify/hydrogen-codegen:build: ESM dist/esm/schema.js.map   1.68 KB
@shopify/hydrogen-codegen:build: ESM dist/esm/preset.js.map   1.83 KB
@shopify/hydrogen-codegen:build: ESM dist/esm/index.js.map    89.00 B
@shopify/hydrogen-codegen:build: ESM dist/esm/defaults.js.map 2.76 KB
@shopify/hydrogen-codegen:build: ESM ⚡️ Build success in 641ms
@shopify/hydrogen-react:test: 
@shopify/hydrogen-react:test:  RUN  v1.0.4 /Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen-react
@shopify/hydrogen-react:test:       Coverage enabled with v8
@shopify/hydrogen-react:test: 
@shopify/mini-oxygen:build: DTS Build start
@shopify/hydrogen:test:  ❯ src/pagination/pagination.test.ts  (0 test)
@shopify/mini-oxygen:test:  ✓ src/vite/utils.test.ts  (9 tests) 5ms
@shopify/mini-oxygen:test:  ✓ src/vite/streaming.test.ts  (4 tests) 93ms
@shopify/hydrogen:test:  ✓ src/sitemap/sitemap.test.ts  (12 tests) 134ms
@shopify/hydrogen:test:  ❯ src/product/VariantSelector.test.ts  (0 test)
@shopify/hydrogen:test:  ❯ src/cart/createCartHandler.test.ts  (0 test)
@shopify/hydrogen:test:  ✓ src/createHydrogenContext.test.ts  (26 tests) 13ms
@shopify/hydrogen:test: stderr | src/cart/optimistic/useOptimisticCart.test.tsx > useOptimisticCart > LinesAdd > errors when no selected variant is passed
@shopify/hydrogen:test:  ✓ src/cart/optimistic/useOptimisticCart.test.tsx  (25 tests) 9ms
@shopify/hydrogen:test: [h2:error:useOptimisticCart] No selected variant was passed in the cart action. Make sure to pass the selected variant if you want to use an optimistic cart
@shopify/hydrogen:test: 
@shopify/hydrogen:test:  ✓ src/seo/generate-seo-tags.test.ts  (24 tests) 22ms
@shopify/hydrogen:test:  ✓ src/seo/getSeoMeta.test.ts  (28 tests) 13ms
@shopify/hydrogen:test:  ❯ src/analytics-manager/AnalyticsProvider.test.tsx  (0 test)
@shopify/hydrogen:test: stderr | src/customer/customer.test.ts > customer > login & logout > using new auth url when shopId is present in env > Redirects to the customer account api login url with DEFAULT_AUTH_URL as param if authUrl is cross domain
@shopify/hydrogen:test: Cross-domain redirects are not supported. Tried to redirect from https://something-good.com to https://something-bad.com/customer-account/auth. Default url https://something-good.com/account/authorize is used instead.
@shopify/hydrogen:test: 
@shopify/hydrogen:test: stderr | src/customer/customer.test.ts > customer > login & logout > logout > using new auth url when shopId is present in env > Redirects to app origin if postLogoutRedirectUri is cross-site when customer is not login
@shopify/hydrogen:test: Cross-domain redirects are not supported. Tried to redirect from https://shop123.com to https://something-bad.com/post-logout-landing-page. Default url https://shop123.com/ is used instead.
@shopify/hydrogen:test: 
@shopify/hydrogen:test:  ✓ src/customer/customer.test.ts  (52 tests) 164ms
@shopify/hydrogen-react:test:  ✓ src/optionValueDecoder.test.ts  (16 tests) 71ms
@shopify/hydrogen-react:test:  ✓ src/getProductOptions.test.ts  (24 tests) 16ms
@shopify/hydrogen-react:test:  ✓ src/useShopifyCookies.test.tsx  (10 tests) 21ms
@shopify/hydrogen-react:test:  ✓ src/ShopifyProvider.test.tsx  (11 tests) 28ms
@shopify/hydrogen:test:  ✓ src/routing/redirect.test.ts  (13 tests) 339ms
@shopify/hydrogen:test: stderr | src/routing/redirect.test.ts > storefrontRedirect > redirect fallback with search params > does not redirect to absolute URLs
@shopify/hydrogen:test: Cross-domain redirects are not supported. Tried to redirect from /missing?redirect=https://some-page.com to https://some-page.com
@shopify/hydrogen:test: Cross-domain redirects are not supported. Tried to redirect from /missing?redirect=//some-page.com to //some-page.com
@shopify/hydrogen:test: Cross-domain redirects are not supported. Tried to redirect from /missing?redirect=javascript:alert(1) to javascript:alert(1)
@shopify/hydrogen:test: Cross-domain redirects are not supported. Tried to redirect from /missing?return_to=%01http%3A%2F%2Fexample.com to http://example.com
@shopify/hydrogen:test: 
@shopify/mini-oxygen:test:  ✓ src/worker/e2e.test.ts  (6 tests) 2056ms
@shopify/hydrogen-react:test:  ✓ src/parse-metafield.test.ts  (39 tests | 1 skipped) 91ms
@shopify/hydrogen:test:  ✓ src/cache/create-with-cache.test.ts  (10 tests) 10ms
@shopify/hydrogen:test:  ✓ src/customer/auth.helpers.test.ts  (8 tests) 14ms
@shopify/hydrogen-react:test:  ✓ src/analytics.test.ts  (11 tests) 14ms
@shopify/hydrogen-react:test:  ✓ src/analytics-schema-custom-storefront-customer-tracking.test.ts  (9 tests) 15ms
@shopify/hydrogen:test:  ❯ src/storefront.test.ts  (0 test)
@shopify/hydrogen:test:  ✓ src/product/useOptimisticVariant.test.tsx  (6 tests) 19ms
@shopify/hydrogen:test:  ✓ src/seo/log-seo-tags.test.ts  (3 tests) 17ms
@shopify/hydrogen:test: stderr | src/seo/seo.test.ts > seo > it does not render any tags if seo is not provided
@shopify/hydrogen:test: [h2:warn:Seo] The `<Seo/>` component is deprecated. Use `getSeoMeta` instead.
@shopify/hydrogen:test: See: https://shopify.dev/docs/api/hydrogen/utilities/getseometa
@shopify/hydrogen:test: 
@shopify/hydrogen:test: stderr | src/seo/seo.test.ts > seo > takes the latest route match
@shopify/hydrogen:test: [h2:warn:Seo] The `<Seo/>` component is deprecated. Use `getSeoMeta` instead.
@shopify/hydrogen:test: See: https://shopify.dev/docs/api/hydrogen/utilities/getseometa
@shopify/hydrogen:test: 
@shopify/hydrogen:test: stderr | src/seo/seo.test.ts > seo > uses seo loader data to generate the meta tags
@shopify/hydrogen:test: [h2:warn:Seo] The `<Seo/>` component is deprecated. Use `getSeoMeta` instead.
@shopify/hydrogen:test: See: https://shopify.dev/docs/api/hydrogen/utilities/getseometa
@shopify/hydrogen:test: 
@shopify/hydrogen:test: stderr | src/seo/seo.test.ts > seo > takes the latest route match
@shopify/hydrogen:test: [h2:warn:Seo] The `<Seo/>` component is deprecated. Use `getSeoMeta` instead.
@shopify/hydrogen:test: See: https://shopify.dev/docs/api/hydrogen/utilities/getseometa
@shopify/hydrogen:test: 
@shopify/hydrogen:test: stderr | src/seo/seo.test.ts > seo > it renders a root jsonLd tag
@shopify/hydrogen:test: [h2:warn:Seo] The `<Seo/>` component is deprecated. Use `getSeoMeta` instead.
@shopify/hydrogen:test: See: https://shopify.dev/docs/api/hydrogen/utilities/getseometa
@shopify/hydrogen:test: 
@shopify/hydrogen:test: stderr | src/seo/seo.test.ts > seo > it renders multiple jsonLd tags at the root
@shopify/hydrogen:test: [h2:warn:Seo] The `<Seo/>` component is deprecated. Use `getSeoMeta` instead.
@shopify/hydrogen:test: See: https://shopify.dev/docs/api/hydrogen/utilities/getseometa
@shopify/hydrogen:test: 
@shopify/hydrogen:test: stderr | src/seo/seo.test.ts > seo > it renders multiple jsonLd tags (layout and route)
@shopify/hydrogen:test: [h2:warn:Seo] The `<Seo/>` component is deprecated. Use `getSeoMeta` instead.
@shopify/hydrogen:test: See: https://shopify.dev/docs/api/hydrogen/utilities/getseometa
@shopify/hydrogen:test: 
@shopify/hydrogen:test: stderr | src/seo/seo.test.ts > seo > escapes script content
@shopify/hydrogen:test: [h2:warn:Seo] The `<Seo/>` component is deprecated. Use `getSeoMeta` instead.
@shopify/hydrogen:test: See: https://shopify.dev/docs/api/hydrogen/utilities/getseometa
@shopify/hydrogen:test: 
@shopify/hydrogen:test:  ✓ src/seo/seo.test.ts  (8 tests) 102ms
@shopify/hydrogen:test:  ✓ src/cart/CartForm.test.tsx  (10 tests) 30ms
@shopify/hydrogen:test:  ❯ src/customer-privacy/useCustomerPrivacy.test.tsx  (0 test)
@shopify/hydrogen-react:test:  ✓ src/Image.test.tsx  (21 tests | 1 skipped) 415ms
@shopify/mini-oxygen:test:  ✓ src/node/e2e.test.ts  (12 tests) 3533ms
@shopify/mini-oxygen:test: 
@shopify/mini-oxygen:test:  Test Files  4 passed (4)
@shopify/mini-oxygen:test:       Tests  31 passed (31)
@shopify/mini-oxygen:test:    Start at  08:59:19
@shopify/mini-oxygen:test:    Duration  5.56s (transform 744ms, setup 0ms, collect 6.10s, tests 5.69s, environment 10ms, prepare 664ms)
@shopify/mini-oxygen:test: 
@shopify/hydrogen:test:  ✓ src/csp/csp.test.ts  (6 tests) 280ms
@shopify/hydrogen-react:test:  ✓ src/CartProvider.test.tsx  (57 tests) 993ms
@shopify/hydrogen:test:  ❯ src/cart/queries/cartGetDefault.test.ts  (0 test)
@shopify/cli-hydrogen:test:  ✓ src/commands/hydrogen/env/push.test.ts  (16 tests) 900ms
@shopify/hydrogen-react:test:  ✓ src/storefront-client.test.ts  (14 tests) 6ms
@shopify/hydrogen-react:test:  ✓ src/ProductProvider.test.tsx  (10 tests) 595ms
@shopify/hydrogen:test:  ✓ src/vite/get-virtual-routes.test.ts  (2 tests) 3ms
@shopify/hydrogen:test:  ❯ src/csp/Script.test.ts  (0 test)
@shopify/hydrogen-codegen:test:  ✓ tests/client.test-d.ts  (18 tests)
@shopify/hydrogen:test:  ✓ src/utils/hash.test.ts  (2 tests) 5ms
@shopify/hydrogen:test:  ❯ src/cart/queries/cartDeliveryAddressesRemoveDefault.test.ts  (0 test)
@shopify/hydrogen:test:  ❯ src/cart/queries/cartDeliveryAddressesUpdateDefault.test.ts  (0 test)
@shopify/hydrogen-react:test: stderr | src/ShopPayButton.test.tsx > <ShopPayButton /> > throws an error if you don't pass either variantIds or variantIdsAndQuantities
@shopify/hydrogen-react:test: The above error occurred in the <ShopPayButton> component:
@shopify/hydrogen-react:test: 
@shopify/hydrogen-react:test:     at ShopPayButton (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen-react/src/ShopPayButton.tsx:14:3)
@shopify/hydrogen-react:test:     at ShopifyProvider (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen-react/src/ShopifyProvider.tsx:30:3)
@shopify/hydrogen-react:test:     at wrapper (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen-react/src/ShopPayButton.test.tsx:33:23)
@shopify/hydrogen-react:test: 
@shopify/hydrogen-react:test: Consider adding an error boundary to your tree to customize error handling behavior.
@shopify/hydrogen-react:test: Visit https://reactjs.org/link/error-boundaries to learn more about error boundaries.
@shopify/hydrogen-react:test: 
@shopify/hydrogen-react:test: stderr | src/ShopPayButton.test.tsx > <ShopPayButton /> > throws an error if you pass both variantIds and variantIdsAndQuantities
@shopify/hydrogen-react:test: The above error occurred in the <ShopPayButton> component:
@shopify/hydrogen-react:test: 
@shopify/hydrogen-react:test:     at ShopPayButton (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen-react/src/ShopPayButton.tsx:14:3)
@shopify/hydrogen-react:test:     at ShopifyProvider (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen-react/src/ShopifyProvider.tsx:30:3)
@shopify/hydrogen-react:test:     at wrapper (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen-react/src/ShopPayButton.test.tsx:51:23)
@shopify/hydrogen-react:test: 
@shopify/hydrogen-react:test: Consider adding an error boundary to your tree to customize error handling behavior.
@shopify/hydrogen-react:test: Visit https://reactjs.org/link/error-boundaries to learn more about error boundaries.
@shopify/hydrogen-react:test: 
@shopify/hydrogen-react:test: stderr | src/ShopPayButton.test.tsx > <ShopPayButton /> > throws error if invalid 'variantIds' is supplied
@shopify/hydrogen-react:test: The above error occurred in the <ShopPayButton> component:
@shopify/hydrogen-react:test: 
@shopify/hydrogen-react:test:     at ShopPayButton (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen-react/src/ShopPayButton.tsx:14:3)
@shopify/hydrogen-react:test:     at ShopifyProvider (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen-react/src/ShopifyProvider.tsx:30:3)
@shopify/hydrogen-react:test:     at wrapper (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen-react/src/ShopPayButton.test.tsx:153:21)
@shopify/hydrogen-react:test: 
@shopify/hydrogen-react:test: Consider adding an error boundary to your tree to customize error handling behavior.
@shopify/hydrogen-react:test: Visit https://reactjs.org/link/error-boundaries to learn more about error boundaries.
@shopify/hydrogen-react:test: 
@shopify/hydrogen-react:test: stderr | src/ShopPayButton.test.tsx > <ShopPayButton /> > throws error if no 'storeDomain' is supplied
@shopify/hydrogen-react:test: The above error occurred in the <ShopPayButton> component:
@shopify/hydrogen-react:test: 
@shopify/hydrogen-react:test:     at ShopPayButton (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen-react/src/ShopPayButton.tsx:14:3)
@shopify/hydrogen-react:test: 
@shopify/hydrogen-react:test: Consider adding an error boundary to your tree to customize error handling behavior.
@shopify/hydrogen-react:test: Visit https://reactjs.org/link/error-boundaries to learn more about error boundaries.
@shopify/hydrogen-react:test: 
@shopify/hydrogen-react:test: stderr | src/ShopPayButton.test.tsx > <ShopPayButton /> > throws an error if you pass an invalid channel value
@shopify/hydrogen-react:test: The above error occurred in the <ShopPayButton> component:
@shopify/hydrogen-react:test: 
@shopify/hydrogen-react:test:     at ShopPayButton (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen-react/src/ShopPayButton.tsx:14:3)
@shopify/hydrogen-react:test:     at ShopifyProvider (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen-react/src/ShopifyProvider.tsx:30:3)
@shopify/hydrogen-react:test:     at wrapper (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen-react/src/ShopPayButton.test.tsx:258:23)
@shopify/hydrogen-react:test: 
@shopify/hydrogen-react:test: Consider adding an error boundary to your tree to customize error handling behavior.
@shopify/hydrogen-react:test: Visit https://reactjs.org/link/error-boundaries to learn more about error boundaries.
@shopify/hydrogen-react:test: 
@shopify/hydrogen-react:test:  ✓ src/ShopPayButton.test.tsx  (22 tests) 204ms
@shopify/hydrogen:test:  ❯ src/cart/queries/cartSelectedDeliveryOptionsUpdateDefault.test.ts  (0 test)
@shopify/hydrogen:test:  ✓ src/customer/customer-account-helper.test.ts  (7 tests) 4ms
@shopify/cli-hydrogen:test:  ✓ src/lib/codegen.test.ts  (8 tests) 1998ms
@shopify/cli-hydrogen:test:  ✓ src/commands/hydrogen/env/pull.test.ts  (21 tests) 1158ms
@shopify/hydrogen-react:test: stderr | src/RichText.test.tsx > <RichText /> > Custom components > renders a custom heading component
@shopify/hydrogen-react:test: Warning: validateDOMNesting(...): Text nodes cannot appear as a child of <thead>.
@shopify/hydrogen-react:test:     at Text (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen-react/src/RichText.components.tsx:39:3)
@shopify/hydrogen-react:test:     at thead
@shopify/hydrogen-react:test:     at heading (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen-react/src/RichText.test.tsx:160:27)
@shopify/hydrogen-react:test:     at div
@shopify/hydrogen-react:test:     at RichText (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen-react/src/RichText.tsx:8:3)
@shopify/hydrogen-react:test: Warning: validateDOMNesting(...): <thead> cannot appear as a child of <div>.
@shopify/hydrogen-react:test:     at thead
@shopify/hydrogen-react:test:     at heading (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen-react/src/RichText.test.tsx:160:27)
@shopify/hydrogen-react:test:     at div
@shopify/hydrogen-react:test:     at RichText (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen-react/src/RichText.tsx:8:3)
@shopify/hydrogen-react:test: 
@shopify/hydrogen-react:test: stderr | src/RichText.test.tsx > <RichText /> > Custom components > renders a custom paragraph component
@shopify/hydrogen-react:test: Warning: validateDOMNesting(...): Text nodes cannot appear as a child of <table>.
@shopify/hydrogen-react:test:     at Text (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen-react/src/RichText.components.tsx:39:3)
@shopify/hydrogen-react:test:     at table
@shopify/hydrogen-react:test:     at paragraph (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen-react/src/RichText.test.tsx:186:29)
@shopify/hydrogen-react:test:     at div
@shopify/hydrogen-react:test:     at RichText (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen-react/src/RichText.tsx:8:3)
@shopify/hydrogen-react:test: 
@shopify/hydrogen-react:test:  ✓ src/RichText.test.tsx  (16 tests) 294ms
@shopify/hydrogen:test:  ❯ src/cart/queries/cartDeliveryAddressesAddDefault.test.ts  (0 test)
@shopify/cli-hydrogen:test:  ✓ src/commands/hydrogen/deploy.test.ts  (36 tests) 635ms
@shopify/hydrogen-react:test:  ✓ src/analytics-utils.test.ts  (13 tests) 28ms
@shopify/hydrogen:test:  ❯ src/cart/queries/cartMetafieldDeleteDefault.test.ts  (0 test)
@shopify/hydrogen:test:  ❯ src/cart/queries/cartDiscountCodesUpdateDefault.test.ts  (0 test)
@shopify/hydrogen-react:test:  ✓ src/Money.test.tsx  (21 tests) 456ms
@shopify/hydrogen:test:  ❯ src/cart/queries/cartGiftCardCodesUpdateDefault.test.ts  (0 test)
@shopify/hydrogen-react:test: stderr | src/ProductPrice.test.tsx > <ProductPrice /> > has the correct TS types for itself and for <Money/>
@shopify/hydrogen-react:test: The above error occurred in the <ProductPrice> component:
@shopify/hydrogen-react:test: 
@shopify/hydrogen-react:test:     at ProductPrice (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen-react/src/ProductPrice.tsx:9:5)
@shopify/hydrogen-react:test: 
@shopify/hydrogen-react:test: Consider adding an error boundary to your tree to customize error handling behavior.
@shopify/hydrogen-react:test: Visit https://reactjs.org/link/error-boundaries to learn more about error boundaries.
@shopify/hydrogen-react:test: 
@shopify/cli-hydrogen:test:  ✓ src/lib/setups/i18n/replacers.test.ts  (6 tests) 2564ms
@shopify/hydrogen:test:  ❯ src/cart/queries/cartBuyerIdentityUpdateDefault.test.ts  (0 test)
@shopify/hydrogen-react:test:  ✓ src/ProductPrice.test.tsx  (10 tests) 463ms
@shopify/cli-hydrogen:test:  ✓ src/lib/shopify-config.test.ts  (13 tests) 468ms
@shopify/hydrogen:test:  ❯ src/cart/queries/cartLinesUpdateDefault.test.ts  (0 test)
@shopify/hydrogen-react:test:  ✓ src/AddToCartButton.test.tsx  (9 tests) 660ms
@shopify/hydrogen:test:  ❯ src/cart/queries/cartAttributesUpdateDefault.test.ts  (0 test)
@shopify/hydrogen-react:test:  ✓ src/CartLineQuantityAdjustButton.test.tsx  (4 tests) 283ms
@shopify/cli-hydrogen:test:  ✓ src/lib/setups/routes/generate.test.ts  (9 tests) 3811ms
@shopify/hydrogen:test:  ❯ src/cart/queries/cartMetafieldsSetDefault.test.ts  (0 test)
@shopify/hydrogen:test:  ❯ src/cart/queries/cartLinesRemoveDefault.test.ts  (0 test)
@shopify/hydrogen-react:test:  ✓ src/useMoney.test.tsx  (3 tests) 136ms
@shopify/hydrogen:test:  ❯ src/cart/queries/cartCreateDefault.test.ts  (0 test)
@shopify/hydrogen:test:  ❯ src/cart/queries/cartNoteUpdateDefault.test.ts  (0 test)
@shopify/hydrogen:test:  ❯ src/cart/queries/cartLinesAddDefault.test.ts  (0 test)
@shopify/hydrogen-react:test:  ✓ src/analytics-schema-trekkie-storefront-page-view.test.ts  (3 tests) 20ms
@shopify/hydrogen-react:test: stderr | Fetch.onError (file:/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/happy-dom/src/fetch/Fetch.ts:668:37)
@shopify/hydrogen-react:test: DOMException [AbortError]: The operation was aborted.
@shopify/hydrogen-react:test:     at Fetch.onAsyncTaskManagerAbort (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/fetch/Fetch.ts:681:17)
@shopify/hydrogen-react:test:     at Object.<anonymous> (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/fetch/Fetch.ts:518:10)
@shopify/hydrogen-react:test:     at AsyncTaskManager.abortAll (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/async-task-manager/AsyncTaskManager.ts:328:21)
@shopify/hydrogen-react:test:     at AsyncTaskManager.destroy (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/async-task-manager/AsyncTaskManager.ts:74:15)
@shopify/hydrogen-react:test:     at file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/browser/utilities/BrowserFrameFactory.ts:49:7
@shopify/hydrogen-react:test:     at new Promise (<anonymous>)
@shopify/hydrogen-react:test:     at Function.destroyFrame (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/browser/utilities/BrowserFrameFactory.ts:34:10)
@shopify/hydrogen-react:test:     at HTMLIFrameElement.#unloadPage (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/nodes/html-iframe-element/HTMLIFrameElement.ts:454:24)
@shopify/hydrogen-react:test:     at HTMLIFrameElement.[disconnectedFromDocument] (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/nodes/html-iframe-element/HTMLIFrameElement.ts:282:19)
@shopify/hydrogen-react:test:     at HTMLIFrameElement.[disconnectedFromNode] (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/nodes/node/Node.ts:1014:49)
@shopify/hydrogen-react:test: DOMException [AbortError]: The operation was aborted.
@shopify/hydrogen-react:test:     at Fetch.onAsyncTaskManagerAbort (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/fetch/Fetch.ts:681:17)
@shopify/hydrogen-react:test:     at Object.<anonymous> (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/fetch/Fetch.ts:518:10)
@shopify/hydrogen-react:test:     at AsyncTaskManager.abortAll (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/async-task-manager/AsyncTaskManager.ts:328:21)
@shopify/hydrogen-react:test:     at AsyncTaskManager.destroy (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/async-task-manager/AsyncTaskManager.ts:74:15)
@shopify/hydrogen-react:test:     at file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/browser/utilities/BrowserFrameFactory.ts:49:7
@shopify/hydrogen-react:test:     at new Promise (<anonymous>)
@shopify/hydrogen-react:test:     at Function.destroyFrame (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/browser/utilities/BrowserFrameFactory.ts:34:10)
@shopify/hydrogen-react:test:     at HTMLIFrameElement.#unloadPage (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/nodes/html-iframe-element/HTMLIFrameElement.ts:454:24)
@shopify/hydrogen-react:test:     at HTMLIFrameElement.[disconnectedFromDocument] (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/nodes/html-iframe-element/HTMLIFrameElement.ts:282:19)
@shopify/hydrogen-react:test:     at HTMLIFrameElement.[disconnectedFromNode] (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/nodes/node/Node.ts:1014:49)
@shopify/hydrogen-react:test: DOMException [AbortError]: The operation was aborted.
@shopify/hydrogen-react:test:     at Fetch.onAsyncTaskManagerAbort (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/fetch/Fetch.ts:681:17)
@shopify/hydrogen-react:test:     at Object.<anonymous> (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/fetch/Fetch.ts:518:10)
@shopify/hydrogen-react:test:     at AsyncTaskManager.abortAll (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/async-task-manager/AsyncTaskManager.ts:328:21)
@shopify/hydrogen-react:test:     at AsyncTaskManager.destroy (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/async-task-manager/AsyncTaskManager.ts:74:15)
@shopify/hydrogen-react:test:     at file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/browser/utilities/BrowserFrameFactory.ts:49:7
@shopify/hydrogen-react:test:     at new Promise (<anonymous>)
@shopify/hydrogen-react:test:     at Function.destroyFrame (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/browser/utilities/BrowserFrameFactory.ts:34:10)
@shopify/hydrogen-react:test:     at HTMLIFrameElement.#unloadPage (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/nodes/html-iframe-element/HTMLIFrameElement.ts:454:24)
@shopify/hydrogen-react:test:     at HTMLIFrameElement.[disconnectedFromDocument] (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/nodes/html-iframe-element/HTMLIFrameElement.ts:282:19)
@shopify/hydrogen-react:test:     at HTMLIFrameElement.[disconnectedFromNode] (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/nodes/node/Node.ts:1014:49)
@shopify/hydrogen-react:test: DOMException [AbortError]: The operation was aborted.
@shopify/hydrogen-react:test:     at Fetch.onAsyncTaskManagerAbort (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/fetch/Fetch.ts:681:17)
@shopify/hydrogen-react:test:     at Object.<anonymous> (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/fetch/Fetch.ts:518:10)
@shopify/hydrogen-react:test:     at AsyncTaskManager.abortAll (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/async-task-manager/AsyncTaskManager.ts:328:21)
@shopify/hydrogen-react:test:     at AsyncTaskManager.destroy (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/async-task-manager/AsyncTaskManager.ts:74:15)
@shopify/hydrogen-react:test:     at file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/browser/utilities/BrowserFrameFactory.ts:49:7
@shopify/hydrogen-react:test:     at new Promise (<anonymous>)
@shopify/hydrogen-react:test:     at Function.destroyFrame (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/browser/utilities/BrowserFrameFactory.ts:34:10)
@shopify/hydrogen-react:test:     at HTMLIFrameElement.#unloadPage (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/nodes/html-iframe-element/HTMLIFrameElement.ts:454:24)
@shopify/hydrogen-react:test:     at HTMLIFrameElement.[disconnectedFromDocument] (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/nodes/html-iframe-element/HTMLIFrameElement.ts:282:19)
@shopify/hydrogen-react:test:     at HTMLIFrameElement.[disconnectedFromNode] (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/nodes/node/Node.ts:1014:49)
@shopify/hydrogen-react:test: DOMException [AbortError]: The operation was aborted.
@shopify/hydrogen-react:test:     at Fetch.onAsyncTaskManagerAbort (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/fetch/Fetch.ts:681:17)
@shopify/hydrogen-react:test:     at Object.<anonymous> (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/fetch/Fetch.ts:518:10)
@shopify/hydrogen-react:test:     at AsyncTaskManager.abortAll (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/async-task-manager/AsyncTaskManager.ts:328:21)
@shopify/hydrogen-react:test:     at AsyncTaskManager.destroy (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/async-task-manager/AsyncTaskManager.ts:74:15)
@shopify/hydrogen-react:test:     at file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/browser/utilities/BrowserFrameFactory.ts:49:7
@shopify/hydrogen-react:test:     at new Promise (<anonymous>)
@shopify/hydrogen-react:test:     at Function.destroyFrame (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/browser/utilities/BrowserFrameFactory.ts:34:10)
@shopify/hydrogen-react:test:     at HTMLIFrameElement.#unloadPage (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/nodes/html-iframe-element/HTMLIFrameElement.ts:454:24)
@shopify/hydrogen-react:test:     at HTMLIFrameElement.[disconnectedFromDocument] (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/nodes/html-iframe-element/HTMLIFrameElement.ts:282:19)
@shopify/hydrogen-react:test:     at HTMLIFrameElement.[disconnectedFromNode] (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/nodes/node/Node.ts:1014:49)
@shopify/hydrogen-react:test: DOMException [AbortError]: The operation was aborted.
@shopify/hydrogen-react:test:     at Fetch.onAsyncTaskManagerAbort (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/fetch/Fetch.ts:681:17)
@shopify/hydrogen-react:test:     at Object.<anonymous> (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/fetch/Fetch.ts:518:10)
@shopify/hydrogen-react:test:     at AsyncTaskManager.abortAll (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/async-task-manager/AsyncTaskManager.ts:328:21)
@shopify/hydrogen-react:test:     at AsyncTaskManager.destroy (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/async-task-manager/AsyncTaskManager.ts:74:15)
@shopify/hydrogen-react:test:     at file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/browser/utilities/BrowserFrameFactory.ts:49:7
@shopify/hydrogen-react:test:     at new Promise (<anonymous>)
@shopify/hydrogen-react:test:     at Function.destroyFrame (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/browser/utilities/BrowserFrameFactory.ts:34:10)
@shopify/hydrogen-react:test:     at HTMLIFrameElement.#unloadPage (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/nodes/html-iframe-element/HTMLIFrameElement.ts:454:24)
@shopify/hydrogen-react:test:     at HTMLIFrameElement.[disconnectedFromDocument] (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/nodes/html-iframe-element/HTMLIFrameElement.ts:282:19)
@shopify/hydrogen-react:test:     at HTMLIFrameElement.[disconnectedFromNode] (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/nodes/node/Node.ts:1014:49)
@shopify/hydrogen-react:test: 
@shopify/hydrogen-react:test: stderr | file:/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/happy-dom/src/nodes/html-iframe-element/HTMLIFrameElement.ts:440:32
@shopify/hydrogen-react:test: DOMException [NetworkError]: Failed to execute "fetch()" on "Window" with URL "https://junior-agreement.info/": The operation was aborted.
@shopify/hydrogen-react:test:     at Fetch.onError (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/fetch/Fetch.ts:670:4)
@shopify/hydrogen-react:test: [90m    at ClientRequest.emit (node:events:507:28)[39m
@shopify/hydrogen-react:test: [90m    at emitErrorEvent (node:_http_client:104:11)[39m
@shopify/hydrogen-react:test: [90m    at _destroy (node:_http_client:898:9)[39m
@shopify/hydrogen-react:test: [90m    at onSocketNT (node:_http_client:918:5)[39m
@shopify/hydrogen-react:test: [90m    at processTicksAndRejections (node:internal/process/task_queues:91:21)[39m
@shopify/hydrogen-react:test: DOMException [NetworkError]: Failed to execute "fetch()" on "Window" with URL "https://outlandish-abacus.net/": The operation was aborted.
@shopify/hydrogen-react:test:     at Fetch.onError (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/fetch/Fetch.ts:670:4)
@shopify/hydrogen-react:test: [90m    at ClientRequest.emit (node:events:507:28)[39m
@shopify/hydrogen-react:test: [90m    at emitErrorEvent (node:_http_client:104:11)[39m
@shopify/hydrogen-react:test: [90m    at _destroy (node:_http_client:898:9)[39m
@shopify/hydrogen-react:test: [90m    at onSocketNT (node:_http_client:918:5)[39m
@shopify/hydrogen-react:test: [90m    at processTicksAndRejections (node:internal/process/task_queues:91:21)[39m
@shopify/hydrogen-react:test: DOMException [NetworkError]: Failed to execute "fetch()" on "Window" with URL "https://www.youtube.com/embed/a2YSgfwXc9c?color=red&autoplay=true": The operation was aborted.
@shopify/hydrogen-react:test:     at Fetch.onError (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/fetch/Fetch.ts:670:4)
@shopify/hydrogen-react:test: [90m    at ClientRequest.emit (node:events:507:28)[39m
@shopify/hydrogen-react:test: [90m    at emitErrorEvent (node:_http_client:104:11)[39m
@shopify/hydrogen-react:test: [90m    at _destroy (node:_http_client:898:9)[39m
@shopify/hydrogen-react:test: [90m    at onSocketNT (node:_http_client:918:5)[39m
@shopify/hydrogen-react:test: [90m    at processTicksAndRejections (node:internal/process/task_queues:91:21)[39m
@shopify/hydrogen-react:test: DOMException [NetworkError]: Failed to execute "fetch()" on "Window" with URL "https://pleasant-cinema.net/": The operation was aborted.
@shopify/hydrogen-react:test:     at Fetch.onError (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/fetch/Fetch.ts:670:4)
@shopify/hydrogen-react:test: [90m    at ClientRequest.emit (node:events:507:28)[39m
@shopify/hydrogen-react:test: [90m    at emitErrorEvent (node:_http_client:104:11)[39m
@shopify/hydrogen-react:test: [90m    at _destroy (node:_http_client:898:9)[39m
@shopify/hydrogen-react:test: [90m    at onSocketNT (node:_http_client:918:5)[39m
@shopify/hydrogen-react:test: [90m    at processTicksAndRejections (node:internal/process/task_queues:91:21)[39m
@shopify/hydrogen-react:test: DOMException [NetworkError]: Failed to execute "fetch()" on "Window" with URL "https://www.youtube.com/embed/a2YSgfwXc9c?autoplay=true&color=red": The operation was aborted.
@shopify/hydrogen-react:test:     at Fetch.onError (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/fetch/Fetch.ts:670:4)
@shopify/hydrogen-react:test: [90m    at ClientRequest.emit (node:events:507:28)[39m
@shopify/hydrogen-react:test: [90m    at emitErrorEvent (node:_http_client:104:11)[39m
@shopify/hydrogen-react:test: [90m    at _destroy (node:_http_client:898:9)[39m
@shopify/hydrogen-react:test: [90m    at onSocketNT (node:_http_client:918:5)[39m
@shopify/hydrogen-react:test: [90m    at processTicksAndRejections (node:internal/process/task_queues:91:21)[39m
@shopify/hydrogen-react:test: DOMException [NetworkError]: Failed to execute "fetch()" on "Window" with URL "https://old-sand.biz/": The operation was aborted.
@shopify/hydrogen-react:test:     at Fetch.onError (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/[4mhappy-dom[24m/src/fetch/Fetch.ts:670:4)
@shopify/hydrogen-react:test: [90m    at ClientRequest.emit (node:events:507:28)[39m
@shopify/hydrogen-react:test: [90m    at emitErrorEvent (node:_http_client:104:11)[39m
@shopify/hydrogen-react:test: [90m    at _destroy (node:_http_client:898:9)[39m
@shopify/hydrogen-react:test: [90m    at onSocketNT (node:_http_client:918:5)[39m
@shopify/hydrogen-react:test: [90m    at processTicksAndRejections (node:internal/process/task_queues:91:21)[39m
@shopify/hydrogen-react:test: 
@shopify/hydrogen-react:test:  ✓ src/ExternalVideo.test.tsx  (7 tests) 312ms
@shopify/hydrogen:test:  ✓ src/cart/cartSetIdDefault.test.ts  (2 tests) 2ms
@shopify/hydrogen-react:test:  ✓ src/BaseButton.test.tsx  (6 tests) 250ms
@shopify/cli-hydrogen:test:  ✓ src/commands/hydrogen/upgrade.test.ts  (32 tests) 4387ms
@shopify/hydrogen-react:test:  ✓ src/flatten-connection.test.ts  (4 tests | 1 skipped) 185ms
@shopify/hydrogen:test:  ✓ src/optimistic-ui/optimistic-ui.test.tsx  (1 test) 15ms
@shopify/hydrogen:test:  ✓ src/utils/request.test.ts  (2 tests) 25ms
@shopify/hydrogen:test:  ✓ src/cart/cartGetIdDefault.test.ts  (2 tests) 4ms
@shopify/cli-hydrogen:test:  ✓ src/lib/environment-variables.test.ts  (9 tests) 180ms
@shopify/hydrogen:test:  ✓ src/vite/compat-date.test.ts  (1 test) 16ms
@shopify/hydrogen:test: 
@shopify/hydrogen:test: ⎯⎯⎯⎯⎯⎯ Failed Suites 23 ⎯⎯⎯⎯⎯⎯
@shopify/hydrogen:test: 
@shopify/hydrogen:test:  FAIL  src/storefront.test.ts [ src/storefront.test.ts ]
@shopify/hydrogen:test: Error: Failed to resolve entry for package "@shopify/hydrogen-react". The package may have incorrect main/module/exports specified in its package.json.
@shopify/hydrogen:test:  ❯ packageEntryFailure ../../node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:46638:15
@shopify/hydrogen:test:  ❯ resolvePackageEntry ../../node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:46635:3
@shopify/hydrogen:test:  ❯ tryNodeResolve ../../node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:46451:16
@shopify/hydrogen:test:  ❯ ResolveIdContext.resolveId ../../node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:46201:19
@shopify/hydrogen:test:  ❯ PluginContainer.resolveId ../../node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:49017:17
@shopify/hydrogen:test:  ❯ TransformPluginContext.resolve ../../node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:49177:15
@shopify/hydrogen:test:  ❯ normalizeUrl ../../node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:64192:26
@shopify/hydrogen:test:  ❯ async file:/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:64331:39
@shopify/hydrogen:test: 
@shopify/hydrogen:test: ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/23]⎯
@shopify/hydrogen:test: 
@shopify/hydrogen:test:  FAIL  src/analytics-manager/AnalyticsProvider.test.tsx [ src/analytics-manager/AnalyticsProvider.test.tsx ]
@shopify/hydrogen:test:  FAIL  src/cart/createCartHandler.test.ts [ src/cart/createCartHandler.test.ts ]
@shopify/hydrogen:test:  FAIL  src/customer-privacy/useCustomerPrivacy.test.tsx [ src/customer-privacy/useCustomerPrivacy.test.tsx ]
@shopify/hydrogen:test:  FAIL  src/cart/queries/cartAttributesUpdateDefault.test.ts [ src/cart/queries/cartAttributesUpdateDefault.test.ts ]
@shopify/hydrogen:test:  FAIL  src/cart/queries/cartBuyerIdentityUpdateDefault.test.ts [ src/cart/queries/cartBuyerIdentityUpdateDefault.test.ts ]
@shopify/hydrogen:test:  FAIL  src/cart/queries/cartCreateDefault.test.ts [ src/cart/queries/cartCreateDefault.test.ts ]
@shopify/hydrogen:test:  FAIL  src/cart/queries/cartDeliveryAddressesAddDefault.test.ts [ src/cart/queries/cartDeliveryAddressesAddDefault.test.ts ]
@shopify/hydrogen:test:  FAIL  src/cart/queries/cartDeliveryAddressesRemoveDefault.test.ts [ src/cart/queries/cartDeliveryAddressesRemoveDefault.test.ts ]
@shopify/hydrogen:test:  FAIL  src/cart/queries/cartDeliveryAddressesUpdateDefault.test.ts [ src/cart/queries/cartDeliveryAddressesUpdateDefault.test.ts ]
@shopify/hydrogen:test:  FAIL  src/cart/queries/cartDiscountCodesUpdateDefault.test.ts [ src/cart/queries/cartDiscountCodesUpdateDefault.test.ts ]
@shopify/hydrogen:test:  FAIL  src/cart/queries/cartGetDefault.test.ts [ src/cart/queries/cartGetDefault.test.ts ]
@shopify/hydrogen:test:  FAIL  src/cart/queries/cartGiftCardCodesUpdateDefault.test.ts [ src/cart/queries/cartGiftCardCodesUpdateDefault.test.ts ]
@shopify/hydrogen:test:  FAIL  src/cart/queries/cartLinesAddDefault.test.ts [ src/cart/queries/cartLinesAddDefault.test.ts ]
@shopify/hydrogen:test:  FAIL  src/cart/queries/cartLinesRemoveDefault.test.ts [ src/cart/queries/cartLinesRemoveDefault.test.ts ]
@shopify/hydrogen:test:  FAIL  src/cart/queries/cartLinesUpdateDefault.test.ts [ src/cart/queries/cartLinesUpdateDefault.test.ts ]
@shopify/hydrogen:test:  FAIL  src/cart/queries/cartMetafieldDeleteDefault.test.ts [ src/cart/queries/cartMetafieldDeleteDefault.test.ts ]
@shopify/hydrogen:test:  FAIL  src/cart/queries/cartMetafieldsSetDefault.test.ts [ src/cart/queries/cartMetafieldsSetDefault.test.ts ]
@shopify/hydrogen:test:  FAIL  src/cart/queries/cartNoteUpdateDefault.test.ts [ src/cart/queries/cartNoteUpdateDefault.test.ts ]
@shopify/hydrogen:test:  FAIL  src/cart/queries/cartSelectedDeliveryOptionsUpdateDefault.test.ts [ src/cart/queries/cartSelectedDeliveryOptionsUpdateDefault.test.ts ]
@shopify/hydrogen:test: Error: Failed to resolve entry for package "@shopify/hydrogen-react". The package may have incorrect main/module/exports specified in its package.json.
@shopify/hydrogen:test:  ❯ packageEntryFailure ../../node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:46638:15
@shopify/hydrogen:test:  ❯ resolvePackageEntry ../../node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:46635:3
@shopify/hydrogen:test:  ❯ tryNodeResolve ../../node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:46451:16
@shopify/hydrogen:test:  ❯ ResolveIdContext.resolveId ../../node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:46201:19
@shopify/hydrogen:test:  ❯ PluginContainer.resolveId ../../node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:49017:17
@shopify/hydrogen:test:  ❯ TransformPluginContext.resolve ../../node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:49177:15
@shopify/hydrogen:test:  ❯ normalizeUrl ../../node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:64192:26
@shopify/hydrogen:test:  ❯ async file:/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:64331:39
@shopify/hydrogen:test: 
@shopify/hydrogen:test: ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/23]⎯
@shopify/hydrogen:test: 
@shopify/hydrogen:test:  FAIL  src/csp/Script.test.ts [ src/csp/Script.test.ts ]
@shopify/hydrogen:test: Error: Failed to resolve entry for package "@shopify/hydrogen-react". The package may have incorrect main/module/exports specified in its package.json.
@shopify/hydrogen:test:  ❯ packageEntryFailure ../../node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:46638:15
@shopify/hydrogen:test:  ❯ resolvePackageEntry ../../node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:46635:3
@shopify/hydrogen:test:  ❯ tryNodeResolve ../../node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:46451:16
@shopify/hydrogen:test:  ❯ ResolveIdContext.resolveId ../../node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:46201:19
@shopify/hydrogen:test:  ❯ PluginContainer.resolveId ../../node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:49017:17
@shopify/hydrogen:test:  ❯ TransformPluginContext.resolve ../../node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:49177:15
@shopify/hydrogen:test:  ❯ normalizeUrl ../../node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:64192:26
@shopify/hydrogen:test:  ❯ async file:/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:64331:39
@shopify/hydrogen:test: 
@shopify/hydrogen:test: ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/23]⎯
@shopify/hydrogen:test: 
@shopify/hydrogen:test:  FAIL  src/pagination/pagination.test.ts [ src/pagination/pagination.test.ts ]
@shopify/hydrogen:test:  FAIL  src/product/VariantSelector.test.ts [ src/product/VariantSelector.test.ts ]
@shopify/hydrogen:test: Error: Failed to resolve entry for package "@shopify/hydrogen-react". The package may have incorrect main/module/exports specified in its package.json.
@shopify/hydrogen:test:  ❯ packageEntryFailure ../../node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:46638:15
@shopify/hydrogen:test:  ❯ resolvePackageEntry ../../node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:46635:3
@shopify/hydrogen:test:  ❯ tryNodeResolve ../../node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:46451:16
@shopify/hydrogen:test:  ❯ ResolveIdContext.resolveId ../../node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:46201:19
@shopify/hydrogen:test:  ❯ PluginContainer.resolveId ../../node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:49017:17
@shopify/hydrogen:test:  ❯ TransformPluginContext.resolve ../../node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:49177:15
@shopify/hydrogen:test:  ❯ normalizeUrl ../../node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:64192:26
@shopify/hydrogen:test:  ❯ async file:/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/vitest/node_modules/vite/dist/node/chunks/dep-CHZK6zbr.js:64331:39
@shopify/hydrogen:test: 
@shopify/hydrogen:test: ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/23]⎯
@shopify/hydrogen:test: 
@shopify/hydrogen:test:  Test Files  23 failed | 22 passed (45)
@shopify/hydrogen:test:       Tests  250 passed (250)
@shopify/hydrogen:test:    Start at  08:59:19
@shopify/hydrogen:test:    Duration  10.33s (transform 3.63s, setup 17.31s, collect 6.11s, tests 1.24s, environment 36.50s, prepare 14.67s)
@shopify/hydrogen:test: 
@shopify/hydrogen:test: npm error Lifecycle script `test` failed with error:
@shopify/hydrogen:test: npm error code 1
@shopify/hydrogen:test: npm error path /Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen
@shopify/hydrogen:test: npm error workspace @shopify/hydrogen@2025.5.0
@shopify/hydrogen:test: npm error location /Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen
@shopify/hydrogen:test: npm error command failed
@shopify/hydrogen:test: npm error command sh -c vitest run
@shopify/hydrogen:test: ERROR: command finished with error: command (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen) /opt/homebrew/bin/npm run test exited (1)
@shopify/hydrogen#test: command (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen) /opt/homebrew/bin/npm run test exited (1)

 Tasks:    1 successful, 7 total
Cached:    0 cached, 7 total
  Time:    11.095s 
Failed:    @shopify/hydrogen#test

 ERROR  run failed: command  exited (1)
```

## 3. BUILD RESULTS
```
@shopify/hydrogen:build:     at [nodejs.internal.kHybridDispatch] (node:internal/event_target:827:20)
@shopify/hydrogen:build:     at MessagePort.<anonymous> (node:internal/per_context/messageport:23:28)
@shopify/hydrogen:build: DTS Build error
@shopify/hydrogen:build: DTS ⚡️ Build success in 2866ms
@shopify/hydrogen:build: DTS dist/dev/hydrogen-routes.d.ts 197.00 B
@shopify/create-hydrogen:build: ESM dist/chokidar-U6ZJINZX.js         32.77 KB
@shopify/create-hydrogen:build: ESM dist/out-DXB3K325.js              229.00 B
@shopify/create-hydrogen:build: ESM dist/open-OD6DRFEG.js             3.88 KB
@shopify/create-hydrogen:build: ESM dist/is-wsl-LL6KGQIK.js           902.00 B
@shopify/create-hydrogen:build: ESM dist/fsevents-X6WP4TKM.node       159.79 KB
@shopify/create-hydrogen:build: ESM dist/del-72VO4HYK.js              37.22 KB
@shopify/create-hydrogen:build: ESM dist/chunk-PMDMUCNY.js            661.00 B
@shopify/create-hydrogen:build: ESM dist/multipart-parser-QIHQVIZA.js 4.39 KB
@shopify/create-hydrogen:build: ESM dist/chunk-VMIOG46Y.js            793.00 B
@shopify/create-hydrogen:build: ESM dist/chunk-FB327AH7.js            33.74 KB
@shopify/create-hydrogen:build: ESM dist/chunk-3LZ6M5C2.js            21.94 KB
@shopify/create-hydrogen:build: ESM dist/error-handler-PS5EYYHA.js    563.00 B
@shopify/create-hydrogen:build: ESM dist/chunk-EO6F7WJJ.js            784.00 B
@shopify/create-hydrogen:build: ESM dist/devtools-DGRGSZU7.js         45.86 KB
@shopify/create-hydrogen:build: ESM dist/chunk-UASQ33JG.js            37.01 KB
@shopify/create-hydrogen:build: ESM dist/chunk-MNT4XW23.js            1.25 KB
@shopify/create-hydrogen:build: ESM dist/chunk-MZPD7BFF.js            58.85 KB
@shopify/create-hydrogen:build: ESM dist/chunk-D7CI46F7.js            40.47 KB
@shopify/create-hydrogen:build: ESM dist/morph-3JSBLNUD.js            5.10 MB
@shopify/create-hydrogen:build: ESM dist/create-app.js                4.98 MB
@shopify/create-hydrogen:build: ESM dist/chunk-TINM25KY.js            6.23 MB
@shopify/create-hydrogen:build: ESM ⚡️ Build success in 775ms
@shopify/hydrogen:build: DTS ⚡️ Build success in 4777ms
@shopify/hydrogen:build: DTS dist/vite/compat-date.d.ts         69.00 B
@shopify/hydrogen:build: DTS dist/vite/get-virtual-routes.d.ts  1018.00 B
@shopify/hydrogen:build: DTS dist/vite/hydrogen-middleware.d.ts 360.00 B
@shopify/hydrogen:build: DTS dist/vite/plugin.d.ts              821.00 B
@shopify/hydrogen:build: DTS dist/vite/request-events.d.ts      1.88 KB
@shopify/hydrogen:build: DTS dist/vite/types.d.ts               110.00 B
@shopify/hydrogen:build: npm error Lifecycle script `build` failed with error:
@shopify/hydrogen:build: npm error code 1
@shopify/hydrogen:build: npm error path /Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen
@shopify/hydrogen:build: npm error workspace @shopify/hydrogen@2025.5.0
@shopify/hydrogen:build: npm error location /Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen
@shopify/hydrogen:build: npm error command failed
@shopify/hydrogen:build: npm error command sh -c tsup --clean
@shopify/hydrogen:build: ERROR: command finished with error: command (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen) /opt/homebrew/bin/npm run build exited (1)
@shopify/hydrogen#build: command (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/packages/hydrogen) /opt/homebrew/bin/npm run build exited (1)

 Tasks:    5 successful, 6 total
Cached:    0 cached, 6 total
  Time:    10.714s 
Failed:    @shopify/hydrogen#build

 ERROR  run failed: command  exited (1)
```

## 4. FULL CI CHECKS
```
example-multipass:build: │      if (err) afterClose(err);                                               │
example-multipass:build: │    at callback (node:internal/streams/writable:764)                          │
example-multipass:build: │    at onwriteError (node:internal/streams/writable:603)                      │
example-multipass:build: │    at onwrite (node:internal/streams/writable:647)                           │
example-multipass:build: │    at onWriteComplete [as oncomplete]                                        │
example-multipass:build: │    (node:internal/stream_base_commons:89)                                    │
example-multipass:build: │                                                                              │
example-multipass:build: ╰──────────────────────────────────────────────────────────────────────────────╯
example-multipass:build: 
example-custom-cart-method:build: npm error Lifecycle script `build` failed with error:
example-custom-cart-method:build: npm error code 1
example-custom-cart-method:build: npm error path /Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/examples/custom-cart-method
example-custom-cart-method:build: npm error workspace example-custom-cart-method
example-custom-cart-method:build: npm error location /Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/examples/custom-cart-method
example-custom-cart-method:build: npm error command failed
example-custom-cart-method:build: npm error command sh -c shopify hydrogen build --codegen --diff
example-multipass:build: [vite:define] The service was stopped: write EPIPE
example-multipass:build: file: /Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/react-router/dist/development/chunk-PVWAREVJ.mjs
example-multipass:build:     at /Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/vite/node_modules/esbuild/lib/main.js:738:38
example-multipass:build:     at Object.responseCallbacks.<computed> (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/vite/node_modules/esbuild/lib/main.js:623:9)
example-multipass:build:     at afterClose (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/vite/node_modules/esbuild/lib/main.js:614:28)
example-multipass:build:     at Object.callback (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/vite/node_modules/esbuild/lib/main.js:1990:18)
example-multipass:build:     at callback (node:internal/streams/writable:764:21)
example-multipass:build:     at onwriteError (node:internal/streams/writable:603:3)
example-multipass:build:     at onwrite (node:internal/streams/writable:647:7)
example-multipass:build:     at WriteWrap.onWriteComplete [as oncomplete] (node:internal/stream_base_commons:89:19)
example-multipass:build: npm error Lifecycle script `build` failed with error:
example-multipass:build: npm error code 1
example-multipass:build: npm error path /Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/examples/multipass
example-multipass:build: npm error workspace example-multipass
example-multipass:build: npm error location /Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/examples/multipass
example-multipass:build: npm error command failed
example-multipass:build: npm error command sh -c shopify hydrogen build --codegen --diff
example-subscriptions:build: ╭─ error ──────────────────────────────────────────────────────────────────────╮
example-subscriptions:build: │                                                                              │
example-subscriptions:build: │  [commonjs--resolver] The service is no longer running                       │
example-subscriptions:build: │  file: /Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/n  │
example-subscriptions:build: │  ode_modules/react/index.js                                                  │
example-subscriptions:build: │                                                                              │
example-subscriptions:build: │  To investigate the issue, examine this stack trace:                         │
example-subscriptions:build: │    at (../../node_modules/vite/node_modules/esbuild/lib/main.js:738)         │
example-subscriptions:build: │      if (error) return callback(new Error(error), null);                     │
example-subscriptions:build: │    at sendRequest                                                            │
example-subscriptions:build: │    (../../node_modules/vite/node_modules/esbuild/lib/main.js:619)            │
example-subscriptions:build: │      if (closeData.didClose) return callback("The service is no longer       │
example-subscriptions:build: │      running" + closeData.reason, null);                                     │
example-subscriptions:build: │    at start (../../node_modules/vite/node_modules/esbuild/lib/main.js:737)   │
example-subscriptions:build: │      sendRequest(refs, request, (error, response) => {                       │
example-subscriptions:build: │    at transform2 [as transform]                                              │
example-subscriptions:build: │    (../../node_modules/vite/node_modules/esbuild/lib/main.js:798)            │
example-subscriptions:build: │      start(null);                                                            │
example-subscriptions:build: │    at (../../node_modules/vite/node_modules/esbuild/lib/main.js:2047)        │
example-subscriptions:build: │      transform: (input, options) => new Promise((resolve, reject) =>         │
example-subscriptions:build: │      service.transform({                                                     │
example-subscriptions:build: │    at new Promise                                                            │
example-subscriptions:build: │    at transform                                                              │
example-subscriptions:build: │    (../../node_modules/vite/node_modules/esbuild/lib/main.js:2047)           │
example-subscriptions:build: │      transform: (input, options) => new Promise((resolve, reject) =>         │
example-subscriptions:build: │      service.transform({                                                     │
example-subscriptions:build: │    at transform                                                              │
example-subscriptions:build: │    (../../node_modules/vite/node_modules/esbuild/lib/main.js:1882)           │
example-subscriptions:build: │      var transform = (input, options) =>                                     │
example-subscriptions:build: │      ensureServiceIsRunning().transform(input, options);                     │
example-subscriptions:build: │    at replaceDefine                                                          │
example-subscriptions:build: │    (../../node_modules/vite/dist/node/chunks/dep-DrOo5SEf.js:45336)          │
example-subscriptions:build: │      const result = await transform$1(code, {                                │
example-subscriptions:build: │    at transform                                                              │
example-subscriptions:build: │    (../../node_modules/vite/dist/node/chunks/dep-DrOo5SEf.js:45314)          │
example-subscriptions:build: │      const result = await replaceDefine(this.environment, code, id,          │
example-subscriptions:build: │      define);                                                                │
example-subscriptions:build: │                                                                              │
example-subscriptions:build: ╰──────────────────────────────────────────────────────────────────────────────╯
example-subscriptions:build: 
example-subscriptions:build: [commonjs--resolver] The service is no longer running
example-subscriptions:build: file: /Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/react/index.js
example-subscriptions:build:     at /Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/vite/node_modules/esbuild/lib/main.js:738:38
example-subscriptions:build:     at sendRequest (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/vite/node_modules/esbuild/lib/main.js:619:36)
example-subscriptions:build:     at start (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/vite/node_modules/esbuild/lib/main.js:737:9)
example-subscriptions:build:     at Object.transform2 [as transform] (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/vite/node_modules/esbuild/lib/main.js:798:5)
example-subscriptions:build:     at /Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/vite/node_modules/esbuild/lib/main.js:2047:77
example-subscriptions:build:     at new Promise (<anonymous>)
example-subscriptions:build:     at Object.transform (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/vite/node_modules/esbuild/lib/main.js:2047:36)
example-subscriptions:build:     at transform (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/vite/node_modules/esbuild/lib/main.js:1882:62)
example-subscriptions:build:     at replaceDefine (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/vite/dist/node/chunks/dep-DrOo5SEf.js:45336:24)
example-subscriptions:build:     at Object.transform (file:///Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/node_modules/vite/dist/node/chunks/dep-DrOo5SEf.js:45314:28)
example-subscriptions:build: npm error Lifecycle script `build` failed with error:
example-subscriptions:build: npm error code 1
example-subscriptions:build: npm error path /Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/examples/subscriptions
example-subscriptions:build: npm error workspace example-subscriptions
example-subscriptions:build: npm error location /Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/examples/subscriptions
example-subscriptions:build: npm error command failed
example-subscriptions:build: npm error command sh -c shopify hydrogen build --codegen --diff
example-subscriptions#lint: command (/Users/juanp.prieto/github.com/Shopify/hydrogen-react-router-7.8.x/examples/subscriptions) /opt/homebrew/bin/npm run lint exited (1)

 Tasks:    2 successful, 31 total
Cached:    0 cached, 31 total
  Time:    6.931s 
Failed:    example-subscriptions#lint

 ERROR  run failed: command  exited (1)
```

## ISSUE SUMMARY

### TypeScript 5.9.2 Upgrade Status
- **Root**: Updated to 5.9.2 ✓
- **packages/hydrogen-react**: Updated to 5.9.2 ✓
- **templates/skeleton**: Updated to 5.9.2 ✓
- **examples/express**: Updated to 5.9.2 ✓

### Known Issues
1. **express example**: Routes.ts configuration error preventing build
2. **hydrogen tests**: 1 test failure related to failing cli test
3. **Build failures**: Examples using --diff flag are failing

### Packages Status
- hydrogen-react: ✅ Build, Test, Typecheck pass
- mini-oxygen: ✅ All tests pass
- hydrogen-codegen: ✅ All tests pass
- cli-hydrogen: ✅ Most tests pass
- remix-oxygen: ✅ Builds successfully
