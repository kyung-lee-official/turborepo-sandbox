export type ObjectStoreProvider = "s3" | "cos" | "aliyun";

export type PendingObjectFile = {
  sourceId: string;
  bucket: string;
  key: string;
  originalName: string;
  mimeType?: string;
};

export type PendingObjectUpload = {
  uploadSessionId: string;
  domainKind: string;
  provider: ObjectStoreProvider;
  region?: string;
  pending: Record<string, PendingObjectFile>;
};
