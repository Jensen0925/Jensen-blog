# Node.js 基础

## 什么是 Node.js？

Node.js 是一个基于 Chrome V8 JavaScript 引擎构建的 JavaScript 运行时环境。它让 JavaScript 能够在服务器端运行，而不仅仅是在浏览器中。

### 主要特点

- **事件驱动**：基于事件循环的异步编程模型
- **非阻塞 I/O**：高效处理并发请求
- **单线程**：避免了线程切换的开销
- **跨平台**：支持 Windows、macOS、Linux

## 安装 Node.js

### 方法一：官方安装包

1. 访问 [Node.js 官网](https://nodejs.org/)
2. 下载 LTS 版本（推荐）
3. 运行安装程序

### 方法二：使用包管理器

::: code-group

```bash [macOS - Homebrew]
# 安装 Homebrew（如果未安装）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装 Node.js
brew install node
```

```bash [Ubuntu/Debian]
# 更新包索引
sudo apt update

# 安装 Node.js
sudo apt install nodejs npm
```

```bash [Windows - Chocolatey]
# 安装 Chocolatey（如果未安装）
# 在管理员权限的 PowerShell 中运行
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 安装 Node.js
choco install nodejs
```

:::

### 方法三：使用版本管理器（推荐）

::: code-group

```bash [nvm (Node Version Manager)]
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 重启终端或运行
source ~/.bashrc

# 安装最新 LTS 版本
nvm install --lts

# 使用特定版本
nvm use 18.17.0

# 查看已安装版本
nvm list
```

```bash [fnm (Fast Node Manager)]
# 安装 fnm
curl -fsSL https://fnm.vercel.app/install | bash

# 重启终端或运行
source ~/.bashrc

# 安装最新 LTS 版本
fnm install --lts

# 使用特定版本
fnm use 18.17.0

# 查看已安装版本
fnm list
```

:::

### 验证安装

```bash
# 检查 Node.js 版本
node --version
# 或
node -v

# 检查 npm 版本
npm --version
# 或
npm -v
```

## 第一个 Node.js 程序

创建一个名为 `hello.js` 的文件：

```javascript
// hello.js
console.log('Hello, Node.js!');
console.log('当前 Node.js 版本:', process.version);
console.log('当前平台:', process.platform);
```

运行程序：

```bash
node hello.js
```

## Node.js 运行时环境

### 全局对象

Node.js 提供了一些全局对象，无需引入即可使用：

```javascript
// 全局对象示例
console.log('__filename:', __filename); // 当前文件的绝对路径
console.log('__dirname:', __dirname);   // 当前目录的绝对路径

// process 对象
console.log('Node.js 版本:', process.version);
console.log('平台:', process.platform);
console.log('架构:', process.arch);
console.log('当前工作目录:', process.cwd());

// 环境变量
console.log('环境变量:', process.env.NODE_ENV);

// 命令行参数
console.log('命令行参数:', process.argv);
```

### 定时器

Node.js 支持浏览器中的定时器 API：

```javascript
// setTimeout
setTimeout(() => {
  console.log('3秒后执行');
}, 3000);

// setInterval
const intervalId = setInterval(() => {
  console.log('每2秒执行一次');
}, 2000);

// 5秒后清除定时器
setTimeout(() => {
  clearInterval(intervalId);
  console.log('定时器已清除');
}, 5000);

// setImmediate（Node.js 特有）
setImmediate(() => {
  console.log('下一个事件循环执行');
});

// process.nextTick（Node.js 特有）
process.nextTick(() => {
  console.log('当前事件循环结束前执行');
});
```

## 模块系统

Node.js 使用 CommonJS 模块系统，也支持 ES6 模块。

### CommonJS 模块

#### 导出模块

```javascript
// math.js
function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

const PI = 3.14159;

// 方式一：逐个导出
exports.add = add;
exports.subtract = subtract;
exports.PI = PI;

// 方式二：整体导出
module.exports = {
  add,
  subtract,
  PI
};

// 方式三：导出单个函数或对象
module.exports = add;
```

#### 导入模块

```javascript
// app.js

// 导入自定义模块
const math = require('./math');
console.log(math.add(5, 3)); // 8

// 解构导入
const { add, subtract } = require('./math');
console.log(add(10, 5));      // 15
console.log(subtract(10, 5)); // 5

// 导入核心模块
const fs = require('fs');
const path = require('path');

// 导入第三方模块
const lodash = require('lodash');
```

### ES6 模块

要使用 ES6 模块，需要在 `package.json` 中设置 `"type": "module"`，或使用 `.mjs` 文件扩展名。

#### 导出模块

```javascript
// math.mjs
export function add(a, b) {
  return a + b;
}

export function subtract(a, b) {
  return a - b;
}

export const PI = 3.14159;

// 默认导出
export default function multiply(a, b) {
  return a * b;
}
```

#### 导入模块

```javascript
// app.mjs

// 命名导入
import { add, subtract, PI } from './math.mjs';
console.log(add(5, 3)); // 8

// 默认导入
import multiply from './math.mjs';
console.log(multiply(4, 5)); // 20

// 混合导入
import multiply, { add, subtract } from './math.mjs';

// 全部导入
import * as math from './math.mjs';
console.log(math.add(2, 3)); // 5
```

### 模块解析

Node.js 按以下顺序查找模块：

1. **核心模块**：如 `fs`、`http`、`path` 等
2. **相对路径**：以 `./` 或 `../` 开头
3. **绝对路径**：以 `/` 开头
4. **node_modules**：在当前目录及父目录的 `node_modules` 中查找

```javascript
// 模块解析示例
require('fs');           // 核心模块
require('./math');       // 相对路径
require('/usr/lib/math'); // 绝对路径
require('lodash');       // node_modules 中的包
```

## 包管理

### package.json

`package.json` 是 Node.js 项目的配置文件：

```json
{
  "name": "my-node-app",
  "version": "1.0.0",
  "description": "我的 Node.js 应用",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "jest"
  },
  "keywords": ["node", "javascript"],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "lodash": "^4.17.21"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.5.0"
  }
}
```

### 初始化项目

```bash
# 创建项目目录
mkdir my-node-app
cd my-node-app

# 初始化 package.json
npm init
# 或使用默认设置
npm init -y
```

### 安装依赖

```bash
# 安装生产依赖
npm install express
npm install lodash

# 安装开发依赖
npm install --save-dev nodemon
npm install -D jest

# 全局安装
npm install -g nodemon

# 安装特定版本
npm install express@4.18.2
```

## 调试 Node.js 应用

### 使用 console.log

```javascript
// 基本调试
console.log('变量值:', variable);
console.error('错误信息:', error);
console.warn('警告信息:', warning);
console.info('信息:', info);

// 格式化输出
console.log('用户: %s, 年龄: %d', name, age);

// 表格输出
console.table([{name: 'Alice', age: 25}, {name: 'Bob', age: 30}]);

// 计时
console.time('操作耗时');
// ... 一些操作
console.timeEnd('操作耗时');
```

### 使用 Node.js 调试器

```bash
# 启动调试模式
node --inspect app.js

# 在第一行暂停
node --inspect-brk app.js

# 使用内置调试器
node inspect app.js
```

### VS Code 调试配置

创建 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "启动程序",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/app.js"
    }
  ]
}
```

## 常用工具

### nodemon

自动重启 Node.js 应用的工具：

```bash
# 安装
npm install -g nodemon

# 使用
nodemon app.js

# 配置文件 nodemon.json
{
  "watch": ["src"],
  "ext": "js,json",
  "ignore": ["node_modules"],
  "exec": "node app.js"
}
```

### pm2

生产环境进程管理器：

```bash
# 安装
npm install -g pm2

# 启动应用
pm2 start app.js

# 查看状态
pm2 status

# 重启应用
pm2 restart app

# 停止应用
pm2 stop app
```

## 最佳实践

1. **使用版本管理器**：如 nvm 或 fnm 管理 Node.js 版本
2. **锁定依赖版本**：使用 `package-lock.json` 或 `yarn.lock`
3. **环境变量**：使用 `.env` 文件管理配置
4. **错误处理**：始终处理异步操作的错误
5. **代码规范**：使用 ESLint 和 Prettier
6. **安全性**：定期更新依赖，使用 `npm audit`

## 下一步

现在你已经掌握了 Node.js 的基础知识，可以继续学习：

- [核心模块](./core-modules.md) - 深入了解 Node.js 核心模块
- [异步编程](./async-programming.md) - 掌握异步编程模式
- [Express 框架](./express.md) - 学习 Web 应用开发