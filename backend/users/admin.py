from django.contrib import admin
from .models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'email', 'elo_rating', 'wins', 'losses', 'win_rate']
    list_filter = ['created_at']
    search_fields = ['username', 'email']
    readonly_fields = ['cognito_id', 'created_at', 'updated_at']
    ordering = ['-elo_rating']
