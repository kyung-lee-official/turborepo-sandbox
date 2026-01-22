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
  ListPaymentMethodsInput,
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
import { AbstractPaymentProvider } from "@medusajs/framework/utils";
import {
  type CreateOrderRequest,
  HttpError,
  type IntentType,
  type PayPalAuthorizePaymentResponse,
} from "@repo/types";
import { PayPalClient } from "./client";

type Options = {
  clientId: string;
  clientSecret: string;
};

type InjectedDependencies = {
  logger: Logger;
};

class PayPalPaymentProviderService extends AbstractPaymentProvider<Options> {
  static identifier = "paypal";

  protected logger_: Logger;
  protected options_: Options;
  protected client: PayPalClient;

  constructor(container: InjectedDependencies, options: Options) {
    super(container, options);

    this.logger_ = container.logger;
    this.options_ = options;
    this.client = new PayPalClient();
  }

  static validateOptions(options: Options) {
    if (!options.clientSecret) {
      throw new HttpError(
        "PAYMENT.PAYPAL_MISSING_CLIENT_SECRET",
        "API key is required in the provider's options.",
      );
    }
  }

  async initiatePayment(
    input: InitiatePaymentInput & {
      data: {
        intent: IntentType;
      };
      context: {
        payment_collection_id: string;
        shipping_address: StoreCartAddress;
      };
    },
  ): Promise<InitiatePaymentOutput> {
    if (!process.env.PAYPAL_RETURN_URL || !process.env.PAYPAL_CANCEL_URL) {
      throw new HttpError(
        "SYSTEM.MISCONFIGURED",
        "PayPal return and cancel URLs must be set in environment variables.",
      );
    }

    const { amount, currency_code, data, context } = input;

    if (!data.intent) {
      throw new HttpError(
        "PAYMENT.PAYPAL_MISSING_CONTEXT",
        "Payment intent is required in data",
      );
    }

    const orderPayload: CreateOrderRequest = {
      intent: data.intent,
      purchase_units: [
        {
          reference_id: context.payment_collection_id,
          amount: {
            currency_code: currency_code,
            value: amount as string,
          },
        },
      ],
      payment_source: {
        paypal: {
          address: {
            address_line_1: context.shipping_address.address_1 || "",
            address_line_2: context.shipping_address.address_2 || "",
            admin_area_1: context.shipping_address.city || "",
            admin_area_2: context.shipping_address.province || "",
            postal_code: context.shipping_address.postal_code || "",
            country_code: context.shipping_address.country_code || "",
          },
          email_address: "",
          payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
          experience_context: {
            return_url: process.env.PAYPAL_RETURN_URL,
            cancel_url: process.env.PAYPAL_CANCEL_URL,
          },
        },
      },
    };

    try {
      const response = await this.client.createOrder(orderPayload);

      // Extract the approval link from PayPal response
      const approvalLink = response.links?.find(
        (link) => link.rel === "payer-action" || link.rel === "approve",
      )?.href;

      if (!approvalLink) {
        throw new HttpError(
          "PAYMENT.PAYPAL_MISSING_APPROVAL_LINK",
          "PayPal approval link not found in response",
        );
      }

      return {
        id: response.id,
        // things in `data` automatically get stored in the payment session
        data: {
          ...response,
          approval_url: approvalLink,
        },
      };
    } catch (error) {
      this.logger_.error("PayPal create order failed:", error);
      throw new HttpError(
        "PAYMENT.PAYPAL_FAILED_TO_CREATE_ORDER",
        "Failed to create PayPal order",
      );
    }
  }

  async authorizePayment(
    input: AuthorizePaymentInput,
  ): Promise<AuthorizePaymentOutput> {
    try {
      const { data, context } = input;
      if (!data) {
        throw new HttpError(
          "PAYMENT.PAYPAL_MISSING_CONTEXT",
          "Missing payment data, cannot authorize PayPal payment",
        );
      }
      if (!context || !context.idempotency_key) {
        throw new HttpError(
          "PAYMENT.PAYPAL_MISSING_CONTEXT",
          "Missing payment context or idempotency key (payment session id), cannot authorize PayPal payment",
        );
      }
      const { id: paypalOrderId } = data;
      const { idempotency_key: paymentSessionId } = context;
      const authorizedPayment = (await this.client.authorizePayment(
        paypalOrderId as string,
      )) as PayPalAuthorizePaymentResponse;

      return {
        status: "authorized",
        data: authorizedPayment,
      };
    } catch (error) {
      this.logger_.error("PayPal authorize payment failed:", error);
      throw new HttpError(
        "PAYMENT.PAYPAL_AUTHORIZATION_FAILED",
        "Failed to authorize PayPal payment",
      );
    }
  }

