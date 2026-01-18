import {
  initializeDefaultPaymentSession,
  initializePaymentSession,
} from "../../../payment/api";

// Payment provider types
export type PaymentProviderType = "system_default" | "external";

// Provider configuration
export interface PaymentProviderConfig {
  type: PaymentProviderType;
  buttonText: string;
  successMessage: string;
  showAuthorizeButton: boolean;
  handleRedirect?: (data: any) => void;
}

// Provider configurations
const PROVIDER_CONFIGS: Record<string, PaymentProviderConfig> = {
  pp_system_default: {
    type: "system_default",
    buttonText: "Initialize Payment Session",
    successMessage:
      "Payment session initialized successfully! You can now authorize it.",
    showAuthorizeButton: true,
  },
  "pp_paypal-payment_paypal-payment": {
    type: "external",
    buttonText: "Create Payment Session",
    successMessage:
      "Payment session created successfully! Redirecting to PayPal...",
    showAuthorizeButton: false,
    handleRedirect: (data: any) => {
      const paymentSession = data.payment_sessions?.[0] || data;
      const approvalUrl =
        paymentSession.data?.approval_url ||
        paymentSession.data?.links?.find(
          (link: any) => link.rel === "payer-action",
        )?.href;

      if (approvalUrl) {
        window.location.href = approvalUrl;
      } else {
        console.error(
          "PayPal approval URL not found in response:",
          paymentSession,
        );
      }
    },
  },
};

// Provider service functions
export function getProviderConfig(providerId: string): PaymentProviderConfig {
  const providerConfig = PROVIDER_CONFIGS[providerId];
  if (!providerConfig) {
    console.warn(
      `No configuration found for provider ID: ${providerId}. Using default configuration.`,
    );
    return {
      type: "system_default",
      buttonText: "Initialize Payment Session",
      successMessage:
        "Payment session initialized successfully! You can now authorize it.",
      showAuthorizeButton: true,
    };
  }
  return providerConfig;
}

export function isSystemDefault(providerId: string): boolean {
  return getProviderConfig(providerId).type === "system_default";
}

export async function initializeSession(
  paymentCollectionId: string,
  providerId: string,
): Promise<any> {
  const config = getProviderConfig(providerId);

  switch (config.type) {
    case "system_default":
      return await initializeDefaultPaymentSession(
        paymentCollectionId,
        providerId,
      );
    case "external":
      return await initializePaymentSession(paymentCollectionId, providerId);
    default:
      throw new Error(`No provider type found for provider ID: ${providerId}`);
  }
}

export function handlePostInitialization(data: any, providerId: string): void {
  console.log(providerId);
  const config = getProviderConfig(providerId);

  if (config.handleRedirect) {
    config.handleRedirect(data);
  }
}

export function shouldShowAuthorizeButton(providerId: string): boolean {
  return getProviderConfig(providerId).showAuthorizeButton;
}

export function getButtonText(providerId: string): string {
  return getProviderConfig(providerId).buttonText;
}

export function getSuccessMessage(providerId: string): string {
  return getProviderConfig(providerId).successMessage;
}
