# Node.js 学习指南

Node.js 是一个基于 Chrome V8 引擎的 JavaScript 运行时环境，让 JavaScript 能够在服务器端运行。本指南提供了从入门到精通的完整学习路径。

## 📚 学习路径

### 🌟 基础入门
- [Node.js 基础](./basics.md) - 安装、基本概念、模块系统、事件循环
- [核心模块](./core-modules.md) - fs、path、http、events、stream 等核心模块
- [包管理](./package-management.md) - npm、yarn、pnpm、package.json 管理
- [异步编程](./async-programming.md) - 回调、Promise、async/await、事件驱动

### 🚀 Web 开发
- [Express 框架](./express.md) - Web 应用开发、中间件、路由、模板引擎
- [NestJS 框架](./nestjs.md) - 企业级 TypeScript 框架
- [数据库操作](./database.md) - MongoDB、MySQL、Redis 集成与 ORM
- [WebSocket 实时通信](./websocket.md) - Socket.IO、原生 WebSocket、实时应用
- [GraphQL](./graphql.md) - GraphQL 服务器、Schema 设计、查询优化

### 🏗️ 架构设计
- [微服务架构](./microservices.md) - 服务拆分、通信、发现、网关设计
- [错误处理](./error-handling.md) - 异常捕获、错误恢复、监控报告
- [安全最佳实践](./security.md) - 认证授权、数据加密、攻击防护

### ⚡ 性能与运维
- [性能优化](./performance.md) - 性能监控、内存管理、CPU 优化
- [测试](./testing.md) - 单元测试、集成测试、端到端测试
- [监控与日志](./monitoring.md) - 应用监控、日志管理、告警系统
- [部署](./deployment.md) - 生产环境部署、Docker、Kubernetes、CI/CD
- [故障排查](./troubleshooting.md) - 问题诊断、性能分析、调试技巧

## 🎯 核心特性

### 🚀 事件驱动架构
Node.js 采用事件驱动、非阻塞 I/O 模型，使其轻量且高效，特别适合构建数据密集型的实时应用。

### 📦 丰富的生态系统
npm 拥有世界上最大的开源库生态系统，提供超过 100 万个包，涵盖各种开发需求。

### 🔄 单线程事件循环
基于事件循环的单线程模型，避免了传统多线程编程的复杂性，同时通过 Worker Threads 支持 CPU 密集型任务。

### ⚡ 高性能运行时
基于 Chrome V8 引擎，提供出色的 JavaScript 执行性能，支持最新的 ECMAScript 特性。

### 🌐 跨平台支持
支持 Windows、macOS、Linux 等多个平台，提供一致的开发体验。

## 💡 学习建议

### 📖 学习策略
1. **循序渐进**：从基础概念开始，逐步深入高级主题
2. **实践为主**：通过实际项目来巩固所学知识
3. **关注生态**：了解 Node.js 生态系统中的优秀工具和库
4. **性能意识**：始终关注代码的性能和最佳实践
5. **社区参与**：积极参与开源项目和技术社区

### 🛠️ 开发环境
- **Node.js 版本管理**：使用 nvm 或 fnm 管理多个 Node.js 版本
- **代码编辑器**：推荐 VS Code 配合 Node.js 扩展
- **调试工具**：掌握 Node.js 内置调试器和 Chrome DevTools
- **性能分析**：学习使用 clinic.js、0x 等性能分析工具

### 📋 学习检查清单

#### 基础阶段 ✅
- [ ] 理解 Node.js 运行原理和事件循环
- [ ] 掌握模块系统（CommonJS 和 ES Modules）
- [ ] 熟练使用核心模块（fs、path、http 等）
- [ ] 理解异步编程模式
- [ ] 掌握 npm 包管理

#### 进阶阶段 🚀
- [ ] 熟练使用 Express.js 构建 Web 应用
- [ ] 掌握数据库集成和 ORM 使用
- [ ] 理解 RESTful API 和 GraphQL 设计
- [ ] 掌握 WebSocket 实时通信
- [ ] 学会错误处理和日志管理

#### 高级阶段 🏆
- [ ] 掌握微服务架构设计
- [ ] 理解性能优化技术
- [ ] 掌握安全最佳实践
- [ ] 学会测试驱动开发
- [ ] 掌握生产环境部署和运维

## 🔗 推荐资源

### 📚 官方文档
- [Node.js 官方文档](https://nodejs.org/docs/) - 最权威的技术文档
- [npm 官方文档](https://docs.npmjs.com/) - 包管理器使用指南
- [Express.js 官方文档](https://expressjs.com/) - 最流行的 Web 框架

### 🌟 最佳实践
- [Node.js 最佳实践](https://github.com/goldbergyoni/nodebestpractices) - 社区总结的最佳实践
- [Node.js 安全检查清单](https://blog.risingstack.com/node-js-security-checklist/) - 安全开发指南
- [Node.js 性能优化指南](https://nodejs.org/en/docs/guides/simple-profiling/) - 官方性能优化指南

### 🛠️ 开发工具
- [nodemon](https://nodemon.io/) - 自动重启开发服务器
- [PM2](https://pm2.keymetrics.io/) - 生产环境进程管理
- [clinic.js](https://clinicjs.org/) - 性能分析工具套件
- [ESLint](https://eslint.org/) - JavaScript 代码检查工具

### 📖 学习资源
- [Node.js 设计模式](https://www.nodejsdesignpatterns.com/) - 深入理解 Node.js 设计模式
- [You Don't Know Node](https://github.com/azat-co/you-dont-know-node) - Node.js 进阶知识
- [Node.js 实战](https://www.manning.com/books/node-js-in-action-second-edition) - 实战项目教程

### 🎥 视频教程
- [Node.js 官方 YouTube 频道](https://www.youtube.com/nodejs) - 官方技术分享
- [Node.js 会议视频](https://www.youtube.com/results?search_query=nodejs+conference) - 技术大会分享
