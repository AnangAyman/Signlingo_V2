from django.db import migrations, models


class Migration(migrations.Migration):
    """Reconcile the migration state for friendship's composite primary key.

    The model uses CompositePrimaryKey("user", "friend"), and the live DB already
    has PRIMARY KEY (user_id, friend_id) with no `id` column (created that way by
    the original Flask/alembic schema). Only Django's migration *state* still
    believed friendship had an `id` field + a `unique_friendship_pair` constraint.

    The DB therefore already matches the target, so we update state only and run
    NO SQL (SeparateDatabaseAndState with empty database_operations). Applying the
    auto-generated ops as real SQL would fail (DROP of a non-existent `id`).
    """

    dependencies = [
        ("legacy_port", "0007_user_enforce_not_null"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
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
