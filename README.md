# CMS Project - Full-Featured Content Management System

A complete full-stack CMS with admin dashboard, program/topic/lesson management, scheduled publishing, and role-based access control.

## 🏗️ Architecture Overview
```
┌─────────────┐      ┌──────────────┐      ┌────────────┐
│  React Web  │─────▶│  FastAPI API │─────▶│ PostgreSQL │
│   (Port 3000)│      │  (Port 8000) │      │ (Port 5433)│
└─────────────┘      └──────────────┘      └────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ Worker (Cron)│
                     │ Auto-Publish │
                     └──────────────┘
```

### Components
- **Frontend**: React SPA with full CRUD operations and modal-based UI
- **Backend**: FastAPI REST API with JWT authentication
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Worker**: Background job for automated lesson publishing (runs every 60 seconds)

## 📦 Project Structure
```
cms-project/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app (800+ lines)
│   │   ├── models/
│   │   │   └── models.py        # SQLAlchemy models
│   │   ├── core/
│   │   │   └── security.py      # JWT auth & password hashing
│   │   └── db/
│   │       └── database.py      # Database connection
│   ├── worker.py                # Scheduled publishing worker
│   ├── seed.py                  # Seed data script
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.js              # Complete CMS UI (1500+ lines)
│   │   └── index.js
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
└── docker-compose.yml
```

## 🚀 Local Setup (Docker Compose)

### Prerequisites
- Docker Desktop installed
- Ports 3000, 5433, 8000 available

### Quick Start

