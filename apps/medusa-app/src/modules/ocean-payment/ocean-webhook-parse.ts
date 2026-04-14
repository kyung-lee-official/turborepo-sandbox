import { pickXmlTag } from "./ocean-payment-data";

/** Fields from Hosted Checkout `noticeUrl` XML (not Embedded / S2S / Link / POS). */
export type OceanHostedCheckoutNoticeFields = {
  account: string;
  terminal: string;
  signValue: string;
  order_number: string;
  order_currency: string;
  order_amount: string;
  order_notes: string;
  card_number: string;
  payment_id: string;
  payment_authType: string;
  payment_status: string;
  payment_details: string;
  payment_risk: string;
  methods?: string;
  response_type?: string;
};

export function parseHostedCheckoutNoticeXml(
  xml: string,
): OceanHostedCheckoutNoticeFields {
  return {
    account: pickXmlTag(xml, "account"),
    terminal: pickXmlTag(xml, "terminal"),
    signValue: pickXmlTag(xml, "signValue"),
    order_number: pickXmlTag(xml, "order_number"),
    order_currency: pickXmlTag(xml, "order_currency"),
    order_amount: pickXmlTag(xml, "order_amount"),
    order_notes: pickXmlTag(xml, "order_notes"),
    card_number: pickXmlTag(xml, "card_number"),
    payment_id: pickXmlTag(xml, "payment_id"),
    payment_authType: pickXmlTag(xml, "payment_authType"),
    payment_status: pickXmlTag(xml, "payment_status"),
    payment_details: pickXmlTag(xml, "payment_details"),
    payment_risk: pickXmlTag(xml, "payment_risk"),
    methods: pickXmlTag(xml, "methods"),
    response_type: pickXmlTag(xml, "response_type"),
  };
}
