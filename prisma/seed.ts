import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const sampleSongs = [
	{
		title: 'All die Fülle ist in dir',
		author: 'Norbert Jagode, Steve Smith',
		content: `        C                   e
All die Fülle ist in dir, o Herr,
         F                   C      G
und alle Schönheit kommt von dir, o Gott!
        C                   e
All die Fülle ist in dir, o Herr,
         F                   C      G
und alle Schönheit kommt von dir, o Gott!
a          e          a          e         F    G C    G7
Quelle des Lebens,    lebendiges Wasser,   Halleluja!

^Du bist unser König, o ^Herr,
^du sitzt auf dem ^Thron, o ^Gott!
^Du bist unser König, o ^Herr,
^du sitzt auf dem ^Thron, o ^Gott!
^Meister des ^Lebens, ^ewiger ^Herrscher, ^Halle^lu^ja!

C                e                 F  G   C    F
Dank sei dir, ja Dank sei dir, wir danken dir, Herr.
C                e               F
Dank sei dir, ja Dank sei dir, o Herr.
        G        C         e                 F
Denn du bist uns nah, dein Wirken, Herr, ist offenbar.
C        e       d        G      C
Dank sei dir, ja Dank sei dir, o Herr.`,
		metadata: {
			copyright: '1.Teil: 1984 Medien Musikverlag, Asslar; 2.Teil: 1977 Scripture In Song',
			original: 'Jim Mills, "We give Thanks to Thee, o Lord"',
			reference: 'Psalm 75,2'
		}
	},
	{
		title: 'Gott ist die Liebe',
		author: 'John Wesley',
		content: `G                         C
Gott ist die Liebe,
G                         D
Gott ist die Liebe,
G              C          G
Gott ist die Liebe,
D              G
und liebt auch mich.

Gott ist die Liebe,
Gott ist die Liebe,
Gott ist die Liebe,
und liebt auch mich.`,
		metadata: {
			copyright: 'Public Domain'
		}
	},
	{
		title: 'Amazing Grace',
		author: 'John Newton',
		content: `Amazing grace, how sweet the sound
     G              D
That saved a wretch like me
G                      C          G
I once was lost, but now am found
      D             G
Was blind but now I see

'Twas grace that taught my heart to fear
     G              D
And grace my fears relieved
G                      C          G
How precious did that grace appear
     D             G
The hour I first believed`,
		metadata: {
			copyright: 'Public Domain - 1779'
		}
	},
	{
		title: 'Gott hat sich find gemacht',
		author: 'Martin Kling',
		content: `        C              G
Gott hat sich find gemacht,
      C                 G
hat Fleisch an sich genommen,
        Am              F
ist Mensch wie wir geworden,
      C           G   C
hat bei uns Wohnung nimmt.

O welch ein Wunder,
       Am         F
Gott wird wie ich,
       C          G
Gott wird wie ich.`,
		metadata: {
			copyright: 'Friendship Records'
		}
	},
	{
		title: 'Be Thou My Vision',
		author: 'Irish hymn, tr. by Mary E. Byrne',
		content: `        D           A
Be thou my vision, O Lord of my heart
       G              D
Naught be all else to me, save that thou art
        A          G      D
Thou my best thought, by day or by night
       A          G       D
Waking or sleeping, thy presence my light

Be thou my wisdom, be thou my true word
I ever with thee and thou with me, Lord
Thou my great Father, I thy true son
Thou in me dwelling, and I with thee one`,
		metadata: {
			copyright: 'Public Domain',
			original: 'Irish folk melody'
		}
	}
];

async function seed() {
	console.log('Seeding database...');

	for (const song of sampleSongs) {
		await prisma.song.create({
			data: {
				versions: {
					create: {
						title: song.title,
						author: song.author,
						content: song.content,
						metadata: JSON.stringify(song.metadata)
					}
				}
			}
		});
		console.log(`Created song: ${song.title}`);
	}

	const songs = await prisma.song.findMany({
		include: {
			versions: {
				orderBy: { createdAt: 'desc' },
				take: 1
			}
		}
	});

	const songbook1 = await prisma.songbook.create({
		data: {
			versions: {
				create: {
					title: 'Sunday Service Songs',
					description: 'Classic songs for Sunday worship'
				}
			}
		}
	});

	const songbook1Version = await prisma.songbookVersion.findFirst({
		where: { songbookId: songbook1.id },
		orderBy: { createdAt: 'desc' }
	});

	if (songbook1Version) {
		for (let i = 0; i < Math.min(3, songs.length); i++) {
			await prisma.songbookSong.create({
				data: {
					songbookVersionId: songbook1Version.id,
					songVersionId: songs[i].versions[0].id,
					order: i
				}
			});
		}
	}

	const songbook2 = await prisma.songbook.create({
		data: {
			versions: {
				create: {
					title: 'Praise & Worship Collection',
					description: 'A collection of contemporary praise songs'
				}
			}
		}
	});

	const songbook2Version = await prisma.songbookVersion.findFirst({
		where: { songbookId: songbook2.id },
		orderBy: { createdAt: 'desc' }
	});

	if (songbook2Version) {
		for (let i = 2; i < songs.length; i++) {
			await prisma.songbookSong.create({
				data: {
					songbookVersionId: songbook2Version.id,
					songVersionId: songs[i].versions[0].id,
					order: i - 2
				}
			});
		}
	}

	console.log('Seeding complete!');
	console.log(`Created ${sampleSongs.length} songs and 2 songbooks`);
}

seed()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
