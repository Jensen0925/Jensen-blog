# TypeScript 学习指南

TypeScript 是 JavaScript 的超集，为 JavaScript 添加了静态类型定义。它由 Microsoft 开发和维护，可以编译为纯 JavaScript，运行在任何支持 JavaScript 的环境中。

## 为什么选择 TypeScript？

### 静态类型检查
在编译时发现错误，而不是运行时。这大大提高了代码的可靠性和可维护性。

```typescript
// 类型错误会在编译时被发现
function greet(name: string): string {
  return `Hello, ${name}!`;
}

greet("Alice"); // 正确
// greet(42); // 错误：类型不匹配
```

### 更好的 IDE 支持
TypeScript 提供了强大的智能提示、自动补全、重构和导航功能，极大提升开发体验。

### 增强的代码可读性
类型注解使代码的意图更加明确，更易于理解和维护。

### 渐进式采用
可以逐步将 JavaScript 项目迁移到 TypeScript，不需要一次性重写所有代码。

### 强大的工具生态
拥有丰富的类型定义（@types）和工具支持，几乎所有流行的 JavaScript 库都有 TypeScript 类型定义。

## 学习路径

TypeScript 的学习可以分为以下几个阶段：

### 第一阶段：基础入门

从安装配置开始，掌握 TypeScript 的基础类型系统和基本语法。

- **[安装与配置](./setup.md)** - 环境搭建、tsconfig.json 配置、编译选项
- **[基础类型](./basic-types.md)** - 布尔、数字、字符串、数组、元组、枚举、any、unknown、void、null、undefined、never 等

**学习建议：**
- 先了解如何安装和配置 TypeScript
- 熟悉所有基础类型及其使用场景
- 理解 any vs unknown 的区别
- 掌握类型推断的基本规则

### 第二阶段：结构化类型

深入学习如何定义和使用复杂的类型结构。

- **[接口](./interface.md)** - 对象接口、函数接口、索引签名、接口继承、类实现接口

**学习建议：**
- 掌握接口的各种用法
- 理解接口与类型别名的区别
- 学会使用接口定义代码契约
- 了解接口的声明合并特性

### 第三阶段：高级类型

掌握 TypeScript 的高级类型特性，编写更加灵活和类型安全的代码。

- **[高级类型](./advanced-types.md)** - 类型别名、联合类型、交叉类型、字面量类型、映射类型、条件类型
- **[类型守护](./type-guards.md)** - typeof、instanceof、in 操作符、自定义类型守护、判别联合
- **[类型操控与校验](./type-manipulation.md)** - satisfies、as、as const、is、asserts、keyof、typeof、in、extends、infer

**学习建议：**
- 理解联合类型和交叉类型的应用场景
- 掌握类型守护的各种方式
- 学会使用判别联合类型
- 熟悉内置工具类型
- 掌握 satisfies 等类型校验特性

### 第四阶段：泛型编程

泛型是 TypeScript 最强大的特性之一，能够创建可复用的组件。

- **[泛型](./generic.md)** - 泛型函数、泛型接口、泛型类、泛型约束、泛型工具类型

**学习建议：**
- 理解泛型的概念和作用
- 掌握泛型约束的使用
- 学会编写泛型工具类型
- 实践泛型在实际项目中的应用

### 第五阶段：装饰器

装饰器是 TypeScript 的实验性特性，提供了元编程能力。

- **[装饰器](./decorators.md)** - 类装饰器、方法装饰器、访问器装饰器、属性装饰器、参数装饰器

**学习建议：**
- 了解装饰器的基本概念
- 掌握各种装饰器的用法
- 学习常见的装饰器应用场景
- 注意装饰器是实验性特性

## 快速开始

### 安装 TypeScript

```bash
# 全局安装
npm install -g typescript

# 或在项目中安装
npm install --save-dev typescript
```

### 创建第一个 TypeScript 文件

```typescript
// hello.ts
function greet(name: string): string {
  return `Hello, ${name}!`;
}

console.log(greet("TypeScript"));
```

### 编译和运行

```bash
# 编译 TypeScript
tsc hello.ts

# 运行生成的 JavaScript
node hello.js
```

### 初始化配置文件

```bash
# 生成 tsconfig.json
tsc --init
```

## 核心概念

### 类型注解

类型注解是 TypeScript 的核心特性，用于明确指定值的类型。

```typescript
// 变量类型注解
let name: string = "Alice";
let age: number = 25;
let isActive: boolean = true;

// 函数类型注解
function add(a: number, b: number): number {
  return a + b;
}

// 对象类型注解
interface User {
  id: number;
  name: string;
  email: string;
}

const user: User = {
  id: 1,
  name: "Alice",
  email: "alice@example.com"
};
```

### 类型推断

TypeScript 能够自动推断变量的类型，不需要显式声明。

```typescript
// 自动推断为 string
let message = "Hello";

// 自动推断为 number
let count = 42;

// 自动推断为 (a: number, b: number) => number
const multiply = (a: number, b: number) => a * b;
```

### 类型安全

TypeScript 在编译时进行类型检查，确保类型安全。

```typescript
function processUser(user: User) {
  console.log(user.name);
  // console.log(user.age); // 错误：User 没有 age 属性
}
```

## 与框架集成

### React

