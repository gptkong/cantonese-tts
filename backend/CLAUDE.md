[根目录](../CLAUDE.md) > **backend**

# Backend 模块文档

## 变更记录 (Changelog)

- **2025-10-22**: 初始化后端模块文档，分析核心组件和API结构

## 模块职责

Backend 模块是基于 FastAPI 的 Python 服务，负责提供粤语 TTS 语音合成、中文智能分词、会话管理和缓存功能。该服务采用异步架构，支持高并发请求处理。

## 入口与启动

### 主应用入口: `app/main.py`
- **应用初始化**: FastAPI 应用实例创建，配置 API 文档
- **路由注册**: 所有 API 端点的统一注册
- **生命周期管理**: 应用启动和关闭时的资源管理
- **Redis 连接**: 持久化存储的连接管理

### 启动方式
```bash
# 开发模式
uvicorn app.main:app --reload --log-level debug

# 生产模式
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Docker 容器
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 对外接口

### 核心 API 端点

#### 语音合成 (TTS)
```http
POST /api/v1/generate
Content-Type: application/json

{
  "text": "你好，世界！",
  "voice": "zh-HK-HiuMaanNeural",
  "rate": "+0%",
  "volume": "+0%",
  "pitch": "+0Hz"
}
```
- **功能**: 将文本转换为粤语语音
- **返回**: 流式 MP3 音频数据
- **缓存**: 支持文件级缓存，提高响应速度

#### 文本分词
```http
POST /api/v1/segment
Content-Type: application/json

{
  "text": "我来到北京清华大学",
  "mode": "default"  // default | search | full
}
```
- **功能**: 中文文本智能分词处理
- **返回**: JSON 格式的分词结果
- **模式**: 支持精确、搜索引擎、全模式三种分词方式

#### 语音列表
```http
GET /api/v1/voices
```
- **功能**: 获取所有可用的语音列表
- **缓存**: 24小时缓存策略
- **过滤**: 自动筛选粤语语音 (zh-HK)

#### 会话管理
```http
# 创建会话
POST /api/v1/sessions
{
  "text": "文本内容",
  "voice": "zh-HK-HiuMaanNeural",
  "persistent": false,
  "name": "会话名称（可选）"
}

# 获取会话
GET /api/v1/sessions/{session_id}

# 会话分词
POST /api/v1/sessions/{session_id}/segment
```

### 缓存管理端点
- `GET /api/v1/cache/stats` - 缓存统计信息
- `POST /api/v1/cache/preload` - 预热缓存
- `DELETE /api/v1/cache/clear` - 清空缓存
- `DELETE /api/v1/cache/clear-expired` - 清理过期缓存

## 关键依赖与配置

### 核心依赖 (`requirements.txt`)
```
fastapi>=0.115.0          # Web框架
uvicorn[standard]>=0.30.0 # ASGI服务器
edge-tts>=6.1.0           # 微软TTS引擎
jieba>=0.42.1             # 中文分词库
redis>=5.0.0              # 持久化存储
pydantic>=2.0.0           # 数据验证
aiofiles>=24.1.0          # 异步文件操作
python-dotenv>=1.0.0      # 环境变量管理
```

### 配置管理 (`app/config.py`)
- **环境变量**: 支持通过 `.env` 文件配置
- **Redis 配置**: 连接池和超时设置
- **缓存配置**: TTL、大小限制、清理策略
- **TTS 参数**: 默认语音、语速、音量设置

### 环境变量示例
```bash
# Redis 配置
REDIS_ENABLED=true
REDIS_URL=redis://redis:6379/0

# 缓存配置
CACHE_TTL_HOURS=24
MAX_CACHE_SIZE_MB=500

# 会话配置
SESSION_TTL_HOURS=1
SESSION_CLEANUP_INTERVAL_SECONDS=300
```

## 数据模型

### 请求模型 (`app/models.py`)

#### TTSRequest - 语音合成请求
```python
class TTSRequest(BaseModel):
    text: str                    # 待合成文本（必填）
    voice: str                   # 语音名称（必填）
    rate: Optional[str] = "+0%"  # 语速调整
    volume: Optional[str] = "+0%" # 音量调整
    pitch: Optional[str] = "+0Hz" # 音调调整
```

#### SegmentRequest - 分词请求
```python
class SegmentRequest(BaseModel):
    text: str                           # 待分词文本（必填）
    mode: Optional[str] = "default"     # 分词模式
```

#### SessionCreateRequest - 会话创建请求
```python
class SessionCreateRequest(BaseModel):
    text: str                    # 会话文本（必填）
    voice: str                   # 语音选择（必填）
    name: Optional[str]          # 自定义名称
    ttl_hours: Optional[int]     # 过期时间（小时）
    persistent: bool = False     # 是否持久化
    metadata: Optional[Dict]     # 元数据
