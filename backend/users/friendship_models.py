"""
Friendship System Models

This module handles friend relationships between users:
- Friend requests (pending/accepted/rejected)
- Friend connections
- Social media integration
- Friend invite links

Models:
    FriendRequest: Pending friend requests
    Friendship: Accepted friend connections
"""

from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid


class FriendRequest(models.Model):
    """
    Model for friend requests between users.
    
    States:
        - pending: Request sent, waiting for response
        - accepted: Request accepted, friendship created
        - rejected: Request declined
        - cancelled: Sender cancelled the request
    
    Fields:
        from_user: User who sent the request
        to_user: User who received the request
        status: Current state of the request
        message: Optional message from sender
        created_at: When request was sent
        responded_at: When request was accepted/rejected
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]
    
    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_friend_requests',
        help_text="User who sent the friend request"
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_friend_requests',
        help_text="User who received the friend request"
    )
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='pending',
        help_text="Current status of the friend request"
    )
    message = models.TextField(
        blank=True,
        null=True,
        max_length=200,
        help_text="Optional message from sender"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the request was sent"
    )
    responded_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the request was accepted/rejected"
    )
    
    class Meta:
        unique_together = ['from_user', 'to_user']
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['from_user', 'status']),
            models.Index(fields=['to_user', 'status']),
        ]
    
    def __str__(self):
        return f"{self.from_user.username} → {self.to_user.username} ({self.status})"
    
    def accept(self):
        """
        Accept the friend request and create bidirectional friendship.
        
        Returns:
            tuple: (friendship1, friendship2) - Both friendship records
        """
        self.status = 'accepted'
        self.responded_at = timezone.now()
        self.save()
        
        # Create bidirectional friendship using class method
        friendship1, friendship2 = Friendship.create_friendship(
            user1=self.from_user,
            user2=self.to_user,
            social_source='direct'
        )
        
        return friendship1, friendship2
    
    def reject(self):
        """Reject the friend request."""
        self.status = 'rejected'
        self.responded_at = timezone.now()
        self.save()
    
    def cancel(self):
        """Cancel the friend request (by sender)."""
        self.status = 'cancelled'
        self.save()


class Friendship(models.Model):
    """
    Model for accepted friendships.
    
    This model creates a bidirectional friendship.
    When user A accepts user B's request, two records are created:
    - A is friends with B
    - B is friends with A
    
    Fields:
        user: The user who has this friend
        friend: The friend user
        created_at: When friendship was established
        is_blocked: If user has blocked this friend
        social_source: How they connected (optional)
    """
    SOCIAL_SOURCES = [
        ('direct', 'Direct Request'),
        ('facebook', 'Facebook'),
        ('google', 'Google'),
        ('invite_link', 'Invite Link'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='friendships',
        help_text="User who owns this friendship record"
    )
    friend = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='friend_of',
        help_text="The friend user"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When friendship was established"
    )
    is_blocked = models.BooleanField(
        default=False,
        help_text="If user has blocked this friend"
    )
    social_source = models.CharField(
        max_length=20,
        choices=SOCIAL_SOURCES,
        default='direct',
        help_text="How the friendship was initiated"
    )
    
    class Meta:
        unique_together = ['user', 'friend']
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_blocked']),
        ]
    
    def __str__(self):
        return f"{self.user.username} ↔ {self.friend.username}"
    
    @classmethod
    def create_friendship(cls, user1, user2, social_source='direct'):
        """
        Create bidirectional friendship between two users.
        
        Args:
            user1: First user
            user2: Second user
            social_source: How they connected (default: 'direct')
            
        Returns:
            tuple: (friendship1, friendship2)
        """
        friendship1 = cls.objects.create(
            user=user1,
            friend=user2,
            social_source=social_source
        )
        friendship2 = cls.objects.create(
            user=user2,
            friend=user1,
            social_source=social_source
        )
        return friendship1, friendship2
    
    @classmethod
    def are_friends(cls, user1, user2):
        """
        Check if two users are friends.
        
        Args:
            user1: First user
            user2: Second user
            
        Returns:
            bool: True if they are friends
        """
        return cls.objects.filter(
            user=user1,
            friend=user2,
            is_blocked=False
        ).exists()


class FriendInviteLink(models.Model):
    """
    Model for friend invite links.
    
    Allows users to generate shareable links to add friends.
    Links can expire and have usage limits.
    
    Fields:
        user: User who created the invite
        code: Unique code for the invite link
        created_at: When link was created
        expires_at: When link expires (null = never)
        max_uses: Maximum number of uses (null = unlimited)
        uses_count: Current number of uses
        is_active: If link is still active
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='friend_invite_links',
        help_text="User who created this invite link"
    )
    code = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        help_text="Unique code for the invite link"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the link was created"
    )
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the link expires (null = never)"
    )
    max_uses = models.IntegerField(
        null=True,
        blank=True,
        help_text="Maximum uses allowed (null = unlimited)"
    )
    uses_count = models.IntegerField(
        default=0,
        help_text="Number of times the link has been used"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="If the link is currently active"
    )
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Invite by {self.user.username} - {self.code}"
    
    def is_valid(self):
        """
        Check if invite link is still valid.
        
        Returns:
            bool: True if link can be used
        """
        if not self.is_active:
            return False
        
        # Check expiration
        if self.expires_at and timezone.now() > self.expires_at:
            return False
        
        # Check usage limit
        if self.max_uses and self.uses_count >= self.max_uses:
            return False
        
        return True
    
    def use(self):
        """Increment usage counter."""
        self.uses_count += 1
        if self.max_uses and self.uses_count >= self.max_uses:
            self.is_active = False
        self.save()
    
    def get_invite_url(self):
        """
        Get full invite URL.
        
        Returns:
            str: Full URL for the invite link
        """
        from django.conf import settings
        base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        return f"{base_url}/friends/invite/{self.code}"