```typescript
import React, { useState } from 'react';

interface Props {
  title: string;
  onSubmit: (value: string) => void;
}

const MyComponent: React.FC<Props> = ({ title, onSubmit }) => {
  const [value, setValue] = useState<string>('');
  
  return (
    <div>
      <h1>{title}</h1>
      <input 
        value={value} 
        onChange={(e) => setValue(e.target.value)} 
      />
      <button onClick={() => onSubmit(value)}>Submit</button>
    </div>
  );
};
```

### Vue 3

```typescript
import { defineComponent, ref } from 'vue';

interface User {
  id: number;
  name: string;
}

export default defineComponent({
  setup() {
    const user = ref<User>({
      id: 1,
      name: 'Alice'
    });
    
    const updateName = (newName: string) => {
      user.value.name = newName;
    };
    
    return {
      user,
      updateName
    };
  }
});
```

### Node.js

```typescript
import express, { Request, Response } from 'express';

const app = express();

interface CreateUserRequest {
  name: string;
  email: string;
}

app.post('/api/users', (req: Request<{}, {}, CreateUserRequest>, res: Response) => {
  const { name, email } = req.body;
  
  // 类型安全的处理
  const user = {
    id: Date.now(),
    name,
    email
  };
  
  res.json(user);
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
```

## 最佳实践

### 1. 启用严格模式

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

严格模式会启用所有严格类型检查选项，帮助发现更多潜在问题。

### 2. 避免使用 any

```typescript
// ❌ 不好
function process(data: any) {
  return data.value;
}

// ✅ 好
function process(data: unknown) {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return (data as { value: any }).value;
  }
}
```

### 3. 使用接口定义数据结构

```typescript
// ✅ 好
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

interface User {
  id: number;
  name: string;
  email: string;
}

const response: ApiResponse<User> = {
  code: 200,
  message: 'Success',
  data: {
    id: 1,
    name: 'Alice',
    email: 'alice@example.com'
  }
};
```

### 4. 利用类型推断

```typescript
// ❌ 不必要的类型注解
const numbers: number[] = [1, 2, 3];
const message: string = 'Hello';

// ✅ 好 - 让 TypeScript 推断
const numbers = [1, 2, 3];
const message = 'Hello';
```

### 5. 使用联合类型代替枚举（某些情况下）

```typescript
// 字符串字面量联合类型
type Status = 'pending' | 'success' | 'error';

// 比枚举更轻量
const status: Status = 'pending';
```

### 6. 合理使用泛型

```typescript
// ✅ 好 - 提供灵活性和类型安全
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: 'Alice', age: 25 };
const name = getProperty(user, 'name'); // string
const age = getProperty(user, 'age'); // number
```

## 常见问题

### Q: TypeScript 和 JavaScript 的关系？
A: TypeScript 是 JavaScript 的超集，任何有效的 JavaScript 代码都是有效的 TypeScript 代码。TypeScript 添加了类型系统和其他特性，最终编译为 JavaScript。

### Q: 何时使用 interface，何时使用 type？
A: 对于对象类型，两者几乎可以互换。一般建议：
- 定义对象结构：优先使用 `interface`
- 联合类型、交叉类型：使用 `type`
- 需要声明合并：使用 `interface`

### Q: any 和 unknown 的区别？
A: 
- `any`：完全关闭类型检查，可以进行任何操作
- `unknown`：类型安全的 any，使用前必须进行类型检查

### Q: TypeScript 会影响运行时性能吗？
A: 不会。TypeScript 只在编译时工作，编译后的 JavaScript 代码与手写的 JavaScript 性能相同。

### Q: 如何处理第三方库没有类型定义的情况？
A: 
1. 安装 `@types/*` 包（如果存在）
2. 自己编写 `.d.ts` 声明文件
3. 使用 `declare module` 声明模块

## 学习资源

### 官方资源
- [TypeScript 官方网站](https://www.typescriptlang.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Playground](https://www.typescriptlang.org/play) - 在线编辑器

### 类型定义
- [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) - 社区维护的类型定义库
- [TypeSearch](https://www.typescriptlang.org/dt/search) - 搜索类型定义

### 社区资源
- [TypeScript GitHub](https://github.com/microsoft/TypeScript)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [Type Challenges](https://github.com/type-challenges/type-challenges) - TypeScript 类型挑战

## 学习建议

1. **循序渐进**：从基础类型开始，逐步深入高级特性
2. **实践为主**：通过实际项目学习和应用 TypeScript
3. **阅读源码**：学习优秀开源项目的 TypeScript 使用
4. **类型体操**：练习复杂的类型操作，提升类型编程能力
5. **关注更新**：TypeScript 在不断演进，关注新特性和最佳实践

## 下一步

开始你的 TypeScript 学习之旅：

1. 📦 [安装与配置](./setup.md) - 搭建开发环境
2. 🎯 [基础类型](./basic-types.md) - 掌握类型系统基础
3. 🔧 [接口](./interface.md) - 定义对象结构
4. 🚀 [高级类型](./advanced-types.md) - 深入类型系统
5. 🎨 [泛型](./generic.md) - 编写可复用组件
6. 🛡️ [类型守护](./type-guards.md) - 类型安全编程
7. 🔍 [类型操控与校验](./type-manipulation.md) - satisfies 等精细化控制
8. ✨ [装饰器](./decorators.md) - 元编程能力

通过系统学习 TypeScript，你将能够编写更安全、更可维护的代码，提升开发效率和代码质量！
