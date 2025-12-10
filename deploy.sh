#!/bin/bash

echo "🚀 開始自動部署..."

# 推送到 GitHub
echo "📤 推送程式碼到 GitHub..."
git add .
git commit -m "Auto deploy: $(date '+%Y-%m-%d %H:%M:%S')"
git push origin main

# 部署後端
echo "⚙️ 部署後端 Worker..."
cd backend
npm run deploy
cd ..

# 部署前端
echo "🌐 部署前端 Pages..."
cd frontend
npm run build
npx wrangler pages deploy out --project-name delivery-app --branch main
cd ..

echo "✅ 部署完成！"
echo "前端: https://delivery-app-5cw.pages.dev"
echo "後端: https://routesnap-backend.lalawgwg99.workers.dev"
