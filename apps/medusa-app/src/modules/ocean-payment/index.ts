/** OceanPayment **Hosted Checkout** payment module. @see https://dev.oceanpayment.com/en/docs/payment/introduction */
import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import OceanPaymentProviderService from "./service";

export default ModuleProvider(Modules.PAYMENT, {
  services: [OceanPaymentProviderService],
});
