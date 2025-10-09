# 粤语TTS分词播放器

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)

这是一个基于React的中文分词和粤语语音合成（TTS）应用，可以将中文文本进行分词，并点击单个词语播放粤语语音。

## 在线演示

> 注意：需要先启动后端TTS服务才能正常使用。

## 功能特点

- 📝 中文文本输入
- ✂️ 智能中文分词（基于jieba）
- 🔊 粤语语音合成（支持多种粤语语音）
- 🎯 点击单个词语即可播放语音
- 🎨 现代化UI设计
- 📱 响应式布局，支持移动端

## 技术栈

- **前端**: React + Vite
- **后端API**: FastAPI + edge-tts + jieba
- **样式**: CSS3（渐变、动画、响应式）

## 快速开始

### 前置要求

- Node.js >= 14.0.0
- npm 或 yarn
- TTS服务（后端API服务）

### 安装和运行

### 1. 启动TTS服务

首先确保TTS服务正在运行：

```bash
cd ../tts-service
python -m uvicorn app.main:app --reload
```

TTS服务会在 `http://127.0.0.1:8000` 启动。

### 2. 启动前端应用

```bash
# 安装依赖（如果还没有安装）
npm install

# 启动开发服务器
npm run dev
```

应用会在 `http://localhost:5173` 启动。

## 使用方法

1. 在文本框中输入中文文本，例如："我今天去了北京清华大学"
2. 点击"分词"按钮进行中文分词
3. 分词结果会显示在下方，每个词语都是可点击的
4. 点击任意词语，即可听到该词的粤语发音
5. 可以在顶部选择不同的粤语语音（如女声、男声等）

## API接口说明

### 分词接口
- **URL**: `/api/v1/segment`
- **方法**: POST
- **参数**:
  ```json
  {
    "text": "我来到北京清华大学",
    "mode": "default"
  }
  ```

### TTS生成接口
- **URL**: `/api/v1/generate`
- **方法**: POST
- **参数**:
  ```json
  {
    "text": "你好",
    "voice": "zh-HK-HiuMaanNeural",
    "rate": "+0%",
    "volume": "+0%",
    "pitch": "+0Hz"
  }
  ```

### 获取语音列表
- **URL**: `/api/v1/voices`
- **方法**: GET

## 项目结构

```
cantonese-tts-app/
├── src/
│   ├── api.js          # API调用封装
│   ├── App.jsx         # 主组件
│   ├── App.css         # 样式文件
│   ├── index.css       # 全局样式
│   └── main.jsx        # 入口文件
├── vite.config.js      # Vite配置（包含代理）
├── package.json
└── README.md
```

## 可用的粤语语音

应用会自动从TTS服务获取所有可用的粤语语音（zh-HK），包括：
- zh-HK-HiuMaanNeural（女声）
- zh-HK-WanLungNeural（男声）
- 等等...

## 故障排除

### 1. API调用失败
- 确保TTS服务正在运行（`http://127.0.0.1:8000`）
- 检查Vite代理配置是否正确

### 2. 分词结果为空
- 检查输入的文本是否包含有效的中文字符
- 确认TTS服务的jieba分词功能正常

### 3. 语音无法播放
- 检查浏览器是否支持音频播放
- 确认选择的语音是否可用
- 查看浏览器控制台是否有错误信息

## 构建生产版本

```bash
npm run build
```

构建后的文件会在 `dist` 目录中。

## 开发

```bash
npm run dev
```

## 配置说明

### API端点配置

如需修改后端API地址，编辑 `src/api.js` 文件：

```javascript
const API_BASE_URL = 'http://your-api-server:port';
```

或者修改 `vite.config.js` 中的代理配置：

```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://your-api-server:port',
      changeOrigin: true,
    }
  }
}
```

### 语音配置

默认使用粤语语音（zh-HK），可在应用界面中选择不同的粤语语音。如需使用其他语言，可修改 `App.jsx` 中的语音筛选逻辑。

## 贡献

欢迎提交 Issue 和 Pull Request！

### 开发流程

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解版本更新历史。

## 常见问题

### Q: 为什么语音无法播放？
A: 请确保：
1. TTS服务正在运行
2. 浏览器支持音频播放（现代浏览器均支持）
3. 网络连接正常

### Q: 支持哪些语言？
A: 当前版本主要支持粤语，但可以通过修改配置支持edge-tts提供的所有语言。

### Q: 可以离线使用吗？
A: 不可以，需要连接到TTS服务才能生成语音。

## 相关项目

- [edge-tts](https://github.com/rany2/edge-tts) - 微软Edge TTS服务
- [jieba](https://github.com/fxsjy/jieba) - 中文分词库

## 致谢

- 感谢 [edge-tts](https://github.com/rany2/edge-tts) 提供的TTS服务
- 感谢 [jieba](https://github.com/fxsjy/jieba) 提供的中文分词功能

## License

MIT License - 详见 [LICENSE](LICENSE) 文件

## 联系方式

如有问题或建议，欢迎提交 Issue。
