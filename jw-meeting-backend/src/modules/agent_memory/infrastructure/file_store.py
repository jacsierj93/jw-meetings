"""File-based store for agent memory."""
from pathlib import Path
from threading import Lock

from src.modules.agent_memory.application.dto import (
    AgentMemoryState,
    CreateDurableRuleRequest,
    DurableRule,
    LogEntryRequest,
    MemoryLogEntry,
    PersonConstraintRequest,
    UpdateMemoryRequest,
    utc_now,
)


class AgentMemoryFileStore:
    """Stores agent memory state in a JSON file."""

    def __init__(self, file_path: str):
        self._path = Path(file_path)
        self._lock = Lock()
        self._ensure_file()

    def _ensure_file(self) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        if self._path.exists():
            return
        default_state = AgentMemoryState()
        self._path.write_text(
            default_state.model_dump_json(indent=2),
            encoding="utf-8",
        )

    def _read(self) -> AgentMemoryState:
        raw = self._path.read_text(encoding="utf-8")
        if not raw.strip():
            return AgentMemoryState()
        return AgentMemoryState.model_validate_json(raw)

    def _write(self, state: AgentMemoryState) -> AgentMemoryState:
        state.updated_at = utc_now()
        payload = state.model_dump_json(indent=2)
        temp_path = self._path.with_suffix(f"{self._path.suffix}.tmp")
        backup_path = self._path.with_suffix(f"{self._path.suffix}.bak")
        temp_path.write_text(payload, encoding="utf-8")
        if self._path.exists():
            backup_path.write_text(self._path.read_text(encoding="utf-8"), encoding="utf-8")
        temp_path.replace(self._path)
        return state

    def get(self) -> AgentMemoryState:
        with self._lock:
            return self._read()

    def update(self, request: UpdateMemoryRequest) -> AgentMemoryState:
        with self._lock:
            state = self._read()
            payload = request.model_dump(exclude_unset=True)
            for key, value in payload.items():
                setattr(state, key, value)
            return self._write(state)

    def set_person_constraint(self, request: PersonConstraintRequest) -> AgentMemoryState:
        with self._lock:
            state = self._read()
            state.person_constraints[request.person_name.strip()] = request.constraint.strip()
            return self._write(state)

    def add_rule(self, request: CreateDurableRuleRequest) -> AgentMemoryState:
        """Append a confirmed rule while retaining prior history."""
        with self._lock:
            state = self._read()
            normalized_text = " ".join(request.text.split())
            duplicate = next(
                (
                    rule
                    for rule in state.durable_rules
                    if rule.status == "active"
                    and rule.text.casefold() == normalized_text.casefold()
                    and rule.scope == request.scope
                    and (rule.person_name or "").casefold()
                    == (request.person_name or "").strip().casefold()
                ),
                None,
            )
            if duplicate:
                return state

            if request.replaces_rule_id:
                for rule in state.durable_rules:
                    if rule.id == request.replaces_rule_id and rule.status == "active":
                        rule.status = "superseded"
                        rule.updated_at = utc_now()

            state.durable_rules.append(
                DurableRule(
                    text=normalized_text,
                    category=request.category.strip(),
                    scope=request.scope,
                    person_name=(
                        request.person_name.strip() if request.person_name else None
                    ),
                    effective_from=request.effective_from,
                    effective_to=request.effective_to,
                    source=request.source.strip(),
                    metadata=request.metadata,
                )
            )
            return self._write(state)

    def deactivate_rule(self, rule_id: str) -> AgentMemoryState:
        """Deactivate one rule without deleting its history."""
        with self._lock:
            state = self._read()
            for rule in state.durable_rules:
                if rule.id == rule_id:
                    rule.status = "inactive"
                    rule.updated_at = utc_now()
                    break
            return self._write(state)

    def delete_person_constraint(self, person_name: str) -> AgentMemoryState:
        with self._lock:
            state = self._read()
            state.person_constraints.pop(person_name.strip(), None)
            return self._write(state)

    def append_log(self, request: LogEntryRequest) -> AgentMemoryState:
        with self._lock:
            state = self._read()
            state.logs.append(
                MemoryLogEntry(
                    note=request.note.strip(),
                    source=request.source.strip(),
                    metadata=request.metadata,
                )
            )
            return self._write(state)

    def reset(self) -> AgentMemoryState:
        with self._lock:
            return self._write(AgentMemoryState())
