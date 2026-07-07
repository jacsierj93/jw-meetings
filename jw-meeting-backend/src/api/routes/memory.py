"""FastAPI routes for agent memory state."""
from urllib.parse import unquote

from fastapi import APIRouter

from src.modules.agent_memory.application.dto import (
    AgentMemoryState,
    CreateDurableRuleRequest,
    LogEntryRequest,
    PersonConstraintRequest,
    UpdateMemoryRequest,
)
from src.modules.agent_memory.infrastructure.file_store import AgentMemoryFileStore
from src.shared.infrastructure.config import get_settings


router = APIRouter()
settings = get_settings()
memory_store = AgentMemoryFileStore(settings.agent_memory_path)


@router.get("/", response_model=AgentMemoryState)
async def get_memory_state():
    """Get current agent memory state."""
    return memory_store.get()


@router.patch("/", response_model=AgentMemoryState)
async def update_memory_state(request: UpdateMemoryRequest):
    """Partially update memory state fields."""
    return memory_store.update(request)


@router.post("/person-constraints", response_model=AgentMemoryState)
async def set_person_constraint(request: PersonConstraintRequest):
    """Set or replace constraint for one person."""
    return memory_store.set_person_constraint(request)


@router.post("/rules", response_model=AgentMemoryState)
async def add_durable_rule(request: CreateDurableRuleRequest):
    """Persist one confirmed operational rule without losing history."""
    return memory_store.add_rule(request)


@router.delete("/rules/{rule_id}", response_model=AgentMemoryState)
async def deactivate_durable_rule(rule_id: str):
    """Deactivate a durable rule while retaining its audit history."""
    return memory_store.deactivate_rule(rule_id)


@router.delete("/person-constraints/{person_name}", response_model=AgentMemoryState)
async def delete_person_constraint(person_name: str):
    """Delete one person constraint by person name."""
    return memory_store.delete_person_constraint(unquote(person_name))


@router.post("/logs", response_model=AgentMemoryState)
async def append_log(request: LogEntryRequest):
    """Append a new memory log note."""
    return memory_store.append_log(request)


@router.post("/reset", response_model=AgentMemoryState)
async def reset_memory():
    """Reset memory to default empty state."""
    return memory_store.reset()
