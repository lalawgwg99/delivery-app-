# RouteSnap - AI 智慧外送路徑規劃系統 by~德

> 🚀 **一鍵拍照，AI 自動辨識訂單並規劃最佳配送路線**
> 
//店端備貨人員，手機拍照不要用原況照片/出貨單拍照務必拍正，不要抖動/單據上印刷文字避免遮擋/手寫文字可能無法識別。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.0-black)](https://nextjs.org/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com/)

## 📖 專案簡介

RouteSnap 是一個專為家電配送設計的智慧路徑規劃系統，透過 AI 圖像識別技術，自動從外送單照片中提取訂單資訊，並為外送員規劃最佳配送順序。

### ✨ 核心特點

- 🤖 **AI 智慧辨識**：使用 Google Gemini 2.0 Flash 模型，精準提取客戶姓名、電話、地址、商品資訊
- 📦 **備貨總表生成**：一鍵產生 PDF 備貨清單，方便倉庫人員準備商品
- 🗺️ **路徑優化**：自動排序配送地址，從「家樂福五甲店」出發的最佳路線
- 📱 **行動優先**：PWA 設計，支援手機拍照上傳，外送員可直接導航
- 🔄 **拖曳排序**：支援手動調整配送順序
- 🖼️ **圖片存檔**：原始外送單圖片儲存，隨時查看

## 🎯 使用場景

### 店端（Store Admin）

1. 📸 拍攝外送單照片（支援批量 2-6 張）
2. ✅ AI 自動辨識並排序
3. ✏️ 確認/編輯訂單資訊
4. 📋 生成「備貨總表」PDF 給倉庫人員
5. 📱 生成派單連結傳給外送員

### 備貨人員（Warehouse）

1. 📄 收到備貨總表 PDF
2. 📦 根據清單準備商品
3. ✅ 確認商品數量無誤

### 外送員（Driver）

1. 📲 點擊派單連結
2. 🗺️ 查看配送順序和地址
3. 🧭 一鍵開啟 Google Maps 導航
4. ✅ 完成配送後打勾確認
5. 📷 查看原始外送單圖片

## 🛠️ 技術架構

### 前端

- **Framework**: Next.js 16 (Static Export)
- **UI**: TailwindCSS + Lucide Icons
- **拖曳**: @hello-pangea/dnd
- **PDF 生成**: jsPDF + jspdf-autotable
- **部署**: Cloudflare Pages

### 後端

- **Runtime**: Cloudflare Workers
- **Framework**: Hono.js
- **AI**: Google Gemini 2.0 Flash API
- **儲存**: Cloudflare KV
- **部署**: Wrangler CLI

## 🚀 快速開始

### 環境需求

- Node.js 18+
- npm 或 yarn
- Cloudflare 帳號
- Google Gemini API Key (2.5 pro)

### 安裝步驟

#### 1. Clone 專案

```bash
git clone https://github.com/lalawgwg99/delivery-app-.git
cd delivery-app-
```

#### 2. 安裝後端依賴

```bash
cd backend
npm install
```

#### 3. 設定 Gemini API Key

```bash
npx wrangler secret put GEMINI_API_KEY
# 輸入您的 Gemini API Key
```

#### 4. 部署後端

```bash
npm run deploy
# 記下部署後的 Worker URL
```

#### 5. 安裝前端依賴

```bash
cd ../frontend
npm install --legacy-peer-deps
```

#### 6. 設定環境變數

創建 `.env.local`:

```env
NEXT_PUBLIC_API_URL=https://your-worker-url.workers.dev
```

#### 7. 本地開發

```bash
npm run dev
# 訪問 http://localhost:3000
```

#### 8. 部署前端

```bash
npm run build
npx wrangler pages deploy out --project-name your-project-name
```

### 一鍵部署腳本

使用提供的部署腳本：

```bash
# Windows
./deploy.bat

# Linux/Mac
./deploy.sh
```

## 📋 功能詳解

### 1. AI 訂單辨識

- **支援欄位**：
  - 客戶姓名
  - 聯絡電話
  - 配送地址
  - 配送時間
  - 商品名稱與數量（格式：`商品名 x數量`）
  - 訂貨編號
  - 發票號碼

- **智慧功能**：
  - 自動忽略條碼、價格、店內代碼
  - 模糊地址自動修正為正確行政區
  - 從「家樂福五甲店」出發的順路排序

### 2. 備貨總表 PDF

- **內容包含**：
  - 日期與訂單總數
  - 每位客戶的商品清單
  - 商品名稱與數量表格
  - 總計統計

- **格式**：

  ```
  家樂福五甲店 - 備貨總表
  日期：2025/12/10  訂單數：5
  
  1. 王小明
  ┌────────────────────┐
  │ 商品名稱  │ 數量   │
  ├────────────────────┤
  │ LG洗衣機  │  1    │
  │ 國際冰箱  │  2    │
  └────────────────────┘
  
  總計：5 位客戶，12 件商品
  ```

### 3. 圖片存檔功能

- 上傳的外送單圖片自動儲存到 Cloudflare KV
- 外送員可在「看單」功能中查看原圖
- 圖片保存 24 小時後自動過期

## 🎨 UI/UX 設計

- **iOS 風格**：圓角卡片、毛玻璃效果、流暢動畫
- **響應式設計**：完美適配手機、平板、桌面
- **深色模式**：（規劃中）
- **無障礙**：符合 WCAG 2.1 AA 標準

## 📊 資料結構

### Order 物件

```typescript
{
  customer: string;          // 客戶姓名
  phone: string;             // 聯絡電話
  address: string;           // 配送地址
  delivery_time?: string;    // 配送時間
  items: string;             // 商品（格式：商品A x2, 商品B x1）
  orderNumber?: string;      // 訂貨編號
  invoiceNumber?: string;    // 發票號碼
  note?: string;             // 備註
  imageKey?: string;         // 圖片儲存 Key
}
```

## 🔒 安全性

- ✅ API Key 使用 Cloudflare Secrets 管理
- ✅ 圖片儲存在 KV，24 小時自動過期
- ✅ 無需資料庫，降低資料外洩風險
- ✅ HTTPS 加密傳輸

## 📈 效能優化

- **前端**：
  - 靜態生成（Static Export）
  - 圖片壓縮（最大 1024px，品質 0.7）
  - 程式碼分割（Code Splitting）

- **後端**：
  - Edge Computing（Cloudflare Workers）
  - KV 快取（全球分佈）
  - 批次處理（Sequential Queue）

## 🤝 貢獻指南

歡迎提交 Issue 和 Pull Request！

1. Fork 專案
2. 創建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request



## 👨‍💻 開發者

**榮德** - 初始開發與設計


---

**Made with ❤️ by 榮德**
