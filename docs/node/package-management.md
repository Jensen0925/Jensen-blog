# Node.js 包管理

包管理是 Node.js 生态系统的核心组成部分。npm（Node Package Manager）是 Node.js 的默认包管理器，还有其他优秀的包管理器如 Yarn 和 pnpm。

## npm 基础

### 什么是 npm？

npm 是世界上最大的软件注册表，包含超过 100 万个包。它既是一个在线仓库，也是一个命令行工具。

### npm 的作用

- **包安装**：安装和管理项目依赖
- **版本管理**：管理包的版本
- **脚本运行**：运行项目脚本
- **包发布**：发布自己的包到 npm 仓库

## package.json 详解

`package.json` 是 Node.js 项目的核心配置文件。

### 创建 package.json

```bash
# 交互式创建
npm init

# 使用默认值快速创建
npm init -y

# 使用自定义默认值
npm config set init-author-name "Your Name"
npm config set init-author-email "your.email@example.com"
npm config set init-license "MIT"
```

### package.json 结构

```json
{
  "name": "my-awesome-project",
  "version": "1.0.0",
  "description": "一个很棒的 Node.js 项目",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "build": "webpack --mode production",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "prepare": "husky install"
  },
  "keywords": [
    "nodejs",
    "javascript",
    "web",
    "api"
  ],
  "author": {
    "name": "Your Name",
    "email": "your.email@example.com",
    "url": "https://yourwebsite.com"
  },
  "license": "MIT",
  "homepage": "https://github.com/username/my-awesome-project#readme",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/username/my-awesome-project.git"
  },
  "bugs": {
    "url": "https://github.com/username/my-awesome-project/issues"
  },
  "engines": {
    "node": ">=14.0.0",
    "npm": ">=6.0.0"
  },
  "dependencies": {
    "express": "^4.18.2",
    "lodash": "^4.17.21",
    "mongoose": "^7.0.3"
  },
  "devDependencies": {
    "nodemon": "^2.0.22",
    "jest": "^29.5.0",
    "eslint": "^8.39.0",
    "prettier": "^2.8.8",
    "husky": "^8.0.3"
  },
  "peerDependencies": {
    "react": ">=16.8.0"
  },
  "optionalDependencies": {
    "fsevents": "^2.3.2"
  },
  "bundledDependencies": [
    "some-package"
  ],
  "private": false,
  "workspaces": [
    "packages/*"
  ]
}
```

### 字段说明

::: code-group

```json [基本信息]
{
  "name": "项目名称（必须）",
  "version": "版本号（必须，遵循 SemVer）",
  "description": "项目描述",
  "main": "入口文件",
  "type": "module | commonjs",
  "keywords": ["搜索关键词"],
  "author": "作者信息",
  "license": "许可证"
}
```

```json [脚本和依赖]
{
  "scripts": {
    "命令名": "要执行的命令"
  },
  "dependencies": {
    "生产环境依赖": "版本号"
  },
  "devDependencies": {
    "开发环境依赖": "版本号"
  }
}
```

```json [高级配置]
{
  "engines": {
    "node": "Node.js 版本要求",
    "npm": "npm 版本要求"
  },
  "peerDependencies": {
    "同伴依赖": "版本号"
  },
  "private": true,
  "workspaces": ["工作区配置"]
}
```

:::

## 依赖管理

### 安装依赖

```bash
# 安装生产依赖
npm install express
npm install express mongoose lodash
npm i express  # 简写

# 安装开发依赖
npm install --save-dev nodemon
npm install -D jest eslint prettier

# 安装全局包
npm install -g nodemon
npm install --global @vue/cli

# 安装特定版本
npm install express@4.18.2
npm install lodash@^4.17.0  # 兼容版本
npm install react@~16.8.0   # 近似版本

# 从 GitHub 安装
npm install user/repo
npm install https://github.com/user/repo.git
npm install git+ssh://git@github.com:user/repo.git

# 从本地路径安装
npm install ../my-package
npm install file:../my-package
```

### 版本号规则 (SemVer)

