# TanStack Router 迁移文档

## 概述

本项目已成功从单页面应用迁移到使用 **TanStack Router** 的多页面路由架构。

## 架构变更

### 之前的架构
- **单页面应用**：所有功能集成在一个 `App.jsx` 组件中
- 输入和分词结果显示在同一页面
- 无路由系统

### 新架构
- **基于文件的路由系统**：使用 TanStack Router v1.132+
- **页面分离**：
  - **首页** (`/`)：仅包含输入功能
  - **结果页** (`/results`)：显示分词结果和语音播放

---

## 文件结构变化

### 新增文件

```
frontend/src/
├── routes/                    # 路由目录（新增）
│   ├── __root.tsx            # 根路由布局
│   ├── index.tsx             # 首页路由
│   └── results.tsx           # 结果页路由
├── routeTree.gen.ts          # 自动生成的路由树（由 Vite 插件生成）
└── main.tsx                  # 主入口文件（从 main.jsx 重命名）
```

### 修改的文件

- **`vite.config.js`**：添加 `TanStackRouterVite` 插件
- **`main.tsx`**（原 `main.jsx`）：集成 `RouterProvider`
- **`index.html`**：更新脚本引用为 `main.tsx`
- **`.gitignore`**：忽略自动生成的路由树文件

### 删除/废弃的文件

- **`App.jsx`**：已拆分为多个路由组件，不再使用

---

## 技术栈更新

### 新增依赖

```json
{
  "@tanstack/react-router": "^1.132.47",
  "@tanstack/router-devtools": "^1.132.51",
  "@tanstack/router-plugin": "^1.132.51"
}
```

### 配置更新

#### `vite.config.js`

```js
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [
    TanStackRouterVite(),  // 必须在 react() 之前
    tailwindcss(),
    react(),
  ],
  // ...
})
```

---

## 路由设计

### 路由表

| 路径 | 组件 | 功能 | 搜索参数 |
|------|------|------|----------|
| `/` | `routes/index.tsx` | 输入文本和选择语音 | - |
| `/results` | `routes/results.tsx` | 显示分词结果和播放语音 | `text`, `voice` |

### 路由导航流程

```
用户访问首页 (/)
    ↓
输入中文文本
    ↓
选择粤语语音
    ↓
点击"开始分词"
    ↓
导航到 /results?text=xxx&voice=xxx
    ↓
自动调用分词 API
    ↓
显示分词结果
    ↓
点击单词/句子播放语音
```

---

## 核心功能实现

### 1. 搜索参数验证

**`routes/results.tsx`** 使用 `validateSearch` 确保类型安全：

```tsx
export const Route = createFileRoute('/results')({
  validateSearch: (search: Record<string, unknown>): ResultsSearch => {
    return {
      text: (search.text as string) || '',
      voice: (search.voice as string) || 'zh-HK-HiuMaanNeural',
    }
  },
  component: ResultsPage,
})
```

### 2. 程序化导航

**`routes/index.tsx`** 使用 `useNavigate` 进行导航：

```tsx
const navigate = useNavigate()

const handleSegment = () => {
  navigate({
    to: '/results',
    search: {
      text: inputText,
      voice: selectedVoice,
    },
  })
}
```

### 3. 类型安全的搜索参数访问

```tsx
const { text, voice } = Route.useSearch()  // 完全类型安全
```

---

## UI 改进

### 1. 根路由布局

`__root.tsx` 提供统一的背景和动画效果：
- 渐变背景
- SVG 图案
- 动画光晕球体
- TanStack Router Devtools（开发环境）

### 2. 首页优化

- 移除分词结果显示区域
- 简化 UI，专注于输入功能
- 添加使用说明卡片

### 3. 结果页新增

- 返回首页按钮
- 加载状态指示器
- 错误提示
- 响应式分词结果展示

---

## 开发工具

### TanStack Router Devtools

开发环境下，自动加载路由调试工具：
- 查看路由树
- 监控路由状态
- 调试搜索参数
- 查看路由匹配

访问：http://localhost:5173

---

## 运行项目

### 开发模式

```bash
cd frontend
npm install
npm run dev
```

### 构建生产版本

```bash
npm run build
npm run preview
```

---

## 类型安全

TanStack Router 提供完整的 TypeScript 类型推断：

1. **路由路径**：自动补全 `/` 和 `/results`
2. **搜索参数**：类型安全的 `text` 和 `voice`
3. **导航参数**：编译时检查参数完整性

示例：

```tsx
// ✅ 正确：类型安全
navigate({ to: '/results', search: { text: 'hello', voice: 'zh-HK-HiuMaanNeural' }})

// ❌ 错误：TypeScript 会报错
navigate({ to: '/invalid-route' })
navigate({ to: '/results', search: { invalid: 'param' }})
```

---

## 最佳实践

### 1. 文件命名约定

- `__root.tsx`：根路由
- `index.tsx`：索引路由（对应 `/`）
- `about.tsx`：静态路由（对应 `/about`）
- `$postId.tsx`：动态参数路由（对应 `/posts/:postId`）

### 2. 路由组件导出

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/path')({
  component: ComponentName,
})

function ComponentName() {
  // 组件实现
}
```

### 3. 搜索参数验证

始终使用 `validateSearch` 确保类型安全和默认值：

```tsx
validateSearch: (search: Record<string, unknown>): MySearch => ({
  param1: (search.param1 as string) || 'default',
  param2: Number(search.param2) || 0,
})
```

---

## 性能优化

1. **代码分割**：每个路由组件自动进行代码分割
2. **懒加载**：路由组件按需加载
3. **类型生成**：编译时生成类型，无运行时开销

---

## 故障排查

### 问题 1：路由树文件未生成

**解决方案**：
- 确保 `TanStackRouterVite()` 在 `vite.config.js` 中正确配置
- 确保 `routes/` 目录存在
- 重启开发服务器

### 问题 2：TypeScript 类型错误

**解决方案**：
- 等待 `routeTree.gen.ts` 自动生成
- 检查 `main.tsx` 中的 `declare module` 声明
- 重启 TypeScript 服务器

### 问题 3：导航不工作

**解决方案**：
- 检查路由路径是否正确（使用 `/` 开头）
- 确保 `RouterProvider` 正确包裹应用
- 使用 Router Devtools 调试

---

## 未来扩展

### 可能的路由扩展

```
routes/
├── __root.tsx
├── index.tsx                    # 首页
├── results.tsx                  # 结果页
├── history.tsx                  # 历史记录（新增）
├── settings.tsx                 # 设置页（新增）
└── favorites/                   # 收藏夹（新增）
    ├── index.tsx                # 收藏列表
    └── $id.tsx                  # 收藏详情
```

### 功能增强

1. **历史记录**：保存用户的分词历史
2. **收藏功能**：收藏常用短语
3. **设置页**：自定义语音、分词模式等
4. **分享功能**：生成分享链接

---

## 参考资源

- [TanStack Router 官方文档](https://tanstack.com/router)
- [文件路由指南](https://tanstack.com/router/latest/docs/framework/react/guide/file-based-routing)
- [搜索参数](https://tanstack.com/router/latest/docs/framework/react/guide/search-params)
- [类型安全](https://tanstack.com/router/latest/docs/framework/react/guide/type-safety)

---

**迁移完成日期**：2025-10-10
**迁移负责人**：Claude Code
**状态**：✅ 成功完成
