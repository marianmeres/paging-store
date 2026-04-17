# @marianmeres/paging-store

A simple utility for calculating paging metadata from offset-based pagination data. Works
with any UI framework and includes a reactive store with navigation helpers and optional
persistence.

## Installation

```shell
npm install @marianmeres/paging-store
```

```shell
deno add jsr:@marianmeres/paging-store
```

## Quick Start

```typescript
import { calculatePaging, createPagingStore } from "@marianmeres/paging-store";

// Simple calculation
const paging = calculatePaging({ total: 100, limit: 10, offset: 20 });
console.log(paging.currentPage); // 3
console.log(paging.pageCount); // 10

// Reactive store with navigation helpers
const store = createPagingStore({ total: 100, limit: 10, offset: 0 });
store.subscribe((paging) => {
	console.log(`Page ${paging.currentPage} of ${paging.pageCount}`);
});
store.setPage(3);       // → page 3
store.next();           // → page 4
store.setLimit(25);     // change page size
store.reset();          // back to page 1, keeps total
```

## API Reference

### `calculatePaging(pagingData?)`

Calculates comprehensive paging metadata from the given input.

**Parameters:**

- `pagingData` - Optional partial paging data
  - `total` - Total number of items (default: 0)
  - `limit` - Items per page (default: 10; values ≤ 0 fall back to the default)
  - `offset` - Items to skip (default: 0; values ≥ `total` are clamped to the last page)

**Returns:** `PagingCalcResult`

```typescript
const paging = calculatePaging({ total: 25, limit: 10, offset: 11 });

// Result:
{
  total: 25,
  limit: 10,
  offset: 11,          // as provided (normalized/clamped to valid range)
  currentOffset: 10,   // canonical offset of the current page's first item
  currentPage: 2,
  pageCount: 3,
  isFirst: false,
  isLast: false,
  hasNext: true,
  hasPrevious: true,
  nextPage: 3,         // or false if on last page
  previousPage: 1,     // or false if on first page
  nextOffset: 20,      // or currentOffset when !hasNext (safe fallback)
  previousOffset: 0,   // or currentOffset when !hasPrevious (safe fallback)
  firstOffset: 0,
  lastOffset: 20,
}
```

**Note on `offset` vs `currentOffset`:** `offset` is the value you passed in (after
normalization). `currentOffset` is always the canonical start of the current page
(`(currentPage - 1) * limit`). They differ whenever the input offset lands mid-page
(e.g. `offset: 11` with `limit: 10` → `currentOffset: 10`). Bind data-fetching to
`currentOffset` to guarantee page-aligned fetches; bind UI highlight state to whichever
matches your semantics.

### `createPagingStore(pagingData?, defaultLimit?, storeOptions?)`

Creates a reactive store that automatically calculates paging metadata whenever the
underlying data changes.

**Parameters:**

- `pagingData` - Initial paging data (default: `{}`)
- `defaultLimit` - Default page size (default: 10)
- `storeOptions` - Optional store configuration for persistence

**Returns:** `PagingStore`

```typescript
const store = createPagingStore({ total: 100, limit: 10, offset: 0 });

// Subscribe to changes
const unsubscribe = store.subscribe((paging) => {
	console.log(`Page ${paging.currentPage} of ${paging.pageCount}`);
});

// Read current value
const current = store.get();

// Partial updates
store.update({ offset: 20 });
store.update({ total: 150 });

// Navigation helpers
store.setPage(3);        // jump to a specific page (clamped to [1, pageCount])
store.next();            // no-op if already on the last page
store.previous();        // no-op if already on the first page
store.first();           // → page 1
store.last();            // → last page
store.setLimit(25);      // change page size; offset preserved and re-clamped

// Reset to first page (keeps total; optionally changes limit)
store.reset();
store.reset(25);

// Cleanup
unsubscribe();
```

### `createStoragePagingStore(key, storageType?, initial?, defaultLimit?)`

Creates a paging store with automatic browser storage persistence.

**Parameters:**

- `key` - Storage key for persistence
- `storageType` - `"local"`, `"session"`, or `"memory"` (default: `"session"`)
- `initial` - Initial paging data if no persisted data exists (default: `{}`)
- `defaultLimit` - Default page size (default: 10)

