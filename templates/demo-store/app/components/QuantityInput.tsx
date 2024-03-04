import clsx from 'clsx';
import {ChangeEvent, useEffect, useMemo, useState} from 'react';

export function QuantityInput({
  label = '',
  className = '',
  maxValue = null,
  minValue = 0,
  setValue,
}: {
  label?: string;
  className?: string;
  maxValue?: number | null;
  minValue?: number;
  setValue: (value: number) => void;
}) {
  const [quantity, setQuantity] = useState(minValue);

  useEffect(() => {
    setValue(quantity);
  }, [quantity]);

  const setDecrease = () => {
    quantity > minValue ? setQuantity(quantity - 1) : setQuantity(minValue);
  };

  const setIncrease = () => {
    if (maxValue !== null) {
      quantity < maxValue ? setQuantity(quantity + 1) : setQuantity(maxValue);
      return;
    }
    setQuantity(quantity + 1);
  };

  const inputHandler = (event: ChangeEvent<HTMLInputElement>) => {
    let value = Number((event.target as HTMLInputElement).value);
    if (isNaN(value)) return;

    if (value < minValue) {
      value = minValue;
    }

    if (maxValue !== null && value > maxValue) {
      value = maxValue;
    }

    setQuantity(value);
  };

  const decreaseDisabled = useMemo(() => {
    return quantity <= minValue;
  }, [minValue, quantity]);

  const increaseDisabled = useMemo(() => {
    return maxValue ? quantity >= maxValue : false;
  }, [maxValue, quantity]);

  return (
    <div className={className}>
      {label && <div className="text-primary">{label}</div>}
      <div className="flex justify-between items-center w-full rounded border border-thin bg-transparent mt-1">
        <button
          className={clsx(
            'text-2xl px-4 py-1 rounded-l  hover:bg-primary/10 active:bg-primary/5 transition-all duration-200',
            decreaseDisabled ? 'text-primary/30' : 'text-primary/70',
          )}
          onClick={() => setDecrease()}
          disabled={decreaseDisabled}
        >
          <span>&#8722;</span>
        </button>
        <input
          value={quantity}
          onChange={inputHandler}
          min="1"
          className="text-primary text-center border-none bg-transparent w-full"
        />
        <button
          className={clsx(
            'text-2xl px-4 py-1 rounded-r  hover:bg-primary/10 active:bg-primary/5 transition-all duration-200',
            increaseDisabled ? 'text-primary/30' : 'text-primary/70',
          )}
          onClick={() => setIncrease()}
          disabled={increaseDisabled}
        >
          <span>&#43;</span>
        </button>
      </div>
    </div>
  );
}
