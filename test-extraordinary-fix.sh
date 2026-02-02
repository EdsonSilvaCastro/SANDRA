#!/bin/bash

echo "🧪 Testing Extraordinary Tasks After Fix..."
echo ""

# Test 1: Check if column exists
echo "1️⃣ Checking if is_extraordinary column exists..."
curl -s 'https://chzqbcxhqszvsxynxdgj.supabase.co/rest/v1/tasks?select=id,name,is_extraordinary&limit=1' \
  -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoenFiY3hocXN6dnN4eW54ZGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMzY2NzMsImV4cCI6MjA4MDcxMjY3M30.-ZWpmQr8hwjxlcodNj_R3SYI-cVTJbxFbb6kkTNkiVE' \
  -H 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoenFiY3hocXN6dnN4eW54ZGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMzY2NzMsImV4cCI6MjA4MDcxMjY3M30.-ZWpmQr8hwjxlcodNj_R3SYI-cVTJbxFbb6kkTNkiVE' | jq .

if [ $? -eq 0 ]; then
    echo "✅ Column check passed!"
else
    echo "❌ Column still missing - run the SQL migration first"
    exit 1
fi

echo ""
echo "2️⃣ Testing extraordinary task creation..."

# Test 2: Create extraordinary task (your original curl)
response=$(curl -s 'https://chzqbcxhqszvsxynxdgj.supabase.co/rest/v1/tasks' \
  -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoenFiY3hocXN6dnN4eW54ZGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMzY2NzMsImV4cCI6MjA4MDcxMjY3M30.-ZWpmQr8hwjxlcodNj_R3SYI-cVTJbxFbb6kkTNkiVE' \
  -H 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoenFiY3hocXN6dnN4eW54ZGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMzY2NzMsImV4cCI6MjA4MDcxMjY3M30.-ZWpmQr8hwjxlcodNj_R3SYI-cVTJbxFbb6kkTNkiVE' \
  -H 'content-type: application/json' \
  --data-raw '{"status":"No Iniciado","start_date":"2026-02-02","photo_ids":[],"depends_on":[],"total_volume":0,"unit_price":0,"total_value":0,"is_extraordinary":true,"name":"Test Extraordinary Task","description":"Test task to verify the fix works","end_date":"2026-02-05","id":"tsk-test-extraordinary-'$(date +%s)'","project_id":"74bb478e-71b4-43b6-8510-5772658d2a1e"}')

if echo "$response" | grep -q "code.*PGRST"; then
    echo "❌ Task creation failed:"
    echo "$response" | jq .
    echo ""
    echo "💡 Make sure you ran the SQL migration in Supabase dashboard!"
else
    echo "✅ Extraordinary task created successfully!"
    echo "$response" | jq .
fi

echo ""
echo "🎉 If both tests passed, extraordinary tasks are now working!"
echo "You can now create extraordinary tasks from the SANDRA app."