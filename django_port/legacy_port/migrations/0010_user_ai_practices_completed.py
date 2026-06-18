from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("legacy_port", "0009_drop_alembic_version"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="ai_practices_completed",
            field=models.IntegerField(default=0),
        ),
    ]
