import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { addSongToSongbookSchema } from '$lib/schemas';

export const POST: RequestHandler = async ({ params, request }) => {
	const body = await request.json();
	const parsed = addSongToSongbookSchema.safeParse(body);

	if (!parsed.success) {
		throw error(400, parsed.error.errors[0].message);
	}

	const songbook = await prisma.songbook.findUnique({ where: { id: params.id } });
	if (!songbook) {
		throw error(404, 'Songbook not found');
	}

	const songVersion = await prisma.songVersion.findUnique({
		where: { id: parsed.data.songVersionId }
	});
	if (!songVersion) {
		throw error(404, 'Song version not found');
	}

	const currentVersion = await prisma.songbookVersion.findFirst({
		where: { songbookId: params.id },
		orderBy: { createdAt: 'desc' }
	});
	if (!currentVersion) {
		throw error(404, 'No songbook version found');
	}

	const maxOrder = await prisma.songbookSong.aggregate({
		where: { songbookVersionId: currentVersion.id },
		_max: { order: true }
	});

	const songbookSong = await prisma.songbookSong.create({
		data: {
			songbookVersionId: currentVersion.id,
			songVersionId: parsed.data.songVersionId,
			order: parsed.data.order ?? ((maxOrder._max.order ?? -1) + 1)
		},
		include: {
			songVersion: {
				include: {
					song: true
				}
			}
		}
	});

	return json(songbookSong, { status: 201 });
};

export const DELETE: RequestHandler = async ({ params, url }) => {
	const songVersionId = url.searchParams.get('songVersionId');
	if (!songVersionId) {
		throw error(400, 'songVersionId is required');
	}

	const songbook = await prisma.songbook.findUnique({ where: { id: params.id } });
	if (!songbook) {
		throw error(404, 'Songbook not found');
	}

	const currentVersion = await prisma.songbookVersion.findFirst({
		where: { songbookId: params.id },
		orderBy: { createdAt: 'desc' }
	});
	if (!currentVersion) {
		throw error(404, 'No songbook version found');
	}

	await prisma.songbookSong.deleteMany({
		where: {
			songbookVersionId: currentVersion.id,
			songVersionId
		}
	});

	return json({ success: true });
};
