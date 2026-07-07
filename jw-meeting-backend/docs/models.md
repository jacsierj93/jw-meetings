# Database Models Documentation

## Entity Relationship Diagram

```mermaid
erDiagram
    CONGREGATION ||--o{ PROGRAM : has
    CONGREGATION ||--o{ PERSON : belongs_to
    PROGRAM ||--o{ WEEK : contains
    WEEK ||--|| WEEK_CONTENT : has
    WEEK ||--o{ ASSIGNMENT : has
    PERSON ||--o{ ASSIGNMENT : assigned_to
    ASSIGNMENT_TYPE ||--o{ ASSIGNMENT : defines
    ASSIGNMENT ||--o{ ASSIGNMENT_HISTORY : tracks
    
    CONGREGATION {
        uuid id PK
        string name UK
        jsonb settings
        timestamp created_at
        timestamp updated_at
    }
    
    PERSON {
        uuid id PK
        uuid congregation_id FK
        string full_name
        string email
        jsonb metadata
        int active
        timestamp created_at
        timestamp updated_at
    }
    
    PROGRAM {
        uuid id PK
        uuid congregation_id FK
        string version
        date start_date
        date end_date
        string source_file
        timestamp created_at
        timestamp updated_at
    }
    
    WEEK {
        uuid id PK
        uuid program_id FK
        string date_range
        string reading
        jsonb songs
        int week_number
        date week_date
        timestamp created_at
        timestamp updated_at
    }
    
    WEEK_CONTENT {
        uuid id PK
        uuid week_id FK UK
        jsonb treasures
        jsonb ministry_items
        jsonb christian_life_items
        jsonb raw_content
        timestamp created_at
        timestamp updated_at
    }
    
    ASSIGNMENT_TYPE {
        uuid id PK
        string code UK
        string name
        string category
        int requires_assistant
        int default_duration
        jsonb metadata
        timestamp created_at
        timestamp updated_at
    }
    
    ASSIGNMENT {
        uuid id PK
        uuid week_id FK
        uuid assignment_type_id FK
        uuid assignee_id FK
        uuid assistant_id FK
        string title
        int duration
        int order_index
        timestamp assigned_at
        uuid assigned_by_id FK
        timestamp created_at
        timestamp updated_at
    }
    
    ASSIGNMENT_HISTORY {
        uuid id PK
        uuid assignment_id FK
        uuid previous_assignee_id FK
        uuid new_assignee_id FK
        text change_reason
        timestamp changed_at
        uuid changed_by_id FK
    }
```

## Models Overview

### Program Module

#### Congregation
- Represents a congregation (e.g., "Mayor Buratovich")
- Has many programs and persons
- Settings stored as JSONB for flexibility

#### Person
- Member of a congregation
- Can be assigned to multiple assignments
- Metadata field for extensibility (phone, skills, etc.)
- Active flag for soft delete

#### Program
- Represents a meeting program for a period (e.g., January 2026)
- Contains multiple weeks
- Tracks source EPUB file

#### Week
- Single week in a program
- Songs stored as JSONB: `{apertura: {numero, oracion}, medio, cierre: {numero, oracion}}`
- Has one-to-one relationship with WeekContent

#### WeekContent
- Stores detailed content for a week
- All content stored as JSONB for flexibility
- `treasures`: Tesoros de la Biblia content
- `ministry_items`: Seamos Mejores Maestros items
- `christian_life_items`: Nuestra Vida Cristiana items
- `raw_content`: Full parsed content for future use

### Assignments Module

#### AssignmentType
- Defines types of assignments (predefined + custom)
- Categories: tesoros, ministerio, vida_cristiana, estudio_biblico, oraciones, presidencia
- Metadata for additional configuration

#### Assignment
- Represents a task assignment
- Can have assignee and optional assistant
- Tracks who assigned it and when
- Order index for sorting within a week

#### AssignmentHistory
- Audit trail for assignment changes
- Tracks previous and new assignee
- Records reason for change and who made it

## JSONB Fields

### Week.songs
```json
{
  "apertura": {
    "numero": 153,
    "oracion": "Juan Pérez"
  },
  "medio": 148,
  "cierre": {
    "numero": 73,
    "oracion": "María García"
  }
}
```

### WeekContent.treasures
```json
{
  "titulo1": {
    "titulo": "Lo que van a recibir quienes nos despojan",
    "asignado": ""
  },
  "lecturaBiblica": {
    "texto": "Isaías 19:1-12",
    "estudiante": ""
  }
}
```

### WeekContent.ministry_items
```json
[
  {
    "tipo": "empiece",
    "titulo": "Empiece conversaciones. De casa en casa",
    "duracion": 3,
    "estudiante": "",
    "ayudante": ""
  }
]
```

## Indexes

Performance indexes created:
- `ix_persons_congregation_id`
- `ix_programs_congregation_id`
- `ix_weeks_program_id`
- `ix_weeks_week_date`
- `ix_assignments_week_id`
- `ix_assignments_assignee_id`
- `ix_assignment_history_assignment_id`

## Migrations

### 001_initial_schema.py
Creates all tables with proper foreign keys and indexes

### 002_seed_assignment_types.py
Seeds predefined assignment types:
- Tesoros: discurso, lectura bíblica
- Ministerio: empiece, revisitas, discípulos, explique, discurso
- Vida Cristiana: partes, necesidades
- Estudio Bíblico: conductor, lector
- Oraciones: inicial, final
- Presidencia: presidente
