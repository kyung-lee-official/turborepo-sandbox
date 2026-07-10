# Next.js — forms and data fetching

## Forms (mandatory for new or refactored UI)

Use **react-hook-form** for field values, submit handling, and validation state. Do **not** use `useState` per input or hand-rolled validation for standard forms.

Use **Zod** (`import { z } from "zod"`) as the single schema source. Wire with **`zodResolver`** from `@hookform/resolvers/zod`.

```typescript
// ✅ GOOD
const schema = z.object({ name: z.string().trim().min(1) });
type FormValues = z.infer<typeof schema>;

const form = useForm<FormValues>({
  resolver: zodResolver(schema),
  defaultValues: { name: "" },
});

// ❌ BAD — ad-hoc field state / validation
const [name, setName] = useState("");
const nameError = name.trim() ? null : "Required";
```

- Surface errors via `formState.errors` (or controlled field components bound to RHF).
- Disable submit while `formState.isSubmitting` or a related mutation is pending.
- `useState` is fine for **non-field** UI only (dialogs open, selected tab, ephemeral drafts not yet modeled as form fields).

## Server state and HTTP (mandatory)

Use **TanStack Query** (`useQuery`, `useMutation`, `useQueries`, `useQueryClient`) for request lifecycle, caching, loading/error flags, and invalidation. Do **not** call `fetch` directly inside components or hooks tied to UI.

All HTTP must go through a shared **`fetch`** wrapper (e.g. `apiJson` / `apiFetch`) inside **API modules**. Components import those functions and pass them to `queryFn` / `mutationFn`.

```typescript
// ✅ GOOD — api module + TanStack Query
export async function updateItem(id: string, body: UpdateItemBody) {
  return apiJson<Item>(`items/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const mutation = useMutation({
  mutationFn: (values: FormValues) => updateItem(id, values),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: [ItemQK.LIST] });
  },
});
```

```typescript
// ❌ BAD
useEffect(() => { fetch("/api/...").then(...) }, []);
axios.post(...);
```

- Define **stable query keys** (enums or factories) next to the API module.
- Type mutation/query errors with a shared **`ApiError`** type where applicable.
- **Do not** add alternate HTTP clients for app API calls unless the project already standardizes on one.

## Legacy

When editing a file that still uses `useState` forms or inline `fetch`, migrate that surface to this pattern in the same change when practical; do not expand legacy patterns for new fields or endpoints.
