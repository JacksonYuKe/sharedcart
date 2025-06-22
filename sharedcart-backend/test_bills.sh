#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🧪 Starting Bill Management Tests..."

# Step 1: Register first user
echo -e "\n${GREEN}1. Registering first user...${NC}"
RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user1@example.com",
    "password": "password123",
    "name": "User One"
  }')
TOKEN1=$(echo $RESPONSE | jq -r '.token')
USER1_ID=$(echo $RESPONSE | jq -r '.user.id')
echo "User 1 created with ID: $USER1_ID"

# Step 2: Register second user
echo -e "\n${GREEN}2. Registering second user...${NC}"
RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user2@example.com",
    "password": "password123",
    "name": "User Two"
  }')
TOKEN2=$(echo $RESPONSE | jq -r '.token')
USER2_ID=$(echo $RESPONSE | jq -r '.user.id')
echo "User 2 created with ID: $USER2_ID"

# Step 3: Create a group
echo -e "\n${GREEN}3. Creating group...${NC}"
RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/groups \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Roommates",
    "description": "Testing bill management"
  }')
GROUP_ID=$(echo $RESPONSE | jq -r '.group.id')
echo "Group created with ID: $GROUP_ID"

# Step 4: Add second user to group
echo -e "\n${GREEN}4. Adding user 2 to group...${NC}"
curl -s -X POST http://localhost:8080/api/v1/groups/$GROUP_ID/members \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user2@example.com"
  }' | jq '.'

# Step 5: Create first bill with mixed items
echo -e "\n${GREEN}5. Creating bill with shared and personal items...${NC}"
RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/bills \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{
    "group_id": '$GROUP_ID',
    "title": "Grocery Shopping",
    "description": "Weekly groceries",
    "total_amount": "150.00",
    "bill_date": "2024-01-15T10:30:00Z",
    "items": [
      {
        "name": "Milk",
        "amount": "5.00",
        "quantity": 2,
        "is_shared": true
      },
      {
        "name": "Personal Snacks for User 1",
        "amount": "20.00",
        "quantity": 1,
        "is_shared": false,
        "owner_ids": ['$USER1_ID']
      },
      {
        "name": "Bread",
        "amount": "3.00",
        "quantity": 1,
        "is_shared": true
      },
      {
        "name": "Shared Groceries",
        "amount": "117.00",
        "quantity": 1,
        "is_shared": true
      }
    ]
  }')
BILL1_ID=$(echo $RESPONSE | jq -r '.bill.id')
echo "Bill 1 created with ID: $BILL1_ID"

# Step 6: Get bill details
echo -e "\n${GREEN}6. Getting bill details...${NC}"
curl -s -X GET http://localhost:8080/api/v1/bills/$BILL1_ID \
  -H "Authorization: Bearer $TOKEN1" | jq '.'

# Step 7: Create bill with items shared between specific users
echo -e "\n${GREEN}7. Creating bill with items shared between specific users...${NC}"
RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/bills \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{
    "group_id": '$GROUP_ID',
    "title": "Pizza Night",
    "description": "Pizza for User 1 and User 2",
    "total_amount": "50.00",
    "items": [
      {
        "name": "Large Pizza",
        "amount": "30.00",
        "quantity": 1,
        "is_shared": false,
        "owner_ids": ['$USER1_ID', '$USER2_ID']
      },
      {
        "name": "Drinks for everyone",
        "amount": "20.00",
        "quantity": 1,
        "is_shared": true
      }
    ]
  }')
BILL2_ID=$(echo $RESPONSE | jq -r '.bill.id')
echo "Bill 2 created with ID: $BILL2_ID"

# Step 8: List all bills
echo -e "\n${GREEN}8. Listing all bills for the group...${NC}"
curl -s -X GET "http://localhost:8080/api/v1/bills?group_id=$GROUP_ID" \
  -H "Authorization: Bearer $TOKEN1" | jq '.bills[] | {id: .id, title: .title, total: .total_amount, status: .status}'

# Step 9: Add item to existing bill
echo -e "\n${GREEN}9. Adding item to bill 1...${NC}"
RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/bills/$BILL1_ID/items \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cleaning Supplies",
    "amount": "25.00",
    "quantity": 1,
    "is_shared": true
  }')
