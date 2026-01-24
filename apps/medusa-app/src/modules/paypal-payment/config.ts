/**
 * PayPal API utility functions for handling environment-specific configurations
 */

/**
 * Get the appropriate PayPal API base URL based on the current environment
 * @returns PayPal API base URL (production or sandbox)
 */
export function getPayPalBaseURL(): string {
  const isProduction = process.env.NODE_ENV === "production";

  return isProduction
    ? "https://api-m.paypal.com" // Production
    : "https://api-m.sandbox.paypal.com"; // Sandbox (default)
}

/**
 * Environment configuration for PayPal integration
 */
export const PayPalConfig = {
  /**
   * Get PayPal API base URL
   */
  getBaseURL: getPayPalBaseURL,

  /**
   * Check if running in production mode
   */
  isProduction: () => process.env.NODE_ENV === "production",

  /**
   * Get environment name for logging/debugging
   */
  getEnvironment: () =>
    PayPalConfig.isProduction() ? "production" : "sandbox",
} as const;
