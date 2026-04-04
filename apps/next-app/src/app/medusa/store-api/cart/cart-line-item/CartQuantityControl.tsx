"use client";

import { Button } from "@/app/medusa/components/Button";
import { TextInput } from "@/app/medusa/components/TextInput";

type CartQuantityControlProps = {
  lineItemId: string;
  displayQuantity: number;
  minQuantity?: number;
  onDecrement: () => void;
  onIncrement: () => void;
  onChange: (value: string) => void;
  onBlur: () => void;
  disableMinus: boolean;
  disablePlus: boolean;
  disableInput: boolean;
};

export const CartQuantityControl = ({
  lineItemId,
  displayQuantity,
  minQuantity = 1,
  onDecrement,
  onIncrement,
  onChange,
  onBlur,
  disableMinus,
  disablePlus,
  disableInput,
}: CartQuantityControlProps) => {
  return (
    <div className="flex items-center space-x-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        fullWidth={false}
        aria-label="Decrease quantity"
        disabled={disableMinus}
        onClick={onDecrement}
      >
        -
      </Button>
      <TextInput
        id={`cart-qty-${lineItemId}`}
        type="number"
        min={minQuantity}
        value={displayQuantity}
        disabled={disableInput}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="w-16 py-1 text-center text-sm"
        radius="full"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        fullWidth={false}
        aria-label="Increase quantity"
        disabled={disablePlus}
        onClick={onIncrement}
      >
        +
      </Button>
    </div>
  );
};
