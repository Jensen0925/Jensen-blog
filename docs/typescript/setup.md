# TypeScript 安装与配置

TypeScript 是 JavaScript 的超集，为 JavaScript 添加了静态类型系统。本文将介绍如何安装和配置 TypeScript 开发环境。

## 安装 TypeScript

### 全局安装

```bash
# 使用 npm
npm install -g typescript

# 使用 yarn
yarn global add typescript

# 使用 pnpm
pnpm add -g typescript
```

安装完成后，可以使用 `tsc` 命令：

```bash
# 查看版本
tsc --version

# 编译 TypeScript 文件
tsc hello.ts
```

### 项目安装（推荐）

```bash
# 初始化 npm 项目
npm init -y

# 安装 TypeScript
npm install --save-dev typescript

# 安装 ts-node（可选，用于直接运行 TypeScript）
npm install --save-dev ts-node

# 安装类型定义
npm install --save-dev @types/node
```

## 初始化配置文件

### 创建 tsconfig.json

```bash
# 自动生成配置文件
tsc --init
```

或者手动创建：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "**/*.spec.ts"]
}
```

### 配置说明

#### 编译选项 (compilerOptions)

**目标和模块**

```json
{
  "compilerOptions": {
    // 编译目标版本
    "target": "ES2020",
    
    // 模块系统
    "module": "commonjs", // 或 "ES2020", "ESNext", "AMD", "UMD"
    
    // 包含的库文件
    "lib": ["ES2020", "DOM"],
    
    // 支持 JSX
    "jsx": "react", // 或 "preserve", "react-native", "react-jsx"
  }
}
```

**输出配置**

```json
{
  "compilerOptions": {
    // 输出目录
    "outDir": "./dist",
    
    // 源码根目录
    "rootDir": "./src",
    
    // 生成源映射文件
    "sourceMap": true,
    
    // 生成声明文件
    "declaration": true,
    
    // 声明文件输出目录
    "declarationDir": "./types",
    
    // 删除注释
    "removeComments": true
  }
}
```

**模块解析**

```json
{
  "compilerOptions": {
    // 模块解析策略
    "moduleResolution": "node",
    
    // 基础路径
    "baseUrl": "./",
    
    // 路径映射
    "paths": {
      "@/*": ["src/*"],
      "@utils/*": ["src/utils/*"],
      "@components/*": ["src/components/*"]
    },
    
    // 允许导入 JSON 模块
    "resolveJsonModule": true,
    
    // ESM 和 CommonJS 互操作
    "esModuleInterop": true,
    
    // 允许默认导入没有默认导出的模块
    "allowSyntheticDefaultImports": true
  }
}
```

**类型检查**

```json
{
  "compilerOptions": {
    // 启用所有严格类型检查选项
    "strict": true,
    
    // 以下选项在 strict: true 时自动启用
    "noImplicitAny": true,              // 禁止隐式 any
    "strictNullChecks": true,           // 严格的 null 检查
    "strictFunctionTypes": true,        // 严格的函数类型检查
    "strictBindCallApply": true,        // 严格的 bind/call/apply 检查
    "strictPropertyInitialization": true, // 严格的类属性初始化检查
    "noImplicitThis": true,             // 禁止 this 的隐式 any
    "alwaysStrict": true,               // 总是以严格模式解析
    
    // 额外的检查
    "noUnusedLocals": true,             // 禁止未使用的局部变量
    "noUnusedParameters": true,         // 禁止未使用的参数
    "noImplicitReturns": true,          // 函数必须有返回值
    "noFallthroughCasesInSwitch": true  // switch 语句必须有 break
  }
}
```

**其他选项**

```json
{
  "compilerOptions": {
    // 跳过库文件的类型检查
    "skipLibCheck": true,
    
    // 强制文件名大小写一致
    "forceConsistentCasingInFileNames": true,
    
    // 允许从没有默认导出的模块中默认导入
    "allowSyntheticDefaultImports": true,
    
    // 支持装饰器
    "experimentalDecorators": true,
    
    // 装饰器元数据
    "emitDecoratorMetadata": true,
    
    // 仅检查不编译
    "noEmit": true,
    
    // 增量编译
    "incremental": true,
    
    // 增量编译文件位置
    "tsBuildInfoFile": "./.tsbuildinfo"
  }
}
```

#### 文件包含和排除

```json
{
  // 包含的文件
  "include": [
    "src/**/*",
    "types/**/*"
  ],
  
  // 排除的文件
  "exclude": [
    "node_modules",
    "dist",
    "**/*.spec.ts",
    "**/*.test.ts"
  ],
  
  // 指定具体文件
  "files": [
    "src/index.ts",
    "src/main.ts"
  ]
}
```

## 不同场景的配置

### Node.js 项目配置

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### React 项目配置

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

### Vue 3 项目配置

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "types": ["vite/client"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 库项目配置

```json
{
  "compilerOptions": {
    "target": "ES2015",
    "module": "ESNext",
    "lib": ["ES2020"],
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts"]
}
```

## 项目配置继承

可以使用 `extends` 来继承基础配置：

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}

// tsconfig.json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist"
  }
}
```

### Monorepo 配置示例

```bash
# 项目结构
project/
  ├── packages/
  │   ├── app/
  │   │   └── tsconfig.json
  │   ├── lib/
  │   │   └── tsconfig.json
  │   └── shared/
  │       └── tsconfig.json
  ├── tsconfig.base.json
  └── tsconfig.json
```

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "composite": true,
    "declaration": true,
    "declarationMap": true
  }
}

