"""
Seed Data Script
Creates sample users, programs, terms, and lessons
"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.db.database import SessionLocal, engine
from app.models.models import (
    User, UserRole, Topic, Program, ProgramStatus, Term, Lesson,
    LessonStatus, ContentType, ProgramAsset, LessonAsset, AssetVariant, AssetType, Base
)
from app.core.security import hash_password  # ← CORRECT IMPORT!


def create_seed_data():
    """Create all seed data"""
    # Create tables
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()

    try:
        print("Creating seed data...")

        # Create users
        admin = User(
            email="admin@example.com",
            hashed_password=hash_password("admin123"),  # ← CORRECT!
            full_name="Admin User",
            role=UserRole.admin
        )
        editor = User(
            email="editor@example.com",
            hashed_password=hash_password("editor123"),  # ← CORRECT!
            full_name="Editor User",
            role=UserRole.editor
        )
        viewer = User(
            email="viewer@example.com",
            hashed_password=hash_password("viewer123"),  # ← CORRECT!
            full_name="Viewer User",
            role=UserRole.viewer
        )
        db.add_all([admin, editor, viewer])
        db.commit()
        print("✓ Created 3 users")

        # Create topics
        math_topic = Topic(name="Mathematics")
        science_topic = Topic(name="Science")
        language_topic = Topic(name="Language")
        db.add_all([math_topic, science_topic, language_topic])
        db.commit()
        print("✓ Created 3 topics")

        # Program 1
        program1 = Program(
            title="Foundation Mathematics",
            description="Complete mathematics program for beginners",
            language_primary="te",
            languages_available=["te", "en"],
            status=ProgramStatus.draft
        )
        program1.topics = [math_topic]
        db.add(program1)
        db.commit()
        db.refresh(program1)
        print("✓ Created Program 1")

        # Program 1 assets
        p1_assets = [
            ProgramAsset(program_id=program1.id, language="te", variant=AssetVariant.portrait,
                         asset_type=AssetType.poster, url="https://picsum.photos/400/600?random=1"),
            ProgramAsset(program_id=program1.id, language="te", variant=AssetVariant.landscape,
                         asset_type=AssetType.poster, url="https://picsum.photos/600/400?random=2"),
        ]
        db.add_all(p1_assets)
        db.commit()
        print("✓ Added Program 1 assets")

        # Term 1
        term1 = Term(program_id=program1.id, term_number=1, title="Basic Algebra")
        db.add(term1)
        db.commit()
        db.refresh(term1)
        print("✓ Created Term 1")

        # Lesson 1 - Published
        lesson1 = Lesson(
            term_id=term1.id, lesson_number=1, title="Introduction to Numbers",
            content_type=ContentType.video, duration_ms=300000, is_paid=False,
            content_language_primary="te", content_languages_available=["te", "en"],
            content_urls_by_language={"te": "https://example.com/video1.mp4",
                                      "en": "https://example.com/video1-en.mp4"},
            subtitle_languages=["te", "en"], subtitle_urls_by_language={"te": "https://example.com/sub1.vtt"},
            status=LessonStatus.published, published_at=datetime.utcnow()
        )
        db.add(lesson1)
        db.commit()
        db.refresh(lesson1)

        l1_assets = [
            LessonAsset(lesson_id=lesson1.id, language="te", variant=AssetVariant.portrait,
                        asset_type=AssetType.thumbnail, url="https://picsum.photos/400/600?random=5"),
            LessonAsset(lesson_id=lesson1.id, language="te", variant=AssetVariant.landscape,
                        asset_type=AssetType.thumbnail, url="https://picsum.photos/600/400?random=6"),
        ]
        db.add_all(l1_assets)
        db.commit()
        print("✓ Created Lesson 1 (published)")

        # Lesson 2 - Scheduled (publishes in 2 minutes)
        lesson2 = Lesson(
            term_id=term1.id, lesson_number=2, title="Understanding Addition",
            content_type=ContentType.video, duration_ms=360000, is_paid=False,
            content_language_primary="te", content_languages_available=["te"],
            content_urls_by_language={"te": "https://example.com/video2.mp4"},
            subtitle_languages=[], subtitle_urls_by_language={},
            status=LessonStatus.scheduled, publish_at=datetime.utcnow() + timedelta(minutes=2)
        )
        db.add(lesson2)
        db.commit()
        db.refresh(lesson2)

        l2_assets = [
            LessonAsset(lesson_id=lesson2.id, language="te", variant=AssetVariant.portrait,
                        asset_type=AssetType.thumbnail, url="https://picsum.photos/400/600?random=9"),
            LessonAsset(lesson_id=lesson2.id, language="te", variant=AssetVariant.landscape,
                        asset_type=AssetType.thumbnail, url="https://picsum.photos/600/400?random=10"),
        ]
        db.add_all(l2_assets)
        db.commit()
        print("✓ Created Lesson 2 (scheduled for 2 minutes)")

        # Lesson 3 - Draft
        lesson3 = Lesson(
            term_id=term1.id, lesson_number=3, title="Subtraction Basics",
            content_type=ContentType.article, is_paid=False,
            content_language_primary="en", content_languages_available=["en"],
            content_urls_by_language={"en": "https://example.com/article3.html"},
            subtitle_languages=[], subtitle_urls_by_language={},
            status=LessonStatus.draft
        )
        db.add(lesson3)
        db.commit()
        db.refresh(lesson3)

        l3_assets = [
            LessonAsset(lesson_id=lesson3.id, language="en", variant=AssetVariant.portrait,
                        asset_type=AssetType.thumbnail, url="https://picsum.photos/400/600?random=11"),
            LessonAsset(lesson_id=lesson3.id, language="en", variant=AssetVariant.landscape,
                        asset_type=AssetType.thumbnail, url="https://picsum.photos/600/400?random=12"),
        ]
        db.add_all(l3_assets)
        db.commit()
        print("✓ Created Lesson 3 (draft)")

        # Publish Program 1
        program1.status = ProgramStatus.published
        program1.published_at = datetime.utcnow()
        db.commit()
        print("✓ Published Program 1")

        # Program 2
        program2 = Program(
            title="Science Fundamentals",
            description="Explore the world of science",
            language_primary="hi",
            languages_available=["hi"],
            status=ProgramStatus.draft
        )
        program2.topics = [science_topic]
        db.add(program2)
        db.commit()
        db.refresh(program2)
        print("✓ Created Program 2")

        # Program 2 assets
        p2_assets = [
            ProgramAsset(program_id=program2.id, language="hi", variant=AssetVariant.portrait,
                         asset_type=AssetType.poster, url="https://picsum.photos/400/600?random=13"),
            ProgramAsset(program_id=program2.id, language="hi", variant=AssetVariant.landscape,
                         asset_type=AssetType.poster, url="https://picsum.photos/600/400?random=14"),
        ]
        db.add_all(p2_assets)
        db.commit()
        print("✓ Added Program 2 assets")

        # Term 2
        term2 = Term(program_id=program2.id, term_number=1, title="Physics Basics")
        db.add(term2)
        db.commit()
        db.refresh(term2)
        print("✓ Created Term 2")

        # Lesson 4 - Published
        lesson4 = Lesson(
            term_id=term2.id, lesson_number=1, title="गति के नियम (Laws of Motion)",
            content_type=ContentType.video, duration_ms=420000, is_paid=True,
            content_language_primary="hi", content_languages_available=["hi"],
            content_urls_by_language={"hi": "https://example.com/video4.mp4"},
            subtitle_languages=["hi"], subtitle_urls_by_language={"hi": "https://example.com/sub4.vtt"},
            status=LessonStatus.published, published_at=datetime.utcnow()
        )
        db.add(lesson4)
        db.commit()
        db.refresh(lesson4)

        l4_assets = [
            LessonAsset(lesson_id=lesson4.id, language="hi", variant=AssetVariant.portrait,
                        asset_type=AssetType.thumbnail, url="https://picsum.photos/400/600?random=15"),
            LessonAsset(lesson_id=lesson4.id, language="hi", variant=AssetVariant.landscape,
                        asset_type=AssetType.thumbnail, url="https://picsum.photos/600/400?random=16"),
        ]
        db.add_all(l4_assets)
        db.commit()
        print("✓ Created Lesson 4 (published)")

        # Lesson 5 - Published
        lesson5 = Lesson(
            term_id=term2.id, lesson_number=2, title="ऊर्जा संरक्षण (Energy Conservation)",
            content_type=ContentType.video, duration_ms=390000, is_paid=True,
            content_language_primary="hi", content_languages_available=["hi"],
            content_urls_by_language={"hi": "https://example.com/video5.mp4"},
            subtitle_languages=[], subtitle_urls_by_language={},
            status=LessonStatus.published, published_at=datetime.utcnow()
        )
        db.add(lesson5)
        db.commit()
        db.refresh(lesson5)

        l5_assets = [
            LessonAsset(lesson_id=lesson5.id, language="hi", variant=AssetVariant.portrait,
                        asset_type=AssetType.thumbnail, url="https://picsum.photos/400/600?random=17"),
            LessonAsset(lesson_id=lesson5.id, language="hi", variant=AssetVariant.landscape,
                        asset_type=AssetType.thumbnail, url="https://picsum.photos/600/400?random=18"),
        ]
        db.add_all(l5_assets)
        db.commit()
        print("✓ Created Lesson 5 (published)")

        # Publish Program 2
        program2.status = ProgramStatus.published
        program2.published_at = datetime.utcnow()
        db.commit()
        print("✓ Published Program 2")

        # Lesson 6 - Draft
        lesson6 = Lesson(
            term_id=term2.id, lesson_number=3, title="बल और दबाव (Force and Pressure)",
            content_type=ContentType.video, duration_ms=360000, is_paid=False,
            content_language_primary="hi", content_languages_available=["hi"],
            content_urls_by_language={"hi": "https://example.com/video6.mp4"},
            subtitle_languages=[], subtitle_urls_by_language={},
            status=LessonStatus.draft
        )
        db.add(lesson6)
        db.commit()
        db.refresh(lesson6)

        l6_assets = [
            LessonAsset(lesson_id=lesson6.id, language="hi", variant=AssetVariant.portrait,
                        asset_type=AssetType.thumbnail, url="https://picsum.photos/400/600?random=19"),
            LessonAsset(lesson_id=lesson6.id, language="hi", variant=AssetVariant.landscape,
                        asset_type=AssetType.thumbnail, url="https://picsum.photos/600/400?random=20"),
        ]
        db.add_all(l6_assets)
        db.commit()
        print("✓ Created Lesson 6 (draft)")

        print("\n" + "=" * 60)
        print("✅ SEED DATA CREATED SUCCESSFULLY!")
        print("=" * 60)
        print("\n📝 Login Credentials:")
        print("   Admin  : admin@example.com / admin123")
        print("   Editor : editor@example.com / editor123")
        print("   Viewer : viewer@example.com / viewer123")
        print("\n📊 Summary:")
        print("   • 3 Users created")
        print("   • 3 Topics created")
        print("   • 2 Programs created (both published)")
        print("   • 2 Terms created")
        print("   • 6 Lessons created (4 published, 1 scheduled, 1 draft)")
        print("\n⏰ Scheduled Lesson:")
        print(f"   '{lesson2.title}' will auto-publish at {lesson2.publish_at}")
        print("\n" + "=" * 60 + "\n")

    except Exception as e:
        print(f"\n❌ Error creating seed data: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    create_seed_data()