import {createContext,forwardRef,useContext,lazy,useMemo,useEffect,useRef,useState,createElement,Fragment as Fragment$1,Suspense}from'react';import {createContext as createContext$1,useFetcher,useFetchers,RouterContextProvider,useNavigation,useLocation,useNavigate,Link,useMatches}from'react-router';import {jsx,jsxs,Fragment}from'react/jsx-runtime';import {useLoadScript,createStorefrontClient,SHOPIFY_STOREFRONT_ID_HEADER,getShopifyCookies,SHOPIFY_Y,SHOPIFY_STOREFRONT_Y_HEADER,SHOPIFY_S,SHOPIFY_STOREFRONT_S_HEADER,flattenConnection,RichText,ShopPayButton,useShopifyCookies,parseGid,sendShopifyAnalytics,AnalyticsEventName,AnalyticsPageType,getClientBrowserParameters}from'@shopify/hydrogen-react';export{AnalyticsEventName,AnalyticsPageType,ExternalVideo,IMAGE_FRAGMENT,Image,MediaFile,ModelViewer,Money,ShopifySalesChannel,Video,customerAccountApiCustomScalars,decodeEncodedVariant,flattenConnection,getAdjacentAndFirstAvailableVariants,getClientBrowserParameters,getProductOptions,getShopifyCookies,isOptionValueCombinationInEncodedVariant,mapSelectedProductOptionToObject,parseGid,parseMetafield,sendShopifyAnalytics,storefrontApiCustomScalars,useLoadScript,useMoney,useSelectedOptionInUrlParam,useShopifyCookies}from'@shopify/hydrogen-react';import {createGraphQLClient}from'@shopify/graphql-client';import {parse,stringify}from'worktop/cookie';import Ea from'content-security-policy-builder';function pe(e){let{type:t,data:r={},customData:o}=e,n=useLocation(),{publish:a,cart:s,prevCart:c,shop:i,customData:u}=j(),p=n.pathname+n.search,d={...r,customData:{...u,...o},cart:s,prevCart:c,shop:i};return useEffect(()=>{i?.shopId&&(d={...d,url:window.location.href},a(t,d));},[a,p,i?.shopId]),null}function or(e){return jsx(pe,{...e,type:"page_viewed"})}function nr(e){return jsx(pe,{...e,type:"product_viewed"})}function ar(e){return jsx(pe,{...e,type:"collection_viewed"})}function sr(e){return jsx(pe,{...e,type:"cart_viewed"})}function ir(e){return jsx(pe,{...e,type:"search_viewed"})}function cr(e){return jsx(pe,{...e})}var F={PAGE_VIEWED:"page_viewed",PRODUCT_VIEWED:"product_viewed",COLLECTION_VIEWED:"collection_viewed",CART_VIEWED:"cart_viewed",SEARCH_VIEWED:"search_viewed",CART_UPDATED:"cart_updated",PRODUCT_ADD_TO_CART:"product_added_to_cart",PRODUCT_REMOVED_FROM_CART:"product_removed_from_cart",CUSTOM_EVENT:"custom_"};var ko="https://cdn.shopify.com/shopifycloud/consent-tracking-api/v0.1/consent-tracking-api.js",No="https://cdn.shopify.com/shopifycloud/privacy-banner/storefront-banner.js";function rt(e){console.error(`[h2:error:useCustomerPrivacy] Unable to setup Customer Privacy API: Missing consent.${e} configuration.`);}function ot(e){let{withPrivacyBanner:t=false,onVisitorConsentCollected:r,onReady:o,...n}=e;useLoadScript(t?No:ko,{attributes:{id:"customer-privacy-api"}});let{observing:a,setLoaded:s}=Mo({withPrivacyBanner:t,onLoaded:o}),c=useMemo(()=>{let{checkoutDomain:u,storefrontAccessToken:p}=n;return u||rt("checkoutDomain"),p||rt("storefrontAccessToken"),(p.startsWith("shpat_")||p.length!==32)&&console.error("[h2:error:useCustomerPrivacy] It looks like you passed a private access token, make sure to use the public token"),{checkoutRootDomain:u,storefrontAccessToken:p,storefrontRootDomain:dr(u),country:n.country,locale:n.locale}},[n,dr,rt]);useEffect(()=>{let u=p=>{r&&r(p.detail);};return document.addEventListener("visitorConsentCollected",u),()=>{document.removeEventListener("visitorConsentCollected",u);}},[r]),useEffect(()=>{if(!t||a.current.privacyBanner)return;a.current.privacyBanner=true;let u=window.privacyBanner||void 0;Object.defineProperty(window,"privacyBanner",{configurable:true,get(){return u},set(d){if(typeof d=="object"&&d!==null&&"showPreferences"in d&&"loadBanner"in d){let g=d;g.loadBanner(c),u=yr({privacyBanner:g,config:c}),s.privacyBanner(),pr();}}});},[t,c,yr,s.privacyBanner]),useEffect(()=>{if(a.current.customerPrivacy)return;a.current.customerPrivacy=true;let u=null,p=window.Shopify||void 0;Object.defineProperty(window,"Shopify",{configurable:true,get(){return p},set(d){typeof d=="object"&&d!==null&&Object.keys(d).length===0&&(p=d,Object.defineProperty(window.Shopify,"customerPrivacy",{configurable:true,get(){return u},set(g){if(typeof g=="object"&&g!==null&&"setTrackingConsent"in g){let m=g;u={...m,setTrackingConsent:lr({customerPrivacy:m,config:c})},p={...p,customerPrivacy:u},s.customerPrivacy(),pr();}}}));}});},[c,lr,s.customerPrivacy]);let i={customerPrivacy:le()};return t&&(i.privacyBanner=ke()),i}var ur=false;function pr(){if(ur)return;ur=true;let e=new CustomEvent("shopifyCustomerPrivacyApiLoaded");document.dispatchEvent(e);}function Mo({withPrivacyBanner:e,onLoaded:t}){let r=useRef({customerPrivacy:false,privacyBanner:false}),[o,n]=useState(e?[false,false]:[false]),a=o.every(Boolean),s={customerPrivacy:()=>{n(e?c=>[true,c[1]]:()=>[true]);},privacyBanner:()=>{e&&n(c=>[c[0],true]);}};return useEffect(()=>{a&&t&&t();},[a,t]),{observing:r,setLoaded:s}}function dr(e){if(typeof window>"u")return;let t=window.document.location.host,r=e.split(".").reverse(),o=t.split(".").reverse(),n=[];return r.forEach((a,s)=>{a===o[s]&&n.push(a);}),n.reverse().join(".")}function lr({customerPrivacy:e,config:t}){let r=e.setTrackingConsent,{locale:o,country:n,...a}=t;function s(c,i){r({...a,headlessStorefront:true,...c},i);}return s}function yr({privacyBanner:e,config:t}){let r=e.loadBanner,o=e.showPreferences;function n(s){if(typeof s=="object"){r({...t,...s});return}r(t);}function a(s){if(typeof s=="object"){o({...t,...s});return}o(t);}return {loadBanner:n,showPreferences:a}}function le(){try{return window.Shopify&&window.Shopify.customerPrivacy?window.Shopify?.customerPrivacy:null}catch{return null}}function ke(){try{return window&&window?.privacyBanner?window.privacyBanner:null}catch{return null}}var fr="2025.7.0";function Ho(){let e=le();if(!e)throw new Error("Shopify Customer Privacy API not available. Must be used within a useEffect. Make sure to load the Shopify Customer Privacy API with useCustomerPrivacy() or <AnalyticsProvider>.");return e}function hr({consent:e,onReady:t,domain:r}){let{subscribe:o,register:n,canTrack:a}=j(),[s,c]=useState(false),[i,u]=useState(false),p=useRef(false),{checkoutDomain:d,storefrontAccessToken:g,language:m}=e,{ready:l}=n("Internal_Shopify_Analytics");return ot({...e,locale:m,checkoutDomain:d||"mock.shop",storefrontAccessToken:g||"abcdefghijklmnopqrstuvwxyz123456",onVisitorConsentCollected:()=>u(true),onReady:()=>u(true)}),useShopifyCookies({hasUserConsent:i?a():true,domain:r,checkoutDomain:d}),useEffect(()=>{p.current||(p.current=true,o(F.PAGE_VIEWED,Bo),o(F.PRODUCT_VIEWED,Qo),o(F.COLLECTION_VIEWED,Wo),o(F.SEARCH_VIEWED,jo),o(F.PRODUCT_ADD_TO_CART,Ko),c(true));},[o]),useEffect(()=>{s&&i&&(l(),t());},[s,i,t]),null}function Ne(e){console.error(`[h2:error:ShopifyAnalytics] Unable to send Shopify analytics: Missing shop.${e} configuration.`);}function Ie(e){let t=Ho(),r=t.analyticsProcessingAllowed();if(!e?.shop?.shopId){Ne("shopId");return}if(!e?.shop?.acceptedLanguage){Ne("acceptedLanguage");return}if(!e?.shop?.currency){Ne("currency");return}if(!e?.shop?.hydrogenSubchannelId){Ne("hydrogenSubchannelId");return}return {shopifySalesChannel:"hydrogen",assetVersionId:fr,...e.shop,hasUserConsent:r,...getClientBrowserParameters(),analyticsAllowed:t.analyticsProcessingAllowed(),marketingAllowed:t.marketingAllowed(),saleOfDataAllowed:t.saleOfDataAllowed(),ccpaEnforced:!t.saleOfDataAllowed(),gdprEnforced:!(t.marketingAllowed()&&t.analyticsProcessingAllowed())}}function Go(e,t){if(t===null)return;let r=Ie(e);return r?{...r,cartId:t.id}:void 0}var te={};function Bo(e){let t=Ie(e);t&&(sendShopifyAnalytics({eventName:AnalyticsEventName.PAGE_VIEW_2,payload:{...t,...te}}),te={});}function Qo(e){let t=Ie(e);if(t&&Cr({type:"product",products:e.products})){let r=nt(e.products);te={pageType:AnalyticsPageType.product,resourceId:r[0].productGid},t={...t,...te,products:nt(e.products)},sendShopifyAnalytics({eventName:AnalyticsEventName.PRODUCT_VIEW,payload:t});}}function Wo(e){let t=Ie(e);t&&(te={pageType:AnalyticsPageType.collection,resourceId:e.collection.id},t={...t,...te,collectionHandle:e.collection.handle,collectionId:e.collection.id},sendShopifyAnalytics({eventName:AnalyticsEventName.COLLECTION_VIEW,payload:t}));}function jo(e){let t=Ie(e);t&&(te={pageType:AnalyticsPageType.search},t={...t,...te,searchString:e.searchTerm},sendShopifyAnalytics({eventName:AnalyticsEventName.SEARCH_VIEW,payload:t}));}function Ko(e){let{cart:t,currentLine:r}=e,o=Go(e,t);!o||!r?.id||Yo({matchedLine:r,eventPayload:o});}function Yo({matchedLine:e,eventPayload:t}){let r={id:e.merchandise.product.id,variantId:e.merchandise.id,title:e.merchandise.product.title,variantTitle:e.merchandise.title,vendor:e.merchandise.product.vendor,price:e.merchandise.price.amount,quantity:e.quantity,productType:e.merchandise.product.productType,sku:e.merchandise.sku};Cr({type:"cart",products:[r]})&&sendShopifyAnalytics({eventName:AnalyticsEventName.ADD_TO_CART,payload:{...t,products:nt([r])}});}function se(e,t,r,o){if(e==="cart"){let n=`${r?"merchandise":"merchandise.product"}.${t}`;console.error(`[h2:error:ShopifyAnalytics] Can't set up cart analytics events because the \`cart.lines[].${n}\` value is missing from your GraphQL cart query. In your project, search for where \`fragment CartLine on CartLine\` is defined and make sure \`${n}\` is part of your cart query. Check the Hydrogen Skeleton template for reference: https://github.com/Shopify/hydrogen/blob/main/templates/skeleton/app/lib/fragments.ts#L25-L56.`);}else {let n=`${o||t}`;console.error(`[h2:error:ShopifyAnalytics] Can't set up product view analytics events because the \`${n}\` is missing from your \`<Analytics.ProductView>\`. Make sure \`${n}\` is part of your products data prop. Check the Hydrogen Skeleton template for reference: https://github.com/Shopify/hydrogen/blob/main/templates/skeleton/app/routes/products.%24handle.tsx#L159-L165.`);}}function Cr({type:e,products:t}){return !t||t.length===0?(se(e,"",false,"data.products"),false):(t.forEach(r=>{if(!r.id)return se(e,"id",false),false;if(!r.title)return se(e,"title",false),false;if(!r.price)return se(e,"price.amount",true,"price"),false;if(!r.vendor)return se(e,"vendor",false),false;if(!r.variantId)return se(e,"id",true,"variantId"),false;if(!r.variantTitle)return se(e,"title",true,"variantTitle"),false}),true)}function nt(e){return e.map(t=>{let r={productGid:t.id,variantGid:t.variantId,name:t.title,variantName:t.variantTitle,brand:t.vendor,price:t.price,quantity:t.quantity||1,category:t.productType};return t.sku&&(r.sku=t.sku),t.productType&&(r.category=t.productType),r})}function Sr(e){console.error(`[h2:error:CartAnalytics] Can't set up cart analytics events because the \`cart.${e}\` value is missing from your GraphQL cart query. In your project, search for where \`fragment CartApiQuery on Cart\` is defined and make sure \`${e}\` is part of your cart query. Check the Hydrogen Skeleton template for reference: https://github.com/Shopify/hydrogen/blob/main/templates/skeleton/app/lib/fragments.ts#L59.`);}function vr({cart:e,setCarts:t}){let{publish:r,shop:o,customData:n,canTrack:a,cart:s,prevCart:c}=j(),i=useRef(null);return useEffect(()=>{if(e)return Promise.resolve(e).then(u=>{if(u&&u.lines){if(!u.id){Sr("id");return}if(!u.updatedAt){Sr("updatedAt");return}}t(({cart:p,prevCart:d})=>u?.updatedAt!==p?.updatedAt?{cart:u,prevCart:p}:{cart:p,prevCart:d});}),()=>{}},[t,e]),useEffect(()=>{if(!s||!s?.updatedAt||s?.updatedAt===c?.updatedAt)return;let u;try{u=JSON.parse(localStorage.getItem("cartLastUpdatedAt")||"");}catch{u=null;}if(s.id===u?.id&&s.updatedAt===u?.updatedAt)return;let p={eventTimestamp:Date.now(),cart:s,prevCart:c,shop:o,customData:n};if(s.updatedAt===i.current)return;i.current=s.updatedAt,r("cart_updated",p),localStorage.setItem("cartLastUpdatedAt",JSON.stringify({id:s.id,updatedAt:s.updatedAt}));let d=c?.lines?flattenConnection(c?.lines):[],g=s.lines?flattenConnection(s.lines):[];d?.forEach(m=>{let l=g.filter(y=>m.id===y.id);if(l?.length===1){let y=l[0];m.quantity<y.quantity?r("product_added_to_cart",{...p,prevLine:m,currentLine:y}):m.quantity>y.quantity&&r("product_removed_from_cart",{...p,prevLine:m,currentLine:y});}else r("product_removed_from_cart",{...p,prevLine:m});}),g?.forEach(m=>{let l=d.filter(y=>m.id===y.id);(!l||l.length===0)&&r("product_added_to_cart",{...p,currentLine:m});});},[s,c,r,o,n,a]),null}var tn="https://cdn.shopify.com/shopifycloud/perf-kit/shopify-perf-kit-spa.min.js";function Ir({shop:e}){let t=useRef(false),{subscribe:r,register:o}=j(),{ready:n}=o("Internal_Shopify_Perf_Kit"),a=useLoadScript(tn,{attributes:{id:"perfkit","data-application":"hydrogen","data-shop-id":parseGid(e.shopId).id.toString(),"data-storefront-id":e.hydrogenSubchannelId,"data-monorail-region":"global","data-spa-mode":"true","data-resource-timing-sampling-rate":"100"}});return useEffect(()=>{a!=="done"||t.current||(t.current=true,r(F.PAGE_VIEWED,()=>{window.PerfKit?.navigate();}),r(F.PRODUCT_VIEWED,()=>{window.PerfKit?.setPageType("product");}),r(F.COLLECTION_VIEWED,()=>{window.PerfKit?.setPageType("collection");}),r(F.SEARCH_VIEWED,()=>{window.PerfKit?.setPageType("search");}),r(F.CART_VIEWED,()=>{window.PerfKit?.setPageType("cart");}),n());},[r,n,a]),null}var Rr=new Set,K=e=>{Rr.has(e)||(console.warn(e),Rr.add(e));},Tr=new Set,st=e=>{Tr.has(e)||(console.error(new Error(e)),Tr.add(e));};var cn={canTrack:()=>false,cart:null,customData:{},prevCart:null,publish:()=>{},shop:null,subscribe:()=>{},register:()=>({ready:()=>{}}),customerPrivacy:null,privacyBanner:null},xr=createContext(cn),Fe=new Map,Re={};function _r(){return Object.values(Re).every(Boolean)}function Er(e,t){Fe.has(e)||Fe.set(e,new Map),Fe.get(e)?.set(t.toString(),t);}var $e=new Map;function br(e,t){if(!_r()){$e.set(e,t);return}Ur(e,t);}function Ur(e,t){(Fe.get(e)??new Map).forEach((r,o)=>{try{r(t);}catch(n){typeof n=="object"&&n instanceof Error?console.error("Analytics publish error",n.message,o,n.stack):console.error("Analytics publish error",n,o);}});}function wr(e){return Re.hasOwnProperty(e)||(Re[e]=false),{ready:()=>{Re[e]=true,_r()&&$e.size>0&&($e.forEach((t,r)=>{Ur(r,t);}),$e.clear());}}}function Dr(){try{return window.Shopify.customerPrivacy.analyticsProcessingAllowed()}catch{}return  false}function Or(e,t){return `[h2:error:Analytics.Provider] - ${e} is required. Make sure ${t} is defined in your environment variables. See https://h2o.fyi/analytics/consent to learn how to setup environment variables in the Shopify admin.`}function un({canTrack:e,cart:t,children:r,consent:o,customData:n={},shop:a=null,cookieDomain:s}){let c=useRef(false),{shop:i}=pn(a),[u,p]=useState(!!e),[d,g]=useState({cart:null,prevCart:null}),[m,l]=useState(e?()=>e:()=>Dr);if(i)if(/\/68817551382$/.test(i.shopId))K("[h2:error:Analytics.Provider] - Mock shop is used. Analytics will not work properly.");else {if(!o.checkoutDomain){let h=Or("consent.checkoutDomain","PUBLIC_CHECKOUT_DOMAIN");st(h);}if(!o.storefrontAccessToken){let h=Or("consent.storefrontAccessToken","PUBLIC_STOREFRONT_API_TOKEN");st(h);}o?.country||(o.country="US"),o?.language||(o.language="EN"),o.withPrivacyBanner===void 0&&(o.withPrivacyBanner=false);}let y=useMemo(()=>({canTrack:m,...d,customData:n,publish:m()?br:()=>{},shop:i,subscribe:Er,register:wr,customerPrivacy:le(),privacyBanner:ke()}),[u,m,d,d.cart?.updatedAt,d.prevCart,br,Er,n,i,wr,JSON.stringify(Re),le,ke]);return jsxs(xr.Provider,{value:y,children:[r,!!i&&jsx(or,{}),!!i&&!!t&&jsx(vr,{cart:t,setCarts:g}),!!i&&o.checkoutDomain&&jsx(hr,{consent:o,onReady:()=>{c.current=true,p(true),l(e?()=>e:()=>Dr);},domain:s}),!!i&&jsx(Ir,{shop:i})]})}function j(){let e=useContext(xr);if(!e)throw new Error("[h2:error:useAnalytics] 'useAnalytics()' must be a descendent of <AnalyticsProvider/>");return e}function pn(e){let[t,r]=useState(null);return useEffect(()=>(Promise.resolve(e).then(r),()=>{}),[r,e]),{shop:t}}async function dn({storefront:e,publicStorefrontId:t="0"}){return e.query(ln,{cache:e.CacheLong()}).then(({shop:r,localization:o})=>({shopId:r.id,acceptedLanguage:o.language.isoCode,currency:o.country.currency.isoCode,hydrogenSubchannelId:t}))}var ln=`#graphql
  query ShopData(
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    shop {
      id
    }
    localization {
      country {
        currency {
          isoCode
        }
      }
      language {
        isoCode
      }
    }
  }
`,yn={CartView:sr,CollectionView:ar,CustomView:cr,ProductView:nr,Provider:un,SearchView:ir};function Y(e,t){return it(e.headers,t)}function it(e,t){let r=e?.get?.(t)??e?.[t];return typeof r=="string"?r:null}function re(e){return {requestId:e?Y(e,"request-id"):void 0,purpose:e?Y(e,"purpose"):void 0}}function ye(e,t={}){let r=new Error,o=(n,a="Error")=>{let s=(r.stack??"").split(`
`).slice(3+(t.stackOffset??0)).join(`
`).replace(/ at loader(\d+) \(/,(c,i)=>c.replace(i,""));return `${a}: ${n}
`+s};return e.then(n=>{if(n?.errors&&Array.isArray(n.errors)){let a=typeof t.logErrors=="function"?t.logErrors:()=>t.logErrors??false;n.errors.forEach(s=>{s&&(s.stack=o(s.message,s.name),a(s)&&console.error(s));});}return n}).catch(n=>{throw n&&(n.stack=o(n.message,n.name)),n})}var H=void 0;var qe="public",mn="private",ct="no-store",Lr={maxAge:"max-age",staleWhileRevalidate:"stale-while-revalidate",sMaxAge:"s-maxage",staleIfError:"stale-if-error"};function Te(e){let t=[];return Object.keys(e).forEach(r=>{r==="mode"?t.push(e[r]):Lr[r]&&t.push(`${Lr[r]}=${e[r]}`);}),t.join(", ")}function ut(){return {mode:ct}}function pt(e){if(e?.mode&&e?.mode!==qe&&e?.mode!==mn)throw Error("'mode' must be either 'public' or 'private'")}function ie(e){return pt(e),{mode:qe,maxAge:1,staleWhileRevalidate:9,...e}}function dt(e){return pt(e),{mode:qe,maxAge:3600,staleWhileRevalidate:82800,...e}}function fe(e){return pt(e),{mode:qe,maxAge:1,staleWhileRevalidate:86399,...e}}function lt(e){return e}function z(e){return String(e).includes("__proto__")?JSON.parse(e,gn):JSON.parse(e)}function gn(e,t){if(e!=="__proto__")return t}function He(e,t){return e&&t?{...e,...t}:e||fe()}function yt(e){return Te(He(e))}async function hn(e,t){if(!e)return;let r=await e.match(t);if(!r){return}return r}async function Cn(e,t,r,o){if(!e)return;let n=He(o),a=yt(He(n,{maxAge:(n.maxAge||0)+(n.staleWhileRevalidate||0)})),s=yt(He(n));r.headers.set("cache-control",a),r.headers.set("real-cache-control",s),r.headers.set("cache-put-date",String(Date.now())),await e.put(t,r);}async function An(e,t){e&&await e.delete(t);}function Pn(e,t){let r=e.headers.get("real-cache-control"),o=0;if(r){let a=r.match(/max-age=(\d*)/);a&&a.length>1&&(o=parseFloat(a[1]));}return [(Date.now()-Number(t))/1e3,o]}function Sn(e,t){let r=t.headers.get("cache-put-date");if(!r)return  false;let[o,n]=Pn(t,r),a=o>n;return a}var Ge={get:hn,set:Cn,delete:An,generateDefaultCacheControlHeader:yt,isStale:Sn};function Ee(e){return `https://shopify.dev/?${e}`}function vn(e){return e||fe()}async function kr(e,t){if(!e)return;let r=Ee(t),o=new Request(r),n=await Ge.get(e,o);if(!n)return;let a=await n.text();try{return [z(a),n]}catch{return [a,n]}}async function Nr(e,t,r,o){if(!e)return;let n=Ee(t),a=new Request(n),s=new Response(JSON.stringify(r));await Ge.set(e,a,s,vn(o));}function Mr(e,t){return Ge.isStale(new Request(Ee(e)),t)}function Vr(e){let t=Array.isArray(e)?e:[e],r="";for(let o of t)o!=null&&(typeof o=="object"?r+=JSON.stringify(o):r+=o.toString());return encodeURIComponent(r)}var ft=new Set;async function Be(e,t,{strategy:r=ie(),cacheInstance:o,shouldCacheResult:n=()=>true,waitUntil:a,debugInfo:s}){let i=Vr([...typeof e=="string"?[e]:e]),d=f=>{({displayName:f.displayName,url:f.response?.url,responseInit:{status:f.response?.status||0,statusText:f.response?.statusText||"",headers:Array.from(f.response?.headers.entries()||[])}});},m=void 0;if(!o||!r||r.mode===ct){let f=await t({addDebugData:d});return f}let l=f=>Nr(o,i,{value:f,debugInfo:void 0},r),y=await kr(o,i);if(y&&typeof y[0]!="string"){let[{value:f,debugInfo:P},C]=y;let v=Mr(i,C)?"STALE":"HIT";if(!ft.has(i)&&v==="STALE"){ft.add(i);let b=Promise.resolve().then(async()=>{let O=Date.now();try{let w=await t({addDebugData:d});n(w)&&(await l(w),m?.({result:w,cacheStatus:"PUT",overrideStartTime:O}));}catch(w){w.message&&(w.message="SWR in sub-request failed: "+w.message),console.error(w);}finally{ft.delete(i);}});a?.(b);}return f}let h=await t({addDebugData:d});if(n(h)){let f=Promise.resolve().then(async()=>{await l(h);});a?.(f);}return h}function Fr(e,t){return [e,{status:t.status,statusText:t.statusText,headers:Array.from(t.headers.entries())}]}function $r([e,t]){return [e,new Response(e,t)]}async function Qe(e,t,{cacheInstance:r,cache:o,cacheKey:n=[e,t],shouldCacheResponse:a,waitUntil:s,debugInfo:c,streamConfig:i}){return !o&&(!t.method||t.method==="GET")&&(o=ie()),Be(n,async()=>{if(i){let d=null,m=await createGraphQLClient({url:e,customFetchApi:async(h,f)=>(d=await fetch(h,f),d),headers:t.headers}).requestStream(i.query,{variables:i.variables}),l,y;for await(let h of m){let{data:f,errors:P}=h;l=f,y=P?.graphQLErrors??P;}return d?.ok?Fr({data:l,errors:y},d):d}let u=await fetch(e,t);if(!u.ok)return u;let p=await u.text().catch(()=>"");try{p&&(p=z(p));}catch{}return Fr(p,u)},{cacheInstance:r,waitUntil:s,strategy:o??null,debugInfo:c,shouldCacheResult:u=>"ok"in u?!1:a(...$r(u))}).then(u=>"ok"in u?[null,u]:$r(u))}function Rn(e){let{cache:t,waitUntil:r,request:o}=e;return {run:({cacheKey:n,cacheStrategy:a,shouldCacheResult:s},c)=>Be(n,c,{shouldCacheResult:s,strategy:a,cacheInstance:t,waitUntil:r,debugInfo:{...re(o),stackInfo:H?.()}}),fetch:(n,a,s)=>Qe(n,a??{},{waitUntil:r,cacheKey:[n,a],cacheInstance:t,debugInfo:{url:n,...re(o),stackInfo:H?.(),displayName:s?.displayName},cache:s.cacheStrategy,...s}).then(([c,i])=>({data:c,response:i}))}}var mt=class{#e;constructor(){this.#e=new Map;}add(t){throw new Error("Method not implemented. Use `put` instead.")}addAll(t){throw new Error("Method not implemented. Use `put` instead.")}matchAll(t,r){throw new Error("Method not implemented. Use `match` instead.")}async put(t,r){if(t.method!=="GET")throw new TypeError("Cannot cache response to non-GET request.");if(r.status===206)throw new TypeError("Cannot cache response to a range request (206 Partial Content).");if(r.headers.get("vary")?.includes("*"))throw new TypeError("Cannot cache response with 'Vary: *' header.");this.#e.set(t.url,{body:new Uint8Array(await r.arrayBuffer()),status:r.status,headers:[...r.headers],timestamp:Date.now()});}async match(t){if(t.method!=="GET")return;let r=this.#e.get(t.url);if(!r)return;let{body:o,timestamp:n,...a}=r,s=new Headers(a.headers),c=s.get("cache-control")||s.get("real-cache-control")||"",i=parseInt(c.match(/max-age=(\d+)/)?.[1]||"0",10),u=parseInt(c.match(/stale-while-revalidate=(\d+)/)?.[1]||"0",10),p=(Date.now()-n)/1e3;if(p>i+u){this.#e.delete(t.url);return}let g=p>i;return s.set("cache",g?"STALE":"HIT"),s.set("date",new Date(n).toUTCString()),new Response(o,{status:a.status??200,headers:s})}async delete(t){return this.#e.has(t.url)?(this.#e.delete(t.url),true):false}keys(t){let r=[];for(let o of this.#e.keys())(!t||t.url===o)&&r.push(new Request(o));return Promise.resolve(r)}};var qr="cartFormInput";function J({children:e,action:t,inputs:r,route:o,fetcherKey:n}){let a=useFetcher({key:n});return jsxs(a.Form,{action:o||"",method:"post",children:[(t||r)&&jsx("input",{type:"hidden",name:qr,value:JSON.stringify({action:t,inputs:r})}),typeof e=="function"?e(a):e]})}J.INPUT_NAME=qr;J.ACTIONS={AttributesUpdateInput:"AttributesUpdateInput",BuyerIdentityUpdate:"BuyerIdentityUpdate",Create:"Create",DiscountCodesUpdate:"DiscountCodesUpdate",GiftCardCodesUpdate:"GiftCardCodesUpdate",GiftCardCodesRemove:"GiftCardCodesRemove",LinesAdd:"LinesAdd",LinesRemove:"LinesRemove",LinesUpdate:"LinesUpdate",NoteUpdate:"NoteUpdate",SelectedDeliveryOptionsUpdate:"SelectedDeliveryOptionsUpdate",MetafieldsSet:"MetafieldsSet",MetafieldDelete:"MetafieldDelete",DeliveryAddressesAdd:"DeliveryAddressesAdd",DeliveryAddressesUpdate:"DeliveryAddressesUpdate",DeliveryAddressesRemove:"DeliveryAddressesRemove"};function En(e){let t={};for(let s of e.entries()){let c=s[0],i=e.getAll(c);t[c]=i.length>1?i:s[1],t[c]==="on"?t[c]=true:t[c]==="off"&&(t[c]=false);}let{cartFormInput:r,...o}=t,{action:n,inputs:a}=r?JSON.parse(String(r)):{};return {action:n,inputs:{...a,...o}}}J.getFormInput=En;var gt=e=>{let t=parse(it(e,"Cookie")||"");return ()=>t.cart?`gid://shopify/Cart/${t.cart}`:void 0};var ht=e=>t=>{let r=new Headers;return r.append("Set-Cookie",stringify("cart",t.split("/").pop()||"",{path:"/",...e})),r};var Ct="Custom-Storefront-Request-Group-ID",At="X-Shopify-Storefront-Access-Token",Pt="X-SDK-Variant",St="X-SDK-Variant-Source",vt="X-SDK-Version";function Hr(){return typeof crypto<"u"&&crypto.randomUUID?crypto.randomUUID():`weak-${Math.random().toString(16).substring(2)}`}var be="2025.7.0";function me(e){return e.replace(/\s*#.*$/gm,"").replace(/\s+/gm," ").trim()}var xn=/(^|}\s)query[\s({]/im,_n=/(^|}\s)mutation[\s({]/im;function We(e,t){if(!xn.test(e))throw new Error(`[h2:error:${t}] Can only execute queries`)}function je(e,t){if(!_n.test(e))throw new Error(`[h2:error:${t}] Can only execute mutations`)}var ce=class extends Error{locations;path;extensions;constructor(t,r={}){let n=(r.clientOperation?`[h2:error:${r.clientOperation}] `:"")+t+(r.requestId?` - Request ID: ${r.requestId}`:"");super(n),this.name="GraphQLError",this.extensions=r.extensions,this.locations=r.locations,this.path=r.path,this.stack=r.stack||void 0;try{this.cause=JSON.stringify({...typeof r.cause=="object"?r.cause:{},requestId:r.requestId});}catch{r.cause&&(this.cause=r.cause);}}get[Symbol.toStringTag](){return this.name}toString(){let t=`${this.name}: ${this.message}`;if(this.path)try{t+=` | path: ${JSON.stringify(this.path)}`;}catch{}if(this.extensions)try{t+=` | extensions: ${JSON.stringify(this.extensions)}`;}catch{}return t+=`
`,this.stack&&(t+=`${this.stack.slice(this.stack.indexOf(`
`)+1)}
`),t}toJSON(){return {name:"Error",message:""}}};function we({url:e,response:t,errors:r,type:o,query:n,queryVariables:a,ErrorConstructor:s=Error,client:c="storefront"}){let i=(typeof r=="string"?r:r?.map?.(p=>p.message).join(`
`))||`URL: ${e}
API response error: ${t.status}`,u=new ce(i,{query:n,queryVariables:a,cause:{errors:r},clientOperation:`${c}.${o}`,requestId:t.headers.get("x-request-id")});throw new s(u.message,{cause:u.cause})}var Vn={language:"EN",country:"US"};function Wr(e){let {storefrontHeaders:t,cache:r,waitUntil:o,i18n:n,storefrontId:a,logErrors:s=true,...c}=e,{getPublicTokenHeaders:u,getPrivateTokenHeaders:p,getStorefrontApiUrl:d,getShopifyDomain:g}=createStorefrontClient(c),l=(c.privateStorefrontToken?p:u)({contentType:"json",buyerIp:t?.buyerIp||""});if(l[Ct]=t?.requestGroupId||Hr(),a&&(l[SHOPIFY_STOREFRONT_ID_HEADER]=a),(l["user-agent"]=`Hydrogen ${be}`),t&&t.cookie){let f=getShopifyCookies(t.cookie??"");f[SHOPIFY_Y]&&(l[SHOPIFY_STOREFRONT_Y_HEADER]=f[SHOPIFY_Y]),f[SHOPIFY_S]&&(l[SHOPIFY_STOREFRONT_S_HEADER]=f[SHOPIFY_S]);}let y=JSON.stringify({"content-type":l["content-type"],"user-agent":l["user-agent"],[Pt]:l[Pt],[St]:l[St],[vt]:l[vt],[At]:l[At]});async function h({query:f,mutation:P,variables:C,cache:v,headers:b=[],storefrontApiVersion:O,displayName:w,stackInfo:G}){let Ue=b instanceof Headers?Object.fromEntries(b.entries()):Array.isArray(b)?Object.fromEntries(b):b,B=f??P,Q={...C};n&&(!C?.country&&/\$country/.test(B)&&(Q.country=n.country),!C?.language&&/\$language/.test(B)&&(Q.language=n.language));let ae=d({storefrontApiVersion:O}),A=JSON.stringify({query:B,variables:Q}),I={method:"POST",headers:{...l,...Ue},body:A},x=[ae,I.method,y,I.body],D=B.includes("@defer")?{query:B,variables:Q}:void 0,[M,q]=await Qe(ae,I,{cacheInstance:P?void 0:r,cache:v||fe(),cacheKey:x,waitUntil:o,shouldCacheResponse:U=>!U?.errors,debugInfo:{requestId:I.headers[Ct],displayName:w,url:ae,stackInfo:G,graphql:A,purpose:t?.purpose},streamConfig:D}),N={url:ae,response:q,type:P?"mutation":"query",query:B,queryVariables:Q,errors:void 0};if(!q.ok){let U,W=M;try{W??=await q.text(),U=z(W);}catch{U=[{message:W??"Could not parse Storefront API response"}];}we({...N,errors:U});}let{data:ee,errors:V}=M;V=V?Array.isArray(V)?V:[V]:void 0;let _=V?.map(({message:U,...W})=>new ce(U,{...W,clientOperation:`storefront.${N.type}`,requestId:q.headers.get("x-request-id"),queryVariables:Q,query:B}));return S(ee,_)}return {storefront:{query(f,P){f=me(f),We(f,"storefront.query");let C=Qr?.(f);return ye(h({...P,query:f,stackInfo:H?.(C)}),{stackOffset:C,logErrors:s})},mutate(f,P){f=me(f),je(f,"storefront.mutate");let C=Qr?.(f);return ye(h({...P,mutation:f,stackInfo:H?.(C)}),{stackOffset:C,logErrors:s})},cache:r,CacheNone:ut,CacheLong:dt,CacheShort:ie,CacheCustom:lt,generateCacheControlHeader:Te,getPublicTokenHeaders:u,getPrivateTokenHeaders:p,getShopifyDomain:g,getApiUrl:d,i18n:n??Vn}}}var Qr=void 0;function S(e,t){return {...e,...t&&{errors:t}}}function It({storefront:e,customerAccount:t,getCartId:r,cartFragment:o}){return async n=>{let a=r();if(!a)return null;let[s,{cart:c,errors:i}]=await Promise.all([t?t.isLoggedIn():false,e.query(Fn(o),{variables:{cartId:a,...n},cache:e.CacheNone()})]);if(s&&c?.checkoutUrl){let u=new URL(c.checkoutUrl);u.searchParams.set("logged_in","true"),c.checkoutUrl=u.toString();}return c||i?S(c,i):null}}var Fn=(e=$n)=>`#graphql
  query CartQuery(
    $cartId: ID!
    $numCartLines: Int = 100
    $country: CountryCode = ZZ
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cart(id: $cartId) {
      ...CartApiQuery
    }
  }

  ${e}
`,$n=`#graphql
  fragment CartApiQuery on Cart {
    updatedAt
    id
    checkoutUrl
    totalQuantity
    buyerIdentity {
      countryCode
      customer {
        id
        email
        firstName
        lastName
        displayName
      }
      email
      phone
    }
    lines(first: $numCartLines) {
      edges {
        node {
          id
          quantity
          attributes {
            key
            value
          }
          cost {
            totalAmount {
              amount
              currencyCode
            }
            amountPerQuantity {
              amount
              currencyCode
            }
            compareAtAmountPerQuantity {
              amount
              currencyCode
            }
          }
          merchandise {
            ... on ProductVariant {
              id
              availableForSale
              compareAtPrice {
                ...CartApiMoney
              }
              price {
                ...CartApiMoney
              }
              requiresShipping
              title
              image {
                ...CartApiImage
              }
              product {
                handle
                title
                id
                vendor
              }
              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
    }
    cost {
      subtotalAmount {
        ...CartApiMoney
      }
      totalAmount {
        ...CartApiMoney
      }
      totalDutyAmount {
        ...CartApiMoney
      }
      totalTaxAmount {
        ...CartApiMoney
      }
    }
    note
    attributes {
      key
      value
    }
    discountCodes {
      applicable
      code
    }
    appliedGiftCards {
      id
      lastCharacters
      amountUsed {
        ...CartApiMoney
      }
    }
  }

  fragment CartApiMoney on MoneyV2 {
    currencyCode
    amount
  }

  fragment CartApiImage on Image {
    id
    url
    altText
    width
    height
  }
`;var R=`#graphql
  fragment CartApiError on CartUserError {
    message
    field
    code
  }
`,T=`#graphql
  fragment CartApiMutation on Cart {
    id
    totalQuantity
    checkoutUrl
  }
`,E=`#graphql
  fragment CartApiWarning on CartWarning {
    code
    message
    target
  }
`;function Rt(e){return async(t,r)=>{let o=e.customerAccount?await e.customerAccount.getBuyer():void 0,{cartId:n,...a}=r||{},{buyerIdentity:s,...c}=t,{cartCreate:i,errors:u}=await e.storefront.mutate(qn(e.cartFragment),{variables:{input:{...c,buyerIdentity:{...o,...s}},...a}});return S(i,u)}}var qn=(e=T)=>`#graphql
  mutation cartCreate(
    $input: CartInput!
    $country: CountryCode = ZZ
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cartCreate(input: $input) {
      cart {
        ...CartApiMutation
        checkoutUrl
      }
      userErrors {
        ...CartApiError
      }
      warnings {
        ...CartApiWarning
      }
    }
  }
  ${e}
  ${R}
  ${E}
`;function Tt(e){return async(t,r)=>{let{cartLinesAdd:o,errors:n}=await e.storefront.mutate(Hn(e.cartFragment),{variables:{cartId:e.getCartId(),lines:t,...r}});return S(o,n)}}var Hn=(e=T)=>`#graphql
  mutation cartLinesAdd(
    $cartId: ID!
    $lines: [CartLineInput!]!
    $country: CountryCode = ZZ
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ...CartApiMutation
      }
      userErrors {
        ...CartApiError
      }
      warnings {
        ...CartApiWarning
      }
    }
  }
  ${e}
  ${R}
  ${E}
`;var jr="__h_pending_";function Kr(e){return jr+e}function Ke(e){return e.startsWith(jr)}function Ye(e,t){if(t.some(r=>Ke(typeof r=="string"?r:r.id)))throw new Error(`Tried to perform an action on an optimistic line. Make sure to disable your "${e}" CartForm action when the line is optimistic.`)}function Et(e){return async(t,r)=>{Ye("updateLines",t);let{cartLinesUpdate:o,errors:n}=await e.storefront.mutate(Gn(e.cartFragment),{variables:{cartId:e.getCartId(),lines:t,...r}});return S(o,n)}}var Gn=(e=T)=>`#graphql
  mutation cartLinesUpdate(
    $cartId: ID!
    $lines: [CartLineUpdateInput!]!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ...CartApiMutation
      }
      userErrors {
        ...CartApiError
      }
      warnings {
        ...CartApiWarning
      }
    }
  }
  ${e}
  ${R}
  ${E}
`;function bt(e){return async(t,r)=>{Ye("removeLines",t);let{cartLinesRemove:o,errors:n}=await e.storefront.mutate(Bn(e.cartFragment),{variables:{cartId:e.getCartId(),lineIds:t,...r}});return S(o,n)}}var Bn=(e=T)=>`#graphql
  mutation cartLinesRemove(
    $cartId: ID!
    $lineIds: [ID!]!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        ...CartApiMutation
      }
      userErrors {
        ...CartApiError
      }
      warnings {
        ...CartApiWarning
      }
    }
  }
  ${e}
  ${R}
  ${E}
