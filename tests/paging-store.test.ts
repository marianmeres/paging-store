import { assert } from "@std/assert";
import { createStoragePersistor } from "@marianmeres/store";
import {
	calculatePaging,
	createPagingStore,
	type PagingCalcResult,
	type PagingData,
	pagingGetOffsetByPage,
	pagingGetPageByOffset,
} from "../src/mod.ts";

const _ = {
	isEqual: (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b),
};

const FIRST = {
	total: 25,
	limit: 10,
	offset: 0,
	currentOffset: 0,
	isLast: false,
	isFirst: true,
	nextPage: 2,
	previousPage: false,
	hasNext: true,
	hasPrevious: false,
	nextOffset: 10,
	previousOffset: 0,
	currentPage: 1,
	pageCount: 3,
	firstOffset: 0,
	lastOffset: 20,
};

const MIDDLE = {
	total: 25,
	limit: 10,
	offset: 11,
	currentOffset: 10,
	isLast: false,
	isFirst: false,
	nextPage: 3,
	previousPage: 1,
	hasNext: true,
	hasPrevious: true,
	nextOffset: 20,
	previousOffset: 0,
	currentPage: 2,
	pageCount: 3,
	firstOffset: 0,
	lastOffset: 20,
};

const LAST = {
	total: 25,
	limit: 10,
	offset: 23,
	currentOffset: 20,
	isLast: true,
	isFirst: false,
	nextPage: false,
	previousPage: 2,
	hasNext: false,
	hasPrevious: true,
	nextOffset: 20,
	previousOffset: 10,
	currentPage: 3,
	pageCount: 3,
	firstOffset: 0,
	lastOffset: 20,
};

Deno.test("calculate paging 1", () => {
	const p = calculatePaging({ total: 25, limit: 10, offset: 0 });
	assert(_.isEqual(p, FIRST));
});

Deno.test("calculate paging 2", () => {
	const p = calculatePaging({ total: 25, limit: 10, offset: 11 });
	assert(_.isEqual(p, MIDDLE));
});

Deno.test("calculate paging 3", () => {
	const p = calculatePaging({ total: 25, limit: 10, offset: 23 });
	assert(_.isEqual(p, LAST));
});

Deno.test("store", () => {
	const s = createPagingStore({ total: 25, limit: 10, offset: 0 });

	const log: PagingCalcResult[] = [];
	const unsub = s.subscribe((p) => {
		log.push(p);
	});

	s.update({ total: 25, limit: 10, offset: 11 });
	s.update({ total: 25, limit: 10, offset: 23 });

	assert(_.isEqual(log, [FIRST, MIDDLE, LAST]));

	unsub();
});

Deno.test("persisted", () => {
	const persistor = createStoragePersistor<PagingData>("foo", "memory");
	persistor.set({ total: 25, limit: 10, offset: 5 });

	const store = createPagingStore(persistor.get() || {}, undefined, {
		persist: persistor.set,
	});

	assert(store.get().total === 25);
	const raw = persistor.__raw() as Map<string, PagingData>;
	assert(raw.get("foo")?.total === 25);
});

Deno.test("edge case: total=0", () => {
	const p = calculatePaging({ total: 0, limit: 10, offset: 0 });

	assert(p.total === 0);
	assert(p.pageCount === 0);
	assert(p.currentPage === 1);
	assert(p.currentOffset === 0);
	assert(p.isFirst === true);
	assert(p.isLast === true); // No pages means we're at the end
	assert(p.hasNext === false);
	assert(p.hasPrevious === false);
});

Deno.test("edge case: limit=0 is normalized to default", () => {
	const p = calculatePaging({ total: 10, limit: 0, offset: 0 });

	assert(p.limit === 10); // default
	assert(p.pageCount === 1);
});

Deno.test("edge case: negative values are normalized", () => {
	const p = calculatePaging({ total: -5, limit: -3, offset: -2 });

	assert(p.total === 0);
	assert(p.limit === 10); // non-positive → default
	assert(p.offset === 0);
});

Deno.test("edge case: offset beyond dataset is clamped to last page", () => {
	const p = calculatePaging({ total: 25, limit: 10, offset: 100 });

	assert(p.pageCount === 3);
	assert(p.currentPage === 3);
	assert(p.offset === 20); // clamped
	assert(p.currentOffset === 20);
	assert(p.isLast === true);
	assert(p.isFirst === false);
	assert(p.hasNext === false);
	assert(p.hasPrevious === true);
});

Deno.test("edge case: offset == total is clamped to last page", () => {
	const p = calculatePaging({ total: 25, limit: 10, offset: 25 });
	assert(p.offset === 20);
	assert(p.currentPage === 3);
	assert(p.isLast === true);
});

