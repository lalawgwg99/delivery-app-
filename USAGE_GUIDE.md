# RouteSnap 專案使用說明書

這份文件包含如何啟動 RouteSnap (外送路徑優化 App) 的詳細步驟，以及未來的設定與部署說明。

## 1. 專案結構簡介
- **backend/**: Cloudflare Workers 後端 (負責 AI 圖片辨識與資料庫)。
- **frontend/**: Next.js 前端 (PWA 應用程式介面)。

---

## 2. 本地開發 (如何啟動)

要同時啟動後端與前端，你需要開啟**兩個**終端機視窗。

### 步驟一：啟動後端 (Backend)
1. 開啟終端機 (Terminal)。
2. 進入後端資料夾：
   ```bash
   cd backend
   ```
3. (僅第一次需要) 安裝依賴：
   ```bash
   npm install
   ```
4. 啟動開發伺服器：
   ```bash
   npm run dev
   ```
   *此時後端應該會運行在 `http://localhost:8787`。*

### 步驟二：啟動前端 (Frontend)
1. 開啟**另一個**新的終端機。
2. 進入前端資料夾：
   ```bash
   cd frontend
   ```
3. (僅第一次需要) 安裝依賴：
   ```bash
   npm install
   ```
4. 確認環境變數：
   - 確保 `frontend` 資料夾下有一個 `.env.local` 檔案。
   - 內容應包含：`NEXT_PUBLIC_API_URL=http://localhost:8787`
5. 啟動前端開發伺服器：
   ```bash
   npm run dev
   ```
   *前端預設運行在 `http://localhost:3000`。*

---

## 3. 未來設定與正式部署

當你準備將 App 發布給其他人使用時，請參考以下步驟。

### 後端部署 (Deploy Backend)
1. 登入 Cloudflare (若尚未登入)：
   ```bash
   npx wrangler login
   ```
2. 設定 Gemini API Key (重要！)：
   為了讓 AI 功能在線上運作，需要將 API Key 存入 Cloudflare 的安全儲存區。
   ```bash
   npx wrangler secret put GEMINI_API_KEY
   ```
   *執行後，貼上你的 Google Gemini API Key 並按 Enter。*
3. 部署程式碼：
   ```bash
   npm run deploy
   ```
   *部署成功後，你會獲得一個網址，例如 `https://routesnap-backend.<你的帳號>.workers.dev`。請記下這個網址。*

### 前端部署 (Deploy Frontend)
前端建議部署到 **Vercel** 或 **Cloudflare Pages**。

1. **修改環境變數**：
   在部署平台的設定中 (Environment Variables)，新增變數：
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: 填入剛剛獲得的後端網址 (例如 `https://routesnap-backend...`)

2. **開始部署**：
   - 如果使用 Vercel，連結你的 GitHub Repo 並匯入 `frontend` 資料夾即可自動部署。

---

## 4. 常見問題與除錯

- **API 連線失敗 / AI 沒反應**：
  - 檢查後端終端機是否有錯誤訊息。
  - 檢查前端 `.env.local` 的 `NEXT_PUBLIC_API_URL` 是否正確。
  - 確保你的 Gemini API Key 是有效的。

- **資料庫 (KV) 問題**：
  - 本地開發時，Wrangler 會模擬一個本地資料庫，重開機後資料可能會消失，這是正常的。
  - 線上部署後，資料會永久儲存在 Cloudflare KV 中。
