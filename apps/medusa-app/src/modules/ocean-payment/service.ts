/**
 * Medusa payment provider for OceanPayment **Hosted Checkout** only
 * (`sendTrade`, redirect to `pay_url`, `backUrl`, optional `noticeUrl`).
 * Does not implement Embedded, Server-to-Server, Payment Link, or POS.
 * @see https://dev.oceanpayment.com/en/docs/payment/introduction
 */
import { createHash } from "node:crypto";
import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  CreateAccountHolderInput,
  DeleteAccountHolderInput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  Logger,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrieveAccountHolderInput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  SavePaymentMethodInput,
  StoreCartAddress,
  UpdateAccountHolderInput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types";
import { AbstractPaymentProvider, BigNumber } from "@medusajs/framework/utils";
import { HttpError } from "@repo/types";
import { OceanPaymentClient } from "./client";
import {
  buildBillingFromCart,
  buildOceanProductFieldsFromCartLines,
  type OceanPaymentBackUrlPayload,
  type OceanPaymentCartLineInput,
  type OceanPaymentInitiateSessionData,
} from "./ocean-payment-data";
import { buildHostedCheckoutRequestSignValue } from "./sign";

type Options = {
  account: string;
  terminal: string;
  secureCode: string;
};

type InjectedDependencies = {
  logger: Logger;
};

function formatOrderAmount(amount: InitiatePaymentInput["amount"]): string {
  const bn = new BigNumber(amount);
  const n = bn.numeric;
  if (n !== undefined && Number.isFinite(n)) {
    return n.toFixed(2);
  }
  return bn.toString();
}

function toOceanOrderNumber(paymentCollectionId: string): string {
  if (paymentCollectionId.length <= 50) {
    return paymentCollectionId;
  }
  return createHash("sha256")
    .update(paymentCollectionId, "utf8")
    .digest("hex")
    .slice(0, 50);
}

class OceanPaymentProviderService extends AbstractPaymentProvider<Options> {
  static identifier = "oceanpayment";

  protected logger_: Logger;
  protected options_: Options;
  protected client_: OceanPaymentClient;

  constructor(container: InjectedDependencies, options: Options) {
    super(container, options);
    this.logger_ = container.logger;
    this.options_ = options;
    this.client_ = new OceanPaymentClient();
  }

  static validateOptions(options: Options) {
    if (!options.account || !options.terminal || !options.secureCode) {
      throw new HttpError(
        "PAYMENT.OCEANPAYMENT_MISSING_OPTIONS",
        "OceanPayment requires account, terminal, and secureCode in provider options.",
      );
    }
  }

  async initiatePayment(
    input: InitiatePaymentInput & {
      data?: OceanPaymentInitiateSessionData;
      context: {
        payment_collection_id: string;
        shipping_address: StoreCartAddress;
        custom_id: string;
        customer_email?: string;
        billing_ip?: string;
        ocean_cart_lines?: OceanPaymentCartLineInput[];
      };
    },
  ): Promise<InitiatePaymentOutput> {
    const backUrl = process.env.OCEANPAYMENT_BACK_URL;
    if (!backUrl) {
      throw new HttpError(
        "PAYMENT.OCEANPAYMENT_MISCONFIGURED",
        "OCEANPAYMENT_BACK_URL must be set (synchronous return / browser POST target).",
      );
    }

    const noticeUrl = process.env.OCEANPAYMENT_NOTICE_URL ?? "";
    const { amount, currency_code, data = {}, context } = input;
    const billing = buildBillingFromCart(
      context.shipping_address,
      data,
      context.customer_email,
    );

    if (!billing.billing_email) {
      throw new HttpError(
        "PAYMENT.OCEANPAYMENT_MISCONFIGURED",
        "billing_email is required for OceanPayment. Pass it in the payment session `data` or ensure the cart shipping address includes an email.",
      );
    }

    const order_number = toOceanOrderNumber(context.payment_collection_id);
    const order_amount = formatOrderAmount(amount);
    const methods = data.methods ?? "Credit Card";
    const order_notes = data.order_notes ?? "";

    const signValue = buildHostedCheckoutRequestSignValue({
      account: this.options_.account,
      terminal: this.options_.terminal,
      backUrl,
      order_number,
      order_currency: currency_code,
      order_amount,
      billing_firstName: billing.billing_firstName,
      billing_lastName: billing.billing_lastName,
      billing_email: billing.billing_email,
      secureCode: this.options_.secureCode,
    });

    const fromCart = buildOceanProductFieldsFromCartLines(
      context.ocean_cart_lines,
      {
        productName: data.productName ?? "Order",
        productNum: data.productNum ?? "1",
        productSku: data.productSku ?? context.custom_id ?? "MEDUSA-CART",
        productPrice: order_amount,
      },
      order_amount,
    );
    const productName = data.productName ?? fromCart.productName;
    const productNum = data.productNum ?? fromCart.productNum;
    const productSku = data.productSku ?? fromCart.productSku;
    const productPrice = data.productPrice ?? fromCart.productPrice;

    const billing_ip =
      data.billing_ip?.trim() ||
      context.billing_ip?.trim() ||
      process.env.OCEANPAYMENT_FALLBACK_BILLING_IP?.trim() ||
      "127.0.0.1";

    const formBody: Record<string, string> = {
      account: this.options_.account,
      terminal: this.options_.terminal,
      signValue,
      backUrl,
      order_number,
      order_currency: currency_code,
      order_amount,
      methods,
      order_notes,
      billing_firstName: billing.billing_firstName,
      billing_lastName: billing.billing_lastName,
      billing_email: billing.billing_email,
      billing_phone: billing.billing_phone,
      billing_country: billing.billing_country,
      billing_state: billing.billing_state,
      billing_city: billing.billing_city,
      billing_address: billing.billing_address,
      billing_zip: billing.billing_zip,
      billing_ip,
      productNum,
      productName,
      productSku,
      productPrice,
    };

    if (noticeUrl) {
      formBody.noticeUrl = noticeUrl;
    }

    try {
      const trade = await this.client_.sendTrade(
        formBody,
        this.options_.secureCode,
      );

      const gateway_order_number = trade.order_number;

      return {
        id: trade.payment_id || order_number,
        data: {
          ...trade,
          approval_url: trade.pay_url,
          order_number,
          gateway_order_number,
          medusa_cart_id: context.custom_id,
        },
      };
    } catch (error: unknown) {
      if (error instanceof HttpError) {
        throw error;
      }
      this.logger_.error("OceanPayment sendTrade failed:", error as Error);
      throw new HttpError(
        "PAYMENT.OCEANPAYMENT_SEND_TRADE_FAILED",
        "Failed to start OceanPayment hosted checkout",
      );
    }
  }

