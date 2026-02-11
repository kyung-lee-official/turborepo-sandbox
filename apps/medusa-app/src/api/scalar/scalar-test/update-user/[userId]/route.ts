import type { MedusaRequest, MedusaResponse } from "@medusajs/framework";

export type ReturnType = {
  status: "ok" | "error";
  body: Record<string, any>;
  params: Record<string, any>;
  query: Record<string, any>;
};

export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
  const { body, params, query } = req;
  console.log(body, params, query);

  res.status(200).json({
    status: "ok",
    body,
    params,
    query,
  });
};
