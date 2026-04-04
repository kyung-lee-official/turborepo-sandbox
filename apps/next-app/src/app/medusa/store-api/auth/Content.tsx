"use client";

import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Alert } from "@/app/medusa/components/Alert";
import { Button } from "@/app/medusa/components/Button";
import { Card } from "@/app/medusa/components/Card";
import { PageShell } from "@/app/medusa/components/PageShell";
import { TextInput } from "@/app/medusa/components/TextInput";
import { authenticateCustomer, deleteSession, getSession } from "./api";

type FormData = {
  email: string;
  password: string;
};

function extractJwt(authResult: unknown): string | null {
  if (!authResult || typeof authResult !== "object") return null;
  const data = authResult as Record<string, unknown>;

  const tokenCandidates = [
    data.token,
    data.jwt,
    data.access_token,
    data.accessToken,
  ];

  for (const token of tokenCandidates) {
    if (typeof token === "string" && token.length > 0) return token;
  }
  return null;
}

export const Content = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      email: "customer1@example.com",
      password: "supersecret",
    },
  });

  const authenticateCustomerMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const authResult = await authenticateCustomer(data.email, data.password);
      const jwt = extractJwt(authResult);
      if (!jwt) {
        throw new Error("Authentication succeeded but no JWT was returned.");
      }
      return await getSession(jwt);
    },
    onSuccess: async () => {},
    onError: (error) => {
      console.error("Authentication failed:", error);
    },
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      return await deleteSession();
    },
    onSuccess: async () => {
      console.log("Signed out successfully");
    },
  });

  const onSubmit = (data: FormData) => {
    authenticateCustomerMutation.mutate(data);
  };

  return (
    <PageShell>
      <Card variant="pixel">
        <h2 className="text-center font-bold text-2xl text-gray-900">
          Sign in to your account
        </h2>
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="-space-y-px shadow-sm">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <TextInput
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address",
                  },
                })}
                type="email"
                placeholder="Email address"
                radius="top"
              />
              {errors.email && (
                <p className="mt-1 text-red-700 text-sm">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <TextInput
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 6,
                    message: "Password must be at least 6 characters",
                  },
                })}
                type="password"
                placeholder="Password"
                radius="bottom"
              />
              {errors.password && (
                <p className="mt-1 text-red-700 text-sm">
                  {errors.password.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={authenticateCustomerMutation.isPending}
            >
              {authenticateCustomerMutation.isPending
                ? "Signing in..."
                : "Sign in"}
            </Button>
          </div>

          {authenticateCustomerMutation.isError && (
            <Alert title="Sign in failed" variant="error" appearance="pixel">
              <p>
                {authenticateCustomerMutation.error instanceof Error
                  ? authenticateCustomerMutation.error.message
                  : "An error occurred during sign in"}
              </p>
            </Alert>
          )}

          {authenticateCustomerMutation.isSuccess && (
            <Alert title="Sign in successful" variant="success" appearance="pixel">
              <p>
                You have been authenticated successfully and session has been
                loaded.
              </p>
            </Alert>
          )}
        </form>
      </Card>
      <Card variant="pixel">
        <h2 className="text-center font-bold text-2xl text-gray-900">
          Sign out
        </h2>
        <Button
          type="button"
          variant="danger"
          onClick={() => signOutMutation.mutate()}
        >
          Sign out
        </Button>
      </Card>
    </PageShell>
  );
};
