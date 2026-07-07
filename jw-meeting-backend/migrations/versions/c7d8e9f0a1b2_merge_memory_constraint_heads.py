"""merge week metadata and person constraint heads

Revision ID: c7d8e9f0a1b2
Revises: 3f2c1a9b4d7e, a1c4d7e9f321
Create Date: 2026-06-22 21:10:00.000000
"""
from typing import Sequence, Union


revision: str = "c7d8e9f0a1b2"
down_revision: Union[str, Sequence[str], None] = (
    "3f2c1a9b4d7e",
    "a1c4d7e9f321",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