  /**
   * After your `backUrl` handler verifies the synchronous POST signature, forward
   * the payload (at least `payment_id` + `payment_status`) into Medusa authorize.
   * Hosted credit-card sale: `payment_status === "1"` => captured.
   */
  async authorizePayment(
    input: AuthorizePaymentInput,
  ): Promise<AuthorizePaymentOutput> {
    const payload = input.data as OceanPaymentBackUrlPayload | undefined;
    if (!payload?.payment_id || payload.payment_status === undefined) {
      throw new HttpError(
        "PAYMENT.OCEANPAYMENT_AUTHORIZATION_FAILED",
        "Expected OceanPayment backUrl payload with payment_id and payment_status (verify backUrl signature before calling authorize).",
      );
    }

    if (payload.payment_status !== "1") {
      throw new HttpError(
        "PAYMENT.OCEANPAYMENT_AUTHORIZATION_FAILED",
        `OceanPayment payment not successful (payment_status=${payload.payment_status}).`,
      );
    }

    return {
      status: "captured",
      data: {
        ...(input.data as object),
        oceanpayment: {
          authorized_via: "backUrl",
          payment_id: payload.payment_id,
        },
      },
    };
  }

  async capturePayment(
    _input: CapturePaymentInput,
  ): Promise<CapturePaymentOutput> {
    return { data: _input.data };
  }

  async refundPayment(
    _input: RefundPaymentInput,
  ): Promise<RefundPaymentOutput> {
    throw new HttpError(
      "PAYMENT.OCEANPAYMENT_NOT_IMPLEMENTED",
      "Hosted Checkout refunds are not implemented in this provider; use Ocean’s merchant tools or order-management APIs for your account.",
    );
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return { data: input.data };
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data };
  }

  async retrievePayment(
    input: RetrievePaymentInput,
  ): Promise<RetrievePaymentOutput> {
    return { data: input.data ?? {} };
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return { data: input.data };
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput,
  ): Promise<GetPaymentStatusOutput> {
    const status = (input.data as OceanPaymentBackUrlPayload | undefined)
      ?.payment_status;
    if (status === "1") {
      return { status: "captured" };
    }
    if (status === "0") {
      return { status: "canceled" };
    }
    return { status: "pending" };
  }

  async getWebhookActionAndData(
    _payload: ProviderWebhookPayload["payload"],
  ): Promise<WebhookActionResult> {
    return {
      action: "not_supported",
      data: {
        session_id: "",
        amount: new BigNumber(0),
      },
    };
  }

  async createAccountHolder(_input: CreateAccountHolderInput) {
    return {};
  }

  async deleteAccountHolder(_input: DeleteAccountHolderInput) {
    return {};
  }

  async retrieveAccountHolder(_input: RetrieveAccountHolderInput) {
    return {};
  }

  async savePaymentMethod(_input: SavePaymentMethodInput) {
    return {};
  }

  async updateAccountHolder(_input: UpdateAccountHolderInput) {
    return {};
  }
}

export default OceanPaymentProviderService;
