"use client";

import { nanoid } from "nanoid";
import { useForm } from "react-hook-form";

export type OrderFormData = {
  intent: "CAPTURE" | "AUTHORIZE";
  reference_id: string;
  currency_code: string;
  amount_value: string;
  address_line_1: string;
  address_line_2: string;
  admin_area_1: string;
  admin_area_2: string;
  postal_code: string;
  country_code: string;
  email_address: string;
  payment_method_preference: "UNRESTRICTED" | "IMMEDIATE_PAYMENT_REQUIRED";
  return_url: string;
  cancel_url: string;
};

type FormProps = {
  onSubmit: (data: OrderFormData) => void;
  isLoading?: boolean;
};

export const Form = ({ onSubmit, isLoading = false }: FormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<OrderFormData>({
    defaultValues: {
      intent: "AUTHORIZE",
      reference_id: nanoid(),
      currency_code: "USD",
      amount_value: "0.01",
      address_line_1: "2211 N First Street",
      address_line_2: "17.3.160",
      admin_area_1: "CA",
      admin_area_2: "San Jose",
      postal_code: "95131",
      country_code: "US",
      email_address: "sb-pfrec25202733@personal.example.com",
      payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
      return_url: `http://localhost:3000/payment/paypal/orders-api-integration/return`,
      cancel_url: `http://localhost:3000/payment/paypal/orders-api-integration/cancel`,
    },
    mode: "onChange",
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h3 className="font-medium text-lg">Order Details</h3>

      {/* Intent */}
      <div>
        <label className="mb-1 block font-medium text-gray-700 text-sm">
          Intent
        </label>
        <select
          {...register("intent", { required: "Intent is required" })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="CAPTURE">CAPTURE</option>
          <option value="AUTHORIZE">AUTHORIZE</option>
        </select>
        {errors.intent && (
          <p className="mt-1 text-red-500 text-sm">{errors.intent.message}</p>
        )}
      </div>

      {/* Reference ID */}
      <div>
        <label className="mb-1 block font-medium text-gray-700 text-sm">
          Reference ID
        </label>
        <input
          type="text"
          {...register("reference_id", {
            required: "Reference ID is required",
          })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.reference_id && (
          <p className="mt-1 text-red-500 text-sm">
            {errors.reference_id.message}
          </p>
        )}
      </div>

      {/* Amount */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block font-medium text-gray-700 text-sm">
            Currency Code
          </label>
          <input
            type="text"
            {...register("currency_code", {
              required: "Currency code is required",
              minLength: {
                value: 3,
                message: "Currency code must be 3 characters",
              },
              maxLength: {
                value: 3,
                message: "Currency code must be 3 characters",
              },
            })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.currency_code && (
            <p className="mt-1 text-red-500 text-sm">
              {errors.currency_code.message}
            </p>
          )}
        </div>
        <div>
          <label className="mb-1 block font-medium text-gray-700 text-sm">
            Amount
          </label>
          <input
            type="text"
            {...register("amount_value", {
              required: "Amount is required",
              pattern: {
                value: /^\d+(\.\d{1,2})?$/,
                message: "Invalid amount format",
              },
            })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.amount_value && (
            <p className="mt-1 text-red-500 text-sm">
              {errors.amount_value.message}
            </p>
          )}
        </div>
      </div>

      {/* Address */}
      <h4 className="mt-6 font-medium text-gray-800 text-md">
        Address Information
      </h4>

      <div>
        <label className="mb-1 block font-medium text-gray-700 text-sm">
          Address Line 1
        </label>
        <input
          type="text"
          {...register("address_line_1")}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="mb-1 block font-medium text-gray-700 text-sm">
          Address Line 2
        </label>
        <input
          type="text"
          {...register("address_line_2")}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block font-medium text-gray-700 text-sm">
            State/Province
          </label>
          <input
            type="text"
            {...register("admin_area_1")}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block font-medium text-gray-700 text-sm">
            City
          </label>
          <input
            type="text"
            {...register("admin_area_2")}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block font-medium text-gray-700 text-sm">
            Postal Code
          </label>
          <input
            type="text"
            {...register("postal_code")}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block font-medium text-gray-700 text-sm">
            Country Code
          </label>
          <input
            type="text"
            {...register("country_code", {
              minLength: {
                value: 2,
                message: "Country code must be 2 characters",
              },
              maxLength: {
                value: 2,
                message: "Country code must be 2 characters",
              },
            })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.country_code && (
            <p className="mt-1 text-red-500 text-sm">
              {errors.country_code.message}
            </p>
          )}
        </div>
      </div>

      {/* Payment Source */}
      <h4 className="mt-6 font-medium text-gray-800 text-md">
        Payment Information
      </h4>

      <div>
        <label className="mb-1 block font-medium text-gray-700 text-sm">
          Email Address
        </label>
        <input
          type="email"
          {...register("email_address", {
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: "Invalid email address",
            },
          })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.email_address && (
          <p className="mt-1 text-red-500 text-sm">
            {errors.email_address.message}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block font-medium text-gray-700 text-sm">
          Payment Method Preference
        </label>
        <select
          {...register("payment_method_preference")}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="UNRESTRICTED">UNRESTRICTED</option>
          <option value="IMMEDIATE_PAYMENT_REQUIRED">
            IMMEDIATE_PAYMENT_REQUIRED
          </option>
        </select>
      </div>

      {/* Experience Context */}
      <h4 className="mt-6 font-medium text-gray-800 text-md">
        Experience Context
      </h4>

      <div>
        <label className="mb-1 block font-medium text-gray-700 text-sm">
          Return URL
        </label>
        <input
          type="url"
          {...register("return_url", {
            pattern: {
              value: /^https?:\/\/.+/,
              message: "Invalid URL format",
            },
          })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.return_url && (
          <p className="mt-1 text-red-500 text-sm">
            {errors.return_url.message}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block font-medium text-gray-700 text-sm">
          Cancel URL
        </label>
        <input
          type="url"
          {...register("cancel_url", {
            pattern: {
              value: /^https?:\/\/.+/,
              message: "Invalid URL format",
            },
          })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.cancel_url && (
          <p className="mt-1 text-red-500 text-sm">
            {errors.cancel_url.message}
          </p>
        )}
      </div>

      {/* Form Status */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between">
          <div className="text-gray-600 text-sm">
            Form Status:{" "}
            {isValid ? (
              <span className="font-medium text-green-600">Valid</span>
            ) : (
              <span className="font-medium text-red-600">Invalid</span>
            )}
          </div>
          <button
            type="submit"
            disabled={!isValid || isLoading}
            className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isLoading ? "Creating Order..." : "Create Order"}
          </button>
        </div>
      </div>
    </form>
  );
};