1. **Run with Docker Compose**
```bash
   docker compose up --build
```

   This single command:
   - ✅ Starts PostgreSQL (port 5433)
   - ✅ Creates all tables
   - ✅ Seeds sample data (3 users, 3 topics, 2 programs, 6 lessons)
   - ✅ Starts FastAPI backend (http://localhost:8000)
   - ✅ Starts publishing worker
   - ✅ Starts React frontend (http://localhost:3000)

2. **Access the Application**
   - **CMS Dashboard**: http://localhost:3000
   - **API Docs**: http://localhost:8000/docs
   - **Health Check**: http://localhost:8000/health

### Demo Credentials

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| Admin | admin@example.com | admin123 | Full access + user management |
| Editor | editor@example.com | editor123 | Create/edit/publish content |
| Viewer | viewer@example.com | viewer123 | Read-only access |

## 🎯 Features Overview

### ✅ Dashboard
- Real-time statistics (total programs, lessons, users)
- Recent activity feed
- Quick navigation

### ✅ Program Management
- Create/Edit/Delete programs
- Multi-language support (EN, TE, HI, TA)
- Topic assignment
- Status management (draft/published/archived)

### ✅ Topic Management
- Create/Edit/Delete topics
- Topic-to-program relationships

### ✅ Term Management
- Create terms within programs
- Sequential numbering
- Title customization

### ✅ Lesson Management
- Create/Edit lessons with:
  - Title, content type (video/article)
  - Duration (for videos)
  - Multi-language content URLs
  - Paid/Free designation
- Publishing actions:
  - **Publish Now**: Immediate publishing
  - **Schedule**: Set future publish time (IST timezone)
  - **Archive**: Remove from public view

### ✅ User Management (Admin Only)
- View all registered users
- See user roles and status
- Track join dates

### ✅ Scheduled Publishing
- Worker checks every 60 seconds
- Auto-publishes scheduled lessons
- Auto-publishes parent program when first lesson goes live
- IST timezone support for scheduling

## 🧪 Testing the Complete Flow

### 1. First Time Setup
```bash
# Start everything
docker compose up --build

# Wait for "Application startup complete"
```

### 2. Login as Editor
- Open http://localhost:3000
- Click "Login" tab
- Email: `editor@example.com`
- Password: `editor123`

### 3. Explore Dashboard
- See 2 programs, 6 lessons, 4 users
- View recent activity

### 4. Create a New Program
- Click "📚 Programs" in sidebar
- Click "+ Add Program" button
- Fill in:
  - Title: "Python Basics"
  - Description: "Learn Python programming"
  - Language: English (EN)
  - Topics: Check "Programming"
- Click "Create Program"

### 5. Add a Term
- Click on your new program
- Click "+ Add Term"
- Term Number: 1
- Title: "Introduction"
- Click "Create Term"

### 6. Add a Lesson
- Click "+ Add Lesson" in your term
- Fill in:
  - Lesson Number: 1
  - Title: "Hello World"
  - Content Type: Video
  - Duration: 300 (seconds)
  - Content Language: English
  - Content URL: https://example.com/video.mp4
- Click "Create Lesson"

### 7. Schedule the Lesson
- Click "⏰ Schedule" button
- Enter time in IST (e.g., `2026-01-16T20:30`)
- Click OK
- See "Scheduled for: 16 Jan 2026, 8:30 PM IST"

### 8. Watch Auto-Publishing
- Wait 1-2 minutes (worker runs every 60 seconds)
- Refresh the page
- Status changes to "Published"
- See "✅ Published: [IST timestamp]"

### 9. View Public Catalog
- Open: http://localhost:8000/catalog/programs
- See only published programs with published lessons

### 10. Test Topics
- Click "🏷️ Topics" in sidebar
- Click "+ Add Topic"
- Create a new topic (e.g., "Data Science")
- Edit or delete existing topics

### 11. Admin Features (Login as Admin)
- Logout, login as: admin@example.com / admin123
- Click "👥 Users" tab
- See all registered users with roles and join dates

### 12. Register New User
- Logout
- Click "Sign Up" tab
- Create your own account
- New users get "Viewer" role by default

## 🗄️ Database Schema

### Entities & Relationships
```
users (authentication)
  └─ role: admin | editor | viewer

topics (categories)
  └─ many-to-many with programs

programs (main content)
  ├─ language_primary, languages_available
  ├─ status: draft | published | archived
  └─ has many terms

program_assets (posters)
  ├─ variants: portrait, landscape, square, banner
  └─ per language

terms (sections)
  ├─ term_number (unique per program)
  └─ has many lessons

lessons (content)
  ├─ lesson_number (unique per term)
  ├─ content_type: video | article
  ├─ multi-language content URLs
  ├─ status: draft | scheduled | published | archived
  ├─ publish_at (for scheduled)
  └─ published_at (for published)

lesson_assets (thumbnails)
  ├─ variants: portrait, landscape, square, banner
  └─ per language
```

### Key Constraints
- ✅ Unique `(program_id, term_number)`
- ✅ Unique `(term_id, lesson_number)`
- ✅ Unique `topic.name`
- ✅ Scheduled lessons require `publish_at`
- ✅ Published lessons require `published_at`
- ✅ Primary language must be in available languages

### Performance Indexes
- ✅ `lesson(status, publish_at)` - Worker queries
- ✅ `lesson(term_id, lesson_number)` - Lesson listing
- ✅ `program(status, language_primary, published_at)` - Catalog

## 🔐 Authentication & Authorization

### JWT-based Authentication
- Tokens stored in localStorage
- 30-minute expiration
- Auto-refresh on page load

### Role-Based Access Control

| Feature | Admin | Editor | Viewer |
|---------|-------|--------|--------|
| View Dashboard | ✅ | ✅ | ✅ |
| View Programs/Lessons | ✅ | ✅ | ✅ |
| Create Programs | ✅ | ✅ | ❌ |
| Edit Programs | ✅ | ✅ | ❌ |
| Delete Programs | ✅ | ❌ | ❌ |
| Create Topics | ✅ | ✅ | ❌ |
| Delete Topics | ✅ | ❌ | ❌ |
| Create Terms/Lessons | ✅ | ✅ | ❌ |
| Publish/Schedule | ✅ | ✅ | ❌ |
| View Users | ✅ | ❌ | ❌ |

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register (default role: viewer)
- `GET /api/auth/me` - Get current user

### Programs
- `GET /api/programs` - List all programs
- `GET /api/programs/{id}` - Get program details
- `POST /api/programs` - Create program (Admin/Editor)
- `PUT /api/programs/{id}` - Update program (Admin/Editor)
- `DELETE /api/programs/{id}` - Delete program (Admin only)

### Topics
- `GET /api/topics` - List all topics
- `POST /api/topics` - Create topic (Admin/Editor)
- `PUT /api/topics/{id}` - Update topic (Admin/Editor)
- `DELETE /api/topics/{id}` - Delete topic (Admin only)

### Terms
- `GET /api/programs/{id}/terms` - List terms in program
- `POST /api/programs/{id}/terms` - Create term (Admin/Editor)

### Lessons
- `GET /api/terms/{id}/lessons` - List lessons in term
- `POST /api/terms/{id}/lessons` - Create lesson (Admin/Editor)
- `POST /api/lessons/{id}/publish` - Publish/Schedule/Archive (Admin/Editor)
  - Actions: `publish_now`, `schedule`, `archive`
  - For schedule: provide `publish_at` in ISO format

### Dashboard
- `GET /api/dashboard/stats` - Get statistics and recent activity

### Users (Admin only)
- `GET /api/users` - List all users

### Public Catalog (No auth required)
- `GET /catalog/programs` - Published programs only
  - Filters: `?language=en&topic=Mathematics`
  - Pagination: `?cursor=xxx&limit=10`
- `GET /catalog/programs/{id}` - Program with published lessons only
- `GET /catalog/lessons/{id}` - Published lesson details

### Health
- `GET /health` - Check API and database status

## ⚙️ Worker Implementation

### Auto-Publishing Logic

**File**: `worker.py`

**Process**:
1. Runs every 60 seconds
2. Finds lessons with `status='scheduled'` and `publish_at <= NOW()`
3. Locks rows with `FOR UPDATE SKIP LOCKED` (prevents race conditions)
4. Updates each lesson:
   - Set `status='published'`
   - Set `published_at=NOW()`
5. Auto-publishes parent program if needed:
   - If program has ≥1 published lesson
   - And program status is still 'draft'
   - Set program to 'published'

**Safety Features**:
- ✅ Idempotent (safe to rerun)
- ✅ Concurrency-safe (row-level locks)
- ✅ Transactional (each lesson in its own transaction)
- ✅ Structured logging

## 🕐 IST Timezone Support

All times in the UI are displayed in **IST (India Standard Time)**:
- ✅ Scheduled times show in IST
- ✅ Published times show in IST
- ✅ User join dates show in IST
- ✅ Scheduling prompt suggests IST times

**Format**: `16 Jan 2026, 8:05 PM IST`

## 📊 Seed Data

Automatically created on first run:

**Users**:
- admin@example.com (Admin)
- editor@example.com (Editor)
- viewer@example.com (Viewer)

**Topics**:
- Mathematics
- Science
- Language

**Programs**:
1. Foundation Mathematics (Telugu + English) - Published
2. Science Fundamentals (Hindi) - Published

**Lessons**: 6 total
- 4 Published
- 1 Scheduled (auto-publishes in 2 minutes)
- 1 Draft

## 🐳 Deployment

### Railway.app (Recommended)

**1. Database**:
- Create PostgreSQL service
- Copy DATABASE_URL

**2. Backend**:
- Create Web Service
- Root: `backend/`
- Environment variables:
```
  DATABASE_URL=postgresql://...
  SECRET_KEY=your-secret-key-here
  ALGORITHM=HS256
  ACCESS_TOKEN_EXPIRE_MINUTES=30
```

**3. Worker**:
- Create Web Service
- Root: `backend/`
- Start command: `python worker.py`
- Same environment variables as backend

**4. Frontend**:
- Create Web Service
- Root: `frontend/`
- Environment variable:
```
  REACT_APP_API_URL=https://your-backend.railway.app
```

**5. Run Seed** (one-time):
- In backend service settings
- Run: `python seed.py`

## 🛠️ Troubleshooting

**Port 5432 already in use**:
```bash
# docker-compose.yml already uses port 5433
# If still issues, stop local PostgreSQL:
# Mac: brew services stop postgresql
# Linux: sudo systemctl stop postgresql
# Windows: services.msc → PostgreSQL → Stop
```

**Frontend can't connect to API**:
- Check browser console for CORS errors
- Verify REACT_APP_API_URL is set correctly
- For local: `http://localhost:8000`
- For production: Your deployed backend URL

**Worker not publishing**:
```bash
docker logs cms_worker
# Check for errors
# Verify lesson has publish_at in the past
```

**IST times not showing**:
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Check browser console for errors

## 📝 Code Statistics

- **Backend**: ~1,000 lines (main.py, models.py, security.py)
- **Frontend**: ~1,500 lines (complete CMS UI)
- **Total**: ~2,500 lines of clean, production-ready code

## 🎨 UI Features

### Sidebar Navigation
- Dashboard
- Programs
- Topics
- Users (Admin only)
- User profile card with avatar
- Logout button

### Modal-Based UI
- All create/edit operations in modals
- Form validation
- Success/error notifications
- Responsive design

### Color-Coded Status Badges
- 🟢 Published (green)
- 🟡 Scheduled (yellow)
- ⚪ Draft (gray)
- 🔴 Archived (red)

## ✅ All Requirements Met

- [x] Full CRUD for Programs, Topics, Terms, Lessons
- [x] Multi-language support
- [x] Publishing workflow (draft → scheduled → published → archived)
- [x] Scheduled publishing with worker
- [x] Auto-publish parent program
- [x] Role-based access control (3 roles)
- [x] Public catalog API
- [x] User registration
- [x] Topic management
- [x] IST timezone display
- [x] Dashboard with stats
- [x] Database constraints & indexes
- [x] Health check endpoint
- [x] Docker compose setup
- [x] Seed data script
- [x] JWT authentication
- [x] Password hashing
- [x] Modals for all forms
- [x] Responsive UI

## 🚀 Future Enhancements

- [ ] File upload for posters/thumbnails (S3/Cloudinary)
- [ ] Search functionality
- [ ] Bulk operations
- [ ] Content versioning
- [ ] Email notifications
- [ ] Analytics dashboard
- [ ] Export to CSV/PDF
- [ ] Dark mode

## 📞 Support

**Deployed URLs**:
- Frontend: [https://your-app.vercel.app](https://cms-project-sigma.vercel.app/)
- Backend: [https://your-api.railway.app](https://cms-backend-production-e076.up.railway.app)
- API Docs: [https://your-api.railway.app/docs](https://cms-backend-production-e076.up.railway.app/docs)

---

**Built with**: React, FastAPI, PostgreSQL, Docker
**Author**: Karthik 
**License**: MIT
