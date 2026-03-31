import { AxiosHeaders } from "axios";
import api from "../../axios-error-handling-for-medusa/axios-client";

/**
 * Medusa's built-in JWT authentication endpoint
 */
export async function authenticateCustomer(email: string, password: string) {
  const data = await api.post(`/auth/customer/emailpass`, {
    email,
    password,
  });
  return data;
}

/**
 * Medusa's built-in session endpoint
 */
export async function getSession(jwt: string) {
  const headers = new AxiosHeaders();
  headers.set("Authorization", `Bearer ${jwt}`);
  const data = await api.post(`/auth/session`, {}, { headers });
  return data;
}

/**
 * Medusa's built-in session deletion endpoint
 */
export async function deleteSession(jwt: string) {
  const data = await api.del(`/auth/session`);
  return data;
}

/**
 * Sign in with the HttpOnly Cookie way to store JWT
 */
// export async function authenticateCustomer(email: string, password: string) {
//   const data = await api.post(`/auth/sign-in/customer/emailpass`, {
//     email,
//     password,
//   });
//   return data;
// }

/**
 * Sign out by deleting the HttpOnly Cookie
 */
// export async function signOutCustomer() {
//   const data = await api.del(`/auth/sign-out`);
//   return data;
// }
