import type {
  CreateOrderRequest,
  IntentType,
  PayPalOrderResponse,
} from "@repo/types";
import axios, { type AxiosInstance } from "axios";
import { PayPalConfig } from "./config";
import { paypalTokenManager } from "./token-manager";

export class PayPalClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: PayPalConfig.getBaseURL(),
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add request interceptor to automatically include auth token
    this.axiosInstance.interceptors.request.use(async (config) => {
      const accessToken = await paypalTokenManager.getAccessToken();
      config.headers.Authorization = `Bearer ${accessToken}`;
      return config;
    });
  }

  /**
   * Create a PayPal order
   */
  async createOrder(
    orderData: CreateOrderRequest,
  ): Promise<PayPalOrderResponse> {
    const response = await this.axiosInstance.post<PayPalOrderResponse>(
      "/v2/checkout/orders",
      orderData,
    );
    return response.data;
  }

  /**
   * Capture a PayPal order
   */
  async captureOrder(authId: string): Promise<any> {
    const response = await this.axiosInstance.post(
      `/v2/payments/authorizations/${authId}/capture`,
    );
    return response.data;
  }

  /**
   * Get order details
   */
  async getOrder(orderId: string): Promise<any> {
    const response = await this.axiosInstance.get(
      `/v2/checkout/orders/${orderId}`,
    );
    return response.data;
  }

  /**
   * Authorize payment for an order
   */
  async authorizePayment(orderId: string, intent: IntentType): Promise<any> {
    switch (intent) {
      /* customer has approved the PayPal checkout order, now authorize/capture the payment from backend */
      case "AUTHORIZE": {
        const response = await this.axiosInstance.post(
          `/v2/checkout/orders/${orderId}/authorize`,
        );
        return response.data;
      }
      case "CAPTURE": {
        const response = await this.axiosInstance.post(
          `/v2/checkout/orders/${orderId}/capture`,
        );
        return response.data;
      }
      default:
        break;
    }
  }

  /**
   * Cancel/void an authorized payment
   */
  async cancelPayment(authorizationId: string): Promise<any> {
    // const response = await this.axiosInstance.post(
    //   `/v2/payments/authorizations/${authorizationId}/void`,
    // );
    // return response.data;
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>  cancelPayment ");
  }

  /**
   * Refund a captured payment
   */
  async refundPayment(captureId: string, amount?: string): Promise<any> {
    const response = await this.axiosInstance.post(
      `/v2/payments/captures/${captureId}/refund`,
      amount ? { amount } : {},
    );
    return response.data;
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string): Promise<string> {
    const response = await this.axiosInstance.get(
      `/v2/checkout/orders/${paymentId}`,
    );
    return response.data.status;
  }
}
