"use client";

import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import { FetcherError } from "@/lib/fetcher";
import { conditionallyDownloadJsonOrBuffer } from "./api";
import { TanStackWrapper } from "./TanStackWrapper";

const StatusDisplay = (props: {
  downloadMutation: UseMutationResult<any, Error, any, unknown>;
}) => {
  const { downloadMutation } = props;
  if (downloadMutation.isPending) {
    return (
      <span className="flex items-center">
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-white border-b-2"></div>
        Processing...
      </span>
    );
  }
  if (downloadMutation.isError) {
    return (
      <div className="rounded border border-red-400 bg-red-100 p-3 text-red-700">
        <strong>Error:</strong> Request failed. Check console for details.
      </div>
    );
  }
  if (downloadMutation.isSuccess) {
    /* data is arrayBuffer, convert to JSON */
    const jsonContent = JSON.parse(
      new TextDecoder().decode(downloadMutation.data),
    );
    return (
      <div className="rounded border border-green-400 bg-green-100 p-3 text-green-700">
        <strong>Success:</strong> Request completed successfully!
        {downloadMutation.data && (
          <pre>{JSON.stringify(jsonContent, null, 2)}</pre>
        )}
      </div>
    );
  }
  return null;
};

const ConditionalDownloadContent = () => {
  const downloadMutation = useMutation({
    mutationFn: async (_requestData?: unknown) => {
      return conditionallyDownloadJsonOrBuffer();
    },
    onSuccess: (_data) => {},
    onError: (error) => {
      /**
       * The original request used `responseType: "arrayBuffer"`, so the
       * fetcher's FetcherError carries the error body as an ArrayBuffer
       * in `error.data`. We just check that and download it as an .xlsx
       * — the original code distinguished via the `content-type` header
       * but with the arraybuffer responseType that distinction is lost,
       * so we always treat the error body as the xlsx payload.
       */
      if (error instanceof FetcherError && error.data instanceof ArrayBuffer) {
        const blob = new Blob([error.data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "errors.xlsx";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        /* unknown error */
        console.error("Request failed with error:", error);
      }
    },
  });

  const handleGetResponse = () => {
    /* Trigger the mutation with empty data */
    downloadMutation.mutate({});
  };

  return (
    <div className="space-y-2 p-3">
      <h1>Conditionally Download JSON or Buffer</h1>
      <p>
        The backend randomly returns JSON or buffer. The frontend handles both
        cases.
      </p>
      <p>
        When using a low-level fetch, it is crucial to set the{" "}
        <b>`responseType`</b> to <b>"arrayBuffer"</b> to correctly handle binary
        data responses. For normal JSON responses, you can then decode the
        arraybuffer back to a string and parse it as JSON. For error responses
        that return files (like Excel), the fetcher surfaces the body as
        `error.data` (still an ArrayBuffer), which you can wrap in a Blob and
        trigger a download in the browser.
      </p>
      <button
        onClick={handleGetResponse}
        disabled={downloadMutation.isPending}
        className={`rounded p-2 text-white ${
          downloadMutation.isPending
            ? "cursor-not-allowed bg-gray-400"
            : "bg-blue-500 hover:bg-blue-600"
        }`}
      >
        {downloadMutation.isPending ? (
          <span className="flex items-center">
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-white border-b-2"></div>
            Processing...
          </span>
        ) : (
          "Get Response"
        )}
      </button>

      <div className="mt-4">
        <StatusDisplay downloadMutation={downloadMutation} />
      </div>
    </div>
  );
};

export const Content = () => {
  return (
    <TanStackWrapper>
      <ConditionalDownloadContent />
    </TanStackWrapper>
  );
};
