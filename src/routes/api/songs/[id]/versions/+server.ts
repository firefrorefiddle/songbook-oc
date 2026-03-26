import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { createSongVersionSchema } from '$lib/schemas';

export const POST: RequestHandler = async ({ params, request }) => {
	const body = await request.json();
	const parsed = createSongVersionSchema.safeParse(body);

	if (!parsed.success) {
		throw error(400, parsed.error.errors[0].message);
	}

	const song = await prisma.song.findUnique({ where: { id: params.id } });
	if (!song) {
		throw error(404, 'Song not found');
	}

	const { title, author, content, metadata } = parsed.data;

	const songVersion = await prisma.songVersion.create({
		data: {
			songId: params.id,
			title,
			author,
			content,
			metadata: JSON.stringify(metadata || {})
		}
	});

	return json(songVersion, { status: 201 });
};