```bash
# 版本号格式：主版本号.次版本号.修订号
# 例如：1.2.3

# 版本范围符号
^1.2.3   # 兼容版本：>=1.2.3 <2.0.0
~1.2.3   # 近似版本：>=1.2.3 <1.3.0
1.2.3    # 精确版本：=1.2.3
>=1.2.3  # 大于等于：>=1.2.3
<1.2.3   # 小于：<1.2.3
1.2.x    # 通配符：>=1.2.0 <1.3.0
*        # 任意版本
latest   # 最新版本
```

### 查看和更新依赖

```bash
# 查看已安装的包
npm list
npm ls
npm ls --depth=0  # 只显示顶级依赖
npm ls express    # 查看特定包

# 查看全局包
npm list -g
npm ls -g --depth=0

# 查看包信息
npm info express
npm view express
npm show express versions --json  # 查看所有版本

# 检查过时的包
npm outdated
npm outdated -g  # 全局包

# 更新包
npm update
npm update express
npm update -g     # 更新全局包

# 更新到最新版本
npm install express@latest
```

### 卸载依赖

```bash
# 卸载包
npm uninstall express
npm remove express
npm rm express

# 卸载开发依赖
npm uninstall -D nodemon

# 卸载全局包
npm uninstall -g nodemon
```

## npm 脚本

### 基本脚本

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest",
    "build": "webpack --mode production",
    "clean": "rm -rf dist/"
  }
}
```

### 运行脚本

```bash
# 运行脚本
npm run start
npm run dev
npm run test
npm run build

# 特殊脚本可以省略 run
npm start
npm test

# 传递参数
npm run test -- --watch
npm run build -- --env=production
```

### 高级脚本技巧

```json
{
  "scripts": {
    "prebuild": "npm run clean",
    "build": "webpack --mode production",
    "postbuild": "npm run test",
    
    "clean": "rimraf dist/",
    "clean:cache": "npm cache clean --force",
    
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "prettier --write src/",
    
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "nodemon server.js",
    "dev:client": "webpack serve --mode development",
    
    "deploy": "npm run build && npm run deploy:prod",
    "deploy:prod": "rsync -avz dist/ user@server:/var/www/html/"
  }
}
```

### 脚本中的环境变量

```json
{
  "scripts": {
    "start:dev": "NODE_ENV=development node server.js",
    "start:prod": "NODE_ENV=production node server.js",
    "cross-platform": "cross-env NODE_ENV=production node server.js"
  }
}
```

## package-lock.json

### 作用和重要性

`package-lock.json` 锁定依赖的确切版本，确保团队成员和生产环境使用相同的依赖版本。

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "lockfileVersion": 2,
  "requires": true,
  "packages": {
    "": {
      "name": "my-project",
      "version": "1.0.0",
      "dependencies": {
        "express": "^4.18.2"
      }
    },
    "node_modules/express": {
      "version": "4.18.2",
      "resolved": "https://registry.npmjs.org/express/-/express-4.18.2.tgz",
      "integrity": "sha512-...",
      "dependencies": {
        "accepts": "~1.3.8"
      }
    }
  }
}
```

### 最佳实践

```bash
# 提交 package-lock.json 到版本控制
git add package-lock.json

# 使用 npm ci 在生产环境安装
npm ci  # 更快、更可靠的安装方式

# 更新 lock 文件
npm install  # 会自动更新 lock 文件
npm update   # 更新依赖并更新 lock 文件
```

## npm 配置

### 查看和设置配置

```bash
# 查看所有配置
npm config list
npm config ls -l  # 显示所有配置项

# 查看特定配置
npm config get registry
npm config get cache

# 设置配置
npm config set registry https://registry.npm.taobao.org/
npm config set cache /path/to/cache
npm config set init-author-name "Your Name"

# 删除配置
npm config delete registry

# 编辑配置文件
npm config edit
```

### 常用配置项

