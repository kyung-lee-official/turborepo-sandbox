# UTF-8 encoding (Windows-safe edits)

Many files contain **non-ASCII literals** (accented text, CJK characters, currency symbols, localized column headers). Corrupting encoding turns them into `???`, `â€"`, or `Â§`. See also **docs-comments-convention** — those literals must stay verbatim **and** stay valid UTF-8 on disk.

## Default for agents

1. **Prefer write/edit tools** for markdown and source edits — do not bulk-rewrite text files via shell unless encoding is explicit (below).
2. **Never** use PowerShell `Set-Content`, `Out-File`, or `Get-Content | Set-Content` on tracked `.md` / `.ts` files **without** UTF-8.
3. **Scripts** that rewrite file contents must use **Bun/Node** (or PowerShell with explicit UTF-8):

```typescript
// ✅ GOOD — Bun/Node
import fs from "node:fs";
const text = fs.readFileSync(path, "utf8");
fs.writeFileSync(path, updated, "utf8");
```

```powershell
# ✅ GOOD — PowerShell (when shell is required)
$utf8 = New-Object System.Text.UTF8Encoding $false
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText($path, $content, $utf8)
```

```powershell
# ❌ BAD — default encoding on Windows corrupts café, 日本語, €, etc.
Get-ChildItem -Recurse *.md | ForEach-Object {
  (Get-Content $_.FullName -Raw) -replace 'old','new' | Set-Content $_.FullName
}
```

## Bulk path renames / codemods

| Do | Don't |
| --- | --- |
| `git mv` + targeted edit per file or small batch | One PowerShell loop over all `*.md` without `-Encoding utf8` |
| One Bun script with `readFileSync` / `writeFileSync` and `'utf8'` | `sed`/shell redirects that assume locale encoding |
| Update README links in the same PR with a UTF-8-safe tool | Re-save entire README from a mis-encoded buffer |

## After editing docs with non-ASCII literals

Spot-check that literals still appear correctly (not `???`). If matches appear after your edit, **restore from git** and re-apply changes with a UTF-8-safe method.

## IDE / repo

Keep **`.editorconfig`** `charset = utf-8` for text files. Keep files UTF-8 (no BOM required for `.md` / `.ts`).
