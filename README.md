# RouteSnap 外送派單規劃系統

> 🚀 **一鍵拍照，AI 自動辨識訂單並規劃最佳配送路線**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com/)

## 📖 專案簡介

一個專為配送設計的智慧路徑規劃系統，透過 AI 圖像識別技術，自動從外送單照片中提取訂單資訊，並為外送員規劃最佳配送順序。

## 📲 安裝到手機 (iPhone)

無需下載 App，直接將網頁加入主畫面即可使用：

1. 使用 **Safari** 開啟本網頁
2. 點擊下方中間的 **「分享」** 按鈕 (方框向上箭頭)
3. 往下滑找到並點擊 **「加入主畫面」**
4. 點擊右上角的 **「新增」**
5. 回到桌面即可看到 App 圖示 ✨

### ✨ 核心特點

- 🤖 **AI 智慧辨識**：精準提取客戶姓名、電話、地址、商品資訊
- ➕ **追加上傳**：支援分批上傳，超過 6 張圖片可繼續追加
- 💾 **自動暫存**：訂單資料自動儲存，刷新頁面後自動恢復
- 📦 **備貨總表生成**：一鍵產生備貨清單，方便倉庫人員準備商品
- 🗺️ **路徑優化**：自動排序配送地址
- 📱 **行動優先**：PWA 設計，支援手機拍照上傳
- 🔄 **拖曳排序**：支援手動調整配送順序
- 🖼️ **圖片存檔**：原始外送單圖片儲存，隨時查看

## 🎯 使用場景

### 店端

1. 📸 拍攝外送單照片（每次最多 6 張，可追加上傳）
2. ✅ AI 自動辨識並排序
3. ✏️ 確認/編輯訂單資訊
4. ➕ 點擊「追加上傳」繼續添加更多圖片
5. 📋 生成備貨總表
6. 📱 生成派單連結傳給外送員

### 外送員

1. 📲 點擊派單連結
2. 🗺️ 查看配送順序和地址
3. 🧭 一鍵開啟導航
4. ✅ 完成配送後打勾確認

## 🛠️ 技術架構

| 層級 | 技術 |
|-----|-----|
| **前端框架** | Next.js 15 (Static Export) |
| **樣式** | TailwindCSS + Lucide Icons |
| **後端** | Cloudflare Workers + Hono.js |
| **儲存** | Cloudflare KV |
| **AI** | Google AI |
| **部署** | Cloudflare Pages / Workers |

## 🚀 快速開始

### 環境需求

- Node.js 18+
- Cloudflare 帳號
- AI API Key

### 部署步驟

```bash
# 1. Clone 專案
git clone

# 2. 後端部署
cd backend
npm install
npx wrangler secret put GEMINI_API_KEY  # 設定 API Key
npm run deploy

# 3. 前端部署
cd ../frontend
npm install --legacy-peer-deps
npm run build
# 使用 Cloudflare Pages 連接 GitHub 自動部署
```

### Cloudflare Pages 設定

| 設定項目 | 值 |
|---------|---|
| Framework | Next.js (Static HTML Export) |
| Build command | `npm run build` |
| Output directory | `out` |
| Root directory | `frontend` |

## 📋 主要功能

### AI 訂單辨識

自動識別：客戶姓名、電話、地址、商品、訂單編號、發票號碼

### 備貨總表

一鍵產生 PDF 格式的備貨清單，包含所有客戶的商品明細

### 歷史記錄查詢

- 按日期查詢過往派單記錄
- 密碼保護，防止未授權存取
- 支援刪除歷史記錄

### 送達拍照回報

- 外送員送達後拍照回報（2-8張）
- 店端可在歷史記錄查看送達照片
- 自動標記完成狀態

### 圖片存檔

- 上傳的外送單圖片自動儲存到 Cloudflare KV
- 永久保存（不設過期時間）

### 追加上傳與自動暫存

- 支援分批上傳，超過 6 張圖片可點擊「➕ 追加上傳」繼續添加
- 訂單資料自動儲存到 LocalStorage，刷新頁面後自動恢復
- 點擊「🗑️ 清除」會先確認再刪除草稿
- 成功生成派單連結後自動清除草稿

## 🔒 安全性

- ✅ API Key 使用 Cloudflare Secrets 管理
- ✅ 歷史記錄需密碼驗證
- ✅ 無需資料庫，降低資料外洩風險
- ✅ HTTPS 加密傳輸

## 📊 專案進度

- [x] AI 訂單辨識
- [x] 備貨總表 PDF
- [x] 外送員導航介面
- [x] 圖片存檔功能
- [x] 歷史記錄查詢（密碼保護）
- [x] 送達拍照回報
- [x] 追加上傳功能
- [x] 自動暫存訂單
- [ ] 深色模式
- [ ] 多語言支援

**完成度：70%**

---

**@lalawgwg99  Made with ❤️ by 榮德**
