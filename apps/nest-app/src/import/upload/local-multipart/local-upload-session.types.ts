export type LocalUploadSession = {
  domainKind: string;
  autoStart?: boolean;
  uploadSessionId?: string;
  context?: Record<string, unknown>;
};
