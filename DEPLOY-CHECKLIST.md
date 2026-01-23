# Cloudflare Pages 部署檢查清單

## 項目配置檢查

### ✅ 已完成的配置

- [x] `package.json` - 已添加 `@cloudflare/next-on-pages` 和 `wrangler`
- [x] `wrangler.toml` - 已配置 R2 綁定
- [x] `.github/workflows/deploy-cloudflare.yml` - 已創建自動部署工作流
- [x] `src/lib/storage-r2.ts` - 已實現 R2 存儲支持
- [x] `src/lib/storage-unified.ts` - 已創建統一存儲接口
- [x] `src/config/env.ts` - 已添加 `STORAGE_TYPE` 配置
- [x] API 路由已更新為使用統一存儲接口
- [x] `.gitignore` - 已添加 Cloudflare 相關忽略項
- [x] 無 lint 錯誤

### ⚠️ 需要檢查的項目

1. **R2 綁定訪問方式**
   - 在 Cloudflare Pages 環境中，R2 綁定通過 `@cloudflare/next-on-pages` 提供
   - 需要確認訪問方式是否正確

2. **數據庫配置**
   - ⚠️ SQLite 無法在 Cloudflare Pages 上運行
   - 需要使用 Cloudflare D1 或外部數據庫

3. **環境變數配置**
   - 需要在 Cloudflare Pages 設置中配置
   - GitHub Secrets 需要在 GitHub 倉庫中配置

## 部署前準備

### 1. Cloudflare 帳號設置

- [ ] 創建 Cloudflare 帳號
- [ ] 獲取 Account ID
- [ ] 創建 API Token（需要 Cloudflare Pages 和 Workers 權限）

### 2. R2 存儲桶設置

- [ ] 在 Cloudflare Dashboard 創建 R2 存儲桶
  - 名稱：`jump-files`
  - 位置：選擇離用戶最近的區域
- [ ] 在 Cloudflare Pages 項目中配置 R2 綁定
  - 變數名：`R2_STORAGE`
  - 存儲桶：選擇創建的 `jump-files` 桶

### 3. GitHub 設置

- [ ] 推送代碼到 GitHub 倉庫
- [ ] 設置 GitHub Secrets：
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`

### 4. Cloudflare Pages 項目設置

- [ ] 創建 Cloudflare Pages 項目或連接 Git 倉庫
- [ ] 配置構建設置：
  - Framework preset: Next.js 或 None
  - Build command: `npm run pages:build`
  - Build output directory: `.vercel/output/static`
  - Root directory: `/`
- [ ] 配置環境變數：
  - `STORAGE_TYPE=r2`
  - `DATABASE_URL=<你的數據庫URL>`
  - `NEXTAUTH_URL=https://your-project.pages.dev`
  - `NEXTAUTH_SECRET=<強密碼，至少32字符>`
  - `R2_BUCKET_NAME=jump-files`
  - `MAX_FILE_SIZE_MB=100`

### 5. 數據庫設置（必需）

選擇其中一種方案：

**方案 A：Cloudflare D1（推薦）**
- [ ] 創建 D1 數據庫：
  ```bash
  npx wrangler d1 create jump-files-db
  ```
- [ ] 在 Cloudflare Pages 設置中配置 D1 綁定
- [ ] 運行遷移：
  ```bash
  npx wrangler d1 migrations apply jump-files-db
  ```

**方案 B：外部數據庫服務**
- [ ] 選擇數據庫服務（PlanetScale、Supabase、Neon 等）
- [ ] 獲取連接字符串
- [ ] 更新 Prisma schema（如果需要）
- [ ] 配置 `DATABASE_URL` 環境變數

## 本地測試

在部署前，建議先在本地測試：

```bash
# 1. 安裝依賴
npm install

# 2. 生成 Prisma Client
npx prisma generate

# 3. 構建項目（測試 Cloudflare 構建）
npm run pages:build

# 4. 如果構建成功，繼續下一步
```

## 部署步驟

### 方式一：自動部署（推薦）

1. **推送代碼到 GitHub**
   ```bash
   git add .
   git commit -m "準備部署到 Cloudflare Pages"
   git push origin main
   ```

2. **觸發 GitHub Actions**
   - 推送到 `main` 分支會自動觸發部署
   - 在 GitHub 倉庫的 Actions 標籤查看部署狀態

3. **檢查部署狀態**
   - 等待 GitHub Actions 完成
   - 在 Cloudflare Dashboard 查看部署日誌

### 方式二：手動部署

1. **構建項目**
   ```bash
   npm run pages:build
   ```

2. **部署到 Cloudflare Pages**
   ```bash
   npx wrangler pages deploy .vercel/output/static --project-name=jump-files
   ```

## 部署後驗證

- [ ] 訪問 Cloudflare Pages URL（例如：`https://jump-files.pages.dev`）
- [ ] 檢查首頁是否可以正常訪問
- [ ] 測試文件上傳功能
- [ ] 測試文件下載功能
- [ ] 測試用戶登錄功能
- [ ] 檢查控制台是否有錯誤

## 常見問題排查

### 構建失敗

- 檢查 Node.js 版本（需要 18+）
- 查看構建日誌中的具體錯誤
- 確認所有依賴已正確安裝

### R2 存儲不可用

- 確認在 Cloudflare Pages 設置中配置了 R2 綁定
- 檢查變數名是否為 `R2_STORAGE`
- 確認 R2 存儲桶已創建且名稱正確

### 數據庫連接失敗

- 確認 `DATABASE_URL` 環境變數已正確設置
- 如果使用 D1，確認已配置 D1 綁定
- 如果使用外部數據庫，確認連接字符串格式正確

### 環境變數未生效

- 確認在 Cloudflare Pages 設置中正確配置
- 檢查變數名稱（區分大小寫）
- 重新部署以使環境變數生效

## 後續優化

- [ ] 配置自定義域名
- [ ] 設置 HTTPS（自動配置）
- [ ] 配置 CDN 緩存規則
- [ ] 設置環境變數的生產和預覽環境分離
- [ ] 配置錯誤監控（如 Sentry）