**Returns:** `PagingStore`

```typescript
// State persists across page reloads. If total shrinks below the persisted offset
// (e.g. after filtering), the store self-corrects on the next update.
const store = createStoragePagingStore("users-list-paging", "local", { limit: 25 });
```

### `pagingGetPageByOffset(pagingData)`

Calculates the current page number (1-indexed) from a partial paging data object.
Normalizes inputs the same way as `calculatePaging`.

```typescript
pagingGetPageByOffset({ total: 100, limit: 10, offset: 25 }); // 3
pagingGetPageByOffset({ limit: 0, offset: 25 });              // still works (limit defaults)
```

### `pagingGetOffsetByPage(pagingData, page)`

Calculates the offset for a given page number. Only `limit` is required.

```typescript
pagingGetOffsetByPage({ limit: 10 }, 3); // 20
```

If `page` is not a finite number, the function falls back to the current page's offset
(requires `offset`/`total` to be provided).

## Types

### `PagingData`

```typescript
interface PagingData {
	total: number;  // Total number of items
	limit: number;  // Items per page
	offset: number; // Items to skip
}
```

### `PagingCalcResult`

```typescript
interface PagingCalcResult {
	total: number;
	limit: number;
	offset: number;
	currentOffset: number;
	currentPage: number;
	pageCount: number;
	isFirst: boolean;
	isLast: boolean;
	hasNext: boolean;
	hasPrevious: boolean;
	nextPage: number | false;
	previousPage: number | false;
	nextOffset: number;
	previousOffset: number;
	firstOffset: number;
	lastOffset: number;
}
```

### `PagingStore`

```typescript
interface PagingStore {
	subscribe: (callback: (value: PagingCalcResult) => void) => () => void;
	get: () => PagingCalcResult;
	update: (pagingData: Partial<PagingData>) => void;
	reset: (limit?: number) => void;
	setPage: (page: number) => void;
	setLimit: (limit: number) => void;
	next: () => void;
	previous: () => void;
	first: () => void;
	last: () => void;
}
```

## Normalization rules

All inputs go through a single normalization step:

| Field    | Rule                                                                       |
|----------|----------------------------------------------------------------------------|
| `total`  | clamped to `≥ 0`; non-numeric → `0`                                        |
| `limit`  | values `≤ 0` or non-numeric → `defaultLimit` (or `10`); minimum is `1`     |
| `offset` | clamped to `[0, (pageCount - 1) * limit]`; when `total = 0`, offset is `0` |
| all      | decimals truncated (`10.9` → `10`); `"1e3"` → `1000`                       |

## Breaking changes in v3.0.0

> These are intentional behavior fixes. If you relied on any of the old behavior, adjust
> accordingly. See the release commit for the full diff.

1. **`reset()` preserves `total` and `limit`**. Previously, `reset()` zeroed out `total`
   and restored `defaultLimit`; it now only resets `offset` to `0`. Use
   `update({ total: 0, offset: 0 })` for the old behavior. `reset(newLimit)` still
   changes `limit`.
2. **`offset` is clamped to the valid range** (`0 … (pageCount - 1) * limit`) during
   normalization. Previously, out-of-range offsets produced inconsistent metadata
   (e.g. `isLast: false` with `hasNext: false`). Persisted stores now self-correct when
   `total` shrinks below the persisted `offset`.
3. **`isLast`** is now `true` whenever the current page is at or past `pageCount`
   (previously only exact equality).
4. **`limit: 0`** (explicit zero) now falls back to `defaultLimit` instead of being
   silently coerced to `1`.
5. **`pagingGetPageByOffset`** no longer treats a negative `offset` as "from the end of
   the dataset" (undocumented SQL-style behavior). Negative offsets clamp to `0`.
6. **Numeric parsing** uses `parseFloat` + `Math.trunc` instead of `parseInt`.
   `"1e3"` now parses as `1000` (was `1`). Decimal truncation is unchanged.
7. **`PagingCalcResult.currentOffset`** is a new field. If you JSON-compared result
   objects against hand-written snapshots, update the snapshots.
8. **`PagingStore`** gained `setPage`, `setLimit`, `next`, `previous`, `first`, `last`.
   Any custom implementations of the `PagingStore` interface must add these methods.

## License

MIT
