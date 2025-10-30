"""
Private Game Room Models

This module handles private game rooms where users can invite friends:
- Room creation and management
- Room invitations
- Room participants
- Room settings

Models:
    GameRoom: Private game room
    RoomInvitation: Invitation to join a room
"""

from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid


class GameRoom(models.Model):
    """
    Model for private game rooms.
    
    Users can create rooms and invite friends to play.
    Rooms can be public (anyone with link) or private (invite only).
    
    Fields:
        name: Room name
        code: Unique room code for joining
        host: User who created the room
        is_public: If room is open to anyone with link
        max_players: Maximum players (default: 2)
        status: Current room status
        game: Active game in this room (ForeignKey to Match)
        created_at: When room was created
        settings: JSON field for game settings
    """
    STATUS_CHOICES = [
        ('waiting', 'Waiting for Players'),
        ('ready', 'Ready to Start'),
        ('active', 'Game in Progress'),
        ('finished', 'Game Finished'),
        ('closed', 'Room Closed'),
    ]
    
    name = models.CharField(
        max_length=100,
        help_text="Name of the game room"
    )
    code = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        help_text="Unique code for joining the room"
    )
    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='hosted_rooms',
        help_text="User who created the room"
    )
    is_public = models.BooleanField(
        default=False,
        help_text="If true, anyone with link can join"
    )
    max_players = models.IntegerField(
        default=2,
        help_text="Maximum number of players (currently only 2)"
    )
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='waiting',
        help_text="Current room status"
    )
    game = models.ForeignKey(
        'game.Match',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='room',
        help_text="Active game in this room"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When room was created"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Last room update"
    )
    settings = models.JSONField(
        default=dict,
        help_text="Game settings (board size, time limit, etc.)"
    )
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['host', 'status']),
        ]
    
    def __str__(self):
        return f"{self.name} by {self.host.username}"
    
    def get_join_url(self):
        """
        Get URL to join this room.
        
        Returns:
            str: Full URL for joining the room
        """
        from django.conf import settings
        base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        return f"{base_url}/room/{self.code}"
    
    def get_participants(self):
        """
        Get all participants in this room.
        
        Returns:
            QuerySet: RoomParticipant objects
        """
        return self.participants.filter(has_left=False)
    
    def get_participants_count(self):
        """
        Get current number of participants.
        
        Returns:
            int: Number of active participants
        """
        return self.get_participants().count()
    
    def is_full(self):
        """
        Check if room is full.
        
        Returns:
            bool: True if room has reached max_players
        """
        return self.get_participants_count() >= self.max_players
    
    def can_start(self):
        """
        Check if game can start.
        
        Returns:
            bool: True if room has 2 players and all are ready
        """
        participants = self.get_participants()
        if participants.count() != 2:
            return False
        
        # Check if all participants are ready
        return all(p.is_ready for p in participants)
    
    def start_game(self):
        """
        Start the game in this room.
        
        Creates a Match object and updates room status.
        
        Returns:
            Match: Created game match
        """
        from game.models import Match
        
        if not self.can_start():
            raise ValueError("Cannot start game - room not ready")
        
        participants = list(self.get_participants())
        player1 = participants[0].user
        player2 = participants[1].user
        
        # Create match (without room parameter since Match doesn't have a room field)
        match = Match.objects.create(
            black_player=player1,
            white_player=player2,
            mode='online',
            status='in_progress'
        )
        
        # Initialize the board
        match.initialize_board()
        
        # Link match to room
        self.game = match
        self.status = 'active'
        self.save()
        
        return match
    
    def close(self):
        """Close the room."""
        self.status = 'closed'
        self.save()
    
    def has_all_left(self):
        """
        Check if all participants have left the room.
        
        Returns:
            bool: True if no active participants remain
        """
        return self.participants.filter(has_left=False).count() == 0
    
    def transfer_host(self):
        """
        Transfer host to another active participant.
        
        Called when current host leaves the room.
        
        Returns:
            User: New host user, or None if no participants left
        """
        remaining = self.participants.filter(has_left=False).exclude(user=self.host).first()
        if remaining:
            self.host = remaining.user
            self.status = 'waiting'  # Reset to waiting for new host
            self.save()
            return remaining.user
        return None
    
    def delete_if_empty(self):
        """
        Delete room if all participants have left.
        
        Returns:
            bool: True if room was deleted, False otherwise
        """
        if self.has_all_left():
            self.delete()
            return True
        return False


class RoomParticipant(models.Model):
    """
    Model for room participants.
    
    Tracks who is in each room and their status.
    
    Fields:
        room: The game room
        user: The participant user
        joined_at: When user joined
        has_left: If user has left the room
        is_ready: If user is ready to start
    """
    room = models.ForeignKey(
        GameRoom,
        on_delete=models.CASCADE,
        related_name='participants',
        help_text="The game room"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='room_participations',
        help_text="The participant user"
    )
    joined_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When user joined the room"
    )
    has_left = models.BooleanField(
        default=False,
        help_text="If user has left the room"
    )
    is_ready = models.BooleanField(
        default=False,
        help_text="If user is ready to start the game"
    )
    
    class Meta:
        unique_together = ['room', 'user']
        ordering = ['joined_at']
    
    def __str__(self):
        return f"{self.user.username} in {self.room.name}"


class RoomInvitation(models.Model):
    """
    Model for room invitations.
    
    When a user invites a friend to their room.
    
    Fields:
        room: The game room
        from_user: User who sent the invitation
        to_user: User who received the invitation
        status: Current invitation status
        created_at: When invitation was sent
        responded_at: When invitation was accepted/rejected
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
    ]
    
    room = models.ForeignKey(
        GameRoom,
        on_delete=models.CASCADE,
        related_name='invitations',
        help_text="The game room"
    )
    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_room_invitations',
        help_text="User who sent the invitation"
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_room_invitations',
        help_text="User who received the invitation"
    )
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='pending',
        help_text="Current invitation status"
    )
    message = models.TextField(
        blank=True,
        null=True,
        max_length=200,
        help_text="Optional message from sender"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When invitation was sent"
    )
    responded_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When invitation was accepted/rejected"
    )
    
    class Meta:
        unique_together = ['room', 'to_user']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.from_user.username} invited {self.to_user.username} to {self.room.name}"
    
    def accept(self):
        """
        Accept the room invitation and join the room.
        
        Returns:
            RoomParticipant: Created participant object
        """
        self.status = 'accepted'
        self.responded_at = timezone.now()
        self.save()
        
        # Add user to room
        participant = RoomParticipant.objects.create(
            room=self.room,
            user=self.to_user
        )
        
        return participant
    
    def reject(self):
        """Reject the room invitation."""
        self.status = 'rejected'
        self.responded_at = timezone.now()
        self.save()
    
    def is_expired(self):
        """
        Check if invitation has expired.
        
        Invitations expire if room is closed or already full.
        
        Returns:
            bool: True if invitation is no longer valid
        """
        if self.room.status == 'closed':
            return True
        if self.room.is_full():
            return True
        return False