```bash
# 设置淘宝镜像
npm config set registry https://registry.npmmirror.com/

# 设置代理
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080

# 设置缓存目录
npm config set cache /path/to/npm-cache

# 设置全局安装目录
npm config set prefix /path/to/global

# 设置日志级别
npm config set loglevel info

# 设置默认值
npm config set init-license MIT
npm config set init-version 0.1.0
```

### .npmrc 文件

```bash
# 项目级配置文件 .npmrc
registry=https://registry.npmmirror.com/
save-exact=true
engine-strict=true

# 用户级配置文件 ~/.npmrc
init-author-name=Your Name
init-author-email=your.email@example.com
init-license=MIT
```

## npm 缓存管理

```bash
# 查看缓存信息
npm cache verify

# 清理缓存
npm cache clean --force

# 查看缓存目录
npm config get cache

# 设置缓存目录
npm config set cache /new/cache/path
```

## 发布包到 npm

### 准备发布

```bash
# 注册 npm 账户
npm adduser
# 或登录
npm login

# 查看当前用户
npm whoami
```

### 包的基本结构

```
my-package/
├── package.json
├── README.md
├── LICENSE
├── index.js
├── lib/
│   └── utils.js
├── test/
│   └── index.test.js
└── .npmignore
```

### package.json 配置

```json
{
  "name": "my-awesome-package",
  "version": "1.0.0",
  "description": "一个很棒的 npm 包",
  "main": "index.js",
  "files": [
    "lib",
    "index.js",
    "README.md"
  ],
  "scripts": {
    "test": "jest",
    "prepublishOnly": "npm test"
  },
  "keywords": [
    "utility",
    "helper",
    "javascript"
  ],
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/username/my-awesome-package.git"
  },
  "bugs": {
    "url": "https://github.com/username/my-awesome-package/issues"
  },
  "homepage": "https://github.com/username/my-awesome-package#readme"
}
```

### .npmignore 文件

```bash
# .npmignore
test/
*.test.js
.nyc_output/
coverage/
.env
.DS_Store
node_modules/
src/
.babelrc
webpack.config.js
```

### 发布流程

```bash
# 检查包内容
npm pack
# 这会创建一个 .tgz 文件，可以检查包含的文件

# 测试发布（不会真正发布）
npm publish --dry-run

# 发布包
npm publish

# 发布 beta 版本
npm publish --tag beta

# 更新版本并发布
npm version patch  # 修订版本 1.0.0 -> 1.0.1
npm version minor  # 次版本 1.0.0 -> 1.1.0
npm version major  # 主版本 1.0.0 -> 2.0.0
npm publish
```

### 管理已发布的包

```bash
# 查看包信息
npm view my-package

# 撤销发布（72小时内）
npm unpublish my-package@1.0.0
npm unpublish my-package --force

# 废弃包版本
npm deprecate my-package@1.0.0 "This version has security issues"

# 查看下载统计
npm view my-package downloads
```

## Yarn 包管理器

### 安装 Yarn

```bash
# 使用 npm 安装
npm install -g yarn

# 使用 Homebrew (macOS)
brew install yarn

# 检查版本
yarn --version
```

### Yarn 基本命令

```bash
# 初始化项目
yarn init
yarn init -y

# 安装依赖
yarn install
yarn  # 简写

# 添加依赖
yarn add express
yarn add -D nodemon  # 开发依赖
yarn add -P lodash   # 生产依赖

# 升级依赖
yarn upgrade
yarn upgrade express

# 移除依赖
yarn remove express

# 运行脚本
yarn start
yarn run build

# 全局安装
yarn global add nodemon
yarn global list
yarn global remove nodemon
```

### Yarn vs npm

::: code-group

```bash [npm]
npm install
npm install express
npm install -D nodemon
npm uninstall express
npm run start
npm update
npm list
```

```bash [Yarn]
yarn
yarn add express
yarn add -D nodemon
yarn remove express
yarn start
yarn upgrade
yarn list
```

:::

### yarn.lock 文件

```yaml
# yarn.lock
express@^4.18.2:
  version "4.18.2"
  resolved "https://registry.yarnpkg.com/express/-/express-4.18.2.tgz"
  integrity sha512-...
  dependencies:
    accepts "~1.3.8"
    array-flatten "1.1.1"
```