  async capturePayment(
    input: CapturePaymentInput,
  ): Promise<CapturePaymentOutput> {
    const data = input.data as PayPalAuthorizePaymentResponse;
    const context = input.context as {
      idempotency_key: string;
    };
    if (
      !data.purchase_units?.[0]?.payments?.authorizations?.[0]?.id ||
      !context
    ) {
      throw new HttpError(
        "PAYMENT.PAYPAL_MISSING_CONTEXT",
        "Missing payment data or context, cannot capture PayPal payment",
      );
    }

    try {
      const captureOrderData = await this.client.captureOrder(
        data.purchase_units[0].payments.authorizations[0].id as string,
      );
      return {
        data: {
          ...data,
          context: {
            ...context,
            captureOrderData: captureOrderData,
          },
        },
      };
    } catch (error) {
      this.logger_.error("PayPal capture payment failed:", error);
      throw new HttpError(
        "PAYMENT.PAYPAL_ORDER_CANNOT_BE_CAPTURED",
        "Failed to capture PayPal payment",
      );
    }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const externalId = input.data?.id;

    try {
      const refundAmount = input.amount ? input.amount.toString() : undefined;

      const newData = await this.client.refundPayment(
        externalId as string,
        refundAmount,
      );

      return {
        data: input.data,
      };
    } catch (error) {
      this.logger_.error("PayPal refund payment failed:", error);
      throw new HttpError(
        "PAYMENT.PAYPAL_REFUND_FAILED",
        "Failed to refund PayPal payment",
      );
    }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const { amount, currency_code, context } = input;
    const externalId = input.data?.id;

    // Validate context.customer
    if (!context || !context.customer) {
      throw new HttpError(
        "PAYMENT.PAYPAL_MISSING_CUSTOMER",
        "Context must include a valid customer.",
      );
    }

    // assuming you have a client that updates the payment
    // const response = await this.client.update(externalId, {
    //   amount,
    //   currency_code,
    //   customer: context.customer,
    // });

    // return response;
    return {
      data: input.data,
    };
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    const externalId = input.data?.id;

    try {
      await this.client.cancelPayment(externalId as string);
      return {
        data: input.data,
      };
    } catch (error) {
      this.logger_.error("PayPal delete payment failed:", error);
      throw new HttpError(
        "PAYMENT.PAYPAL_DELETE_FAILED",
        "Failed to delete PayPal payment",
      );
    }
  }

  /**
   * This method is used internally in this service to retrieve raw order data from PayPal,
   * it doesn't automatically called by any other method
   * @returns raw order data from PayPal
   */
  async retrievePayment(
    input: RetrievePaymentInput,
  ): Promise<RetrievePaymentOutput> {
    if (!input.data?.id) {
      throw new HttpError(
        "PAYMENT.PAYPAL_ORDER_ID_NOT_FOUND",
        "PayPal order ID is required in input.data",
      );
    }
    const { id: paypalOrderId } = input.data;

    try {
      return await this.client.getOrder(paypalOrderId as string);
    } catch (error) {
      this.logger_.error("PayPal retrieve payment failed:", error);
      throw new HttpError(
        "PAYMENT.PAYPAL_RETRIEVE_FAILED",
        "Failed to retrieve PayPal payment",
      );
    }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const externalId = input.data?.id;

    try {
      const paymentData = await this.client.cancelPayment(externalId as string);
      return { data: paymentData };
    } catch (error) {
      this.logger_.error("PayPal cancel payment failed:", error);
      throw new HttpError(
        "PAYMENT.PAYPAL_CANCEL_FAILED",
        "Failed to cancel PayPal payment",
      );
    }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput,
  ): Promise<GetPaymentStatusOutput> {
    const externalId = input.data?.id;

    try {
      const status = await this.client.getPaymentStatus(externalId as string);

      switch (status) {
        case "requires_capture":
        case "AUTHORIZED":
          return { status: "authorized" };
        case "success":
        case "CAPTURED":
        case "COMPLETED":
          return { status: "captured" };
        case "canceled":
        case "CANCELLED":
        case "VOIDED":
          return { status: "canceled" };
        default:
          return { status: "pending" };
      }
    } catch (error) {
      this.logger_.error("PayPal get payment status failed:", error);
      throw new HttpError(
        "PAYMENT.PAYPAL_STATUS_CHECK_FAILED",
        "Failed to check PayPal payment status",
      );
    }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"],
  ): Promise<WebhookActionResult> {
    const { data, rawData, headers } = payload;

    try {
      switch (data.event_type) {
        case "authorized_amount":
          return {
            action: "authorized",
            data: {
              // assuming the session_id is stored in the metadata of the payment
              // in the third-party provider
              session_id: (data.metadata as Record<string, any>).session_id,
              amount: new BigNumber(data.amount as number),
            },
          };
        case "success":
          return {
            action: "captured",
            data: {
              // assuming the session_id is stored in the metadata of the payment
              // in the third-party provider
              session_id: (data.metadata as Record<string, any>).session_id,
              amount: new BigNumber(data.amount as number),
            },
          };
        default:
          return {
            action: "not_supported",
            data: {
              session_id: "",
              amount: new BigNumber(0),
            },
          };
      }
    } catch (e) {
      return {
        action: "failed",
        data: {
          // assuming the session_id is stored in the metadata of the payment
          // in the third-party provider
          session_id: (data.metadata as Record<string, any>).session_id,
          amount: new BigNumber(data.amount as number),
        },
      };
    }
  }

