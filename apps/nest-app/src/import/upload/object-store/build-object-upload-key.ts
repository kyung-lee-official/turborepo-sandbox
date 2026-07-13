import { nanoid } from "nanoid";
import {
  extensionFromMime,
  extensionFromOriginalName,
} from "../local-multipart/extension-from-mime";

export function buildObjectUploadKey(input: {
  prefix: string;
  uploadSessionId: string;
  sourceId: string;
  originalName: string;
  mimeType?: string;
}): string {
  const normalizedPrefix = input.prefix.replace(/\/+$/, "");
  const ext =
    extensionFromOriginalName(input.originalName) ||
    extensionFromMime(input.mimeType);
  return `${normalizedPrefix}/${input.uploadSessionId}/${input.sourceId}-${nanoid()}${ext}`;
}
