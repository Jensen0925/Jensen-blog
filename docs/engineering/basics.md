# 前端工程化基础

前端工程化是指将前端开发流程规范化、标准化，通过工具增强前端开发效率、质量和可维护性的一系列方案。

## 什么是前端工程化

前端工程化是使用软件工程的技术和方法来进行前端项目的开发、测试、部署和维护的过程。它的目标是提高前端开发效率、代码质量和项目可维护性。

### 前端工程化的核心问题

1. **模块化**：如何将大型应用拆分为小的、可管理的模块
2. **组件化**：如何构建和复用UI组件
3. **规范化**：如何确保代码风格一致、遵循最佳实践
4. **自动化**：如何自动化开发、测试、构建和部署流程

## 模块化

模块化是将复杂系统分解为更小的、独立的、可管理的模块的过程。

### JavaScript模块化发展历程

#### 1. 全局函数（早期）

```javascript
function foo() {
  // ...
}

function bar() {
  foo();
  // ...
}
```

问题：全局命名空间污染、依赖关系不明确

#### 2. 命名空间模式

```javascript
var MyApp = {
  foo: function() {
    // ...
  },
  bar: function() {
    this.foo();
    // ...
  }
};
```

问题：依赖关系仍不明确、私有变量难以实现

#### 3. IIFE（立即调用函数表达式）

```javascript
var Module = (function() {
  var privateVar = 'I am private';
  
  function privateMethod() {
    // ...
  }
  
  return {
    publicVar: 'I am public',
    publicMethod: function() {
      // 可以访问 privateVar 和 privateMethod
      // ...
    }
  };
})();
```

优点：实现了私有变量和方法

#### 4. CommonJS

主要用于服务器端（Node.js），同步加载模块。

```javascript
// math.js
function add(a, b) {
  return a + b;
}

module.exports = {
  add: add
};

// app.js
var math = require('./math');
console.log(math.add(1, 2)); // 3
```

#### 5. AMD (Asynchronous Module Definition)

主要用于浏览器端，异步加载模块。

```javascript
// math.js
define([], function() {
  function add(a, b) {
    return a + b;
  }
  
  return {
    add: add
  };
});

// app.js
require(['math'], function(math) {
  console.log(math.add(1, 2)); // 3
});
```

#### 6. UMD (Universal Module Definition)

兼容CommonJS和AMD的模块定义方式。

```javascript
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(['jquery'], factory);
  } else if (typeof exports === 'object') {
    // CommonJS
    module.exports = factory(require('jquery'));
  } else {
    // 浏览器全局变量
    root.returnExports = factory(root.jQuery);
  }
}(this, function($) {
  // 模块代码
  function myFunc() {};
  return myFunc;
}));
```

#### 7. ES Modules (ESM)

ES6原生支持的模块系统。

```javascript
// math.js
export function add(a, b) {
  return a + b;
}

// app.js
import { add } from './math.js';
console.log(add(1, 2)); // 3
```

### 模块打包工具

随着模块化的发展，需要工具将多个模块打包成浏览器可用的代码。

#### Webpack

Webpack是最流行的模块打包工具之一，它可以处理JavaScript、CSS、图片等各种资源。

```javascript
// webpack.config.js
module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: __dirname + '/dist'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    // ...
  ]
};
```

#### Rollup

Rollup专注于ES模块打包，生成更小、更高效的代码，特别适合库的开发。

```javascript
// rollup.config.js
export default {
  input: 'src/main.js',
  output: {
    file: 'bundle.js',
    format: 'cjs'
  }
};
```

#### Parcel

Parcel是一个零配置的打包工具，对新手友好。

```bash
parcel index.html
```

#### Vite

Vite是一个新型前端构建工具，利用ES模块在开发环境中提供极快的服务器启动和热更新。

```javascript
// vite.config.js
export default {
  // 配置选项
};
```

## 包管理

包管理工具用于安装、更新和管理项目依赖。

### npm (Node Package Manager)

npm是Node.js默认的包管理工具。

```bash
# 初始化项目
npm init

# 安装依赖
npm install react

# 安装开发依赖
npm install --save-dev webpack

# 运行脚本
npm run build
```

#### package.json

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "dependencies": {
    "react": "^17.0.2",
    "react-dom": "^17.0.2"
  },
  "devDependencies": {
    "webpack": "^5.50.0",
    "webpack-cli": "^4.8.0"
  },
  "scripts": {
    "start": "webpack serve --mode development",
    "build": "webpack --mode production"
  }
}
```

### Yarn

Yarn是Facebook开发的替代npm的包管理工具，提供更快的安装速度和更好的依赖锁定。

```bash
# 初始化项目
yarn init

# 安装依赖
yarn add react

# 安装开发依赖
yarn add --dev webpack

# 运行脚本
yarn build
```

### pnpm

pnpm是一个快速、节省磁盘空间的包管理工具，通过硬链接共享依赖。

```bash
# 初始化项目
pnpm init

# 安装依赖
pnpm add react

# 安装开发依赖
pnpm add -D webpack

