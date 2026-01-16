from sqlalchemy import Column, String, DateTime, Boolean, Integer, Enum as SQLEnum, ForeignKey, Table, UniqueConstraint, Index, Text, ARRAY, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.db.database import Base


# Enums
class ProgramStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class LessonStatus(str, enum.Enum):
    draft = "draft"
    scheduled = "scheduled"
    published = "published"
    archived = "archived"


class ContentType(str, enum.Enum):
    video = "video"
    article = "article"


class AssetVariant(str, enum.Enum):
    portrait = "portrait"
    landscape = "landscape"
    square = "square"
    banner = "banner"


class AssetType(str, enum.Enum):
    poster = "poster"
    thumbnail = "thumbnail"


class UserRole(str, enum.Enum):
    admin = "admin"
    editor = "editor"
    viewer = "viewer"


# Association table for Program-Topic many-to-many
program_topics = Table(
    'program_topics',
    Base.metadata,
    Column('program_id', UUID(as_uuid=True), ForeignKey('programs.id', ondelete='CASCADE')),
    Column('topic_id', UUID(as_uuid=True), ForeignKey('topics.id', ondelete='CASCADE')),
    UniqueConstraint('program_id', 'topic_id', name='uq_program_topic')
)


# Models
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.viewer)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Topic(Base):
    __tablename__ = "topics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    programs = relationship("Program", secondary=program_topics, back_populates="topics")


class Program(Base):
    __tablename__ = "programs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    description = Column(Text)
    language_primary = Column(String, nullable=False)
    languages_available = Column(ARRAY(String), nullable=False)
    status = Column(SQLEnum(ProgramStatus), nullable=False, default=ProgramStatus.draft)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    topics = relationship("Topic", secondary=program_topics, back_populates="programs")
    terms = relationship("Term", back_populates="program", cascade="all, delete-orphan")
    assets = relationship("ProgramAsset", back_populates="program", cascade="all, delete-orphan")

    __table_args__ = (
        Index('ix_program_status_language_published', 'status', 'language_primary', 'published_at'),
    )


class ProgramAsset(Base):
    __tablename__ = "program_assets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program_id = Column(UUID(as_uuid=True), ForeignKey('programs.id', ondelete='CASCADE'), nullable=False)
    language = Column(String, nullable=False)
    variant = Column(SQLEnum(AssetVariant), nullable=False)
    asset_type = Column(SQLEnum(AssetType), nullable=False)
    url = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    program = relationship("Program", back_populates="assets")

    __table_args__ = (
        UniqueConstraint('program_id', 'language', 'variant', 'asset_type', name='uq_program_asset'),
        Index('ix_program_asset_lookup', 'program_id', 'language', 'variant'),
    )


class Term(Base):
    __tablename__ = "terms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program_id = Column(UUID(as_uuid=True), ForeignKey('programs.id', ondelete='CASCADE'), nullable=False)
    term_number = Column(Integer, nullable=False)
    title = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    program = relationship("Program", back_populates="terms")
    lessons = relationship("Lesson", back_populates="term", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint('program_id', 'term_number', name='uq_program_term'),
    )


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    term_id = Column(UUID(as_uuid=True), ForeignKey('terms.id', ondelete='CASCADE'), nullable=False)
    lesson_number = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    content_type = Column(SQLEnum(ContentType), nullable=False)
    duration_ms = Column(Integer, nullable=True)
    is_paid = Column(Boolean, default=False)
    
    # Multi-language content
    content_language_primary = Column(String, nullable=False)
    content_languages_available = Column(ARRAY(String), nullable=False)
    content_urls_by_language = Column(JSON, nullable=False)  # {language: url}
    
    # Subtitles
    subtitle_languages = Column(ARRAY(String), default=[])
    subtitle_urls_by_language = Column(JSON, default={})  # {language: url}
    
    # Publishing workflow
    status = Column(SQLEnum(LessonStatus), nullable=False, default=LessonStatus.draft)
    publish_at = Column(DateTime, nullable=True)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    term = relationship("Term", back_populates="lessons")
    assets = relationship("LessonAsset", back_populates="lesson", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint('term_id', 'lesson_number', name='uq_term_lesson'),
        Index('ix_lesson_status_publish', 'status', 'publish_at'),
        Index('ix_lesson_term_number', 'term_id', 'lesson_number'),
    )


class LessonAsset(Base):
    __tablename__ = "lesson_assets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lesson_id = Column(UUID(as_uuid=True), ForeignKey('lessons.id', ondelete='CASCADE'), nullable=False)
    language = Column(String, nullable=False)
    variant = Column(SQLEnum(AssetVariant), nullable=False)
    asset_type = Column(SQLEnum(AssetType), nullable=False)
    url = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    lesson = relationship("Lesson", back_populates="assets")

    __table_args__ = (
        UniqueConstraint('lesson_id', 'language', 'variant', 'asset_type', name='uq_lesson_asset'),
        Index('ix_lesson_asset_lookup', 'lesson_id', 'language', 'variant'),
    )
