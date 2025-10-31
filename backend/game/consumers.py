import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Match

logger = logging.getLogger(__name__)


class GameConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time game updates
    """
    
    async def connect(self):
        try:
            logger.info(f"WebSocket connect attempt: {self.scope['url_route']['kwargs']}")
            self.game_id = self.scope['url_route']['kwargs']['game_id']
            self.room_group_name = f'game_{self.game_id}'
            
            logger.info(f"Game ID: {self.game_id}, Room group: {self.room_group_name}")

            # Join room group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )

            await self.accept()
            logger.info("WebSocket accepted")
            
            # Send current game state
            try:
                game_state = await self.get_game_state()
                logger.info(f"Got game state: {game_state}")
                if game_state:
                    await self.send(text_data=json.dumps({
                        'type': 'game_state',
                        'data': game_state
                    }))
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
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

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
