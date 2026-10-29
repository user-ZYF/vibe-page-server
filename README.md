# vibepage-server-node

VibePage 画布编辑器的后端服务：用户认证 + 画布页面管理。

## 技术栈

Node.js + TypeScript + Express 5 + Sequelize 6 + mysql2 + jsonwebtoken + bcryptjs

## 目录结构

```
src/
├── index.ts                  # 启动入口：连接数据库 → 同步表结构 → 监听端口
├── app.ts                    # Express 应用组装（CORS、JSON、路由、异常处理）
├── db.ts                     # Sequelize 实例（数据库连接配置在这里）
├── constants/
│   └── result-code.ts        # ResultCodeEnum（0/400/401/404/500）
├── common/
│   ├── result.ts             # 统一响应 { code, message?, data? }
│   └── biz-exception.ts      # 业务异常（code + message）
├── middleware/
│   ├── auth.ts               # JWT 鉴权（Bearer token → req.userId）
│   └── error-handler.ts      # 全局异常处理 → 统一错误响应
├── models/                   # Sequelize 模型（字段 camelCase → 列 snake_case）
│   ├── user.ts               #   user 表 + UserInfo/LoginResult 类型
│   ├── page.ts               #   page 表 + PageInfo/PageListItem 类型
│   ├── refresh-token.ts      #   refresh_token 表
│   └── index.ts              #   统一导出
├── services/                 # 业务逻辑
│   ├── auth.ts               #   注册 / 登录 / 播种 / 令牌签发·轮换·作废
│   └── page.ts               #   画布增删改查（含归属校验）
├── controllers/              # 请求入口 + 参数校验
│   ├── auth.ts
│   └── page.ts
├── routes/                   # 路由表
│   ├── auth.ts               #   /api/auth/**
│   └── page.ts               #   /api/pages/**（挂载 authRequired）
├── types/
│   └── express.d.ts          # Express Request 扩展（req.userId）
└── utils/
    ├── jwt.ts                # JWT 签发/解析
    └── validate.ts           # 参数校验（requireNonEmpty/assertIsString/...）
seed/
└── sample-page.json          # 新用户注册时播种的示例画布
```

## 环境变量（.env）

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=vibepage
DB_USER=root
DB_PASS=123456

PORT=8080

JWT_SECRET=your-secret
JWT_ACCESS_EXPIRE_HOURS=2
JWT_REFRESH_EXPIRE_DAYS=7
```

所有配置直接读 `process.env`，`.env` 必须存在（模板见 `.env.example`）。

## 运行

```bash
pnpm install

pnpm dev          # tsx watch 热重载
pnpm typecheck    # tsc --noEmit 类型检查
pnpm build        # 编译到 dist/
pnpm start        # node dist/index.js
```

## 接口列表

| 方法 | 路径 | 说明 | 鉴权 |
|---|---|---|---|
| POST | /api/auth/register | 注册（自动播种示例画布）→ UserInfo | 否 |
| POST | /api/auth/login | 登录 → LoginResult | 否 |
| POST | /api/auth/refresh | 刷新令牌（旧令牌作废轮换）→ LoginResult | 否 |
| POST | /api/auth/logout | 登出（作废刷新令牌） | 否 |
| GET | /api/pages | 当前用户画布列表 → PageListItem[] | 是 |
| POST | /api/pages | 新建画布 { title, content? } → PageInfo | 是 |
| GET | /api/pages/detail?id= | 画布详情 → PageInfo | 是 |
| PUT | /api/pages | 保存画布 { id, title?, content?, thumbnail? } → PageInfo | 是 |
| DELETE | /api/pages?id= | 删除画布（逻辑删除） | 是 |

## 实现说明

- **统一响应**：`{ code, message?, data? }`，成功只有 `code + data`，失败只有 `code + message`；业务错误也返回 HTTP 200，由 body 里的 `code` 区分（前端 axios 拦截器依赖 `code === 401` 触发刷新令牌）
- **鉴权**：`Authorization: Bearer <accessToken>`，`/api/pages/**` 全部要求登录，`/api/auth/**` 公开；令牌格式不对返回 `令牌格式不正确`，验签失败返回 `未登录或令牌已过期`
- **刷新令牌轮换**：`/refresh` 用「条件更新 `revoked=0→1` + 行锁」作废旧令牌并发新令牌，旧令牌不可复用
- **时间字段**：所有时间列（`created_at`/`updated_at`/`expires_at`）都是 `BIGINT` 毫秒时间戳，由模型 `beforeCreate`/`beforeUpdate` 钩子写 `Date.now()`
- **响应序列化**：`toJSON()` 直接展开原始行数据、只剔除 `password`/`deleted` 等敏感字段，不做字段映射
- **逻辑删除**：`deleted` 标记（0/1），模型 `defaultScope` 自动附加 `deleted = 0`
- **密码**：BCrypt 哈希存储，不回传
- **请求体上限**：20MB（画布 content + base64 缩略图较大）
- **类型**：响应类型用 `Omit`/`Pick` 从 `InferAttributes` 派生，实体加列自动体现在响应类型里
