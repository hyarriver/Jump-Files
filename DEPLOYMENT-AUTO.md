# Cloudflare Pages 自動部署指南

本文檔說明如何配置自動部署到 Cloudflare Pages，並使用 Cloudflare R2 作為文件存儲服務。

## 已完成的配置

✅ GitHub Actions 工作流（`.github/workflows/deploy-cloudflare.yml`）
✅ Cloudflare R2 存儲支持（`src/lib/storage-r2.ts`）
✅ 統一的存儲接口（`src/lib/storage-unified.ts`）
✅ 更新的 API 路由（上傳和下載）
✅ wrangler.toml 配置

## 部署前準備

### 1. Cloudflare 帳號設置

1. **登錄 Cloudflare Dashboard**
   - 訪問 https://dash.cloudflare.com/
   - 創建或登錄帳號

2. **獲取 Account ID**
   - 在 Dashboard 右側邊欄找到 **Account ID**
   - 複製保存備用

3. **創建 API Token**
   - 進入 **My Profile** → **API Tokens**
   - 點擊 **Create Token**
   - 使用 **Edit Cloudflare Workers** 模板
   - 或自定義權限：
     - **Account** - **Cloudflare Pages** - **Edit**
     - **Account** - **Cloudflare Workers** - **Edit**
     - **Zone** - **Zone Settings** - **Read**（如果需要）
   - 創建並複製 Token

### 2. 創建 Cloudflare R2 存儲桶

1. **在 Cloudflare Dashboard 中創建 R2**
   - 進入 **R2** → **Create bucket**
   - 命名為 `jump-files`（或自定義名稱）
   - 選擇位置（建議選擇離用戶最近的區域）
   - 點擊 **Create bucket**

2. **配置 R2 綁定（在 Cloudflare Pages 項目中）**
   - 進入 **Workers & Pages** → 創建或選擇項目
   - 進入 **Settings** → **Variables and Secrets**
   - 在 **R2 Bucket Bindings** 中添加：
     - **Variable name**: `R2_STORAGE`
     - **R2 bucket**: 選擇剛創建的 `jump-files` 桶
   - 保存設置

### 3. GitHub 倉庫設置

1. **推送代碼到 GitHub**
   ```bash
   git add .
   git commit -m "配置 Cloudflare Pages 部署"
   git push origin main
   ```

2. **設置 GitHub Secrets**
   - 進入 GitHub 倉庫 → **Settings** → **Secrets and variables** → **Actions**
   - 添加以下 Secrets：
     - `CLOUDFLARE_API_TOKEN`: 步驟 1 中創建的 API Token
     - `CLOUDFLARE_ACCOUNT_ID`: 步驟 1 中獲取的 Account ID

## 自動部署方式

### 方式一：通過 GitHub Actions（推薦）

1. **確保代碼已推送到 GitHub**
   ```bash
   git push origin main
   ```

2. **觸發自動部署**
   - 每次推送到 `main` 分支時，GitHub Actions 會自動：
     - 安裝依賴
     - 生成 Prisma Client
     - 構建項目
     - 部署到 Cloudflare Pages

3. **查看部署狀態**
   - 在 GitHub 倉庫中，點擊 **Actions** 標籤
   - 查看部署工作流的執行狀態

### 方式二：通過 Cloudflare Dashboard

1. **連接 Git 倉庫**
   - 在 Cloudflare Dashboard 中，進入 **Workers & Pages**
   - 點擊 **Create application** → **Pages** → **Connect to Git**
   - 選擇你的 GitHub 倉庫
   - 授權 Cloudflare 訪問倉庫

2. **配置構建設置**
   - **Framework preset**: 選擇 **Next.js** 或 **None**
   - **Build command**: `npm run pages:build`
   - **Build output directory**: `.vercel/output/static`
   - **Root directory**: `/`（根目錄）

3. **配置環境變數**
   - 在項目設置中，進入 **Settings** → **Environment variables**
   - 添加以下變數：

