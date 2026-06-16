---
name: import-207-error-xlsx
description: Implement XLSX import flows that process every row, persist valid rows, collect validation failures, and return HTTP 207 with a downloadable XLSX error report for partial success. Use for NestJS/Express or frontend clients handling Excel uploads, binary error downloads, and success JSON responses.
---

# Import 207 Error XLSX

## Contract

- Process the whole file. Do not stop on the first invalid row.
- Initialize one `errors` array per request and push each row problem into it.
- Persist or accept valid rows even when invalid rows exist.
- Return `HTTP 207` plus XLSX bytes when `errors.length > 0`.
- Return `HTTP 200` plus JSON only when `errors.length === 0`.
- Do not wrap the entire import in a single database transaction. Use per-row or per-batch commits when persistence is needed.

## Error Shape

Use this shape unless the project already has an equivalent type:

```ts
type ImportValidationError = {
  rowNumber?: number;
  message: string;
  rawData: string;
};
```

- `rowNumber`: Sheet row number or record index when available.
- `message`: Short user-facing validation failure.
- `rawData`: `JSON.stringify(...)` for the bad row or relevant fields.

## Backend Pattern

1. Parse the uploaded workbook.
2. Validate each data row independently.
3. Persist valid rows as each row or batch passes validation.
4. Build an `.xlsx` workbook with columns `Row Number`, `Message`, `Raw Data` when any errors exist.
5. Send the binary response with:

```ts
res.setHeader(
  "Content-Type",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
);
res.setHeader(
  "Content-Disposition",
  'attachment; filename="error-report.xlsx"',
);
res.status(207).send(buffer);
```

Prefer an existing project helper such as `buildValidationErrorsXlsxBuffer`; otherwise create one near shared XLSX utilities.

## Frontend Pattern

- Upload with `FormData`.
- Set `responseType: "arraybuffer"` so JSON and XLSX responses can be handled through one code path.
- Treat `207` as partial success, create a `Blob` from the array buffer, and trigger a download.
- Treat `200` as success JSON by decoding the array buffer and parsing JSON.
- Show a partial-success state instead of treating `207` as a fatal error.

## Checklist

- `errors` array initialized once per request.
- Valid rows still written when invalid rows exist.
- `207` sends binary XLSX with correct headers.
- `200` sends JSON only when zero errors.
- Client handles `207` by downloading the error workbook and explaining partial success.
