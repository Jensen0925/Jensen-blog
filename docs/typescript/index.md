# TypeScript 学习指南

TypeScript 是 JavaScript 的超集，为 JavaScript 添加了静态类型定义。它可以编译为纯 JavaScript，运行在任何支持 JavaScript 的环境中。

## 为什么选择 TypeScript？

- **静态类型检查**：在编译时发现错误，而不是运行时
- **更好的 IDE 支持**：智能提示、重构、导航等
- **增强的代码可读性**：类型注解使代码更易理解
- **渐进式采用**：可以逐步将 JavaScript 项目迁移到 TypeScript
- **强大的工具生态**：丰富的类型定义和工具支持

## 学习路径

### 基础篇
- [TypeScript 基础](./basics.md) - 类型系统、基本语法
- [类型定义](./types.md) - 基础类型、联合类型、交叉类型
- [接口与类](./interfaces-classes.md) - 接口定义、类的使用

### 进阶篇
- [泛型编程](./generics.md) - 泛型的使用和高级技巧
- [高级类型](./advanced-types.md) - 条件类型、映射类型、工具类型
- [装饰器](./decorators.md) - 装饰器的使用和实现

### 实战篇
- [配置与工具](./config-tools.md) - tsconfig.json、编译选项、工具链
- [与框架集成](./framework-integration.md) - React、Vue、Node.js 中的 TypeScript
- [最佳实践](./best-practices.md) - 代码规范、性能优化、调试技巧

## 核心特性

### 类型安全
```typescript
// 类型注解
function greet(name: string): string {
  return `Hello, ${name}!`;
}

// 接口定义
interface User {
  id: number;
  name: string;
  email?: string; // 可选属性
}
```

### 现代 JavaScript 特性
```typescript
// ES6+ 特性支持
class UserService {
  private users: User[] = [];
  
  async getUser(id: number): Promise<User | null> {
    return this.users.find(user => user.id === id) || null;
  }
}
```

### 强大的类型推断
```typescript
// 自动类型推断
const numbers = [1, 2, 3]; // number[]
const doubled = numbers.map(n => n * 2); // number[]
```

## 开发环境

### 安装 TypeScript
```bash
# 全局安装
npm install -g typescript

# 项目安装
npm install --save-dev typescript
```

### 基本配置
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

## 学习建议

1. **从基础开始**：掌握基本类型系统和语法
2. **实践为主**：通过实际项目学习和应用
3. **阅读源码**：学习优秀开源项目的 TypeScript 使用
4. **关注更新**：跟进 TypeScript 新特性和最佳实践
5. **工具熟练**：掌握相关开发工具和配置

## 相关资源

- [TypeScript 官方文档](https://www.typescriptlang.org/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) - 类型定义库
- [TypeScript Playground](https://www.typescriptlang.org/play) - 在线编辑器

---

通过系统学习 TypeScript，你将能够编写更安全、更可维护的 JavaScript 代码，提升开发效率和代码质量。