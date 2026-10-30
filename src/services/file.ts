import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { BizException } from '../common/biz-exception.js';
import { ResultCodeEnum } from '../constants/result-code.js';
import type { FileCheckResult, FileChunkResult } from '../types/file.js';

/** 上传根目录（最终文件 uploads/，分片临时目录 uploads/tmp/{fileHash}/） */
const UPLOAD_DIR = path.resolve(import.meta.dirname, '../../uploads');
const TMP_DIR = path.join(UPLOAD_DIR, 'tmp');

/** 分片临时目录总大小上限（1GB），超出时从最旧的开始删 */
const TMP_MAX_BYTES = 1024 * 1024 * 1024;

/** MD5 十六进制（32 位），同时防止路径穿越 */
const HASH_RE = /^[a-f0-9]{32}$/;

/** 合法扩展名（小写字母数字，最长 10） */
const EXT_RE = /^[a-z0-9]{1,10}$/;

/** 校验并返回文件 hash */
export function assertFileHash(value: unknown, field = 'fileHash'): string {
  if (typeof value !== 'string' || !HASH_RE.test(value)) {
    throw new BizException(ResultCodeEnum.BAD_REQUEST, `${field} 参数格式错误`);
  }
  return value;
}

/** 从文件名提取合法扩展名（无扩展名返回空串） */
function resolveExt(fileName: string): string {
  const ext = path.extname(fileName).slice(1).toLowerCase();
  return EXT_RE.test(ext) ? ext : '';
}

/** 合并后文件的磁盘路径 */
function finalPath(fileHash: string, ext: string): string {
  return path.join(UPLOAD_DIR, ext ? `${fileHash}.${ext}` : fileHash);
}

/**
 * 校验请求状态：文件已存在返回 url，否则返回缺失的分片序号
 * @param fileHash 文件 MD5
 * @param fileName 原始文件名（取扩展名用）
 * @param totalChunks 分片总数
 */
export function checkUpload(
  fileHash: string,
  fileName: string,
  totalChunks: number,
): FileCheckResult {
  const ext = resolveExt(fileName);
  if (fs.existsSync(finalPath(fileHash, ext))) {
    return { url: `/uploads/${path.basename(finalPath(fileHash, ext))}` };
  }
  const tmpDir = path.join(TMP_DIR, fileHash);
  const needed: number[] = [];
  for (let i = 0; i < totalChunks; i++) {
    if (!fs.existsSync(path.join(tmpDir, String(i)))) needed.push(i);
  }
  return { needed };
}

/**
 * 保存一个分片；全部到齐时合并并返回文件 URL
 * @param fileHash 文件 MD5
 * @param ext 扩展名
 * @param index 分片序号
 * @param chunkHash 分片 MD5（服务端重算校验完整性）
 * @param totalChunks 分片总数
 * @param data 分片内容
 */
export function saveChunk(
  fileHash: string,
  fileName: string,
  index: number,
  chunkHash: string,
  totalChunks: number,
  data: Buffer,
): FileChunkResult {
  if (index < 0 || index >= totalChunks) {
    throw new BizException(ResultCodeEnum.BAD_REQUEST, 'index 参数格式错误');
  }
  const ext = resolveExt(fileName);
  const final = finalPath(fileHash, ext);
  // 已合并过的文件直接忽略迟到分片，不再重复写盘
  if (fs.existsSync(final)) {
    return {};
  }
  // 服务器不能直接信任客户端传的分片哈希，需要自身重新校验一次，防止分片数据传输时损坏或恶意构造hash
  if (createHash('md5').update(data).digest('hex') !== chunkHash) {
    throw new BizException(ResultCodeEnum.BAD_REQUEST, '分片校验失败');
  }
  const tmpDir = path.join(TMP_DIR, fileHash);
  // 自动创建父目录，目录已存在时不报错
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(path.join(tmpDir, String(index)), data);
  // 容量超出上限时从最旧的开始删，中断残留不会一直堆积
  cleanTmpDirs(TMP_MAX_BYTES);

  if (countChunks(tmpDir) < totalChunks) {
    return {};
  }
  // 按顺序合并分片数据，构造完整文件
  const mergedData = Buffer.concat(
    Array.from({ length: totalChunks }, (_, i) => fs.readFileSync(path.join(tmpDir, String(i)))),
  );
  fs.writeFileSync(final, mergedData);
  // 删除目录以及内部的分片数据文件，目录不存在时不报错
  fs.rmSync(tmpDir, { recursive: true, force: true });
  return { url: `/uploads/${path.basename(final)}` };
}

/** 统计临时目录中已收到的分片数 */
function countChunks(tmpDir: string): number {
  return fs.readdirSync(tmpDir).length;
}

/** 递归统计目录大小（字节） */
function dirSize(dir: string): number {
  let size = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    size += entry.isDirectory() ? dirSize(p) : fs.statSync(p).size;
  }
  return size;
}

/**
 * 清理分片临时目录：总大小超过 maxBytes 时按最后修改时间从最旧的开始删除，直到达标
 * @param maxBytes tmp 目录总大小上限（字节）
 * @returns 删除的目录数
 */
export function cleanTmpDirs(maxBytes: number): number {
  if (!fs.existsSync(TMP_DIR)) return 0;

  // 收集各分片目录的大小与最后修改时间
  const dirs: { dir: string; mtimeMs: number; size: number }[] = [];
  for (const name of fs.readdirSync(TMP_DIR)) {
    const dir = path.join(TMP_DIR, name);
    try {
      dirs.push({ dir, mtimeMs: fs.statSync(dir).mtimeMs, size: dirSize(dir) });
    } catch {
      // 目录被并发删除等异常跳过
    }
  }

  // 容量超出上限时，从最旧的目录开始删到达标
  dirs.sort((a, b) => a.mtimeMs - b.mtimeMs);
  let totalSize = dirs.reduce((sum, item) => sum + item.size, 0);
  let removed = 0;
  for (const item of dirs) {
    if (totalSize <= maxBytes) break;
    try {
      fs.rmSync(item.dir, { recursive: true, force: true });
      removed++;
      totalSize -= item.size;
    } catch {
      // 删除失败跳过，不影响其他目录清理
    }
  }
  return removed;
}
