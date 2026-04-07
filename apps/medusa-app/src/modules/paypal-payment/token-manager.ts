import { HttpError, type PayPalTokenResponse } from "@repo/types";
import { PayPalConfig } from "./config";

class PayPalTokenManager {
  private static instance: PayPalTokenManager;
  private accessToken: string | null = null;
  private tokenIssuedAt: Date | null = null;
  private tokenExpiresIn: number = 0;

  private constructor() {}

  public static getInstance(): PayPalTokenManager {
    if (!PayPalTokenManager.instance) {
      PayPalTokenManager.instance = new PayPalTokenManager();
    }
    return PayPalTokenManager.instance;
  }

  private async refreshToken(): Promise<string> {
    const credentials = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`,
    ).toString("base64");

    const paypalBaseURL = PayPalConfig.getBaseURL();

    const response = await fetch(`${paypalBaseURL}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || `HTTP ${response.status}`);
    }

    const tokenData = (await response.json()) as PayPalTokenResponse;
    this.accessToken = tokenData.access_token;
    this.tokenIssuedAt = new Date();
    this.tokenExpiresIn = tokenData.expires_in;

    return this.accessToken;
  }

  private shouldRefreshToken(): boolean {
    if (!this.accessToken || !this.tokenIssuedAt) {
      return true;
    }

    const now = new Date();
    const elapsedSeconds = Math.floor(
      (now.getTime() - this.tokenIssuedAt.getTime()) / 1000,
    );
    const remainingSeconds = this.tokenExpiresIn - elapsedSeconds;

    // Refresh if remaining time is less than 1 hour (3600 seconds)
    return remainingSeconds < 3600;
  }

  public async getAccessToken(): Promise<string> {
    if (this.shouldRefreshToken()) {
      return await this.refreshToken();
    }

    if (!this.accessToken) {
      throw new HttpError(
        "PAYMENT.PAYPAL_FAILED_TO_GENERATE_ACCESS_TOKEN",
        "Failed to generate PayPal access token",
      );
    }
    return this.accessToken;
  }
}

export const paypalTokenManager = PayPalTokenManager.getInstance();
