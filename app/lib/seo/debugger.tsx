import {Link, useLocation, type RouteMatch} from '@remix-run/react';
import {useSeoConfig, useHeadTags, recursivelyInvokeOrReturn} from './common';
import {renderToString} from 'react-dom/server';

const LABEL_MAP = {
  twitterTags: 'Twitter',
  ogTags: 'Open graph',
  links: 'Links',
  tags: 'Meta',
  LdJson: 'Structured data',
};

function Badge() {
  return (
    <div className="fixed bottom-5 right-5 divide-y rounded-md bg-white">
      <div className="flex gap-2 px-3 py-3 items-center px-5 py-3">
        <Link
          to="?debug=true"
          reloadDocument
          className="flex-1 text-sm font-bold text-gray-600"
        >
          SEO
        </Link>
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring ring-white"></span>
      </div>
    </div>
  );
}

export function Debugger() {
  const {seo, matches} = useSeoConfig();

  const tags = useHeadTags(seo);
  const location = useLocation();
  const debug = new URLSearchParams(location.search).get('debug');
  const debuggerOpen = Boolean(
    debug === 'false' ? false : debug === '' || debug,
  );

  return debuggerOpen ? (
    <Panel>
      <>
        <span className="font-bold block text-sm py-4 px-4">Config</span>
        {Object.entries(seo).flatMap(([property, value]) => {
          if (typeof value !== 'string') {
            return null;
          }
          return <Item property={property} value={value} />;
        })}

        <div className="py-4 px-4">
          {matches.map(({id, handle, data}: RouteMatch, index: number) => (
            <div key={index}>
              <span className="block font-bold block text-xs pb-2 ">{id}</span>
              <div className="whitespace-pre font-mono px-4 py-2 mb-4 text-gray-600 rounded-sm text-[10px] bg-gray-100  text-[10px] px-4">
                {JSON.stringify(
                  recursivelyInvokeOrReturn(handle?.seo, data),
                  null,
                  2,
                )}
              </div>
            </div>
          ))}
        </div>

        <span className="font-bold block text-sm py-4 px-4">Tags</span>

        {Object.entries(tags).map(([label, entries]) => {
          if (entries.length < 1) {
            return null;
          }
          return (
            <div
              key={label}
              className="flex flex-col font-bold block text-sm py-4 px-4"
            >
              <span className="block font-bold block text-xs pb-2">
                {LABEL_MAP[label as keyof typeof LABEL_MAP]}
              </span>
              {label === 'LdJson' ? (
                <span className="whitespace-pre font-mono rounded-sm bg-gray-100  text-[10px] px-4">
                  {JSON.stringify(entries, null, 2)}
                </span>
              ) : (
                entries.map((entry: React.ReactElement, index: number) => (
                  <span
                    className="whitespace-nowrap font-mono rounded-sm text-gray-600 rounded-sm text-[10px] bg-gray-100  text-[10px] px-4"
                    key={index}
                  >
                    {renderToString(entry)}
                  </span>
                ))
              )}
            </div>
          );
        })}
      </>
    </Panel>
  ) : (
    <Badge />
  );
}

function Panel({children}: {children?: React.ReactNode}) {
  return (
    <div className="overflow-y-scroll height max-h-full z-40 fixed w-96 bottom-5 top-5 right-5 divide-y rounded-md bg-white  text-gray-600">
      <div className="flex items-center px-4 py-3  ">
        <Link
          to=""
          reloadDocument
          className="flex-1 text-sm font-bold text-gray-600"
        >
          SEO
        </Link>
        <Link
          to="?debug=false"
          reloadDocument
          className="text-sm font-bold text-gray-600"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
              clipRule="evenodd"
            />
          </svg>
        </Link>
      </div>
      {children}
    </div>
  );
}

function Item({
  pass,
  value,
  property,
}: {
  pass?: boolean;
  value: string;
  property: string;
}) {
  const icon =
    pass !== false ? (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 top-1 relative text-blue-500"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ) : (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 top-2 relative text-red-500"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"
          clipRule="evenodd"
        />
      </svg>
    );

  return (
    <div className="flex items-baseline px-4 py-3 ">
      {icon}
      <span className="font-mono flex-1 mx-1 text-gray-900 text-[10px]">
        <span className="px-2 rounded-sm bg-gray-100">{property}</span>
      </span>
      <span className="mx-1 text-right text-xs text-gray-900 pb-1">
        {value.slice(0, 35)}
        {value.length > 35 && '...'}
      </span>
    </div>
  );
}
