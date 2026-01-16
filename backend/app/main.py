"""
CMS API - Main Application File
================================
Clean, simple, and easy to understand!

This file contains all API endpoints organized in sections:
1. Health Check
2. Authentication (login, get user)
3. Topics (list, create)
4. Programs (list, create, update, add assets)
5. Terms (list, create)
6. Lessons (list, create, update, publish, add assets)
7. Public Catalog API (no auth required)
"""

from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
import os

# Import our modules
from app.models.models import *
from app.db.database import get_db, engine, Base
from app.core.security import hash_password, verify_password, create_token, decode_token

# Create all database tables
Base.metadata.create_all(bind=engine)

# Initialize app
app = FastAPI(title="CMS API", version="1.0.0")

# Enable CORS so frontend can call API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://cms-project-sigma.vercel.app",
        "http://localhost:3000",  # optional
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


#================================================================
# HELPER FUNCTIONS
#================================================================

def get_current_user(authorization: str, db: Session) -> User:
    """Get user from JWT token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    email = decode_token(token)
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user


def require_role(user: User, allowed_roles: list):
    """Check if user has required role"""
    if user.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Not authorized")


def format_program(program: Program) -> dict:
    """Format program for API response"""
    # Convert assets to nested dict: {language: {variant: url}}
    assets = {}
    for asset in program.assets:
        if asset.language not in assets:
            assets[asset.language] = {}
        assets[asset.language][asset.variant.value] = asset.url
    
    return {
        "id": str(program.id),
        "title": program.title,
        "description": program.description,
        "language_primary": program.language_primary,
        "languages_available": program.languages_available,
        "status": program.status.value,
        "published_at": program.published_at.isoformat() if program.published_at else None,
        "created_at": program.created_at.isoformat(),
        "updated_at": program.updated_at.isoformat(),
        "topics": [{"id": str(t.id), "name": t.name, "created_at": t.created_at.isoformat()} for t in program.topics],
        "assets": assets
    }


def format_lesson(lesson: Lesson) -> dict:
    """Format lesson for API response"""
    # Convert assets to nested dict
    assets = {}
    for asset in lesson.assets:
        if asset.language not in assets:
            assets[asset.language] = {}
        assets[asset.language][asset.variant.value] = asset.url
    
    return {
        "id": str(lesson.id),
        "term_id": str(lesson.term_id),
        "lesson_number": lesson.lesson_number,
        "title": lesson.title,
        "content_type": lesson.content_type.value,
        "duration_ms": lesson.duration_ms,
        "is_paid": lesson.is_paid,
        "content_language_primary": lesson.content_language_primary,
        "content_languages_available": lesson.content_languages_available,
        "content_urls_by_language": lesson.content_urls_by_language,
        "subtitle_languages": lesson.subtitle_languages,
        "subtitle_urls_by_language": lesson.subtitle_urls_by_language,
        "status": lesson.status.value,
        "publish_at": lesson.publish_at.isoformat() if lesson.publish_at else None,
        "published_at": lesson.published_at.isoformat() if lesson.published_at else None,
        "created_at": lesson.created_at.isoformat(),
        "updated_at": lesson.updated_at.isoformat(),
        "assets": assets
    }


#================================================================
# 1. HEALTH CHECK
#================================================================

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Check if API and database are working"""
    try:
        db.execute("SELECT 1")
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": "disconnected", "error": str(e)}


#================================================================
# 2. AUTHENTICATION
#================================================================

@app.post("/api/auth/login")
def login(data: dict, db: Session = Depends(get_db)):
    """Login and get JWT token"""
    email = data.get("email")
    password = data.get("password")
    
    # Find user
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check password
    if not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create token
    token = create_token(user.email)
    return {"access_token": token, "token_type": "bearer"}


@app.get("/api/auth/me")
def get_me(authorization: str = Header(None), db: Session = Depends(get_db)):
    """Get current user info"""
    user = get_current_user(authorization, db)
    
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role.value,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat()
    }


#================================================================
# 3. TOPICS
#================================================================