  async createAccountHolder({ context, data }: CreateAccountHolderInput) {
    const { account_holder, customer } = context;

    if (account_holder?.data?.id) {
      return { id: account_holder.data.id as string };
    }

    if (!customer) {
      throw new HttpError(
        "CUSTOMER.MISSING_CUSTOMER_DATA",
        "Missing customer data.",
      );
    }

    // assuming you have a client that creates the account holder
    // const providerAccountHolder = await this.client.createAccountHolder({
    //   email: customer.email,
    //   ...data,
    // });

    // return {
    //   id: providerAccountHolder.id,
    //   data: providerAccountHolder as unknown as Record<string, unknown>,
    // };
    return {};
  }

  async deleteAccountHolder({ context }: DeleteAccountHolderInput) {
    const { account_holder } = context;
    const accountHolderId = account_holder?.data?.id as string | undefined;
    if (!accountHolderId) {
      throw new HttpError(
        "PAYMENT.PAYPAL_MISSING_ACCOUNT_HOLDER",
        "Missing account holder ID.",
      );
    }

    // assuming you have a client that deletes the account holder
    // await this.client.deleteAccountHolder({
    //   id: accountHolderId,
    // });

    return {};
  }

  async retrieveAccountHolder({ id }: RetrieveAccountHolderInput) {
    // assuming you have a client that retrieves the account holder
    // const providerAccountHolder = await this.client.retrieveAccountHolder({
    //   id,
    // });

    // return {
    //   id: providerAccountHolder.id,
    //   data: providerAccountHolder as unknown as Record<string, unknown>,
    // };
    return {};
  }

  async savePaymentMethod({ context, data }: SavePaymentMethodInput) {
    const accountHolderId = context?.account_holder?.data?.id as
      | string
      | undefined;

    if (!accountHolderId) {
      throw new HttpError(
        "PAYMENT.PAYPAL_MISSING_ACCOUNT_HOLDER",
        "Missing account holder ID.",
      );
    }

    // assuming you have a client that saves the payment method
    // const paymentMethod = await this.client.savePaymentMethod({
    //   customer_id: accountHolderId,
    //   ...data,
    // });

    // return {
    //   id: paymentMethod.id,
    //   data: paymentMethod as unknown as Record<string, unknown>,
    // };
    return {};
  }

  async updateAccountHolder({ context, data }: UpdateAccountHolderInput) {
    const { account_holder, customer } = context;

    if (!account_holder?.data?.id) {
      throw new HttpError(
        "PAYMENT.PAYPAL_MISSING_ACCOUNT_HOLDER",
        "Missing account holder ID.",
      );
    }

    // assuming you have a client that updates the account holder
    // const providerAccountHolder = await this.client.updateAccountHolder({
    //   id: account_holder.data.id,
    //   ...data,
    // });

    // return {
    //   id: providerAccountHolder.id,
    //   data: providerAccountHolder as unknown as Record<string, unknown>,
    // };
    return {};
  }
}

export default PayPalPaymentProviderService;
