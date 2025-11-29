import { assert } from "@std/assert";
import { createStoragePersistor } from "@marianmeres/store";
import { calculatePaging, createPagingStore, type PagingData } from "../src/mod.ts";

const _ = {
	isEqual: (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b),
};

const FIRST = {
	total: 25,
	limit: 10,
	offset: 0,
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

	const log: any[] = [];
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
	assert(persistor.__raw().get("foo")?.total === 25);
});

Deno.test("edge case: total=0", () => {
	const p = calculatePaging({ total: 0, limit: 10, offset: 0 });

	assert(p.total === 0);
	assert(p.pageCount === 0);
	assert(p.currentPage === 1);
	assert(p.isFirst === true);
	assert(p.isLast === true); // No pages means we're at the end
	assert(p.hasNext === false);
	assert(p.hasPrevious === false);
});

Deno.test("edge case: limit=0 is normalized to 1", () => {
	const p = calculatePaging({ total: 10, limit: 0, offset: 0 });

	assert(p.limit === 1);
	assert(p.pageCount === 10);
});

Deno.test("edge case: negative values are normalized", () => {
	const p = calculatePaging({ total: -5, limit: -3, offset: -2 });

	assert(p.total === 0);
	assert(p.limit === 1);
	assert(p.offset === 0);
});
