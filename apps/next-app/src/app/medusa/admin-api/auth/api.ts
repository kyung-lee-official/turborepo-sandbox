import api from "../../axios-error-handling-for-medusa/axios-client";

/**
 * Medusa's built-in JWT authentication endpoint (admin user actor)
 */
export async function authenticateUser(email: string, password: string) {
  return api.post(`/auth/user/emailpass`, {
    email,
    password,
  });
}

/**
 * Medusa's built-in session endpoint
 */
export async function getSession(jwt: string) {
  return api.post(
    `/auth/session`,
    {},
    { headers: { Authorization: `Bearer ${jwt}` } },
  );
}

/**
 * Medusa's built-in session deletion endpoint
 */
export async function deleteSession() {
  return api.del(`/auth/session`);
}