// packages/app/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "references": [
    { "path": "../shared" },
    { "path": "../lib" }
  ]
}
```

## package.json 配置

```json
{
  "name": "my-typescript-project",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "dev": "ts-node src/index.ts",
    "dev:watch": "ts-node-dev --respawn src/index.ts",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "ts-node": "^10.9.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.0.0"
  }
}
```

## 编辑器配置

### VS Code 配置

创建 `.vscode/settings.json`：

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.updateImportsOnFileMove.enabled": "always"
}
```

### ESLint 配置

```bash
npm install --save-dev @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

```javascript
// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json'
  },
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': 'error'
  }
};
```

### Prettier 配置

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "avoid"
}
```

## 常用工具

### ts-node

直接运行 TypeScript 文件：

```bash
# 安装
npm install --save-dev ts-node

# 使用
ts-node src/index.ts

# 使用 REPL
ts-node
```

### ts-node-dev

开发时自动重启：

```bash
# 安装
npm install --save-dev ts-node-dev

# 使用
ts-node-dev --respawn --transpile-only src/index.ts
```

### tsc-watch

监听文件变化并重新编译：

```bash
# 安装
npm install --save-dev tsc-watch

# 使用
tsc-watch --onSuccess "node dist/index.js"
```

### tsup

快速打包 TypeScript 库：

```bash
# 安装
npm install --save-dev tsup

# 使用
tsup src/index.ts --format cjs,esm --dts
```

## 最佳实践

### 1. 使用严格模式

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

### 2. 配置路径别名

```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

### 3. 启用增量编译

```json
{
  "compilerOptions": {
    "incremental": true
  }
}
```

### 4. 使用项目引用

对于大型项目，使用项目引用可以提高编译速度：

```json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true
  },
  "references": [
    { "path": "./packages/utils" },
    { "path": "./packages/core" }
  ]
}
```

### 5. 跳过库检查

```json
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

## 常见问题

### 问题 1：找不到模块

```bash
# 安装对应的类型定义
npm install --save-dev @types/node
npm install --save-dev @types/express
```

### 问题 2：路径别名无法识别

确保配置了 `baseUrl` 和 `paths`，并且构建工具也配置了相同的别名。

### 问题 3：装饰器报错

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### 问题 4：Cannot find name 'require'

```json
{
  "compilerOptions": {
    "types": ["node"]
  }
}
```

## 总结

TypeScript 的配置虽然选项众多，但掌握核心配置后，就能应对大多数场景。建议：

1. **从简单配置开始**：使用 `tsc --init` 生成默认配置
2. **启用严格模式**：`strict: true` 能帮助发现更多潜在问题
3. **根据项目调整**：不同类型的项目需要不同的配置
4. **使用工具链**：配合 ESLint、Prettier 等工具提高开发体验
5. **参考官方文档**：[TypeScript 配置参考](https://www.typescriptlang.org/tsconfig)

