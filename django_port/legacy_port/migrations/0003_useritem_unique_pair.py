# Generated manually to preserve one inventory row per user/item pair.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("legacy_port", "0002_alter_user_password"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="useritem",
            constraint=models.UniqueConstraint(fields=("user", "item"), name="unique_user_item_pair"),
        ),
    ]
