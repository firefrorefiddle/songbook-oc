import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/prisma';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
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

	return {
		songbooks,
		search,
		includeArchived
	};
};

export const actions: Actions = {
	create: async ({ request }) => {
		const formData = await request.formData();
		const title = formData.get('title') as string;
		const description = formData.get('description') as string;

		if (!title?.trim()) {
			return fail(400, { error: 'Title is required', fields: { title, description } });
		}

		await prisma.songbook.create({
			data: {
				versions: {
					create: {
						title: title.trim(),
						description: description?.trim() || null
					}
				}
			}
		});

		return { success: true };
	},

	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		await prisma.songbook.update({
			where: { id },
			data: { isArchived: true }
		});

		return { success: true };
	}
};
