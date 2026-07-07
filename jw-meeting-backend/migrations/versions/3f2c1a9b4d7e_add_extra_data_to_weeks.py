"""add extra_data to weeks

Revision ID: 3f2c1a9b4d7e
Revises: 1b0f9d2c8a7c
Create Date: 2026-01-25 22:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "3f2c1a9b4d7e"
down_revision: Union[str, None] = "1b0f9d2c8a7c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "weeks",
        sa.Column(
            "extra_data",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True
        )
    )


def downgrade() -> None:
    op.drop_column("weeks", "extra_data")
