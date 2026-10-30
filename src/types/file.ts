/** check 请求体中的分片描述 */
export interface ChunkDescriptor {
  /** 分片序号 */
  index: number;
  /** 分片内容 MD5 */
  hash: string;
}

/** 上传检查响应 */
export interface FileCheckResult {
  /** 文件已存在时的访问地址（秒传） */
  url?: string;
  /** 缺失的分片序号列表 */
  needed?: number[];
}

/** 分片上传响应 */
export interface FileChunkResult {
  /** 全部分片到齐合并后的访问地址 */
  url?: string;
}