# 运行脚本
pnpm run build
```

## 构建工具

构建工具用于将源代码转换为可部署的产品代码。

### Babel

Babel是一个JavaScript编译器，可以将ES6+代码转换为向后兼容的JavaScript版本。

```javascript
// babel.config.js
module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        browsers: ['> 1%', 'last 2 versions']
      }
    }],
    '@babel/preset-react'
  ],
  plugins: [
    '@babel/plugin-proposal-class-properties'
  ]
};
```

### PostCSS

PostCSS是一个用JavaScript转换CSS的工具，可以通过插件实现各种功能。

```javascript
// postcss.config.js
module.exports = {
  plugins: [
    require('autoprefixer'),
    require('cssnano')
  ]
};
```

### ESLint

ESLint是一个可配置的JavaScript代码检查工具。

```javascript
// .eslintrc.js
module.exports = {
  extends: 'eslint:recommended',
  rules: {
    'no-console': 'warn',
    'semi': ['error', 'always']
  },
  env: {
    browser: true,
    node: true,
    es6: true
  }
};
```

### Prettier

Prettier是一个代码格式化工具，支持多种语言。

```javascript
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

## 持续集成/持续部署 (CI/CD)

CI/CD是一种自动化软件开发流程的方法，包括持续集成、持续交付和持续部署。

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Use Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '14.x'
    - name: Install dependencies
      run: npm ci
    - name: Run tests
      run: npm test
    - name: Build
      run: npm run build
```

### Jenkins

```groovy
// Jenkinsfile
pipeline {
  agent {
    docker {
      image 'node:14-alpine'
    }
  }
  stages {
    stage('Install') {
      steps {
        sh 'npm ci'
      }
    }
    stage('Test') {
      steps {
        sh 'npm test'
      }
    }
    stage('Build') {
      steps {
        sh 'npm run build'
      }
    }
    stage('Deploy') {
      steps {
        // 部署步骤
      }
    }
  }
}
```

## 前端性能优化

前端性能优化是工程化的重要目标之一。

### 代码分割 (Code Splitting)

```javascript
// webpack.config.js
module.exports = {
  // ...
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendors: {
          test: /[\\]node_modules[\\]/,
          priority: -10
        }
      }
    }
  }
};
```

### 懒加载 (Lazy Loading)

```javascript
// React中的懒加载
import React, { lazy, Suspense } from 'react';

const LazyComponent = lazy(() => import('./LazyComponent'));

function App() {
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <LazyComponent />
      </Suspense>
    </div>
  );
}
```

### 资源压缩

```javascript
// webpack.config.js (生产环境)
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = {
  // ...
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin(),
      new CssMinimizerPlugin()
    ]
  }
};
```

### 缓存策略

```javascript
// webpack.config.js
module.exports = {
  // ...
  output: {
    filename: '[name].[contenthash].js',
    path: __dirname + '/dist'
  }
};
```

## 微前端

微前端是一种将前端应用分解为小的、独立的部分的架构风格，类似于微服务。

### 实现方式

#### 1. 基于iframe

```html
<iframe src="https://app1.example.com"></iframe>
<iframe src="https://app2.example.com"></iframe>
```

#### 2. 基于Web Components

```javascript
class MicroApp extends HTMLElement {
  connectedCallback() {
    const appName = this.getAttribute('name');
    // 加载微应用
    loadApp(appName).then(app => {
      this.appendChild(app);
    });
  }
}

customElements.define('micro-app', MicroApp);
```

```html
<micro-app name="app1"></micro-app>
<micro-app name="app2"></micro-app>
```

#### 3. 使用框架

**Single-SPA**

```javascript
import { registerApplication, start } from 'single-spa';

registerApplication(
  'app1',
  () => import('./app1/main.js'),
  location => location.pathname.startsWith('/app1')
);

registerApplication(
  'app2',
  () => import('./app2/main.js'),
  location => location.pathname.startsWith('/app2')
);

start();
```

**qiankun**

```javascript
import { registerMicroApps, start } from 'qiankun';

registerMicroApps([
  {
    name: 'app1',
    entry: '//localhost:8081',
    container: '#container',
    activeRule: '/app1'
  },
  {
    name: 'app2',
    entry: '//localhost:8082',
    container: '#container',
    activeRule: '/app2'
  }
]);

start();
```

## 前端监控

前端监控是收集和分析前端应用性能和错误数据的过程。

### 性能监控

```javascript
// 使用Performance API
const performanceObserver = new PerformanceObserver(list => {
  list.getEntries().forEach(entry => {
    console.log('Performance Entry:', entry);
  });
});

performanceObserver.observe({ entryTypes: ['navigation', 'resource', 'paint'] });
```

### 错误监控

```javascript
// 全局错误处理
window.addEventListener('error', event => {
  console.error('Caught error:', event.error);
  // 发送错误到服务器
  sendErrorToServer({
    message: event.error.message,
    stack: event.error.stack,
    url: window.location.href
  });
});

// Promise错误处理
window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled rejection:', event.reason);
  // 发送错误到服务器
  sendErrorToServer({
    message: event.reason.message,
    stack: event.reason.stack,
    url: window.location.href
  });
});
```

### 用户行为监控

```javascript
// 点击事件监控
document.addEventListener('click', event => {
  const target = event.target;
  // 记录点击事件
  logUserAction({
    type: 'click',
    element: target.tagName,
    id: target.id,
    class: target.className,
    text: target.textContent,
    url: window.location.href
  });
});
```

## 总结

前端工程化是现代前端开发的重要组成部分，它通过一系列工具和方法，使前端开发更加高效、规范和可维护。随着前端技术的不断发展，工程化的方法和工具也在不断演进，开发者需要不断学习和适应这些变化。