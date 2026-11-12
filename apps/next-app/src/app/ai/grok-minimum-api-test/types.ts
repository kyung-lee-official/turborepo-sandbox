export type GrokMinimumApiTestInput = {
  token: string;
  model: string;
};

export type GrokMinimumApiTestResult = {
  text: string;
  model: string;
  finishReason: string;
  latencyMs: number;
  usage: {
    inputTokens: number | undefined;
    outputTokens: number | undefined;
  };
};
