/** Hosted Checkout `sendTrade` client only (`pay_url` flow). */
import { HttpError } from "@repo/types";
import { OceanPaymentConfig } from "./config";
import {
  type OceanPaymentSendTradeResponse,
  pickXmlTag,
} from "./ocean-payment-data";
import {
  buildHostedCheckoutSendTradeResponseSignValue,
  oceanSignValuesEqual,
} from "./sign";

export type OceanPaymentSendTradeRequest = Record<string, string>;

export class OceanPaymentClient {
  async sendTrade(
    body: OceanPaymentSendTradeRequest,
    secureCode: string,
  ): Promise<OceanPaymentSendTradeResponse> {
    const base = OceanPaymentConfig.getGatewayBaseUrl();
    const url = `${base}${OceanPaymentConfig.sendTradePath}`;

    const params = new URLSearchParams(body);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new HttpError(
        "PAYMENT.OCEANPAYMENT_SEND_TRADE_FAILED",
        `OceanPayment sendTrade HTTP ${response.status}`,
        { bodyPreview: text.slice(0, 500) },
      );
    }

    const parsed = parseSendTradeXml(text);
    if (!parsed.pay_url) {
      throw new HttpError(
        "PAYMENT.OCEANPAYMENT_INVALID_RESPONSE",
        "Hosted Checkout sendTrade response must include pay_url (this provider does not support Payment Link MOTO_url or non-hosted flows).",
        { bodyPreview: text.slice(0, 800) },
      );
    }

    const redirectMode = OceanPaymentConfig.getHostedRedirectMode();
    if (redirectMode === "merchant_control") {
      const expectedSign = buildHostedCheckoutSendTradeResponseSignValue({
        account: parsed.account,
        terminal: parsed.terminal,
        order_number: parsed.order_number,
        order_currency: parsed.order_currency,
        order_amount: parsed.order_amount,
        order_notes: parsed.order_notes,
        payment_id: parsed.payment_id,
        pay_url: parsed.pay_url,
        pay_results: parsed.pay_results,
        pay_details: parsed.pay_details,
        secureCode,
      });

      if (!oceanSignValuesEqual(expectedSign, parsed.signValue)) {
        throw new HttpError(
          "PAYMENT.OCEANPAYMENT_INVALID_RESPONSE_SIGNATURE",
          "OceanPayment sendTrade response signature verification failed",
        );
      }
    }

    if (parsed.pay_results !== "1") {
      throw new HttpError(
        "PAYMENT.OCEANPAYMENT_SEND_TRADE_FAILED",
        `OceanPayment sendTrade declined: ${parsed.pay_details || "unknown"}`,
        { pay_results: parsed.pay_results, pay_details: parsed.pay_details },
      );
    }

    return parsed;
  }
}

export function parseSendTradeXml(xml: string): OceanPaymentSendTradeResponse {
  return {
    account: pickXmlTag(xml, "account"),
    terminal: pickXmlTag(xml, "terminal"),
    signValue: pickXmlTag(xml, "signValue"),
    order_number: pickXmlTag(xml, "order_number"),
    order_currency: pickXmlTag(xml, "order_currency"),
    order_amount: pickXmlTag(xml, "order_amount"),
    order_notes: pickXmlTag(xml, "order_notes"),
    payment_id: pickXmlTag(xml, "payment_id"),
    pay_url: pickXmlTag(xml, "pay_url"),
    pay_results: pickXmlTag(xml, "pay_results"),
    pay_details: pickXmlTag(xml, "pay_details"),
  };
}
