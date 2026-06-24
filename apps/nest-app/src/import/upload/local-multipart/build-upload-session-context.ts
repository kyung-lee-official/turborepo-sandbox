const UPLOAD_FORM_RESERVED_KEYS = ["autoStart", "uploadSessionId"] as const;

/** Collect non-empty multipart form fields into manifest context. */
export function buildUploadSessionContext(
  fields: Record<string, string | undefined>,
): Record<string, unknown> | undefined {
  const context: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    const trimmed = value?.trim();
    if (trimmed) {
      context[key] = trimmed;
    }
  }
  return Object.keys(context).length > 0 ? context : undefined;
}

/** Strip reserved and file field names from multipart body text fields. */
export function buildUploadSessionContextFromMultipartBody(
  body: Record<string, string | undefined>,
  sourceFieldNames: readonly string[],
): Record<string, unknown> | undefined {
  const reserved = new Set<string>([
    ...UPLOAD_FORM_RESERVED_KEYS,
    ...sourceFieldNames,
  ]);
  const fields: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!reserved.has(key)) {
      fields[key] = value;
    }
  }
  return buildUploadSessionContext(fields);
}
