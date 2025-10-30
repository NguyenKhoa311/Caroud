# Generated manually for session tracking

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_friendinvitelink_gameroom_roominvitation_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='active_session_key',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='last_login_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
