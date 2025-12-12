# RouteSnap 外送派單規劃系統 (Enterprise Edition)

> 🚀 **穩定的企業級外送派單系統：一鍵拍照，AI 自動辨識訂單並規劃最佳配送路線**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com/)
[![Stability](https://img.shields.io/badge/Stability-Enterprise-green)](README.md)

## 📖 專案簡介 (v2.0 穩定版)

一個專為配送設計的**企業級**智慧路徑規劃系統。透過 AI 圖像識別技術，自動從外送單照片中提取訂單資訊。
本版本重點強化了**大量上傳的穩定性**與**數據安全性**，確保在外送員與店家的繁忙操作中零失誤。

## 📲 安裝到手機 (iPhone/Android)

無需下載 App，直接使用 PWA 技術將網頁加入主畫面，享有原生 App 般的順暢體驗：

1. 使用 **Safari** (iOS) 或 **Chrome** (Android) 開啟本網頁
2. 點擊分享按鈕或選單
3. 選擇 **「加入主畫面」 (Add to Home Screen)**
4. 回到桌面即可看到 App 圖示 ✨

## ✨ 核心特點 (企業級強化)

### 🛡️ 極致穩定 (Stability)

- **🚦 智慧序列處理**：支援單次 **15 張** 批量上傳，採用獨家序列化隊列技術，確保手機記憶體不崩潰，低階手機也能順跑。
- **♻️ 智慧重試機制**：遇到網路波動自動重試；若圖片格式錯誤，提供「一鍵重試」功能，不需重新選擇所有圖片。
- **🛑 防手殘保護**：上傳過程中若不小心關閉或刷新頁面，系統會立即攔截警告，防止資料遺失。
- **⚡ 防抖動存檔**：採用 Debounce 技術優化資料庫寫入，大幅減少耗電與卡頓。

### 💾 無限儲存 (Infinite Storage)

- **♾️ IndexedDB 整合**：突破瀏覽器 5MB 限制，採用 IndexedDB 本地資料庫技術。
- **📝 永久草稿**：無論是 100 筆還是 1000 筆訂單，都能完整保留在手機端，直到您主動清除。
- **🧹 一鍵重置**：提供「全系統重置」按鈕，一鍵清除所有緩存與資料庫，還原最乾淨的狀態。

### 🤖 AI 智慧辨識 (Intelligence)

- **🧠 Gemini 2.5 Flash**：採用 Google 最新輕量化模型，識別速度提升 300%，精準提取客戶姓名、電話、地址。
- **📍 地址自動修正**：AI 自動補全行政區與路段，提升導航準確度。

## 🎯 使用場景

### 店端 (Store)

1. 📸 **批量拍照**：一次拍攝 15 張訂單（支援追加上傳）。
2. ✅ **自動校對**：AI 識別完畢後，透過直覺介面快速校對。
3. 📋 **備貨總表**：一鍵生成 PDF 備貨單，包含所有商品統計。
4. 🔗 **生成連結**：產生專屬派單連結傳給外送員。

### 外送員 (Driver)

1. 📲 **點擊連結**：無需登入，直接開啟路徑表。
2. 🗺️ **智慧導航**：一鍵呼叫 Google Maps 導航至下一個地點。
3. ✅ **送達回報**：抵達後拍照回報，照片自動同步回店端存檔。

## 🛠️ 技術架構

| 層級 | 技術方案 | 說明 |
|-----|-----|-----|
| **前端** | Next.js 15 (App Router) | React 最新架構，極致效能 |
| **資料庫** | **IndexedDB** + LocalStorage | 實現瀏覽器端的無限儲存能力 |
| **處理隊列** | **Sequential Queue** | 序列化異步處理，防止記憶體溢出 |
| **後端** | Cloudflare Workers | Serverless 架構，全球邊緣節點加速 |
| **AI 模型** | Google Gemini 2.5 Flash | 最新的視覺語言模型 |
| **部署** | Cloudflare Pages | 自動化 CI/CD 部署 |

## 🚀 快速開始

### 環境需求

- Node.js 18+
- Cloudflare 帳號
- Googel Gemini API Key

### 部署步驟

```bash
# 1. Clone 專案
git clone [repo-url]

# 2. 後端部署 (Cloudflare Workers)
cd backend
npm install
npx wrangler secret put GEMINI_API_KEY  # 設定 API Key
npm run deploy

# 3. 前端部署 (Next.js Static Export)
cd ../frontend
npm install --legacy-peer-deps
npm run build
# 將 out 目錄部署至 Cloudflare Pages
```

## 📊 專案進度

- [x] **v2.0 核心穩定性升級 (Current)**
  - [x] IndexedDB 無限儲存整合
  - [x] 序列化上傳隊列 (循序處理防崩潰)
  - [x] 失敗一鍵重試 UI
  - [x] 防手殘關閉保護
- [x] AI 訂單辨識
- [x] 備貨總表 PDF
- [x] 外送員導航介面
- [x] 歷史記錄查詢（密碼保護）
- [x] 送達拍照回報

---

**@lalawgwg99  Made with ❤️ by 榮德 (Enterprise Edition)**
