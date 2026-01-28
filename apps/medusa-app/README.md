# Authentication

Authentication is handled using a single JWT. The JWT is issued by Medusa and stored via HttpOnly Cookie (cookie key `medusa_token`), with SameSite set to Lax.

A custom backend middleware validates the JWT before requests reach the Store API/Admin API, extracting the token from cookies and copying it to the `headers.authorization` field for downstream processing.

Frontend implementation:

- Since Medusa's built-in authentication endpoint

  ~~`POST /auth/{actor_type}/{auth_provider}`~~

  returns the token in JSON format and does not set HttpOnly Cookies, this endpoint is deprecated.
  Instead, we use a custom API

  ```
  POST /auth/sign-in/{actor_type}/{auth_provider}
  ```

  for login. After successful login, the backend sets an HttpOnly Cookie to store the JWT

- ```
  GET /store/customers/me
  ```

  retrieves current logged-in user information, stored in zustand store (browser memory, non-persistent)

- Custom API
  ```
  DELETE /auth/sign-out
  ```
  clears cookies and zustand store to complete logout

JWT refresh is automatically handled by the backend middleware after decoding and checking remaining time, with no frontend involvement required
