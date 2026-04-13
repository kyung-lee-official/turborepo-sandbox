import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import OceanPaymentProviderService from "./service";

export default ModuleProvider(Modules.PAYMENT, {
  services: [OceanPaymentProviderService],
});
