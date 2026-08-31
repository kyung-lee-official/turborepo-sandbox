import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { post } from "@/lib/fetcher";
import { getPayPalBaseURL } from "../utils";
import { createOrderSchema } from "./schemas";

export async function POST(req: NextRequest) {
  try {
    /* Get access token from cookies */
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("paypalAccessToken")?.value;

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "PayPal access token not found. Please generate an access token first.",
        },
        { status: 401 },
      );
    }

    /* Get order data from request body */
    const rawOrderData = await req.json();

    /* Validate order data with Zod */
    const validationResult = createOrderSchema.safeParse(rawOrderData);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid order data",
          details: validationResult.error.format(),
        },
        { status: 400 },
      );
    }

    const orderData = validationResult.data;

    /* Call PayPal API to create order */
    const paypalBaseURL = getPayPalBaseURL();
    try {
      const paypalRes = await post<unknown>(
        `${paypalBaseURL}/v2/checkout/orders/`,
        orderData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      return NextResponse.json(paypalRes);
    } catch (err) {
      // Pass PayPal API error body / status back to the caller
      const status =
        err instanceof Error && "status" in err
          ? (err as { status?: number }).status
          : undefined;
      if (status !== undefined) {
        return NextResponse.json(
          {
            error: "PayPal API error",
            details: (err as { data?: unknown }).data,
            status,
          },
          { status },
        );
      }
      throw err;
    }
  } catch (error) {
    console.error("Error creating PayPal order:", error);
    return NextResponse.json(
      { error: "Failed to create PayPal order" },
      { status: 500 },
    );
  }
}
