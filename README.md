# Songbook-OC

A songbook management application for managing songs, song versions, and songbooks.

## Features

- **Songs**: Create, edit, archive songs with multiple versions
- **Song Versions**: Fork and manage different versions of songs
- **Version Review**: Compare song versions and mark a recommended version for reuse
- **Songbooks**: Create songbooks with pinned song versions
- **Search**: Filter songs and songbooks by title
- **Taxonomy**: Imported songs can carry first-class categories and tags
- **Validation**: Form validation with helpful error messages
- **Transactional Email**: Invite and password reset delivery via configurable email transport with local logging fallback

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

# Initialize the database (create migrations, apply to dev DB)
pnpm prisma migrate dev

# Seed with sample data (requires admin credentials)
pnpm db:seed -- --email <email> --password <password>
```

The first user is created via the `/setup` page when no users exist. Alternatively, use the seed script with admin credentials.

Admins can manage users from `/admin/users`, where they can review ownership and collaboration footprint, deactivate or reactivate accounts, and resend pending invite links. They can also inspect recent transactional email attempts at `/admin/email-deliveries`, including invite and password reset deliveries, transport details, and failures.

Users who forget their password can request a reset link from `/forgot-password`.

### Development

```bash
# Start development server
pnpm dev
```

The `dev`, `build`, `check`, and test scripts regenerate the Prisma client first. That keeps the generated client aligned with `prisma/schema.prisma` after schema changes such as adding `User.isActive`, even if `node_modules` was already present.

### Commands

| Command                   | Description                                                           |
| ------------------------- | --------------------------------------------------------------------- |
| `pnpm dev`                | Start development server                                              |
| `pnpm build`              | Build for production                                                  |
| `pnpm preview`            | Preview production build                                              |
| `pnpm test`               | Run tests                                                             |
| `pnpm check`              | Run TypeScript checks                                                 |
| `pnpm lint`               | Run ESLint                                                            |
| `pnpm format`             | Format code with Prettier                                             |
| `pnpm prisma:generate`    | Regenerate the Prisma client from the current schema                  |
| `pnpm prisma migrate dev` | Create and apply migrations (use instead of db push!)                 |
| `pnpm db:seed`            | Seed database with sample data                                        |
| `pnpm db:seed-from-files` | Import Liedermappe `.sng` files plus songbook-derived categories/tags |
| `pnpm db:studio`          | Open Prisma Studio                                                    |

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
- **SongTag / SongCategory**: First-class taxonomy used for import and filtering
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
- Runs `pnpm prisma migrate deploy` on the server against the production database configured in `.env`
- Restarts the user service

Production deploys now apply pending Prisma migrations automatically before the service restarts. This uses `migrate deploy`, which applies checked-in migrations in order and preserves existing data. It does not perform `db push`.

### Environment Variables

Create `.env.production` in the app directory on the server:

```
DATABASE_URL="file:/home/<username>/songbook-oc/data/songbook.db"
AUTH_SECRET="<generate-a-secure-random-string>"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
EMAIL_VERIFICATION=false
APP_BASE_URL="https://songbook.example.org"
EMAIL_TRANSPORT="mailgun"
EMAIL_FROM="Songbook <no-reply@example.org>"
MAILGUN_API_KEY="<mailgun-api-key>"
MAILGUN_DOMAIN="sandbox-example.mailgun.org"
MAILGUN_BASE_URL="https://api.mailgun.net"
```

For local development, set `EMAIL_TRANSPORT=log` to capture outgoing emails as `.eml` files in `storage/emails/` instead of attempting delivery. If you prefer a local MTA instead, switch to `EMAIL_TRANSPORT=sendmail` and set `EMAIL_SENDMAIL_COMMAND`.

**Important**: Use an absolute path for the database, not a relative path. The working directory of the systemd service may differ from where the app is located.

### Secrets

Never commit secrets to git. The following are automatically ignored:

- `.env` - local development
- `.env.local` - local development overrides and secrets
- `.envrc` - deploy script variables (server, domain)
- `.env.production` - production secrets
- `.env.*.local` - environment-specific local overrides
- `.env.production.local` - machine-specific production overrides
- `*.db` - database files
- `prisma/prod.db` - production database

## Imported tags and categories

The Liedermappe import (`pnpm db:seed-from-files`) now persists song taxonomy as relational data instead of only relying on free-form metadata.

- Categories are inferred from the existing source collections such as `gemeinde_songs.tex`, `jugend_songs.tex`, `lager_songs.tex`, and related files.
- Tags are inferred conservatively from song text and metadata for language (`German`, `English`) and a small starter set of worship-season/service labels such as `Christmas`, `Easter`, `Communion`, and `Opening`.

## License

MIT
