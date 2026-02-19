#!/bin/bash
# Gently wakes up Syntropy via the /wake HTTP endpoint.
# This preserves process memory (stats, variables) and just triggers the next cycle immediately.

echo "Sending wake-up signal to Syntropy container..."

# We must execute curl INSIDE the container because port 3000 on the host is the API service, 
# not Syntropy. Syntropy's port 3000 is internal only.
response=$(docker compose exec -T syntropy curl -s -w "%{http_code}" -o /dev/null http://localhost:3000/wake)

if [ "$response" == "200" ]; then
  echo "✅ Syntropy is waking up!"
elif [ "$response" == "409" ]; then
  echo "⚠️  Syntropy is already running a cycle."
else
  echo "❌ Failed to wake Syntropy (HTTP $response)."
  echo "Run 'docker compose logs syntropy' to investigate."
fi
