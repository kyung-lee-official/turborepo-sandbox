import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { FetcherError, get, post } from "@/lib/fetcher";
import { getPayPalBaseURL } from "../../utils";

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/payment/paypal/v2/capture-order/[orderId]">,
) {
  try {
    const params = await ctx.params;
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("paypalAccessToken")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "PayPal access token not found" },
        { status: 401 },
      );
    }

    /* Get environment-appropriate PayPal API base URL */
    const paypalBaseURL = getPayPalBaseURL();

    /* First, get the order details to check its status and intent */
    const order = await get<{ intent: string; status: string }>(
      `${paypalBaseURL}/v2/checkout/orders/${params.orderId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    /* For AUTHORIZE intent orders, we need to authorize first, then capture */
    if (order.intent === "AUTHORIZE" && order.status === "APPROVED") {
      /* Step 1: Authorize the payment */
      const authData = await post<{
        purchase_units?: Array<{
          payments?: { authorizations?: Array<{ id: string }> };
        }>;
      }>(
        `${paypalBaseURL}/v2/checkout/orders/${params.orderId}/authorize`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      /* Step 2: Capture from the authorization */
      const authId =
        authData.purchase_units?.[0]?.payments?.authorizations?.[0]?.id;
      if (authId) {
        const captureResponse = await post<unknown>(
          `${paypalBaseURL}/v2/payments/authorizations/${authId}/capture`,
          {},
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );
        return NextResponse.json(captureResponse);
      }
      return NextResponse.json(
        {
          error: "Authorization failed - no authorization ID found",
        },
        { status: 400 },
      );
    }
    if (order.intent === "CAPTURE") {
      /* For CAPTURE intent orders, direct capture */
      const response = await post<unknown>(
        `${paypalBaseURL}/v2/checkout/orders/${params.orderId}/capture`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      return NextResponse.json(response);
    }
    return NextResponse.json(
      {
        error: "Order cannot be captured",
        details: `Order status: ${order.status}, intent: ${order.intent}`,
      },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error capturing PayPal order:", error);

    /* Handle FetcherError (our wrapper) by surfacing PayPal's response body */
    if (error instanceof FetcherError) {
      return NextResponse.json(
        {
          error: "Failed to capture order from PayPal",
          details: error.data,
        },
        { status: error.status || 500 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
