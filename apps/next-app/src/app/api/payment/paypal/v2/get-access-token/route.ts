import { type NextRequest, NextResponse } from "next/server";
import { post } from "@/lib/fetcher";
import { PayPalConfig } from "../utils";

export async function POST(req: NextRequest) {
  try {
    /* Create base64 encoded credentials for Basic Auth */
    const credentials = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`,
    ).toString("base64");

    /* Get environment-appropriate PayPal API base URL */
    const paypalBaseURL = PayPalConfig.getBaseURL();

    const paypalRes = await post<unknown>(
      `${paypalBaseURL}/v1/oauth2/token`,
      "grant_type=client_credentials",
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${credentials}`,
        },
      },
    );

    return NextResponse.json(paypalRes);
  } catch (error) {
    console.error("Error generating PayPal access token:", error);
    return NextResponse.json(
      { error: "Failed to generate access token" },
      { status: 500 },
    );
  }
}
