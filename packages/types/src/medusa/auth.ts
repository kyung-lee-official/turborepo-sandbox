export interface JwtContext {
  actor_id?: string;
  actor_type?: string;
  auth_identity_id?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  iat?: number;
  exp?: number;
}
