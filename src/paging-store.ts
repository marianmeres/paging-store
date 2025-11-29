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
	/** Current offset from the beginning. */
	offset: number;
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
	/** Offset value to navigate to the next page. */
	nextOffset: number;
	/** Offset value to navigate to the previous page. */
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
	/** Update paging data (total, limit, and/or offset). */
	update: (pagingData: Partial<PagingData>) => void;
	/** Reset to initial state with optional new limit. */
	reset: (limit?: number) => void;
}

const _numberOr = (val: unknown, fallback = 0): number => {
	const parsed = parseInt(String(val), 10);
	return Number.isNaN(parsed) ? fallback : parsed;
};

const _normalize = (
	{ total, limit, offset }: Partial<PagingData> = {},
	defaultLimit?: number,
): PagingData => {
	return {
		total: Math.max(0, _numberOr(total, 0)),
		limit: Math.max(1, _numberOr(limit, _numberOr(defaultLimit, 10))),
		offset: Math.max(0, _numberOr(offset, 0)),
	};
};

/**
 * Calculates the current page number (1-indexed) based on the offset.
 *
 * @param pagingData - The paging data containing total, limit, and offset.
 * @returns The current page number (minimum 1).
 *
 * @example
 * ```ts
 * pagingGetPageByOffset({ total: 100, limit: 10, offset: 25 }); // returns 3
 * ```
 */
export const pagingGetPageByOffset = ({ total, limit, offset }: PagingData): number => {
	// If negative, subtract from total
	if (offset < 0) {
		offset = Math.max(0, total + offset);
	}
	// Offset says to skip that many rows before beginning to return rows
	offset++;
	return Math.max(Math.ceil(offset / limit), 1);
};

/**
 * Calculates the offset for a given page number.
 *
 * @param pagingData - The paging data containing limit (total and offset are unused but kept for API consistency).
 * @param page - The target page number (1-indexed).
 * @returns The offset value for the given page.
 *
 * @example
 * ```ts
 * pagingGetOffsetByPage({ total: 100, limit: 10, offset: 0 }, 3); // returns 20
 * ```
 */
export const pagingGetOffsetByPage = (
	{ total, limit, offset }: PagingData,
	page: number,
): number => {
	page = _numberOr(page, pagingGetPageByOffset({ total, limit, offset }));
	return Math.max(limit * (page - 1), 0);
};

/**
 * Calculates comprehensive paging metadata from the given input.
 *
 * Values are normalized: total and offset have a minimum of 0, limit has a minimum of 1.
 * Missing values default to: total=0, limit=10, offset=0.
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
	const currentPage = pagingGetPageByOffset(normalized);
	const isFirst = currentPage === 1;
	// When there are no pages (total=0), consider it the last page (nothing comes after)
	const isLast = pageCount === 0 || currentPage === pageCount;

	const nextPage = pageCount >= currentPage + 1 ? currentPage + 1 : false;
	const hasNext = nextPage !== false;
	const nextOffset = (hasNext ? currentPage : currentPage - 1) * limit;

	const _previousPage = Math.max(0, Math.min(currentPage - 1, pageCount - 1));
	const previousPage = _previousPage !== 0 ? _previousPage : false;
	const hasPrevious = previousPage !== false;
	const previousOffset = previousPage === false ? 0 : (previousPage - 1) * limit;

	return {
		total,
		limit,
		offset,
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
 * @returns A PagingStore with subscribe, get, update, and reset methods.
 *
 * @example
 * ```ts
 * const store = createPagingStore({ total: 100, limit: 10, offset: 0 });
 *
 * store.subscribe((paging) => {
 *   console.log(`Page ${paging.currentPage} of ${paging.pageCount}`);
 * });
 *
 * store.update({ offset: 20 }); // Navigate to page 3
 * store.reset(); // Reset to first page
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
	const paging = createDerivedStore<PagingCalcResult>(
		[_data],
		([data]) => calculatePaging(data),
	);

	return {
		subscribe: paging.subscribe,
		get: paging.get,
		update: (data: Partial<PagingData>) =>
			_data.update((old) => _normalize({ ...old, ...data }, defaultLimit)),
		reset: (limit?: number) => _data.set(_normalize({}, limit ?? defaultLimit)),
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
