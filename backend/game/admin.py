from django.contrib import admin
from .models import Match


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = ['id', 'mode', 'black_player', 'white_player', 'status', 'result', 'created_at']
    list_filter = ['mode', 'status', 'result', 'created_at']
    search_fields = ['black_player__username', 'white_player__username']
    readonly_fields = ['created_at', 'updated_at', 'board_state', 'move_history']
    ordering = ['-created_at']
