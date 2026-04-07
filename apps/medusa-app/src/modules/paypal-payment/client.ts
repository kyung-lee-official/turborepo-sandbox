import type {
  CreateOrderRequest,
  IntentType,
  PayPalOrderResponse,
} from "@repo/types";
import { PayPalConfig } from "./config";
import { paypalTokenManager } from "./token-manager";

export class PayPalClient {
  private async request<T>(
    path: string,
    init: {
      method?: string;
      body?: unknown;
    } = {},
  ): Promise<T> {
    const accessToken = await paypalTokenManager.getAccessToken();
    const url = `${PayPalConfig.getBaseURL()}${path}`;
    const method = init.method ?? "GET";

    const requestInit: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    };

    if (init.body !== undefined) {
      requestInit.body = JSON.stringify(init.body);
    }

    const response = await fetch(url, requestInit);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || `HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Create a PayPal order
   */
  async createOrder(
    orderData: CreateOrderRequest,
  ): Promise<PayPalOrderResponse> {
    return this.request<PayPalOrderResponse>("/v2/checkout/orders", {
      method: "POST",
      body: orderData,
    });
  }

  /**
   * Capture a PayPal order
   */
  async captureOrder(authId: string): Promise<any> {
    return this.request(`/v2/payments/authorizations/${authId}/capture`, {
      method: "POST",
    });
  }

  /**
   * Get order details
   */
  async getOrder(orderId: string): Promise<any> {
    return this.request(`/v2/checkout/orders/${orderId}`);
  }

  /**
   * Authorize payment for an order
   */
  async authorizePayment(orderId: string, intent: IntentType): Promise<any> {
    switch (intent) {
      /* customer has approved the PayPal checkout order, now authorize/capture the payment from backend */
      case "AUTHORIZE": {
        return this.request(`/v2/checkout/orders/${orderId}/authorize`, {
          method: "POST",
        });
      }
      case "CAPTURE": {
        return this.request(`/v2/checkout/orders/${orderId}/capture`, {
          method: "POST",
        });
      }
      default:
        break;
    }
  }

  /**
   * Designed for canceling authorized but not yet captured payments.
   */
  async cancelPayment(authorizationId: string): Promise<any> {
    // const response = await this.request(
    //   `/v2/payments/authorizations/${authorizationId}/void`,
    //   { method: "POST" },
    // );
    // return response;
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>  cancelPayment ");
  }

  /**
   * Refund a captured payment
   */
  async refundPayment(captureId: string, amount?: string): Promise<any> {
    return this.request(`/v2/payments/captures/${captureId}/refund`, {
      method: "POST",
      body: amount ? { amount } : {},
    });
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string): Promise<string> {
    const data = await this.request<{ status: string }>(
      `/v2/checkout/orders/${paymentId}`,
    );
    return data.status;
  }
}
