import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Server Actions的body大小限制
    serverActions: {
      bodySizeLimit: '100mb',
    },
    // Proxy的body大小限制（Next.js 16）- 替代已弃用的middlewareClientMaxBodySize
    // 允许上传最大100MB的文件
    proxyClientMaxBodySize: '100mb',
  },
};

export default nextConfig;
