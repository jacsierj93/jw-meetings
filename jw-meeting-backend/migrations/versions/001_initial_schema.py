"""Initial schema

Revision ID: 001
Revises: 
Create Date: 2026-01-24 18:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create congregations table
    op.create_table(
        'congregations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('settings', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    # Create persons table
    op.create_table(
        'persons',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('congregation_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('full_name', sa.String(length=200), nullable=False),
        sa.Column('email', sa.String(length=200), nullable=True),
        sa.Column('extra_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('active', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['congregation_id'], ['congregations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create programs table
    op.create_table(
        'programs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('congregation_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('version', sa.String(length=50), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('source_file', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['congregation_id'], ['congregations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create assignment_types table
    op.create_table(
        'assignment_types',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('requires_assistant', sa.Integer(), nullable=False),
        sa.Column('default_duration', sa.Integer(), nullable=True),
        sa.Column('config', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code')
    )
    
    # Create weeks table
    op.create_table(
        'weeks',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('program_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('date_range', sa.String(length=100), nullable=False),
        sa.Column('reading', sa.String(length=200), nullable=True),
        sa.Column('songs', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('week_number', sa.Integer(), nullable=False),
        sa.Column('week_date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['program_id'], ['programs.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create week_contents table
    op.create_table(
        'week_contents',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('week_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('treasures', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('ministry_items', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('christian_life_items', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('raw_content', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['week_id'], ['weeks.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('week_id')
    )
    
    # Create assignments table
    op.create_table(
        'assignments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('week_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('assignment_type_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('assignee_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('assistant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('duration', sa.Integer(), nullable=True),
        sa.Column('order_index', sa.Integer(), nullable=False),
        sa.Column('assigned_at', sa.DateTime(), nullable=True),
        sa.Column('assigned_by_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['assigned_by_id'], ['persons.id'], ),
        sa.ForeignKeyConstraint(['assignee_id'], ['persons.id'], ),
        sa.ForeignKeyConstraint(['assistant_id'], ['persons.id'], ),
        sa.ForeignKeyConstraint(['assignment_type_id'], ['assignment_types.id'], ),
        sa.ForeignKeyConstraint(['week_id'], ['weeks.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create assignment_history table
    op.create_table(
        'assignment_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('assignment_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('previous_assignee_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('new_assignee_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('change_reason', sa.Text(), nullable=True),
        sa.Column('changed_at', sa.DateTime(), nullable=False),
        sa.Column('changed_by_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['assignment_id'], ['assignments.id'], ),
        sa.ForeignKeyConstraint(['changed_by_id'], ['persons.id'], ),
        sa.ForeignKeyConstraint(['new_assignee_id'], ['persons.id'], ),
        sa.ForeignKeyConstraint(['previous_assignee_id'], ['persons.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for better query performance
    op.create_index('ix_persons_congregation_id', 'persons', ['congregation_id'])
    op.create_index('ix_programs_congregation_id', 'programs', ['congregation_id'])
    op.create_index('ix_weeks_program_id', 'weeks', ['program_id'])
    op.create_index('ix_weeks_week_date', 'weeks', ['week_date'])
    op.create_index('ix_assignments_week_id', 'assignments', ['week_id'])
    op.create_index('ix_assignments_assignee_id', 'assignments', ['assignee_id'])
    op.create_index('ix_assignment_history_assignment_id', 'assignment_history', ['assignment_id'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_assignment_history_assignment_id', table_name='assignment_history')
    op.drop_index('ix_assignments_assignee_id', table_name='assignments')
    op.drop_index('ix_assignments_week_id', table_name='assignments')
    op.drop_index('ix_weeks_week_date', table_name='weeks')
    op.drop_index('ix_weeks_program_id', table_name='weeks')
    op.drop_index('ix_programs_congregation_id', table_name='programs')
    op.drop_index('ix_persons_congregation_id', table_name='persons')
    
    # Drop tables in reverse order
    op.drop_table('assignment_history')
    op.drop_table('assignments')
    op.drop_table('week_contents')
    op.drop_table('weeks')
    op.drop_table('assignment_types')
    op.drop_table('programs')
    op.drop_table('persons')
    op.drop_table('congregations')
