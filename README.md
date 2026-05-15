# Programming Q&A Discussion Platform

This is a channel-based forum for programming discussions. Users can organize discussions into topic channels, ask questions, provide answers in threaded conversations, attach screenshots, vote on helpful content, and search across posts and users.

## Running the Project

### Quick Start (Docker - Recommended)

The application is designed to run entirely within Docker with zero local environment setup required.

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd qwx762_Project
   ```

2. **Ensure Docker is running:**
   - Windows/macOS: Open Docker Desktop
   - Linux: Ensure Docker service is running

3. **Start the application:**
   ```bash
   docker compose up --build
   ```

4. **Open in browser:**
   - Navigate to [http://localhost:3000](http://localhost:3000)

The Docker setup automatically handles everything on first run:
- Creates a persistent SQLite database in a Docker volume
- Applies Prisma migrations
- Seeds data based on `SEED_SAMPLE_DATA`
- Starts the Next.js application on port 3000

### Seed Modes (Grader Choice)

- `SEED_SAMPLE_DATA=true` (default): creates admin + sample channels + sample user + sample posts/replies
- `SEED_SAMPLE_DATA=false`: creates only admin (no channels, no non-admin users, no posts, no replies)

### Blank Slate Run (Admin Only)

Run this on Windows PowerShell:
```powershell
docker compose down -v
$env:SEED_SAMPLE_DATA="false"
docker compose up --build
```

Run this on macOS/Linux:
```bash
docker compose down -v
SEED_SAMPLE_DATA=false docker compose up --build
```

### Environment Configuration

Use `.env.example` as the template. Create a local `.env` in the project root to override defaults.

Submission guidance:
- Include `.env.example` in your submission
- Do not include your local `.env` file

Recommended `.env` for blank-slate grading:
```
SEED_SAMPLE_DATA="false"
```

### Resetting the Database

To completely reset the database and start fresh:
```bash
docker compose down -v
docker compose up --build
```

The `-v` flag removes persisted volumes, giving you a clean slate.

To stop the app:
```bash
docker compose down
```

To stop the app and remove persisted data:
```bash
docker compose down -v
```

## Ports

- Application: 3000

## Admin Credentials

- Username: `admin`
- Password: `password`

## Sample Data

By default, the database is automatically populated with sample data on first run, including:
- Admin user account (for testing moderation features)
- Test user account (`testuser` / `test123`)
- 3 sample channels: general, javascript, python
- 2 sample posts with replies (demonstrating threading)

## Database Persistence

The application uses SQLite as its database. In Docker, the SQLite database file is stored in a Docker named volume (`db-data`) so data persists across container restarts and rebuilds.

- Database location inside container: `/app/data/dev.db`
- Uploads location inside container: `/app/uploads`
- No external database account or third-party service is required

Run `docker compose down -v` to delete persisted volumes and start completely fresh.

## Features

- User authentication (signin/signup)
- Browse and create channels
- Create posts and threaded replies
- Upload screenshots (PNG, JPEG, WebP, max 5MB)
- Vote on posts and replies
- Search posts, replies, users, and rankings
- Admin moderation (delete users, channels, posts, replies)
