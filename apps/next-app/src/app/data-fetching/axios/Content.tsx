"use client";

import { QueryClientProvider, useMutation } from "@tanstack/react-query";
import queryString from "query-string";
import { queryClient } from "@/app/data-fetching/tanstack-query/queryClient";
import { post } from "@/lib/fetcher";

/**
 * Demo of doing data fetching with the project's native `fetch`-based
 * `fetcher` wrapper (see `apps/next-app/src/lib/fetcher.ts`).
 *
 * The same axios-style ergonomics (JSON body, baseURL, params, headers)
 * are preserved by the wrapper.
 */
const Example = () => {
  const mutation = useMutation({
    mutationFn: async () => {
      const complexData = {
        key1: "value1",
        arr: [1, 2, 3],
        obj: {
          nestedKey: "nestedValue",
        },
        /* this will be added to the string with key only */
        nullValue: null,
        /* this will be ignored */
        undefinedValue: undefined,
      };
      const serialized = queryString.stringify(complexData);
      // console.log("Serialized complex data:", serialized);

      const data = await post<unknown>(
        "/api/data",
        { test: "hello" },
        {
          baseURL: "https://example.com",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer this.is.a.mock.token`,
          },
          /**
           * `params` is the same as axios's; for complex query parameters,
           * use https://www.npmjs.com/package/query-string
           */
          params: {
            "query-param": "value",
          },
        },
      );
      return data;
    },
  });
  return (
    <div className="p-4">
      Check out the DevTools Network tab for request details{" "}
      <button
        type="button"
        className="cursor-pointer rounded bg-blue-500 p-2 text-white"
        onClick={() => mutation.mutate()}
      >
        Send Request
      </button>
    </div>
  );
};

const Content = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Example />
    </QueryClientProvider>
  );
};

export default Content;
