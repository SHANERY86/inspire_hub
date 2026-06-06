from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0024_recipe_inspiring_public'),
    ]

    operations = [
        migrations.AddField(
            model_name='recipe',
            name='instructions',
            field=models.TextField(blank=True, default=''),
        ),
    ]
