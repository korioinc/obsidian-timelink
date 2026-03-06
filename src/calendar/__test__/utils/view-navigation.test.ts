/* eslint-disable import/no-nodejs-modules */
import { shiftDateByViewMode } from '../../../shared/event/model-utils.ts';
import assert from 'node:assert/strict';
import test from 'node:test';

void test('shiftDateByViewMode moves one month in month mode', () => {
	const date = new Date(2026, 2, 15);
	const next = shiftDateByViewMode(date, 'month', 'next');
	const prev = shiftDateByViewMode(date, 'month', 'prev');

	assert.equal(next.getFullYear(), 2026);
	assert.equal(next.getMonth(), 3);
	assert.equal(next.getDate(), 15);
	assert.equal(prev.getMonth(), 1);
});

void test('shiftDateByViewMode moves seven days in week mode', () => {
	const date = new Date(2026, 2, 15);
	const next = shiftDateByViewMode(date, 'week', 'next');
	const prev = shiftDateByViewMode(date, 'week', 'prev');

	assert.equal(next.getDate(), 22);
	assert.equal(prev.getDate(), 8);
});

void test('shiftDateByViewMode moves seven days in list mode', () => {
	const date = new Date(2026, 2, 15);
	const next = shiftDateByViewMode(date, 'list', 'next');
	const prev = shiftDateByViewMode(date, 'list', 'prev');

	assert.equal(next.getDate(), 22);
	assert.equal(prev.getDate(), 8);
});

void test('shiftDateByViewMode moves one day in day mode', () => {
	const date = new Date(2026, 2, 15);
	const next = shiftDateByViewMode(date, 'day', 'next');
	const prev = shiftDateByViewMode(date, 'day', 'prev');

	assert.equal(next.getDate(), 16);
	assert.equal(prev.getDate(), 14);
});
