import {UNSTABLE_Analytics} from '@shopify/hydrogen';

export default function Promotion() {
  return (
    <div className="promotion">
      <h1>Promotion page</h1>
      <UNSTABLE_Analytics.CustomView
        type="custom_promotion_viewed"
        data={{
          promotion: {
            id: '123',
          },
        }}
      />
    </div>
  );
}
