# 开发规范（工程标准手册 · 全项目）

> **适用项目**：FreshMart / B2B 生鲜订货（单体 MVP）  
> **覆盖范围**：**后端（Go）+ 管理后台（Ant Design Pro）+ 订货端/发货端 APP（Expo + RN）** 三端协同。  
> **效力**：团队与 AI 编码的**工程层**标准；**业务需求**以 `docs/requirement.md` 为准；**接口/表结构契约**以 `docs/api-design.md`、`docs/db-design.md` **v1.1** 为准；**任务与验收**以 `docs/task-list.md` **v1.1** 为准。  
> **冲突处理**：业务字段与流程 → `requirement.md`；工程约定矛盾 → 以 **本文件** 为准并更新修订记录。  
> **版本**：**v1.3（冻结开工版）** · **日期**：2026-04-13  

---

## 1. 文档索引（必读顺序）

| 顺序 | 文档 | 用途 |
|------|------|------|
| 1 | `docs/requirement.md` | 需求与 DDL 原文 |
| 2 | `docs/architecture.md` | 模块边界与状态机 |
| 3 | `docs/db-design.md` v1.1 | MVP 表、库存策略 |
| 4 | `docs/api-design.md` v1.1 | 路径、错误码、请求示例 |
| 5 | `docs/task-list.md` v1.1 | 任务、AC、冻结规则 |
| 6 | **`docs/dev-spec.md`（本文）** | 三端目录、分层、接口封装、状态、Git、AI 纪律 |

---

## 2. 技术栈（三端固定选型）

| 端 | 技术 | 说明 |
|----|------|------|
| **后端** | Go 1.22+（建议）、Gin、GORM、MySQL 8、Redis 7、JWT、Zap、swag | 单体 API |
| **管理后台** | React 18、**TypeScript**、Ant Design Pro 6、**UmiJS**、**Axios**（或 Umi `request`，团队二选一并写死） | Web |
| **订货 APP / 发货 APP** | RN 0.76+、**Expo SDK 52+** | **固定四件套**：**TypeScript + Axios + Zustand + Expo Router**；表单 **React Hook Form**。**两个独立工程**，目录同构。 |

**锁死项（禁止混用）**

- **APP 技术栈固定**：**TypeScript + Axios + Zustand + Expo Router**（外加 **React Hook Form**）；**禁止**换用 fetch 作主客户端、禁止 Redux/RTK 接业务全局状态、禁止 React Navigation 与 Expo Router 混用。
- APP：**禁止**同一端内用 Context 替代 Zustand 承载订单/购物车级全局状态。
- APP：**禁止**页面内散落 `fetch` / 多处配置 baseURL；**必须**经统一 `api/client`。
- 后台：**禁止**页面直接拼 URL 调后端；经统一 request 实例。

### 2.1 推荐初始化目录样板（开工脚手架）

以下为推荐初始目录树，可直接用于 P0 脚手架初始化；允许按实际仓库微调，但分层职责不可变。

**后端（Go）**

```text
freshmart/
├── cmd/server/main.go
├── config/
├── internal/
│   ├── middleware/
│   ├── model/
│   ├── repository/
│   ├── service/
│   ├── handler/
│   │   ├── common/
│   │   ├── buyer/
│   │   ├── seller/
│   │   └── admin/
│   ├── dto/
│   ├── pkg/
│   └── tests/
├── router/
├── migration/
└── docs/
```

**管理后台（React + Ant Design Pro）**

```text
src/
├── pages/
├── services/
├── components/
├── hooks/
├── constants/
├── types/
├── utils/
└── app.tsx
```

**APP（订货端 / 发货端，同构）**

```text
src/
├── api/
├── components/
├── screens/
├── navigation/
├── store/
├── hooks/
├── constants/
├── types/
├── theme/
├── utils/
└── assets/
```

---

## 3. 通用协作规范（全项目）

### 3.1 契约优先

- **以后端 `docs/api-design.md` v1.1 为唯一接口契约**；新增/改字段 **先改文档** 再改前后端。
- **禁止**前端按「猜字段」对接；Mock 数据结构 **必须与** api-design 响应示例一致。
- 表结构以 `docs/db-design.md` 为准；前后端 **不自行发明** 未文档化字段。

### 3.2 环境与密钥

- 使用 `.env.example` 提交仓库；**禁止**提交真实 `.env`、密钥、证书。
- 区分 `development` / `production` Base URL；构建产物中 **不可** 硬编码内网地址。

### 3.3 响应结构（三端解析一致）

