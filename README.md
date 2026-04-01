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

# Seed with sample data (requires admin credentials)
pnpm db:seed -- --email <email> --password <password>
```

The first user is created via the `/setup` page when no users exist. Alternatively, use the seed script with admin credentials.

### Development

```bash
# Start development server
pnpm dev
```

### Commands

| Command          | Description                    |
| ---------------- | ------------------------------ |
| `pnpm dev`       | Start development server       |
| `pnpm build`     | Build for production           |
| `pnpm preview`   | Preview production build       |
| `pnpm test`      | Run tests                      |
| `pnpm check`     | Run TypeScript checks          |
| `pnpm lint`      | Run ESLint                     |
| `pnpm format`    | Format code with Prettier      |
| `pnpm db:push`   | Push schema to database        |
| `pnpm db:seed`   | Seed database with sample data |
| `pnpm db:studio` | Open Prisma Studio             |

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

## Deployment

### Prerequisites

- SSH access to the server
- Node.js 20+ and pnpm installed on server
- User-level systemd service for the app

### Initial Setup

1. **Create production database locally:**

   ```bash
   # Run migrations
   DATABASE_URL="file:./prisma/prod.db" pnpm prisma migrate deploy

   # Seed with admin user
   DATABASE_URL="file:./prisma/prod.db" pnpm db:seed -- --email <email> --password <password>
   ```

2. **Set up user service on server:**

   ```bash
   # SSH to server
   ssh user@server

   # Create systemd user service
   mkdir -p ~/.config/systemd/user
   cat > ~/.config/systemd/user/songbook.service << 'EOF'
   [Unit]
   Description=Songbook-OC SvelteKit App
   After=network.target

   [Service]
   Type=exec
   WorkingDirectory=%h/songbook-oc
   Environment=NODE_ENV=production
   Environment=PORT=3000
   ExecStart=/usr/bin/node build/index.js
   Restart=always
   RestartSec=10

   [Install]
   WantedBy=default.target
   EOF

   # Enable and start service
   systemctl --user daemon-reload
   systemctl --user enable songbook
   systemctl --user start songbook
   ```

3. **Configure reverse proxy (nginx):** Point nginx to `localhost:3000`

### Deploy

```bash
# Deploy with seeded database
./deploy.sh --seed

# Deploy without database
./deploy.sh
```

The deploy script:

- Builds the app locally
- Syncs files to server (excluding node_modules, .git, \*.db, etc.)
- Syncs the seed database to the server (with --seed)
- Syncs the build folder
- Runs `pnpm install` on the server
- Restarts the user service

### Environment Variables

Create `.env.production`:

```
DATABASE_URL="file:./data/songbook.db"
AUTH_SECRET="<generate-a-secure-random-string>"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
EMAIL_VERIFICATION=false
```

### Secrets

Never commit secrets to git. The following are automatically ignored:

- `.env` - local development
- `.envrc` - deploy script variables (server, domain)
- `.env.production` - production secrets
- `*.db` - database files
- `prisma/prod.db` - production database

## License

MIT
