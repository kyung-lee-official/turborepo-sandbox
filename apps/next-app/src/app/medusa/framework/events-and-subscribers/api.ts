import http from "../../axios-error-handling-for-medusa/axios-client";

export async function emitTestEvent() {
  return http.get<unknown>("framework/events-and-subscribers/emit-test-event");
}