@app.get("/api/topics")
def list_topics(db: Session = Depends(get_db)):
    """Get all topics"""
    topics = db.query(Topic).all()
    return [{"id": str(t.id), "name": t.name, "created_at": t.created_at.isoformat()} for t in topics]


@app.post("/api/topics")
def create_topic(data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    """Create new topic (Admin/Editor only)"""
    user = get_current_user(authorization, db)
    require_role(user, [UserRole.admin, UserRole.editor])
    
    topic = Topic(name=data["name"])
    db.add(topic)
    db.commit()
    db.refresh(topic)
    
    return {"id": str(topic.id), "name": topic.name, "created_at": topic.created_at.isoformat()}


#================================================================
# 4. PROGRAMS
#================================================================

@app.get("/api/programs")
def list_programs(
    status: Optional[str] = None,
    language: Optional[str] = None,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """List all programs with optional filters"""
    user = get_current_user(authorization, db)
    
    query = db.query(Program)
    
    # Apply filters
    if status:
        query = query.filter(Program.status == status)
    if language:
        query = query.filter(Program.language_primary == language)
    
    programs = query.all()
    return [format_program(p) for p in programs]


@app.get("/api/programs/{program_id}")
def get_program(program_id: str, authorization: str = Header(None), db: Session = Depends(get_db)):
    """Get single program"""
    user = get_current_user(authorization, db)
    
    program = db.query(Program).filter(Program.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    return format_program(program)


@app.post("/api/programs")
def create_program(data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    """Create new program (Admin/Editor only)"""
    user = get_current_user(authorization, db)
    require_role(user, [UserRole.admin, UserRole.editor])
    
    program = Program(
        title=data["title"],
        description=data.get("description"),
        language_primary=data["language_primary"],
        languages_available=data["languages_available"]
    )
    
    # Add topics
    if "topic_ids" in data:
        topics = db.query(Topic).filter(Topic.id.in_(data["topic_ids"])).all()
        program.topics = topics
    
    db.add(program)
    db.commit()
    db.refresh(program)
    
    return format_program(program)


@app.patch("/api/programs/{program_id}")
def update_program(program_id: str, data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    """Update program (Admin/Editor only)"""
    user = get_current_user(authorization, db)
    require_role(user, [UserRole.admin, UserRole.editor])
    
    program = db.query(Program).filter(Program.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    # Update fields
    if "title" in data:
        program.title = data["title"]
    if "description" in data:
        program.description = data["description"]
    if "status" in data:
        program.status = data["status"]
    if "topic_ids" in data:
        topics = db.query(Topic).filter(Topic.id.in_(data["topic_ids"])).all()
        program.topics = topics
    
    program.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(program)
    
    return format_program(program)


@app.post("/api/programs/{program_id}/assets")
def add_program_asset(program_id: str, data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    """Add poster to program (Admin/Editor only)"""
    user = get_current_user(authorization, db)
    require_role(user, [UserRole.admin, UserRole.editor])
    
    program = db.query(Program).filter(Program.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    asset = ProgramAsset(
        program_id=program_id,
        language=data["language"],
        variant=data["variant"],
        asset_type=AssetType.poster,
        url=data["url"]
    )
    
    db.add(asset)
    db.commit()
    db.refresh(asset)
    
    return {"id": str(asset.id), "language": asset.language, "variant": asset.variant.value, "url": asset.url}


#================================================================
# 5. TERMS
#================================================================

@app.get("/api/programs/{program_id}/terms")
def list_terms(program_id: str, authorization: str = Header(None), db: Session = Depends(get_db)):
    """Get all terms for a program"""
    user = get_current_user(authorization, db)
    
    terms = db.query(Term).filter(Term.program_id == program_id).order_by(Term.term_number).all()
    
    return [
        {
            "id": str(t.id),
            "program_id": str(t.program_id),
            "term_number": t.term_number,
            "title": t.title,
            "created_at": t.created_at.isoformat()
        }
        for t in terms
    ]


@app.post("/api/terms")
def create_term(data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    """Create new term (Admin/Editor only)"""
    user = get_current_user(authorization, db)
    require_role(user, [UserRole.admin, UserRole.editor])
    
    term = Term(
        program_id=data["program_id"],
        term_number=data["term_number"],
        title=data.get("title")
    )
    
    db.add(term)
    db.commit()
    db.refresh(term)
    
    return {
        "id": str(term.id),
        "program_id": str(term.program_id),
        "term_number": term.term_number,
        "title": term.title
    }


#================================================================
# 6. LESSONS
#================================================================

@app.get("/api/terms/{term_id}/lessons")
def list_lessons(term_id: str, authorization: str = Header(None), db: Session = Depends(get_db)):
    """Get all lessons for a term"""
    user = get_current_user(authorization, db)
    
    lessons = db.query(Lesson).filter(Lesson.term_id == term_id).order_by(Lesson.lesson_number).all()
    return [format_lesson(l) for l in lessons]


@app.get("/api/lessons/{lesson_id}")
def get_lesson(lesson_id: str, authorization: str = Header(None), db: Session = Depends(get_db)):
    """Get single lesson"""
    user = get_current_user(authorization, db)
    
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    return format_lesson(lesson)


@app.post("/api/lessons")
def create_lesson(data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    """Create new lesson (Admin/Editor only)"""
    user = get_current_user(authorization, db)
    require_role(user, [UserRole.admin, UserRole.editor])
    
    lesson = Lesson(
        term_id=data["term_id"],
        lesson_number=data["lesson_number"],
        title=data["title"],
        content_type=data["content_type"],
        duration_ms=data.get("duration_ms"),
        is_paid=data.get("is_paid", False),
        content_language_primary=data["content_language_primary"],
        content_languages_available=data["content_languages_available"],
        content_urls_by_language=data["content_urls_by_language"],
        subtitle_languages=data.get("subtitle_languages", []),
        subtitle_urls_by_language=data.get("subtitle_urls_by_language", {})
    )
    
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    
    return format_lesson(lesson)


@app.patch("/api/lessons/{lesson_id}")
def update_lesson(lesson_id: str, data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    """Update lesson (Admin/Editor only)"""
    user = get_current_user(authorization, db)
    require_role(user, [UserRole.admin, UserRole.editor])
    
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    # Update fields
    allowed_fields = [
        "title", "content_type", "duration_ms", "is_paid", 
        "content_language_primary", "content_languages_available", 
        "content_urls_by_language", "subtitle_languages", "subtitle_urls_by_language"
    ]
    
    for field in allowed_fields:
        if field in data:
            setattr(lesson, field, data[field])
    
    lesson.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(lesson)
    
    return format_lesson(lesson)


@app.post("/api/lessons/{lesson_id}/publish")
def publish_lesson(lesson_id: str, data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    """
    Publish, schedule, or archive a lesson (Admin/Editor only)
    
    Actions:
    - publish_now: Publish immediately
    - schedule: Schedule for later (requires publish_at)
    - archive: Archive the lesson
    """
    user = get_current_user(authorization, db)
    require_role(user, [UserRole.admin, UserRole.editor])
    
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    action = data["action"]
    
    if action == "publish_now":
        # Publish immediately
        lesson.status = LessonStatus.published
        lesson.published_at = datetime.utcnow()
        lesson.publish_at = None
        
        # Auto-publish program
        term = db.query(Term).filter(Term.id == lesson.term_id).first()
        if term:
            program = db.query(Program).filter(Program.id == term.program_id).first()
            if program and program.status == ProgramStatus.draft:
                program.status = ProgramStatus.published
                if not program.published_at:
                    program.published_at = datetime.utcnow()
    
    elif action == "schedule":
        # Schedule for later
        if not data.get("publish_at"):
            raise HTTPException(status_code=400, detail="publish_at required for scheduling")
        
        lesson.status = LessonStatus.scheduled
        lesson.publish_at = datetime.fromisoformat(data["publish_at"].replace('Z', '+00:00'))
    
    elif action == "archive":
        # Archive lesson
        lesson.status = LessonStatus.archived
    
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    db.commit()
    db.refresh(lesson)
    
    return format_lesson(lesson)


@app.post("/api/lessons/{lesson_id}/assets")
def add_lesson_asset(lesson_id: str, data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    """Add thumbnail to lesson (Admin/Editor only)"""
    user = get_current_user(authorization, db)
    require_role(user, [UserRole.admin, UserRole.editor])
    
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    asset = LessonAsset(
        lesson_id=lesson_id,
        language=data["language"],
        variant=data["variant"],
        asset_type=AssetType.thumbnail,
        url=data["url"]
    )
    
    db.add(asset)
    db.commit()
    db.refresh(asset)
    
    return {"id": str(asset.id), "language": asset.language, "variant": asset.variant.value, "url": asset.url}


#================================================================
# 7. PUBLIC CATALOG API (No Auth Required!)
#================================================================

@app.get("/catalog/programs")
def catalog_list_programs(
    language: Optional[str] = None,
    topic: Optional[str] = None,
    cursor: Optional[str] = None,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    Public API: List published programs
    Only shows programs with at least one published lesson
    """
    query = db.query(Program).filter(Program.status == ProgramStatus.published)
    
    # Filters
    if language:
        query = query.filter(Program.language_primary == language)
    if topic:
        query = query.join(Program.topics).filter(Topic.name == topic)
    
    # Only programs with published lessons
    query = query.join(Term).join(Lesson).filter(Lesson.status == LessonStatus.published).distinct()
    
    # Sort by most recently published
    query = query.order_by(Program.published_at.desc())
    
    # Cursor pagination
    if cursor:
        cursor_date = datetime.fromisoformat(cursor)
        query = query.filter(Program.published_at < cursor_date)
    
    programs = query.limit(limit + 1).all()
    
    # Check if more results
    has_more = len(programs) > limit
    programs = programs[:limit]
    
    next_cursor = None
    if has_more and programs:
        next_cursor = programs[-1].published_at.isoformat()
    
    return {
        "data": [format_program(p) for p in programs],
        "next_cursor": next_cursor,
        "has_more": has_more
    }


@app.get("/catalog/programs/{program_id}")
def catalog_get_program(program_id: str, db: Session = Depends(get_db)):
    """Public API: Get program with published lessons only"""
    program = db.query(Program).filter(
        Program.id == program_id,
        Program.status == ProgramStatus.published
    ).first()
    
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    # Build response with published lessons only
    result = format_program(program)
    result["terms"] = []
    
    for term in sorted(program.terms, key=lambda t: t.term_number):
        published_lessons = [l for l in term.lessons if l.status == LessonStatus.published]
        if published_lessons:
            result["terms"].append({
                "id": str(term.id),
                "term_number": term.term_number,
                "title": term.title,
                "lessons": [format_lesson(l) for l in sorted(published_lessons, key=lambda x: x.lesson_number)]
            })
    
    return result


@app.get("/catalog/lessons/{lesson_id}")
def catalog_get_lesson(lesson_id: str, db: Session = Depends(get_db)):
    """Public API: Get published lesson"""
    lesson = db.query(Lesson).filter(
        Lesson.id == lesson_id,
        Lesson.status == LessonStatus.published
    ).first()
    
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    return format_lesson(lesson)


@app.post("/api/auth/register")
def register(data: dict, db: Session = Depends(get_db)):
    """
    Register new user
    Default role: viewer
    """
    email = data.get("email")
    password = data.get("password")
    full_name = data.get("full_name")

    # Check if user exists
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    user = User(
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name,
        role=UserRole.viewer  # New users are viewers by default
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    # Create token
    token = create_token(user.email)

    return {"access_token": token, "token_type": "bearer"}


@app.get("/api/users")
def list_users(authorization: str = Header(None), db: Session = Depends(get_db)):
    """
    List all users (Admin only)
    """
    user = get_current_user(authorization, db)
    require_role(user, [UserRole.admin])

    users = db.query(User).all()
    return [
        {
            "id": str(u.id),
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role.value,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat()
        }
        for u in users
    ]


# ======== 8. TOPICS MANAGEMENT ========

@app.post("/api/users")
def create_user(data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    """Create new user (Admin only)"""
    current_user = get_current_user(authorization, db)
    require_role(current_user, [UserRole.admin])

    email = data.get("email")
    password = data.get("password")
    full_name = data.get("full_name")
    role = data.get("role", UserRole.viewer)

    # Check if user exists
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    user = User(
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name,
        role=role
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role.value,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat()
    }


@app.delete("/api/users/{user_id}")
def delete_user(user_id: str, authorization: str = Header(None), db: Session = Depends(get_db)):
    """Delete user (Admin only)"""
    current_user = get_current_user(authorization, db)
    require_role(current_user, [UserRole.admin])
    
    # Prevent deleting yourself
    if str(current_user.id) == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()

    return {"message": "User deleted successfully"}

@app.get("/api/topics")
def list_topics(db: Session = Depends(get_db)):
    """Get all topics"""
    topics = db.query(Topic).all()
    return [{"id": str(t.id), "name": t.name, "created_at": t.created_at.isoformat()} for t in topics]


@app.post("/api/topics")
def create_topic(data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    """Create new topic (Admin/Editor only)"""
    user = get_current_user(authorization, db)
    require_role(user, [UserRole.admin, UserRole.editor])

    name = data.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="Topic name is required")

    existing = db.query(Topic).filter(Topic.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Topic already exists")

    topic = Topic(name=name)
    db.add(topic)
    db.commit()
    db.refresh(topic)

    return {"id": str(topic.id), "name": topic.name, "created_at": topic.created_at.isoformat()}


@app.put("/api/topics/{topic_id}")
def update_topic(topic_id: str, data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    """Update topic"""
    user = get_current_user(authorization, db)
    require_role(user, [UserRole.admin, UserRole.editor])

    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    if "name" in data:
        existing = db.query(Topic).filter(Topic.name == data["name"], Topic.id != topic_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Topic name already exists")
        topic.name = data["name"]

    db.commit()
    return {"id": str(topic.id), "name": topic.name}


@app.delete("/api/topics/{topic_id}")
def delete_topic(topic_id: str, authorization: str = Header(None), db: Session = Depends(get_db)):
    """Delete topic (Admin only)"""
    user = get_current_user(authorization, db)
    require_role(user, [UserRole.admin])

    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    db.delete(topic)
    db.commit()
    return {"message": "Topic deleted"}


# ======== 9. PROGRAM MANAGEMENT ========

@app.post("/api/programs")
def create_program(data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    """Create program"""
    user = get_current_user(authorization, db)
    require_role(user, [UserRole.admin, UserRole.editor])

    title = data.get("title")
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")

    language_primary = data.get("language_primary", "en")
    languages_available = data.get("languages_available", [language_primary])

    if language_primary not in languages_available:
        languages_available.append(language_primary)

    program = Program(
        title=title,
        description=data.get("description", ""),
        language_primary=language_primary,
        languages_available=languages_available,
        status=ProgramStatus.draft
    )

    if "topic_ids" in data:
        topics = db.query(Topic).filter(Topic.id.in_(data["topic_ids"])).all()
        program.topics = topics

    db.add(program)
    db.commit()
    db.refresh(program)

    return format_program(program)


@app.put("/api/programs/{program_id}")
def update_program(program_id: str, data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    """Update program"""
    user = get_current_user(authorization, db)
    require_role(user, [UserRole.admin, UserRole.editor])

    program = db.query(Program).filter(Program.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    if "title" in data:
        program.title = data["title"]
    if "description" in data:
        program.description = data["description"]
    if "language_primary" in data:
        program.language_primary = data["language_primary"]
    if "languages_available" in data:
        program.languages_available = data["languages_available"]
    if "topic_ids" in data:
        topics = db.query(Topic).filter(Topic.id.in_(data["topic_ids"])).all()
        program.topics = topics

    program.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(program)

    return format_program(program)


@app.delete("/api/programs/{program_id}")
def delete_program(program_id: str, authorization: str = Header(None), db: Session = Depends(get_db)):
    """Delete program (Admin only)"""
    user = get_current_user(authorization, db)
    require_role(user, [UserRole.admin])

    program = db.query(Program).filter(Program.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    db.delete(program)
    db.commit()
    return {"message": "Program deleted"}


# ======== 10. TERM MANAGEMENT ========

@app.post("/api/programs/{program_id}/terms")
def create_term(program_id: str, data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    """Create term"""
    user = get_current_user(authorization, db)
    require_role(user, [UserRole.admin, UserRole.editor])

    program = db.query(Program).filter(Program.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    term_number = data.get("term_number")
    if not term_number:
        raise HTTPException(status_code=400, detail="Term number required")

    existing = db.query(Term).filter(Term.program_id == program_id, Term.term_number == term_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Term number already exists")

    term = Term(
        program_id=program_id,
        term_number=term_number,
        title=data.get("title", "")
    )

    db.add(term)
    db.commit()
    db.refresh(term)

    return {"id": str(term.id), "term_number": term.term_number, "title": term.title}


# ======== 11. LESSON MANAGEMENT ========

@app.post("/api/terms/{term_id}/lessons")
def create_lesson(term_id: str, data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    """Create lesson"""
    user = get_current_user(authorization, db)
    require_role(user, [UserRole.admin, UserRole.editor])

    term = db.query(Term).filter(Term.id == term_id).first()
    if not term:
        raise HTTPException(status_code=404, detail="Term not found")

    lesson_number = data.get("lesson_number")
    title = data.get("title")

    if not lesson_number or not title:
        raise HTTPException(status_code=400, detail="Lesson number and title required")

    existing = db.query(Lesson).filter(Lesson.term_id == term_id, Lesson.lesson_number == lesson_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Lesson number already exists")

    content_language_primary = data.get("content_language_primary", "en")
    content_languages_available = data.get("content_languages_available", [content_language_primary])

    if content_language_primary not in content_languages_available:
        content_languages_available.append(content_language_primary)

    lesson = Lesson(
        term_id=term_id,
        lesson_number=lesson_number,
        title=title,
        content_type=ContentType[data.get("content_type", "video")],
        duration_ms=data.get("duration_ms"),
        is_paid=data.get("is_paid", False),
        content_language_primary=content_language_primary,
        content_languages_available=content_languages_available,
        content_urls_by_language=data.get("content_urls_by_language", {}),
        subtitle_languages=data.get("subtitle_languages", []),
        subtitle_urls_by_language=data.get("subtitle_urls_by_language", {}),
        status=LessonStatus.draft
    )

    db.add(lesson)
    db.commit()
    db.refresh(lesson)

    return format_lesson(lesson)


# ======== 12. DASHBOARD STATS ========

@app.get("/api/dashboard/stats")
def get_dashboard_stats(authorization: str = Header(None), db: Session = Depends(get_db)):
    """Get dashboard statistics"""
    user = get_current_user(authorization, db)

    total_programs = db.query(Program).count()
    total_lessons = db.query(Lesson).count()
    total_users = db.query(User).count()
    published_programs = db.query(Program).filter(Program.status == ProgramStatus.published).count()
    published_lessons = db.query(Lesson).filter(Lesson.status == LessonStatus.published).count()

    # Recent activity
    recent_lessons = db.query(Lesson).filter(
        Lesson.status.in_([LessonStatus.published, LessonStatus.scheduled])
    ).order_by(Lesson.updated_at.desc()).limit(5).all()

    activity = []
    for lesson in recent_lessons:
        activity.append({
            "id": str(lesson.id),
            "title": lesson.title,
            "status": lesson.status.value,
            "updated_at": lesson.updated_at.isoformat(),
            "publish_at": lesson.publish_at.isoformat() if lesson.publish_at else None,
            "published_at": lesson.published_at.isoformat() if lesson.published_at else None
        })

    return {
        "total_programs": total_programs,
        "total_lessons": total_lessons,
        "total_users": total_users,
        "published_programs": published_programs,
        "published_lessons": published_lessons,
        "recent_activity": activity
    }




#================================================================
# RUN THE SERVER
#================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