后端统一：

```json
{ "code": 0, "message": "success", "data": {} }
```

- 前端（Web/APP）在 `api` 层统一解析：`code === 0` 取 `data`，否则抛业务错误（带 `code` + `message`）。
- 分页：`data.list` + `data.pagination`（字段名固定，见 api-design）。

### 3.4 错误码与登录失效

- 业务错误以 `code` 为准（见 `docs/api-design.md` §1.5）。
- **401 / Token 无效 / 约定登录失效码**：统一清凭证、跳登录页；**禁止**各页面自行处理一套。

### 3.5 类型与枚举的唯一来源（强制）

为避免 buyer/seller/admin 三端各维护一套状态常量，统一如下：

| 资产 | 唯一来源 | 维护责任 |
|------|----------|----------|
| 接口字段结构 | `docs/api-design.md` + 后端 DTO | 后端 owner 维护，前端对齐 |
| 数据库状态值（0/1/2...） | `docs/db-design.md` 枚举节 | 后端 owner 维护 |
| 后端状态常量 | `internal/pkg/enum/`（推荐）或 `internal/model/enum/`（二选一固定） | 后端 owner |
| 管理后台枚举映射 | `src/constants/status.ts` + `src/types/` | 前端-后台 owner |
| 订货/发货 APP 枚举映射 | `src/constants/status.ts` + `src/types/`（两端同构） | 前端-APP owner |

**变更流程（必须）**：新增状态码/枚举值顺序固定为  
`api-design/db-design -> 后端 enum + DTO -> Web/App constants + types -> 联调测试`。

---

## 4. 后端规范（Go + Gin）

### 4.1 架构约束

- **单体**；**禁止**未立项的微服务、消息总线。
- 路由：`/api/v1/buyer/`、`/seller/`、`/admin/`、`/common/`。

### 4.2 目录结构（须一致）

```
cmd/server/main.go
config/
internal/
  middleware/
  model/
  repository/
  service/
  handler/
    buyer/
    seller/
    admin/
    common/
  dto/
  pkg/
router/router.go
migration/
```

- **禁止**用 `internal/api` 替代 `handler`（除非全员迁移并改本文档）。

### 4.3 分层规则（强制）

| 层 | 允许 | 禁止 |
|----|------|------|
| **handler** | bind、调 **一个** service 方法、统一响应 | 手写 SQL、直接 `db`、复杂状态机 |
| **service** | 事务、状态机、多 repository | 依赖 `*gin.Context` |
| **repository** | GORM 访问 | 业务规则、运费计算 |

- 事务仅在 **service**；`repository` 方法可接收 `*gorm.DB` 参与同一事务。

### 4.4 依赖方向

`handler` → `service` → `repository` → `model`；**禁止** handler → repository；**禁止** repository → service。

### 4.5 API 与 JSON

- 对外 JSON 字段 **snake_case**；Go struct `json:"..."` 对齐 api-design。
- 错误码区间：10000 / 20000 / 30000 / 40000 / 50000；新增码须在 api-design 登记。

### 4.6 数据库

- 表名、字段 snake_case；金额 **DECIMAL**；**禁止** float 存金额。
- 迁移可重复策略见 `docs/task-list.md`；先改 db-design + migration 再改代码。

### 4.7 事务与库存（订单）

- 创建订单：单事务内扣 `products.stock`，失败 **整单回滚** → **`30002`**。
- 取消 / 拒单 / 超时取消：**加回库存** + `order_logs`。
- 配置：`order_auto_cancel_minutes`、`order_auto_complete_hours` **从库读**，禁止写死。

### 4.8 订单状态机

- 状态 0–7 与 `order_logs`、角色权限：以 `docs/task-list.md` 核心业务规则为准；非法 → **`40002`**（或越权 **10003**，团队固定一种）。

### 4.9 日志与安全

- Zap；请求级 request id；**禁止**日志打印密码、Token、验证码。
- 审核、改配置、改订单状态：audit 日志。
- 密码 bcrypt；SQL 必须参数化。

---

## 5. 管理后台规范（Ant Design Pro + UmiJS）

### 5.1 目录与职责（建议）

```
src/
  pages/           # 页面，按菜单模块分子目录
  services/        # 对接后端 API，每个领域一个文件（如 order.ts、product.ts）
  components/      # 后台通用业务组件
  utils/           # 工具、request 封装扩展
  constants/       # 枚举映射（订单状态等与 APP 同数字语义）
  typings.d.ts     # 全局类型（按需）
```