| 變數名 | 值 | 說明 |
|--------|-----|------|
| `STORAGE_TYPE` | `r2` | 使用 R2 存儲 |
| `DATABASE_URL` | `your-database-url` | 數據庫連接字符串 |
| `NEXTAUTH_URL` | `https://your-project.pages.dev` | NextAuth 回調 URL |
| `NEXTAUTH_SECRET` | `your-secret-key` | NextAuth 密鑰（至少 32 字符） |
| `R2_BUCKET_NAME` | `jump-files` | R2 存儲桶名稱 |
| `MAX_FILE_SIZE_MB` | `100` | 最大文件大小（MB） |

4. **保存並部署**
   - 點擊 **Save and Deploy**
   - 等待構建完成

## 環境變數配置詳情

### 必需變數

- `STORAGE_TYPE`: 設置為 `r2` 以使用 Cloudflare R2
- `DATABASE_URL`: 數據庫連接字符串（如果使用 Cloudflare D1，格式類似 `file:./dev.db`）
- `NEXTAUTH_URL`: 你的應用程序 URL（例如：`https://jump-files.pages.dev`）
- `NEXTAUTH_SECRET`: 用於加密 NextAuth 會話的密鑰

### R2 綁定配置

在 Cloudflare Pages 項目設置中，通過 **R2 Bucket Bindings** 配置 R2 綁定：

1. 進入 **Settings** → **Variables and Secrets**
2. 在 **R2 Bucket Bindings** 部分：
   - **Variable name**: `R2_STORAGE`
   - **R2 bucket**: 選擇你的 R2 存儲桶

### 數據庫配置

⚠️ **注意**：SQLite 無法在 Cloudflare Pages 上運行。建議使用：

1. **Cloudflare D1**（推薦，與 SQLite 語法兼容）
   - 創建 D1 數據庫：
     ```bash
     npx wrangler d1 create jump-files-db
     ```
   - 在 Cloudflare Pages 設置中配置 D1 綁定
   - 運行遷移：
     ```bash
     npx wrangler d1 migrations apply jump-files-db
     ```

2. **外部數據庫服務**
   - PlanetScale
   - Supabase
   - Neon
   - 其他兼容 PostgreSQL/MySQL 的服務

## 本地測試

在部署前，可以在本地測試 Cloudflare Pages 構建：

```bash
# 構建項目
npm run pages:build

# 在本地運行（需要配置 .dev.vars）
npm run pages:dev
```

創建 `.dev.vars` 文件（從 `.dev.vars.example` 複製）：

```bash
cp .dev.vars.example .dev.vars
# 編輯 .dev.vars，填入實際值
```

## 驗證部署

部署完成後，訪問你的 Cloudflare Pages URL（例如：`https://jump-files.pages.dev`）進行驗證：

1. ✅ 首頁可以正常訪問
2. ✅ 文件上傳功能正常
3. ✅ 文件下載功能正常
4. ✅ 用戶認證功能正常

## 故障排除

### 構建失敗

- 檢查 Node.js 版本（需要 18+）
- 查看 GitHub Actions 日誌中的錯誤信息
- 確認所有依賴已正確安裝

### R2 存儲不可用

- 確認在 Cloudflare Pages 設置中配置了 R2 綁定
- 檢查 `R2_STORAGE` 變數名稱是否正確
- 確認 R2 存儲桶已創建且名稱正確

### 環境變數未生效

- 確認在 Cloudflare Pages 設置中正確配置了環境變數
- 檢查變數名稱是否正確（區分大小寫）
- 重新部署以使環境變數生效

### 數據庫連接失敗

- 確認 `DATABASE_URL` 環境變數已設置
- 如果使用外部數據庫，確認連接字符串格式正確
- 如果使用 D1，確認已配置 D1 綁定

## 相關文檔

- [Cloudflare Pages 文檔](https://developers.cloudflare.com/pages/)
- [@cloudflare/next-on-pages 文檔](https://github.com/cloudflare/next-on-pages)
- [Cloudflare R2 文檔](https://developers.cloudflare.com/r2/)
- [Cloudflare D1 文檔](https://developers.cloudflare.com/d1/)

## 支持

如果遇到問題：

1. 查看 GitHub Actions 日誌
2. 查看 Cloudflare Dashboard 中的部署日誌
3. 訪問 [Cloudflare Community](https://community.cloudflare.com/)
4. 查看 [Next.js on Cloudflare Pages 討論區](https://github.com/cloudflare/next-on-pages/discussions)
