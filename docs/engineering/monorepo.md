# Monorepo 架构与实践

## 什么是 Monorepo

Monorepo（单体仓库）是将多个项目或包放在同一个代码仓库中的软件开发策略。

```
monorepo/
├── packages/
│   ├── web/          # Web 应用
│   ├── mobile/       # 移动应用
│   ├── shared/       # 共享代码
│   └── utils/        # 工具库
├── package.json
└── pnpm-workspace.yaml
```

## Monorepo vs Multirepo

### Multirepo（多仓库）

```
公司 GitHub Organization
├── frontend-web         # 独立仓库
├── frontend-mobile      # 独立仓库  
├── shared-components    # 独立仓库
└── utils               # 独立仓库
```

**优点**：
- 仓库独立，权限控制灵活
- 可以使用不同的技术栈
- 构建和部署独立

**缺点**：
- 代码复用困难
- 依赖管理复杂
- 版本同步困难
- 跨项目修改麻烦

### Monorepo（单仓库）

```
monorepo/
└── packages/
    ├── web/
    ├── mobile/
    ├── shared/
    └── utils/
```

**优点**：
- ✅ 代码共享方便
- ✅ 依赖管理统一
- ✅ 原子化提交（跨项目修改一次提交）
- ✅ 统一的工具链和配置
- ✅ 更好的协作

**缺点**：
- 仓库体积大
- 构建时间可能较长
- 需要特殊工具支持
- 权限控制相对困难

## pnpm Workspace

### 配置 pnpm workspace

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

```json
// package.json (根目录)
{
  "name": "my-monorepo",
  "private": true,
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

### 包之间的依赖

```json
// packages/web/package.json
{
  "name": "@myapp/web",
  "dependencies": {
    "@myapp/shared": "workspace:*",
    "@myapp/utils": "workspace:*"
  }
}

// packages/shared/package.json
{
  "name": "@myapp/shared",
  "dependencies": {
    "@myapp/utils": "workspace:*"
  }
}
```

### pnpm 常用命令

```bash
# 为所有包安装依赖
pnpm install

# 为特定包添加依赖
pnpm add lodash --filter @myapp/web

# 为根目录添加依赖（开发依赖）
pnpm add -Dw typescript

# 运行所有包的脚本
pnpm -r run build

# 并行运行
pnpm -r --parallel run dev

# 运行特定包的脚本
pnpm --filter @myapp/web dev

# 运行依赖关系中的包
pnpm --filter @myapp/web... build
```

## Turborepo

### 安装和配置

```bash
# 安装 Turborepo
pnpm add -Dw turbo
```

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "lint": {},
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### 核心特性

#### 1. 任务编排

```json
{
  "pipeline": {
    "build": {
      // 依赖其他包的 build 任务
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      // 依赖当前包的 build 任务
      "dependsOn": ["build"]
    }
  }
}
```

#### 2. 增量构建

```bash
# 只构建变更的包
turbo run build

# 强制重新构建
turbo run build --force

# 查看会执行哪些任务
turbo run build --dry-run
```

#### 3. 远程缓存

```json
// turbo.json
{
  "remoteCache": {
    "signature": true
  }
}
```

```bash
# 登录 Vercel（使用远程缓存）
npx turbo login

# 链接项目
npx turbo link
```

#### 4. 并行执行

```bash
# 并行运行所有包的 build
turbo run build

# 限制并发数
turbo run build --concurrency=4
```

### 实际项目结构

```
my-monorepo/
├── apps/
│   ├── web/                    # Next.js 应用
│   │   ├── package.json
│   │   ├── src/
│   │   └── tsconfig.json
│   └── docs/                   # VitePress 文档
│       ├── package.json
│       └── docs/
├── packages/
│   ├── ui/                     # UI 组件库
│   │   ├── package.json
│   │   ├── src/
│   │   └── tsconfig.json
│   ├── config/                 # 共享配置
│   │   ├── eslint/
│   │   ├── typescript/
│   │   └── package.json
│   └── utils/                  # 工具函数
│       ├── package.json
│       └── src/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.json
```

## 共享配置

### TypeScript 配置

```json
// packages/config/typescript/base.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}

// packages/config/typescript/react.json
{
  "extends": "./base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2020", "DOM", "DOM.Iterable"]
  }
}

