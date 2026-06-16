#!/bin/bash
curl -s 'https://chzqbcxhqszvsxynxdgj.supabase.co/rest/v1/tasks?id=eq.tsk-test-123' \
  -X 'PATCH' \
  -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoenFiY3hocXN6dnN4eW54ZGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMzY2NzMsImV4cCI6MjA4MDcxMjY3M30.-ZWpmQr8hwjxlcodNj_R3SYI-cVTJbxFbb6kkTNkiVE' \
  -H 'content-type: application/json' \
  -H 'Prefer: return=representation' \
  --data '{"assigned_worker_id":"test-worker"}'
