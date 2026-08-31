"use client";

import { QueryClientProvider, useMutation } from "@tanstack/react-query";
import jwt from "jsonwebtoken";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { queryClient } from "@/app/data-fetching/tanstack-query/queryClient";
import { signOut } from "./actions";
import { secureApi } from "./axios-client";

const Content = () => {
  const { register, handleSubmit } = useForm<{ email: string }>();
  const [token, setToken] = useState("");

  const signinMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const response = await secureApi.post(
        "/security/http-only-cookies/sign-in",
        data,
      );
      // The response body itself is the proof that the request went
      // through; the HTTP-only cookie is set by the browser and is NOT
      // accessible from JavaScript (it's not on `document.cookie` either).
      console.log("sign-in response:", response);
      return response;
    },
  });

  const secretMutation = useMutation({
    mutationFn: async () => {
      return secureApi.get<{ message: string }>(
        "/security/http-only-cookies/get-pretected-data",
      );
    },
    onError: (error: any) => {
      console.error("Error fetching protected data:", error);
    },
  });

  return (
    <div className="m-2 space-y-3 rounded bg-neutral-200 p-2">
      <form
        onSubmit={handleSubmit((data) => {
          signinMutation.mutate({ email: data.email });
        })}
        className="space-x-2 rounded bg-neutral-100 p-2"
      >
        <input
          {...register("email")}
          type="email"
          required
          className="bg-neutral-100"
        />
        <button
          type="submit"
          className="rounded bg-green-500 p-1 text-neutral-50"
        >
          Sign In
        </button>
        <details>
          <summary className="inline cursor-help text-neutral-500 text-sm">
            Check console for response headers
          </summary>
          By reviewing the response headers in the console, you can verify that
          the headers do not include the HTTP-only cookie, confirming its secure
          nature.
        </details>
      </form>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          secretMutation.mutate();
        }}
        className="space-x-2 rounded bg-neutral-100 p-2"
      >
        <button
          type="submit"
          className="rounded bg-blue-500 p-1 text-neutral-50"
        >
          Get Protected Data
        </button>
      </form>
      {secretMutation.isPending && <p>Loading...</p>}
      {secretMutation.isError && (
        <p>
          {secretMutation.error?.message ??
            "Request failed. Check console for details."}
        </p>
      )}
      {secretMutation.data ? (
        <p className="space-x-2 rounded bg-neutral-100 p-2">
          {secretMutation.data.message}
        </p>
      ) : null}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await signOut();
        }}
        className="space-x-2 rounded bg-neutral-100 p-2"
      >
        <button
          type="submit"
          className="rounded bg-red-500 p-1 text-neutral-50"
        >
          Sign Out
        </button>
      </form>
      <div className="space-x-2 rounded bg-neutral-100 p-2">
        <p>
          get token from <strong>server action</strong>, essentially it's a
          RPC-like call after compilation, the client does not have direct
          access to the HTTP-only cookie
        </p>
        <button
          type="button"
          className="rounded bg-purple-500 p-1 text-neutral-50"
          onClick={async () => {
            const { getCookieToken } = await import("./actions");
            const result = await getCookieToken();
            setToken(result.token || "");
          }}
        >
          Get Cookie Token
        </button>
        {token && (
          <div>
            <p>Token:</p>
            <p className="wrap-normal bg-white p-4">{token}</p>
            <p>Decoded:</p>
            <pre className="wrap-normal bg-white p-4">
              {JSON.stringify(jwt.decode(token), null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export const Wrapper = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Content />
    </QueryClientProvider>
  );
};
