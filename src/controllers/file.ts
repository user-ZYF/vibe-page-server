import type { Request, Response } from 'express';
import { Result } from '../common/result.js';
import { BizException } from '../common/biz-exception.js';
import { ResultCodeEnum } from '../constants/result-code.js';
import { assertFileHash, checkUpload, saveChunk } from '../services/file.js';
import type { ChunkDescriptor } from '../types/file.js';
import { requireNonEmpty } from '../utils/validate.js';

const HASH_RE = /^[a-f0-9]{32}$/;

/**
 * 检查上传状态
 */
export function checkController(req: Request, res: Response): void {
  requireNonEmpty(req.body, 'fileHash');
  const fileHash = assertFileHash(req.body.fileHash);
  requireNonEmpty(req.body, 'fileName');

  const chunks = req.body.chunks as ChunkDescriptor[] | undefined;
  if (!Array.isArray(chunks) || chunks.length === 0) {
    throw new BizException(ResultCodeEnum.BAD_REQUEST, 'chunks 不能为空');
  }
  for (const c of chunks) {
    if (!Number.isInteger(c?.index) || c.index < 0 || !HASH_RE.test(c?.hash)) {
      throw new BizException(ResultCodeEnum.BAD_REQUEST, 'chunks 参数格式错误');
    }
  }
  const data = checkUpload(fileHash, req.body.fileName, chunks.length);
  res.json(Result.success(data));
}

/**
 * 上传一个分片
 */
export function chunkController(req: Request, res: Response): void {
  const fileHash = assertFileHash(req.body.fileHash);
  const chunkHash = assertFileHash(req.body.chunkHash, 'chunkHash');
  requireNonEmpty(req.body, 'fileName');

  const index = Number(req.body.chunkIndex);
  const totalChunks = Number(req.body.totalChunks);
  if (!Number.isInteger(index) || index < 0 || !Number.isInteger(totalChunks) || totalChunks <= 0) {
    throw new BizException(ResultCodeEnum.BAD_REQUEST, 'chunkIndex/totalChunks 参数格式错误');
  }
  const data = req.file?.buffer;
  if (!Buffer.isBuffer(data) || data.length === 0) {
    throw new BizException(ResultCodeEnum.BAD_REQUEST, '分片内容不能为空');
  }

  const fileName = String(req.body.fileName);
  const result = saveChunk(fileHash, fileName, index, chunkHash, totalChunks, data);
  res.json(Result.success(result));
}
