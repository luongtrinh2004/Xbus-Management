#!/bin/bash
set -e

IMAGE_NAME="luongtrinh462004/xbus-office:latest"
VPS_USER="stackops"
VPS_HOST="aiot-dev" 
VPS_DIR="~/xbus-management"

echo "🚀 [1/4] Building Docker image ở local (linux/amd64)..."
docker build --platform linux/amd64 -t $IMAGE_NAME .

echo "📤 [2/4] Pushing image lên Docker Hub..."
docker push $IMAGE_NAME

echo "🧹 [3/4] Dọn rác Docker ở máy Local (Prune)..."
docker system prune -f

echo "🔄 [4/4] Ra lệnh VPS tải image mới và restart (VPS KHÔNG BUILD)..."
ssh $VPS_USER@$VPS_HOST "cd $VPS_DIR && docker compose pull xbus-office && docker compose up -d xbus-office"

echo "✅ Hoàn tất deploy code mới lên VPS nhé!"