- **禁止**在 `pages` 内写长串 `axios.get`；**必须**通过 `services/*`。
- 与后端分页、响应结构 **严格一致**（ProTable `dataSource` ← `data.list`）。

### 5.2 请求层

- 使用 Umi **request** 或项目封装的 **单例 Axios**：统一 BaseURL、Token 头、**响应拦截**（`code !== 0` 提示、`401` 跳登录）。
- 按模块拆分：`services/auth.ts`、`services/orders.ts` 等，与 api-design 路径对应。

### 5.3 页面与 Pro 组件

- 列表页优先 **ProTable**；表单 **ProForm** / Form + schema；导出用 **blob** 下载（订单导出）。
- **权限**：使用框架 `access`；敏感操作按钮与路由守卫一致。

### 5.4 状态与数据

- **服务器状态**：React Query/SWR **可选**；MVP 可用 `useEffect + useState` + services，但 **禁止**复制粘贴多套请求逻辑，相似列表应抽 hook 或 service。

### 5.5 样式与主题

- 优先 Ant Design **token / ConfigProvider**；**禁止**大量内联 `style` 魔法数；间距、主色统一。

### 5.6 后台禁止事项

- **禁止**页面裸 `fetch` / 重复定义 API 路径字符串。
- **禁止**写死与 api-design 不一致的字段名；枚举与 APP **共用同一套数字语义**（订单 status 等）。

---

## 6. APP 开发规范（Expo + React Native · 订货端 / 发货端）

**技术栈锁定**：**TypeScript + Axios + Zustand + Expo Router**（+ **React Hook Form**）。两 App **必须同构**，仅路由与业务模块不同；**禁止**早期做「单壳切换 buyer/seller 双角色」导致导航与鉴权耦合（MVP 以两个独立工程为推荐）。

### 6.1 目录结构（两 App 对齐）

```
src/
  api/              # 仅封装 HTTP：client + 按领域拆分（authApi、orderApi…）
  components/       # 通用 UI（见 §6.6）
  screens/          # 页面；按业务分子目录 home/、order/、product/…
  navigation/       # Expo Router 布局与守卫（若逻辑集中在 app/ 则与团队约定合并）
  store/            # Zustand，按领域分文件（useAuthStore、useCartStore…）
  hooks/            # 可复用逻辑（useRefresh、usePagedList…）
  utils/            # 工具函数
  constants/        # 枚举、订单状态、店铺审核状态、颜色语义（见 §6.9）
  types/            # TS 类型，与 api-design 字段对齐
  theme/            # design tokens：颜色、间距、圆角、字号（见 §6.7）
  assets/           # 图片、字体
```

- `screens` **禁止**单目录堆上百文件；按业务域分文件夹。
- 若使用 **Expo Router** 的 `app/` 目录，可将 `screens` 逻辑以组件形式被 `app/**/page` 引用，**但**业务代码仍须分层等价于上表（api / store / components 分离）。

### 6.2 技术选型（锁死）

| 项 | 选型 |
|----|------|
| 语言 | **TypeScript**（文件后缀 `.ts` / `.tsx`） |
| 路由 | **Expo Router** |
| HTTP | **Axios**（唯一推荐 HTTP 客户端） |
| 全局状态 | **Zustand**（按模块拆分 store） |
| 表单 | **React Hook Form**（+ 可选 zod/yup，团队统一一种即可） |
| 安全存储 Token | **expo-secure-store**（或等价） |
| 非敏感持久化 | **AsyncStorage**（仅缓存、草稿；refresh token 策略由团队定稿） |

**禁止**：混用 Redux / RTK、用 Context 扛订单/购物车级全局状态；**禁止**页面级各自 `new Axios` 或主流程用裸 `fetch`。

### 6.2.1 还不熟悉 TypeScript 时怎么写

- **可以边做边学**：`.tsx` 里大部分仍是 **函数组件 + hooks**，和写 JS 很像；TS 多出来的是给数据**加类型标注**，让编辑器和 CI 提前报错，减少联调时才发现字段写错。
- **先会这三样就够开工**：① 用 **`interface`** 描述接口返回（对齐 `docs/api-design.md`）；② 给组件 **`props` 写类型** `{ title: string }`；③ 看编辑器红线改错，不懂就交给 Cursor 按 `types/` 已有风格补全。
- **类型放哪里**：与后端契约相关的结构放在 **`types/`** 和 **`api/*`**，**不要**在每个页面里重复写一大段 `interface`。
- **严格模式**：推荐项目在稳定后开启 `tsconfig` 的 **`strict`**；MVP 初期若报错太多，可暂时放宽个别选项（如 `strictNullChecks`），但**禁止**新建 `.js/.jsx` 源文件替代 TS（避免双栈混用）。
- **自学入口**（官方，英文）：[Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) — 只需读 **Interfaces、Type Aliases、Optional** 几节即可覆盖本项目大部分场景。

