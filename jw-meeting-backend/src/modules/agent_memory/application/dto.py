"""Pydantic DTOs for agent memory state."""
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


def utc_now() -> datetime:
    """Return timezone-aware UTC now."""
    return datetime.now(timezone.utc)


class MemoryLogEntry(BaseModel):
    """Single memory log entry."""

    timestamp: datetime = Field(default_factory=utc_now)
    note: str = Field(min_length=1)
    source: str = Field(default="agent", min_length=1)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DurableRule(BaseModel):
    """Confirmed operational rule kept across conversations."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    text: str = Field(min_length=1)
    category: str = Field(default="general", min_length=1)
    scope: Literal["global", "person", "week", "range", "guide"] = "global"
    person_name: Optional[str] = None
    effective_from: Optional[str] = None
    effective_to: Optional[str] = None
    status: Literal["active", "inactive", "superseded"] = "active"
    source: str = Field(default="user", min_length=1)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class AgentMemoryState(BaseModel):
    """Persistent state used by the agent to keep context across sessions."""

    schema_version: str = "1.0"
    updated_at: datetime = Field(default_factory=utc_now)
    congregation_name: Optional[str] = None
    main_user_role: Optional[str] = None
    priorities: List[str] = Field(default_factory=list)
    hard_constraints: List[str] = Field(default_factory=list)
    person_constraints: Dict[str, str] = Field(default_factory=dict)
    rotation_rules: Dict[str, str] = Field(default_factory=dict)
    channel_policy: Dict[str, str] = Field(default_factory=dict)
    notes: List[str] = Field(default_factory=list)
    durable_rules: List[DurableRule] = Field(default_factory=list)
    logs: List[MemoryLogEntry] = Field(default_factory=list)


class UpdateMemoryRequest(BaseModel):
    """Partial update for global memory fields."""

    congregation_name: Optional[str] = None
    main_user_role: Optional[str] = None
    priorities: Optional[List[str]] = None
    hard_constraints: Optional[List[str]] = None
    rotation_rules: Optional[Dict[str, str]] = None
    channel_policy: Optional[Dict[str, str]] = None
    notes: Optional[List[str]] = None


class PersonConstraintRequest(BaseModel):
    """Set or replace a person-level constraint."""

    person_name: str = Field(min_length=1)
    constraint: str = Field(min_length=1)


class CreateDurableRuleRequest(BaseModel):
    """Create a confirmed durable operational rule."""

    text: str = Field(min_length=1)
    category: str = Field(default="general", min_length=1)
    scope: Literal["global", "person", "week", "range", "guide"] = "global"
    person_name: Optional[str] = None
    effective_from: Optional[str] = None
    effective_to: Optional[str] = None
    source: str = Field(default="user", min_length=1)
    replaces_rule_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class LogEntryRequest(BaseModel):
    """Append a log entry."""

    note: str = Field(min_length=1)
    source: str = Field(default="agent", min_length=1)
    metadata: Dict[str, Any] = Field(default_factory=dict)
