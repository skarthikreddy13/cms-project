import time
from datetime import datetime
from sqlalchemy import and_
from sqlalchemy.orm import Session
import logging

from app.db.database import SessionLocal
from app.models.models import Lesson, LessonStatus, Program, ProgramStatus, Term

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def publish_scheduled_lessons():
    """
    Worker function that publishes scheduled lessons.
    Runs every minute and is idempotent and concurrency-safe.
    """
    db: Session = SessionLocal()
    try:
        # Find lessons ready to publish (with row locking for concurrency safety)
        now = datetime.utcnow()
        lessons = db.query(Lesson).filter(
            and_(
                Lesson.status == LessonStatus.scheduled,
                Lesson.publish_at <= now
            )
        ).with_for_update(skip_locked=True).all()
        
        if not lessons:
            logger.info("No lessons to publish")
            return
        
        logger.info(f"Found {len(lessons)} lessons to publish")
        
        for lesson in lessons:
            try:
                # Publish lesson (idempotent - only set if not already published)
                if lesson.status == LessonStatus.scheduled:
                    lesson.status = LessonStatus.published
                    lesson.published_at = datetime.utcnow()
                    
                    logger.info(f"Published lesson {lesson.id}: {lesson.title}")
                    
                    # Auto-publish program if this is first published lesson
                    term = db.query(Term).filter(Term.id == lesson.term_id).first()
                    if term:
                        program = db.query(Program).filter(Program.id == term.program_id).first()
                        if program and program.status == ProgramStatus.draft:
                            program.status = ProgramStatus.published
                            if program.published_at is None:  # Only set once
                                program.published_at = datetime.utcnow()
                            logger.info(f"Auto-published program {program.id}: {program.title}")
                
                # Commit each lesson in its own transaction for safety
                db.commit()
                
            except Exception as e:
                logger.error(f"Error publishing lesson {lesson.id}: {str(e)}")
                db.rollback()
                continue
        
    except Exception as e:
        logger.error(f"Worker error: {str(e)}")
        db.rollback()
    finally:
        db.close()


def run_worker():
    """Main worker loop"""
    logger.info("Starting scheduled publishing worker...")
    logger.info("Worker will run every 60 seconds")
    
    while True:
        try:
            publish_scheduled_lessons()
        except Exception as e:
            logger.error(f"Unexpected error in worker: {str(e)}")
        
        time.sleep(60)  # Run every minute


if __name__ == "__main__":
    run_worker()
