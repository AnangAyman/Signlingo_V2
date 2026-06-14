from django.db import migrations, models


def _rebuild_friendship_sqlite(apps, schema_editor):
    """Rebuild the SQLite `friendship` table to match the real production schema.

    The live MySQL DB (created by the original Flask/alembic schema) has
    PRIMARY KEY (user_id, friend_id) and NO `id` column. Django's 0001_initial,
    however, created `friendship` with an auto `id` + a `unique_friendship_pair`
    constraint, so a freshly-migrated SQLite dev/fallback DB diverges from prod.

    This runs ONLY on SQLite — on MySQL it is a no-op because the live table is
    already correct (and 0008 must stay a pure state change there). Rebuilding
    with the composite primary key keeps the SQLite fallback schema faithful to
    Oracle so local runs behave the same.
    """
    if schema_editor.connection.vendor != "sqlite":
        return

    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            'CREATE TABLE "friendship__new" ('
            '"user_id" bigint NOT NULL REFERENCES "user" ("id") DEFERRABLE INITIALLY DEFERRED, '
            '"friend_id" bigint NOT NULL REFERENCES "user" ("id") DEFERRABLE INITIALLY DEFERRED, '
            'PRIMARY KEY ("user_id", "friend_id"))'
        )
        cursor.execute(
            'INSERT OR IGNORE INTO "friendship__new" ("user_id", "friend_id") '
            'SELECT "user_id", "friend_id" FROM "friendship"'
        )
        cursor.execute('DROP TABLE "friendship"')
        cursor.execute('ALTER TABLE "friendship__new" RENAME TO "friendship"')
        # Index the trailing PK column so reverse lookups stay fast (the leading
        # column is already covered by the composite primary key).
        cursor.execute('CREATE INDEX "friendship_friend_id" ON "friendship" ("friend_id")')


def _reverse_noop(apps, schema_editor):
    # Local-only schema shaping; nothing to reverse for production safety.
    return


class Migration(migrations.Migration):
    """Reconcile the migration state for friendship's composite primary key.

    The model uses CompositePrimaryKey("user", "friend"), and the live DB already
    has PRIMARY KEY (user_id, friend_id) with no `id` column (created that way by
    the original Flask/alembic schema). Only Django's migration *state* still
    believed friendship had an `id` field + a `unique_friendship_pair` constraint.

    On MySQL the DB already matches the target, so the database side is a no-op
    and only the state is updated. On SQLite (dev/fallback) the physical table is
    rebuilt to the composite primary key so the fallback schema matches Oracle.
    """

    dependencies = [
        ("legacy_port", "0007_user_enforce_not_null"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(_rebuild_friendship_sqlite, _reverse_noop),
            ],
            state_operations=[
                migrations.RemoveConstraint(
                    model_name="friendship",
                    name="unique_friendship_pair",
                ),
                migrations.RemoveField(
                    model_name="friendship",
                    name="id",
                ),
                migrations.AddField(
                    model_name="friendship",
                    name="pk",
                    field=models.CompositePrimaryKey(
                        "user", "friend",
                        blank=True, editable=False, primary_key=True, serialize=False,
                    ),
                ),
            ],
        ),
    ]
