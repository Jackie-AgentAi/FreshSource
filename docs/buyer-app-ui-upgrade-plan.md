# 订货端 App UI 升级任务文档（独立）

创建日期：2026-04-14  
适用范围：`buyer-app`（Expo Router + TypeScript + Axios + Zustand）

## 1. 对齐结论（基于截图与现有环境）

可以对齐现有环境，无需重做技术栈或重建路由。  
截图中的核心页面与当前 `buyer-app/app` 已有路由基本一一对应：

- 商品首页：`app/(tabs)/index.tsx`
- 分类页：`app/(tabs)/categories.tsx`、`app/category/[id].tsx`
- 购物车：`app/(tabs)/cart.tsx`
- 确认订单：`app/checkout.tsx`
- 商品详情：`app/product/[id].tsx`
- 店铺主页：`app/shop/[id].tsx`
- 搜索结果：`app/search.tsx`
- 地址管理：`app/addresses/*`
- 我的订单/订单详情：`app/orders/index.tsx`、`app/orders/[id].tsx`
- 个人中心：`app/(tabs)/profile.tsx`

结论：本次做“UI 升级”应以视觉统一、交互分层、组件复用为主，不改后端 API 契约。

## 2. 升级目标（UI 层）

1. 页面视觉统一：头部、卡片、按钮、状态标签、空态/错误态一致。  
2. 交互层级清晰：列表 > 筛选 > 详情 > 操作条，减少跳转负担。  
3. 信息优先级重排：价格、库存、状态、关键 CTA（加购/下单/去支付）更突出。  
4. 提升可用性：加载骨架、弱网重试、表单校验反馈更直接。  
5. 保持代码可维护：复用 `components` 与 `theme`，禁止页面散落硬编码样式。

## 3. 设计基线（约束）

- 严格沿用 `docs/dev-spec.md` 的 App 规范：
  - 页面请求必须走 `src/api/*`；
  - 状态文案集中在 `src/constants/*`；
  - 通用 UI 组件统一放 `src/components/*`；
  - 样式使用 token，不做大段内联样式复制。
- 本阶段不新增业务能力（支付、营销、IM 等），仅做现有流程 UI 升级。

## 4. 任务拆解（可执行）

| ID | 任务 | 目标文件（建议） | 预计工时 | 依赖 | 验收标准 |
|----|------|------------------|----------|------|----------|
| UI-BUYER-01 | 建立 UI Token 2.0（颜色/字号/圆角/间距/阴影） | `buyer-app/src/theme/tokens.ts` | 4h | 无 | 页面主色、文本层级、间距统一且不破坏现有逻辑 |
| UI-BUYER-02 | 通用头部与容器升级（标题区、安全区、滚动区） | `src/components/PageContainer.tsx` + 新增 `src/components/AppHeader.tsx` | 6h | UI-BUYER-01 | 首页/分类/订单页头部样式统一 |
| UI-BUYER-03 | 列表态统一（Loading/Empty/Error）视觉升级 | `LoadingView`、`EmptyState`、`ErrorRetryView` | 4h | UI-BUYER-01 | 三种状态在商品列表、订单列表、地址列表一致 |
| UI-BUYER-04 | 商品卡片与店铺卡片重构（价格/单位/库存/加购按钮） | `src/components/ProductCard.tsx` | 8h | UI-BUYER-01 | 商品列表与搜索列表卡片样式对齐截图风格 |
| UI-BUYER-05 | 首页改版（推荐区 + 分类快捷入口 + 热门商品） | `app/(tabs)/index.tsx` | 8h | UI-BUYER-02,04 | 首屏信息密度与 CTA 清晰；滚动体验稳定 |
| UI-BUYER-06 | 分类页改版（左侧分类 + 右侧商品区） | `app/(tabs)/categories.tsx`, `app/category/[id].tsx` | 10h | UI-BUYER-02,04 | 左右分栏交互稳定，切类不卡顿 |
| UI-BUYER-07 | 购物车页改版（店铺分组、数量操作、失效态） | `app/(tabs)/cart.tsx` | 10h | UI-BUYER-03 | 有效/失效商品视觉可区分；结算栏固定 |
| UI-BUYER-08 | 确认订单页改版（地址卡、商品清单、费用汇总、提交条） | `app/checkout.tsx` | 8h | UI-BUYER-07 | 提交订单主按钮与金额信息层级明确 |
| UI-BUYER-09 | 商品详情页改版（图文、规格/评价摘要、底部操作条） | `app/product/[id].tsx` | 8h | UI-BUYER-04 | 加购/立即购买入口稳定且显著 |
| UI-BUYER-10 | 订单链路 UI 统一（列表、详情、状态标签、操作按钮） | `app/orders/index.tsx`, `app/orders/[id].tsx`, `src/constants/order.ts` | 10h | UI-BUYER-03 | 各状态展示一致，无重复硬编码文案 |
| UI-BUYER-11 | 地址与个人中心视觉统一 | `app/addresses/*`, `app/(tabs)/profile.tsx` | 8h | UI-BUYER-02 | 表单、列表、操作按钮风格统一 |
| UI-BUYER-12 | 搜索结果页与店铺页统一卡片体系 | `app/search.tsx`, `app/shop/[id].tsx` | 6h | UI-BUYER-04 | 搜索与店铺列表视觉与交互一致 |
| UI-BUYER-13 | 登录页视觉升级（品牌化 + 错误反馈） | `app/(auth)/login.tsx` | 4h | UI-BUYER-01 | 登录错误提示更清晰，交互不回退 |
| UI-BUYER-14 | 真机 UI 回归与性能优化（滚动/重渲染） | 上述页面联调 | 8h | 全部 | Android 真机关键页无卡顿、无错位、无阻断问题 |

## 5. 页面优先级与排期建议

### 第一阶段（核心交易路径，优先上线）

- UI-BUYER-01 ~ UI-BUYER-08  
- 目标：完成“首页 → 分类 → 购物车 → 确认订单”视觉闭环。

### 第二阶段（转化与复购）

- UI-BUYER-09 ~ UI-BUYER-12  
- 目标：完善详情、搜索、店铺、订单体验。

### 第三阶段（品牌与稳定性）

- UI-BUYER-13 ~ UI-BUYER-14  
- 目标：统一入口观感 + 真机稳定收口。

## 6. 验收清单（UI 升级专用）

1. 关键页面在真机（Android）显示无乱码、无布局错位。  
2. 登录、商品浏览、加购、下单、订单查看主链路无阻断。  
3. 列表页均具备：loading / empty / error + retry。  
4. 订单状态文案与颜色均来自常量映射，无多文件硬编码。  
5. 页面无新增裸请求；接口调用仍统一走 `src/api/client.ts`。  
6. 样式 token 复用率明显提升（减少重复样式定义）。

## 7. 风险与处理

- 风险 1：UI 改动面大，可能引入细节回归。  
  - 处理：按任务分批提交，先核心交易链路。
- 风险 2：旧组件耦合过高导致改动扩散。  
  - 处理：先抽公共组件，再替换页面实现。
- 风险 3：截图风格与现有信息结构不一致。  
  - 处理：优先保证业务信息完整，再做视觉贴近。

## 8. 交付物

- 一份可执行任务清单（本文档）  
- 对应代码改动按任务分批提交（建议每 2~3 个任务一个 PR）  
- 每批附真机截图（首页、分类、购物车、确认订单、订单列表）

