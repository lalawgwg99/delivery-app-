---
description: 部署代碼變更到 Git 與雲端
---

# 自動 Git 提交與部署流程

// turbo-all

當完成程式碼修改後，依照以下步驟提交並部署：

## 1. 提交本地變更到 Git

```bash
git add -A
git commit -m "[描述性提交訊息]"
```

## 2. 推送到遠端 (GitHub)

```bash
git push
```

## 3. 部署後端 (Cloudflare Workers)

```bash
cd backend
npx wrangler deploy
```

## 4. 構建前端

```bash
cd frontend
npm run build
```

## 5. 部署前端 (Cloudflare Pages)

```bash
npx wrangler pages deploy out --project-name delivery-app
```

## 提交訊息規範

使用以下前綴來描述變更類型：

- `feat:` 新功能
- `fix:` 修復錯誤
- `style:` 樣式調整 (不影響功能)
- `refactor:` 重構代碼
- `docs:` 文檔更新
