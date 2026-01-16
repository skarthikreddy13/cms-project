from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List, Dict
from datetime import datetime
from uuid import UUID
from app.models.models import ProgramStatus, LessonStatus, ContentType, AssetVariant, UserRole


# User Schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    role: UserRole = UserRole.viewer


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str]
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


# Topic Schemas
class TopicCreate(BaseModel):
    name: str


class TopicResponse(BaseModel):
    id: UUID
    name: str
    created_at: datetime

    class Config:
        from_attributes = True


# Asset Schemas
class AssetCreate(BaseModel):
    language: str
    variant: AssetVariant
    url: str


class AssetResponse(BaseModel):
    id: UUID
    language: str
    variant: AssetVariant
    url: str

    class Config:
        from_attributes = True


# Program Schemas
class ProgramCreate(BaseModel):
    title: str
    description: Optional[str] = None
    language_primary: str
    languages_available: List[str]
    topic_ids: List[UUID] = []

    @validator('languages_available')
    def primary_in_available(cls, v, values):
        if 'language_primary' in values and values['language_primary'] not in v:
            raise ValueError('language_primary must be in languages_available')
        return v


class ProgramUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    language_primary: Optional[str] = None
    languages_available: Optional[List[str]] = None
    topic_ids: Optional[List[UUID]] = None
    status: Optional[ProgramStatus] = None


class ProgramResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    language_primary: str
    languages_available: List[str]
    status: ProgramStatus
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    topics: List[TopicResponse] = []
    assets: Dict[str, Dict[str, str]] = {}  # Structured as {language: {variant: url}}

    class Config:
        from_attributes = True


# Term Schemas
class TermCreate(BaseModel):
    program_id: UUID
    term_number: int
    title: Optional[str] = None


class TermUpdate(BaseModel):
    term_number: Optional[int] = None
    title: Optional[str] = None


class TermResponse(BaseModel):
    id: UUID
    program_id: UUID
    term_number: int
    title: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# Lesson Schemas
class LessonCreate(BaseModel):
    term_id: UUID
    lesson_number: int
    title: str
    content_type: ContentType
    duration_ms: Optional[int] = None
    is_paid: bool = False
    content_language_primary: str
    content_languages_available: List[str]
    content_urls_by_language: Dict[str, str]
    subtitle_languages: List[str] = []
    subtitle_urls_by_language: Dict[str, str] = {}

    @validator('content_languages_available')
    def primary_in_available(cls, v, values):
        if 'content_language_primary' in values and values['content_language_primary'] not in v:
            raise ValueError('content_language_primary must be in content_languages_available')
        return v

    @validator('duration_ms')
    def video_must_have_duration(cls, v, values):
        if 'content_type' in values and values['content_type'] == ContentType.video and v is None:
            raise ValueError('duration_ms is required for video content')
        return v

    @validator('content_urls_by_language')
    def must_include_primary_url(cls, v, values):
        if 'content_language_primary' in values and values['content_language_primary'] not in v:
            raise ValueError('content_urls_by_language must include primary language')
        return v


class LessonUpdate(BaseModel):
    lesson_number: Optional[int] = None
    title: Optional[str] = None
    content_type: Optional[ContentType] = None
    duration_ms: Optional[int] = None
    is_paid: Optional[bool] = None
    content_language_primary: Optional[str] = None
    content_languages_available: Optional[List[str]] = None
    content_urls_by_language: Optional[Dict[str, str]] = None
    subtitle_languages: Optional[List[str]] = None
    subtitle_urls_by_language: Optional[Dict[str, str]] = None


class LessonPublish(BaseModel):
    action: str  # "publish_now", "schedule", "archive"
    publish_at: Optional[datetime] = None


class LessonResponse(BaseModel):
    id: UUID
    term_id: UUID
    lesson_number: int
    title: str
    content_type: ContentType
    duration_ms: Optional[int]
    is_paid: bool
    content_language_primary: str
    content_languages_available: List[str]
    content_urls_by_language: Dict[str, str]
    subtitle_languages: List[str]
    subtitle_urls_by_language: Dict[str, str]
    status: LessonStatus
    publish_at: Optional[datetime]
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    assets: Dict[str, Dict[str, str]] = {}  # {language: {variant: url}}

    class Config:
        from_attributes = True


# Catalog Schemas (Public API)
class CatalogLessonResponse(BaseModel):
    id: UUID
    lesson_number: int
    title: str
    content_type: ContentType
    duration_ms: Optional[int]
    is_paid: bool
    content_urls_by_language: Dict[str, str]
    subtitle_languages: List[str]
    subtitle_urls_by_language: Dict[str, str]
    assets: Dict[str, Dict[str, str]]

    class Config:
        from_attributes = True


class CatalogTermResponse(BaseModel):
    id: UUID
    term_number: int
    title: Optional[str]
    lessons: List[CatalogLessonResponse] = []

    class Config:
        from_attributes = True


class CatalogProgramDetail(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    language_primary: str
    languages_available: List[str]
    published_at: Optional[datetime]
    topics: List[TopicResponse]
    assets: Dict[str, Dict[str, str]]
    terms: List[CatalogTermResponse] = []

    class Config:
        from_attributes = True


class CatalogProgramList(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    language_primary: str
    published_at: Optional[datetime]
    topics: List[TopicResponse]
    assets: Dict[str, Dict[str, str]]

    class Config:
        from_attributes = True


class PaginatedResponse(BaseModel):
    data: List
    next_cursor: Optional[str] = None
    has_more: bool = False
