import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/prisma';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
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
		throw new Error('Songbook not found');
	}

	const availableSongs = await prisma.song.findMany({
		where: { isArchived: false },
		include: {
			versions: {
				orderBy: { createdAt: 'desc' },
				take: 1
			}
		},
		orderBy: { updatedAt: 'desc' }
	});

	return { songbook, availableSongs };
};

export const actions: Actions = {
	createVersion: async ({ params, request }) => {
		const formData = await request.formData();
		const title = formData.get('title') as string;
		const description = formData.get('description') as string;

		if (!title?.trim()) {
			return fail(400, { error: 'Title is required' });
		}

		await prisma.songbookVersion.create({
			data: {
				songbookId: params.id,
				title: title.trim(),
				description: description?.trim() || null
			}
		});

		return { success: true };
	},

	addSong: async ({ params, request }) => {
		const formData = await request.formData();
		const songVersionId = formData.get('songVersionId') as string;

		if (!songVersionId) {
			return fail(400, { error: 'Please select a song' });
		}

		const currentVersion = await prisma.songbookVersion.findFirst({
			where: { songbookId: params.id },
			orderBy: { createdAt: 'desc' }
		});

		if (!currentVersion) {
			return fail(400, { error: 'No version found' });
		}

		const maxOrder = await prisma.songbookSong.aggregate({
			where: { songbookVersionId: currentVersion.id },
			_max: { order: true }
		});

		await prisma.songbookSong.create({
			data: {
				songbookVersionId: currentVersion.id,
				songVersionId,
				order: (maxOrder._max.order ?? -1) + 1
			}
		});

		return { success: true };
	},

	removeSong: async ({ params, request }) => {
		const formData = await request.formData();
		const songVersionId = formData.get('songVersionId') as string;

		const currentVersion = await prisma.songbookVersion.findFirst({
			where: { songbookId: params.id },
			orderBy: { createdAt: 'desc' }
		});

		if (!currentVersion) {
			return fail(400, { error: 'No version found' });
		}

		await prisma.songbookSong.deleteMany({
			where: {
				songbookVersionId: currentVersion.id,
				songVersionId
			}
		});

		return { success: true };
	}
};
