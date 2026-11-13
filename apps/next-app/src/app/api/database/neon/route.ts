import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { Pool } from "pg";
import { z } from "zod";
import {
  CREATE_NEON_RANDOM_NUMBER_TABLE_SQL,
  UPSERT_NEON_RANDOM_NUMBER_SQL,
} from "@/app/database/neon/sql";
import type { NeonRandomNumberResult } from "@/app/database/neon/types";

export const dynamic = "force-dynamic";

type NeonRandomNumberDbRow = {
  id: number;
  value: number;
  updatedAt: Date;
};

const requestSchema = z.object({
  databaseUrl: z
    .string()
    .trim()
    .min(1, "Database URL is required")
    .refine(
      (value) => /^postgres(ql)?:\/\//.test(value),
      "Expected a PostgreSQL connection URL",
    ),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
      { status: 400 },
    );
  }

  const { databaseUrl } = parsed.data;
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await pool.query(CREATE_NEON_RANDOM_NUMBER_TABLE_SQL);

    const value = randomInt(0, 1_000_000);
    const result = await pool.query<NeonRandomNumberDbRow>(
      UPSERT_NEON_RANDOM_NUMBER_SQL,
      [value],
    );
    const row = result.rows[0];

    if (!row) {
      throw new Error("The database did not return the written row");
    }

    const responseBody = {
      id: row.id,
      value: row.value,
      updatedAt: row.updatedAt.toISOString(),
    } satisfies NeonRandomNumberResult;

    return NextResponse.json(responseBody);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 502 },
    );
  } finally {
    await pool.end().catch(() => undefined);
  }
}