`;function wt(e){return async(t,r)=>{let o=t.filter((s,c,i)=>i.indexOf(s)===c),{cartDiscountCodesUpdate:n,errors:a}=await e.storefront.mutate(Qn(e.cartFragment),{variables:{cartId:e.getCartId(),discountCodes:o,...r}});return S(n,a)}}var Qn=(e=T)=>`#graphql
  mutation cartDiscountCodesUpdate(
    $cartId: ID!
    $discountCodes: [String!]
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      ... @defer {
        cart {
          ...CartApiMutation
        }
      }
      userErrors {
        ...CartApiError
      }
      warnings {
        ...CartApiWarning
      }
    }
  }
  ${e}
  ${R}
  ${E}
`;function Dt(e){return async(t,r)=>{t.companyLocationId&&e.customerAccount&&e.customerAccount.setBuyer({companyLocationId:t.companyLocationId});let o=e.customerAccount?await e.customerAccount.getBuyer():void 0,{cartBuyerIdentityUpdate:n,errors:a}=await e.storefront.mutate(Wn(e.cartFragment),{variables:{cartId:e.getCartId(),buyerIdentity:{...o,...t},...r}});return S(n,a)}}var Wn=(e=T)=>`#graphql
  mutation cartBuyerIdentityUpdate(
    $cartId: ID!
    $buyerIdentity: CartBuyerIdentityInput!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart {
        ...CartApiMutation
      }
      userErrors {
        ...CartApiError
      }
      warnings {
        ...CartApiWarning
      }
    }
  }
  ${e}
  ${R}
  ${E}
