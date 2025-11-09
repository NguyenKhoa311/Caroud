import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Match
from django.core.cache import cache

logger = logging.getLogger(__name__)


class GameConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time game updates with disconnect handling
    """
    
    async def connect(self):
        try:
            logger.info(f"WebSocket connect attempt: {self.scope['url_route']['kwargs']}")
            self.game_id = self.scope['url_route']['kwargs']['game_id']
            self.room_group_name = f'game_{self.game_id}'
            self.user = self.scope.get('user')
            
            # Store user_id separately to avoid issues with user object being cleared
            if self.user and self.user.is_authenticated:
                self.user_id = self.user.id
                self.username = self.user.username
            else:
                self.user_id = None
                self.username = None
            
            logger.info(f"Game ID: {self.game_id}, Room group: {self.room_group_name}, User: {self.username} (ID: {self.user_id})")

            # Join room group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )

            await self.accept()
            logger.info("WebSocket accepted")
            
            # Track connected player
            if self.user_id:
                await self.mark_player_connected(self.user_id)
            
            # Send current game state
            try:
                game_state = await self.get_game_state()
                logger.info(f"Got game state: {game_state}")
                if game_state:
                    await self.send(text_data=json.dumps({
                        'type': 'game_state',
                        'data': game_state
                    }))
                    
                    # Notify opponent that player connected
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'player_connected',
                            'user_id': self.user.id if self.user else None
                        }
                    )
                else:
                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'message': 'Game not found'
                    }))
            except Exception as e:
                logger.error(f"Error getting game state: {e}", exc_info=True)
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': str(e)
                }))
        except Exception as e:
            logger.error(f"Error in connect: {e}", exc_info=True)
            raise

    async def disconnect(self, close_code):
        logger.info(f"🔴 WebSocket DISCONNECT: game_id={self.game_id}, user={self.username if hasattr(self, 'username') else 'Unknown'} (ID: {self.user_id if hasattr(self, 'user_id') else None}), close_code={close_code}")
        
        # Handle player disconnect using stored user_id
        if hasattr(self, 'user_id') and self.user_id:
            logger.info(f"🔴 Calling handle_player_disconnect for user {self.user_id}")
            await self.handle_player_disconnect(self.user_id)
        else:
            logger.warning(f"🔴 No user_id stored during disconnect")
        
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    @database_sync_to_async
    def mark_player_connected(self, user_id):
        """Mark player as connected in cache"""
        cache_key = f'game_{self.game_id}_player_{user_id}_connected'
        cache.set(cache_key, True, timeout=None)  # No timeout, manual cleanup
        logger.info(f"Player {user_id} marked as connected for game {self.game_id}")
    
    @database_sync_to_async
    def mark_player_disconnected(self, user_id):
        """Mark player as disconnected in cache"""
        cache_key = f'game_{self.game_id}_player_{user_id}_connected'
        cache.delete(cache_key)
        logger.info(f"Player {user_id} marked as disconnected for game {self.game_id}")
    
    @database_sync_to_async
    def check_if_opponent_connected(self, match, disconnected_user_id):
        """Check if opponent is still connected"""
        opponent_id = None
        if match.black_player and match.black_player.id != disconnected_user_id:
            opponent_id = match.black_player.id
        elif match.white_player and match.white_player.id != disconnected_user_id:
            opponent_id = match.white_player.id
        
        if opponent_id:
            cache_key = f'game_{self.game_id}_player_{opponent_id}_connected'
            return cache.get(cache_key, False)
        return False
    
    @database_sync_to_async
    def determine_winner_on_disconnect(self, match, user_id):
        """Determine winner when a player disconnects"""
        result = None
        if match.black_player and match.black_player.id == user_id:
            # Black player disconnected
            result = 'white_win'
            logger.info(f"🔴 Black player disconnected, white wins")
        elif match.white_player and match.white_player.id == user_id:
            # White player disconnected
            result = 'black_win'
            logger.info(f"🔴 White player disconnected, black wins")
        return result
    
    async def handle_player_disconnect(self, user_id):
        """Handle player disconnecting - award win to opponent if game in progress"""
        try:
            logger.info(f"🔴 handle_player_disconnect START: user_id={user_id}, game_id={self.game_id}")
            
            match = await self.get_match()
            if not match:
                logger.warning(f"🔴 No match found for game_id={self.game_id}")
                return
            
            logger.info(f"🔴 Match found: id={match.id}, status={match.status}")
            
            # Mark player as disconnected
            await self.mark_player_disconnected(user_id)
            
            # Only handle disconnect if game is in progress
            if match.status != 'in_progress':
                logger.info(f"🔴 Game not in progress (status={match.status}), skipping disconnect handling")
                return
            
            logger.info(f"🔴 Game in progress, processing disconnect...")
            
            # Check if opponent is still connected
            opponent_connected = await self.check_if_opponent_connected(match, user_id)
            logger.info(f"🔴 Opponent connected: {opponent_connected}")
            
            # Determine who disconnected and who should win (in sync context)
            result = await self.determine_winner_on_disconnect(match, user_id)
            
            if result:
                # Update match result and get ELO changes
                logger.info(f"🔴 Calling finish_game_on_disconnect with result={result}")
                elo_data = await self.finish_game_on_disconnect(match.id, result, user_id)
                logger.info(f"🔴 ELO data received: {elo_data}")
                
                # Prepare disconnect message
                disconnect_message = {
                    'type': 'player_disconnected',
                    'disconnected_user_id': user_id,
                    'result': result,
                    'opponent_connected': opponent_connected
                }
                
                # Add ELO changes if available
                if elo_data:
                    disconnect_message['elo_changes'] = elo_data
                    logger.info(f"🔴 Added ELO changes to message")
                
                # Notify remaining player
                logger.info(f"🔴 Sending disconnect message to group: {self.room_group_name}")
                await self.channel_layer.group_send(
                    self.room_group_name,
                    disconnect_message
                )
                
                logger.info(f"🔴 Game {self.game_id} ended due to disconnect. Result: {result}")
                
                # Clean up room if both players have disconnected (for friend matches)
                if not opponent_connected:
                    await self.cleanup_room_if_exists(match.id)
            
        except Exception as e:
            logger.error(f"🔴 Error handling disconnect: {e}", exc_info=True)
    
    @database_sync_to_async
    def cleanup_room_if_exists(self, match_id):
        """Clean up game room if both players have left"""
        try:
            from users.room_models import GameRoom
            
            # Find room associated with this match
            room = GameRoom.objects.filter(game_id=match_id).first()
            if room:
                # Check if all players have left
                if room.has_all_left():
                    logger.info(f"Deleting room {room.code} - all players disconnected")
                    room.delete()
                else:
                    # Just close the room
                    room.status = 'finished'
                    room.save()
                    logger.info(f"Room {room.code} marked as finished")
        except Exception as e:
            logger.error(f"Error cleaning up room: {e}", exc_info=True)
    
    @database_sync_to_async
    def get_match(self):
        """Get match object"""
        try:
            return Match.objects.get(id=self.game_id)
        except Match.DoesNotExist:
            return None
    
    @database_sync_to_async
    def finish_game_on_disconnect(self, match_id, result, disconnected_user_id):
        """Finish game when player disconnects and return ELO changes"""
        try:
            match = Match.objects.get(id=match_id)
            
            # Only finish if game is still in progress
            if match.status == 'in_progress':
                # Store old ranks before finishing
                old_ranks = {}
                if match.mode == 'online' and match.black_player and match.white_player:
                    old_ranks['black'] = match.black_player.get_leaderboard_rank()
                    old_ranks['white'] = match.white_player.get_leaderboard_rank()
                
                match.finish_game(result)
                logger.info(f"Match {match_id} finished on disconnect with result: {result}")
                
                # Return ELO changes for online matches
                if match.mode == 'online' and match.black_player and match.white_player:
                    return {
                        'black_player': {
                            'user_id': match.black_player.id,
                            'username': match.black_player.username,
                            'old_elo': match.black_elo_before,
                            'new_elo': match.black_player.elo_rating,
                            'change': match.black_elo_change,
                            'old_rank': old_ranks['black'],
                            'new_rank': match.black_player.get_leaderboard_rank()
                        },
                        'white_player': {
                            'user_id': match.white_player.id,
                            'username': match.white_player.username,
                            'old_elo': match.white_elo_before,
                            'new_elo': match.white_player.elo_rating,
                            'change': match.white_elo_change,
                            'old_rank': old_ranks['white'],
                            'new_rank': match.white_player.get_leaderboard_rank()
                        }
                    }
            
            return None
            
        except Match.DoesNotExist:
            logger.error(f"Match {match_id} not found when trying to finish on disconnect")
            return None

    async def receive(self, text_data):
        """
        Receive message from WebSocket
        """
        data = json.loads(text_data)
        message_type = data.get('type')

        if message_type == 'make_move':
            row = data.get('row')
            col = data.get('col')
            player = data.get('player')
            
            # Make move in database
            result = await database_sync_to_async(self.make_move_in_db)(row, col, player)
            
            # Broadcast move to room
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'game_move',
                    'row': row,
                    'col': col,
                    'player': player,
                    'result': result
                }
            )
        
        elif message_type == 'leave_game':
            # Player is voluntarily leaving - handle disconnect before closing connection
            logger.info(f"🔴 Received leave_game message from user {self.user_id}")
            if hasattr(self, 'user_id') and self.user_id:
                await self.handle_player_disconnect(self.user_id)
            else:
                logger.warning(f"🔴 No user_id found for leave_game message")

    async def game_move(self, event):
        """
        Send game move to WebSocket
        """
        await self.send(text_data=json.dumps({
            'type': 'move',
            'row': event['row'],
            'col': event['col'],
            'player': event['player'],
            'result': event['result']
        }))
    
    async def player_connected(self, event):
        """
        Notify about player connection
        """
        await self.send(text_data=json.dumps({
            'type': 'player_connected',
            'user_id': event.get('user_id')
        }))
    
    async def player_disconnected(self, event):
        """
        Handle player disconnection notification
        """
        logger.info(f"🔴 player_disconnected handler called with event: {event}")
        
        message = {
            'type': 'player_disconnected',
            'disconnected_user_id': event.get('disconnected_user_id'),
            'result': event.get('result'),
            'opponent_connected': event.get('opponent_connected')
        }
        
        # Add ELO changes if available
        if 'elo_changes' in event:
            message['elo_changes'] = event['elo_changes']
            logger.info(f"🔴 Including ELO changes in message")
        
        logger.info(f"🔴 Sending message to WebSocket: {message}")
        await self.send(text_data=json.dumps(message))

    @database_sync_to_async
    def get_game_state(self):
        """
        Get current game state from database
        """
        try:
            match = Match.objects.get(id=self.game_id)
            return {
                'board': match.board_state,
                'current_turn': match.current_turn,
                'status': match.status,
                'result': match.result
            }
        except Match.DoesNotExist:
            return None

    def make_move_in_db(self, row, col, player):
        """
        Make a move in the database
        """
        try:
            match = Match.objects.get(id=self.game_id)
            match.make_move(row, col, player)
            
            # Store old ranks before checking for winner
            old_ranks = {}
            if match.mode == 'online' and match.black_player and match.white_player:
                old_ranks['black'] = match.black_player.get_leaderboard_rank()
                old_ranks['white'] = match.white_player.get_leaderboard_rank()
            
            # Check for winner
            winning_line = match.check_winner(row, col, player)
            if winning_line:
                result = 'black_win' if player == 'X' else 'white_win'
                match.winning_line = winning_line
                match.finish_game(result)
                
                response = {
                    'status': 'game_over',
                    'result': result,
                    'winning_line': winning_line
                }
                
                # Add ELO changes for online matches
                if match.mode == 'online' and match.black_player and match.white_player:
                    response['elo_changes'] = {
                        'black_player': {
                            'user_id': match.black_player.id,
                            'username': match.black_player.username,
                            'old_elo': match.black_elo_before,
                            'new_elo': match.black_player.elo_rating,
                            'change': match.black_elo_change,
                            'old_rank': old_ranks['black'],
                            'new_rank': match.black_player.get_leaderboard_rank()
                        },
                        'white_player': {
                            'user_id': match.white_player.id,
                            'username': match.white_player.username,
                            'old_elo': match.white_elo_before,
                            'new_elo': match.white_player.elo_rating,
                            'change': match.white_elo_change,
                            'old_rank': old_ranks['white'],
                            'new_rank': match.white_player.get_leaderboard_rank()
                        }
                    }
                
                return response
            
            # Check for draw
            is_full = all(all(cell is not None for cell in row) for row in match.board_state)
            if is_full:
                match.finish_game('draw')
                
                response = {
                    'status': 'game_over',
                    'result': 'draw'
                }
                
                # Add ELO changes for online matches
                if match.mode == 'online' and match.black_player and match.white_player:
                    response['elo_changes'] = {
                        'black_player': {
                            'user_id': match.black_player.id,
                            'username': match.black_player.username,
                            'old_elo': match.black_elo_before,
                            'new_elo': match.black_player.elo_rating,
                            'change': match.black_elo_change,
                            'old_rank': old_ranks['black'],
                            'new_rank': match.black_player.get_leaderboard_rank()
                        },
                        'white_player': {
                            'user_id': match.white_player.id,
                            'username': match.white_player.username,
                            'old_elo': match.white_elo_before,
                            'new_elo': match.white_player.elo_rating,
                            'change': match.white_elo_change,
                            'old_rank': old_ranks['white'],
                            'new_rank': match.white_player.get_leaderboard_rank()
                        }
                    }
                
                return response
            
            return {'status': 'success'}
            
        except Exception as e:
            return {'status': 'error', 'message': str(e)}
