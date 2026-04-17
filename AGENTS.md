# @marianmeres/paging-store — Agent Guide

## Quick Reference

- **Stack**: TypeScript paging metadata + reactive store
- **Runtime**: Deno, Node.js, Browser
- **Entry point**: `src/mod.ts` (re-exports `src/paging-store.ts`)
- **Dependencies**: `@marianmeres/store@^3`
- **Test**: `deno task test`
- **Build**: `deno task npm:build`
- **Publish**: `deno task publish`

## Project Structure

```
src/
  mod.ts             # Public entry point
  paging-store.ts    # All implementation and types
tests/
  paging-store.test.ts
scripts/
  build-npm.ts
```

## Public API

| Export | Kind | Purpose |
|---|---|---|
| `calculatePaging` | fn | Pure: compute metadata from `Partial<PagingData>` |
| `createPagingStore` | fn | Reactive store over `PagingData` with navigation helpers |
| `createStoragePagingStore` | fn | Convenience wrapper with local/session/memory persistence |
| `pagingGetPageByOffset` | fn | Utility: `offset → currentPage` (1-indexed) |
| `pagingGetOffsetByPage` | fn | Utility: `page → offset` |
| `PagingData` | interface | Input shape: `{ total, limit, offset }` |
| `PagingCalcResult` | interface | Full metadata result |
| `PagingStore` | interface | Store + navigation methods |

## Core Behaviors

### Normalization (applies everywhere)
Inputs pass through a single `_normalize` step before any computation:
1. `total` → `max(0, trunc(Number(val) || 0))`
2. `limit` → values `≤ 0` or non-numeric fall back to `defaultLimit` (or `10`); minimum `1`
3. `offset` → clamped to `[0, (pageCount - 1) * limit]`; when `total = 0`, forced to `0`
4. Numeric coercion uses `parseFloat` + `Math.trunc`: `"1e3"` → `1000`, `10.9` → `10`,
   non-finite → fallback. Explicit `null`/`undefined`/`""` → fallback.

### Offset clamping is authoritative
If `offset ≥ total` (and `total > 0`), offset is snapped to `(pageCount - 1) * limit`.
This is why persisted stores self-correct after `total` shrinks — and why `isLast`,
`currentPage`, etc. remain internally consistent for any input.

### `calculatePaging` invariants
- `currentPage` is always in `[1, max(1, pageCount)]`
- `isLast = pageCount === 0 || currentPage >= pageCount`
- `nextPage = !isLast ? currentPage + 1 : false`; `previousPage` mirrors
- `nextOffset` / `previousOffset` fall back to `currentOffset` when no next/prev exists
  (check `hasNext` / `hasPrevious` to distinguish navigation from stay-put)
- `currentOffset = (currentPage - 1) * limit` — canonical, always page-aligned
- `offset` is preserved as-given (post-normalization), may be mid-page

### `createPagingStore`
- Writable `_data: PagingData` → derived `paging: PagingCalcResult` via single-source
  `createDerivedStore`
- All public writers funnel through `_update` which re-runs `_normalize`
- `reset(limit?)` **preserves `total`**; only `offset` (and optionally `limit`) change
- `setPage(page)` clamps `page` to `≥ 1`; over-large pages clamp via offset normalization
- `next`/`previous` are no-ops at edges
- `setLimit(limit)` preserves `offset`; `_normalize` re-clamps if needed

### Persistence
- `createStoragePagingStore(key, storageType, initial, defaultLimit)` wraps
  `createStoragePersistor` from `@marianmeres/store` and passes `persist` via
  `CreateStoreOptions`
- Stored state is **un-normalized on load**; normalization happens inside
  `createPagingStore`, so corrupt/stale persisted data self-heals on first access

## Critical Conventions

1. **Never compute paging metadata without `_normalize`.** Exported utilities
   (`pagingGetPageByOffset`, `pagingGetOffsetByPage`, `calculatePaging`) all normalize
   internally; keep it that way.
2. **Keep `offset` and `currentOffset` distinct** in the result. `offset` = user-provided
   (clamped). `currentOffset` = canonical page start. Do not collapse them.
3. **`reset()` must not discard `total`.** Behavior pre-v3 was buggy; don't regress.
4. **All new methods on `PagingStore`** must go through `_update`/`_data.update` to
   guarantee normalization on every write.
5. Derived store uses the single-source overload: `createDerivedStore<T, S>(store, fn)`.
   The array overload infers `unknown` under strict type-check in v3 of the store lib.

## Before Making Changes

- [ ] Read `src/paging-store.ts` — single file, ~280 lines
- [ ] `deno task test` before and after (20 tests)
- [ ] If adding fields to `PagingCalcResult`, update:
      - README "Types" + result example
      - test constants `FIRST`, `MIDDLE`, `LAST` (JSON.stringify equality is order-sensitive)
- [ ] If adding methods to `PagingStore`, update README + this file
- [ ] If changing normalization semantics, add a test for the edge case and note it
      in the README "Breaking changes" section

## Documentation Index

- [README.md](README.md) — user-facing API + normalization rules + BC notes
- [mcp-include.txt](mcp-include.txt) — short blurb surfaced via MCP