`;function Ot(e){return async(t,r)=>{let{cartNoteUpdate:o,errors:n}=await e.storefront.mutate(jn(e.cartFragment),{variables:{cartId:e.getCartId(),note:t,...r}});return S(o,n)}}var jn=(e=T)=>`#graphql
  mutation cartNoteUpdate(
    $cartId: ID!
    $note: String!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartNoteUpdate(cartId: $cartId, note: $note) {
      cart {
        ...CartApiMutation
      }
      userErrors {
        ...CartApiError
      }
      warnings {
        ...CartApiWarning
      }
    }
  }
  ${e}
  ${R}
  ${E}
`;function xt(e){return async(t,r)=>{let{cartSelectedDeliveryOptionsUpdate:o,errors:n}=await e.storefront.mutate(Kn(e.cartFragment),{variables:{cartId:e.getCartId(),selectedDeliveryOptions:t,...r}});return S(o,n)}}var Kn=(e=T)=>`#graphql
  mutation cartSelectedDeliveryOptionsUpdate(
    $cartId: ID!
    $selectedDeliveryOptions: [CartSelectedDeliveryOptionInput!]!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartSelectedDeliveryOptionsUpdate(cartId: $cartId, selectedDeliveryOptions: $selectedDeliveryOptions) {
      cart {
        ...CartApiMutation
      }
      userErrors {
        ...CartApiError
      }
      warnings {
        ...CartApiWarning
      }
    }
  }
  ${e}
  ${R}
  ${E}
