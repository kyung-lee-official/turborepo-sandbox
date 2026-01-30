/* WebSocket Events for Upload XLSX functionality */

/**
 * Events that clients can send to the server
 */
export enum UploadXlsxIncomingEvents {
  JOIN_TASK = "join-task",
  LEAVE_TASK = "leave-task",
}

/**
 * Events that the server sends to clients
 */
export enum UploadXlsxOutgoingEvents {
  /* Room management responses */
  JOINED_TASK = "joined-task",
  LEFT_TASK = "left-task",

  /* Task progress and status */
  TASK_PROGRESS = "task-progress",
  TASK_COMPLETED = "task-completed",
  TASK_FAILED = "task-failed",

  /* Phase-specific events */
  WORKBOOK_LOADING = "workbook-loading",
  HEADER_VALIDATION = "header-validation",
  PROCESSING_COMPLETED = "processing-completed",
}
