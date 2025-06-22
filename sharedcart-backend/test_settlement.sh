#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Starting Settlement Logic Tests..."

# Step 1: Setup - Create 3 users
echo -e "\n${GREEN}1. Creating 3 users for testing...${NC}"
RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "password123", "name": "Alice"}')
TOKEN1=$(echo $RESPONSE | jq -r '.token')
USER1_ID=$(echo $RESPONSE | jq -r '.user.id')
echo "Alice created with ID: $USER1_ID"

RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "bob@example.com", "password": "password123", "name": "Bob"}')
TOKEN2=$(echo $RESPONSE | jq -r '.token')
USER2_ID=$(echo $RESPONSE | jq -r '.user.id')
echo "Bob created with ID: $USER2_ID"

RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "charlie@example.com", "password": "password123", "name": "Charlie"}')
TOKEN3=$(echo $RESPONSE | jq -r '.token')
USER3_ID=$(echo $RESPONSE | jq -r '.user.id')
echo "Charlie created with ID: $USER3_ID"

# Step 2: Create group and add members
echo -e "\n${GREEN}2. Creating group and adding all members...${NC}"
RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/groups \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"name": "Settlement Test Group", "description": "Testing settlements"}')
GROUP_ID=$(echo $RESPONSE | jq -r '.group.id')
echo "Group created with ID: $GROUP_ID"

# Add Bob and Charlie to group
curl -s -X POST http://localhost:8080/api/v1/groups/$GROUP_ID/members \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"email": "bob@example.com"}' > /dev/null

curl -s -X POST http://localhost:8080/api/v1/groups/$GROUP_ID/members \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"email": "charlie@example.com"}' > /dev/null

echo "All members added to group"

# Step 3: Create bills to demonstrate different scenarios
echo -e "\n${GREEN}3. Creating test bills...${NC}"

# Bill 1: Alice pays $90 for shared groceries
echo -e "${YELLOW}Creating Bill 1: Alice pays \$90 for shared groceries${NC}"
RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/bills \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{
    "group_id": '$GROUP_ID',
    "title": "Shared Groceries",
    "description": "Weekly shopping",
    "total_amount": "90.00",
    "items": [{
      "name": "Groceries for everyone",
      "amount": "90.00",
      "quantity": 1,
      "is_shared": true
    }]
  }')
BILL1_ID=$(echo $RESPONSE | jq -r '.bill.id')

# Bill 2: Bob pays $60, but Charlie's items cost $20
echo -e "${YELLOW}Creating Bill 2: Bob pays \$60 (Charlie owes \$20 for personal items)${NC}"
RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/bills \
  -H "Authorization: Bearer $TOKEN2" \
  -H "Content-Type: application/json" \
  -d '{
    "group_id": '$GROUP_ID',
    "title": "Mixed Shopping",
    "description": "Shared and personal items",
    "total_amount": "60.00",
    "items": [{
      "name": "Shared items",
      "amount": "40.00",
      "quantity": 1,
      "is_shared": true
    }, {
      "name": "Charlie personal items",
      "amount": "20.00",
      "quantity": 1,
      "is_shared": false,
      "owner_ids": ['$USER3_ID']
    }]
  }')
BILL2_ID=$(echo $RESPONSE | jq -r '.bill.id')

# Bill 3: Charlie pays $30 for everyone
echo -e "${YELLOW}Creating Bill 3: Charlie pays \$30 for shared items${NC}"
RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/bills \
  -H "Authorization: Bearer $TOKEN3" \
  -H "Content-Type: application/json" \
  -d '{
    "group_id": '$GROUP_ID',
    "title": "Pizza Night",
    "description": "Shared pizza",
    "total_amount": "30.00",
    "items": [{
      "name": "Pizza for everyone",
      "amount": "30.00",
      "quantity": 1,
      "is_shared": true
    }]
  }')
BILL3_ID=$(echo $RESPONSE | jq -r '.bill.id')

# Step 4: Calculate settlement
echo -e "\n${GREEN}4. Calculating settlement for all bills...${NC}"
echo -e "${YELLOW}Expected calculation:${NC}"
echo "- Total spent: \$180 (\$90 + \$60 + \$30)"
echo "- Alice paid: \$90, owes: \$30 (her share) = +\$60"
echo "- Bob paid: \$60, owes: \$13.33 (shared) = +\$46.67"
echo "- Charlie paid: \$30, owes: \$30 + \$13.33 + \$10 + \$20 = -\$73.33"

RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/settlements/calculate \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{
    "group_id": '$GROUP_ID',
    "bill_ids": ['$BILL1_ID', '$BILL2_ID', '$BILL3_ID']
  }')

echo -e "\n${YELLOW}Settlement Calculation Result:${NC}"
echo $RESPONSE | jq '.settlement'

# Step 5: Save the settlement
echo -e "\n${GREEN}5. Saving the settlement...${NC}"
RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/settlements \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{
    "group_id": '$GROUP_ID',
    "bill_ids": ['$BILL1_ID', '$BILL2_ID', '$BILL3_ID']
  }')
SETTLEMENT_ID=$(echo $RESPONSE | jq -r '.settlement.id')
echo "Settlement created with ID: $SETTLEMENT_ID"
echo $RESPONSE | jq '.calculation.transactions'

# Step 6: Get settlement details
echo -e "\n${GREEN}6. Getting settlement details...${NC}"
curl -s -X GET http://localhost:8080/api/v1/settlements/$SETTLEMENT_ID \
  -H "Authorization: Bearer $TOKEN1" | jq '.settlement | {id: .id, status: .status, total_bills: (.bills | length), transactions: .transactions}'

# Step 7: List all settlements for the group
echo -e "\n${GREEN}7. Listing all settlements for the group...${NC}"
curl -s -X GET "http://localhost:8080/api/v1/settlements?group_id=$GROUP_ID" \
  -H "Authorization: Bearer $TOKEN1" | jq '.settlements'

# Step 8: Confirm the settlement
echo -e "\n${GREEN}8. Confirming the settlement...${NC}"
curl -s -X POST http://localhost:8080/api/v1/settlements/$SETTLEMENT_ID/confirm \
  -H "Authorization: Bearer $TOKEN1" | jq '.'

# Step 9: Check that bills are now marked as settled
echo -e "\n${GREEN}9. Checking bill statuses (should be 'settled')...${NC}"
curl -s -X GET http://localhost:8080/api/v1/bills/$BILL1_ID \
  -H "Authorization: Bearer $TOKEN1" | jq '.bill | {id: .id, title: .title, status: .status}'

# Step 10: Try to calculate with non-existent bills (should fail)
echo -e "\n${GREEN}10. Testing error: Calculate with non-existent bills...${NC}"
curl -s -X POST http://localhost:8080/api/v1/settlements/calculate \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{
    "group_id": '$GROUP_ID',
    "bill_ids": [999]
  }' | jq '.'

# Step 11: Test complex scenario with multiple personal items
echo -e "\n${GREEN}11. Creating complex bill for advanced testing...${NC}"
RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/bills \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{
    "group_id": '$GROUP_ID',
    "title": "Complex Shopping",
    "description": "Mix of shared and personal",
    "total_amount": "120.00",
    "items": [{
      "name": "Shared cleaning supplies",
      "amount": "30.00",
      "quantity": 1,
      "is_shared": true
    }, {
      "name": "Alice and Bob shared snacks",
      "amount": "40.00",
      "quantity": 1,
      "is_shared": false,
      "owner_ids": ['$USER1_ID', '$USER2_ID']
    }, {
      "name": "Charlie special order",
      "amount": "50.00",
      "quantity": 1,
      "is_shared": false,
      "owner_ids": ['$USER3_ID']
    }]
  }')
BILL4_ID=$(echo $RESPONSE | jq -r '.bill.id')

echo -e "\n${YELLOW}Calculating settlement for the complex bill:${NC}"
curl -s -X POST http://localhost:8080/api/v1/settlements/calculate \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{
    "group_id": '$GROUP_ID',
    "bill_ids": ['$BILL4_ID']
  }' | jq '.settlement'

echo -e "\n${GREEN}✅ Settlement tests completed!${NC}"
echo -e "\nSummary:"
echo "- Created 3 users (Alice, Bob, Charlie)"
echo "- Created 1 group with all members"
echo "- Created 4 bills with various sharing scenarios"
echo "- Calculated settlements showing who owes whom"
echo "- Saved and confirmed a settlement"
echo "- Verified bills are marked as settled"
echo "- Tested complex scenarios with personal items"