`;function _t(e){return async(t,r)=>{let{cartAttributesUpdate:o,errors:n}=await e.storefront.mutate(Yn(e.cartFragment),{variables:{cartId:r?.cartId||e.getCartId(),attributes:t}});return S(o,n)}}var Yn=(e=T)=>`#graphql
  mutation cartAttributesUpdate(
    $cartId: ID!
    $attributes: [AttributeInput!]!
  ) {
    cartAttributesUpdate(cartId: $cartId, attributes: $attributes) {
      cart {
        ...CartApiMutation
      }
      userErrors {
        ...CartApiError
      }
      warnings {
        ...CartApiWarning
      }
    }
  }
  ${e}
  ${R}
  ${E}
`;function Ut(e){return async(t,r)=>{let o=r?.cartId||e.getCartId(),n=t.map(c=>({...c,ownerId:o})),{cartMetafieldsSet:a,errors:s}=await e.storefront.mutate(zn(),{variables:{metafields:n}});return S({cart:{id:o},...a},s)}}var zn=()=>`#graphql
  mutation cartMetafieldsSet(
    $metafields: [CartMetafieldsSetInput!]!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartMetafieldsSet(metafields: $metafields) {
      userErrors {
        code
        elementIndex
        field
        message
      }
    }
  }
`;function Lt(e){return async(t,r)=>{let o=r?.cartId||e.getCartId(),{cartMetafieldDelete:n,errors:a}=await e.storefront.mutate(Jn(),{variables:{input:{ownerId:o,key:t}}});return S({cart:{id:o},...n},a)}}var Jn=()=>`#graphql
  mutation cartMetafieldDelete(
    $input: CartMetafieldDeleteInput!
  ) {
    cartMetafieldDelete(input: $input) {
      userErrors {
        code
        field
        message
      }
    }
  }
`;function kt(e){return async(t,r)=>{let o=t.filter((s,c,i)=>i.indexOf(s)===c),{cartGiftCardCodesUpdate:n,errors:a}=await e.storefront.mutate(Xn(e.cartFragment),{variables:{cartId:e.getCartId(),giftCardCodes:o,...r}});return S(n,a)}}var Xn=(e=T)=>`#graphql
  mutation cartGiftCardCodesUpdate(
    $cartId: ID!
    $giftCardCodes: [String!]!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartGiftCardCodesUpdate(cartId: $cartId, giftCardCodes: $giftCardCodes) {
      cart {
        ...CartApiMutation
      }
      userErrors {
        ...CartApiError
      }
      warnings {
        ...CartApiWarning
      }
    }
  }
  ${e}
  ${R}
  ${E}
`;function Nt(e){return async(t,r)=>{let{cartGiftCardCodesRemove:o,errors:n}=await e.storefront.mutate(Zn(e.cartFragment),{variables:{cartId:e.getCartId(),appliedGiftCardIds:t,...r}});return S(o,n)}}var Zn=(e=T)=>`#graphql
  mutation cartGiftCardCodesRemove(
    $cartId: ID!
    $appliedGiftCardIds: [ID!]!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartGiftCardCodesRemove(cartId: $cartId, appliedGiftCardIds: $appliedGiftCardIds) {
      cart {
        ...CartApiMutation
      }
      userErrors {
        ...CartApiError
      }
      warnings {
        ...CartApiWarning
      }
    }
  }
  ${e}
  ${R}
  ${E}
`;function Yr(e){return async(t,r)=>{let{cartDeliveryAddressesAdd:o,errors:n}=await e.storefront.mutate(ea(e.cartFragment),{variables:{cartId:e.getCartId(),addresses:t,...r}});return S(o,n)}}var ea=(e=T)=>`#graphql
  mutation cartDeliveryAddressesAdd(
    $cartId: ID!
    $addresses: [CartSelectableAddressInput!]!,
    $country: CountryCode = ZZ
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cartDeliveryAddressesAdd(addresses: $addresses, cartId: $cartId) {
      cart {
        ...CartApiMutation
      }
      userErrors {
        ...CartApiError
      }
      warnings {
        ...CartApiWarning
      }
    }
  }
  ${e}
  ${R}
  ${E}
`;function zr(e){return async(t,r)=>{let{cartDeliveryAddressesRemove:o,errors:n}=await e.storefront.mutate(ta(e.cartFragment),{variables:{cartId:e.getCartId(),addressIds:t,...r}});return S(o,n)}}var ta=(e=T)=>`#graphql
  mutation cartDeliveryAddressesRemove(
    $cartId: ID!
    $addressIds: [ID!]!,
    $country: CountryCode = ZZ
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cartDeliveryAddressesRemove(addressIds: $addressIds, cartId: $cartId) {
      cart {
        ...CartApiMutation
      }
      userErrors {
        ...CartApiError
      }
      warnings {
        ...CartApiWarning
      }
    }
  }
  ${e}
  ${R}
  ${E}
`;function Jr(e){return async(t,r)=>{let{cartDeliveryAddressesUpdate:o,errors:n}=await e.storefront.mutate(ra(e.cartFragment),{variables:{cartId:e.getCartId(),addresses:t,...r}});return S(o,n)}}var ra=(e=T)=>`#graphql
  mutation cartDeliveryAddressesUpdate(
    $cartId: ID!
    $addresses: [CartSelectableAddressUpdateInput!]!,
    $country: CountryCode = ZZ
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cartDeliveryAddressesUpdate(addresses: $addresses, cartId: $cartId) {
      cart {
        ...CartApiMutation
      }
      userErrors {
        ...CartApiError
      }
      warnings {
        ...CartApiWarning
      }
    }
  }
  ${e}
  ${R}
  ${E}
