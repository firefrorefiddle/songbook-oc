import { describe, it, expect } from 'vitest';
import {
	createSongSchema,
	createSongbookSchema,
	createSongVersionSchema,
	updateSongVersionSchema,
	createSongbookVersionSchema,
	addSongToSongbookSchema
} from '$lib/schemas';

describe('Song validation', () => {
	it('should validate a valid song', () => {
		const result = createSongSchema.safeParse({
			title: 'Test Song',
			author: 'Test Author',
			content: 'Test content',
			metadata: { copyright: '2024' }
		});

		expect(result.success).toBe(true);
	});

	it('should reject song without title', () => {
		const result = createSongSchema.safeParse({
			content: 'Test content'
		});

		expect(result.success).toBe(false);
	});

	it('should reject song without content', () => {
		const result = createSongSchema.safeParse({
			title: 'Test Song'
		});

		expect(result.success).toBe(false);
	});

	it('should accept optional author', () => {
		const result = createSongSchema.safeParse({
			title: 'Test Song',
			content: 'Test content'
		});

		expect(result.success).toBe(true);
	});

	it('should accept optional metadata', () => {
		const result = createSongSchema.safeParse({
			title: 'Test Song',
			content: 'Test content'
		});

		expect(result.success).toBe(true);
	});
});

describe('Song version validation', () => {
	it('should validate a valid song version', () => {
		const result = createSongVersionSchema.safeParse({
			title: 'Test Song Version',
			author: 'Test Author',
			content: 'Test content'
		});

		expect(result.success).toBe(true);
	});

	it('should validate partial update', () => {
		const result = updateSongVersionSchema.safeParse({
			title: 'Updated Title'
		});

		expect(result.success).toBe(true);
	});
});

describe('Songbook validation', () => {
	it('should validate a valid songbook', () => {
		const result = createSongbookSchema.safeParse({
			title: 'Test Songbook',
			description: 'A test songbook'
		});

		expect(result.success).toBe(true);
	});

	it('should reject songbook without title', () => {
		const result = createSongbookSchema.safeParse({
			description: 'A test songbook'
		});

		expect(result.success).toBe(false);
	});

	it('should accept optional description', () => {
		const result = createSongbookSchema.safeParse({
			title: 'Test Songbook'
		});

		expect(result.success).toBe(true);
	});
});

describe('Songbook version validation', () => {
	it('should validate a valid songbook version', () => {
		const result = createSongbookVersionSchema.safeParse({
			title: 'Test Songbook Version',
			description: 'A test version'
		});

		expect(result.success).toBe(true);
	});

	it('should reject version without title', () => {
		const result = createSongbookVersionSchema.safeParse({
			description: 'A test version'
		});

		expect(result.success).toBe(false);
	});
});

describe('Add song to songbook validation', () => {
	it('should validate valid song reference', () => {
		const result = addSongToSongbookSchema.safeParse({
			songVersionId: 'test-id',
			order: 1
		});

		expect(result.success).toBe(true);
	});

	it('should accept missing order (use default)', () => {
		const result = addSongToSongbookSchema.safeParse({
			songVersionId: 'test-id'
		});

		expect(result.success).toBe(true);
	});

	it('should reject missing songVersionId', () => {
		const result = addSongToSongbookSchema.safeParse({
			order: 1
		});

		expect(result.success).toBe(false);
	});
});
