# 贡献指南

感谢您考虑为粤语TTS分词播放器做出贡献！

## 如何贡献

### 报告Bug

如果您发现了Bug，请创建一个Issue，并包含以下信息：

1. Bug的详细描述
2. 复现步骤
3. 预期行为
4. 实际行为
5. 运行环境（浏览器、Node.js版本等）
6. 截图（如果适用）

### 建议新功能

如果您有新功能的想法，欢迎创建Issue讨论：

1. 功能描述
2. 使用场景
3. 可能的实现方式
4. 是否愿意自己实现

### 提交代码

#### 准备工作

1. Fork本仓库
2. 克隆您的Fork
   ```bash
   git clone https://github.com/your-username/cantonese-tts-app.git
   cd cantonese-tts-app
   ```
3. 安装依赖
   ```bash
   npm install
   ```
4. 创建功能分支
   ```bash
   git checkout -b feature/your-feature-name
   ```

#### 开发规范

1. **代码风格**
   - 使用ESLint配置
   - 保持代码简洁易读
   - 添加必要的注释

2. **提交信息**
   - 使用清晰的提交信息
   - 格式：`类型: 简短描述`
   - 类型包括：
     - `feat`: 新功能
     - `fix`: Bug修复
     - `docs`: 文档更新
     - `style`: 代码格式调整
     - `refactor`: 重构
     - `test`: 测试相关
     - `chore`: 构建/工具相关

   示例：
   ```
   feat: 添加语速调节功能
   fix: 修复分词结果为空的问题
   docs: 更新API文档
   ```

3. **测试**
   - 确保现有功能正常工作
   - 测试新功能在不同浏览器中的表现
   - 测试响应式布局

#### 提交流程

1. 提交更改
   ```bash
   git add .
   git commit -m "feat: 添加新功能"
   ```

2. 推送到您的Fork
   ```bash
   git push origin feature/your-feature-name
   ```

3. 创建Pull Request
   - 访问原仓库
   - 点击"New Pull Request"
   - 选择您的分支
   - 填写PR描述：
     - 更改的内容
     - 相关Issue（如有）
     - 测试情况
     - 截图（如适用）

4. 等待审核
   - 维护者会审核您的代码
   - 可能会提出修改建议
   - 请及时响应反馈

## 开发环境设置

### 前置要求

- Node.js >= 14.0.0
- npm 或 yarn
- Git
- 代码编辑器（推荐VSCode）

### 推荐的VSCode插件

- ESLint
- Prettier
- ES7+ React/Redux/React-Native snippets

### 本地开发

1. 启动TTS服务（后端）
   ```bash
   cd ../tts-service
   python -m uvicorn app.main:app --reload
   ```

2. 启动前端开发服务器
   ```bash
   npm run dev
   ```

3. 访问 http://localhost:5173

## 代码审查标准

Pull Request会从以下方面进行审查：

- [ ] 代码符合项目风格
- [ ] 功能正常工作
- [ ] 没有引入新的Bug
- [ ] 没有安全问题
- [ ] 文档已更新（如需要）
- [ ] 提交信息清晰

## 问题和讨论

如果您有任何问题，可以：

1. 查看现有的Issues和Discussions
2. 创建新的Issue
3. 在Pull Request中提问

## 行为准则

请保持友好、尊重和包容的态度。我们欢迎所有人的贡献！

## 联系方式

如有疑问，请通过Issue联系维护者。

---

再次感谢您的贡献！🎉
