import Link from "next/link";
import { Cart } from "./commerce-modules/cart/cart-modal/Cart";
import { Customer } from "./commerce-modules/customer/Customer";
import { Region } from "./commerce-modules/region/Region";
import { SalesChannel } from "./commerce-modules/sales-channel/SalesChannel";

type HeaderProps = {
  regionId: string | undefined;
  salesChannelId: string | undefined;
  customerId: string | undefined;
};

const Header = (props: HeaderProps) => {
  const { regionId, salesChannelId, customerId } = props;

  return (
    <div className="flex h-14 items-center justify-between border-neutral-700 border-b border-dashed px-4">
      <div className="flex w-3/5 items-center gap-2">
        <Link
          href="/medusa"
          className="text-nowrap underline decoration-dotted"
        >
          Medusa Home
        </Link>
        <Region regionId={regionId} />
        <SalesChannel salesChannelId={salesChannelId} />
        <Customer customerId={customerId} />
      </div>
      <Cart
        regionId={regionId}
        salesChannelId={salesChannelId}
        customerId={customerId}
      />
    </div>
  );
};

export default Header;
