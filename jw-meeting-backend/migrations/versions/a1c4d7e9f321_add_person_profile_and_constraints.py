"""add person profile and constraints

Revision ID: a1c4d7e9f321
Revises: 1b0f9d2c8a7c
Create Date: 2026-04-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "a1c4d7e9f321"
down_revision: Union[str, None] = "1b0f9d2c8a7c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "person_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("person_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sex", sa.String(length=20), nullable=True),
        sa.Column("is_elder", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_ministerial_servant", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("hard_capabilities", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["person_id"], ["persons.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("person_id"),
    )
    op.create_index("ix_person_profiles_person_id", "person_profiles", ["person_id"], unique=True)

    op.create_table(
        "person_restrictions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("person_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("restriction_type", sa.String(length=50), nullable=False),
        sa.Column("starts_on", sa.Date(), nullable=True),
        sa.Column("ends_on", sa.Date(), nullable=True),
        sa.Column("is_hard", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reason", sa.String(length=500), nullable=True),
        sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["person_id"], ["persons.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_person_restrictions_person_id", "person_restrictions", ["person_id"], unique=False)
    op.create_index("ix_person_restrictions_type", "person_restrictions", ["restriction_type"], unique=False)

    op.create_table(
        "person_availability_windows",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("person_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("window_type", sa.String(length=50), nullable=False, server_default="unavailable"),
        sa.Column("starts_on", sa.Date(), nullable=False),
        sa.Column("ends_on", sa.Date(), nullable=True),
        sa.Column("notes", sa.String(length=500), nullable=True),
        sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["person_id"], ["persons.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_person_availability_windows_person_id", "person_availability_windows", ["person_id"], unique=False)
    op.create_index("ix_person_availability_windows_starts_on", "person_availability_windows", ["starts_on"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_person_availability_windows_starts_on", table_name="person_availability_windows")
    op.drop_index("ix_person_availability_windows_person_id", table_name="person_availability_windows")
    op.drop_table("person_availability_windows")

    op.drop_index("ix_person_restrictions_type", table_name="person_restrictions")
    op.drop_index("ix_person_restrictions_person_id", table_name="person_restrictions")
    op.drop_table("person_restrictions")

    op.drop_index("ix_person_profiles_person_id", table_name="person_profiles")
    op.drop_table("person_profiles")
