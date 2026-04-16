/**
 * 图片压缩工具 —— 反馈系统使用
 *
 * 目标：将粘贴板 / 选择文件得到的原始 Blob 压缩成 ≤ 500KB 的 Base64 data URL（JPEG），
 * 客户端一次压缩完毕后直接随 JSON 请求体发到后端，避免多媒体上传链路。
 */

const DEFAULT_MAX_BYTES = 500 * 1024;
const DEFAULT_MAX_DIM = 1600;
const MIN_QUALITY = 0.4;
const QUALITY_STEP = 0.1;

/**
 * 估算 Base64 data URL 的字节数（精度足够做容量判断）
 */
export function estimateBase64Bytes(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return 0;
  const commaIdx = dataUrl.indexOf(',');
  const base64Part = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  // Base64 每 4 字符对应 3 字节
  return Math.ceil((base64Part.length * 3) / 4);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片格式不支持或已损坏'));
    img.src = dataUrl;
  });
}

/**
 * 把图片等比缩放至最长边 ≤ maxDim，再用指定 quality 输出 JPEG data URL
 */
function drawToDataUrl(img, maxDim, quality) {
  const { width: srcW, height: srcH } = img;
  const ratio = Math.min(1, maxDim / Math.max(srcW, srcH));
  const targetW = Math.max(1, Math.round(srcW * ratio));
  const targetH = Math.max(1, Math.round(srcH * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  // 透明区用白底，避免 JPEG 变黑
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * 压缩图片到 Base64 data URL（JPEG），保证 ≤ maxBytes
 *
 * @param {File|Blob} file
 * @param {{ maxBytes?: number, maxDim?: number }} opts
 * @returns {Promise<string>} data:image/jpeg;base64,...
 */
export async function compressImageToDataUrl(file, opts = {}) {
  const maxBytes = opts.maxBytes || DEFAULT_MAX_BYTES;
  const initialMaxDim = opts.maxDim || DEFAULT_MAX_DIM;

  if (!file || !(file instanceof Blob)) {
    throw new Error('未提供有效的图片文件');
  }

  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);

  // 逐步降低 quality 和 maxDim，直到满足大小
  let quality = 0.85;
  let maxDim = initialMaxDim;

  // 最多尝试 8 轮，避免死循环（理论上 3-4 轮就够）
  for (let i = 0; i < 8; i++) {
    const out = drawToDataUrl(img, maxDim, quality);
    const bytes = estimateBase64Bytes(out);
    if (bytes <= maxBytes) {
      return out;
    }
    if (quality > MIN_QUALITY + 0.001) {
      quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP);
    } else {
      // 质量已到下限，继续缩小尺寸
      maxDim = Math.max(640, Math.round(maxDim * 0.8));
    }
  }

  // 最终一次兜底（maxDim 缩到 640，quality 0.4）
  const fallback = drawToDataUrl(img, 640, MIN_QUALITY);
  if (estimateBase64Bytes(fallback) > maxBytes) {
    throw new Error('图片过大，无法压缩到 500KB 以内，请裁剪后重试');
  }
  return fallback;
}
