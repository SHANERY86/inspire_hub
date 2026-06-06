from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0020_add_inspiration_is_inspiring'),
    ]

    operations = [
        migrations.AddField(
            model_name='inspiration',
            name='tags',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Optional comma-separated tags for categorising this inspiration.',
                max_length=255,
            ),
        ),
        migrations.AddField(
            model_name='wordentry',
            name='tags',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Optional comma-separated tags for categorising this word.',
                max_length=255,
            ),
        ),
        migrations.AlterField(
            model_name='inspiration',
            name='essence',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
    ]
