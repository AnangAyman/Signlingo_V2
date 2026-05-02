"""Add user is_verified column

Revision ID: 91b8f2d4c6a1
Revises: 44087e15056f
Create Date: 2026-04-14 04:08:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '91b8f2d4c6a1'
down_revision = '44087e15056f'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_verified', sa.Boolean(), nullable=True))


def downgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_column('is_verified')
