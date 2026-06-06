from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0023_add_recipe'),
    ]

    operations = [
        migrations.AddField(
            model_name='recipe',
            name='is_inspiring',
            field=models.BooleanField(default=False, db_index=True),
        ),
        migrations.AddField(
            model_name='recipe',
            name='is_public',
            field=models.BooleanField(default=False, db_index=True),
        ),
    ]
