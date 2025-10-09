# 粤语 TTS 分词播放器

一个智能的粤语文本转语音（TTS）应用，支持中文智能分词和单词级别的粤语语音播放。

## 项目简介

本项目提供了一个现代化的 Web 应用，用户可以输入中文文本，系统会自动进行智能分词，用户可以点击任意单词听取其粤语发音。适用于学习粤语、语言教学、辅助阅读等场景。

## 核心特性

- **智能分词**: 使用 jieba 中文分词引擎，准确分割中文文本
- **粤语 TTS**: 集成 Microsoft Edge TTS，支持多种粤语语音
- **交互式播放**: 点击任意单词即可播放粤语语音
- **多语音选择**: 支持多种粤语语音风格（男声/女声）
- **现代化 UI**: 渐变背景、流畅动画、响应式设计
- **Docker 部署**: 一键部署前后端服务

## 技术栈

### 前端 (frontend/)
- React 18
- Vite 7
- CSS3 动画和渐变
- 响应式设计

### 后端 (backend/)
- Python 3.11
- FastAPI - 现代异步 Web 框架
- edge-tts - Microsoft Edge TTS 引擎
- jieba - 中文分词
- Uvicorn - ASGI 服务器

### 部署
- Docker & Docker Compose
- Nginx (反向代理)

## 项目结构

```
lyric-demo/
├── frontend/              # 前端 React 应用
│   ├── src/              # 源代码
│   ├── public/           # 静态资源
│   ├── Dockerfile        # 前端 Docker 配置
│   ├── nginx.conf        # Nginx 配置
│   └── package.json      # 依赖配置
│
├── backend/              # 后端 FastAPI 服务
│   ├── app/             # 应用代码
│   │   ├── main.py      # 主应用和路由
│   │   ├── models.py    # 数据模型
│   │   ├── tts_generator.py  # TTS 核心逻辑
│   │   └── utils.py     # 工具函数
│   ├── Dockerfile       # 后端 Docker 配置
│   └── requirements.txt # Python 依赖
│
├── docker-compose.yml   # Docker Compose 编排
├── DOCKER-DEPLOY.md     # Docker 部署文档
├── .gitignore          # Git 忽略配置
└── README.md           # 项目文档（本文件）
```

## 快速开始

### 方式一：Docker 一键部署（推荐）

1. **安装 Docker 和 Docker Compose**
   - Docker 20.10+
   - Docker Compose 2.0+

2. **启动所有服务**
   ```bash
   docker-compose up -d
   ```

3. **访问应用**
   - 前端: http://localhost
   - 后端 API 文档: http://localhost:8000/docs

详细的 Docker 部署说明请查看 [DOCKER-DEPLOY.md](./DOCKER-DEPLOY.md)

### 方式二：本地开发部署

#### 后端服务

1. **进入后端目录**
   ```bash
   cd backend
   ```

2. **创建虚拟环境**
   ```bash
   python -m venv venv

   # Windows
   venv\Scripts\activate

   # Linux/Mac
   source venv/bin/activate
   ```

3. **安装依赖**
   ```bash
   pip install -r requirements.txt
   ```

4. **启动服务**
   ```bash
   uvicorn app.main:app --reload
   ```

后端服务将运行在 http://127.0.0.1:8000

#### 前端应用

1. **进入前端目录**
   ```bash
   cd frontend
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   ```

前端应用将运行在 http://localhost:5173

## API 文档

### 主要端点

- `GET /api/v1/voices` - 获取可用的语音列表（缓存）
- `GET /api/v1/list-voices` - 直接获取最新语音列表
- `POST /api/v1/generate` - 生成语音
- `POST /api/v1/tokenize` - 中文文本分词

详细的 API 文档请访问 http://localhost:8000/docs

## 使用示例

1. 在文本框中输入中文文本
2. 系统自动进行智能分词
3. 点击任意单词播放粤语发音
4. 可在下拉菜单中切换不同的粤语语音

## 开发指南

### 前端开发

```bash
cd frontend
npm run dev      # 启动开发服务器
npm run build    # 构建生产版本
npm run preview  # 预览生产版本
npm run lint     # 代码检查
```

### 后端开发

```bash
cd backend
uvicorn app.main:app --reload --log-level debug  # 开发模式
```

### Docker 开发

```bash
# 重新构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 性能优化

- **前端**: Vite 快速构建、懒加载、代码分割
- **后端**: FastAPI 异步处理、语音列表缓存（24小时）、流式响应
- **部署**: Nginx Gzip 压缩、多阶段 Docker 构建

## 浏览器支持

- Chrome/Edge (推荐)
- Firefox
- Safari
- 移动端浏览器

## 许可证

本项目使用 MIT 许可证。详见各子目录的 LICENSE 文件。

## 贡献

欢迎提交 Issue 和 Pull Request！

## 常见问题

### 1. 语音无法播放？
- 检查浏览器是否支持音频播放
- 确认后端服务正常运行
- 查看浏览器控制台错误信息

### 2. Docker 容器启动失败？
- 检查端口是否被占用（80, 8000）
- 查看日志：`docker-compose logs`
- 确保 Docker 服务正常运行

### 3. 分词效果不理想？
- jieba 支持自定义词典
- 可以在 `backend/app/utils.py` 中调整分词参数

## 更新日志

详见 [frontend/CHANGELOG.md](./frontend/CHANGELOG.md)

## 相关链接

- [FastAPI 文档](https://fastapi.tiangolo.com/)
- [Edge TTS](https://github.com/rany2/edge-tts)
- [Jieba 分词](https://github.com/fxsjy/jieba)
- [React 文档](https://react.dev/)
- [Vite 文档](https://vitejs.dev/)

---

**开发愉快！** 如有问题，欢迎提交 Issue。
