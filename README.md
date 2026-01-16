# CMS Project - Admin CMS + Public Catalog API + Scheduled Publishing

A full-stack Content Management System with admin interface, public API, and automated lesson publishing.

## 🏗️ Architecture Overview

```
┌─────────────┐      ┌──────────────┐      ┌────────────┐
│  React Web  │─────▶│  FastAPI API │─────▶│ PostgreSQL │
│   (Port 3000)│      │  (Port 8000) │      │ (Port 5432)│
└─────────────┘      └──────────────┘      └────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ Worker (Cron)│
                     │ Auto-Publish │
                     └──────────────┘
```

### Components
- **Frontend**: React SPA with authentication and CRUD operations
- **Backend**: FastAPI REST API with role-based access control
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Worker**: Python background job for scheduled publishing

## 📦 Project Structure

```
cms-project/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── models/
│   │   │   └── models.py        # SQLAlchemy models
│   │   ├── schemas/
│   │   │   └── schemas.py       # Pydantic schemas
│   │   ├── core/
│   │   │   └── security.py      # Auth & security
│   │   └── db/
│   │       └── database.py      # Database connection
│   ├── worker.py                # Publishing worker
│   ├── seed.py                  # Seed data script
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.js              # Main React app
│   │   ├── App.css             # Styling
│   │   ├── services/
│   │   │   └── api.js          # API client
│   │   └── index.js
│   ├── public/
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
└── docker-compose.yml

```

## 🚀 Local Setup (Docker Compose)

### Prerequisites
- Docker Desktop installed
- Docker Compose installed
- Ports 3000, 5432, 8000 available

### Quick Start

1. **Clone/Extract the project**
   ```bash
   cd cms-project
   ```

