export type GrokMinimumApiTestInput = {
  token: string;
  model: string;
  proxyUrl: string;
};

export type GrokMinimumApiTestResult = {
  text: string;
  model: string;
  proxyUrl: string | null;
  finishReason: string;
  latencyMs: number;
  usage: {
    inputTokens: number | undefined;
    outputTokens: number | undefined;
  };
};
