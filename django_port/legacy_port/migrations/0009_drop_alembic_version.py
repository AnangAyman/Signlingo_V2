from django.db import migrations


class Migration(migrations.Migration):
    """Drop the leftover `alembic_version` table from the old Flask/SQLAlchemy era.

    The project migrated from Flask (alembic) to Django migrations; alembic_version
    is no longer used by anything. Reverse recreates the minimal table for safety.
    """

    dependencies = [
        ("legacy_port", "0008_sync_friendship_composite_pk"),
    ]

    operations = [
        migrations.RunSQL(
            sql="DROP TABLE IF EXISTS `alembic_version`;",
            reverse_sql=(
                "CREATE TABLE IF NOT EXISTS `alembic_version` ("
                "`version_num` varchar(32) NOT NULL, PRIMARY KEY (`version_num`)"
                ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;"
            ),
        ),
    ]
