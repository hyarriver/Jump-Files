# Jump Files - 安全文件分享平台

一個允許匿名上傳文件，通過一次性鏈接進行分享，並強制下載方登錄實現可審計的文件分發平台。

## 功能特點

- ✅ 匿名文件上傳（最大100MB）
- ✅ 一次性分享鏈接
- ✅ 強制登錄下載
- ✅ 完整的下載審計記錄
- ✅ MinIO對象存儲整合
- ✅ 現代化的響應式UI

## 技術棧

- **前端**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **後端**: Next.js API Routes
- **數據庫**: SQLite + Prisma ORM
- **認證**: NextAuth.js
- **存儲**: MinIO (兼容S3)
- **部署**: Vercel/Netlify

## 本地開發設置

### 環境要求

- Node.js 18+
- npm 或 yarn

### 安裝步驟

1. **克隆項目**
   ```bash
   git clone <repository-url>
   cd jump-files
   ```

2. **安裝依賴**
   ```bash
   npm install
   ```

3. **設置環境變數**

   創建 `.env.local` 文件：

   ```env
   # 數據庫
   DATABASE_URL="file:./dev.db"

   # NextAuth.js
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here-change-in-production"

   # MinIO 對象存儲
   MINIO_ENDPOINT="localhost:9000"
   MINIO_ACCESS_KEY="minioadmin"
   MINIO_SECRET_KEY="minioadmin"
   MINIO_BUCKET_NAME="jump-files"

   # 應用配置
   MAX_FILE_SIZE_MB=100
   ```

4. **設置 MinIO**

   下載並啟動 MinIO：

   ```bash
   # 使用 Docker
   docker run -p 9000:9000 -p 9001:9001 \
     -e MINIO_ROOT_USER=minioadmin \
     -e MINIO_ROOT_PASSWORD=minioadmin \
     minio/minio server /data --console-address ":9001"
   ```

   或使用二進制文件安裝 MinIO。

5. **初始化數據庫**

   ```bash
   # 生成 Prisma 客戶端
   npx prisma generate

   # 運行遷移
   npx prisma migrate dev --name init

   # 可選：打開 Prisma Studio 查看數據庫
   npx prisma studio
   ```

6. **啟動開發服務器**

   ```bash
   npm run dev
   ```

   應用程序將在 `http://localhost:3000` 上運行。

## 使用指南

### 1. 文件上傳

1. 訪問首頁
2. 選擇要上傳的文件（最大100MB）
3. 點擊"上傳文件"
4. 獲取分享鏈接和管理鏈接

### 2. 文件下載

1. 點擊分享鏈接
2. 如果未登錄，系統會要求登錄
3. 確認下載信息後點擊"下載文件"
4. 文件將自動開始下載

### 3. 下載審計

1. 使用管理鏈接訪問審計頁面
2. 查看文件的下載記錄
3. 包含下載用戶和時間信息

## 項目結構

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   ├── auth/              # 認證頁面
│   ├── audit/             # 審計頁面
│   ├── download/          # 下載頁面
│   └── page.tsx           # 首頁
├── components/            # React 組件
├── config/               # 配置檔案
├── lib/                  # 工具函數
│   ├── auth.ts           # NextAuth 配置
│   ├── prisma.ts         # 數據庫客戶端
│   ├── storage.ts        # MinIO 存儲
│   └── token.ts          # Token 工具
└── middleware.ts         # Next.js 中間件
```

## API 接口

### 文件上傳
```
POST /api/upload
Content-Type: multipart/form-data

Response:
{
  "shareUrl": "http://localhost:3000/download/...",
  "adminUrl": "http://localhost:3000/audit/...",
  "token": "...",
  "adminToken": "...",
  "fileId": "..."
}
```

### Token 驗證
```
GET /api/download/validate/{token}

Response:
{
  "token": { ... },
  "file": { ... }
}
```

### 文件下載
```
POST /api/download/{token}

Request Body:
{
  "userId": "..."
}

Response: 文件下載 URL
```

### 審計數據
```
GET /api/audit/{adminToken}

Response:
{
  "file": { ... },
  "downloads": [ ... ]
}
```

## 數據庫模型

### User（用戶）
- id: 唯一標識符
- email: 郵箱地址
- name: 姓名
- password: 加密密碼
- createdAt/updatedAt: 時間戳

### File（文件）
- id: 唯一標識符
- objectKey: MinIO 對象鍵
- size: 文件大小
- adminToken: 管理token
- createdAt: 上傳時間

### DownloadToken（下載token）
- id: 唯一標識符
- token: 一次性token
- status: "unused" | "used"
- fileId: 關聯文件
- usedBy: 下載用戶ID
- usedAt: 下載時間

## 安全考慮

- 文件不落地服務器，直接存儲到 MinIO
- 一次性token確保鏈接只能使用一次
- 強制登錄確保下載行為可審計
- 高熵token防止暴力破解
- 數據庫事務確保數據一致性

## 部署

### 生產環境配置

1. **設置生產環境變數**
   ```env
   DATABASE_URL="postgresql://..."
   NEXTAUTH_URL="https://yourdomain.com"
   NEXTAUTH_SECRET="強密碼"
   ```

2. **設置 MinIO 或 S3**
   ```env
   MINIO_ENDPOINT="your-s3-endpoint"
   MINIO_ACCESS_KEY="your-access-key"
   MINIO_SECRET_KEY="your-secret-key"
   MINIO_BUCKET_NAME="your-bucket"
   ```

3. **構建和部署**
   ```bash
   npm run build
   npm start
   ```

## 開發計劃

- [x] 基礎架構設置
- [x] 用戶認證系統
- [x] 文件上傳功能
- [x] 一次性鏈接分享
- [x] 強制登錄下載
- [x] 下載審計功能
- [x] MinIO 存儲整合
- [ ] 文件預覽功能
- [ ] 批量上傳
- [ ] 管理員面板
- [ ] API 速率限制
- [ ] 文件過期清理

## 貢獻

歡迎提交 Issue 和 Pull Request！

## 許可證

MIT License