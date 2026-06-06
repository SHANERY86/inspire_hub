from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0022_add_word_image_url'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Recipe',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('url', models.URLField(blank=True, default='', max_length=1000)),
                ('title', models.CharField(max_length=512)),
                ('ingredients', models.TextField(blank=True, default='')),
                ('image_url', models.URLField(blank=True, default='', max_length=1000)),
                ('notes', models.TextField(blank=True, default='')),
                ('tags', models.CharField(blank=True, default='', max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='recipes',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'db_table': 'recipe',
                'ordering': ['-created_at'],
            },
        ),
    ]
