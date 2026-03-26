import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { createSongbookSchema } from '$lib/schemas';

export const GET: RequestHandler = async ({ url }) => {
	const search = url.searchParams.get('search') || '';
	const includeArchived = url.searchParams.get('includeArchived') === 'true';

	const songbooks = await prisma.songbook.findMany({
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
				take: 1,
				include: {
					songs: {
						include: {
							songVersion: true
						}
					}
				}
			}
		},
		orderBy: { updatedAt: 'desc' }
	});

	return json(songbooks);
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const parsed = createSongbookSchema.safeParse(body);

	if (!parsed.success) {
		throw error(400, parsed.error.errors[0].message);
	}

	const { title, description } = parsed.data;

	const songbook = await prisma.songbook.create({
		data: {
			versions: {
				create: {
					title,
					description
				}
			}
		},
		include: {
			versions: true
		}
	});

	return json(songbook, { status: 201 });
};
