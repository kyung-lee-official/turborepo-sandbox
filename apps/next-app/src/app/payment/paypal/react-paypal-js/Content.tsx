"use client";

import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import axios from "axios";
import { ChangeEvent, useState } from "react";

const { NEXT_PUBLIC_NESTJS } = process.env;

const Content = () => {
  const [amount, setAmount] = useState<string>("1.00");
  const [arbStatus, setArbStatus] = useState<"Paid" | null>(null);
  const [fixedId, setFixedId] = useState<string | null>();
  const [fixedStatus, setFixedStatus] = useState<string | null>();

  function onAmountChange(e: ChangeEvent<HTMLInputElement>) {
    setAmount(e.target.value);
  }

  const initialPayPalOptions = {
    clientId:
      "AUO6oe-nbfXCEVAXfnAZr5Age4NpMFFKc7zCJ-DdLD2Gazw4adr-x8CeToP6OzIhCBc7QWo94s5snXxH",
    // "client-id": "AUO6oe-nbfXCEVAXfnAZr5Age4NpMFFKc7zCJ-DdLD2Gazw4adr-x8CeToP6OzIhCBc7QWo94s5snXxH",
    // currency: "USD",
    // intent: "capture",
    // "data-client-token": "abc123xyz==",
  };

  return (
    <PayPalScriptProvider options={initialPayPalOptions}>
      <div className="m-4 flex flex-col items-center justify-center gap-6">
        <div className="m-4 flex flex-col items-center justify-center gap-4">
          <h1 className="text-2xl">Arbitrary amount</h1>
          <input
            className="appearance-none rounded border text-gray-700 shadow focus:shadow-outline focus:outline-none"
            type="number"
            min={"0.01"}
            value={amount}
            onChange={onAmountChange}
          />
          <PayPalButtons
            className="h-[164px]"
            style={{
              layout: "vertical",
              color: "blue",
              shape: "pill",
            }}
            forceReRender={[amount]}
            createOrder={(data, actions) => {
              console.log("Order created");
              return actions.order.create({
                purchase_units: [
                  {
                    amount: {
                      value: amount,
                      currency_code: "USD",
                    },
                  },
                ],
                intent: "CAPTURE",
              });
            }}
            onApprove={(data, actions) => {
              console.log("Approved by payer");
              if (!actions.order) {
                throw new Error("Order action is undefined");
              }
              return actions.order.capture().then((details) => {
                console.log("Payment captured");
                setArbStatus("Paid");
              });
            }}
            onCancel={() => {
              console.log("Order cancelled");
            }}
          />
          <div>
            USD {amount} {arbStatus ? arbStatus : null}
          </div>
        </div>
        <div className="h-1 w-full bg-slate-600"></div>
        <div className="m-4 flex flex-col items-center justify-center gap-4">
          <h1 className="text-2xl">Fixed amount (Server Side)</h1>
          <h1 className="text-lg">USD 0.03</h1>
          <PayPalButtons
            style={{
              layout: "vertical",
              color: "blue",
              shape: "pill",
            }}
            createOrder={async (data, actions) => {
              console.log("Order created");
              const res = await axios.post(
                "/paypal",
                {
                  intent: "CAPTURE",
                  productId: 1,
                },
                {
                  baseURL: NEXT_PUBLIC_NESTJS,
                  headers: {
                    "Content-Type": "application/json",
                  },
                },
              );
              const orderId = res.data;
              console.log(orderId);
              return orderId;
            }}
            onApprove={async (data, actions) => {
              console.log("Approved by payer");
              const res = await axios.post(
                "/paypal/completeOrder",
                {
                  orderId: data.orderID,
                },
                {
                  baseURL: NEXT_PUBLIC_NESTJS,
                  headers: {
                    "Content-Type": "application/json",
                  },
                },
              );
              console.log("captured");
              setFixedId(res.data.id);
              setFixedStatus(res.data.status);
            }}
            onCancel={() => {
              console.log("Order cancelled");
            }}
          />
          <div>
            USD 0.03{" "}
            {fixedId && fixedStatus ? `Order ${fixedId} ${fixedStatus}` : null}
          </div>
        </div>
      </div>
    </PayPalScriptProvider>
  );
};

export default Content;
