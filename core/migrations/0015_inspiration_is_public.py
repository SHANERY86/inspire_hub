from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0014_inspiration_source'),
    ]

    operations = [
        migrations.AddField(
            model_name='inspiration',
            name='is_public',
            field=models.BooleanField(
                db_index=True,
                default=False,
                help_text='When true, this inspiration may appear on the public home spotlight for guests.',
            ),
        ),
    ]
