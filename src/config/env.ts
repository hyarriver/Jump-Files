export const env = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL || "file:./dev.db",

  // NextAuth.js
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "your-secret-key-here-change-in-production",

  // Storage Type: "r2" | "minio" | "local"
  STORAGE_TYPE: (process.env.STORAGE_TYPE || "local") as "r2" | "minio" | "local",

  // MinIO Object Storage (fallback for non-Cloudflare environments)
  MINIO_ENDPOINT: process.env.MINIO_ENDPOINT || "localhost:9000",
  MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY || "minioadmin",
  MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY || "minioadmin",
  MINIO_BUCKET_NAME: process.env.MINIO_BUCKET_NAME || "jump-files",

  // Cloudflare R2 (used in Cloudflare Pages/Workers)
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || "jump-files",

  // App Config
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || "100"),
} as const;