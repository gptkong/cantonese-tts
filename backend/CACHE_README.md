# TTS 缓存系统使用指南

## 概述

TTS 服务现在包含了一个强大的缓存系统，可以显著提高重复请求的响应速度。缓存系统基于文本内容和语音参数生成唯一的缓存键，自动存储和检索生成的音频文件。

## 主要功能

### 🚀 自动缓存
- 所有 TTS 请求默认启用缓存
- 基于文本、语音、语速、音量、音调参数生成唯一缓存键
- 首次请求生成音频并缓存，后续相同请求直接返回缓存

### 📊 缓存管理
- 智能缓存大小管理（默认最大 500MB）
- 自动清理过期缓存项
- LRU（最近最少使用）清理策略
- 详细的缓存统计和监控

### ⚡ 性能优化
- 文件系统缓存存储音频数据
- 内存缓存存储元数据
- 流式传输缓存音频
- 显著减少 TTS 生成时间

## API 端点

### 1. 生成语音（带缓存）
```bash
# 默认启用缓存
curl -X POST "http://127.0.0.1:8000/api/v1/generate" \
     -H "Content-Type: application/json" \
     -d '{"text": "你好,世界!", "voice": "zh-CN-XiaoxiaoNeural"}' \
     --output output.mp3

# 禁用缓存
curl -X POST "http://127.0.0.1:8000/api/v1/generate?use_cache=false" \
     -H "Content-Type: application/json" \
     -d '{"text": "你好,世界!", "voice": "zh-CN-XiaoxiaoNeural"}' \
     --output output.mp3
```

### 2. 缓存统计
```bash
curl "http://127.0.0.1:8000/api/v1/cache/stats"
```

响应示例：
```json
{
    "hits": 150,
    "misses": 50,
    "total_requests": 200,
    "hit_rate": 0.75,
    "cache_size_bytes": 52428800,
    "cache_size_mb": 50.0,
    "max_cache_size_mb": 500.0,
    "files_count": 25
}
```

### 3. 缓存详细信息
```bash
curl "http://127.0.0.1:8000/api/v1/cache/info"
```

### 4. 预加载缓存
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/cache/preload" \
     -H "Content-Type: application/json" \
     -d '{
         "requests": [
             {"text": "你好,世界!", "voice": "zh-CN-XiaoxiaoNeural"},
             {"text": "欢迎使用TTS服务", "voice": "zh-HK-HiuGaaiNeural"}
         ],
         "ttl_hours": 48
     }'
```

### 5. 清理缓存
```bash
# 清理所有缓存
curl -X DELETE "http://127.0.0.1:8000/api/v1/cache/clear"

# 清理过期缓存
curl -X DELETE "http://127.0.0.1:8000/api/v1/cache/clear-expired"
```

## 缓存配置

### 默认配置
- **缓存目录**: `cache/`
- **最大缓存大小**: 500MB
- **默认 TTL**: 7天
- **清理策略**: LRU（最近最少使用）

### 自定义配置
可以在 `app/cache.py` 中修改 `TTSCache` 初始化参数：

```python
tts_cache = TTSCache(
    cache_dir="custom_cache",      # 自定义缓存目录
    max_cache_size_mb=1000,        # 1GB 最大缓存
    default_ttl_hours=24 * 14      # 14天默认 TTL
)
```

## 缓存键生成

缓存键基于以下参数的 SHA-256 哈希：
- 文本内容（去除首尾空格）
- 语音名称
- 语速设置
- 音量设置
- 音调设置

相同参数的请求将生成相同的缓存键，从而实现缓存复用。

## 性能优势

### 典型性能提升
- **首次请求**: 2-5秒（需要生成音频）
- **缓存命中**: 0.1-0.5秒（直接返回缓存）
- **性能提升**: 5-20倍加速

### 适用场景
- 常用短语和问候语
- 重复的系统提示音
- 模板化的语音内容
- 多用户访问相同内容

## 监控和维护

### 缓存监控
```python
# 获取缓存统计
stats = tts_cache.get_stats()
print(f"命中率: {stats['hit_rate']:.2%}")
print(f"缓存大小: {stats['cache_size_mb']} MB")
```

### 定期维护
建议定期执行以下维护操作：

1. **清理过期缓存**（自动执行）
2. **监控缓存大小**
3. **分析缓存命中率**
4. **预加载常用内容**

## 测试缓存功能

运行测试脚本验证缓存功能：

```bash
cd backend
python test_cache.py
```

测试脚本将验证：
- 缓存生成和检索
- 性能提升效果
- 缓存过期机制
- 统计信息准确性

## 故障排除

### 常见问题

1. **缓存目录权限问题**
   - 确保应用有读写缓存目录的权限
   - 检查磁盘空间是否充足

2. **缓存未命中**
   - 检查请求参数是否完全一致
   - 验证缓存是否已过期

3. **性能问题**
   - 监控缓存命中率
   - 考虑增加缓存大小限制
   - 预加载常用内容

### 日志调试
启用详细日志查看缓存操作：

```python
import logging
logging.getLogger('app.cache').setLevel(logging.INFO)
logging.getLogger('app.tts_generator').setLevel(logging.INFO)
```

## 最佳实践

1. **预加载策略**: 为常用内容预加载缓存
2. **监控命中率**: 保持 70% 以上的缓存命中率
3. **定期清理**: 定期清理过期缓存释放空间
4. **合理配置**: 根据使用情况调整缓存大小和 TTL
5. **性能测试**: 定期测试缓存性能和准确性

## 技术实现

### 架构设计
- **缓存层**: 文件系统 + 内存元数据
- **键生成**: SHA-256 哈希确保唯一性
- **存储格式**: MP3 音频文件
- **清理策略**: LRU + TTL 双重机制

### 线程安全
- 异步操作支持
- 并发访问安全
- 原子性文件操作

通过这个缓存系统，TTS 服务的性能得到了显著提升，特别是在处理重复请求时能够提供近乎即时的响应。
