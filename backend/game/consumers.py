import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Match


class GameConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time game updates
    """
    
    async def connect(self):
        self.game_id = self.scope['url_route']['kwargs']['game_id']
        self.room_group_name = f'game_{self.game_id}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        
        # Send current game state
        game_state = await self.get_game_state()
        await self.send(text_data=json.dumps({
            'type': 'game_state',
            'data': game_state
        }))

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
            result = await self.make_move(row, col, player)
            
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

    @database_sync_to_async
    def make_move(self, row, col, player):
        """
        Make a move in the database
        """
        try:
            match = Match.objects.get(id=self.game_id)
            match.make_move(row, col, player)
            
            # Check for winner
            winning_line = match.check_winner(row, col, player)
            if winning_line:
                result = 'black_win' if player == 'X' else 'white_win'
                match.winning_line = winning_line
                match.finish_game(result)
                return {
                    'status': 'game_over',
                    'result': result,
                    'winning_line': winning_line
                }
            
            # Check for draw
            is_full = all(all(cell is not None for cell in row) for row in match.board_state)
            if is_full:
                match.finish_game('draw')
                return {
                    'status': 'game_over',
                    'result': 'draw'
                }
            
            return {'status': 'success'}
            
        except Exception as e:
            return {'status': 'error', 'message': str(e)}
