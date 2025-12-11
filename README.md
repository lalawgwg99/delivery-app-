# RouteSnap 外送派單規劃系統

> 🚀 **一鍵拍照，AI 自動辨識訂單並規劃最佳配送路線**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com/)

## 📖 專案簡介

一個專為配送設計的智慧路徑規劃系統，透過 AI 圖像識別技術，自動從外送單照片中提取訂單資訊，並為外送員規劃最佳配送順序。

### ✨ 核心特點

- 🤖 **AI 智慧辨識**：精準提取客戶姓名、電話、地址、商品資訊
- 📦 **備貨總表生成**：一鍵產生備貨清單，方便倉庫人員準備商品
- 🗺️ **路徑優化**：自動排序配送地址
- 📱 **行動優先**：PWA 設計，支援手機拍照上傳
- 🔄 **拖曳排序**：支援手動調整配送順序
- 🖼️ **圖片存檔**：原始外送單圖片儲存，隨時查看

## 🎯 使用場景

### 店端
1. 📸 拍攝外送單照片（支援批量 2-6 張）
2. ✅ AI 自動辨識並排序
3. ✏️ 確認/編輯訂單資訊
4. 📋 生成備貨總表
5. 📱 生成派單連結傳給外送員

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
git clone https://github.com/lalawgwg99/delivery-app-.git
cd delivery-app-

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

### 圖片存檔
- 上傳的外送單圖片自動儲存到 Cloudflare KV
- 24 小時後自動過期

## 🔒 安全性

- ✅ API Key 使用 Cloudflare Secrets 管理
- ✅ 無需資料庫，降低資料外洩風險
- ✅ HTTPS 加密傳輸
- ✅ 圖片 24 小時自動過期

## 📊 專案進度

- [x] AI 訂單辨識
- [x] 備貨總表 PDF
- [x] 外送員導航介面
- [x] 圖片存檔功能
- [ ]    模式
- [ ]    支援
**完成度：60% 待時間及預算足夠再說**

---

** @lalawgwg99  Made with ❤️ by 榮德**
