import axios from "axios";
import { getPayPalBaseURL } from "@/modules/paypal-payment/config";
import { paypalTokenManager } from "@/modules/paypal-payment/token-manager";

export async function verifyWebhookSignature(
  headers: Record<string, string>,
  body: unknown,
): Promise<boolean> {
  const accessToken = await paypalTokenManager.getAccessToken();
  const res = await axios.post(
    `${getPayPalBaseURL()}/v1/notifications/verify-webhook-signature`,
    {
      auth_algo: headers["paypal-auth-algo"],
      cert_url: headers["paypal-cert-url"],
      transmission_id: headers["paypal-transmission-id"],
      transmission_sig: headers["paypal-transmission-sig"],
      transmission_time: headers["paypal-transmission-time"],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: body,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  return res.data.verification_status === "SUCCESS";
}
