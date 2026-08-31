import { type NextRequest, NextResponse } from "next/server";
import { post } from "@/lib/fetcher";

interface RecaptchaResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  score?: number;
  action?: string;
  "error-codes"?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, recaptchaToken } = await request.json();

    /* TEST: Force low score for specific test data */
    if (name === "Test Bot" || email === "bot@test.com") {
      return NextResponse.json(
        {
          message: "Security verification failed. Please try again.",
          /* Simulate low score */
          score: 0.1,
        },
        { status: 400 },
      );
    }

    /* Validate required fields */
    if (!name || !email || !recaptchaToken) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 },
      );
    }

    /* Verify reCAPTCHA token with Google */
    const recaptchaResult = await post<RecaptchaResponse>(
      "https://www.google.com/recaptcha/api/siteverify",
      new URLSearchParams({
        secret: process.env.RECAPTCHA_SECRET_KEY!,
        response: recaptchaToken,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    /* Check if reCAPTCHA verification failed */
    if (!recaptchaResult.success) {
      console.error(
        "reCAPTCHA verification failed:",
        recaptchaResult["error-codes"],
      );
      return NextResponse.json(
        {
          message: "reCAPTCHA verification failed",
          errors: recaptchaResult["error-codes"],
        },
        { status: 400 },
      );
    }

    /**
     * Check reCAPTCHA score (v3 specific)
     * Scores range from 0.0 (likely bot) to 1.0 (likely human)
     */
    /* Adjust threshold as needed */
    const minScore = 0.5;
    if (recaptchaResult.score && recaptchaResult.score < minScore) {
      console.warn(`Low reCAPTCHA score: ${recaptchaResult.score}`);
      return NextResponse.json(
        {
          message: "Security verification failed. Please try again.",
          score: recaptchaResult.score,
        },
        { status: 400 },
      );
    }

    /* Verify the action matches what you expect */
    if (recaptchaResult.action !== "submit_form") {
      console.warn(`Unexpected reCAPTCHA action: ${recaptchaResult.action}`);
      return NextResponse.json(
        { message: "Invalid request action" },
        { status: 400 },
      );
    }

    /**
     * Process your form submission
     * for example, save to database, send email, etc.
     */
    console.log("Valid form submission:", {
      name,
      email,
      score: recaptchaResult.score,
      timestamp: new Date().toISOString(),
    });

    /**
     * you could add your business logic here:
     * await saveToDatabase({ name, email });
     * await sendNotificationEmail({ name, email });
     */
    return NextResponse.json({
      message: "Form submitted successfully!",
      score: recaptchaResult.score,
      submittedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
