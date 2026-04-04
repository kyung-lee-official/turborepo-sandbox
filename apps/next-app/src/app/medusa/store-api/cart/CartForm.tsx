"use client";

import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Alert } from "@/app/medusa/components/Alert";
import { Button } from "@/app/medusa/components/Button";
import { Card } from "@/app/medusa/components/Card";
import { TextInput } from "@/app/medusa/components/TextInput";
import { getCart } from "./api";

type FormData = {
  cartId: string;
};

export const CartForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      cartId: "",
    },
  });

  const getCartMutation = useMutation({
    mutationFn: async (id: string) => {
      return await getCart(id);
    },
    onSuccess: async (data) => {
      console.log("Cart data:", data);
    },
    onError: (error) => {
      console.error("Failed to get cart:", error);
    },
  });

  const onSubmit = (data: FormData) => {
    getCartMutation.mutate(data.cartId);
  };

  return (
    <div className="flex justify-center py-12">
      <Card variant="pixel" className="max-w-md">
        <div>
          <h2 className="text-center font-bold text-2xl text-gray-900 tracking-tight">
            Get cart by ID
          </h2>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="cartId" className="sr-only">
              Cart ID
            </label>
            <TextInput
              id="cartId"
              type="text"
              placeholder="Enter cart ID"
              {...register("cartId", {
                required: "Cart ID is required",
              })}
            />
            {errors.cartId && (
              <p className="mt-2 text-red-700 text-sm">{errors.cartId.message}</p>
            )}
          </div>

          <div>
            <Button
              type="submit"
              variant="primary"
              disabled={getCartMutation.isPending}
            >
              {getCartMutation.isPending ? "Loading..." : "Get cart"}
            </Button>
          </div>

          {getCartMutation.isError && (
            <Alert title="Failed to get cart" variant="error" appearance="pixel">
              {getCartMutation.error instanceof Error
                ? getCartMutation.error.message
                : "An error occurred while fetching the cart"}
            </Alert>
          )}

          {getCartMutation.isSuccess && (
            <Alert title="Cart retrieved" variant="success" appearance="pixel">
              Cart data has been fetched successfully.
            </Alert>
          )}
        </form>
      </Card>
    </div>
  );
};
