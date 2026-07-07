"""
Seed data for assignment types.
"""
from uuid import uuid4

# Assignment types based on the JSON structure
ASSIGNMENT_TYPES = [
    # Tesoros de la Biblia
    {
        "code": "tesoros_discurso",
        "name": "Discurso de Tesoros de la Biblia",
        "category": "tesoros",
        "requires_assistant": 0,
        "default_duration": 10,
        "metadata": {"section": "tesoros", "order": 1}
    },
    {
        "code": "lectura_biblica",
        "name": "Lectura de la Biblia",
        "category": "tesoros",
        "requires_assistant": 0,
        "default_duration": 4,
        "metadata": {"section": "tesoros", "order": 2}
    },
    
    # Seamos Mejores Maestros
    {
        "code": "empiece_conversaciones",
        "name": "Empiece conversaciones",
        "category": "ministerio",
        "requires_assistant": 1,
        "default_duration": 3,
        "metadata": {"section": "ministerio", "order": 1}
    },
    {
        "code": "haga_revisitas",
        "name": "Haga revisitas",
        "category": "ministerio",
        "requires_assistant": 1,
        "default_duration": 4,
        "metadata": {"section": "ministerio", "order": 2}
    },
    {
        "code": "haga_discipulos",
        "name": "Haga discípulos",
        "category": "ministerio",
        "requires_assistant": 1,
        "default_duration": 5,
        "metadata": {"section": "ministerio", "order": 3}
    },
    {
        "code": "explique_creencias",
        "name": "Explique sus creencias",
        "category": "ministerio",
        "requires_assistant": 1,
        "default_duration": 5,
        "metadata": {"section": "ministerio", "order": 4}
    },
    {
        "code": "discurso_ministerio",
        "name": "Discurso",
        "category": "ministerio",
        "requires_assistant": 0,
        "default_duration": 5,
        "metadata": {"section": "ministerio", "order": 5}
    },
    
    # Nuestra Vida Cristiana
    {
        "code": "vida_cristiana_parte",
        "name": "Parte de Nuestra Vida Cristiana",
        "category": "vida_cristiana",
        "requires_assistant": 0,
        "default_duration": 15,
        "metadata": {"section": "vida_cristiana", "order": 1}
    },
    {
        "code": "necesidades_congregacion",
        "name": "Necesidades de la congregación",
        "category": "vida_cristiana",
        "requires_assistant": 0,
        "default_duration": 15,
        "metadata": {"section": "vida_cristiana", "order": 2}
    },
    
    # Estudio Bíblico de la Congregación
    {
        "code": "conductor_estudio",
        "name": "Conductor del Estudio Bíblico",
        "category": "estudio_biblico",
        "requires_assistant": 0,
        "default_duration": 30,
        "metadata": {"section": "estudio_biblico", "order": 1}
    },
    {
        "code": "lector_estudio",
        "name": "Lector del Estudio Bíblico",
        "category": "estudio_biblico",
        "requires_assistant": 0,
        "default_duration": 30,
        "metadata": {"section": "estudio_biblico", "order": 2}
    },
    
    # Oraciones y Presidente
    {
        "code": "oracion_inicial",
        "name": "Oración inicial",
        "category": "oraciones",
        "requires_assistant": 0,
        "default_duration": 0,
        "metadata": {"section": "oraciones", "order": 1}
    },
    {
        "code": "oracion_final",
        "name": "Oración final",
        "category": "oraciones",
        "requires_assistant": 0,
        "default_duration": 0,
        "metadata": {"section": "oraciones", "order": 2}
    },
    {
        "code": "presidente",
        "name": "Presidente",
        "category": "presidencia",
        "requires_assistant": 0,
        "default_duration": 0,
        "metadata": {"section": "presidencia", "order": 1}
    },
]