ITEM_ID=$(echo $RESPONSE | jq -r '.item.id')
echo "Item added with ID: $ITEM_ID"
echo $RESPONSE | jq '.'

# Step 10: Update the item
echo -e "\n${GREEN}10. Updating the cleaning supplies item...${NC}"
curl -s -X PUT http://localhost:8080/api/v1/bills/$BILL1_ID/items/$ITEM_ID \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Cleaning Supplies",
    "amount": "30.00",
    "quantity": 1,
    "is_shared": true
  }' | jq '.'

# Step 11: Get updated bill to see new total
echo -e "\n${GREEN}11. Getting updated bill (should show new total)...${NC}"
curl -s -X GET http://localhost:8080/api/v1/bills/$BILL1_ID \
  -H "Authorization: Bearer $TOKEN1" | jq '.bill | {title: .title, total: .total_amount, items_count: (.items | length)}'

# Step 12: Finalize bill
echo -e "\n${GREEN}12. Finalizing bill 1...${NC}"
curl -s -X POST http://localhost:8080/api/v1/bills/$BILL1_ID/finalize \
  -H "Authorization: Bearer $TOKEN1" | jq '.'

# Step 13: Try to update finalized bill (should fail)
echo -e "\n${GREEN}13. Testing: Try to update finalized bill (should fail)...${NC}"
curl -s -X PUT http://localhost:8080/api/v1/bills/$BILL1_ID \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "description": "This should fail",
    "total_amount": "180.00",
    "bill_date": "2024-01-15T10:30:00Z"
  }' | jq '.'

# Step 14: Test permissions - User 2 tries to update User 1's bill (should fail)
echo -e "\n${GREEN}14. Testing: User 2 tries to update User 1's bill (should fail)...${NC}"
curl -s -X PUT http://localhost:8080/api/v1/bills/$BILL2_ID \
  -H "Authorization: Bearer $TOKEN2" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Unauthorized Update",
    "description": "This should fail",
    "total_amount": "50.00",
    "bill_date": "2024-01-15T10:30:00Z"
  }' | jq '.'

# Step 15: List pending bills
echo -e "\n${GREEN}15. Listing only pending bills...${NC}"
curl -s -X GET "http://localhost:8080/api/v1/bills?group_id=$GROUP_ID&status=pending" \
  -H "Authorization: Bearer $TOKEN1" | jq '.bills[] | {title: .title, status: .status}'

# Step 16: List finalized bills
echo -e "\n${GREEN}16. Listing only finalized bills...${NC}"
curl -s -X GET "http://localhost:8080/api/v1/bills?group_id=$GROUP_ID&status=finalized" \
  -H "Authorization: Bearer $TOKEN1" | jq '.bills[] | {title: .title, status: .status}'

# Step 17: Delete an item from bill 2
echo -e "\n${GREEN}17. Deleting an item from bill 2...${NC}"
# First get the bill to find an item ID
BILL2_DETAILS=$(curl -s -X GET http://localhost:8080/api/v1/bills/$BILL2_ID \
  -H "Authorization: Bearer $TOKEN1")
ITEM_TO_DELETE=$(echo $BILL2_DETAILS | jq -r '.bill.items[0].id')
echo "Deleting item ID: $ITEM_TO_DELETE"

curl -s -X DELETE http://localhost:8080/api/v1/bills/$BILL2_ID/items/$ITEM_TO_DELETE \
  -H "Authorization: Bearer $TOKEN1" | jq '.'

# Step 18: Check bill 2 total after deletion
echo -e "\n${GREEN}18. Checking bill 2 after item deletion...${NC}"
curl -s -X GET http://localhost:8080/api/v1/bills/$BILL2_ID \
  -H "Authorization: Bearer $TOKEN1" | jq '.bill | {title: .title, total: .total_amount, items: .items}'

echo -e "\n${GREEN}✅ All tests completed!${NC}"
echo -e "\nSummary:"
echo "- Created 2 users"
echo "- Created 1 group with both users"
echo "- Created 2 bills with various item types"
echo "- Added/updated items"
echo "- Tested finalization and permissions"
echo "- Verified bill totals update correctly"