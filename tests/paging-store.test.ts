import path from 'node:path';
import _ from 'lodash';
import { strict as assert } from 'node:assert';
import { fileURLToPath } from 'node:url';
import { createClog } from '@marianmeres/clog';
import { TestRunner } from '@marianmeres/test-runner';
import { calculatePaging, createPagingStore } from '../src/index.js';

const clog = createClog(path.basename(fileURLToPath(import.meta.url)));
const suite = new TestRunner(path.basename(fileURLToPath(import.meta.url)));

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

suite.test('calculate paging 1', async () => {
	let p = calculatePaging({ total: 25, limit: 10, offset: 0 });
	delete (p as any).previosOffset; // bc issue hack
	assert(_.isEqual(p, FIRST));
});

suite.test('calculate paging 2', async () => {
	let p = calculatePaging({ total: 25, limit: 10, offset: 11 });
	delete (p as any).previosOffset; // bc issue hack
	assert(_.isEqual(p, MIDDLE));
});

suite.test('calculate paging 3', async () => {
	let p = calculatePaging({ total: 25, limit: 10, offset: 23 });
	delete (p as any).previosOffset; // bc issue hack
	assert(_.isEqual(p, LAST));
});

suite.test('store', () => {
	const s = createPagingStore({ total: 25, limit: 10, offset: 0 });

	const log: any[] = [];
	const unsub = s.subscribe((p) => {
		delete (p as any).previosOffset; // bc issue hack
		log.push(p);
	});

	s.update({ total: 25, limit: 10, offset: 11 });
	s.update({ total: 25, limit: 10, offset: 23 });

	assert(_.isEqual(log, [FIRST, MIDDLE, LAST]));

	unsub();
});

export default suite;
