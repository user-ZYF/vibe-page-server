import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { pipeline, finished } from 'node:stream/promises';
import path from 'node:path';
import { BizException } from '../common/biz-exception.js';
import { ResultCodeEnum } from '../constants/result-code.js';
import type { FileCheckResult, FileChunkResult } from '../types/file.js';

/** 上传根目录（最终文件 uploads/，分片临时目录 uploads/tmp/{fileHash}/） */
const UPLOAD_DIR = path.resolve(import.meta.dirname, '../../uploads');
const TMP_DIR = path.join(UPLOAD_DIR, 'tmp');

/** 分片临时目录最大存活时间（超过视为中断残留，由定时任务清理） */
export const TMP_MAX_AGE_MS = 24 * 60 * 60 * 1000;

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
    // 分片以索引命名，方便合并时知晓顺序
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
export async function saveChunk(
  fileHash: string,
  fileName: string,
  index: number,
  chunkHash: string,
  totalChunks: number,
  data: Buffer,
): Promise<FileChunkResult> {
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

  if (countChunks(tmpDir) < totalChunks) {
    return {};
  }
  // 按顺序流式合并分片数据，构造完整文件（避免一次性加载到内存）
  await mergeChunks(tmpDir, final, totalChunks);
  // 删除目录以及内部的分片数据文件，目录不存在时不报错
  fs.rmSync(tmpDir, { recursive: true, force: true });
  return { url: `/uploads/${path.basename(final)}` };
}

/** 流式合并：逐个把分片文件 pipe 到目标文件，任意时刻只有一个分片在内存中 */
async function mergeChunks(tmpDir: string, final: string, totalChunks: number): Promise<void> {
  const out = fs.createWriteStream(final);
  try {
    for (let i = 0; i < totalChunks; i++) {
      // end: false 保持写入流打开，等所有分片写完再关闭（pipeline自动处理背压问题）
      await pipeline(fs.createReadStream(path.join(tmpDir, String(i))), out, { end: false });
    }
    out.end();
    await finished(out);
  } catch (err) {
    // 合并失败时销毁写入流并删除残缺的合并文件，防止被误认为已完成
    out.destroy();
    fs.rmSync(final, { force: true });
    throw err;
  }
}

/** 统计临时目录中已收到的分片数 */
function countChunks(tmpDir: string): number {
  return fs.readdirSync(tmpDir).length;
}

/**
 * 清理分片临时目录：删除最后修改时间超过 maxAgeMs 的目录（中断上传的残留）
 * @param maxAgeMs 临时目录最大存活时间（毫秒），默认 TMP_MAX_AGE_MS
 * @returns 删除的目录数
 */
export function cleanTmpDirs(maxAgeMs = TMP_MAX_AGE_MS): number {
  if (!fs.existsSync(TMP_DIR)) return 0;

  const deadline = Date.now() - maxAgeMs;
  let removed = 0;
  for (const name of fs.readdirSync(TMP_DIR)) {
    const dir = path.join(TMP_DIR, name);
    try {
      if (fs.statSync(dir).mtimeMs > deadline) continue;
      fs.rmSync(dir, { recursive: true, force: true });
      removed++;
    } catch {
      // 目录被并发删除或删除失败时跳过，不影响其他目录清理
    }
  }
  return removed;
}
