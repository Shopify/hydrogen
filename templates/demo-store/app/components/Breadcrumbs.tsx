import React from 'react';
import {Link, UIMatch, useMatches} from '@remix-run/react';

import {IconCaret} from '~/components';

const SEPARATOR = '/';

type PageData = {
  hideBreadcrumbs: boolean;
  pageType: string;
  pageName: string;
};

export function Breadcrumbs() {
  const matches: UIMatch<any>[] = useMatches();
  const deepestRoute = matches.at(-1);
  const splitURL = deepestRoute?.pathname.split('/') || [];
  const pages = [{path: '/', name: 'Home'}];
  const {pageType, pageName, hideBreadcrumbs} = getPageData(splitURL[1]);

  if (splitURL[1]) {
    pages.push({
      path: `/${splitURL[1]}`,
      name: pageName,
    });

    if (splitURL[2]) {
      pages.push({
        path: deepestRoute?.pathname || '',
        name: `${
          deepestRoute?.data?.[pageType]?.title ||
          getCapitalizeString(splitURL[2])
        }`,
      });
    }
  }

  if (hideBreadcrumbs) return null;

  const mobilePage = pages[pages.length - 2];

  return (
    <nav className="text-sm px-4 md:px-12 py-1">
      <div className="flex md:hidden items-center">
        <Link
          className="flex items-center hover:text-primary"
          to={mobilePage.path}
        >
          <IconCaret className="pl-2 text-primary/80" direction={'right'} />
          <span className="text-primary/70">{mobilePage.name}</span>
        </Link>
      </div>
      <ol className="hidden md:flex items-center">
        {pages.map((page, index) => {
          const currentPage = index === pages.length - 1;
          return (
            <li className="flex items-center" key={`${page.path}_${index}`}>
              {index !== 0 ? (
                <span className="px-2 text-primary/80 hover:text-primary">
                  {SEPARATOR}
                </span>
              ) : null}
              {currentPage ? (
                <span className="text-primary/80">{page.name}</span>
              ) : (
                <span className="text-primary/70 hover:text-primary">
                  <Link to={page.path}>{page.name}</Link>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function getCapitalizeString(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getPageData(path: string): PageData {
  const pageData: PageData = {
    hideBreadcrumbs: false,
    pageType: '',
    pageName: getCapitalizeString(path),
  };

  switch (path) {
    case 'collections':
      pageData.pageType = 'collection';
      break;

    case 'products':
      pageData.pageType = 'product';
      break;

    case 'policies':
      pageData.pageType = 'policy';
      break;

    case 'journal':
      pageData.pageType = 'article';
      break;

    case 'pages':
      pageData.pageType = 'page';
      break;

    // homepage
    case '':
      pageData.hideBreadcrumbs = true;
      break;
  }

  return pageData;
}
