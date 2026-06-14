from django.db import migrations


# MySQL-specific DDL: tighten the legacy nullable columns to NOT NULL. SQLite
# (used for local/dev fallback) does not support `ALTER TABLE ... MODIFY`, and
# the NOT NULL enforcement is a production-DB concern only, so we run this SQL
# exclusively on the MySQL backend. Production behavior is unchanged.
FORWARD_SQL = [
    "UPDATE `user` SET `points`=0 WHERE `points` IS NULL;",
    "UPDATE `user` SET `lives`=5 WHERE `lives` IS NULL;",
    "UPDATE `user` SET `streak`=0 WHERE `streak` IS NULL;",
    "UPDATE `user` SET `is_verified`=0 WHERE `is_verified` IS NULL;",
    "UPDATE `user` SET `last_login_date`=CURRENT_DATE WHERE `last_login_date` IS NULL;",
    "ALTER TABLE `user` MODIFY `points` int NOT NULL DEFAULT 0;",
    "ALTER TABLE `user` MODIFY `lives` int NOT NULL DEFAULT 5;",
    "ALTER TABLE `user` MODIFY `streak` int NOT NULL DEFAULT 0;",
    "ALTER TABLE `user` MODIFY `is_verified` tinyint(1) NOT NULL DEFAULT 0;",
    "ALTER TABLE `user` MODIFY `last_login_date` date NOT NULL;",
]

REVERSE_SQL = [
    "ALTER TABLE `user` MODIFY `points` int NULL;",
    "ALTER TABLE `user` MODIFY `lives` int NULL;",
    "ALTER TABLE `user` MODIFY `streak` int NULL;",
    "ALTER TABLE `user` MODIFY `is_verified` tinyint(1) NULL;",
    "ALTER TABLE `user` MODIFY `last_login_date` date NULL;",
]


def _run(statements):
    def _apply(apps, schema_editor):
        # Only MySQL needs (and supports) this DDL; skip on SQLite/other vendors.
        if schema_editor.connection.vendor != "mysql":
            return
        with schema_editor.connection.cursor() as cursor:
            for statement in statements:
                cursor.execute(statement)

    return _apply


class Migration(migrations.Migration):
    """Tighten legacy nullable user columns to NOT NULL to match the model.

    These columns (points/lives/streak/is_verified/last_login_date) were created
    nullable by the original Flask/alembic schema, while the Django model declares
    them with defaults (effectively NOT NULL). Enforcing NOT NULL at the DB makes
    the column match the real invariant and removes the silent-NULL risk in
    ranking/aggregation queries.

    The Django migration state already treats these as NOT NULL — only the
    physical MySQL DB lags — so this is a database-only operation guarded to the
    MySQL backend (SQLite dev fallback skips it).
    """

    dependencies = [
        ("legacy_port", "0006_user_quizzes_completed"),
    ]

    operations = [
        migrations.RunPython(_run(FORWARD_SQL), _run(REVERSE_SQL)),
    ]
