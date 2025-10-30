from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('matchmaking', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='matchmakingqueue',
            name='last_active',
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
    ]
