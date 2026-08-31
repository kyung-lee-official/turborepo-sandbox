import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { get } from "@/lib/fetcher";
import { getPayPalBaseURL } from "../../utils";

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/payment/paypal/v2/order/[orderId]">,
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

    /* Fetch order details from PayPal API */
    const paypalBaseURL = getPayPalBaseURL();
    const response = await get<unknown>(
      `${paypalBaseURL}/v2/checkout/orders/${params.orderId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching PayPal order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
