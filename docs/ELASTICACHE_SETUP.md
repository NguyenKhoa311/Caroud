# AWS ElastiCache Redis Setup Guide

## 📋 Overview
This guide walks through setting up AWS ElastiCache Redis for Caroud game matchmaking and server pooling.

## 🎯 Use Cases
1. **Matchmaking Queue Pool**: Real-time player matching with ELO-based sorting
2. **Game Server Pool**: Track available game servers for load balancing

---

## 🚀 Step 1: Create ElastiCache Redis Cluster

### 1.1 Navigate to ElastiCache Console
1. Go to AWS Console: https://console.aws.amazon.com/elasticache/
2. Select **Redis** (not Memcached)
3. Click **Create** cluster

### 1.2 Configure Cluster Settings

**Basic Configuration:**
```
Cluster mode: Disabled (simpler for start)
Name: caroud-redis
Description: Redis cache for matchmaking and game server pool
Engine version: 7.1 (latest)
Port: 6379 (default)
Parameter group: default.redis7
Node type: cache.t3.micro (Free Tier eligible)
Number of replicas: 0 (1 for production HA)
```

**Network & Security:**
```
VPC: Same VPC as your RDS (important!)
Subnet group: Create new or use existing
  - Select at least 2 subnets in different AZs
Publicly accessible: No (secure)
Security groups: Create new security group
  - Name: caroud-redis-sg
  - Inbound rule: Custom TCP, Port 6379, Source: Backend EC2/ECS security group
```

**Backup & Maintenance:**
```
Enable automatic backups: Yes
Backup retention period: 1 day
Backup window: 03:00-04:00 (off-peak)
Maintenance window: Sun 04:00-05:00
```

### 1.3 Click "Create"

Wait 5-10 minutes for cluster creation.

---

## 🔐 Step 2: Configure Security Group

### 2.1 Create Security Group for Redis
```bash
# AWS CLI command (or use Console)
aws ec2 create-security-group \
  --group-name caroud-redis-sg \
  --description "Security group for ElastiCache Redis" \
  --vpc-id vpc-xxxxxxxx

# Add inbound rule (allow Django backend to connect)
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxx \
  --protocol tcp \
  --port 6379 \
  --source-group sg-backend-xxxxxxxx
```

### 2.2 Security Group Rules
**Inbound:**
```
Type: Custom TCP
Port: 6379
Source: Backend security group (EC2/ECS where Django runs)
Description: Allow backend to access Redis
```

**Outbound:**
```
Type: All traffic
Destination: 0.0.0.0/0
```

---

## 📝 Step 3: Get Redis Endpoint

After cluster is **Available**:

1. Go to ElastiCache Console
2. Click on `caroud-redis` cluster
3. Copy **Primary Endpoint**:
   ```
   caroud-redis.xxxxx.cache.amazonaws.com:6379
   ```

---

## 🧪 Step 4: Test Connection (Development)

### Option A: From Local Machine (Temporary)
```bash
# Add your IP to security group temporarily
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxx \
  --protocol tcp \
  --port 6379 \
  --cidr YOUR_IP/32

# Test with redis-cli
brew install redis
redis-cli -h caroud-redis.xxxxx.cache.amazonaws.com -p 6379
> PING
PONG
> SET test "Hello from local"
OK
> GET test
"Hello from local"
> DEL test
> QUIT
```

### Option B: From Backend Server
```bash
# SSH into EC2 or exec into ECS container
python manage.py shell

>>> import redis
>>> r = redis.Redis(host='caroud-redis.xxxxx.cache.amazonaws.com', port=6379)
>>> r.ping()
True
>>> r.set('test', 'Hello from Django')
True
>>> r.get('test')
b'Hello from Django'
>>> r.delete('test')
1
```

---

## 💰 Pricing (ap-southeast-1 Singapore)

