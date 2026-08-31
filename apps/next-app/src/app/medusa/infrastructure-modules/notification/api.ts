import http from "../../axios-error-handling-for-medusa/axios-client";

export async function resendTestNotification() {
  return http.get<unknown>(
    "infrastructure-modules/test-send-email-notification",
  );
}
