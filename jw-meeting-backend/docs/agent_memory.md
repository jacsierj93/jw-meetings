# Agent Memory

Memoria persistente del agente para conservar contexto operativo entre sesiones.

## Ubicacion de datos

- Archivo JSON: `data/agent_memory.json`
- Configurable por entorno con `AGENT_MEMORY_PATH`.

## Endpoints

- `GET /api/v1/memory/`
  - Devuelve el estado completo de memoria.

- `PATCH /api/v1/memory/`
  - Actualiza campos globales de memoria.
  - Ejemplo:
    ```json
    {
      "congregation_name": "Mayor Buratovich",
      "main_user_role": "coordinador de reunion",
      "priorities": ["mejorar equidad", "evitar errores", "ahorrar tiempo"],
      "hard_constraints": ["no usar CSV como fuente de verdad"]
    }
    ```

- `POST /api/v1/memory/person-constraints`
  - Define o reemplaza una restriccion por persona.
  - Ejemplo:
    ```json
    {
      "person_name": "Julian Esmoli",
      "constraint": "No usar hasta nuevo aviso"
    }
    ```

- `DELETE /api/v1/memory/person-constraints/{person_name}`
  - Elimina la restriccion de una persona.

- `POST /api/v1/memory/logs`
  - Agrega una nota de bitacora.
  - Ejemplo:
    ```json
    {
      "note": "Se aprobo rotacion equilibrada de tesoros y estudio",
      "source": "coordinador",
      "metadata": {"periodo": "mayo-junio"}
    }
    ```

- `POST /api/v1/memory/reset`
  - Reinicia memoria al estado base.

