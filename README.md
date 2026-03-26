# Songbook-OC

A songbook management application for managing songs, song versions, and songbooks.

## Features

- **Songs**: Create, edit, archive songs with multiple versions
- **Song Versions**: Fork and manage different versions of songs
- **Songbooks**: Create songbooks with pinned song versions
- **Search**: Filter songs and songbooks by title
- **Validation**: Form validation with helpful error messages

## Tech Stack

- **Frontend**: SvelteKit + TypeScript
- **Backend**: SvelteKit server routes
- **Database**: SQLite with Prisma ORM
- **Styling**: Tailwind CSS

## Setup

### Prerequisites

- Node.js 20+
- pnpm

### Installation

```bash
# Install dependencies
pnpm install

# Initialize the database
pnpm db:push

# Seed with sample data
pnpm db:seed
```

### Development

```bash
# Start development server
pnpm dev
```

### Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |
| `pnpm test` | Run tests |
| `pnpm check` | Run TypeScript checks |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format code with Prettier |
| `pnpm db:push` | Push schema to database |
| `pnpm db:seed` | Seed database with sample data |
| `pnpm db:studio` | Open Prisma Studio |

## Project Structure

```
src/
├── lib/
│   ├── components/    # Reusable UI components
│   └── server/       # Server-only code (Prisma client)
├── routes/
│   ├── api/          # API routes
│   │   ├── songs/    # Songs CRUD
│   │   └── songbooks/ # Songbooks CRUD
│   ├── songs/        # Songs pages
│   └── songbooks/    # Songbooks pages
prisma/
├── schema.prisma     # Database schema
└── seed.ts           # Seed script
```

## Database Schema

- **Song**: Main song entity with archived flag
- **SongVersion**: Individual versions with title, author, content, metadata
- **Songbook**: Songbook entity with archived flag
- **SongbookVersion**: Individual versions with title, description
- **SongbookSong**: Join table linking songbook versions to song versions

## Song Format

Songs use a custom text format with chord markup:

```
C                   e
All die Fülle ist in dir, o Herr,
         F                   C      G
und alle Schönheit kommt von dir, o Gott!
```

## API Endpoints

### Songs
- `GET /api/songs` - List songs (search param: `search`, `includeArchived`)
- `POST /api/songs` - Create song
- `GET /api/songs/[id]` - Get song with versions
- `PUT /api/songs/[id]` - Update song (creates new version)
- `DELETE /api/songs/[id]` - Archive song
- `POST /api/songs/[id]/versions` - Create new version

### Songbooks
- `GET /api/songbooks` - List songbooks (search param: `search`, `includeArchived`)
- `POST /api/songbooks` - Create songbook
- `GET /api/songbooks/[id]` - Get songbook with versions and songs
- `PUT /api/songbooks/[id]` - Update songbook (creates new version)
- `DELETE /api/songbooks/[id]` - Archive songbook
- `POST /api/songbooks/[id]/songs` - Add song to current version
- `DELETE /api/songbooks/[id]/songs?songVersionId=xxx` - Remove song

## License

MIT
