import { createDerivedStore, createStore, StoreReadable } from '@marianmeres/store';

export interface PagingData {
	total: number;
	limit: number; // a.k.a. "items per page"
	offset: number;
}

export interface PagingCalcResult {
	total: number;
	limit: number;
	offset: number;
	isLast: boolean;
	isFirst: boolean;
	nextPage: number | false;
	previousPage: number | false;
	hasNext: boolean;
	hasPrevious: boolean;
	nextOffset: number;
	previousOffset: number;
	currentPage: number | false;
	pageCount: number;
	firstOffset: number;
	lastOffset: number;
}

export interface PagingStore extends StoreReadable<PagingCalcResult> {
	update: (pagingData: Partial<PagingData>) => void;
	reset: (limit?) => void;
}

const _numberOr = (val, fallback = 0) => {
	val = parseInt(val, 10);
	return Number.isNaN(val) ? fallback : val;
};

const _normalize = (
	{ total, limit, offset }: Partial<PagingData> = {},
	defaultLimit?
): PagingData => {
	total = _numberOr(total, 0);
	limit = _numberOr(limit, _numberOr(defaultLimit, 10));
	offset = _numberOr(offset, 0);
	return { total, limit, offset };
};

const _pagingGetPageByOffset = ({ total, limit, offset }: PagingData) => {
	// if negative just subtract from total
	if (offset < 0) {
		offset = Math.max(0, total + offset);
	}
	// OFFSET says to skip that many rows before beginning to return rows.
	offset++;
	return Math.max(Math.ceil(offset / limit), 1);
};

const _pagingGetOffsetByPage = ({ total, limit, offset }: PagingData, page: number) => {
	page = _numberOr(page, _pagingGetPageByOffset({ total, limit, offset }));
	return Math.max(limit * (page - 1), 0);
};

export const calculatePaging = (
	pagingData: Partial<PagingData> = {}
): PagingCalcResult => {
	pagingData = _normalize(pagingData);
	const { total, limit, offset } = pagingData;

	//
	const pageCount = Math.ceil(total / limit);
	const currentPage = _pagingGetPageByOffset(pagingData as PagingData);
	const isLast = currentPage === pageCount;
	const isFirst = currentPage === 1;

	//
	const nextPage = pageCount >= currentPage + 1 ? currentPage + 1 : false;
	const hasNext = nextPage !== false;
	const nextOffset = (hasNext ? currentPage : currentPage - 1) * limit;

	//
	let _previousPage = Math.max(0, Math.min(currentPage - 1, pageCount - 1));
	const previousPage = _previousPage !== 0 ? _previousPage : false;
	const hasPrevious = previousPage !== false;
	const previousOffset = previousPage === false ? 0 : (previousPage - 1) * limit;

	//
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
		lastOffset: _pagingGetOffsetByPage(pagingData as PagingData, pageCount),
	};
};

export const createPagingStore = (
	pagingData: Partial<PagingData> = {},
	defaultLimit = 10
): PagingStore => {
	const _data = createStore<PagingData>(_normalize(pagingData, defaultLimit));
	const paging = createDerivedStore<PagingCalcResult>([_data], ([data]) =>
		calculatePaging(data)
	);

	return {
		subscribe: paging.subscribe,
		get: paging.get,
		update: (data: Partial<PagingData>) =>
			_data.update((old) => _normalize({ ...old, ...data }, defaultLimit)),
		reset: (limit = null) => _data.set(_normalize({}, limit || defaultLimit)),
	};
};