### Development
```
cache.t3.micro
- Memory: 0.5 GB
- vCPU: 2
- Cost: $0.017/hour = ~$12.41/month
- Free Tier: 750 hours/month for 12 months
```

### Production (Recommended)
```
cache.t3.small
- Memory: 1.37 GB  
- vCPU: 2
- Cost: $0.034/hour = ~$24.82/month
- Supports: ~1000 concurrent users

cache.t3.medium (Scale up)
- Memory: 3.09 GB
- vCPU: 2  
- Cost: $0.068/hour = ~$49.64/month
- Supports: ~5000 concurrent users
```

**With Replication (High Availability):**
- Add 1 replica = 2x cost
- Better reliability for production

---

## 🔒 Security Best Practices

### 1. Never expose Redis publicly
```
Publicly accessible: No
Always use VPC internal access
```

### 2. Use encryption (Production)
```
Encryption at-rest: Yes
Encryption in-transit: Yes (TLS)
Auth token: Enable and set strong password
```

### 3. Backup configuration
```
Enable automatic backups
Retention: 1-7 days
Manual snapshots before major changes
```

### 4. Monitoring
```
Enable CloudWatch metrics:
- CPUUtilization
- NetworkBytesIn/Out
- CurrConnections
- Evictions (should be 0)
- CacheHits/CacheMisses

Set alarms:
- CPU > 75%
- Memory > 85%
- Connections > 50000
```

---

## 📊 Monitoring & Maintenance

### CloudWatch Metrics to Watch
```
CPUUtilization: Should be < 75%
DatabaseMemoryUsagePercentage: Should be < 85%
CurrConnections: Track connection count
EngineCPUUtilization: Redis engine CPU
NetworkBytesIn/Out: Traffic volume
CacheHits/CacheMisses: Cache efficiency
Evictions: Should be 0 (if not, increase memory)
```

### Scaling Triggers
```
Scale UP when:
- CPU consistently > 75%
- Memory > 85%
- Connections > 50000
- High latency (> 1ms)

Scale OUT when:
- Single node bottleneck
- Need multi-AZ redundancy
- Need read replicas
```

---

## 🚨 Troubleshooting

### Issue 1: Connection Timeout
```
Error: redis.exceptions.TimeoutError

Solutions:
1. Check security group allows port 6379
2. Verify VPC and subnet configuration
3. Check Redis cluster status is "Available"
4. Ensure backend is in same VPC
```

### Issue 2: Connection Refused
```
Error: redis.exceptions.ConnectionError: Connection refused

Solutions:
1. Check Redis endpoint is correct
2. Verify port 6379 is open
3. Check if Redis cluster is running
4. Test with redis-cli first
```

### Issue 3: Authentication Error
```
Error: NOAUTH Authentication required

Solutions:
1. If auth token enabled, provide password:
   redis.Redis(host='...', port=6379, password='token')
2. Check AUTH command in Redis
```

### Issue 4: Out of Memory
```
Error: OOM command not allowed when used memory > 'maxmemory'

Solutions:
1. Scale up to larger node type
2. Set eviction policy: allkeys-lru
3. Clean up old keys with TTL
4. Monitor memory usage in CloudWatch
```

---

## 📚 Additional Resources

- [ElastiCache User Guide](https://docs.aws.amazon.com/elasticache/)
- [Redis Commands](https://redis.io/commands/)
- [Django Redis](https://github.com/jazzband/django-redis)
- [ElastiCache Pricing](https://aws.amazon.com/elasticache/pricing/)

---

## ✅ Next Steps

After ElastiCache is ready:
1. ✅ Update backend `.env` with Redis endpoint
2. ✅ Install `redis` and `django-redis` packages
3. ✅ Configure Django settings
4. ✅ Migrate matchmaking to Redis
5. ✅ Test matchmaking with Redis backend
6. ✅ Monitor performance and optimize

---

**Created:** October 30, 2025  
**Last Updated:** October 30, 2025
