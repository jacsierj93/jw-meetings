"""seed persons for congregation facb5bae

Revision ID: 1b0f9d2c8a7c
Revises: 6eaaed115b56
Create Date: 2026-01-25 22:15:00.000000

"""
from datetime import datetime
from typing import Sequence, Union
from uuid import uuid4

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "1b0f9d2c8a7c"
down_revision: Union[str, None] = "6eaaed115b56"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


CONGREGATION_ID = "facb5bae-af8e-4de2-8b2c-fdb344ce4e47"
CONGREGATION_NAME = "Mayor Buratovich"
PERSON_NAMES = [
    "Ana Jara",
    "Caterin San Martin",
    "Gladys Francisco",
    "Elena Villegas",
    "Facundo Vargas",
    "Idalba Ortiz",
    "Jacsiel Rodriguez",
    "Julian Esmoli",
    "Luis Campos",
    "Maria Caballero",
    "Maria Prado",
    "Maria Rozas",
    "Mariela San Martin",
    "Mario Llanos",
    "Matilde Esmoli",
    "Micaela Catalan",
    "Mirian Garcia",
    "Mirta Rozas",
    "Norma Llanos",
    "Norma Rodriguez",
    "Oscar San Martin",
    "Pedro Francisco",
    "Tiziano Di'Ferdinando",
    "Veronica Di'Ferdinando",
    "Veronica Vargas",
    "Yamil Vargas",
    "Gabriel Caballero",
    "Jorge Prado",
    "Sandro Diferdinando",
    "Ruben Hecker",
    "Josefina Hecker",
    "Maria Oyon",
    "Leticia Garcia",
]


def upgrade() -> None:
    congregations_table = sa.table(
        "congregations",
        sa.column("id", sa.UUID(as_uuid=True)),
        sa.column("name", sa.String),
        sa.column("settings", sa.JSON),
        sa.column("created_at", sa.DateTime),
        sa.column("updated_at", sa.DateTime),
    )
    persons_table = sa.table(
        "persons",
        sa.column("id", sa.UUID(as_uuid=True)),
        sa.column("congregation_id", sa.UUID(as_uuid=True)),
        sa.column("full_name", sa.String),
        sa.column("email", sa.String),
        sa.column("extra_data", sa.JSON),
        sa.column("active", sa.Integer),
        sa.column("created_at", sa.DateTime),
        sa.column("updated_at", sa.DateTime),
    )

    now = datetime.utcnow()
    op.bulk_insert(
        congregations_table,
        [
            {
                "id": CONGREGATION_ID,
                "name": CONGREGATION_NAME,
                "settings": {},
                "created_at": now,
                "updated_at": None,
            }
        ],
    )
    op.bulk_insert(
        persons_table,
        [
            {
                "id": uuid4(),
                "congregation_id": CONGREGATION_ID,
                "full_name": name,
                "email": None,
                "extra_data": {},
                "active": 1,
                "created_at": now,
                "updated_at": None,
            }
            for name in PERSON_NAMES
        ],
    )


def downgrade() -> None:
    bind = op.get_bind()
    congregations = sa.table(
        "congregations",
        sa.column("id", sa.UUID(as_uuid=True)),
    )
    persons = sa.table(
        "persons",
        sa.column("congregation_id", sa.UUID(as_uuid=True)),
        sa.column("full_name", sa.String),
    )
    bind.execute(
        sa.delete(persons).where(
            sa.and_(
                persons.c.congregation_id == CONGREGATION_ID,
                persons.c.full_name.in_(PERSON_NAMES),
            )
        )
    )
    bind.execute(sa.delete(congregations).where(congregations.c.id == CONGREGATION_ID))