2. **Run with Docker Compose**
   ```bash
   docker compose up --build
   ```

   This single command will:
   - Start PostgreSQL database
   - Create database schema
   - Seed sample data
   - Start FastAPI backend (http://localhost:8000)
   - Start Worker for scheduled publishing
   - Start React frontend (http://localhost:3000)

3. **Access the Application**
   - Frontend: http://localhost:3000
   - API Docs: http://localhost:8000/docs
   - Health Check: http://localhost:8000/health

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | admin123 |
| Editor | editor@example.com | editor123 |
| Viewer | viewer@example.com | viewer123 |

## 🧪 Testing the Demo Flow

### 1. Login as Editor
- Go to http://localhost:3000
- Login with: `editor@example.com` / `editor123`

### 2. View Programs
- You'll see 2 programs already created
- "Foundation Mathematics" (Telugu + English)
- "Science Fundamentals" (Hindi)

### 3. Create/Edit a Lesson
- Click on "Foundation Mathematics"
- Click on "Term 1: Basic Algebra"
- You'll see 3 lessons with different statuses

### 4. Schedule a Lesson
- The seed data already has a lesson "Understanding Addition" scheduled to publish in 2 minutes
- Click on this lesson to view details
- You'll see "Scheduled for: [timestamp]"

### 5. Wait for Worker to Publish
- The worker runs every 60 seconds
- Wait 2-3 minutes
- Refresh the lesson page
- Status will change from "scheduled" to "published"
- "Published at" timestamp will appear

### 6. Verify in Public Catalog
- Open: http://localhost:8000/catalog/programs
- You'll see only published programs
- Each program shows only published lessons
- Try filters: `?language=te` or `?topic=Mathematics`

### 7. Test Publishing Actions
- Create a new draft lesson or edit existing one
- Try different publishing actions:
  - **Publish Now**: Immediately publishes
  - **Schedule**: Set a future date/time
  - **Archive**: Archives the lesson

## 🗄️ Database Schema

### Key Entities

**Program** → **Term** → **Lesson** (Hierarchical structure)

**Relationships**:
- Program ↔ Topic (Many-to-Many)
- Program → ProgramAsset (One-to-Many)
- Lesson → LessonAsset (One-to-Many)

### Database Constraints Implemented
✅ Unique `(program_id, term_number)`
✅ Unique `(term_id, lesson_number)`
✅ Unique `topic.name`
✅ Scheduled lessons must have `publish_at`
✅ Published lessons must have `published_at`
✅ Primary language included in available languages
✅ Asset uniqueness per language/variant

### Indexes for Performance
✅ `lesson(status, publish_at)` - Worker queries
✅ `lesson(term_id, lesson_number)` - Listing
✅ `program(status, language_primary, published_at)` - Catalog queries
✅ Asset lookup indexes - Fast asset retrieval

## 🔐 Authentication & Authorization

### Roles
- **Admin**: Full access + user management
- **Editor**: Create/edit/publish/schedule content
- **Viewer**: Read-only access

### Security Features
- JWT-based authentication
- Password hashing with bcrypt
- Role-based endpoint protection
- Token stored in localStorage

## 📡 API Endpoints

### Admin API (Requires Auth)

**Auth**
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register user
- `GET /api/auth/me` - Get current user

**Programs**
- `GET /api/programs` - List programs (filter by status, language, topic)
- `GET /api/programs/{id}` - Get program details
- `POST /api/programs` - Create program
- `PATCH /api/programs/{id}` - Update program
- `POST /api/programs/{id}/assets` - Add poster

**Terms**
- `GET /api/programs/{id}/terms` - List terms
- `POST /api/terms` - Create term

**Lessons**
- `GET /api/terms/{id}/lessons` - List lessons
- `GET /api/lessons/{id}` - Get lesson details
- `POST /api/lessons` - Create lesson
- `PATCH /api/lessons/{id}` - Update lesson
- `POST /api/lessons/{id}/publish` - Publish/schedule/archive
- `POST /api/lessons/{id}/assets` - Add thumbnail

**Topics**
- `GET /api/topics` - List topics
- `POST /api/topics` - Create topic

### Public Catalog API (No Auth)

- `GET /catalog/programs` - List published programs
  - Query params: `language`, `topic`, `cursor`, `limit`
  - Returns: Programs with ≥1 published lesson
  - Pagination: Cursor-based with `next_cursor`

- `GET /catalog/programs/{id}` - Get program with published lessons
  - Includes: Terms + published lessons only

- `GET /catalog/lessons/{id}` - Get published lesson details

### Cache Headers
All catalog endpoints return:
```
Cache-Control: public, max-age=300
```

## ⚙️ Worker Implementation

### Publishing Logic

**File**: `backend/worker.py`

**Features**:
- ✅ Runs every 60 seconds
- ✅ Idempotent (safe to run multiple times)
- ✅ Concurrency-safe (row-level locking with `skip_locked`)
- ✅ Transactional (each lesson in own transaction)
- ✅ Auto-publishes parent program

**Workflow**:
1. Query scheduled lessons where `publish_at <= now()`
2. Lock rows with `FOR UPDATE SKIP LOCKED`
3. Update lesson status to `published`
4. Set `published_at` timestamp
5. Check if parent program needs publishing
6. If program has ≥1 published lesson → publish program
7. Commit transaction

## 🐳 Deployment

### Deploying to Production

#### Option 1: Railway.app (Recommended - Free Tier)

**1. Deploy Database**
- Go to [railway.app](https://railway.app)
- New Project → Deploy PostgreSQL
- Copy `DATABASE_URL` from Connect tab

**2. Deploy Backend + Worker**
- In same project, click "New Service"
- Connect your GitHub repo
- Select `backend` folder as root
- Add environment variables:
  ```
  DATABASE_URL=<from step 1>
  SECRET_KEY=<generate strong key>
  ALGORITHM=HS256
  ACCESS_TOKEN_EXPIRE_MINUTES=30
  ```
- Deploy

**3. Deploy Worker**
- New Service in same project
- Connect same repo, select `backend` folder
- Override start command: `python worker.py`
- Add same environment variables as backend
- Deploy

**4. Deploy Frontend**
- New Service → Connect repo → select `frontend` folder
- Add environment variable:
  ```
  REACT_APP_API_URL=<backend URL from step 2>
  ```
- Deploy

**5. Run Seed Data** (One-time)
- In backend service, go to "Settings" → "Deploy"
- Run command: `python seed.py`

#### Option 2: Render.com (Alternative)

Similar steps as Railway:
1. New PostgreSQL database
2. New Web Service for backend
3. New Background Worker for worker
4. New Static Site for frontend

#### Option 3: Vercel (Frontend) + Railway (Backend+DB+Worker)

- Frontend: Deploy to Vercel with `REACT_APP_API_URL`
- Backend/Worker/DB: Deploy to Railway as above

### Environment Variables

**Backend (.env)**:
```env
DATABASE_URL=postgresql://user:password@host:port/dbname
SECRET_KEY=your-secret-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

**Frontend**:
```env
REACT_APP_API_URL=https://your-backend-url.com
```

## 📊 Seed Data Details

**Users**: 3 (admin, editor, viewer)
**Topics**: 3 (Mathematics, Science, Language)
**Programs**: 2
- Foundation Mathematics (te, en) - PUBLISHED
- Science Fundamentals (hi) - PUBLISHED
**Terms**: 2 (one per program)
**Lessons**: 6 total
- 4 Published
- 1 Scheduled (auto-publishes in 2 min)
- 1 Draft

**Assets**:
- Each program: portrait + landscape posters for primary language
- Each lesson: portrait + landscape thumbnails for primary language
- Multi-language content URLs for bilingual lessons

## 🧪 Testing Checklist

- [ ] Can login with all 3 roles
- [ ] Admin can create users
- [ ] Editor can create/edit programs
- [ ] Editor can create/edit lessons
- [ ] Editor can schedule lesson publish
- [ ] Worker auto-publishes scheduled lesson
- [ ] Program auto-publishes with first lesson
- [ ] Viewer has read-only access
- [ ] Public catalog shows only published content
- [ ] Catalog filters work (language, topic)
- [ ] Pagination works
- [ ] Health endpoint returns DB status
- [ ] Docker compose up works from scratch

## 📝 Key Features Implemented

### ✅ Core Requirements
- [x] Full CRUD for Programs, Terms, Lessons
- [x] Multi-language support
- [x] Asset management (posters, thumbnails, variants)
- [x] Publishing workflow (draft → scheduled → published → archived)
- [x] Scheduled publishing with worker
- [x] Auto-publish parent program
- [x] Role-based access control (admin, editor, viewer)
- [x] Public catalog API with pagination
- [x] Database constraints and indexes
- [x] Health check endpoint
- [x] Docker compose setup
- [x] Seed data script

### ✅ Validation
- [x] Primary language in available languages
- [x] Video must have duration_ms
- [x] Content URLs must include primary language
- [x] Scheduled lessons must have publish_at
- [x] Published lessons have required assets

### ✅ Worker Safety
- [x] Idempotent (rerun safe)
- [x] Concurrency-safe (row locks)
- [x] Transactional
- [x] Structured logging

## 🛠️ Troubleshooting

**Problem**: Containers won't start
```bash
docker compose down -v  # Remove volumes
docker compose up --build
```

**Problem**: Frontend can't connect to API
- Check REACT_APP_API_URL is set correctly
- For Docker: should be `http://localhost:8000`
- For production: should be your deployed backend URL

**Problem**: Worker not publishing
- Check worker logs: `docker compose logs worker`
- Verify lesson has `status='scheduled'` and `publish_at` in past
- Check lesson has required assets

**Problem**: Database connection error
- Verify DATABASE_URL format: `postgresql://user:pass@host:port/db`
- Check PostgreSQL is running
- Test connection: `docker compose exec db psql -U cms_user -d cms_db`

## 📖 Additional Notes

### Design Decisions

1. **Normalized Assets**: Using separate tables for better querying and uniqueness constraints
2. **JSON for URLs**: Content URLs stored as JSON for flexibility
3. **Cursor Pagination**: Better for large datasets than offset
4. **Row Locking**: `FOR UPDATE SKIP LOCKED` prevents race conditions
5. **Single Transaction per Lesson**: Prevents partial failures

### Future Improvements

- [ ] Add search functionality
- [ ] Implement file uploads (S3/Cloudinary)
- [ ] Add email notifications for published lessons
- [ ] Implement versioning/history
- [ ] Add analytics dashboard
- [ ] Bulk operations
- [ ] Advanced filtering
- [ ] Export functionality

## 🔗 Deployed URLs (Update after deployment)

**Frontend**: https://cms-project-sigma.vercel.app/
**API**: [https://your-backend.railway.app](https://cms-backend-production-e076.up.railway.app)
**API Docs**: [https://your-backend.railway.app/docs](https://cms-backend-production-e076.up.railway.app/docs)

## 📞 Support

For issues or questions about this project, please check:
1. Docker logs: `docker compose logs`
2. API documentation: `/docs` endpoint
3. Database connection: `/health` endpoint

---

**Built with**: FastAPI, React, PostgreSQL, Docker
**License**: MIT
