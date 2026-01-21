/**
 * 文件类型验证工具
 * 支持扩展名、MIME类型和文件内容签名验证
 */

// 允许的文件类型配置
export const ALLOWED_FILE_TYPES = {
  // 图片
  images: {
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/x-icon'],
    magicBytes: [
      { bytes: [0xFF, 0xD8, 0xFF], mime: 'image/jpeg' }, // JPEG
      { bytes: [0x89, 0x50, 0x4E, 0x47], mime: 'image/png' }, // PNG
      { bytes: [0x47, 0x49, 0x46, 0x38], mime: 'image/gif' }, // GIF
      { bytes: [0x52, 0x49, 0x46, 0x46], mime: 'image/webp' }, // WebP (RIFF)
    ],
  },
  // 文档
  documents: {
    extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md', '.rtf'],
    mimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'text/plain', 'text/markdown', 'application/rtf'],
    magicBytes: [
      { bytes: [0x25, 0x50, 0x44, 0x46], mime: 'application/pdf' }, // PDF
      { bytes: [0xD0, 0xCF, 0x11, 0xE0], mime: 'application/msword' }, // DOC/XLS/PPT (OLE2)
      { bytes: [0x50, 0x4B, 0x03, 0x04], mime: 'application/vnd.openxmlformats-officedocument' }, // DOCX/XLSX/PPTX (ZIP)
    ],
  },
  // 压缩文件
  archives: {
    extensions: ['.zip', '.rar', '.7z', '.tar', '.gz'],
    mimeTypes: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed', 
                'application/x-tar', 'application/gzip'],
    magicBytes: [
      { bytes: [0x50, 0x4B, 0x03, 0x04], mime: 'application/zip' }, // ZIP
      { bytes: [0x52, 0x61, 0x72, 0x21], mime: 'application/x-rar-compressed' }, // RAR
      { bytes: [0x37, 0x7A, 0xBC, 0xAF], mime: 'application/x-7z-compressed' }, // 7Z
    ],
  },
  // 代码文件
  code: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.json', '.css', '.html', '.xml', '.yaml', '.yml', '.py', '.java', '.cpp', '.c', '.go', '.rs'],
    mimeTypes: ['text/javascript', 'application/typescript', 'application/json', 'text/css', 'text/html', 'application/xml', 'text/yaml'],
    magicBytes: [],
  },
  // CAD文件
  cad: {
    extensions: ['.dwg', '.dxf', '.step', '.stp', '.iges', '.igs'],
    mimeTypes: ['application/acad', 'image/vnd.dwg', 'application/step'],
    magicBytes: [],
  },
  // 视频
  videos: {
    extensions: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'],
    mimeTypes: ['video/mp4', 'video/x-msvideo', 'video/quicktime', 'video/x-ms-wmv', 'video/x-flv', 'video/webm'],
    magicBytes: [
      { bytes: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], mime: 'video/mp4' }, // MP4
      { bytes: [0x1A, 0x45, 0xDF, 0xA3], mime: 'video/webm' }, // WebM (Matroska)
    ],
  },
  // 音频
  audio: {
    extensions: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'],
    mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aac', 'audio/ogg', 'audio/mp4'],
    magicBytes: [
      { bytes: [0xFF, 0xFB], mime: 'audio/mpeg' }, // MP3
      { bytes: [0x52, 0x49, 0x46, 0x46], mime: 'audio/wav' }, // WAV (RIFF)
    ],
  },
} as const;

// 合并所有允许的类型
const ALL_EXTENSIONS = Object.values(ALLOWED_FILE_TYPES).flatMap(type => type.extensions);
const ALL_MIME_TYPES = Object.values(ALLOWED_FILE_TYPES).flatMap(type => type.mimeTypes);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ALL_MAGIC_BYTES: Array<{ bytes: number[]; mime: string }> = Object.values(ALLOWED_FILE_TYPES).flatMap((type: any) => type.magicBytes || []);

// 危险文件扩展名（禁止上传）
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar', '.app', '.deb', '.rpm',
  '.sh', '.ps1', '.dll', '.sys', '.drv', '.msi', '.dmg', '.pkg',
];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  detectedMime?: string;
}

/**
 * 验证文件类型
 */
export async function validateFileType(file: File): Promise<FileValidationResult> {
  const fileName = file.name.toLowerCase();
  const extension = fileName.substring(fileName.lastIndexOf('.'));
  
  // 检查危险扩展名
  if (DANGEROUS_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `出于安全考虑，不允许上传 ${extension} 类型的文件`,
    };
  }

  // 检查扩展名白名单
  if (!ALL_EXTENSIONS.includes(extension as any)) {
    return {
      valid: false,
      error: `不支持的文件类型：${extension}。支持的类型：图片、文档、压缩文件、代码文件、CAD文件、视频、音频等`,
    };
  }

  // 检查MIME类型
  if (file.type && !ALL_MIME_TYPES.includes(file.type as any)) {
    // MIME类型不匹配，但扩展名在白名单中，继续检查文件内容
    console.warn(`文件 ${file.name} 的MIME类型 ${file.type} 不在白名单中，将检查文件内容`);
  }

  // 验证文件内容签名（magic bytes）
  try {
    const arrayBuffer = await file.slice(0, 16).arrayBuffer(); // 读取前16字节
    const bytes = new Uint8Array(arrayBuffer);
    
    // 检查magic bytes
    for (const magic of ALL_MAGIC_BYTES) {
      if (bytes.length >= magic.bytes.length) {
        const matches = magic.bytes.every((byte, index) => bytes[index] === byte);
        if (matches) {
          // 如果检测到的MIME类型与文件声明的MIME类型不一致，发出警告
          if (file.type && file.type !== magic.mime) {
            console.warn(`文件 ${file.name} 声明的MIME类型为 ${file.type}，但实际内容检测为 ${magic.mime}`);
          }
          return {
            valid: true,
            detectedMime: magic.mime,
          };
        }
      }
    }
    
    // 如果没有匹配的magic bytes，但扩展名在白名单中，允许通过
    // （某些文件类型可能没有标准的magic bytes，如文本文件）
    return {
      valid: true,
    };
  } catch (error) {
    console.error('文件内容验证失败:', error);
    // 如果验证失败，但扩展名在白名单中，仍然允许通过
    return {
      valid: true,
    };
  }
}

/**
 * 获取文件类型分类
 */
export function getFileCategory(extension: string): string | null {
  for (const [category, config] of Object.entries(ALLOWED_FILE_TYPES)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((config.extensions as any).includes(extension.toLowerCase())) {
      return category;
    }
  }
  return null;
}

/**
 * 检查文件是否可以预览
 */
export function isPreviewable(extension: string): boolean {
  const category = getFileCategory(extension);
  return category === 'images' || category === 'documents' || category === 'code';
}
