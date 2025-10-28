# Online Matchmaking System Documentation

## Tổng quan

Hệ thống matchmaking dựa trên ELO rating để tự động ghép người chơi có trình độ tương đương vào trận đấu online.

## Features

### 1. **ELO-Based Matching**
- Tự động ghép người chơi có ELO rating gần nhau
- Dynamic ELO range expansion: Range tăng dần theo thời gian chờ để tìm trận nhanh hơn
- Initial range: ±100 ELO (có thể config)
- Mở rộng: +10 ELO mỗi 10 giây, tối đa +500

### 2. **Real-time Queue Status**
- Polling mỗi 2 giây để check match
- Hiển thị waiting time
- Hiển thị số người đang chờ trong queue
- Hiển thị average ELO của queue

### 3. **Instant Matching**
- Khi join queue, hệ thống tìm opponent ngay lập tức
- Nếu có opponent phù hợp → tạo match ngay
- Nếu chưa có → vào queue và polling

### 4. **Smart Assignment**
- Random assign Black/White player
- Lưu ELO trước trận để tính rating sau này
- Auto-initialize board 15x15

## Backend API

### Base URL
```
/api/matchmaking/
```

### Endpoints

#### 1. Join Queue
```http
POST /api/matchmaking/join/
Authorization: Token <user_token>
```

**Response (Matched):**
```json
{
  "status": "matched",
  "match": {
    "id": 123,
    "black_player": {...},
    "white_player": {...},
    "status": "in_progress"
  },
  "opponent": {
    "username": "player2",
    "elo_rating": 1250
  }
}
```

**Response (Waiting):**
```json
{
  "status": "waiting",
  "message": "Searching for opponent...",
  "queue_stats": {
    "total_waiting": 5,
    "average_elo": 1200
  },
  "your_elo": 1250
}
```

#### 2. Check Status (Polling)
```http
GET /api/matchmaking/status/
Authorization: Token <user_token>
```

**Response:**
```json
{
  "status": "waiting",
  "waiting_time": 15,
  "queue_stats": {
    "total_waiting": 3,
    "average_elo": 1180
  },
  "your_elo": 1250
}
```

#### 3. Leave Queue
```http
POST /api/matchmaking/leave/
Authorization: Token <user_token>
```

**Response:**
```json
{
  "status": "success",
  "message": "Left matchmaking queue"
}
```

#### 4. Get Queue Info
```http
GET /api/matchmaking/queue_info/
Authorization: Token <user_token>
```

**Response:**
```json
{
  "total_waiting": 8,
  "average_elo": 1210,
  "elo_range": {
    "min": 950,
    "max": 1450
  }
}
```

## Frontend Flow

### 1. User Journey

```
Dashboard → Click "Ranked Match"
    ↓
Matchmaking Page
    ↓
Click "Find Match" → POST /matchmaking/join/
    ↓
If matched → Navigate to game
If waiting → Start polling
    ↓
Poll every 2s → GET /matchmaking/status/
    ↓
Match found → Navigate to game
```

### 2. Component States

```javascript
const [status, setStatus] = useState('idle');
// idle: Chưa join queue
// searching: Đang tìm trận
// matched: Đã tìm thấy
// error: Có lỗi
```

### 3. Polling Logic

```javascript
// Start polling every 2 seconds
pollingInterval = setInterval(async () => {
  const result = await matchmakingService.checkStatus();
  
  if (result.status === 'matched') {
    // Navigate to game
    navigate(`/game?mode=online&matchId=${result.match.id}`);
  }
}, 2000);
```

### 4. Cleanup

```javascript
useEffect(() => {
  return () => {
    // Stop polling
    clearInterval(pollingInterval);
    
    // Leave queue if still searching
    if (status === 'searching') {
      matchmakingService.leaveQueue();
    }
  };
}, []);
```

## Database Schema

### MatchmakingQueue Model

```python
class MatchmakingQueue(models.Model):
    player = models.OneToOneField(User)
    elo_rating = models.IntegerField()
    joined_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        choices=['waiting', 'matched', 'expired']
    )
    matched_with = models.ForeignKey(User, null=True)
```

## Matchmaking Algorithm

### 1. Find Opponent

```python
def find_opponent(player, queue_entry, elo_range=100):
    # Calculate expanded range based on wait time
    waiting_seconds = (now - queue_entry.joined_at).seconds
    time_bonus = min((waiting_seconds // 10) * 10, 500)
    elo_range = elo_range + time_bonus
    
    # Query potential opponents
    opponents = MatchmakingQueue.objects.filter(
        status='waiting',
        elo_rating__gte=player.elo_rating - elo_range,
        elo_rating__lte=player.elo_rating + elo_range
    ).exclude(player=player).order_by('joined_at')
    
    return opponents.first()
```

### 2. ELO Range Expansion

| Wait Time | ELO Range | Example Match |
|-----------|-----------|---------------|
| 0-10s     | ±100      | 1200 vs 1150-1300 |
| 10-20s    | ±110      | 1200 vs 1090-1310 |
| 20-30s    | ±120      | 1200 vs 1080-1320 |
| 60s       | ±160      | 1200 vs 1040-1360 |
| 120s      | ±220      | 1200 vs 980-1420 |
| 300s      | ±400      | 1200 vs 800-1600 |
| 600s+     | ±600 (max)| 1200 vs 600-1800 |

