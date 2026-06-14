from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("legacy_port", "0004_user_google_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="best_game_score",
            field=models.IntegerField(default=0),
        ),
    ]
