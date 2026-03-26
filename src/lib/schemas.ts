import { z } from 'zod';

export const songMetadataSchema = z.record(z.string());

export const createSongVersionSchema = z.object({
	title: z.string().min(1, 'Title is required').max(255),
	author: z.string().max(255).optional(),
	content: z.string().min(1, 'Content is required'),
	metadata: songMetadataSchema.optional()
});

export const createSongSchema = z.object({
	title: z.string().min(1, 'Title is required').max(255),
	author: z.string().max(255).optional(),
	content: z.string().min(1, 'Content is required'),
	metadata: songMetadataSchema.optional()
});

export const updateSongVersionSchema = createSongVersionSchema.partial();

export const createSongbookVersionSchema = z.object({
	title: z.string().min(1, 'Title is required').max(255),
	description: z.string().max(1000).optional()
});

export const createSongbookSchema = z.object({
	title: z.string().min(1, 'Title is required').max(255),
	description: z.string().max(1000).optional()
});

export const addSongToSongbookSchema = z.object({
	songVersionId: z.string().min(1),
	order: z.number().int().min(0).optional()
});

export type SongMetadata = z.infer<typeof songMetadataSchema>;
export type CreateSongVersionInput = z.infer<typeof createSongVersionSchema>;
export type CreateSongInput = z.infer<typeof createSongSchema>;
export type UpdateSongVersionInput = z.infer<typeof updateSongVersionSchema>;
export type CreateSongbookVersionInput = z.infer<typeof createSongbookVersionSchema>;
export type CreateSongbookInput = z.infer<typeof createSongbookSchema>;
export type AddSongToSongbookInput = z.infer<typeof addSongToSongbookSchema>;