// apps/web/tsconfig.json
{
  "extends": "@myapp/config/typescript/react.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

### ESLint 配置

```javascript
// packages/config/eslint/base.js
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error'
  }
}

// packages/config/eslint/react.js
module.exports = {
  extends: [
    './base.js',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  settings: {
    react: {
      version: 'detect'
    }
  }
}

// apps/web/.eslintrc.js
module.exports = {
  extends: ['@myapp/config/eslint/react']
}
```

## 版本管理

### Changesets

```bash
# 安装
pnpm add -Dw @changesets/cli

# 初始化
pnpm changeset init
```

```json
// .changeset/config.json
{
  "$schema": "https://unpkg.com/@changesets/config@2.3.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

### 使用流程

```bash
# 1. 创建 changeset
pnpm changeset

# 2. 查看将要发布的版本
pnpm changeset status

# 3. 应用版本变更
pnpm changeset version

# 4. 发布
pnpm changeset publish
```

### 自动化发布（GitHub Actions）

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches:
      - main

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm build
      
      - name: Create Release Pull Request or Publish
        uses: changesets/action@v1
        with:
          publish: pnpm changeset publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## 依赖管理策略

### 1. 共享依赖

```json
// 根 package.json
{
  "devDependencies": {
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

### 2. 独立依赖

```json
// packages/web/package.json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}

// packages/mobile/package.json
{
  "dependencies": {
    "react-native": "^0.72.0"
  }
}
```

### 3. Peer Dependencies

```json
// packages/ui/package.json（组件库）
{
  "name": "@myapp/ui",
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  },
  "devDependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

## 构建优化

### 1. 并行构建

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    }
  }
}
```

### 2. 增量构建

```json
// package.json
{
  "scripts": {
    "build": "turbo run build",
    "build:force": "turbo run build --force"
  }
}
```

### 3. 缓存策略

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "outputs": ["dist/**", ".next/**"],
      "env": ["NODE_ENV"]
    }
  }
}
```

## 最佳实践

### 1. 包命名规范

```json
{
  "name": "@scope/package-name"
}
```

```
@myapp/web
@myapp/mobile
@myapp/ui
@myapp/utils
@myapp/config-eslint
@myapp/config-typescript
```

### 2. 项目结构

```
monorepo/
├── apps/           # 应用
│   ├── web/
│   └── mobile/
├── packages/       # 包
│   ├── ui/
│   ├── utils/
│   └── config/
├── tools/          # 开发工具
│   └── scripts/
└── docs/           # 文档
```

### 3. 脚本组织

```json
// package.json（根目录）
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "clean": "turbo run clean && rm -rf node_modules",
    "changeset": "changeset",
    "version": "changeset version",
    "release": "pnpm build && changeset publish"
  }
}
```

### 4. Git Hooks

```bash
# 安装 husky
pnpm add -Dw husky lint-staged

# 初始化
pnpm exec husky install
```

```json
// package.json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm lint-staged
```

## 实战案例

### Vue 生态 Monorepo

```
vue-next/
├── packages/
│   ├── vue/                    # Vue 核心
│   ├── runtime-core/           # 运行时核心
│   ├── runtime-dom/            # DOM 运行时
│   ├── reactivity/             # 响应式系统
│   ├── compiler-core/          # 编译器核心
│   ├── compiler-dom/           # DOM 编译器
│   ├── compiler-sfc/           # 单文件组件编译器
│   └── shared/                 # 共享工具
└── pnpm-workspace.yaml
```

### React 生态 Monorepo

```
react/
├── packages/
│   ├── react/                  # React 核心
│   ├── react-dom/              # React DOM
│   ├── react-reconciler/       # 协调器
│   ├── scheduler/              # 调度器
│   └── shared/                 # 共享工具
└── package.json
```

## 常见问题

### 1. 如何处理循环依赖？

```
A → B → C → A  ❌ 循环依赖
```

**解决方案**：
- 提取共享代码到新包
- 使用依赖注入
- 重新设计包结构

### 2. 如何提高构建速度？

- 使用 Turborepo 缓存
- 配置远程缓存
- 并行构建
- 增量构建

### 3. 如何管理大型 Monorepo？

- 使用 Turborepo 或 Nx
- 配置代码所有者（CODEOWNERS）
- 自动化测试和 CI
- 使用 Git LFS 处理大文件

## 工具对比

| 特性       | Turborepo | Nx   | Lerna |
| ---------- | --------- | ---- | ----- |
| 增量构建   | ✅         | ✅    | ❌     |
| 任务编排   | ✅         | ✅    | ❌     |
| 远程缓存   | ✅         | ✅    | ❌     |
| 依赖图     | ✅         | ✅    | ✅     |
| 代码生成器 | ❌         | ✅    | ❌     |
| 学习曲线   | 低        | 中   | 低    |
| 性能       | 优秀      | 优秀 | 一般  |

## 总结

Monorepo 的核心价值：

1. **代码共享**
   - 更容易复用代码
   - 统一的依赖管理

2. **原子化提交**
   - 跨项目修改一次提交
   - 更好的版本管理

3. **统一工具链**
   - 共享配置
   - 统一的开发体验

4. **更好的协作**
   - 代码可见性高
   - 更容易重构

选择 Monorepo 时考虑：
- 团队规模
- 项目复杂度
- 代码复用需求
- 构建和部署需求

## 相关阅读

- [构建工具](/engineering/build-tools)
- [Git 工作流](/engineering/git-workflow)
- [持续集成与部署](/engineering/testing-and-deployment)

