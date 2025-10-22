[根目录](../CLAUDE.md) > **frontend**

# Frontend 模块文档

## 变更记录 (Changelog)

- **2025-10-22**: 初始化前端模块文档，分析组件结构和路由系统

## 模块职责

Frontend 模块是基于 React 18 的现代化 Web 应用，负责提供用户友好的界面用于粤语 TTS 文本输入、分词展示和交互式语音播放。采用 Vite 构建工具和 TanStack Router 路由系统，实现流畅的单页应用体验。

## 入口与启动

### 主应用入口: `src/main.tsx`
- **React 18**: 使用 StrictMode 和 createRoot API
- **HeroUI 集成**: 现代化 UI 组件库配置
- **路由系统**: TanStack Router 配置和类型安全
- **样式系统**: TailwindCSS 全局样式导入

### 启动方式
```bash
# 开发模式
npm run dev        # 启动开发服务器，端口 5173

# 构建生产版本
npm run build      # 构建到 dist/ 目录

# 预览生产版本
npm run preview    # 预览构建结果

# 代码检查
npm run lint       # ESLint 代码规范检查
```

### 构建配置
- **Vite 7**: 快速构建和热重载
- **代理配置**: API 请求代理到后端服务
- **Bing 壁纸**: 壁纸 API 代理配置
- **TypeScript**: 部分 TS 支持，增强类型安全

## 路由结构

### 文件路由系统
基于 TanStack Router 的文件约定式路由系统：

```
src/routes/
├── __root.tsx              # 根布局组件
├── index.tsx               # 首页 (/)
└── results_.$sessionId.tsx # 结果页 (/results/:sessionId)
```

### 根布局 (`routes/__root.tsx`)
- **全局样式**: 渐变背景和视觉效果
- **动画效果**: CSS 动画和模糊效果
- **开发工具**: TanStack Router Devtools（开发环境）

### 首页 (`routes/index.tsx`)
- **文本输入**: 大型文本输入区域，支持多行文本
- **语音选择**: 粤语语音下拉选择器
- **会话管理**: 持久化会话创建和历史记录
- **Bing 壁纸**: 动态背景壁纸展示

### 结果页 (`routes/results_.$sessionId.tsx`)
- **会话展示**: 基于会话 ID 的数据展示
- **分词结果**: 句子和词汇的可视化展示
- **音频播放**: 点击式词汇和句子音频播放
- **交互体验**: 流畅的动画和用户反馈

## 对外接口

### API 服务模块 (`src/api.js`)

#### 核心 API 函数
```javascript
// 创建新会话
createSession(text, voice, persistent = false, name = null)

// 获取会话数据
getSession(sessionId)

// 会话文本分词
segmentSession(sessionId)

// 中文分词
segmentText(text, mode = 'default')

// 智能分句
segmentBySentences(text)

// 语音生成
generateSpeech(text, voice, rate, volume, pitch)

// 获取语音列表
getVoices()

// 获取持久化会话列表
getPersistentSessions()
```

#### 配置说明
- **API 基础 URL**: 通过 Vite 代理配置（`''` 空字符串）
- **错误处理**: 统一的异常捕获和错误信息
- **文本清理**: 智能文本预处理和清理功能

### 文本处理算法

#### 智能分句 (`segmentBySentences`)
```javascript
// 分句策略
1. 按换行符优先分句，保持原有结构
2. 按中文标点符号（。！？）细分
3. 合并标点符号到对应句子
4. 过滤空句和无效内容
```

#### 词汇清理 (`cleanWords`)
```javascript
// 清理规则
- 移除非中文字符
- 过滤空词和空白字符
- 确保最小词长（>=1）
- 正则表达式验证中文字符
```

#### TTS 文本优化 (`cleanTextForTTS`)
```javascript
// 优化策略
- 移除不适合朗读的特殊符号
- 在句末标点后添加空格
- 保留基本标点用于语调停顿
- 规范化空白字符
```

## 关键依赖与配置

### package.json 依赖分析

#### 核心依赖
```json
{
  "react": "^19.1.1",           // React 18 最新版本
  "react-dom": "^19.1.1",       // DOM 渲染
  "@tanstack/react-router": "^1.132.47",  // 路由系统
  "@heroui/react": "^2.8.5",    // UI 组件库
  "framer-motion": "^12.23.22", // 动画库
  "liquid-glass-react": "^1.1.1", // 玻璃效果
  "tailwindcss": "^4.1.14"      // CSS 框架
}
```

#### 开发依赖
```json
{
  "vite": "^7.1.7",             // 构建工具
  "@vitejs/plugin-react": "^5.0.4", // React 插件
  "@tanstack/router-plugin": "^1.132.51", // 路由插件
  "eslint": "^9.36.0",         // 代码检查
  "@types/react": "^19.1.16"    // TypeScript 类型
}
```

### Vite 配置 (`vite.config.js`)
```javascript
export default defineConfig({
  plugins: [
    TanStackRouterVite(),    // 路由代码生成
    tailwindcss(),          // CSS 处理
    react()                 // React 支持
  ],
  server: {
    proxy: {
      '/api': {             // API 代理
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/bing-wallpaper': {  // Bing 壁纸代理
        target: 'https://www.bing.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bing-wallpaper/, ''),
        secure: false,
      }
    }
  }
})
```

## 组件架构

### 应用结构
```
src/
├── main.tsx              # 应用入口和路由配置
├── api.js                # API 服务和工具函数
├── hero.ts              # 英雄组件（可能未使用）
└── routes/              # 路由组件
    ├── __root.tsx       # 根布局
    ├── index.tsx        # 首页
    └── results_.$sessionId.tsx  # 结果页
```

