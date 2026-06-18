from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("legacy_port", "0005_user_best_game_score"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="quizzes_completed",
            field=models.IntegerField(default=0),
        ),
    ]
