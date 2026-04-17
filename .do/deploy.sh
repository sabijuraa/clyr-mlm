#!/bin/bash
echo "🚀 CLYR Deploy Script"
echo "Installing server dependencies..."
cd server && npm ci --production
echo "✅ Server ready"
