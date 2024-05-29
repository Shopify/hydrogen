import {Money} from '@shopify/hydrogen';
import {MoneyV2} from '@shopify/hydrogen/storefront-api-types';

type PriceBreak = {
  minimumQuantity: number;
  price: MoneyV2;
};

export type PriceBreaksProps = {
  priceBreaks: PriceBreak[];
};

export function PriceBreaks({priceBreaks}: PriceBreaksProps) {
  return (
    <>
      <h4>Volume Pricing</h4>
      <table className="rule-table">
        <thead>
          <tr>
            <th className="table-haeading">Minimum Quantity</th>
            <th className="table-haeading">Unit Price</th>
          </tr>
        </thead>
        <tbody>
          {priceBreaks.map((priceBreak, index) => {
            return (
              <tr key={index}>
                <th className="table-item">{priceBreak.minimumQuantity}</th>
                <th className="table-item">
                  <Money data={priceBreak.price} />
                </th>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
