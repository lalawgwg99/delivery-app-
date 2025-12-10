@echo off
echo 🚀 開始自動部署...

REM 推送到 GitHub
echo 📤 推送程式碼到 GitHub...
git add .
git commit -m "Auto deploy: %date% %time%"
git push origin main

REM 部署後端
echo ⚙️ 部署後端 Worker...
cd backend
call npm run deploy
cd ..

REM 部署前端
echo 🌐 部署前端 Pages...
cd frontend
call npm run build
call npx wrangler pages deploy out --project-name delivery-app --branch main
cd ..

echo ✅ 部署完成！
echo 前端: https://delivery-app-5cw.pages.dev
echo 後端: https://routesnap-backend.lalawgwg99.workers.dev
pause
