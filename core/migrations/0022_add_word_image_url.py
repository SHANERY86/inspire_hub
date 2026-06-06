from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0021_add_tags_optional_essence'),
    ]

    operations = [
        migrations.AddField(
            model_name='wordentry',
            name='image_url',
            field=models.URLField(
                blank=True,
                default='',
                help_text='Optional image URL attached to this word.',
            ),
        ),
    ]