## pnpm 包管理器

### 安装 pnpm

```bash
# 使用 npm 安装
npm install -g pnpm

# 使用脚本安装
curl -fsSL https://get.pnpm.io/install.sh | sh -

# 检查版本
pnpm --version
```

### pnpm 特点

- **节省磁盘空间**：使用硬链接和符号链接
- **更快的安装速度**：并行安装和缓存机制
- **严格的依赖管理**：避免幽灵依赖

### pnpm 基本命令

```bash
# 安装依赖
pnpm install
pnpm i

# 添加依赖
pnpm add express
pnpm add -D nodemon

# 移除依赖
pnpm remove express

# 更新依赖
pnpm update
pnpm up

# 运行脚本
pnpm start
pnpm run build

# 全局安装
pnpm add -g nodemon
```

## 工作区 (Workspaces)

### npm Workspaces

```json
{
  "name": "my-monorepo",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ]
}
```

```bash
# 安装所有工作区依赖
npm install

# 为特定工作区添加依赖
npm install express --workspace=packages/api

# 运行所有工作区的脚本
npm run test --workspaces

# 运行特定工作区的脚本
npm run build --workspace=packages/ui
```

### Yarn Workspaces

```json
{
  "private": true,
  "workspaces": {
    "packages": [
      "packages/*"
    ]
  }
}
```

```bash
# 安装依赖
yarn install

# 为工作区添加依赖
yarn workspace api add express

# 运行工作区脚本
yarn workspace ui run build

# 运行所有工作区脚本
yarn workspaces run test
```

## 安全性

### 审计依赖

```bash
# npm 安全审计
npm audit
npm audit --audit-level moderate
npm audit fix
npm audit fix --force

# Yarn 安全审计
yarn audit
yarn audit --level moderate

# 使用 snyk
npm install -g snyk
snyk test
snyk fix
```

### 最佳安全实践

```bash
# 使用 .nvmrc 锁定 Node.js 版本
echo "14.17.0" > .nvmrc

# 定期更新依赖
npm update
npm outdated

# 使用 npm ci 在生产环境
npm ci --only=production

# 检查许可证
npm install -g license-checker
license-checker
```

## 性能优化

### 加速安装

```bash
# 使用淘宝镜像
npm config set registry https://registry.npmmirror.com/

# 使用 npm ci
npm ci  # 比 npm install 更快

# 并行安装
npm install --prefer-offline
npm install --no-audit
npm install --no-fund

# 使用 pnpm
pnpm install  # 通常比 npm 和 yarn 更快
```

### 减少包大小

```bash
# 分析包大小
npm install -g bundlephobia
bundlephobia express

# 使用 webpack-bundle-analyzer
npm install -D webpack-bundle-analyzer

# 移除未使用的依赖
npm install -g depcheck
depcheck
```

## 故障排除

### 常见问题

```bash
# 清理缓存
npm cache clean --force
yarn cache clean
pnpm store prune

# 删除 node_modules 重新安装
rm -rf node_modules package-lock.json
npm install

# 权限问题
sudo chown -R $(whoami) ~/.npm

# 网络问题
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080

# 版本冲突
npm ls
npm dedupe
```

### 调试技巧

```bash
# 详细日志
npm install --loglevel verbose
npm install --loglevel silly

# 查看安装过程
npm install --dry-run

# 检查配置
npm config list
npm doctor
```

## 最佳实践

1. **版本管理**：使用语义化版本控制
2. **锁定文件**：提交 lock 文件到版本控制
3. **安全审计**：定期运行安全审计
4. **依赖更新**：定期更新依赖包
5. **脚本组织**：合理组织 npm 脚本
6. **环境隔离**：区分开发和生产依赖
7. **文档完善**：编写清晰的 README 和文档
8. **测试覆盖**：确保包的质量

## 下一步

掌握包管理后，你可以继续学习：

- [数据库操作](./database.md) - 集成数据库
- [测试](./testing.md) - 编写测试
- [性能优化](./performance.md) - 优化应用性能