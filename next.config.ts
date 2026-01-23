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
  // Turbopack 配置（Next.js 16 默认使用 Turbopack）
  // 添加空配置以允许同时使用 webpack 配置
  turbopack: {},
  // 保留 webpack 配置作为备用（如果明确使用 --webpack 标志）
  webpack: (config, { isServer }) => {
    // 允许在客户端使用 CommonJS 模块
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
