# Nest DTO and OpenAPI pattern

Use this stack instead of `@nestjs/swagger` **class DTOs** with `@ApiProperty` / `@ApiPropertyOptional`.

## 1. Zod DTOs (`*.dto.ts`)

1. **Zod + `z.infer`** — Export `const fooSchema = z.object({ ... })` and `export type Foo = z.infer<typeof fooSchema>`.
2. **Runtime validation (inputs)** — `new ZodValidationPipe(fooSchema)` on `@Body()`, `@Param()`, or `@Query()`. Use `z.object({ paramName: ... })` when the pipe must receive the full params object.
3. **Runtime validation (responses, optional)** — `return responseSchema.parse(await this.service...)` when server output must be checked in development.

```typescript
// ✅ DTOs
export const widgetSchema = z.object({ id: z.string().uuid() });
export type Widget = z.infer<typeof widgetSchema>;

// ❌ Swagger class DTOs
export class WidgetDto {
  @ApiProperty() id!: string;
}
```

## 2. OpenAPI options — **only** in `*.swagger.ts` (required)

**Every option object** passed to `@nestjs/swagger` route decorators MUST be defined as a **named export** in a colocated `**/swagger/*.swagger.ts` file. Controllers import those constants and pass them as the **sole** decorator argument.

**Applies to:** `@ApiOperation`, `@ApiBody`, `@ApiOkResponse`, `@ApiCreatedResponse`, `@ApiResponse`, `@ApiParam`, `@ApiQuery`, `@ApiTags`, and any other decorator that accepts `*Options` from `@nestjs/swagger`.

```typescript
// ❌ Forbidden in *.controller.ts
@ApiOperation({ summary: "Create widget" })
@ApiBody({ schema: { type: "object", properties: { name: { type: "string" } } } })

// ✅ Required pattern
import {
  createWidgetApiOperationOptions,
  createWidgetBodyOptions,
} from "./swagger/create-widget.swagger";

@ApiOperation(createWidgetApiOperationOptions)
@ApiBody(createWidgetBodyOptions)
```

### `*.swagger.ts` file rules

| Rule | Detail |
| ---- | ------ |
| **Location** | `swagger/<feature>.swagger.ts` next to the controller module |
| **Types** | Import `ApiOperationOptions`, `ApiBodyOptions`, etc. from `@nestjs/swagger` |
| **Naming** | `{verb}{Resource}ApiOperationOptions`, `{verb}{Resource}BodyOptions`, `{verb}{Resource}OkResponseOptions` |
| **Schemas** | Manual OpenAPI `schema` objects; keep shapes aligned with Zod DTOs |
| **Sync** | Changing a Zod field or route contract → update the matching `*.swagger.ts` export in the same change |

```typescript
// swagger/create-widget.swagger.ts
import type { ApiBodyOptions, ApiOperationOptions } from "@nestjs/swagger";

export const createWidgetApiOperationOptions: ApiOperationOptions = {
  summary: "Create a widget",
};

export const createWidgetBodyOptions: ApiBodyOptions = {
  schema: {
    type: "object",
    required: ["name"],
    properties: { name: { type: "string" } },
  },
};
```

### `@ApiTags` on controllers

Prefer a single exported tag string in `swagger/<module>.swagger.ts` (e.g. `widgetsApiTags = "Widgets"`) and use `@ApiTags(widgetsApiTags)` on the controller class.

### When editing existing controllers

If you touch a route that still has **inline** `@Api*` options, **move** those options into the appropriate `*.swagger.ts` file in the same PR.
