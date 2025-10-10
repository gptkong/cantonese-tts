# Docker 部署指南

本文档介绍如何使用 Docker 和 Docker Compose 部署粤语 TTS 应用。

## 目录

- [快速开始](#快速开始)
- [环境配置](#环境配置)
- [部署场景](#部署场景)
- [生产环境部署](#生产环境部署)
- [故障排查](#故障排查)

## 快速开始

### 前置要求

- Docker 20.10+
- Docker Compose 1.29+

### 基本部署（无 Redis）

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd cantonese-tts
   ```

2. **启动服务**
   ```bash
   docker-compose up -d
   ```

3. **访问应用**
   - 前端：http://localhost
   - 后端 API：http://localhost:8000
   - API 文档：http://localhost:8000/docs

4. **停止服务**
   ```bash
   docker-compose down
   ```

## 环境配置

### 后端环境变量

后端支持通过环境变量配置 Redis 和会话管理。

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `REDIS_ENABLED` | `false` | 是否启用 Redis 持久化存储 |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis 连接 URL |
| `SESSION_TTL_HOURS` | `1` | 临时会话过期时间（小时） |
| `SESSION_CLEANUP_INTERVAL_SECONDS` | `300` | 会话清理间隔（秒） |

### 配置方式

#### 方式 1：直接在 docker-compose.yml 中配置

编辑 `docker-compose.yml`：

```yaml
services:
  tts-service:
    environment:
      - REDIS_ENABLED=true
      - REDIS_URL=redis://redis:6379/0
      - SESSION_TTL_HOURS=2
```

#### 方式 2：使用 .env 文件

1. 在后端目录创建 `.env` 文件：
   ```bash
   cd backend
   cp .env.example .env
   ```

2. 编辑 `.env` 文件：
   ```bash
   REDIS_ENABLED=true
   REDIS_URL=redis://redis:6379/0
   SESSION_TTL_HOURS=2
   ```

3. 在 `docker-compose.yml` 中引用：
   ```yaml
   services:
     tts-service:
       env_file:
         - ./backend/.env
   ```

## 部署场景

### 场景 1：基础部署（内存会话）

适用于开发环境或小规模使用。

**docker-compose.yml**
```yaml
version: '3.8'

services:
  tts-service:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: tts-service
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - PYTHONUNBUFFERED=1
      - REDIS_ENABLED=false
    networks:
      - app-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: cantonese-tts-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - tts-service
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

### 场景 2：使用本地 Redis（持久化会话）

适用于生产环境，支持会话持久化和跨容器共享。

**docker-compose.yml**
```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: tts-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    networks:
      - app-network

  tts-service:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: tts-service
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - PYTHONUNBUFFERED=1
      - REDIS_ENABLED=true
      - REDIS_URL=redis://redis:6379/0
      - SESSION_TTL_HOURS=1
      - SESSION_CLEANUP_INTERVAL_SECONDS=300
    depends_on:
      - redis
    networks:
      - app-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: cantonese-tts-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - tts-service
    networks:
      - app-network

volumes:
  redis-data:

networks:
  app-network:
    driver: bridge
```

### 场景 3：使用云 Redis（Upstash）

适用于多实例部署或云环境。

**docker-compose.yml**
```yaml
version: '3.8'

services:
  tts-service:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: tts-service
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - PYTHONUNBUFFERED=1
      - REDIS_ENABLED=true
      - REDIS_URL=rediss://default:YOUR_PASSWORD@YOUR_REDIS.upstash.io:6379
      - SESSION_TTL_HOURS=2
    networks:
      - app-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: cantonese-tts-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - tts-service
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

### 场景 4：使用密码保护的 Redis

**docker-compose.yml**
```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: tts-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --requirepass your_redis_password --appendonly yes
    networks:
      - app-network

  tts-service:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: tts-service
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - PYTHONUNBUFFERED=1
      - REDIS_ENABLED=true
      - REDIS_URL=redis://:your_redis_password@redis:6379/0
    depends_on:
      - redis
    networks:
      - app-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: cantonese-tts-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - tts-service
    networks:
      - app-network

volumes:
  redis-data:

networks:
  app-network:
    driver: bridge
```

## 生产环境部署

### 安全性建议

1. **使用环境变量文件保护敏感信息**
   ```bash
   # 不要将 .env 文件提交到 Git
   echo ".env" >> .gitignore
   ```

2. **Redis 密码保护**
   ```bash
   # 生成强密码
   openssl rand -base64 32
   ```

3. **使用 Docker Secrets（Swarm 模式）**
   ```yaml
   services:
     tts-service:
       secrets:
         - redis_password
       environment:
         - REDIS_URL=redis://:$(cat /run/secrets/redis_password)@redis:6379/0

   secrets:
     redis_password:
       file: ./redis_password.txt
   ```

### 性能优化

1. **限制资源使用**
   ```yaml
   services:
     tts-service:
       deploy:
         resources:
           limits:
             cpus: '2'
             memory: 2G
           reservations:
             cpus: '1'
             memory: 1G
   ```

2. **配置 Redis 持久化**
   ```yaml
   redis:
     command: >
       redis-server
       --appendonly yes
       --appendfsync everysec
       --maxmemory 256mb
       --maxmemory-policy allkeys-lru
   ```

### 监控和日志

1. **查看服务日志**
   ```bash
   # 查看所有服务日志
   docker-compose logs -f

   # 查看特定服务日志
   docker-compose logs -f tts-service
   docker-compose logs -f redis
   ```

2. **健康检查**
   ```bash
   # 检查容器状态
   docker-compose ps

   # 检查健康状态
   docker inspect tts-service --format='{{.State.Health.Status}}'
   ```

## 故障排查

### Redis 连接失败

**症状**：后端日志显示 "Failed to connect to Redis"

**解决方案**：
1. 检查 Redis 容器是否运行：
   ```bash
   docker-compose ps redis
   ```

2. 检查 Redis URL 配置：
   ```bash
   docker-compose exec tts-service env | grep REDIS
   ```

3. 手动测试 Redis 连接：
   ```bash
   docker-compose exec tts-service python -c "
   import redis
   r = redis.from_url('redis://redis:6379/0')
   r.ping()
   print('Redis connected successfully')
   "
   ```

### 会话数据丢失

**症状**：重启容器后会话数据消失

**原因**：
- Redis 未启用持久化
- Redis 数据卷未正确配置

**解决方案**：
1. 确认 Redis 数据卷配置：
   ```yaml
   volumes:
     - redis-data:/data
   ```

2. 启用 AOF 持久化：
   ```yaml
   command: redis-server --appendonly yes
   ```

### 前端无法连接后端

**症状**：前端显示网络错误

**解决方案**：
1. 检查网络配置：
   ```bash
   docker network inspect cantonese-tts_app-network
   ```

2. 测试后端连接：
   ```bash
   curl http://localhost:8000/docs
   ```

3. 检查 nginx 配置（如使用反向代理）

## 常用命令

```bash
# 构建并启动
docker-compose up -d --build

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f

# 进入容器
docker-compose exec tts-service bash
docker-compose exec redis redis-cli

# 清理所有数据（包括卷）
docker-compose down -v

# 更新镜像
docker-compose pull
docker-compose up -d
```

## 更新部署

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建并启动
docker-compose up -d --build

# 3. 查看日志确认
docker-compose logs -f
```

---

**部署问题？** 请查看：
- 后端文档：`backend/README.md`
- API 文档：http://localhost:8000/docs
- GitHub Issues
