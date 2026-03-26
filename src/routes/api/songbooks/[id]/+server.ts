import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { createSongbookVersionSchema } from '$lib/schemas';

export const GET: RequestHandler = async ({ params }) => {
	const songbook = await prisma.songbook.findUnique({
		where: { id: params.id },
		include: {
			versions: {
				orderBy: { createdAt: 'desc' },
				include: {
					songs: {
						include: {
							songVersion: {
								include: {
									song: true
								}
							}
						},
						orderBy: { order: 'asc' }
					}
				}
			}
		}
	});

	if (!songbook) {
		throw error(404, 'Songbook not found');
	}

	return json(songbook);
};

export const PUT: RequestHandler = async ({ params, request }) => {
	const body = await request.json();
	const parsed = createSongbookVersionSchema.safeParse(body);

	if (!parsed.success) {
		throw error(400, parsed.error.errors[0].message);
	}

	const songbook = await prisma.songbook.findUnique({ where: { id: params.id } });
	if (!songbook) {
		throw error(404, 'Songbook not found');
	}

	const { title, description } = parsed.data;

	await prisma.songbookVersion.create({
		data: {
			songbookId: params.id,
			title,
			description
		}
	});

	const updatedSongbook = await prisma.songbook.findUnique({
		where: { id: params.id },
		include: {
			versions: {
				orderBy: { createdAt: 'desc' },
				include: {
					songs: {
						include: {
							songVersion: {
								include: {
									song: true
								}
							}
						},
						orderBy: { order: 'asc' }
					}
				}
			}
		}
	});

	return json(updatedSongbook);
};

export const DELETE: RequestHandler = async ({ params }) => {
	const songbook = await prisma.songbook.findUnique({ where: { id: params.id } });
	if (!songbook) {
		throw error(404, 'Songbook not found');
	}

	await prisma.songbook.update({
		where: { id: params.id },
		data: { isArchived: true }
	});

	return json({ success: true });
};
