import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { createSongSchema } from '$lib/schemas';

export const GET: RequestHandler = async ({ url }) => {
	const search = url.searchParams.get('search') || '';
	const includeArchived = url.searchParams.get('includeArchived') === 'true';

	const songs = await prisma.song.findMany({
		where: {
			isArchived: includeArchived ? undefined : false,
			versions: search
				? {
						some: {
							title: { contains: search }
						}
					}
				: undefined
		},
		include: {
			versions: {
				orderBy: { createdAt: 'desc' },
				take: 1
			}
		},
		orderBy: { updatedAt: 'desc' }
	});

	return json(songs);
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const parsed = createSongSchema.safeParse(body);

	if (!parsed.success) {
		throw error(400, parsed.error.errors[0].message);
	}

	const { title, author, content, metadata } = parsed.data;

	const song = await prisma.song.create({
		data: {
			versions: {
				create: {
					title,
					author,
					content,
					metadata: JSON.stringify(metadata || {})
				}
			}
		},
		include: {
			versions: true
		}
	});

	return json(song, { status: 201 });
};
