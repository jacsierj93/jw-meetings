"""API tests for agent memory routes."""
from pathlib import Path

from fastapi.testclient import TestClient

from src.api.main import app
from src.api.routes import memory
from src.modules.agent_memory.infrastructure.file_store import AgentMemoryFileStore


client = TestClient(app)


def use_temp_memory_store(tmp_path: Path) -> None:
    """Point memory routes to a temporary storage file."""
    memory.memory_store = AgentMemoryFileStore(str(tmp_path / "agent_memory_test.json"))


def test_get_default_memory_state(tmp_path: Path):
    """Should return default memory state."""
    use_temp_memory_store(tmp_path)

    response = client.get("/api/v1/memory/")
    assert response.status_code == 200
    payload = response.json()

    assert payload["schema_version"] == "1.0"
    assert payload["hard_constraints"] == []
    assert payload["person_constraints"] == {}


def test_update_memory_state(tmp_path: Path):
    """Should patch top-level memory state fields."""
    use_temp_memory_store(tmp_path)

    response = client.patch(
        "/api/v1/memory/",
        json={
            "congregation_name": "Mayor Buratovich",
            "main_user_role": "coordinador de reunion",
            "priorities": ["mejorar equidad", "evitar errores", "ahorrar tiempo"],
            "hard_constraints": ["julian no usar"],
        },
    )
    assert response.status_code == 200
    payload = response.json()

    assert payload["congregation_name"] == "Mayor Buratovich"
    assert payload["main_user_role"] == "coordinador de reunion"
    assert payload["priorities"] == ["mejorar equidad", "evitar errores", "ahorrar tiempo"]
    assert payload["hard_constraints"] == ["julian no usar"]


def test_set_and_delete_person_constraint(tmp_path: Path):
    """Should set and remove one person constraint."""
    use_temp_memory_store(tmp_path)

    set_response = client.post(
        "/api/v1/memory/person-constraints",
        json={"person_name": "Julian Esmoli", "constraint": "No usar hasta nuevo aviso"},
    )
    assert set_response.status_code == 200
    set_payload = set_response.json()
    assert set_payload["person_constraints"]["Julian Esmoli"] == "No usar hasta nuevo aviso"

    delete_response = client.delete("/api/v1/memory/person-constraints/Julian%20Esmoli")
    assert delete_response.status_code == 200
    delete_payload = delete_response.json()
    assert "Julian Esmoli" not in delete_payload["person_constraints"]


def test_append_log_entry(tmp_path: Path):
    """Should append one log entry to memory."""
    use_temp_memory_store(tmp_path)

    response = client.post(
        "/api/v1/memory/logs",
        json={
            "note": "Se confirma regla de no usar CSV como fuente de verdad",
            "source": "coordinador",
            "metadata": {"scope": "proceso"},
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert len(payload["logs"]) == 1
    assert payload["logs"][0]["note"] == "Se confirma regla de no usar CSV como fuente de verdad"
    assert payload["logs"][0]["source"] == "coordinador"


def test_rules_are_accumulative_and_survive_store_reload(tmp_path: Path):
    """Confirmed rules should accumulate and remain readable in a new store."""
    use_temp_memory_store(tmp_path)

    first = client.post(
        "/api/v1/memory/rules",
        json={
            "text": "No asignar a Julian durante julio",
            "category": "availability",
            "scope": "person",
            "person_name": "Julian Esmoli",
            "effective_from": "2026-07-01",
            "effective_to": "2026-07-31",
        },
    )
    assert first.status_code == 200

    second = client.post(
        "/api/v1/memory/rules",
        json={
            "text": "Evitar asignaciones estudiantiles consecutivas",
            "category": "rotation",
            "scope": "global",
        },
    )
    assert second.status_code == 200
    assert len(second.json()["durable_rules"]) == 2

    reloaded = AgentMemoryFileStore(str(tmp_path / "agent_memory_test.json"))
    state = reloaded.get()
    assert len(state.durable_rules) == 2
    assert (tmp_path / "agent_memory_test.json.bak").exists()


def test_replacing_rule_preserves_history(tmp_path: Path):
    """Replacing a rule should supersede it instead of deleting it."""
    use_temp_memory_store(tmp_path)

    original = client.post(
        "/api/v1/memory/rules",
        json={"text": "Julian no participa", "scope": "person", "person_name": "Julian Esmoli"},
    ).json()["durable_rules"][0]

    response = client.post(
        "/api/v1/memory/rules",
        json={
            "text": "Julian puede participar desde agosto",
            "scope": "person",
            "person_name": "Julian Esmoli",
            "replaces_rule_id": original["id"],
        },
    )
    assert response.status_code == 200
    rules = response.json()["durable_rules"]
    assert rules[0]["status"] == "superseded"
    assert rules[1]["status"] == "active"
