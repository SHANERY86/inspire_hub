from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('core', '0010_inspiration_reference'),
    ]

    operations = [
        migrations.AddField(
            model_name='inspiration',
            name='user',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='inspirations',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
