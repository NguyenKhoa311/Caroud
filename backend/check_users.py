"""
Script to check all users in database
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'caroud.settings')
django.setup()

from users.models import User

users = User.objects.all().order_by('-elo_rating')
print(f'Total users: {users.count()}\n')
print('User details:')
print('-' * 80)
for i, user in enumerate(users, 1):
    print(f'{i}. Username: {user.username}')
    print(f'   Email: {user.email}')
    print(f'   ELO: {user.elo_rating}')
    print(f'   W/L/D: {user.wins}/{user.losses}/{user.draws}')
    print(f'   Total games: {user.total_games}')
    print(f'   Win rate: {user.win_rate:.1f}%')
    print(f'   Active: {user.is_active}')
    print(f'   Created: {user.created_at}')
    print('-' * 80)
