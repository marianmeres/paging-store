# @marianmeres/paging-store

A simple utility for calculating paging metadata from offset-based pagination data. Works
with any UI framework and includes a reactive store for state management.

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

// Reactive store
const store = createPagingStore({ total: 100, limit: 10, offset: 0 });
store.subscribe((paging) => {
	console.log(`Page ${paging.currentPage} of ${paging.pageCount}`);
});
store.update({ offset: 20 }); // Navigate to page 3
```

## API Reference

### `calculatePaging(pagingData?)`

Calculates comprehensive paging metadata from the given input.

**Parameters:**

- `pagingData` - Optional partial paging data
  - `total` - Total number of items (default: 0)
  - `limit` - Items per page (default: 10)
  - `offset` - Items to skip (default: 0)

**Returns:** `PagingCalcResult`

```typescript
const paging = calculatePaging({ total: 25, limit: 10, offset: 11 });

// Result:
{
  total: 25,
  limit: 10,
  offset: 11,
  currentPage: 2,
  pageCount: 3,
  isFirst: false,
  isLast: false,
  hasNext: true,
  hasPrevious: true,
  nextPage: 3,        // or false if on last page
  previousPage: 1,    // or false if on first page
  nextOffset: 20,
  previousOffset: 0,
  firstOffset: 0,
  lastOffset: 20,
}
```

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

// Get current value
const current = store.get();

// Update paging data (partial updates supported)
store.update({ offset: 20 });
store.update({ total: 150 });

// Reset to first page
store.reset();
store.reset(25); // Reset with new limit

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
// State persists across page reloads
const store = createStoragePagingStore("users-list-paging", "local", { limit: 25 });
```

### `pagingGetPageByOffset(pagingData)`

Utility function to calculate the current page number (1-indexed) based on the offset.

```typescript
pagingGetPageByOffset({ total: 100, limit: 10, offset: 25 }); // returns 3
```

### `pagingGetOffsetByPage(pagingData, page)`

Utility function to calculate the offset for a given page number.

```typescript
pagingGetOffsetByPage({ total: 100, limit: 10, offset: 0 }, 3); // returns 20
```

## Types

### `PagingData`

```typescript
interface PagingData {
	total: number; // Total number of items
	limit: number; // Items per page
	offset: number; // Items to skip
}
```

### `PagingCalcResult`

```typescript
interface PagingCalcResult {
	total: number;
	limit: number;
	offset: number;
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
}
```

## License

MIT
