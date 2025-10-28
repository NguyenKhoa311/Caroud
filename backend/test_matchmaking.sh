#!/bin/bash
# Test matchmaking with two users

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🎮 Matchmaking Test Script${NC}"
echo -e "${BLUE}========================================${NC}"

# Get tokens
echo -e "\n${GREEN}Step 1: Login users${NC}"

echo "Login tangerine..."
TANGERINE_RESPONSE=$(curl -s -X POST http://localhost:8000/api/users/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"tangerine","password":"tangerine123"}')

TANGERINE_TOKEN=$(echo $TANGERINE_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])" 2>/dev/null)

if [ -z "$TANGERINE_TOKEN" ]; then
  echo -e "${RED}❌ Failed to login tangerine${NC}"
  echo "Response: $TANGERINE_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ tangerine logged in${NC}"

echo "Login testuser..."
TESTUSER_RESPONSE=$(curl -s -X POST http://localhost:8000/api/users/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testuser123"}')

TESTUSER_TOKEN=$(echo $TESTUSER_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])" 2>/dev/null)

if [ -z "$TESTUSER_TOKEN" ]; then
  echo -e "${RED}❌ Failed to login testuser${NC}"
  echo "Response: $TESTUSER_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ testuser logged in${NC}"

# Join queue
echo -e "\n${GREEN}Step 2: Join matchmaking queue${NC}"

echo "tangerine joining queue..."
TANGERINE_JOIN=$(curl -s -X POST http://localhost:8000/api/matchmaking/join/ \
  -H "Authorization: Token $TANGERINE_TOKEN")

echo "Response: $TANGERINE_JOIN"

sleep 1

echo "testuser joining queue..."
TESTUSER_JOIN=$(curl -s -X POST http://localhost:8000/api/matchmaking/join/ \
  -H "Authorization: Token $TESTUSER_TOKEN")

echo "Response: $TESTUSER_JOIN"

# Check if matched
echo -e "\n${GREEN}Step 3: Check results${NC}"

TANGERINE_STATUS=$(echo $TANGERINE_JOIN | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])" 2>/dev/null)
TESTUSER_STATUS=$(echo $TESTUSER_JOIN | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])" 2>/dev/null)

if [ "$TANGERINE_STATUS" = "matched" ] || [ "$TESTUSER_STATUS" = "matched" ]; then
  echo -e "${GREEN}🎉 SUCCESS! Match found!${NC}"
  
  if [ "$TANGERINE_STATUS" = "matched" ]; then
    MATCH_ID=$(echo $TANGERINE_JOIN | python3 -c "import sys, json; print(json.load(sys.stdin)['match']['id'])" 2>/dev/null)
    echo "Match ID: $MATCH_ID"
  fi
  
  if [ "$TESTUSER_STATUS" = "matched" ]; then
    MATCH_ID=$(echo $TESTUSER_JOIN | python3 -c "import sys, json; print(json.load(sys.stdin)['match']['id'])" 2>/dev/null)
    echo "Match ID: $MATCH_ID"
  fi
else
  echo -e "${RED}⏳ Waiting for match...${NC}"
  echo "tangerine status: $TANGERINE_STATUS"
  echo "testuser status: $TESTUSER_STATUS"
  
  echo -e "\n${GREEN}Polling for 10 seconds...${NC}"
  
  for i in {1..5}; do
    sleep 2
    echo "Poll $i..."
    
    TANGERINE_STATUS_CHECK=$(curl -s -X GET http://localhost:8000/api/matchmaking/status/ \
      -H "Authorization: Token $TANGERINE_TOKEN")
    
    STATUS=$(echo $TANGERINE_STATUS_CHECK | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])" 2>/dev/null)
    
    if [ "$STATUS" = "matched" ]; then
      echo -e "${GREEN}🎉 Match found!${NC}"
      echo "Response: $TANGERINE_STATUS_CHECK"
      exit 0
    fi
  done
  
  echo -e "${RED}❌ No match found after 10 seconds${NC}"
fi

echo -e "\n${BLUE}========================================${NC}"
