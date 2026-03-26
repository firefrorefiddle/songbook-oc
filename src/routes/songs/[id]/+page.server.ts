import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/prisma';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const song = await prisma.song.findUnique({
		where: { id: params.id },
		include: {
			versions: {
				orderBy: { createdAt: 'desc' }
			}
		}
	});

	if (!song) {
		throw new Error('Song not found');
	}

	return { song };
};

export const actions: Actions = {
	update: async ({ params, request }) => {
		const formData = await request.formData();
		const title = formData.get('title') as string;
		const author = formData.get('author') as string;
		const content = formData.get('content') as string;
		const copyright = formData.get('copyright') as string;

		if (!title?.trim()) {
			return fail(400, { error: 'Title is required' });
		}
		if (!content?.trim()) {
			return fail(400, { error: 'Content is required' });
		}

		const metadata: Record<string, string> = {};
		if (copyright) metadata.copyright = copyright;

		await prisma.songVersion.create({
			data: {
				songId: params.id,
				title: title.trim(),
				author: author?.trim() || null,
				content: content.trim(),
				metadata: JSON.stringify(metadata)
			}
		});

		return { success: true };
	},

	fork: async ({ params, request }) => {
		const formData = await request.formData();
		const title = formData.get('title') as string;
		const author = formData.get('author') as string;
		const content = formData.get('content') as string;
		const copyright = formData.get('copyright') as string;

		if (!title?.trim()) {
			return fail(400, { error: 'Title is required' });
		}
		if (!content?.trim()) {
			return fail(400, { error: 'Content is required' });
		}

		const metadata: Record<string, string> = {};
		if (copyright) metadata.copyright = copyright;

		await prisma.songVersion.create({
			data: {
				songId: params.id,
				title: title.trim(),
				author: author?.trim() || null,
				content: content.trim(),
				metadata: JSON.stringify(metadata)
			}
		});

		return { success: true, forked: true };
	}
};