### 状态管理
采用 React 18 内置状态管理：
- **useState**: 组件内部状态
- **useEffect**: 副作用处理和数据获取
- **自定义 Hooks**: 可复用的状态逻辑

### 数据流模式
```
用户输入 → API 调用 → 后端处理 → 数据返回 → UI 更新 → 用户交互
```

## 样式系统

### TailwindCSS 配置
- **版本**: TailwindCSS 4.1.14
- **集成**: Vite 插件自动处理
- **主题**: 自定义深色主题和渐变效果

### 设计系统

#### 色彩方案
```css
/* 主色调 */
bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900  /* 背景渐变 */
bg-blue-500/20 border-blue-400/40    /* 蓝色元素 */
bg-purple-500/20 border-purple-400/40 /* 紫色元素 */
bg-pink-500/20 border-pink-400/40    /* 粉色元素 */
```

#### 视觉效果
- **玻璃效果**: `backdrop-blur-xl` + 半透明背景
- **渐变背景**: 动态渐变和图案背景
- **动画效果**: CSS 动画和 Framer Motion
- **响应式**: 移动端适配和弹性布局

#### 组件样式
```css
/* 卡片样式 */
.backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl

/* 按钮样式 */
bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600

/* 输入框样式 */
bg-white/10 border border-white/30 rounded-xl text-white placeholder-gray-300 focus:ring-2 focus:ring-purple-400
```

## 用户体验特性

### 交互设计
- **点击播放**: 单词级点击播放粤语语音
- **视觉反馈**: 加载状态和错误提示
- **流畅动画**: 页面切换和组件动画
- **响应式**: 多设备适配

### 壁纸系统
- **Bing 每日壁纸**: 动态获取每日壁纸
- **代理配置**: Vite 代理避免 CORS 问题
- **加载优化**: 壁纸加载失败时的降级方案
- **视觉效果**: 半透明遮罩和模糊效果

### 会话管理
- **持久化选项**: 开发环境支持 Redis 持久化
- **历史记录**: 显示和管理历史会话
- **快速访问**: 一键访问之前的会话结果
- **会话命名**: 自定义会话名称便于管理

## 构建与部署

### 构建流程
1. **依赖安装**: `npm install`
2. **类型检查**: TypeScript 类型验证
3. **代码检查**: ESLint 规范检查
4. **路由生成**: TanStack Router 代码生成
5. **资源打包**: Vite 构建优化
6. **静态分析**: 代码分割和懒加载

### Docker 部署
```dockerfile
# 多阶段构建
FROM node:18-alpine AS builder
# 安装依赖和构建
...
FROM nginx:alpine AS production
# 复制构建结果和 Nginx 配置
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

### Nginx 配置 (`nginx.conf`)
- **静态文件服务**: 高性能静态资源服务
- **API 反向代理**: 转发 API 请求到后端
- **Gzip 压缩**: 响应内容压缩优化
- **缓存策略**: 静态资源缓存配置

## 测试与质量

### 开发工具
- **TanStack Router Devtools**: 路由调试工具
- **React DevTools**: React 组件调试
- **Vite 热重载**: 快速开发反馈
- **ESLint**: 代码质量检查

### 错误处理
```javascript
// API 错误处理示例
try {
  const result = await apiCall()
  setData(result)
} catch (err) {
  setError(err.message)
  console.error('操作失败:', err)
}
```

### 性能优化
- **代码分割**: 路由级别的懒加载
- **资源优化**: 图片和字体文件优化
- **缓存策略**: HTTP 缓存和本地存储
- **Bundle 分析**: 构建产物分析和优化

## 常见问题 (FAQ)

### Q: 如何添加新的路由页面？
A: 在 `src/routes/` 目录下创建新的 `.tsx` 文件，遵循 TanStack Router 的文件约定

### Q: 如何修改 API 请求配置？
A: 编辑 `vite.config.js` 中的代理配置，或修改 `src/api.js` 中的请求函数

### Q: 壁纸加载失败如何处理？
A: 系统会自动降级到默认渐变背景，也可在代码中添加更多降级方案

### Q: 如何自定义样式主题？
A: 修改 TailwindCSS 配置和组件中的样式类名，保持设计系统一致性

## 相关文件清单

### 核心文件
- `src/main.tsx` - 应用入口和路由配置
- `src/api.js` - API 服务和工具函数
- `src/routes/__root.tsx` - 根布局组件
- `src/routes/index.tsx` - 首页组件
- `src/routes/results_.$sessionId.tsx` - 结果页组件

### 配置文件
- `package.json` - 项目依赖和脚本
- `vite.config.js` - Vite 构建配置
- `eslint.config.js` - ESLint 规则配置
- `index.html` - HTML 模板

### 部署文件
- `Dockerfile` - 容器化配置
- `nginx.conf` - Nginx 服务器配置

### 文档文件
- `README.md` - 前端项目文档
- `CHANGELOG.md` - 变更日志
- `CONTRIBUTING.md` - 贡献指南
- `LICENSE` - 开源许可证

---

## 开发建议

### 组件开发指南
1. 使用函数式组件和 React Hooks
2. 保持组件单一职责和可复用性
3. 使用 TypeScript 类型注解（逐步迁移）
4. 遵循现有的设计系统和样式规范

### API 集成建议
1. 统一使用 `src/api.js` 中的函数
2. 添加适当的错误处理和用户反馈
3. 考虑请求防抖和缓存策略
4. 处理网络异常和超时情况

### 性能优化方向
1. 实现更细粒度的代码分割
2. 添加 Service Worker 缓存策略
3. 优化图片和媒体资源加载
4. 考虑虚拟滚动等性能优化技术

### 用户体验提升
1. 添加更多交互动画和过渡效果
2. 实现离线功能和数据同步
3. 优化移动端触摸交互
4. 添加键盘导航和无障碍支持