# Docker 部署指南

本文档介绍如何使用 Docker 一键部署粤语 TTS 分词播放器的前后端服务。

## 目录结构

```
lyric-demo/
├── cantonese-tts-app/      # 前端应用
│   ├── Dockerfile          # 前端 Dockerfile（多阶段构建）
│   ├── nginx.conf          # Nginx 配置文件
│   └── .dockerignore       # Docker 忽略文件
├── tts-service/            # 后端服务
│   ├── Dockerfile          # 后端 Dockerfile
│   └── .dockerignore       # Docker 忽略文件
└── docker-compose.yml      # Docker Compose 编排文件
```

## 前置要求

确保您的系统已安装以下软件：

- [Docker](https://www.docker.com/get-started) (版本 20.10 或更高)
- [Docker Compose](https://docs.docker.com/compose/install/) (版本 2.0 或更高)

验证安装：
```bash
docker --version
docker-compose --version
```

## 快速开始

### 1. 一键启动所有服务

在项目根目录下运行：

```bash
docker-compose up -d
```

这个命令会：
- 自动构建前端和后端的 Docker 镜像
- 启动所有服务（后台运行）
- 配置服务之间的网络连接

### 2. 查看服务状态

```bash
docker-compose ps
```

您应该看到两个服务正在运行：
- `tts-service` - 后端 API 服务（端口 8000）
- `cantonese-tts-frontend` - 前端应用（端口 80）

### 3. 访问应用

- **前端应用**: http://localhost
- **后端 API 文档**: http://localhost:8000/docs
- **API ReDoc 文档**: http://localhost:8000/redoc

### 4. 查看日志

查看所有服务日志：
```bash
docker-compose logs -f
```

查看特定服务日志：
```bash
# 查看后端日志
docker-compose logs -f tts-service

# 查看前端日志
docker-compose logs -f frontend
```

### 5. 停止服务

```bash
# 停止但不删除容器
docker-compose stop

# 停止并删除容器
docker-compose down

# 停止并删除容器、网络、镜像和数据卷
docker-compose down --volumes --rmi all
```

## 服务配置详情

### 后端服务 (tts-service)

**技术栈**:
- Python 3.11
- FastAPI + Uvicorn
- edge-tts + jieba

**端口**: 8000

**健康检查**: 每 30 秒检查一次 `/docs` 端点

### 前端服务 (frontend)

**技术栈**:
- Node.js 20 (构建阶段)
- Nginx Alpine (生产阶段)
- React 18 + Vite

**端口**: 80

**特性**:
- 多阶段构建，优化镜像大小
- Nginx 反向代理，自动转发 `/api` 请求到后端
- 启用 Gzip 压缩

**健康检查**: 每 30 秒检查一次主页

## 自定义配置

### 修改端口

编辑 `docker-compose.yml` 文件中的端口映射：

```yaml
services:
  tts-service:
    ports:
      - "自定义端口:8000"  # 例如 "8080:8000"

  frontend:
    ports:
      - "自定义端口:80"    # 例如 "3000:80"
```

修改后重启服务：
```bash
docker-compose down
docker-compose up -d
```

### 修改 Nginx 配置

如果需要自定义前端的 Nginx 配置，编辑 `cantonese-tts-app/nginx.conf` 文件，然后重新构建：

```bash
docker-compose up -d --build frontend
```

### 环境变量

可以通过创建 `.env` 文件来配置环境变量：

```bash
# .env
BACKEND_PORT=8000
FRONTEND_PORT=80
```

然后在 `docker-compose.yml` 中引用：

```yaml
services:
  tts-service:
    ports:
      - "${BACKEND_PORT}:8000"
```

## 生产环境部署建议

### 1. 使用生产构建

确保前端使用生产模式构建：
```bash
docker-compose build --no-cache
```

### 2. 限制资源使用

在 `docker-compose.yml` 中添加资源限制：

```yaml
services:
  tts-service:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### 3. 添加重启策略

已配置为 `restart: unless-stopped`，服务会在异常退出时自动重启。

### 4. 使用 HTTPS

在生产环境中，建议在 Nginx 中配置 SSL 证书：

1. 将证书文件放在 `cantonese-tts-app/ssl/` 目录
2. 修改 `nginx.conf` 添加 SSL 配置
3. 在 `docker-compose.yml` 中挂载证书目录

### 5. 数据持久化

如果需要持久化数据，可以添加数据卷：

```yaml
services:
  tts-service:
    volumes:
      - ./data:/app/data
```

## 故障排查

### 容器无法启动

1. 检查日志：
```bash
docker-compose logs
```

2. 检查端口占用：
```bash
# Windows
netstat -ano | findstr :80
netstat -ano | findstr :8000

# Linux/Mac
lsof -i :80
lsof -i :8000
```

3. 重新构建镜像：
```bash
docker-compose build --no-cache
docker-compose up -d
```

### API 请求失败

1. 确认后端服务正在运行：
```bash
curl http://localhost:8000/docs
```

2. 检查 Nginx 代理配置：
```bash
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf
```

3. 查看前端容器内的 Nginx 日志：
```bash
docker-compose exec frontend cat /var/log/nginx/error.log
```

### 镜像构建失败

1. 清理 Docker 缓存：
```bash
docker system prune -a
```

2. 确保网络连接正常（需要下载依赖）

3. 检查 Dockerfile 语法

## 常用命令速查

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose stop

# 重启服务
docker-compose restart

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重新构建并启动
docker-compose up -d --build

# 进入容器
docker-compose exec tts-service bash
docker-compose exec frontend sh

# 删除所有容器和镜像
docker-compose down --rmi all --volumes

# 查看资源使用情况
docker stats
```

## 性能优化

### 1. 镜像优化

- 前端使用多阶段构建，最终镜像基于 `nginx:alpine`（约 40MB）
- 后端使用 `python:3.11-slim`，减小镜像体积
- 使用 `.dockerignore` 排除不必要的文件

### 2. 缓存优化

- 前端 Nginx 配置启用了 Gzip 压缩
- 后端 TTS 服务内置了 24 小时语音列表缓存

### 3. 网络优化

- 使用 Docker 内部网络进行服务间通信
- Nginx 作为反向代理，统一处理外部请求

## 安全建议

1. **不要在生产环境暴露不必要的端口**
2. **定期更新基础镜像和依赖**
3. **使用 Docker secrets 管理敏感信息**
4. **启用防火墙规则限制访问**
5. **配置 HTTPS 和安全头部**

## 更新应用

1. 拉取最新代码：
```bash
git pull
```

2. 重新构建并启动：
```bash
docker-compose up -d --build
```

3. 清理旧镜像（可选）：
```bash
docker image prune
```

## 技术支持

如遇问题，请检查：
1. Docker 和 Docker Compose 版本是否满足要求
2. 系统端口是否被占用
3. 网络连接是否正常
4. 日志中的错误信息

---

**祝您使用愉快！** 🚀
