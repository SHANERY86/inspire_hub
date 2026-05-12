from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0013_rename_source_table'),
    ]

    operations = [
        migrations.AddField(
            model_name='inspiration',
            name='source',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name='inspirations',
                to='core.source',
            ),
        ),
    ]