Deno.test("total shrinks below persisted offset → store self-corrects", () => {
	const s = createPagingStore({ total: 100, limit: 10, offset: 80 });
	assert(s.get().currentPage === 9);

	s.update({ total: 30 });
	const snap = s.get();
	assert(snap.total === 30);
	assert(snap.offset === 20); // clamped to last page
	assert(snap.currentPage === 3);
	assert(snap.isLast === true);
});

Deno.test("pagingGetPageByOffset handles edge inputs", () => {
	// limit=0 normalizes to default (10); offset 25 → page 3
	assert(pagingGetPageByOffset({ total: 100, limit: 0, offset: 25 }) === 3);
	// negative offset clamps to 0 → page 1 (no SQL-style "from end")
	assert(pagingGetPageByOffset({ total: 100, limit: 10, offset: -10 }) === 1);
	// empty input → page 1
	assert(pagingGetPageByOffset({}) === 1);
});

Deno.test("pagingGetOffsetByPage handles edge inputs", () => {
	assert(pagingGetOffsetByPage({ limit: 10 }, 3) === 20);
	assert(pagingGetOffsetByPage({ limit: 10 }, 1) === 0);
	// page=0 floors to 0 offset
	assert(pagingGetOffsetByPage({ limit: 10 }, 0) === 0);
	// NaN page falls back to current page's offset
	const off = pagingGetOffsetByPage({ total: 25, limit: 10, offset: 15 }, NaN);
	assert(off === 10);
});

Deno.test("_numberOr: parses scientific notation and decimals", () => {
	// "1e3" → 1000 (not 1 as parseInt would give)
	assert(
		calculatePaging({ total: "1e3" as unknown as number, limit: 100 }).total === 1000,
	);
	// decimals truncate
	assert(calculatePaging({ total: 10.9 as number, limit: 5 }).total === 10);
});

Deno.test("reset preserves total", () => {
	const s = createPagingStore({ total: 100, limit: 10, offset: 50 });
	s.reset();
	const snap = s.get();
	assert(snap.total === 100);
	assert(snap.offset === 0);
	assert(snap.limit === 10);
	assert(snap.currentPage === 1);
});

Deno.test("reset(newLimit) updates limit and preserves total", () => {
	const s = createPagingStore({ total: 100, limit: 10, offset: 50 });
	s.reset(25);
	const snap = s.get();
	assert(snap.total === 100);
	assert(snap.limit === 25);
	assert(snap.offset === 0);
});

Deno.test("setPage navigates to given page and clamps out-of-range", () => {
	const s = createPagingStore({ total: 100, limit: 10, offset: 0 });

	s.setPage(5);
	assert(s.get().currentPage === 5);
	assert(s.get().offset === 40);

	// Out-of-range pages: setPage computes offset directly, which then clamps via
	// _normalize. For page 99 → offset=980 → clamped to 90 (last page).
	s.setPage(99);
	assert(s.get().currentPage === 10);
	assert(s.get().offset === 90);

	// page=0 or negative → min page 1
	s.setPage(0);
	assert(s.get().currentPage === 1);
});

Deno.test("next/previous navigate one page and no-op at edges", () => {
	const s = createPagingStore({ total: 25, limit: 10, offset: 0 });

	s.next();
	assert(s.get().currentPage === 2);
	s.next();
	assert(s.get().currentPage === 3);
	s.next(); // no-op
	assert(s.get().currentPage === 3);

	s.previous();
	assert(s.get().currentPage === 2);
	s.previous();
	assert(s.get().currentPage === 1);
	s.previous(); // no-op
	assert(s.get().currentPage === 1);
});

Deno.test("first/last jump to the expected page", () => {
	const s = createPagingStore({ total: 25, limit: 10, offset: 11 });

	s.first();
	assert(s.get().currentPage === 1);

	s.last();
	assert(s.get().currentPage === 3);
	assert(s.get().offset === 20);

	// total=0 → last() still safe (page 1)
	const empty = createPagingStore({ total: 0, limit: 10, offset: 0 });
	empty.last();
	assert(empty.get().currentPage === 1);
});

Deno.test("setLimit changes page size, offset re-clamps", () => {
	const s = createPagingStore({ total: 100, limit: 10, offset: 50 });
	// Current: page 6 of 10

	s.setLimit(25);
	// offset=50 stays (50 < 100), new pageCount=4, currentPage = ceil(51/25) = 3
	assert(s.get().limit === 25);
	assert(s.get().offset === 50);
	assert(s.get().currentPage === 3);

	s.setLimit(50);
	// offset=50 stays, pageCount=2, currentPage = ceil(51/50) = 2
	assert(s.get().limit === 50);
	assert(s.get().offset === 50);
	assert(s.get().currentPage === 2);
});
