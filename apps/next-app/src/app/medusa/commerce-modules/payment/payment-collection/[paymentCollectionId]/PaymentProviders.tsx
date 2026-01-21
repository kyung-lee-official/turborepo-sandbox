import { useQuery } from "@tanstack/react-query";
import type { Dispatch, SetStateAction } from "react";
import { Dropdown } from "@/app/styles/dropdown/universal-dropdown/dropdown/Dropdown";
import { getPaymentProvidersByRegionId, PaymentQK } from "../../api";

type PaymentProvidersProps = {
  cartRegionId: string;
  paymentProviderId: string | string[] | null;
  setPaymentProviderId: Dispatch<SetStateAction<string | string[] | null>>;
};

export const PaymentProviders = (props: PaymentProvidersProps) => {
  const { cartRegionId, paymentProviderId, setPaymentProviderId } = props;

  const paymentProvidersQuery = useQuery({
    queryKey: [PaymentQK.GET_PAYMENT_PROVIDERS_BY_REGION_ID, cartRegionId],
    queryFn: async () => {
      const res = await getPaymentProvidersByRegionId(cartRegionId);
      return res;
    },
  });

  if (paymentProvidersQuery.isLoading) {
    return <div>Loading Payment Providers...</div>;
  }

  if (paymentProvidersQuery.error) {
    return <div>Error loading payment providers</div>;
  }

  return (
    <div>
      {paymentProvidersQuery && (
        <Dropdown
          mode="regular"
          options={paymentProvidersQuery.data.map((p: any) => {
            return p.id;
          })}
          selected={paymentProviderId}
          setSelected={setPaymentProviderId}
          placeholder="Select Payment Provider"
          getLabel={(option) => {
            const lable = paymentProvidersQuery.data.find(
              (obj: any) => obj.id === option,
            )?.id as string;
            return <div className="text-white">{lable}</div>;
          }}
          optionWrapperClassName={(option, { selected, hovered }) => {
            return `px-2 py-1 
						${hovered ? "bg-neutral-700" : ""}}
						cursor-pointer truncate`;
          }}
          renderOption={(option, { selected, hovered }) => {
            const found = paymentProvidersQuery.data.find(
              (p: any) => p.id === option,
            );
            return (
              <div
                className={`flex items-center gap-2 px-2 ${
                  selected ? "text-blue-500" : ""
                } ${hovered ? "bg-neutral-700" : ""}rounded truncate`}
              >
                <span>{found.id}</span>
              </div>
            );
          }}
          controlClassName="flex items-center flex-wrap min-h-8 px-2 py-1 gap-2
					bg-neutral-800
					border-1 border-neutral-700 rounded-md cursor-pointer"
          placeholderClassName="text-neutral-400 truncate"
          menuClassName="absolute z-10 w-full mt-1
					text-white/60
					bg-neutral-800
					border border-neutral-700 rounded-md overflow-auto"
        />
      )}
    </div>
  );
};