### 3. Create Match

```python
def create_match(player1_queue, player2_queue):
    # Random assign colors
    if random.choice([True, False]):
        black = player1
        white = player2
    else:
        black = player2
        white = player1
    
    # Create match
    match = Match.objects.create(
        mode='online',
        black_player=black,
        white_player=white,
        status='in_progress',
        black_elo_before=black.elo_rating,
        white_elo_before=white.elo_rating
    )
    match.initialize_board()
    
    # Update queue status
    player1_queue.status = 'matched'
    player2_queue.status = 'matched'
    
    return match
```

## Configuration

### settings.py

```python
# Initial ELO rating for new players
INITIAL_ELO_RATING = 1200

# ELO K-factor (how much rating changes per game)
ELO_K_FACTOR = 32

# Initial ELO range for matchmaking
MATCHMAKING_ELO_RANGE = 100
```

## Testing

### 1. Test với 2 users cùng ELO

```bash
# User 1
curl -X POST http://localhost:8000/api/matchmaking/join/ \
  -H "Authorization: Token user1_token"

# User 2
curl -X POST http://localhost:8000/api/matchmaking/join/ \
  -H "Authorization: Token user2_token"

# Kết quả: Instant match
```

### 2. Test với ELO khác biệt

```bash
# User 1 (ELO: 1200)
curl -X POST http://localhost:8000/api/matchmaking/join/ \
  -H "Authorization: Token user1_token"

# User 2 (ELO: 1500) - khác biệt 300
curl -X POST http://localhost:8000/api/matchmaking/join/ \
  -H "Authorization: Token user2_token"

# Kết quả: Both waiting, cần chờ ~30s để range expand
```

### 3. Test polling

```bash
# Join queue
curl -X POST http://localhost:8000/api/matchmaking/join/ \
  -H "Authorization: Token user_token"

# Check status (call multiple times)
curl -X GET http://localhost:8000/api/matchmaking/status/ \
  -H "Authorization: Token user_token"
```

## Performance Considerations

### 1. Database Indexes
```python
class MatchmakingQueue(models.Model):
    class Meta:
        indexes = [
            models.Index(fields=['status', 'elo_rating']),
            models.Index(fields=['joined_at']),
        ]
```

### 2. Cleanup Job
```python
# Run periodically (e.g., cron job every 5 minutes)
from matchmaking.matchmaker import Matchmaker

# Remove expired queue entries (older than 5 minutes)
Matchmaker.clean_expired_queue(expiry_minutes=5)
```

### 3. Polling Frequency
- Current: 2 seconds
- Recommended: 2-3 seconds for balance between responsiveness and server load
- Too fast (<1s): Heavy server load
- Too slow (>5s): Poor UX

## Troubleshooting

### Issue: Players không được match

**Check:**
1. ELO difference quá lớn
2. Không có người khác trong queue
3. Queue entry expired

**Solution:**
```python
# Check queue
from matchmaking.models import MatchmakingQueue
MatchmakingQueue.objects.filter(status='waiting')

# Check ELO range
player1.elo_rating = 1200
player2.elo_rating = 1450
# Difference = 250 > initial range 100
# Need to wait ~15s for expansion
```

### Issue: Polling không hoạt động

**Check:**
1. Token expired
2. Network issues
3. Queue entry not found

**Debug:**
```javascript
console.log('Polling status:', result);
// Check if status API returns correct data
```

### Issue: Multiple matches created

**Cause:** Race condition khi 2 users join cùng lúc

**Solution:** Đã handle trong code với transaction và OneToOneField

## Future Improvements

### 1. WebSocket Integration
Thay thế polling bằng WebSocket cho real-time updates:
```python
# consumer.py
async def matchmaking_update(self, event):
    await self.send(text_data=json.dumps({
        'type': 'match_found',
        'match_id': event['match_id']
    }))
```

### 2. Multiple Queue Tiers
- Beginner: <1000 ELO
- Intermediate: 1000-1400
- Advanced: 1400-1800
- Expert: >1800

### 3. Region-based Matching
Add region field for lower latency matches

### 4. Party System
Allow friends to queue together

## Resources

- [ELO Rating System](https://en.wikipedia.org/wiki/Elo_rating_system)
- [Matchmaking Algorithms](https://www.gamasutra.com/view/feature/134949/creating_a_matchmaking_system.php)
- [Django Channels](https://channels.readthedocs.io/)

## API Example Code

### Python (requests)
```python
import requests

# Join matchmaking
response = requests.post(
    'http://localhost:8000/api/matchmaking/join/',
    headers={'Authorization': f'Token {token}'}
)
print(response.json())
```

### JavaScript (fetch)
```javascript
// Join matchmaking
const response = await fetch('http://localhost:8000/api/matchmaking/join/', {
  method: 'POST',
  headers: {
    'Authorization': `Token ${token}`
  }
});
const data = await response.json();
console.log(data);
```

### cURL
```bash
# Join
curl -X POST http://localhost:8000/api/matchmaking/join/ \
  -H "Authorization: Token YOUR_TOKEN"

# Status
curl -X GET http://localhost:8000/api/matchmaking/status/ \
  -H "Authorization: Token YOUR_TOKEN"

# Leave
curl -X POST http://localhost:8000/api/matchmaking/leave/ \
  -H "Authorization: Token YOUR_TOKEN"
```