`;function Mt(e){let{getCartId:t,setCartId:r,storefront:o,customerAccount:n,cartQueryFragment:a,cartMutateFragment:s,buyerIdentity:c}=e,i=t(),u=()=>i||t(),p={storefront:o,getCartId:u,cartFragment:s,customerAccount:n},d=Rt(p),g=async function(...l){l[0].buyerIdentity={...c,...l[0].buyerIdentity};let y=await d(...l);return i=y?.cart?.id,y},m={get:It({storefront:o,customerAccount:n,getCartId:u,cartFragment:a}),getCartId:u,setCartId:r,create:g,addLines:async(l,y)=>{let h=l.map(f=>({attributes:f.attributes,quantity:f.quantity,merchandiseId:f.merchandiseId,sellingPlanId:f.sellingPlanId}));return i||y?.cartId?await Tt(p)(h,y):await g({lines:h,buyerIdentity:c},y)},updateLines:Et(p),removeLines:bt(p),updateDiscountCodes:async(l,y)=>i||y?.cartId?await wt(p)(l,y):await g({discountCodes:l},y),updateGiftCardCodes:async(l,y)=>i||y?.cartId?await kt(p)(l,y):await g({giftCardCodes:l},y),removeGiftCardCodes:Nt(p),updateBuyerIdentity:async(l,y)=>i||y?.cartId?await Dt(p)(l,y):await g({buyerIdentity:l},y),updateNote:async(l,y)=>i||y?.cartId?await Ot(p)(l,y):await g({note:l},y),updateSelectedDeliveryOption:xt(p),updateAttributes:async(l,y)=>i||y?.cartId?await _t(p)(l,y):await g({attributes:l},y),setMetafields:async(l,y)=>i||y?.cartId?await Ut(p)(l,y):await g({metafields:l},y),deleteMetafield:Lt(p),addDeliveryAddresses:Yr(p),removeDeliveryAddresses:zr(p),updateDeliveryAddresses:Jr(p)};return "customMethods"in e?{...m,...e.customMethods??{}}:m}function na(e){let t=useFetchers();if(!t||!t.length)return e;let r=e?.lines?structuredClone(e):{lines:{nodes:[]}},o=r.lines.nodes,n=false;for(let{formData:a}of t){if(!a)continue;let s=J.getFormInput(a);if(s.action===J.ACTIONS.LinesAdd)for(let c of s.inputs.lines){if(!c.selectedVariant){console.error("[h2:error:useOptimisticCart] No selected variant was passed in the cart action. Make sure to pass the selected variant if you want to use an optimistic cart");continue}let i=o.find(u=>u.merchandise.id===c.selectedVariant?.id);n=true,i?(i.quantity=(i.quantity||1)+(c.quantity||1),i.isOptimistic=true):o.unshift({id:Kr(c.selectedVariant.id),merchandise:c.selectedVariant,isOptimistic:true,quantity:c.quantity||1});}else if(s.action===J.ACTIONS.LinesRemove)for(let c of s.inputs.lineIds){let i=o.findIndex(u=>u.id===c);if(i!==-1){if(Ke(o[i].id)){console.error("[h2:error:useOptimisticCart] Tried to remove an optimistic line that has not been added to the cart yet");continue}o.splice(i,1),n=true;}else console.warn(`[h2:warn:useOptimisticCart] Tried to remove line '${c}' but it doesn't exist in the cart`);}else if(s.action===J.ACTIONS.LinesUpdate)for(let c of s.inputs.lines){let i=o.findIndex(u=>c.id===u.id);if(i>-1){if(Ke(o[i].id)){console.error("[h2:error:useOptimisticCart] Tried to update an optimistic line that has not been added to the cart yet");continue}o[i].quantity=c.quantity,o[i].quantity===0&&o.splice(i,1),n=true;}else console.warn(`[h2:warn:useOptimisticCart] Tried to update line '${c.id}' but it doesn't exist in the cart`);}}return n&&(r.isOptimistic=n),r.totalQuantity=o.reduce((a,s)=>a+s.quantity,0),r}var aa="https://raw.githubusercontent.com/Shopify/hydrogen/main/docs/changelog.json";async function sa({request:e,changelogUrl:t}){new URL(e.url).searchParams;return fetch(t||aa)}var Vt=createContext$1(),Ft=createContext$1(),$t=createContext$1(),qt=createContext$1(),Ht=createContext$1(),Gt=createContext$1(),ia={storefront:Vt,cart:Ft,customerAccount:$t,env:qt,session:Ht,waitUntil:Gt};var ze="2025-07",he=`Shopify Hydrogen ${be}`,Xr="30243aa5-17c1-465a-8493-944bcc4e88aa",L="customerAccount",Ce="buyer";var $=class extends Response{constructor(t,r,o){super(`Bad request: ${t}`,{status:400,headers:o});}};function Oe(e,t={}){let r=t.headers?new Headers(t.headers):new Headers({});return r.set("location",e),new Response(null,{status:t.status||302,headers:r})}async function ca({session:e,customerAccountId:t,customerAccountTokenExchangeUrl:r,httpsOrigin:o,debugInfo:n}){let a=new URLSearchParams,s=e.get(L),c=s?.refreshToken,i=s?.idToken;if(!c)throw new $("Unauthorized","No refreshToken found in the session. Make sure your session is configured correctly and passed to `createCustomerAccountClient`.");a.append("grant_type","refresh_token"),a.append("refresh_token",c),a.append("client_id",t);let u={"content-type":"application/x-www-form-urlencoded","User-Agent":he,Origin:o};new Date().getTime();let d=r,g=await fetch(d,{method:"POST",headers:u,body:a});if(!g.ok){let h=await g.text();throw new Response(h,{status:g.status,headers:{"Content-Type":"text/html; charset=utf-8"}})}let{access_token:m,expires_in:l,refresh_token:y}=await g.json();if(!m||m.length===0)throw new $("Unauthorized","Invalid access token received.");e.set(L,{accessToken:m,expiresAt:new Date(new Date().getTime()+(l-120)*1e3).getTime()+"",refreshToken:y,idToken:i});}function Ae(e){e.unset(L),e.unset(Ce);}async function Zr({locks:e,expiresAt:t,session:r,customerAccountId:o,customerAccountTokenExchangeUrl:n,httpsOrigin:a,debugInfo:s}){if(parseInt(t,10)-1e3<new Date().getTime())try{e.refresh||(e.refresh=ca({session:r,customerAccountId:o,customerAccountTokenExchangeUrl:n,httpsOrigin:a,debugInfo:s})),await e.refresh,delete e.refresh;}catch(c){throw Ae(r),c&&c.status!==401?c:new $("Unauthorized","Login before querying the Customer Account API.")}}function eo(){let e=ua();return ro(e)}async function to(e){let t=await crypto.subtle.digest({name:"SHA-256"},new TextEncoder().encode(e)),r=pa(t);return ro(r)}function ua(){let e=new Uint8Array(32);return crypto.getRandomValues(e),String.fromCharCode.apply(null,Array.from(e))}function ro(e){return btoa(e).replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"")}function pa(e){let t=new Uint8Array(e),r=Array.from(t);return String.fromCharCode(...r)}function oo(){let e=Date.now().toString(),t=Math.random().toString(36).substring(2);return e+t}async function no(e,t,r,o,n){let a=t;if(!e)throw new $("Unauthorized","oAuth access token was not provided during token exchange.");let s=new URLSearchParams;s.append("grant_type","urn:ietf:params:oauth:grant-type:token-exchange"),s.append("client_id",a),s.append("audience",Xr),s.append("subject_token",e),s.append("subject_token_type","urn:ietf:params:oauth:token-type:access_token"),s.append("scopes","https://api.customers.com/auth/customer.graphql");let c={"content-type":"application/x-www-form-urlencoded","User-Agent":he,Origin:o};new Date().getTime();let u=r,p=await fetch(u,{method:"POST",headers:c,body:s});let d=await p.json();if(d.error)throw new $(d.error_description);return d.access_token}function ao(e){return da(e).payload.nonce}function da(e){let[t,r,o]=e.split("."),n=JSON.parse(atob(t)),a=JSON.parse(atob(r));return {header:n,payload:a,signature:o}}function Je(){return ya(la())}function la(){try{return crypto.getRandomValues(new Uint8Array(16))}catch{return new Uint8Array(16).map(()=>Math.random()*255|0)}}function ya(e){return Array.from(e,function(t){return ("0"+(t&255).toString(16)).slice(-2)}).join("")}function Xe(e){if(!e)return;let{pathname:t,search:r}=new URL(e),o=t+r,n=new URLSearchParams(r),a=n.get("return_to")||n.get("redirect");if(a){if(io(e,a))return a;console.warn(`Cross-domain redirects are not supported. Tried to redirect from ${o} to ${a}`);}}function io(e,t){try{return new URL(e).origin===new URL(t,e).origin}catch{return  false}}function Bt({requestUrl:e,defaultUrl:t,redirectUrl:r}){let o=e,n=so(e,t),a=r?so(e,r):n;return io(e,a.toString())?a.toString():(console.warn(`Cross-domain redirects are not supported. Tried to redirect from ${o} to ${a}. Default url ${n} is used instead.`),n.toString())}function so(e,t){return fa(t)?new URL(t):new URL(t,new URL(e).origin)}function fa(e){try{return new URL(e),!0}catch{return  false}}function co(e,t){let r=`https://shopify.com/${t}`,o=`https://shopify.com/authentication/${t}`;return function(a){switch(a){case "CA_BASE_URL":return r;case "CA_BASE_AUTH_URL":return o;case "GRAPHQL":return `${r}/account/customer/api/${e}/graphql`;case "AUTH":return `${o}/oauth/authorize`;case "LOGIN_SCOPE":return t?"openid email customer-account-api:full":"openid email https://api.customers.com/auth/customer.graphql";case "TOKEN_EXCHANGE":return `${o}/oauth/token`;case "LOGOUT":return `${o}/logout`}}}function ma(e,t){if(!e.url)return t;let{pathname:r}=new URL(e.url),o=r.replace(/\.data$/,"").replace(/\/_root$/,"/").replace(/(.+)\/$/,"$1"),n=t+`?${new URLSearchParams({return_to:o}).toString()}`;return Oe(n)}function Qt({session:e,customerAccountId:t,shopId:r,customerApiVersion:o=ze,request:n,waitUntil:a,authUrl:s,customAuthStatusHandler:c,logErrors:i=true,loginPath:u="/account/login",authorizePath:p="/account/authorize",defaultRedirectPath:d="/account",language:g}){if(o!==ze&&console.warn(`[h2:warn:createCustomerAccountClient] You are using Customer Account API version ${o} when this version of Hydrogen was built for ${ze}.`),e||console.warn("[h2:warn:createCustomerAccountClient] session is required to use Customer Account API. Ensure the session object passed in exist."),!n?.url)throw new Error("[h2:error:createCustomerAccountClient] The request object does not contain a URL.");let m=c||(()=>ma(n,u)),l=new URL(n.url),y=l.protocol==="http:"?l.origin.replace("http","https"):l.origin,h=Bt({requestUrl:y,defaultUrl:p,redirectUrl:s}),f=co(o,r),P=ga(f,t),C=f("GRAPHQL"),v={};async function b({query:A,type:I,variables:x={}}){let D=await G();if(!D)throw m();new Date().getTime();let N=await fetch(C,{method:"POST",headers:{"Content-Type":"application/json","User-Agent":he,Origin:y,Authorization:D},body:JSON.stringify({query:A,variables:x})});let ee=await N.text(),V={url:C,response:N,type:I,query:A,queryVariables:x,errors:void 0,client:"customer"};if(!N.ok){if(N.status===401)throw Ae(e),m();let _;try{_=z(ee);}catch{_=[{message:ee}];}we({...V,errors:_});}try{let _=z(ee),{errors:U}=_,W=U?.map(({message:Pe,...tt})=>new ce(Pe,{...tt,clientOperation:`customerAccount.${V.type}`,requestId:N.headers.get("x-request-id"),queryVariables:x,query:A}));return {..._,...U&&{errors:W}}}catch{we({...V,errors:[{message:ee}]});}}async function O(){if(!r)return  false;let A=e.get(L),I=A?.accessToken,x=A?.expiresAt;if(!I||!x)return  false;let D=H?.();try{await Zr({locks:v,expiresAt:x,session:e,customerAccountId:t,customerAccountTokenExchangeUrl:f("TOKEN_EXCHANGE"),httpsOrigin:y,debugInfo:{waitUntil:a,stackInfo:D,...re(n)}});}catch{return  false}return  true}async function w(){if(!await O())throw m()}async function G(){if(await O())return e.get(L)?.accessToken}async function Ue(A,I){return P(),A=me(A),je(A,"customer.mutate"),ye(b({query:A,type:"mutation",...I}),{logErrors:i})}async function B(A,I){return P(),A=me(A),We(A,"customer.query"),ye(b({query:A,type:"query",...I}),{logErrors:i})}function Q(A){e.set(Ce,{...e.get(Ce),...A});}async function ae(){let A=await G();if(A)return {...e.get(Ce),customerAccessToken:A}}return {i18n:{language:g??"EN"},login:async A=>{P();let I=new URL(f("AUTH")),x=oo(),D=Je();I.searchParams.set("client_id",t),I.searchParams.set("scope","openid email"),I.searchParams.append("response_type","code"),I.searchParams.append("redirect_uri",h),I.searchParams.set("scope",f("LOGIN_SCOPE")),I.searchParams.append("state",x),I.searchParams.append("nonce",D);let M=ha({contextLanguage:g??null,uiLocalesOverride:A?.uiLocales??null});M!=null&&I.searchParams.append("ui_locales",M),A?.countryCode&&I.searchParams.append("region_country",A.countryCode);let q=eo(),N=await to(q);return e.set(L,{...e.get(L),codeVerifier:q,state:x,nonce:D,redirectPath:Xe(n.url)||Y(n,"Referer")||d}),I.searchParams.append("code_challenge",N),I.searchParams.append("code_challenge_method","S256"),Oe(I.toString())},logout:async A=>{P();let I=e.get(L)?.idToken,x=Bt({requestUrl:y,defaultUrl:y,redirectUrl:A?.postLogoutRedirectUri}),D=I?new URL(`${f("LOGOUT")}?${new URLSearchParams([["id_token_hint",I],["post_logout_redirect_uri",x]]).toString()}`).toString():x;Ae(e);let M=A?.headers instanceof Headers?A?.headers:new Headers(A?.headers);return A?.keepSession||(e.destroy?M.set("Set-Cookie",await e.destroy()):console.warn("[h2:warn:customerAccount] session.destroy is not available on your session implementation. All session data might not be cleared on logout."),e.isPending=false),Oe(D,{headers:M})},isLoggedIn:O,handleAuthStatus:w,getAccessToken:G,getApiUrl:()=>C,mutate:Ue,query:B,authorize:async()=>{P();let A=l.searchParams.get("code"),I=l.searchParams.get("state");if(!A||!I)throw Ae(e),new $("Unauthorized","No code or state parameter found in the redirect URL.");if(e.get(L)?.state!==I)throw Ae(e),new $("Unauthorized","The session state does not match the state parameter. Make sure that the session is configured correctly and passed to `createCustomerAccountClient`.");let x=t,D=new URLSearchParams;D.append("grant_type","authorization_code"),D.append("client_id",x),D.append("redirect_uri",h),D.append("code",A);let M=e.get(L)?.codeVerifier;if(!M)throw new $("Unauthorized","No code verifier found in the session. Make sure that the session is configured correctly and passed to `createCustomerAccountClient`.");D.append("code_verifier",M);let q={"content-type":"application/x-www-form-urlencoded","User-Agent":he,Origin:y};new Date().getTime();let V=f("TOKEN_EXCHANGE"),_=await fetch(V,{method:"POST",headers:q,body:D});if(!_.ok)throw new Response(await _.text(),{status:_.status,headers:{"Content-Type":"text/html; charset=utf-8"}});let{access_token:U,expires_in:W,id_token:Pe,refresh_token:tt}=await _.json(),er=e.get(L)?.nonce,tr=await ao(Pe);if(er!==tr)throw new $("Unauthorized",`Returned nonce does not match: ${er} !== ${tr}`);let rr=U;r||(rr=await no(U,t,f("TOKEN_EXCHANGE"),y,{...re(n)}));let wo=e.get(L)?.redirectPath;return e.set(L,{accessToken:rr,expiresAt:new Date(new Date().getTime()+(W-120)*1e3).getTime()+"",refreshToken:tt,idToken:Pe}),Oe(wo||d)},setBuyer:Q,getBuyer:ae,UNSTABLE_setBuyer:A=>{K("[h2:warn:customerAccount] `customerAccount.UNSTABLE_setBuyer` is deprecated. Please use `customerAccount.setBuyer`."),Q(A);},UNSTABLE_getBuyer:()=>(K("[h2:warn:customerAccount] `customerAccount.UNSTABLE_getBuyer` is deprecated. Please use `customerAccount.getBuyer`."),ae())}}function ga(e,t){return function(){try{if(!t)throw Error();new URL(e("CA_BASE_URL")),new URL(e("CA_BASE_AUTH_URL"));}catch{console.error(new Error("[h2:error:customerAccount] You do not have the valid credential to use Customer Account API.\nRun `h2 env pull` to link your store credentials."));let o="Internal Server Error";throw new Response(o,{status:500})}}}function ha(e){let t=uo(e.contextLanguage??null);return uo(e.uiLocalesOverride)??t??null}function uo(e){if(e==null)return null;let o=Aa(e).toLowerCase().replaceAll("_","-").split("-"),n=o.at(0)??null,a=o.at(1)??null;return a?`${n}-${a.toUpperCase()}`:n}var Ca={PT:"PT_PT",ZH:"ZH_CN"};function Aa(e){return Ca[e]??e}function Sa(e,t){let{env:r,request:o,cache:n,waitUntil:a,i18n:s,session:c,logErrors:i,storefront:u={},customerAccount:p,cart:d={},buyerIdentity:g}=e;c||console.warn("[h2:warn:createHydrogenContext] A session object is required to create hydrogen context."),p?.unstableB2b&&K("[h2:warn:createHydrogenContext] `customerAccount.unstableB2b` is now stable. Please remove the `unstableB2b` option.");let{storefront:m}=Wr({cache:n,waitUntil:a,i18n:s,logErrors:i,storefrontHeaders:u.headers||va(o),storefrontApiVersion:u.apiVersion,storefrontId:r.PUBLIC_STOREFRONT_ID,storeDomain:r.PUBLIC_STORE_DOMAIN,privateStorefrontToken:r.PRIVATE_STOREFRONT_API_TOKEN,publicStorefrontToken:r.PUBLIC_STOREFRONT_API_TOKEN}),l=Qt({session:c,request:o,waitUntil:a,logErrors:i,customerApiVersion:p?.apiVersion,authUrl:p?.authUrl,customAuthStatusHandler:p?.customAuthStatusHandler,language:s?.language,customerAccountId:r.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID,shopId:r.SHOP_ID}),y=Mt({getCartId:d.getId||gt(o.headers),setCartId:d.setId||ht(),cartQueryFragment:d.queryFragment,cartMutateFragment:d.mutateFragment,customMethods:d.customMethods,buyerIdentity:g,storefront:m,customerAccount:l}),h=new RouterContextProvider;h.set(Vt,m),h.set(Ft,y),h.set($t,l),h.set(qt,r),h.set(Ht,c),a&&h.set(Gt,a);let f={storefront:m,cart:y,customerAccount:l,env:r,session:c,waitUntil:a,...t||{}};return new Proxy(h,{get(C,v,b){if(v in C){let O=C[v];return typeof O=="function"?O.bind(C):O}return v in f?f[v]:Reflect.get(C,v,b)},has(C,v){return v in C||v in f},ownKeys(C){return [...Reflect.ownKeys(C),...Object.keys(f)]},getOwnPropertyDescriptor(C,v){if(v in C)return Reflect.getOwnPropertyDescriptor(C,v);if(v in f)return {enumerable:true,configurable:true,writable:false,value:f[v]}}})}function va(e){return {requestGroupId:Y(e,"request-id"),buyerIp:Y(e,"oxygen-buyer-ip"),cookie:Y(e,"cookie"),purpose:Y(e,"purpose")}}var po=createContext(void 0),lo=po.Provider,Wt=()=>useContext(po);function ba(e){let t=Je(),r=wa(t,e);return {nonce:t,header:r,NonceProvider:({children:n})=>createElement(lo,{value:t},n)}}function wa(e,t){let{shop:r,...o}=t??{},n=`'nonce-${e}'`,a=["'self'","'unsafe-inline'","https://cdn.shopify.com"],s=["'self'","https://cdn.shopify.com/","https://monorail-edge.shopifysvc.com"];r&&r.checkoutDomain&&s.push(`https://${r.checkoutDomain}`),r&&r.storeDomain&&s.push(`https://${r.storeDomain}`);let i={baseUri:["'self'"],defaultSrc:["'self'",n,"https://cdn.shopify.com","https://shopify.com"],frameAncestors:["'none'"],styleSrc:a,connectSrc:s},u=Object.assign({},i,o);for(let p in i){let d=o[p];p&&d&&(u[p]=Da(d,i[p]));}return u.scriptSrc instanceof Array?u.scriptSrc=[...u.scriptSrc.filter(p=>!p.startsWith("'nonce")),n]:u.defaultSrc instanceof Array&&(u.defaultSrc=[...u.defaultSrc.filter(p=>!p.startsWith("'nonce")),n]),Ea({directives:u})}function Da(e,t){let r=typeof t=="string"?[t]:t,o=Array.isArray(e)?e:[String(e)];return Array.isArray(r)?r.every(a=>a==="'none'")?o:[...o,...r]:r}var _a=forwardRef((e,t)=>{let{waitForHydration:r,src:o,...n}=e,a=Wt();return r?jsx(Ua,{src:o,options:n}):jsx("script",{suppressHydrationWarning:true,...n,src:o,nonce:a,ref:t})});function Ua({src:e,options:t}){if(!e)throw new Error("`waitForHydration` with the Script component requires a `src` prop");return useLoadScript(e,{attributes:t}),null}async function La(e){return e;}function Na(e){let t=useFetchers(),r={};for(let{formData:o}of t)if(o?.get("optimistic-identifier")===e)try{if(o.has("optimistic-data")){let n=JSON.parse(String(o.get("optimistic-data")));Object.assign(r,n);}}catch{}return r}function Ma({id:e,data:t}){return jsxs(Fragment,{children:[jsx("input",{type:"hidden",name:"optimistic-identifier",value:e}),jsx("input",{type:"hidden",name:"optimistic-data",value:JSON.stringify(t)})]})}function Ha({connection:e,children:t=()=>(console.warn("<Pagination> requires children to work properly"),null),namespace:r=""}){let [o,n]=useState(false),a=useNavigation(),s=useLocation();useNavigate();useEffect(()=>{a.state==="idle"&&n(false);},[a.state]);let{endCursor:i,hasNextPage:u,hasPreviousPage:p,nextPageUrl:d,nodes:g,previousPageUrl:m,startCursor:l}=Ga(e,r),y=useMemo(()=>({...s.state,pagination:{...s.state?.pagination||{},[r]:{pageInfo:{endCursor:i,hasPreviousPage:p,hasNextPage:u,startCursor:l},nodes:g}}}),[i,u,p,l,g,r,s.state]),h=useMemo(()=>forwardRef(function(C,v){return u?createElement(Link,{preventScrollReset:true,...C,to:d,state:y,replace:true,ref:v,onClick:()=>n(true)}):null}),[u,d,y]),f=useMemo(()=>forwardRef(function(C,v){return p?createElement(Link,{preventScrollReset:true,...C,to:m,state:y,replace:true,ref:v,onClick:()=>n(true)}):null}),[p,m,y]);return t({state:y,hasNextPage:u,hasPreviousPage:p,isLoading:o,nextPageUrl:d,nodes:g,previousPageUrl:m,NextLink:h,PreviousLink:f})}function Ze(e,t){let r=new URLSearchParams(e);return Object.keys(t?.pagination||{}).forEach(n=>{let a=n===""?"":`${n}_`,s=`${a}cursor`,c=`${a}direction`;r.delete(s),r.delete(c);}),r.toString()}function xe(e){throw new Error(`The Pagination component requires ${"`"+e+"`"} to be a part of your query. See the guide on how to setup your query to include ${"`"+e+"`"}: https://shopify.dev/docs/custom-storefronts/hydrogen/data-fetching/pagination#setup-the-paginated-query`)}function Ga(e,t=""){e.pageInfo||xe("pageInfo"),typeof e.pageInfo.startCursor>"u"&&xe("pageInfo.startCursor"),typeof e.pageInfo.endCursor>"u"&&xe("pageInfo.endCursor"),typeof e.pageInfo.hasNextPage>"u"&&xe("pageInfo.hasNextPage"),typeof e.pageInfo.hasPreviousPage>"u"&&xe("pageInfo.hasPreviousPage");let r=useNavigation(),o=useNavigate(),{state:n,search:a,pathname:s}=useLocation(),c=t?`${t}_cursor`:"cursor",i=t?`${t}_direction`:"direction",d=new URLSearchParams(a).get(i)==="previous",g=useMemo(()=>!globalThis?.window?.__hydrogenHydrated||!n?.pagination?.[t]?.nodes?flattenConnection(e):d?[...flattenConnection(e),...n.pagination[t].nodes||[]]:[...n.pagination[t].nodes||[],...flattenConnection(e)],[n,e,t]),m=useMemo(()=>{let f=globalThis?.window?.__hydrogenHydrated,P=n?.pagination?.[t]?.pageInfo,C=!f||P?.startCursor===void 0?e.pageInfo.startCursor:P.startCursor,v=!f||P?.endCursor===void 0?e.pageInfo.endCursor:P.endCursor,b=!f||P?.hasPreviousPage===void 0?e.pageInfo.hasPreviousPage:P.hasPreviousPage,O=!f||P?.hasNextPage===void 0?e.pageInfo.hasNextPage:P.hasNextPage;return n?.pagination?.[t]?.nodes&&(d?(C=e.pageInfo.startCursor,b=e.pageInfo.hasPreviousPage):(v=e.pageInfo.endCursor,O=e.pageInfo.hasNextPage)),{startCursor:C,endCursor:v,hasPreviousPage:b,hasNextPage:O}},[d,n,t,e.pageInfo.hasNextPage,e.pageInfo.hasPreviousPage,e.pageInfo.startCursor,e.pageInfo.endCursor]),l=useRef({params:Ze(a,n),pathname:s});useEffect(()=>{window.__hydrogenHydrated=true;},[]),useEffect(()=>{let f=Ze(a,n),P=l.current.params;(s!==l.current.pathname||f!==P)&&!(r.state==="idle"&&!r.location)&&(l.current={pathname:s,params:Ze(a,n)},o(`${s}?${Ze(a,n)}`,{replace:true,preventScrollReset:true,state:{nodes:void 0,pageInfo:void 0}}));},[s,a,n]);let y=useMemo(()=>{let f=new URLSearchParams(a);return f.set(i,"previous"),m.startCursor&&f.set(c,m.startCursor),`?${f.toString()}`},[a,m.startCursor]),h=useMemo(()=>{let f=new URLSearchParams(a);return f.set(i,"next"),m.endCursor&&f.set(c,m.endCursor),`?${f.toString()}`},[a,m.endCursor]);return {...m,previousPageUrl:y,nextPageUrl:h,nodes:g}}function Ba(e,t={pageBy:20}){if(typeof e?.url>"u")throw new Error("getPaginationVariables must be called with the Request object passed to your loader function");let{pageBy:r,namespace:o=""}=t,n=new URLSearchParams(new URL(e.url).search),a=o?`${o}_cursor`:"cursor",s=o?`${o}_direction`:"direction",c=n.get(a)??void 0;return (n.get(s)==="previous"?"previous":"next")==="previous"?{last:r,startCursor:c??null}:{first:r,endCursor:c??null}}function Ka(e,t){let r=useNavigation(),[o,n]=useState([]);if(useEffect(()=>{Promise.resolve(t).then(a=>{a&&n(a instanceof Array?a:a.product?.variants?.nodes||[]);}).catch(a=>{reportError(new Error("[h2:error:useOptimisticVariant] An error occurred while resolving the variants for the optimistic product hook.",{cause:a}));});},[JSON.stringify(t)]),r.state==="loading"){let a=new URLSearchParams(r.location.search),s=false,c=o.find(i=>i.selectedOptions?i.selectedOptions.every(u=>a.get(u.name)===u.value):(s||(s=true,reportError(new Error("[h2:error:useOptimisticVariant] The optimistic product hook requires your product query to include variants with the selectedOptions field."))),false));if(c)return {...c,isOptimistic:true}}return e}function es({handle:e,options:t=[],variants:r=[],productPath:o="products",waitForNavigation:n=false,selectedVariant:a,children:s}){let c=t;c[0]?.values&&(K("[h2:warn:VariantSelector] product.options.values is deprecated. Use product.options.optionValues instead."),c[0]&&!c[0].optionValues&&(c=t.map(l=>({...l,optionValues:l.values?.map(y=>({name:y}))||[]}))));let i=r instanceof Array?r:flattenConnection(r),{searchParams:u,path:p,alreadyOnProductPage:d}=rs(e,o,n),g=c.filter(l=>l?.optionValues?.length===1),m=a?a?.selectedOptions?.reduce((l,y)=>(l[y.name]=y.value,l),{}):{};return createElement(Fragment$1,null,...useMemo(()=>c.map(l=>{let y,h=[];for(let f of l.optionValues){let P=new URLSearchParams(d?u:void 0);P.set(l.name,f.name),g.forEach(w=>{w.optionValues[0].name&&P.set(w.name,w.optionValues[0].name);});let C=i.find(w=>w?.selectedOptions?.every(G=>(P.get(G?.name)||m?.[G?.name])===G?.value)),v=u.get(l.name);!v&&a&&(v=m?.[l.name]||null);let b=v?v===f.name:false;b&&(y=f.name);let O="?"+P.toString();h.push({value:f.name,optionValue:f,isAvailable:C?C.availableForSale:true,to:p+O,search:O,isActive:b,variant:C});}return s({option:{name:l.name,value:y,values:h}})}),[c,i,s]))}var ts=e=>{if(typeof e?.url>"u")throw new TypeError(`Expected a Request instance, got ${typeof e}`);let t=new URL(e.url).searchParams,r=[];return t.forEach((o,n)=>{r.push({name:n,value:o});}),r};function rs(e,t,r){let{pathname:o,search:n}=useLocation(),a=useNavigation();return useMemo(()=>{let s=/(\/[a-zA-Z]{2}-[a-zA-Z]{2}\/)/g.exec(o),c=s&&s.length>0;t=t.startsWith("/")?t.substring(1):t;let i=c?`${s[0]}${t}/${e}`:`/${t}/${e}`;return {searchParams:new URLSearchParams(r||a.state!=="loading"?n:a.location.search),alreadyOnProductPage:i===o,path:i}},[o,n,r,e,t,a])}function os(){return {name:"hydrogen-2025.7.0",reactRouterConfig:()=>({appDirectory:"app",buildDirectory:"dist",ssr:true,future:{v8_middleware:true,unstable_optimizeDeps:true,unstable_splitRouteModules:true,unstable_subResourceIntegrity:false,unstable_viteEnvironmentApi:false}}),reactRouterConfigResolved:({reactRouterConfig:e})=>{if(e.basename&&e.basename!=="/")throw new Error(`[Hydrogen Preset] basename is not supported in Hydrogen 2025.7.0.
Reason: Requires major CLI infrastructure modernization.
Workaround: Use reverse proxy or CDN path rewriting for subdirectory hosting.`);if(e.prerender)throw new Error(`[Hydrogen Preset] prerender is not supported in Hydrogen 2025.7.0.
Reason: React Router plugin incompatibility with Hydrogen CLI build pipeline.
Workaround: Use external static generation tools or server-side caching.`);if(e.serverBundles)throw new Error(`[Hydrogen Preset] serverBundles is not supported in Hydrogen 2025.7.0.
Reason: React Router plugin manifest incompatibility with Hydrogen CLI.
Alternative: Route-level code splitting via unstable_splitRouteModules is enabled.`);if(e.buildEnd)throw new Error(`[Hydrogen Preset] buildEnd is not supported in Hydrogen 2025.7.0.
Reason: Hydrogen CLI bypasses React Router buildEnd hook execution.
Workaround: Use external build scripts or package.json post-build hooks.`);if(e.future?.unstable_subResourceIntegrity===true)throw new Error(`[Hydrogen Preset] unstable_subResourceIntegrity cannot be enabled.
Reason: Conflicts with Hydrogen CSP nonce-based authentication.
Impact: Would break Content Security Policy and cause script execution failures.`)}}}var ss=function(e){return jsx(RichText,{...e,components:{link:({node:t})=>jsx(Link,{to:t.url,title:t.title,target:t.target,prefetch:"intent",children:t.children}),...e.components}})};var is=async function({request:t,context:r}){let o=r.storefront,n=r.customerAccount,a=new URL(t.url);if(!o)throw new Error("GraphiQL: Hydrogen's storefront client must be injected in the loader context.");let s={};if(o){let u="X-Shopify-Storefront-Access-Token";s.storefront={name:"Storefront API",authHeader:u,accessToken:o.getPublicTokenHeaders()[u],apiUrl:o.getApiUrl(),icon:"SF"};}if(n){let u=await(await fetch(a.origin+"/graphiql/customer-account.schema.json")).json(),p=await n.getAccessToken();u&&(s["customer-account"]={name:"Customer Account API",value:u,authHeader:"Authorization",accessToken:p,apiUrl:n.getApiUrl(),icon:"CA"});}let c="https://avatars.githubusercontent.com/u/12972006?s=48&v=4",i=String.raw;return new Response(i`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>GraphiQL</title>
          <link rel="icon" type="image/x-icon" href="${c}" />
          <meta charset="utf-8" />
          <style>
            body {
              height: 100%;
              margin: 0;
              width: 100%;
              overflow: hidden;
              background-color: hsl(219, 29%, 18%);
            }

            #graphiql {
              height: 100vh;
            }

            #graphiql > .placeholder {
              color: slategray;
              width: fit-content;
              margin: 40px auto;
              font-family: Arial;
            }

            .graphiql-api-toolbar-label {
              position: absolute;
              bottom: -6px;
              right: -4px;
              font-size: 8px;
            }
          </style>

          <link
            rel="stylesheet"
            href="https://esm.sh/graphiql/dist/style.css"
          />

          <link
            rel="stylesheet"
            href="https://esm.sh/@graphiql/plugin-explorer/dist/style.css"
          />
          <script type="importmap">
            {
              "imports": {
                "react": "https://esm.sh/react@19.1.0",
                "react/jsx-runtime": "https://esm.sh/react@19.1.0/jsx-runtime",
                "react-dom": "https://esm.sh/react-dom@19.1.0",
                "react-dom/client": "https://esm.sh/react-dom@19.1.0/client",

                "graphql": "https://esm.sh/graphql@16.11.0",

                "graphiql": "https://esm.sh/graphiql?standalone&external=react,react-dom,@graphiql/react,graphql",
                "@graphiql/plugin-explorer": "https://esm.sh/@graphiql/plugin-explorer?standalone&external=react,@graphiql/react,graphql",
                "@graphiql/react": "https://esm.sh/@graphiql/react?standalone&external=react,react-dom,graphql",
                "@graphiql/toolkit": "https://esm.sh/@graphiql/toolkit?standalone&external=graphql"
              }
            }
          </script>
          <script type="module">
            // Import React and ReactDOM
            import React from 'react';
            import ReactDOM from 'react-dom/client';

            // Import GraphiQL and the Explorer plugin
            import {GraphiQL, HISTORY_PLUGIN} from 'graphiql';
            import {createGraphiQLFetcher} from '@graphiql/toolkit';
            import {explorerPlugin} from '@graphiql/plugin-explorer';
            import {ToolbarButton} from '@graphiql/react';

            import createJSONWorker from 'https://esm.sh/monaco-editor/esm/vs/language/json/json.worker.js?worker';
            import createGraphQLWorker from 'https://esm.sh/monaco-graphql/esm/graphql.worker.js?worker';
            import createEditorWorker from 'https://esm.sh/monaco-editor/esm/vs/editor/editor.worker.js?worker';
            import {parse, print} from 'graphql';

            globalThis.MonacoEnvironment = {
              getWorker(_workerId, label) {
                switch (label) {
                  case 'json':
                    return createJSONWorker();
                  case 'graphql':
                    return createGraphQLWorker();
                }
                return createEditorWorker();
              },
            };

            const windowUrl = new URL(document.URL);
            const startingSchemaKey =
              windowUrl.searchParams.get('schema') || 'storefront';

            let initialQuery = '{ shop { name } }';
            if (windowUrl.searchParams.has('query')) {
              initialQuery = decodeURIComponent(
                windowUrl.searchParams.get('query') ?? query,
              );
            }

            // Prettify query
            initialQuery = print(parse(initialQuery));

            let variables;
            if (windowUrl.searchParams.has('variables')) {
              variables = decodeURIComponent(
                windowUrl.searchParams.get('variables') ?? '',
              );
            }

            // Prettify variables
            if (variables) {
              variables = JSON.stringify(JSON.parse(variables), null, 2);
            }

            const schemas = ${JSON.stringify(s)};

            let lastActiveTabIndex = -1;
            let lastTabAmount = -1;

            const TAB_STATE_KEY = 'graphiql:tabState';
            const storage = {
              getTabState: () =>
                JSON.parse(localStorage.getItem(TAB_STATE_KEY)),
              setTabState: (state) =>
                localStorage.setItem(TAB_STATE_KEY, JSON.stringify(state)),
            };

            let nextSchemaKey;

            function App() {
              const [activeSchema, setActiveSchema] =
                React.useState(startingSchemaKey);

              const schema = schemas[activeSchema];

              if (!schema) {
                throw new Error('No schema found for ' + activeSchema);
              }

              const fetcher = createGraphiQLFetcher({
                url: schema.apiUrl,
                headers: {[schema.authHeader]: schema.accessToken},
                enableIncrementalDelivery: false,
              });

              // We create a custom fetcher because createGraphiQLFetcher attempts to introspect the schema
              // and the Customer Account API does not support introspection.
              // We  override the fetcher to return the schema directly only for the CAAPI introspection query.
              function createJsonFetcher(options, httpFetch) {
                if (activeSchema === 'storefront') {
                  return fetcher(options, httpFetch);
                } else {
                  // CAAPI requires a custom fetcher
                  if (options.operationName === 'IntrospectionQuery') {
                    return {data: schema.value};
                  } else {
                    return fetcher(options, httpFetch);
                  }
                }
              }

              const keys = Object.keys(schemas);

              function onTabChange(state) {
                const {activeTabIndex, tabs} = state;
                const activeTab = tabs[activeTabIndex];

                if (
                  activeTabIndex === lastActiveTabIndex &&
                  lastTabAmount === tabs.length
                ) {
                  if (
                    nextSchemaKey &&
                    activeTab &&
                    activeTab.schemaKey !== nextSchemaKey
                  ) {
                    activeTab.schemaKey = nextSchemaKey;
                    nextSchemaKey = undefined;

                    // Sync state to localStorage. GraphiQL resets the state
                    // asynchronously, so we need to do it in a timeout.
                    storage.setTabState(state);
                    setTimeout(() => storage.setTabState(state), 500);
                  }

                  // React rerrendering, skip
                  return;
                }

                if (activeTab) {
                  if (!activeTab.schemaKey) {
                    // Creating a new tab
                    if (lastTabAmount < tabs.length) {
                      activeTab.schemaKey = activeSchema;
                      storage.setTabState(state);
                    }
                  }

                  const nextSchema = activeTab.schemaKey || 'storefront';

                  if (nextSchema !== activeSchema) {
                    setActiveSchema(nextSchema);
                  }
                }

                lastActiveTabIndex = activeTabIndex;
                lastTabAmount = tabs.length;
              }

              const plugins = [HISTORY_PLUGIN, explorerPlugin()];

              const props = {
                fetcher: createJsonFetcher,
                defaultEditorToolsVisibility: true,
                initialQuery,
                variables,
                schema: schema.value,
                plugins,
                onTabChange,
              };

              function toggleSelectedApi() {
                const activeKeyIndex = keys.indexOf(activeSchema);
                nextSchemaKey = keys[(activeKeyIndex + 1) % keys.length];

                // This triggers onTabChange
                if (nextSchemaKey) setActiveSchema(nextSchemaKey);
              }

              const CustomToolbar = React.createElement(
                GraphiQL.Toolbar,
                {
                  key: 'Custom Toolbar',
                },
                [
                  React.createElement(
                    ToolbarButton,
                    {
                      key: 'api-wrapper',
                      onClick: toggleSelectedApi,
                      label: 'Toggle between different API schemas',
                    },
                    [
                      React.createElement(
                        'div',
                        {
                          key: 'icon',
                          style: {
                            textAlign: 'center',
                          },
                        },
                        [
                          schema.icon,
                          React.createElement(
                            'div',
                            {
                              key: 'icon-label',
                              className: 'graphiql-api-toolbar-label',
                            },
                            'API',
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              );

              const CustomLogo = React.createElement(
                GraphiQL.Logo,
                {
                  key: 'Logo replacement',
                },
                [
                  React.createElement(
                    'div',
                    {
                      key: 'Logo wrapper',
                      style: {display: 'flex', alignItems: 'center'},
                    },
                    [
                      React.createElement(
                        'div',
                        {
                          key: 'api',
                          className: 'graphiql-logo',
                          style: {
                            paddingRight: 0,
                            whiteSpace: 'nowrap',
                          },
                        },
                        [schema.name],
                      ),
                      React.createElement(GraphiQL.Logo, {key: 'logo'}),
                    ],
                  ),
                ],
              );

              const children = [CustomToolbar, CustomLogo];

              return React.createElement(GraphiQL, props, children);
            }

            const container = document.getElementById('graphiql');

            const root = ReactDOM.createRoot(container);

            root.render(React.createElement(App));
          </script>
        </head>

        <body>
          <div id="graphiql">
            <div class="placeholder">Loading GraphiQL...</div>
          </div>
        </body>
      </html>
    `,{status:200,headers:{"content-type":"text/html"}})};async function cs(e){let{storefront:t,request:r,noAdminRedirect:o,matchQueryParams:n,response:a=new Response("Not Found",{status:404})}=e,s=new URL(r.url),{pathname:c,searchParams:i}=s,u=i.has("_data");i.delete("redirect"),i.delete("return_to"),i.delete("_data");let p=(n?s.toString().replace(s.origin,""):c).toLowerCase();if(s.pathname==="/admin"&&!o)return zt(`${t.getShopifyDomain()}/admin`,u,i,n);try{let{urlRedirects:d}=await t.query(us,{variables:{query:"path:"+p.replace(/\/+$/,"")}}),g=d?.edges?.[0]?.node?.target;if(g)return zt(g,u,i,n);let m=Xe(r.url);if(m)return zt(m,u,i,n)}catch(d){console.error(`Failed to fetch redirects from Storefront API for route ${p}`,d);}return a}var Yt="https://example.com";function zt(e,t,r,o){let n=new URL(e,Yt);if(!o)for(let[a,s]of r)n.searchParams.append(a,s);return t?new Response(null,{status:200,headers:{"X-Remix-Redirect":n.toString().replace(Yt,""),"X-Remix-Status":"301"}}):new Response(null,{status:301,headers:{location:n.toString().replace(Yt,"")}})}var us=`#graphql
  query redirects($query: String) {
    urlRedirects(first: 1, query: $query) {
      edges {
        node {
          target
        }
      }
    }
  }
`;var ps={"&":"\\u0026",">":"\\u003e","<":"\\u003c","\u2028":"\\u2028","\u2029":"\\u2029"},ds=/[&><\u2028\u2029]/g;function Io(e){return e.replace(ds,t=>ps[t])}var oe="Error in SEO input: ",X={title:{validate:e=>{if(typeof e!="string")throw new Error(oe.concat("`title` should be a string"));if(typeof e=="string"&&e.length>120)throw new Error(oe.concat("`title` should not be longer than 120 characters"));return e}},description:{validate:e=>{if(typeof e!="string")throw new Error(oe.concat("`description` should be a string"));if(typeof e=="string"&&e.length>155)throw new Error(oe.concat("`description` should not be longer than 155 characters"));return e}},url:{validate:e=>{if(typeof e!="string")throw new Error(oe.concat("`url` should be a string"));if(typeof e=="string"&&!e.startsWith("http"))throw new Error(oe.concat("`url` should be a valid URL"));return e}},handle:{validate:e=>{if(typeof e!="string")throw new Error(oe.concat("`handle` should be a string"));if(typeof e=="string"&&!e.startsWith("@"))throw new Error(oe.concat("`handle` should start with `@`"));return e}}};function Ro(e){let t=[];for(let r of Object.keys(e))switch(r){case "title":{let o=Z(X.title,e.title),n=Xt(e?.titleTemplate,o);if(!n)break;t.push(k("title",{title:n}),k("meta",{property:"og:title",content:n}),k("meta",{name:"twitter:title",content:n}));break}case "description":{let o=Z(X.description,e.description);if(!o)break;t.push(k("meta",{name:"description",content:o}),k("meta",{property:"og:description",content:o}),k("meta",{name:"twitter:description",content:o}));break}case "url":{let o=Z(X.url,e.url);if(!o)break;let a=o.split("?")[0].replace(/\/$/,"");t.push(k("link",{rel:"canonical",href:a}),k("meta",{property:"og:url",content:a}));break}case "handle":{let o=Z(X.handle,e.handle);if(!o)break;t.push(k("meta",{name:"twitter:site",content:o}),k("meta",{name:"twitter:creator",content:o}));break}case "media":{let o,n=ne(e.media);for(let a of n)if(typeof a=="string"&&t.push(k("meta",{name:"og:image",content:a})),a&&typeof a=="object"){let s=a.type||"image",c=a?{url:a?.url,secure_url:a?.url,type:Zt(a.url),width:a?.width,height:a?.height,alt:a?.altText}:{};for(let i of Object.keys(c))c[i]&&(o=c[i],t.push(k("meta",{property:`og:${s}:${i}`,content:o},c.url)));}break}case "jsonLd":{let o=ne(e.jsonLd),n=0;for(let a of o){if(typeof a!="object")continue;let s=k("script",{type:"application/ld+json",children:JSON.stringify(a,(c,i)=>typeof i=="string"?Io(i):i)},`json-ld-${a?.["@type"]||a?.name||n++}`);t.push(s);}break}case "alternates":{let o=ne(e.alternates);for(let n of o){if(!n)continue;let{language:a,url:s,default:c}=n,i=a?`${a}${c?"-default":""}`:void 0;t.push(k("link",{rel:"alternate",hrefLang:i,href:s}));}break}case "robots":{if(!e.robots)break;let{maxImagePreview:o,maxSnippet:n,maxVideoPreview:a,noArchive:s,noFollow:c,noImageIndex:i,noIndex:u,noSnippet:p,noTranslate:d,unavailableAfter:g}=e.robots,m=[s&&"noarchive",i&&"noimageindex",p&&"nosnippet",d&&"notranslate",o&&`max-image-preview:${o}`,n&&`max-snippet:${n}`,a&&`max-video-preview:${a}`,g&&`unavailable_after:${g}`],l=(u?"noindex":"index")+","+(c?"nofollow":"follow");for(let y of m)y&&(l+=`,${y}`);t.push(k("meta",{name:"robots",content:l}));break}}return t.flat().sort((r,o)=>r.key.localeCompare(o.key))}function k(e,t,r){let o={tag:e,props:{},key:""};return e==="title"?(o.children=t.title,o.key=Jt(o),o):e==="script"?(o.children=typeof t.children=="string"?t.children:"",o.key=Jt(o,r),delete t.children,o.props=t,o):(o.props=t,Object.keys(o.props).forEach(n=>!o.props[n]&&delete o.props[n]),o.key=Jt(o,r),o)}function Jt(e,t){let{tag:r,props:o}=e;if(r==="title")return "0-title";if(r==="meta"){let n=o.content===t&&typeof o.property=="string"&&!o.property.endsWith("secure_url")&&"0";return [r,...[t,n],o.property||o.name].filter(s=>s).join("-")}return r==="link"?[r,o.rel,o.hrefLang||o.media].filter(a=>a).join("-").replace(/\s+/g,"-"):r==="script"?`${r}-${t}`:`${r}-${o.type}`}function Xt(e,t){if(t)return e?typeof e=="function"?e(t):e.replace("%s",t??""):t}function Zt(e){switch(e&&e.split(".").pop()){case "svg":return "image/svg+xml";case "png":return "image/png";case "gif":return "image/gif";case "swf":return "application/x-shockwave-flash";case "mp3":return "audio/mpeg";case "jpg":case "jpeg":default:return "image/jpeg"}}function ne(e){return Array.isArray(e)?e:[e]}function Z(e,t){try{return e.validate(t)}catch(r){return console.warn(r.message),t}}function ls(...e){let t=[],r=e.reduce((o,n)=>{if(!n)return o;Object.keys(n).forEach(s=>!n[s]&&delete n[s]);let{jsonLd:a}=n;return a?o?.jsonLd?{...o,...n,jsonLd:ne(o.jsonLd).concat(a)}:{...o,...n,jsonLd:[a]}:{...o,...n}},{})||{};for(let o of Object.keys(r))switch(o){case "title":{let n=Z(X.title,r.title),a=Xt(r?.titleTemplate,n);if(!a)break;t.push({title:a},{property:"og:title",content:a},{property:"twitter:title",content:a});break}case "description":{let n=Z(X.description,r.description);if(!n)break;t.push({name:"description",content:n},{property:"og:description",content:n},{property:"twitter:description",content:n});break}case "url":{let n=Z(X.url,r.url);if(!n)break;let s=n.split("?")[0].replace(/\/$/,"");t.push({tagName:"link",rel:"canonical",href:s},{property:"og:url",content:s});break}case "handle":{let n=Z(X.handle,r.handle);if(!n)break;t.push({property:"twitter:site",content:n},{property:"twitter:creator",content:n});break}case "media":{let n,a=ne(r.media);for(let s of a)if(typeof s=="string"&&t.push({property:"og:image",content:s}),s&&typeof s=="object"){let c=s.type||"image",i=s?{url:s?.url,secure_url:s?.url,type:Zt(s.url),width:s?.width,height:s?.height,alt:s?.altText}:{};for(let u of Object.keys(i))i[u]&&(n=i[u],t.push({property:`og:${c}:${u}`,content:n}));}break}case "jsonLd":{let n=ne(r.jsonLd);for(let s of n)typeof s!="object"||Object.keys(s).length===0||t.push({"script:ld+json":s});break}case "alternates":{let n=ne(r.alternates);for(let a of n){if(!a)continue;let{language:s,url:c,default:i}=a,u=s?`${s}${i?"-default":""}`:void 0;t.push({tagName:"link",rel:"alternate",hrefLang:u,href:c});}break}case "robots":{if(!r.robots)break;let{maxImagePreview:n,maxSnippet:a,maxVideoPreview:s,noArchive:c,noFollow:i,noImageIndex:u,noIndex:p,noSnippet:d,noTranslate:g,unavailableAfter:m}=r.robots,l=[c&&"noarchive",u&&"noimageindex",d&&"nosnippet",g&&"notranslate",n&&`max-image-preview:${n}`,a&&`max-snippet:${a}`,s&&`max-video-preview:${s}`,m&&`unavailable_after:${m}`],y=(p?"noindex":"index")+","+(i?"nofollow":"follow");for(let h of l)h&&(y+=`,${h}`);t.push({name:"robots",content:y});break}}return t}var Cs=lazy(()=>import('./log-seo-tags-TY72EQWZ.js'));function As({debug:e}){let t=useMatches(),r=useLocation();console.warn("[h2:warn:Seo] The `<Seo/>` component is deprecated. Use `getSeoMeta` instead.\nSee: https://shopify.dev/docs/api/hydrogen/utilities/getseometa");let o=useMemo(()=>t.flatMap(s=>{let{handle:c,...i}=s,u={...i,...r},p=c?.seo,d=i?.data?.seo;return !p&&!d?[]:p?et(p,u):[d]}).reduce((s,c)=>{Object.keys(c).forEach(u=>!c[u]&&delete c[u]);let{jsonLd:i}=c;return i?s?.jsonLd?Array.isArray(i)?{...s,...c,jsonLd:[...s.jsonLd,...i]}:{...s,...c,jsonLd:[...s.jsonLd,i]}:{...s,...c,jsonLd:[i]}:{...s,...c}},{}),[t,r]),{html:n,loggerMarkup:a}=useMemo(()=>{let s=Ro(o),c=s.map(u=>u.tag==="script"?createElement(u.tag,{...u.props,key:u.key,dangerouslySetInnerHTML:{__html:u.children}}):createElement(u.tag,{...u.props,key:u.key},u.children)),i=createElement(Suspense,{fallback:null},createElement(Cs,{headTags:s}));return {html:c,loggerMarkup:i}},[o]);return createElement(Fragment$1,null,n,e&&a)}function et(e,...t){if(e instanceof Function)return et(e(...t),...t);let r={};return Array.isArray(e)?(r=e.reduce((o,n)=>[...o,et(n)],[]),r):e instanceof Object?(Object.entries(e).forEach(([n,a])=>{r[n]=et(a,...t);}),r):e}function Ss(e){return jsx(ShopPayButton,{channel:"hydrogen",...e})}var Is=`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`,Rs=`
</sitemapindex>`,Eo=`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">`,bo="</urlset>";async function Ts(e){let{storefront:t,request:r,types:o=["products","pages","collections","metaObjects","articles","blogs"],customChildSitemaps:n=[]}=e;if(!r||!r.url)throw new Error("A request object is required to generate a sitemap index");if(!t||!t.query)throw new Error("A storefront client is required to generate a sitemap index");let a=await t.query(Ns);if(!a)throw console.warn("[h2:sitemap:warning] Sitemap index is available in API version 2024-10 and later"),new Response("Sitemap index not found.",{status:404});let s=new URL(r.url).origin,c=Is+o.map(i=>{if(!a[i])throw new Error(`[h2:sitemap:error] No data found for type ${i}. Check types passed to \`getSitemapIndex\``);return bs(i,a[i].pagesCount.count,s)}).join(`
`)+n.map(i=>"  <sitemap><loc>"+(s+(i.startsWith("/")?i:"/"+i))+"</loc></sitemap>").join(`
`)+Rs;return new Response(c,{headers:{"Content-Type":"application/xml","Cache-Control":`max-age=${3600*24}`}})}async function Es(e){let{storefront:t,request:r,params:o,getLink:n,locales:a=[],getChangeFreq:s,noItemsFallback:c="/"}=e;if(!o)throw new Error("[h2:sitemap:error] Remix params object is required to generate a sitemap");if(!r||!r.url)throw new Error("A request object is required to generate a sitemap");if(!t||!t.query)throw new Error("A storefront client is required to generate a index");if(!n)throw new Error("A `getLink` function to generate each resource is required to build a sitemap");if(!o.type||!o.page)throw new Response("No data found",{status:404});let i=o.type,u=Ms[i];if(!u)throw new Response("Not found",{status:404});let p=await t.query(u,{variables:{page:parseInt(o.page,10)}});if(!p)throw console.warn("[h2:sitemap:warning] Sitemap is available in API version 2024-10 and later"),new Response("Sitemap not found.",{status:404});let d=new URL(r.url).origin,g="";return p?.sitemap?.resources?.items?.length?g=Eo+p.sitemap.resources.items.map(m=>ws({getChangeFreq:s,url:n({type:m.type??i,baseUrl:d,handle:m.handle}),type:i,getLink:n,updatedAt:m.updatedAt,handle:m.handle,metaobjectType:m.type,locales:a,baseUrl:d})).join(`
`)+bo:g=Eo+`
  <url><loc>${d+c}</loc></url>
`+bo,new Response(g,{headers:{"Content-Type":"application/xml","Cache-Control":`max-age=${3600*24}`}})}function bs(e,t,r){let o="";for(let n=1;n<=t;n++)o+=`  <sitemap><loc>${r}/sitemap/${e}/${n}.xml</loc></sitemap>
`;return o}function ws({url:e,updatedAt:t,locales:r,type:o,getLink:n,baseUrl:a,handle:s,getChangeFreq:c,metaobjectType:i}){return `<url>
  <loc>${e}</loc>
  <lastmod>${t}</lastmod>
  <changefreq>${c?c({type:i??o,handle:s}):"weekly"}</changefreq>
${r.map(u=>Ds(n({type:i??o,baseUrl:a,handle:s,locale:u}),u)).join(`
`)}
</url>
  `.trim()}function Ds(e,t){return `  <xhtml:link rel="alternate" hreflang="${t}" href="${e}" />`}var Os=`#graphql
    query SitemapProducts($page: Int!) {
      sitemap(type: PRODUCT) {
        resources(page: $page) {
          items {
            handle
            updatedAt
          }
        }
      }
    }
`,xs=`#graphql
    query SitemapCollections($page: Int!) {
      sitemap(type: COLLECTION) {
        resources(page: $page) {
          items {
            handle
            updatedAt
          }
        }
      }
    }
`,_s=`#graphql
    query SitemapArticles($page: Int!) {
      sitemap(type: ARTICLE) {
        resources(page: $page) {
          items {
            handle
            updatedAt
          }
        }
      }
    }
`,Us=`#graphql
    query SitemapPages($page: Int!) {
      sitemap(type: PAGE) {
        resources(page: $page) {
          items {
            handle
            updatedAt
          }
        }
      }
    }
`,Ls=`#graphql
    query SitemapBlogs($page: Int!) {
      sitemap(type: BLOG) {
        resources(page: $page) {
          items {
            handle
            updatedAt
          }
        }
      }
    }
`,ks=`#graphql
    query SitemapMetaobjects($page: Int!) {
      sitemap(type: METAOBJECT) {
        resources(page: $page) {
          items {
            handle
            updatedAt
            ... on SitemapResourceMetaobject {
              type
            }
          }
        }
      }
    }
`,Ns=`#graphql
query SitemapIndex {
  products: sitemap(type: PRODUCT) {
    pagesCount {
      count
    }
  }
  collections: sitemap(type: COLLECTION) {
    pagesCount {
      count
    }
  }
  articles: sitemap(type: ARTICLE) {
    pagesCount {
      count
    }
  }
  pages: sitemap(type: PAGE) {
    pagesCount {
      count
    }
  }
  blogs: sitemap(type: BLOG) {
    pagesCount {
      count
    }
  }
  metaObjects: sitemap(type: METAOBJECT) {
    pagesCount {
      count
    }
  }
}
`,Ms={products:Os,articles:_s,collections:xs,pages:Us,blogs:Ls,metaObjects:ks};//! @see https://shopify.dev/docs/api/storefront/latest/queries/cart
//! @see: https://shopify.dev/docs/api/storefront/latest/mutations/cartCreate
//! @see: https://shopify.dev/docs/api/storefront/latest/mutations/cartLinesAdd
//! @see: https://shopify.dev/docs/api/storefront/latest/mutations/cartLinesUpdate
//! @see: https://shopify.dev/docs/api/storefront/latest/mutations/cartLinesRemove
//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartDiscountCodesUpdate
//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartBuyerIdentityUpdate
//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartNoteUpdate
//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartSelectedDeliveryOptionsUpdate
//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartMetafieldsSet
//! @see https://shopify.dev/docs/api/storefront/2025-07/mutations/cartMetafieldDelete
//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartGiftCardCodesUpdate
//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartGiftCardCodesRemove
//! @see: https://shopify.dev/docs/api/storefront/latest/mutations/cartDeliveryAddressesAdd
//! @see: https://shopify.dev/docs/api/storefront/latest/mutations/cartDeliveryAddressesRemove
//! @see: https://shopify.dev/docs/api/storefront/latest/mutations/cartDeliveryAddressesUpdate
export{yn as Analytics,F as AnalyticsEvent,lt as CacheCustom,dt as CacheLong,ut as CacheNone,ie as CacheShort,J as CartForm,mt as InMemoryCache,lo as NonceProvider,Ma as OptimisticInput,Ha as Pagination,ss as RichText,_a as Script,As as Seo,Ss as ShopPayButton,es as VariantSelector,_t as cartAttributesUpdateDefault,Dt as cartBuyerIdentityUpdateDefault,Rt as cartCreateDefault,wt as cartDiscountCodesUpdateDefault,It as cartGetDefault,gt as cartGetIdDefault,Nt as cartGiftCardCodesRemoveDefault,kt as cartGiftCardCodesUpdateDefault,Tt as cartLinesAddDefault,bt as cartLinesRemoveDefault,Et as cartLinesUpdateDefault,Lt as cartMetafieldDeleteDefault,Ut as cartMetafieldsSetDefault,Ot as cartNoteUpdateDefault,xt as cartSelectedDeliveryOptionsUpdateDefault,ht as cartSetIdDefault,sa as changelogHandler,Mt as createCartHandler,ba as createContentSecurityPolicy,Qt as createCustomerAccountClient,Sa as createHydrogenContext,Wr as createStorefrontClient,Rn as createWithCache,S as formatAPIResult,Te as generateCacheControlHeader,Ba as getPaginationVariables,ts as getSelectedProductOptions,ls as getSeoMeta,dn as getShopAnalytics,Es as getSitemap,Ts as getSitemapIndex,is as graphiqlLoader,ia as hydrogenContext,os as hydrogenPreset,La as hydrogenRoutes,cs as storefrontRedirect,j as useAnalytics,ot as useCustomerPrivacy,Wt as useNonce,na as useOptimisticCart,Na as useOptimisticData,Ka as useOptimisticVariant};//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map