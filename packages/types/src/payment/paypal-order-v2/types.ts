import type z from "zod";
import type { intentEnum, payPalWebhookEventSchema } from "../..";

export enum PayPalOrderQK {
  GET_ORDER_BY_ID = "get_order_by_id",
}

export interface PayPalTokenResponse {
  scope: string;
  access_token: string;
  token_type: string;
  app_id: string;
  expires_in: number;
  nonce: string;
}

export interface PayPalAddress {
  address_line_1: string;
  address_line_2?: string;
  admin_area_1: string;
  admin_area_2: string;
  postal_code: string;
  country_code: string;
}

interface PayPalAmount {
  currency_code: string;
  value: string;
}

interface PayPalPurchaseUnit {
  reference_id: string;
  amount: PayPalAmount;
}

interface PayPalExperienceContext {
  return_url: string;
  cancel_url: string;
}

interface PayPalPaymentSource {
  paypal: {
    address: PayPalAddress;
    email_address: string;
    payment_method_preference: string;
    experience_context: PayPalExperienceContext;
  };
}

export type IntentType = z.infer<typeof intentEnum>;

export interface CreateOrderRequest {
  intent: IntentType;
  purchase_units: PayPalPurchaseUnit[];
  payment_source: PayPalPaymentSource;
}

export interface PayPalOrderResponse {
  id: string;
  status: string;
  payment_source: {
    paypal: {
      email_address: string;
      account_id: string;
      account_status: string;
      name: {
        given_name: string;
        surname: string;
      };
      phone_type: string;
      address: PayPalAddress;
    };
  };
  purchase_units: Array<{
    reference_id: string;
    amount: {
      currency_code: string;
      value: string;
    };
    payee: {
      email_address: string;
      merchant_id: string;
    };
    shipping: {
      name: {
        full_name: string;
      };
      address: PayPalAddress;
    };
  }>;
  intent: string;
  create_time: string;
  update_time: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

export interface PayPalCaptureResponse {
  id: string;
  status: string;
  purchase_units: Array<{
    reference_id: string;
    payments: {
      captures: Array<{
        id: string;
        status: string;
        amount: {
          currency_code: string;
          value: string;
        };
        final_capture: boolean;
        create_time: string;
        update_time: string;
      }>;
    };
  }>;
}

export type PayPalWebhookEvent = z.infer<typeof payPalWebhookEventSchema>;
