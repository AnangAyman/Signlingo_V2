from django.db import migrations


class Migration(migrations.Migration):
    """Tighten legacy nullable user columns to NOT NULL to match the model.

    These columns (points/lives/streak/is_verified/last_login_date) were created
    nullable by the original Flask/alembic schema, while the Django model declares
    them with defaults (effectively NOT NULL). The app currently defends with
    `field or 0`; enforcing NOT NULL at the DB makes the column match the real
    invariant and removes the silent-NULL risk in ranking/aggregation queries.

    `username`/`google_id`/`age` stay nullable (the model marks them null=True).

    RunSQL is used because the Django migration state already treats these as
    NOT NULL — only the physical DB lags — so an AlterField would be a no-op.
    NULLs are backfilled to the model defaults first (a no-op when none exist).
    """

    dependencies = [
        ("legacy_port", "0006_user_quizzes_completed"),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
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
            ],
            reverse_sql=[
                "ALTER TABLE `user` MODIFY `points` int NULL;",
                "ALTER TABLE `user` MODIFY `lives` int NULL;",
                "ALTER TABLE `user` MODIFY `streak` int NULL;",
                "ALTER TABLE `user` MODIFY `is_verified` tinyint(1) NULL;",
                "ALTER TABLE `user` MODIFY `last_login_date` date NULL;",
            ],
        ),
    ]
