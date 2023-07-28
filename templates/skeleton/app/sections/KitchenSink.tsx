import type {KitchenSinkFragment} from 'storefrontapi.generated';
import {Image, parseMetafield} from '@shopify/hydrogen';
import {Link} from '@remix-run/react';
import type {ParsedMetafields} from '@shopify/hydrogen';
import type {Metafield} from '@shopify/hydrogen/storefront-api-types';

export function KitchenSink({
  date: _date,
  list_date: _list_date,
  date_time: _date_time,
  list_date_time: _list_date_time,
  dimension: _dimension,
  list_dimension: _list_dimension,
  volume: _volume,
  list_volume: _list_volume,
  weight: _weight,
  lists_weight: _lists_weight,
  decimal: _decimal,
  lists_decimal: _lists_decimal,
  integer: _integer,
  lists_integer: _lists_integer,
  single_line_text: _single_line_text,
  multi_line_text: _multi_line_text,
  list_single_line_text: _list_single_line_text,
  rich_text: _rich_text,
  product: _product,
  list_product: _list_product,
  collection: _collection,
  list_collection: _list_collection,
  page: _page,
  list_page: _list_page,
  product_variant: _product_variant,
  list_product_variant: _list_product_variant,
  file: _file,
  list_file: _list_file,
  boolean: _boolean,
  color: _color,
  list_color: _list_color,
  rating: _rating,
  list_rating: _list_rating,
  url: _url,
  list_url: _list_url,
  json: _json,
  mixed_reference: _mixed_reference,
  list_mixed_reference: _list_mixed_reference,
  metaobject: _metaobject,
  list_metaobject: _list_metaobject,
  money: _money,
}: KitchenSinkFragment) {
  const date =
    _date && parseMetafield<ParsedMetafields['date']>(_date as Metafield);
  const list_date =
    _list_date &&
    parseMetafield<ParsedMetafields['list.date']>(_list_date as Metafield);
  const date_time =
    _date_time &&
    parseMetafield<ParsedMetafields['date_time']>(_date_time as Metafield);
  const list_date_time =
    _list_date_time &&
    parseMetafield<ParsedMetafields['list.date_time']>(
      _list_date_time as Metafield,
    );
  const dimension =
    _dimension &&
    parseMetafield<ParsedMetafields['dimension']>(_dimension as Metafield);
  const list_dimension =
    _list_dimension &&
    parseMetafield<ParsedMetafields['list.dimension']>(
      _list_dimension as Metafield,
    );
  const volume =
    _volume && parseMetafield<ParsedMetafields['volume']>(_volume as Metafield);
  const list_volume =
    _list_volume &&
    parseMetafield<ParsedMetafields['list.volume']>(_list_volume as Metafield);
  const weight =
    _weight && parseMetafield<ParsedMetafields['weight']>(_weight as Metafield);
  const list_weight =
    _lists_weight &&
    parseMetafield<ParsedMetafields['list.weight']>(_lists_weight as Metafield);
  const decimal =
    _decimal &&
    parseMetafield<ParsedMetafields['number_decimal']>(_decimal as Metafield);
  const list_decimal =
    _lists_decimal &&
    parseMetafield<ParsedMetafields['list.number_decimal']>(
      _lists_decimal as Metafield,
    );
  const integer =
    _integer &&
    parseMetafield<ParsedMetafields['number_integer']>(_integer as Metafield);
  const list_integer =
    _lists_integer &&
    parseMetafield<ParsedMetafields['list.number_integer']>(
      _lists_integer as Metafield,
    );
  const single_line_text =
    _single_line_text &&
    parseMetafield<ParsedMetafields['single_line_text_field']>(
      _single_line_text as Metafield,
    );
  const multi_line_text =
    _multi_line_text &&
    parseMetafield<ParsedMetafields['multi_line_text_field']>(
      _multi_line_text as Metafield,
    );
  const list_single_line_text =
    _list_single_line_text &&
    parseMetafield<ParsedMetafields['list.single_line_text_field']>(
      _list_single_line_text as Metafield,
    );
  const product =
    _product &&
    parseMetafield<ParsedMetafields['product_reference']>(
      _product as Metafield,
    );
  const money =
    _money && parseMetafield<ParsedMetafields['money']>(_money as Metafield);
  const list_product =
    _list_product &&
    parseMetafield<ParsedMetafields['list.product_reference']>(
      _list_product as Metafield,
    );
  const collection =
    _collection &&
    parseMetafield<ParsedMetafields['collection_reference']>(
      _collection as Metafield,
    );
  const list_collection =
    _list_collection &&
    parseMetafield<ParsedMetafields['list.collection_reference']>(
      _list_collection as Metafield,
    );
  const page =
    _page &&
    parseMetafield<ParsedMetafields['page_reference']>(_page as Metafield);
  const list_page =
    _list_page &&
    parseMetafield<ParsedMetafields['list.page_reference']>(
      _list_page as Metafield,
    );
  const product_variant =
    _product_variant &&
    parseMetafield<ParsedMetafields['variant_reference']>(
      _product_variant as Metafield,
    );
  const list_product_variant =
    _list_product_variant &&
    parseMetafield<ParsedMetafields['list.variant_reference']>(
      _list_product_variant as Metafield,
    );
  const file =
    _file &&
    parseMetafield<ParsedMetafields['file_reference']>(_file as Metafield);
  const list_file =
    _list_file &&
    parseMetafield<ParsedMetafields['list.file_reference']>(
      _list_file as Metafield,
    );
  const boolean =
    _boolean &&
    parseMetafield<ParsedMetafields['boolean']>(_boolean as Metafield);
  const color =
    _color && parseMetafield<ParsedMetafields['color']>(_color as Metafield);
  const list_color =
    _list_color &&
    parseMetafield<ParsedMetafields['list.color']>(_list_color as Metafield);
  const rating =
    _rating && parseMetafield<ParsedMetafields['rating']>(_rating as Metafield);
  const list_rating =
    _list_rating &&
    parseMetafield<ParsedMetafields['list.rating']>(_list_rating as Metafield);
  const url =
    _url && parseMetafield<ParsedMetafields['url']>(_url as Metafield);
  const list_url =
    _list_url &&
    parseMetafield<ParsedMetafields['list.url']>(_list_url as Metafield);
  const json =
    _json && parseMetafield<ParsedMetafields['json']>(_json as Metafield);

  return (
    <section className="kitchen-sink">
      <h1>Kitchen Sink</h1>
      <>
        {date?.parsedValue && (
          <p>
            <strong>Date:</strong>{' '}
            <time>{date.parsedValue.toLocaleDateString()}</time>
          </p>
        )}
        {list_date?.parsedValue && (
          <p>
            <strong>Date (list):</strong>
            <ul>
              {list_date?.parsedValue.map((date) => {
                return (
                  <li key={date.toLocaleDateString()}>
                    {date.toLocaleDateString()}
                  </li>
                );
              })}
            </ul>
          </p>
        )}
        {date_time?.parsedValue && (
          <p>
            <strong>Date Time:</strong>{' '}
            <time>{date_time.parsedValue.toString()}</time>
          </p>
        )}
        {list_date_time?.parsedValue && (
          <p>
            <strong>Date Time (list):</strong>
            <ul>
              {list_date_time?.parsedValue.map((date) => {
                return <li key={date.toString()}>{date.toString()}</li>;
              })}
            </ul>
          </p>
        )}
        {dimension?.parsedValue && (
          <p>
            <strong>Dimension:</strong>{' '}
            <div>
              {dimension.parsedValue.value}
              {dimension.parsedValue.unit}
            </div>
          </p>
        )}
        {list_dimension?.parsedValue && (
          <p>
            <strong>Dimension (list):</strong>
            <ul>
              {list_dimension?.parsedValue.map((dimension) => {
                return (
                  <li key={dimension.value}>
                    {dimension.value}
                    {dimension.unit}
                  </li>
                );
              })}
            </ul>
          </p>
        )}
        {volume?.parsedValue && (
          <p>
            <strong>Volume:</strong>{' '}
            <div>
              {volume.parsedValue.value}
              {volume.parsedValue.unit}
            </div>
          </p>
        )}
        {list_volume?.parsedValue && (
          <p>
            <strong>Volume (list):</strong>
            <ul>
              {list_volume?.parsedValue.map((volume) => {
                return (
                  <li key={volume.value}>
                    {volume.value}
                    {volume.unit}
                  </li>
                );
              })}
            </ul>
          </p>
        )}
        {weight?.parsedValue && (
          <p>
            <strong>Weight:</strong>{' '}
            <div>
              {weight.parsedValue.value}
              {weight.parsedValue.unit}
            </div>
          </p>
        )}
        {list_weight?.parsedValue && (
          <p>
            <strong>Weight (list):</strong>
            <ul>
              {list_weight?.parsedValue.map((weight) => {
                return (
                  <li key={weight.value}>
                    {weight.value}
                    {weight.unit}
                  </li>
                );
              })}
            </ul>
          </p>
        )}
        {decimal?.parsedValue && (
          <p>
            <strong>Decimal:</strong> {decimal.parsedValue}
          </p>
        )}
        {list_decimal?.parsedValue && (
          <p>
            <strong>Decimal (list):</strong>
            <ul>
              {list_decimal?.parsedValue.map((decimal) => {
                return <li key={decimal}>{decimal}</li>;
              })}
            </ul>
          </p>
        )}
        {integer?.parsedValue && (
          <p>
            <strong>Integer:</strong> {integer.parsedValue}
          </p>
        )}
        {list_integer?.parsedValue && (
          <p>
            <strong>Integer (list):</strong>
            <ul>
              {list_integer?.parsedValue.map((integer) => {
                return <li key={integer}>{integer}</li>;
              })}
            </ul>
          </p>
        )}
        {single_line_text?.parsedValue && (
          <p>
            <strong>Single Line Text:</strong> {single_line_text.parsedValue}
          </p>
        )}
        {multi_line_text?.parsedValue && (
          <p>
            <strong>Multi Line Text:</strong> {multi_line_text.parsedValue}
          </p>
        )}
        {list_single_line_text?.parsedValue && (
          <p>
            <strong>Single Line Text (list):</strong>
            <ul>
              {list_single_line_text?.parsedValue.map((text) => {
                return <li key={text}>{text}</li>;
              })}
            </ul>
          </p>
        )}
        {product?.parsedValue && (
          <p>
            <strong>Product:</strong>{' '}
            <Link to={`/products/${product.parsedValue.handle}`}>
              <p>{product.parsedValue.title}</p>
            </Link>
          </p>
        )}
        {list_product?.parsedValue && (
          <p>
            <strong>Product (list):</strong>
            <ul>
              {list_product?.parsedValue.map((product) => {
                return (
                  <li key={product.handle}>
                    <Link to={`/products/${product.handle}`}>
                      <p>{product.title}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </p>
        )}
        {collection?.parsedValue && (
          <p>
            <strong>Collection:</strong>{' '}
            <Link to={`/collections/${collection.parsedValue.handle}`}>
              <p>{collection.parsedValue.title}</p>
            </Link>
          </p>
        )}
        {list_collection?.parsedValue && (
          <p>
            <strong>Collection (list):</strong>
            <ul>
              {list_collection?.parsedValue.map((collection) => {
                return (
                  <li key={collection.handle}>
                    <Link to={`/collections/${collection.handle}`}>
                      <p>{collection.title}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </p>
        )}
        {money?.parsedValue && (
          <div>
            <strong>Money:</strong>
            <pre>{JSON.stringify(money.parsedValue, null, 2)}</pre>
          </div>
        )}
        {page?.parsedValue && (
          <p>
            <strong>Page:</strong>{' '}
            <Link to={`/pages/${page.parsedValue.handle}`}>
              <p>{page.parsedValue.title}</p>
            </Link>
          </p>
        )}
        {list_page?.parsedValue && (
          <p>
            <strong>Page (list):</strong>
            <ul>
              {list_page?.parsedValue.map((page) => {
                return (
                  <li key={page.handle}>
                    <Link to={`/pages/${page.handle}`}>
                      <p>{page.title}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </p>
        )}
        {file?.parsedValue && (
          <div>
            <p>
              <strong>File:</strong>
            </p>
            {/* @ts-ignore */}
            {file?.parsedValue.__typename === 'MediaImage' && (
              <Image
                // @ts-ignore
                data={file.parsedValue.image}
                style={{height: 'auto'}}
                width="200"
              />
            )}
          </div>
        )}
        {list_file?.parsedValue && (
          <div>
            <strong>File (list):</strong>
            <ul>
              {list_file?.parsedValue.map((file) => {
                switch (file.__typename) {
                  // @ts-ignore
                  case 'MediaImage':
                    return (
                      <li key={file.id}>
                        <Image
                          // @ts-ignore
                          data={file.image}
                          style={{height: 'auto'}}
                          width="200"
                        />
                      </li>
                    );
                  default:
                    return (
                      <li key={file.id}>
                        <pre>{JSON.stringify(file, null, 2)}</pre>
                      </li>
                    );
                }
              })}
            </ul>
          </div>
        )}
        {url?.parsedValue && (
          <p>
            <strong>URL:</strong> <pre>{url.parsedValue}</pre>
          </p>
        )}
        {list_url?.parsedValue && (
          <p>
            <strong>URL (list):</strong>
            <ul>
              {list_url?.parsedValue.map((url) => {
                return (
                  <li key={url}>
                    <pre>{url}</pre>
                  </li>
                );
              })}
            </ul>
          </p>
        )}
        {boolean?.parsedValue && (
          <p>
            <strong>Boolean:</strong>{' '}
            <pre>{boolean.parsedValue.toString()}</pre>
          </p>
        )}
        {color?.parsedValue && (
          <p>
            <strong>Color:</strong>{' '}
            <pre style={{color: color.parsedValue}}>{color.parsedValue}</pre>
          </p>
        )}
        {list_color?.parsedValue && (
          <p>
            <strong>Color (list):</strong>
            <ul>
              {list_color?.parsedValue.map((color) => {
                return (
                  <li key={color}>
                    <pre style={{color}}>{color}</pre>
                  </li>
                );
              })}
            </ul>
          </p>
        )}
        {rating?.parsedValue && (
          <p>
            <strong>Rating:</strong>{' '}
            <div style={{display: 'flex'}}>
              <strong>Min:</strong>{' '}
              <pre>{rating.parsedValue.scale_min.toString()}</pre>
              <strong>Max:</strong>{' '}
              <pre>{rating.parsedValue.scale_max.toString()}</pre>
              <strong>Value:</strong> <pre>{rating.parsedValue.value}</pre>
            </div>
          </p>
        )}
        {list_rating?.parsedValue && (
          <p>
            <strong>Rating (list):</strong>
            <ul>
              {list_rating?.parsedValue.map((rating) => {
                return (
                  <li key={rating.value}>
                    <div style={{display: 'flex'}}>
                      <strong>Min:</strong>{' '}
                      <pre>{rating.scale_min.toString()}</pre>
                      <strong>Max:</strong>{' '}
                      <pre>{rating.scale_max.toString()}</pre>
                      <strong>Value:</strong>{' '}
                      <pre>{rating.value.toString()}</pre>
                    </div>
                  </li>
                );
              })}
            </ul>
          </p>
        )}
        {json?.parsedValue && (
          <p>
            <strong>JSON:</strong>{' '}
            <pre>{JSON.stringify(json.parsedValue, null, 2)}</pre>
          </p>
        )}
        {product_variant?.parsedValue && (
          <p>
            <strong>Product Variant:</strong>{' '}
            <pre>{JSON.stringify(product_variant.parsedValue, null, 2)}</pre>
          </p>
        )}
        {list_product_variant?.parsedValue && (
          <p>
            <strong>Product Variant (list):</strong>
            <ul>
              {list_product_variant?.parsedValue.map((variant) => {
                return (
                  <li key={variant.id}>
                    <pre>{JSON.stringify(variant, null, 2)}</pre>
                  </li>
                );
              })}
            </ul>
          </p>
        )}
      </>
    </section>
  );
}
