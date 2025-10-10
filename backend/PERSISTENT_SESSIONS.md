# 持久化会话功能文档

## 概述

TTS 服务现在支持两种类型的会话：

1. **临时会话**（Temporary Sessions）- 存储在内存中，默认1小时后过期
2. **持久化会话**（Persistent Sessions）- 存储在 Redis 中，永不过期

## 配置

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 启动 Redis（可选）

如果需要使用持久化会话功能，需要先启动 Redis 服务：

```bash
# 使用 Docker 启动 Redis
docker run -d -p 6379:6379 redis:latest

# 或者本地安装 Redis 后启动
redis-server
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 启用 Redis 持久化存储
REDIS_ENABLED=true

# Redis 连接 URL
REDIS_URL=redis://localhost:6379/0

# 会话默认过期时间（小时）
SESSION_TTL_HOURS=1

# 会话清理间隔（秒）
SESSION_CLEANUP_INTERVAL_SECONDS=300
```

## 使用方法

### 创建临时会话（默认）

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/sessions" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "你好，今天天气很好。",
    "voice": "zh-HK-HiuMaanNeural",
    "ttl_hours": 2
  }'
```

响应：
```json
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "text": "你好，今天天气很好。",
  "voice": "zh-HK-HiuMaanNeural",
  "persistent": false,
  "created_at": "2025-10-10T09:30:00.000Z",
  "expires_at": "2025-10-10T11:30:00.000Z",
  "sentences": null,
  "metadata": {}
}
```

### 创建持久化会话

设置 `persistent: true` 即可创建永不过期的会话：

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/sessions" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "这是一个重要的会话，需要永久保存。",
    "voice": "zh-CN-XiaoxiaoNeural",
    "persistent": true,
    "metadata": {
      "type": "important",
      "user_id": "12345"
    }
  }'
```

响应：
```json
{
  "session_id": "b2c3d4e5-f6a7-8901-bcde-f1234567890a",
  "text": "这是一个重要的会话，需要永久保存。",
  "voice": "zh-CN-XiaoxiaoNeural",
  "persistent": true,
  "created_at": "2025-10-10T09:35:00.000Z",
  "expires_at": "2025-10-10T10:35:00.000Z",
  "sentences": null,
  "metadata": {
    "type": "important",
    "user_id": "12345"
  }
}
```

### 获取会话

```bash
curl "http://127.0.0.1:8000/api/v1/sessions/{session_id}"
```

### 更新会话

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/sessions/{session_id}/segment"
```

### 删除会话

```bash
curl -X DELETE "http://127.0.0.1:8000/api/v1/sessions/{session_id}"
```

### 查看会话统计

```bash
curl "http://127.0.0.1:8000/api/v1/sessions/stats"
```

响应：
```json
{
  "temporary_sessions": {
    "total": 10,
    "active": 8,
    "expired": 2
  },
  "persistent_sessions": 5,
  "total_sessions": 15,
  "default_ttl_hours": 1.0,
  "persistent_store_enabled": true
}
```

## 技术细节

### 存储机制

- **临时会话**：存储在应用内存中，重启服务后丢失
- **持久化会话**：存储在 Redis 中，服务重启后依然可用

### 过期策略

- **临时会话**：根据 `ttl_hours` 参数设置过期时间（默认1小时）
- **持久化会话**：永不过期（`is_expired()` 永远返回 `false`）

### 清理机制

- 临时会话：后台任务每5分钟（可配置）自动清理过期会话
- 持久化会话：不会被自动清理，需要手动删除

## 使用场景

### 临时会话适用于：
- 普通用户的短期 TTS 任务
- 不需要长期保存的会话
- 对存储压力敏感的场景

### 持久化会话适用于：
- 重要的会话数据需要永久保存
- 跨服务器实例共享会话数据
- 服务重启后需要恢复的会话
- 需要在多个服务实例间共享的会话

## 故障处理

### Redis 连接失败

如果 Redis 连接失败，应用会：
1. 记录警告日志
2. 禁用持久化会话功能
3. 继续使用内存存储（临时会话）

### 持久化会话创建失败

如果 `persistent: true` 但 Redis 未启用：
- 会话会被创建为临时会话
- 日志中会有相应的警告信息

## 监控和维护

### 查看 Redis 中的会话

```bash
# 连接到 Redis
redis-cli

# 查看所有持久化会话的 key
KEYS persistent_session:*

# 查看特定会话
GET persistent_session:a1b2c3d4-e5f6-7890-abcd-ef1234567890

# 统计持久化会话数量
EVAL "return #redis.call('keys', 'persistent_session:*')" 0
```

### 清理 Redis 中的所有持久化会话

```bash
redis-cli
EVAL "local keys = redis.call('keys', 'persistent_session:*') for i=1,#keys do redis.call('del', keys[i]) end return #keys" 0
```

## 安全考虑

1. **Redis 认证**：生产环境建议配置 Redis 密码
   ```env
   REDIS_URL=redis://username:password@localhost:6379/0
   ```

2. **网络隔离**：建议 Redis 只在内网访问
3. **数据加密**：敏感数据建议加密后存储
4. **访问控制**：限制持久化会话的创建权限

## 性能优化

1. **Redis 连接池**：已自动配置连接池
2. **序列化**：使用 JSON 序列化，轻量高效
3. **异步操作**：所有 Redis 操作都是异步的

## 迁移指南

### 从纯内存会话迁移

1. 启动 Redis 服务
2. 设置环境变量 `REDIS_ENABLED=true`
3. 重启应用
4. 新创建的会话可选择持久化
5. 旧的内存会话会自然过期

### 备份和恢复

```bash
# 备份 Redis 数据
redis-cli BGSAVE

# 恢复数据（复制 dump.rdb 到 Redis 数据目录）
cp dump.rdb /var/lib/redis/
redis-cli
> SHUTDOWN
# 重启 Redis
```
