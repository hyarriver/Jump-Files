# Cloudflare Pages 部署指南

本文檔說明如何將 Jump Files 項目部署到 Cloudflare Pages。

## 前置要求

1. **Cloudflare 帳號**：創建一個 [Cloudflare 帳號](https://dash.cloudflare.com/sign-up)
2. **Wrangler CLI**：Cloudflare 的命令行工具（已包含在 package.json 中）
3. **Git 倉庫**：將代碼推送到 GitHub、GitLab 或 Bitbucket

## 重要注意事項

⚠️ **Cloudflare Pages 的限制**：

1. **數據庫**：SQLite 無法在 Cloudflare Pages 上運行。需要改用：
   - Cloudflare D1（推薦，與 SQLite 語法兼容）
   - 或外部數據庫服務（如 PlanetScale、Supabase、Neon）

2. **對象存儲**：MinIO 需要外部服務器。建議改用：
   - Cloudflare R2（推薦，與 S3 API 兼容）
   - 或其他兼容 S3 的存儲服務

3. **環境變數**：需要在 Cloudflare Pages 設置中配置所有必要的環境變數

## 部署步驟

### 方式一：通過 Cloudflare Dashboard 部署（推薦）

1. **準備項目**
   ```bash
   # 確保依賴已安裝
   npm install
   ```

2. **登錄 Cloudflare**
   ```bash
   npx wrangler login
   ```

3. **在 Cloudflare Dashboard 中部署**
   - 訪問 [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - 進入 **Pages** → **Create a project**
   - 選擇 **Connect to Git**
   - 選擇你的 Git 倉庫
   - 配置構建設置：
     - **Framework preset**: Next.js（或 None）
     - **Build command**: `npm run pages:build`
     - **Build output directory**: `.vercel/output/static`
     - **Root directory**: `/`（根目錄）
   - 點擊 **Save and Deploy**

4. **配置環境變數**
   - 在項目設置中，進入 **Settings** → **Environment variables**
   - 添加以下環境變數：
     ```
     DATABASE_URL=<your-database-url>
     NEXTAUTH_URL=https://your-project.pages.dev
     NEXTAUTH_SECRET=<your-secret-key>
     MINIO_ENDPOINT=<your-storage-endpoint>
     MINIO_ACCESS_KEY=<your-access-key>
     MINIO_SECRET_KEY=<your-secret-key>
     MINIO_BUCKET_NAME=<your-bucket-name>
     MAX_FILE_SIZE_MB=100
     ```
   - 點擊 **Save**

5. **重新部署**
   - 環境變數配置後，在 **Deployments** 頁面中點擊 **Retry deployment**

### 方式二：使用 Wrangler CLI 部署

1. **構建項目**
   ```bash
   npm run pages:build
   ```

2. **部署到 Cloudflare Pages**
   ```bash
   npm run pages:deploy
   ```

   或者使用 Wrangler 命令：
   ```bash
   npx wrangler pages deploy .vercel/output/static --project-name=jump-files
   ```

3. **配置環境變數**
   ```bash
   npx wrangler pages secret put NEXTAUTH_SECRET
   npx wrangler pages secret put DATABASE_URL
   # ... 其他環境變數
   ```

### 本地測試 Cloudflare Pages 構建

在部署前，可以在本地測試 Cloudflare Pages 構建：

```bash
# 構建項目
npm run pages:build

# 在本地運行
npm run pages:dev
```

## 數據庫遷移（從 SQLite 到 Cloudflare D1）

如果使用 Cloudflare D1：

1. **創建 D1 數據庫**
   ```bash
   npx wrangler d1 create jump-files-db
   ```

2. **更新 wrangler.toml**
   - 取消註釋 `[[d1_databases]]` 部分
   - 填入從上一步獲得的 `database_id`

3. **更新 Prisma Schema**
   ```prisma
   datasource db {
     provider = "sqlite"  # D1 使用 SQLite 語法
     url      = env("DATABASE_URL")
   }
   ```

4. **運行遷移**
   ```bash
   npx wrangler d1 migrations apply jump-files-db --local  # 本地測試
   npx wrangler d1 migrations apply jump-files-db           # 生產環境
   ```

## 對象存儲遷移（從 MinIO 到 Cloudflare R2）

如果使用 Cloudflare R2：

1. **創建 R2 存儲桶**
   ```bash
   npx wrangler r2 bucket create jump-files
   ```

2. **更新 wrangler.toml**
   - 取消註釋 `[[r2_buckets]]` 部分
   - 確保 `bucket_name` 與創建的存儲桶名稱一致

3. **修改存儲代碼**
   - 需要將 `src/lib/storage.ts` 中的 MinIO 客戶端改為使用 R2 API
   - R2 與 S3 API 兼容，可以使用 AWS SDK 或兼容的庫

## 環境變數清單

部署時需要配置以下環境變數：

| 變數名 | 說明 | 示例 |
|--------|------|------|
| `DATABASE_URL` | 數據庫連接字符串 | `file:./dev.db` (本地) 或 D1 URL |
| `NEXTAUTH_URL` | NextAuth 的回調 URL | `https://your-project.pages.dev` |
| `NEXTAUTH_SECRET` | NextAuth 密鑰 | 隨機生成的字符串（至少 32 字符） |
| `MINIO_ENDPOINT` | 對象存儲端點 | `localhost:9000` 或 R2 端點 |
| `MINIO_ACCESS_KEY` | 對象存儲訪問密鑰 | |
| `MINIO_SECRET_KEY` | 對象存儲秘密密鑰 | |
| `MINIO_BUCKET_NAME` | 存儲桶名稱 | `jump-files` |
| `MAX_FILE_SIZE_MB` | 最大文件大小（MB） | `100` |

## 故障排除

### 構建失敗

- 檢查 Node.js 版本（建議 18+）
- 確保所有依賴已正確安裝
- 查看構建日誌中的錯誤信息

### 運行時錯誤

- 確認所有環境變數已正確配置
- 檢查數據庫連接是否正常
- 驗證對象存儲配置是否正確

### 性能優化

- 使用 Cloudflare 的 CDN 緩存靜態資源
- 啟用 Cloudflare 的自動優化功能
- 考慮使用 Cloudflare Images 處理圖片上傳

## 相關文檔

- [Cloudflare Pages 文檔](https://developers.cloudflare.com/pages/)
- [@cloudflare/next-on-pages 文檔](https://github.com/cloudflare/next-on-pages)
- [Cloudflare D1 文檔](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 文檔](https://developers.cloudflare.com/r2/)

## 支持

如果遇到問題，請查看：
- [Cloudflare Community](https://community.cloudflare.com/)
- [Next.js on Cloudflare Pages 討論區](https://github.com/cloudflare/next-on-pages/discussions)