### 6.3 页面分层（职责）

| 层级 | 职责 |
|------|------|
| **screen** | 布局、导航、组合组件、绑定事件；**不写**复杂请求拼装 |
| **api** | URL、method、query/body；返回 `Promise<ApiResponse<T>>` 或解包后的 `T`（团队统一一种） |
| **store** | 跨页共享：用户、token、购物车摘要、未读数等 |
| **hooks** | 列表刷新、分页、防抖提交等复用 |
| **components** | 展示与交互复用 |

### 6.4 接口调用规范

- **所有请求**经过 `src/api/client.ts`（或 `api/http.ts`）：配置 baseURL、超时、**请求拦截**注入 Token、**响应拦截**统一处理 `code`、`401`、网络错误。
- 按业务拆文件：`api/auth.ts`、`api/order.ts`、`api/product.ts`…，**禁止**在 screen 里字符串拼 `/api/v1/...`。
- 定义统一类型：

```ts
// 示例，项目内统一即可
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}
```

- **禁止**页面直接使用裸 `axios.get` / `fetch`。

### 6.5 状态管理规范

| 类型 | 存放位置 |
|------|----------|
| 全局 | **Zustand**：`useAuthStore`、`useCartStore`、消息未读等 |
| 页面临时 | `useState` / `useReducer`（列表 loading、弹窗、tab） |
| 表单 | **React Hook Form**，**不**塞全局 store |
| 服务端列表缓存 | 以页面 + 轻量 store 或 hooks 为主；**禁止**单一大 god store |

### 6.6 组件规范（须优先复用）

至少统一实现或抽到 `components/`：

- `PageContainer`：安全区、统一背景
- `AppHeader`：标题、返回
- `EmptyState` / `LoadingView` / `ErrorRetryView`
- `StatusTag`：订单状态（接 `constants` 映射）
- `ProductCard`、`OrderCard`
- `QuantityInput`（步长、起购与后端一致）

**禁止**每个页面自定义一套空态/加载样式；订单状态 **禁止**在多个文件写 `if (status === 1)` 硬编码文案。

### 6.7 样式规范

- 使用 **`StyleSheet.create`**；颜色、间距、圆角、字号来自 **`theme/` 或 `constants/design.ts`**（design tokens）。
- **禁止**大段重复内联样式；MVP **不强制**引入重型 UI 库，以稳定与 tokens 为主。

### 6.8 导航与鉴权

- **未登录**：仅允许登录/注册流；**登录后**进入主 Stack/Tabs。
- **Token 失效**：统一拦截器清 store、跳登录（**禁止**每页各自判断）。
- **订货端与发货端**：**独立**导航栈与入口；不共享同一复杂角色切换壳（MVP）。

### 6.9 枚举与状态文案

- 后端返回数字状态；前端在 **`constants/status.ts`**（或分文件）集中定义：`ORDER_STATUS_MAP` → `{ label, color, description }`。
- 覆盖：订单 status、店铺 `audit_status`、商品 `status`（与 requirement / db-design 一致）。

### 6.10 表单与校验

- 统一 **React Hook Form**；手机号、数量、金额、备注长度等 **抽公共 rules**。
- 提交按钮 **防重复**：提交中 disabled 或 lock flag。
- 地址、商品发布、入驻等重复表单 **抽通用模式**（组件或 schema）。

### 6.11 异常、空态、列表体验

- 列表：**loading**、**empty**、**error + 重试**、**下拉刷新**、**上拉加载更多**（分页与后端 `page` / `page_size` 一致）— 优先用 **通用 hook + 组件**，禁止每页复制一套。

### 6.12 APP 与后端协同

- 对接前 **对照 api-design** 确认路径与字段；类型 `types/*` 与 **文档同步更新**。
- **禁止**先写页面再让后端「凑合」改接口；顺序：**api-design → 类型 → api 层 → UI**。

### 6.13 页面模板（标准结构）

**列表页**

1. 顶部：标题 / 筛选（可选）  
2. 主体：FlatList / FlashList + `LoadingView` / `EmptyState` / `ErrorRetryView`  
3. 下拉刷新 + 分页加载  
4. 统一在 hook 中管理 `loading / refreshing / error / data / page`

