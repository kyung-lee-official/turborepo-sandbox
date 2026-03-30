"use client";

import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Alert } from "@/app/medusa/components/Alert";
import { Button } from "@/app/medusa/components/Button";
import { Card } from "@/app/medusa/components/Card";
import { PageShell } from "@/app/medusa/components/PageShell";
import { TextInput } from "@/app/medusa/components/TextInput";
import { authenticateCustomer, signOutCustomer } from "./api";

type FormData = {
  email: string;
  password: string;
};

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
      return await authenticateCustomer(data.email, data.password);
    },
    onSuccess: async (data) => {},
    onError: (error) => {
      console.error("Authentication failed:", error);
    },
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      return await signOutCustomer();
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
      <Card>
        <h2 className="mt-6 text-center font-extrabold text-3xl text-gray-900">
          Sign in to your account
        </h2>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="-space-y-px rounded-md shadow-sm">
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
                <p className="mt-1 text-red-600 text-sm">
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
                <p className="mt-1 text-red-600 text-sm">
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
            <Alert title="Sign in failed" variant="error">
              <p>
                {authenticateCustomerMutation.error instanceof Error
                  ? authenticateCustomerMutation.error.message
                  : "An error occurred during sign in"}
              </p>
            </Alert>
          )}

          {authenticateCustomerMutation.isSuccess && (
            <Alert title="Sign in successful!" variant="success">
              <p>
                You have been authenticated successfully. Refresh to update
                token info in layout.
              </p>
            </Alert>
          )}
        </form>
      </Card>
      <Card>
        <h2 className="mt-6 text-center font-extrabold text-3xl text-gray-900">
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
