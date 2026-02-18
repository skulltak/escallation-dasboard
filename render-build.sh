#!/usr/bin/env bash
# exit on error
set -o errexit

echo "--- BUILDING BACKEND ---"
npm install

echo "--- BUILDING FRONTEND ---"
cd client
npm install --legacy-peer-deps
npm run build
cd ..

echo "--- BUILD COMPLETE ---"
