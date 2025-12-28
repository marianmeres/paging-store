import { createDerivedStore, createStoragePersistor, createStore, } from "@marianmeres/store";
const _numberOr = (val, fallback = 0) => {
    const parsed = parseInt(String(val), 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};
const _normalize = ({ total, limit, offset } = {}, defaultLimit) => {
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
export const pagingGetPageByOffset = ({ total, limit, offset }) => {
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
export const pagingGetOffsetByPage = ({ total, limit, offset }, page) => {
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
export const calculatePaging = (pagingData = {}) => {
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
export const createPagingStore = (pagingData = {}, defaultLimit = 10, storeOptions = null) => {
    const _data = createStore(_normalize(pagingData, defaultLimit), storeOptions);
    const paging = createDerivedStore([_data], ([data]) => calculatePaging(data));
    return {
        subscribe: paging.subscribe,
        get: paging.get,
        update: (data) => _data.update((old) => _normalize({ ...old, ...data }, defaultLimit)),
        reset: (limit) => _data.set(_normalize({}, limit ?? defaultLimit)),
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
export function createStoragePagingStore(key, storageType = "session", initial = {}, defaultLimit = 10) {
    const persistor = createStoragePersistor(key, storageType);
    return createPagingStore(persistor.get() || initial, defaultLimit, {
        persist: persistor.set,
    });
}