```

### 响应模型
- **SessionResponse**: 会话信息响应
- **CacheStats**: 缓存统计信息
- **VoiceInfo**: 语音详细信息

## 核心组件详解

### TTS 生成器 (`app/tts_generator.py`)
- **异步生成**: 基于 edge-tts 的异步语音合成
- **流式处理**: 支持大文本的流式音频输出
- **缓存集成**: 自动缓存生成结果，提高响应速度
- **错误处理**: 完善的异常处理和日志记录

### 缓存系统 (`app/cache.py`)
- **文件缓存**: 本地文件系统存储音频缓存
- **TTL 管理**: 支持过期时间设置和自动清理
- **LRU 策略**: 最近最少使用的缓存淘汰算法
- **统计监控**: 缓存命中率、存储大小等指标

### 会话管理 (`app/session_manager.py`)
- **内存会话**: 临时会话存储，支持 TTL
- **持久化会话**: Redis 存储，跨重启保持
- **自动清理**: 定期清理过期会话
- **并发安全**: 线程安全的会话操作

### 工具函数 (`app/utils.py`)
- **语音验证**: 检查语音名称的有效性
- **文本清理**: 移除特殊字符，优化 TTS 效果
- **分词增强**: 基于句子的智能分词算法
- **错误处理**: 统一的错误处理和日志记录

### API 工具 (`app/api.py`)
- **分句处理**: 智能文本分句算法
- **词汇清理**: 移除非中文字符，优化分词结果
- **格式化**: 统一的数据格式化工具

## 数据存储

### 文件系统缓存
```
backend/cache/
├── {hash1}.mp3    # 缓存的音频文件
├── {hash2}.mp3
└── ...
```
- **命名规则**: 基于请求参数的 SHA256 哈希
- **格式**: MP3 音频文件
- **清理**: 自动删除过期和超限文件

### Redis 持久化存储
```python
# 存储结构
{
    "session:{session_id}": {
        "session_id": "uuid",
        "text": "会话文本",
        "voice": "语音名称",
        "sentences": [...],
        "created_at": "ISO时间戳",
        "metadata": {...}
    }
}
```

## 测试与质量

### API 测试
- **自动化文档**: FastAPI 自动生成的 Swagger UI
- **交互式测试**: `/docs` 端点的在线测试界面
- **数据验证**: Pydantic 模型的自动验证

### 日志记录
```python
# 日志配置示例
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

### 错误处理
- **HTTP 异常**: 标准化的 HTTP 错误响应
- **验证错误**: 请求参数的详细错误信息
- **系统异常**: 内部错误的安全处理

## 性能特性

### 缓存策略
- **命中率优化**: 基于内容哈希的精确匹配
- **预加载**: 支持批量预热常用语音
- **存储优化**: 自动清理过期和超限文件

### 异步处理
- **非阻塞I/O**: 全异步架构，支持高并发
- **流式响应**: 大文件的流式传输
- **连接池**: Redis 连接复用，减少连接开销

### 内存管理
- **会话限制**: 限制内存中会话数量
- **定期清理**: 自动清理过期数据
- **监控指标**: 实时监控内存和缓存使用情况

## 常见问题 (FAQ)

### Q: 如何添加新的语音支持？
A: 直接通过 edge-tts 获取最新的语音列表，无需修改代码

### Q: 缓存文件过多如何处理？
A: 系统会自动清理过期文件，也可通过 API 手动清理

### Q: 如何配置 Redis 连接？
A: 通过环境变量 `REDIS_URL` 配置，支持连接字符串和参数

### Q: 大文本处理性能如何优化？
A: 建议将长文本分段处理，利用缓存和流式响应

## 相关文件清单

### 核心文件
- `app/main.py` - 主应用和路由注册
- `app/tts_generator.py` - TTS 核心逻辑
- `app/models.py` - 数据模型定义
- `app/cache.py` - 缓存系统实现
- `app/session_manager.py` - 会话管理
- `app/utils.py` - 工具函数
- `app/api.py` - API 工具函数
- `app/config.py` - 配置管理
- `app/persistent_store.py` - Redis 持久化

### 配置文件
- `requirements.txt` - Python 依赖
- `Dockerfile` - 容器化配置
- `README.md` - 后端文档

### 文档文件
- `CACHE_README.md` - 缓存系统说明
- `PERSISTENT_SESSIONS.md` - 持久化会话说明

---

## 开发建议

### API 扩展指南
1. 在 `models.py` 中定义新的请求/响应模型
2. 在 `main.py` 中添加新的路由处理函数
3. 更新 API 文档注释
4. 添加适当的错误处理

### 性能优化建议
- 监控缓存命中率，调整 TTL 参数
- 合理设置内存和存储限制
- 使用异步数据库操作
- 考虑添加负载均衡

### 部署注意事项
- 配置适当的资源限制
- 设置健康检查端点
- 配置日志轮转和监控
- 定期备份 Redis 数据