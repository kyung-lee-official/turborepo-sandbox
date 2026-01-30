import type { Logger } from "@nestjs/common";

/**
 * Converts serialized buffer data from BullMQ back to a proper Buffer object.
 * BullMQ serializes Buffer objects to JSON when storing jobs in Redis, typically
 * in the format {type: 'Buffer', data: [1, 2, 3, ...]} or {data: [1, 2, 3, ...]}.
 *
 * @param serializedBuffer - The potentially serialized buffer data from BullMQ
 * @param contextInfo - Additional context info for error messages (e.g., filename)
 * @param logger - Optional logger instance for debug information
 * @returns A proper Buffer object
 * @throws Error if conversion fails
 */
export function convertSerializedDataToBuffer(
  serializedBuffer: any,
  contextInfo: string,
  logger?: Logger,
): Buffer {
  try {
    /* Debug logging if logger provided */
    if (logger) {
      logger.log(`Buffer type: ${typeof serializedBuffer}`);
      logger.log(`Buffer isBuffer: ${Buffer.isBuffer(serializedBuffer)}`);
      logger.log(`Buffer keys: ${Object.keys(serializedBuffer as any)}`);
    }

    let bufferToLoad: Buffer;

    if (
      (serializedBuffer as any).type === "Buffer" &&
      (serializedBuffer as any).data &&
      Array.isArray((serializedBuffer as any).data)
    ) {
      /* Handle BullMQ serialized buffer format: {type: 'Buffer', data: [...]} */
      logger?.log("Converting from BullMQ serialized buffer format");
      bufferToLoad = Buffer.from((serializedBuffer as any).data);
    } else if (
      (serializedBuffer as any).data &&
      Array.isArray((serializedBuffer as any).data)
    ) {
      /* Handle alternative serialized format: {data: [...]} */
      logger?.log("Converting from alternative serialized format");
      bufferToLoad = Buffer.from((serializedBuffer as any).data);
    } else if (Buffer.isBuffer(serializedBuffer)) {
      /* This probably never happens with BullMQ, but keeping for completeness */
      logger?.log("Buffer is already a Buffer (unexpected with BullMQ)");
      bufferToLoad = serializedBuffer;
    } else {
      /* Last resort: try to convert whatever we got */
      logger?.log("Attempting last resort conversion to Buffer");
      bufferToLoad = Buffer.from(serializedBuffer as any);
    }

    /* Validate the resulting buffer */
    if (!Buffer.isBuffer(bufferToLoad)) {
      throw new Error("Failed to create a valid Buffer object");
    }

    if (bufferToLoad.length === 0) {
      throw new Error("Converted buffer is empty");
    }

    if (logger) {
      logger.log(`Final buffer is Buffer: ${Buffer.isBuffer(bufferToLoad)}`);
      logger.log(`Final buffer length: ${bufferToLoad.length}`);
    }

    return bufferToLoad;
  } catch (error) {
    const errorMessage = `Buffer conversion failed for ${contextInfo}: ${(error as Error).message}`;
    logger?.error(
      `Failed to convert serialized data to buffer for ${contextInfo}:`,
      error,
    );
    throw new Error(errorMessage);
  }
}