**详情页**

1. 顶部状态区（`StatusTag` + 关键信息）  
2. Section 卡片分组（商品明细、地址、金额）  
3. 底部操作条（与状态机允许操作一致，调 api 前校验）

### 6.14 APP 禁止事项（汇总）

- **禁止**页面直接裸请求或未走 `api/client`。  
- **禁止**在多个页面重复定义订单状态文案/颜色。  
- **禁止**单文件过大（建议 **>400 行** 拆子组件或 hooks）。  
- **禁止**把所有状态塞进一个 store。  
- **禁止**忽略 `code !== 0` 仍当成功解析。  

### 6.15 搭建顺序（先于业务大页面）

每个 App **先完成**再批量写业务页：

1. Expo Router 骨架 + 登录/主流程占位  
2. `api/client` + 拦截器 + `ApiResponse`  
3. Token 存 Secure Store + auth store  
4. `theme` tokens + `PageContainer` / `LoadingView` / `EmptyState`  
5. `constants/status.ts`  
6. 再写首页、列表、详情  

---

## 7. 测试与质量

### 7.1 最低测试要求（开工门槛）

- **后端最少覆盖**：
  - 订单创建成功与失败（库存不足 `30002`）
  - 取消/拒单/超时取消后的库存回滚
  - 关键状态流转（`0->1->2->3->4`，非法迁移返回 `40002`）
- **Web/App 最少覆盖**：
  - 关键页面人工回归清单（登录、列表、详情、关键动作按钮）
  - 401 统一跳转登录、空态/错误态可见
- **接口集合**：Postman/Apifox 与 api-design 同步（task-list 发布阻塞项）。

### 7.2 提交前必跑命令（最低）

按端执行对应命令（命令名可随仓库脚本实际调整）：

```bash
# backend
go test ./...

# admin web
npm run lint
npm run typecheck

# buyer/seller app
npm run lint
npm run typecheck
expo doctor
```

- 提交 PR 时附本次执行结果（终端摘要或 CI 链接）。

---

## 8. Git 与提交

- 分支：`main` / `develop` / `feature/*` / `fix/*`。
- 提交：Conventional Commits，`feat(buyer-app): ...` / `fix(admin): ...` 等。
- **禁止**提交 `.env`、用户上传文件。
- PR：动订单/库存须有人核对 AC；动迁移须带 db-design 引用。

---

## 9. AI 辅助开发（Cursor / Claude）

- **先读**：本文 + 当次涉及的 api-design / db-design / requirement。
- **禁止**：一次生成整仓、整份 `internal/`、或整 App 全部页面。
- **三端**：生成 RN 代码须符合 **§6** 目录与 client 规范；生成后台须符合 **§5**。
- **最小 diff**；改接口先改 **api-design**。

### 9.1 执行模板（可直接复制）

**A. 设计阶段模板**

```text
请先按 docs/dev-spec.md、docs/api-design.md、docs/db-design.md 分析本需求。
输出：
1) 影响文件清单
2) 分层落点（handler/service/repository 或 web/app 对应目录）
3) 风险点与回滚点
4) 最小改动实施步骤
不写代码，先给设计。
```

**B. 编码阶段模板**

```text
按已确认设计实施，严格遵守 docs/dev-spec.md：
- 不越分层
- 不改无关文件
- API/字段与文档一致
- APP 必走 api/client，状态常量集中 constants
完成后给出变更文件列表与每个文件的改动目的。
```

**C. 自检阶段模板**

```text
请按 docs/task-list.md 的 AC 和 docs/dev-spec.md 的测试要求自检：
1) 列出已执行命令及结果
2) 列出未覆盖风险
3) 列出需要我手动确认的最小步骤
4) 若涉及接口/表结构变更，确认是否同步更新 api-design/db-design
```

---

## 10. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-04-13 | 初版（后端为主） |
| v1.1 | 2026-04-13 | 增加通用协作、管理后台、APP 全量规范；三端固定选型 |
| v1.2 | 2026-04-13 | APP 明确固定 **TypeScript + Axios + Zustand + Expo Router**；增加 **§6.2.1** TS 上手说明 |
| v1.3 | 2026-04-13 | 补充目录脚手架样板、类型/枚举唯一来源、最低测试门槛、AI 执行模板；标记为冻结开工版 |

---

*AI 强约束摘要见根目录 `CLAUDE.md`；若与本文冲突，**以本文为准**。*
