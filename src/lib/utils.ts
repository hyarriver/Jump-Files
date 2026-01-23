import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function randomIdByChar(char: string, length = 8) {
  let seed = char.charCodeAt(0) * 997 + 31;

  const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
  let result = "";

  for (let i = 0; i < length; i++) {
    seed = seed * 0.618 + Math.random() * 1000;
    const index = Math.floor((seed % 1) * chars.length);
    result += chars[index];
  }

  return result;
}

export function getOS(): string {
  const uaData = (navigator as any).userAgentData;
  if (uaData && Array.isArray(uaData.platform)) {
    const p = uaData.platform.toLowerCase();
    if (p.includes("windows")) return "Windows";
    if (p.includes("mac")) return "Mac";
    if (p.includes("android")) return "Android";
    if (p.includes("ios")) return "iOS";
    if (p.includes("linux")) return "Linux";
  }

  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes("android")) return "Android";
  if (ua.includes("iphone") || ua.includes("ipad")) return "iOS";
  if (ua.includes("mac os x")) return "Mac";
  if (ua.includes("windows")) return "Windows";
  if (ua.includes("linux")) return "Linux";

  return "Unknown";
}
