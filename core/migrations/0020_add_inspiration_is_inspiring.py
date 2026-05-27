from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0019_make_context_sentence_optional'),
    ]

    operations = [
        migrations.AddField(
            model_name='inspiration',
            name='is_inspiring',
            field=models.BooleanField(
                db_index=True,
                default=False,
                help_text='When true, this inspiration appears in the home spotlight rotation.',
            ),
        ),
    ]
