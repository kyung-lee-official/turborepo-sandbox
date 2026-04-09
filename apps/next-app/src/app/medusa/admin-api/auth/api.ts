import { AxiosHeaders } from "axios";
import api from "../../axios-error-handling-for-medusa/axios-client";

/**
 * Medusa's built-in JWT authentication endpoint (admin user actor)
 */
export async function authenticateUser(email: string, password: string) {
  const data = await api.post(`/auth/user/emailpass`, {
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
  const data = await api.post(`/auth/session`, {}, { headers: headers });
  return data;
}

/**
 * Medusa's built-in session deletion endpoint
 */
export async function deleteSession() {
  const data = await api.del(`/auth/session`);
  return data;
}
