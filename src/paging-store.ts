import {
	createDerivedStore,
	createStoragePersistor,
	createStore,
	type CreateStoreOptions,
	type StoreReadable,
} from "@marianmeres/store";

/**
 * Input data for paging calculations.
 */
export interface PagingData {
	/** Total number of items in the dataset. */
	total: number;
	/** Number of items per page (a.k.a. page size). */
	limit: number;
	/** Number of items to skip from the beginning. */
	offset: number;
}

/**
 * Result of paging calculations containing all navigation metadata.
 */
export interface PagingCalcResult {
	/** Total number of items in the dataset. */
	total: number;
	/** Number of items per page. */
	limit: number;
	/** Current offset as provided (normalized and clamped to the valid range). */
	offset: number;
	/** Canonical offset of the current page's first item (`(currentPage - 1) * limit`). */
	currentOffset: number;
	/** Whether the current page is the last page. */
	isLast: boolean;
	/** Whether the current page is the first page. */
	isFirst: boolean;
	/** Next page number, or `false` if on the last page. */
	nextPage: number | false;
	/** Previous page number, or `false` if on the first page. */
	previousPage: number | false;
	/** Whether there is a next page. */
	hasNext: boolean;
	/** Whether there is a previous page. */
	hasPrevious: boolean;
	/**
	 * Offset to navigate to the next page, or the current page's canonical offset when
	 * there is no next page (safe fallback — check `hasNext` to distinguish).
	 */
	nextOffset: number;
	/**
	 * Offset to navigate to the previous page, or the current page's canonical offset
	 * when there is no previous page (safe fallback — check `hasPrevious` to distinguish).
	 */
	previousOffset: number;
	/** Current page number (1-indexed). */
	currentPage: number;
	/** Total number of pages. */
	pageCount: number;
	/** Offset value for the first page (always 0). */
	firstOffset: number;
	/** Offset value for the last page. */
	lastOffset: number;
}

/**
 * A reactive store that calculates and provides paging metadata.
 */
export interface PagingStore extends StoreReadable<PagingCalcResult> {
	/** Update paging data (total, limit, and/or offset). Values are normalized. */
	update: (pagingData: Partial<PagingData>) => void;
	/** Reset to the first page. Preserves `total`; optionally changes `limit`. */
	reset: (limit?: number) => void;
	/** Navigate to a specific 1-indexed page. Clamped to the valid page range. */
	setPage: (page: number) => void;
	/** Change the page size. Offset is preserved and re-clamped to the new page range. */
	setLimit: (limit: number) => void;
	/** Navigate to the next page, or no-op when already on the last page. */
	next: () => void;
	/** Navigate to the previous page, or no-op when already on the first page. */
	previous: () => void;
	/** Navigate to the first page. */
	first: () => void;
	/** Navigate to the last page. */
	last: () => void;
}

