"""Seed assignment types

Revision ID: 002
Revises: 001
Create Date: 2026-01-24 18:16:00.000000

"""
from typing import Sequence, Union
from datetime import datetime
from uuid import uuid4

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Import seed data
    from src.modules.assignments.infrastructure.seed_data import ASSIGNMENT_TYPES
    
    # Create table reference
    assignment_types = sa.table(
        'assignment_types',
        sa.column('id', postgresql.UUID),
        sa.column('code', sa.String),
        sa.column('name', sa.String),
        sa.column('category', sa.String),
        sa.column('requires_assistant', sa.Integer),
        sa.column('default_duration', sa.Integer),
        sa.column('config', postgresql.JSONB),
        sa.column('created_at', sa.DateTime),
        sa.column('updated_at', sa.DateTime),
    )
    
    # Insert seed data
    now = datetime.utcnow()
    rows = []
    for at in ASSIGNMENT_TYPES:
        rows.append({
            'id': uuid4(),
            'code': at['code'],
            'name': at['name'],
            'category': at['category'],
            'requires_assistant': at['requires_assistant'],
            'default_duration': at['default_duration'],
            'config': at['metadata'],  # Rename metadata to config
            'created_at': now,
            'updated_at': None,
        })
    
    op.bulk_insert(assignment_types, rows)


def downgrade() -> None:
    # Delete all seed data
    op.execute("DELETE FROM assignment_types")