const _numberOr = (val: unknown, fallback = 0): number => {
	if (val === null || val === undefined || val === "") return fallback;
	const n = typeof val === "number" ? val : parseFloat(String(val));
	return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

const _normalize = (
	{ total, limit, offset }: Partial<PagingData> = {},
	defaultLimit?: number,
): PagingData => {
	const t = Math.max(0, _numberOr(total, 0));
	// Treat limit <= 0 (including an explicit 0) the same as "unset" — fall back to
	// defaultLimit (or 10). The final Math.max(1, …) only guards a negative default.
	const rawLimit = _numberOr(limit, NaN);
	const l = Math.max(
		1,
		rawLimit > 0 ? rawLimit : _numberOr(defaultLimit, 10),
	);
	let o = Math.max(0, _numberOr(offset, 0));
	// Clamp an out-of-range offset to the last page's canonical offset. Covers:
	//   - total shrank below persisted offset
	//   - caller passed an offset past the dataset
	// Offsets within the current dataset (including non-page-aligned ones like 23
	// for total=25, limit=10) are preserved.
	if (t > 0) {
		if (o >= t) o = (Math.ceil(t / l) - 1) * l;
	} else {
		o = 0;
	}
	return { total: t, limit: l, offset: o };
};

/**
 * Calculates the current page number (1-indexed) based on the offset.
 *
 * Inputs are normalized: negative values are clamped to 0 (for offset) or their minimum,
 * and non-numeric values fall back to defaults. An offset beyond the dataset is clamped
 * to the last page.
 *
 * @param pagingData - The paging data containing total, limit, and offset.
 * @returns The current page number (minimum 1).
 *
 * @example
 * ```ts
 * pagingGetPageByOffset({ total: 100, limit: 10, offset: 25 }); // returns 3
 * ```
 */
export const pagingGetPageByOffset = (pagingData: Partial<PagingData>): number => {
	const { limit, offset } = _normalize(pagingData);
	return Math.max(Math.ceil((offset + 1) / limit), 1);
};

/**
 * Calculates the offset for a given page number.
 *
 * Only `limit` is required; `total` and `offset` are used only as a fallback when `page`
 * is not a valid number (returns the current page's offset instead).
 *
 * @param pagingData - Partial paging data (at minimum, `limit`).
 * @param page - The target page number (1-indexed).
 * @returns The offset value for the given page (minimum 0).
 *
 * @example
 * ```ts
 * pagingGetOffsetByPage({ limit: 10 }, 3); // returns 20
 * ```
 */
export const pagingGetOffsetByPage = (
	pagingData: Partial<PagingData>,
	page: number,
): number => {
	const normalized = _normalize(pagingData);
	const p = _numberOr(page, pagingGetPageByOffset(normalized));
	return Math.max(normalized.limit * (p - 1), 0);
};

/**
 * Calculates comprehensive paging metadata from the given input.
 *
 * Values are normalized: total and offset have a minimum of 0, limit has a minimum of 1.
 * Missing values default to: total=0, limit=10, offset=0. An offset that lands past the
 * end of the dataset is clamped to the last page's canonical offset.
 *
 * @param pagingData - Partial paging data.
 * @returns Complete paging calculation result with navigation metadata.
 *
 * @example
 * ```ts
 * const paging = calculatePaging({ total: 100, limit: 10, offset: 20 });
 * console.log(paging.currentPage); // 3
 * console.log(paging.pageCount);   // 10
 * console.log(paging.hasNext);     // true
 * ```
 */
export const calculatePaging = (
	pagingData: Partial<PagingData> = {},
): PagingCalcResult => {
	const normalized = _normalize(pagingData);
	const { total, limit, offset } = normalized;

	const pageCount = Math.ceil(total / limit);
	const rawPage = pagingGetPageByOffset(normalized);
	// With offset clamped in _normalize, rawPage is already in [1, max(1, pageCount)].
	// The min() is a belt-and-braces guard so any future code path still yields a
	// consistent currentPage.
	const currentPage = pageCount > 0 ? Math.min(rawPage, pageCount) : 1;
	const currentOffset = (currentPage - 1) * limit;

	const isFirst = currentPage === 1;
	// When there are no pages (total=0), consider it the last page (nothing comes after).
	const isLast = pageCount === 0 || currentPage >= pageCount;

	const nextPage = !isLast ? currentPage + 1 : false;
	const hasNext = nextPage !== false;
	const nextOffset = hasNext ? currentPage * limit : currentOffset;

	const previousPage = !isFirst && pageCount > 0 ? currentPage - 1 : false;
	const hasPrevious = previousPage !== false;
	const previousOffset = hasPrevious ? (currentPage - 2) * limit : currentOffset;

	return {
		total,
		limit,
		offset,
		currentOffset,
		isLast,
		isFirst,
		nextPage,
		previousPage,
		hasNext,
		hasPrevious,
		nextOffset,
		previousOffset,
		currentPage,
		pageCount,
		firstOffset: 0,
		lastOffset: pagingGetOffsetByPage(normalized, pageCount),
	};
};

/**
 * Creates a reactive paging store that automatically calculates paging metadata
 * whenever the underlying data changes.
 *
 * @param pagingData - Initial paging data.
 * @param defaultLimit - Default page size (default: 10).
 * @param storeOptions - Optional store configuration (e.g., for persistence).
 * @returns A PagingStore with subscribe, get, update, reset, and navigation methods.
 *
 * @example
 * ```ts
 * const store = createPagingStore({ total: 100, limit: 10, offset: 0 });
 *
 * store.subscribe((paging) => {
 *   console.log(`Page ${paging.currentPage} of ${paging.pageCount}`);
 * });
 *
 * store.setPage(3);   // Navigate to page 3
 * store.next();       // Navigate to page 4
 * store.reset();      // Back to first page (preserves total)
 * ```
 */
export const createPagingStore = (
	pagingData: Partial<PagingData> = {},
	defaultLimit = 10,
	storeOptions: CreateStoreOptions<PagingData> | null = null,
): PagingStore => {
	const _data = createStore<PagingData>(
		_normalize(pagingData, defaultLimit),
		storeOptions,
	);
	const paging = createDerivedStore<PagingCalcResult, PagingData>(
		_data,
		(data) => calculatePaging(data),
	);

	const _update = (patch: Partial<PagingData>) =>
		_data.update((old) => _normalize({ ...old, ...patch }, defaultLimit));

	const setPage = (page: number) => {
		const { limit } = _data.get();
		_update({ offset: (Math.max(1, _numberOr(page, 1)) - 1) * limit });
	};

	return {
		subscribe: paging.subscribe,
		get: paging.get,
		update: _update,
		reset: (limit?: number) => {
			const current = _data.get();
			_data.set(
				_normalize(
					{ total: current.total, limit: limit ?? current.limit, offset: 0 },
					defaultLimit,
				),
			);
		},
		setPage,
		setLimit: (limit: number) => _update({ limit }),
		next: () => {
			const p = paging.get();
			if (p.hasNext) setPage(p.currentPage + 1);
		},
		previous: () => {
			const p = paging.get();
			if (p.hasPrevious) setPage(p.currentPage - 1);
		},
		first: () => setPage(1),
		last: () => {
			const p = paging.get();
			setPage(Math.max(1, p.pageCount));
		},
	};
};

/**
 * Creates a paging store with automatic browser storage persistence.
 *
 * @param key - Storage key for persistence.
 * @param storageType - Storage type: "local", "session", or "memory" (default: "session").
 * @param initial - Initial paging data (used if no persisted data exists).
 * @param defaultLimit - Default page size (default: 10).
 * @returns A PagingStore that automatically persists state changes.
 *
 * @example
 * ```ts
 * // State persists across page reloads
 * const store = createStoragePagingStore("my-list-paging", "local", { limit: 25 });
 * ```
 */
export function createStoragePagingStore(
	key: string,
	storageType: "local" | "session" | "memory" = "session",
	initial: Partial<PagingData> = {},
	defaultLimit = 10,
): PagingStore {
	const persistor = createStoragePersistor<PagingData>(key, storageType);
	return createPagingStore(persistor.get() || initial, defaultLimit, {
		persist: persistor.set,
	});
}
