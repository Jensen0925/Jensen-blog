# TypeScript 高级特性

探索 TypeScript 的高级特性，包括装饰器、模块系统、命名空间、声明合并等进阶内容。

## 装饰器（Decorators）

装饰器是一种特殊类型的声明，它能够被附加到类声明、方法、访问符、属性或参数上。

### 启用装饰器

```json
// tsconfig.json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### 类装饰器

```typescript
// 类装饰器
function sealed(constructor: Function) {
  Object.seal(constructor);
  Object.seal(constructor.prototype);
}

@sealed
class Greeter {
  greeting: string;
  constructor(message: string) {
    this.greeting = message;
  }
  greet() {
    return "Hello, " + this.greeting;
  }
}

// 装饰器工厂
function classDecorator<T extends { new (...args: any[]): {} }>(constructor: T) {
  return class extends constructor {
    newProperty = "new property";
    hello = "override";
  };
}

@classDecorator
class Greeter2 {
  property = "property";
  hello: string;
  constructor(m: string) {
    this.hello = m;
  }
}

console.log(new Greeter2("world"));
```

### 方法装饰器

```typescript
// 方法装饰器
function enumerable(value: boolean) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    descriptor.enumerable = value;
  };
}

function log(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  
  descriptor.value = function (...args: any[]) {
    console.log(`Calling ${propertyKey} with arguments:`, args);
    const result = originalMethod.apply(this, args);
    console.log(`${propertyKey} returned:`, result);
    return result;
  };
  
  return descriptor;
}

class Calculator {
  @enumerable(false)
  @log
  add(a: number, b: number): number {
    return a + b;
  }
  
  @log
  multiply(a: number, b: number): number {
    return a * b;
  }
}

const calc = new Calculator();
calc.add(2, 3);
calc.multiply(4, 5);
```

### 属性装饰器

```typescript
// 属性装饰器
function format(formatString: string) {
  return function (target: any, propertyKey: string) {
    let value = target[propertyKey];
    
    const getter = () => {
      return formatString.replace('%s', value);
    };
    
    const setter = (newVal: string) => {
      value = newVal;
    };
    
    Object.defineProperty(target, propertyKey, {
      get: getter,
      set: setter,
      enumerable: true,
      configurable: true
    });
  };
}

function validate(target: any, propertyKey: string) {
  let value = target[propertyKey];
  
  const getter = () => value;
  const setter = (newVal: string) => {
    if (!newVal || newVal.length === 0) {
      throw new Error(`${propertyKey} cannot be empty`);
    }
    value = newVal;
  };
  
  Object.defineProperty(target, propertyKey, {
    get: getter,
    set: setter,
    enumerable: true,
    configurable: true
  });
}

class User {
  @format("Hello, %s")
  @validate
  name: string;
  
  constructor(name: string) {
    this.name = name;
  }
}

const user = new User("Alice");
console.log(user.name); // "Hello, Alice"
```

### 参数装饰器

```typescript
// 参数装饰器
function required(target: any, propertyKey: string, parameterIndex: number) {
  const existingRequiredParameters: number[] = Reflect.getOwnMetadata('required', target, propertyKey) || [];
  existingRequiredParameters.push(parameterIndex);
  Reflect.defineMetadata('required', existingRequiredParameters, target, propertyKey);
}

function validate2(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  
  descriptor.value = function (...args: any[]) {
    const requiredParameters: number[] = Reflect.getOwnMetadata('required', target, propertyName) || [];
    
    for (const parameterIndex of requiredParameters) {
      if (parameterIndex >= args.length || args[parameterIndex] === undefined) {
        throw new Error(`Missing required argument at index ${parameterIndex}`);
      }
    }
    
    return method.apply(this, args);
  };
}

class UserService {
  @validate2
  createUser(@required name: string, @required email: string, age?: number) {
    return { name, email, age };
  }
}

const service = new UserService();
// service.createUser(); // 错误：Missing required argument
service.createUser("Alice", "alice@example.com"); // 正确
```

## 模块系统

### ES6 模块

```typescript
// math.ts - 导出模块
export function add(a: number, b: number): number {
  return a + b;
}

export function subtract(a: number, b: number): number {
  return a - b;
}

export const PI = 3.14159;

// 默认导出
export default class Calculator {
  add = add;
  subtract = subtract;
}

// main.ts - 导入模块
import Calculator, { add, subtract, PI } from './math';
import * as MathUtils from './math';

const calc = new Calculator();
console.log(calc.add(2, 3));
console.log(MathUtils.PI);
```

### 动态导入

```typescript
// 动态导入
async function loadMath() {
  const mathModule = await import('./math');
  const result = mathModule.add(2, 3);
  console.log(result);
}

// 条件导入
if (someCondition) {
  import('./heavy-module').then(module => {
    module.doSomething();
  });
}

// 类型安全的动态导入
type MathModule = typeof import('./math');

async function useMath(): Promise<void> {
  const math: MathModule = await import('./math');
  console.log(math.add(1, 2));
}
```

### 模块解析

```typescript
// 相对导入
import { Utils } from './utils'; // 相对路径
import { Config } from '../config/app-config'; // 相对路径

// 非相对导入
import * as React from 'react'; // 从 node_modules
import { Observable } from 'rxjs'; // 从 node_modules

// 路径映射（tsconfig.json）
// {
//   "compilerOptions": {
//     "baseUrl": ".",
//     "paths": {
//       "@/*": ["src/*"],
//       "@components/*": ["src/components/*"],
//       "@utils/*": ["src/utils/*"]
//     }
//   }
// }

// 使用路径映射
import { Button } from '@components/Button';
import { formatDate } from '@utils/date';
```

## 命名空间

```typescript
// 命名空间定义
namespace Geometry {
  export interface Point {
    x: number;
    y: number;
  }
  
  export function distance(p1: Point, p2: Point): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }
  
  export namespace Shapes {
    export class Circle {
      constructor(public center: Point, public radius: number) {}
      
      area(): number {
        return Math.PI * this.radius * this.radius;
      }
    }
    
    export class Rectangle {
      constructor(public topLeft: Point, public width: number, public height: number) {}
      
      area(): number {
        return this.width * this.height;
      }
    }
  }
}

// 使用命名空间
const point1: Geometry.Point = { x: 0, y: 0 };
const point2: Geometry.Point = { x: 3, y: 4 };
const dist = Geometry.distance(point1, point2);

const circle = new Geometry.Shapes.Circle(point1, 5);
const rectangle = new Geometry.Shapes.Rectangle(point1, 10, 20);

// 命名空间别名
import Shapes = Geometry.Shapes;
const circle2 = new Shapes.Circle(point2, 3);
```

## 声明合并

### 接口合并

```typescript
// 接口声明合并
interface User {
  name: string;
}

interface User {
  age: number;
}

interface User {
  email: string;
}

// 合并后的接口
const user: User = {
  name: "Alice",
  age: 30,
  email: "alice@example.com"
};

// 函数重载合并
interface Document {
  createElement(tagName: "div"): HTMLDivElement;
  createElement(tagName: "span"): HTMLSpanElement;
}

interface Document {
  createElement(tagName: "canvas"): HTMLCanvasElement;
  createElement(tagName: string): HTMLElement;
}

// 现在 Document 接口包含所有重载
```

### 命名空间合并

```typescript
// 命名空间与类合并
class Album {
  label: Album.AlbumLabel;
}

namespace Album {
  export class AlbumLabel {
    constructor(public name: string) {}
  }
}

// 命名空间与函数合并
function buildLabel(name: string): string {
  return buildLabel.prefix + name + buildLabel.suffix;
}

namespace buildLabel {
  export let suffix = "";
  export let prefix = "Hello, ";
}

console.log(buildLabel("Sam Smith")); // "Hello, Sam Smith"

// 命名空间与枚举合并
enum Color {
  red = 1,
  green = 2,
  blue = 4
}

namespace Color {
  export function mixColor(colorName: string) {
    if (colorName === "yellow") {
      return Color.red + Color.green;
    } else if (colorName === "white") {
      return Color.red + Color.green + Color.blue;
    } else if (colorName === "magenta") {
      return Color.red + Color.blue;
    } else if (colorName === "cyan") {
      return Color.green + Color.blue;
    }
  }
}
```

## 类型声明文件

### 创建声明文件

```typescript
// types/my-library.d.ts
declare module 'my-library' {
  export interface Config {
    apiUrl: string;
    timeout: number;
  }
  
  export class ApiClient {
    constructor(config: Config);
    get<T>(url: string): Promise<T>;
    post<T, U>(url: string, data: T): Promise<U>;
  }
  
  export function createClient(config: Config): ApiClient;
}

// 全局声明
declare global {
  interface Window {
    myGlobalFunction: (data: any) => void;
    myGlobalVariable: string;
  }
  
  const MY_GLOBAL_CONSTANT: string;
}

// 模块扩展
declare module 'express' {
  interface Request {
    user?: {
      id: number;
      name: string;
    };
  }
}

// 使用声明
import { ApiClient, createClient } from 'my-library';

const client = createClient({
  apiUrl: 'https://api.example.com',
  timeout: 5000
});

// 使用全局声明
window.myGlobalFunction({ test: 'data' });
console.log(MY_GLOBAL_CONSTANT);
```

### 环境声明

```typescript
// globals.d.ts
declare const VERSION: string;
declare const API_URL: string;

declare function gtag(command: string, targetId: string, config?: object): void;

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    DATABASE_URL: string;
    JWT_SECRET: string;
  }
}

// 使用环境声明
console.log(VERSION);
gtag('config', 'GA_TRACKING_ID');
console.log(process.env.NODE_ENV);
```

## 条件类型高级应用

### 分布式条件类型

```typescript
// 分布式条件类型
type ToArray<T> = T extends any ? T[] : never;

type StrArrOrNumArr = ToArray<string | number>; // string[] | number[]

// 避免分布式行为
type ToArrayNonDistributive<T> = [T] extends [any] ? T[] : never;

type StrArrOrNumArr2 = ToArrayNonDistributive<string | number>; // (string | number)[]
```

### 复杂条件类型

```typescript
// 深度只读
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object
    ? T[P] extends Function
      ? T[P]
      : DeepReadonly<T[P]>
    : T[P];
};

// 深度可选
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? T[P] extends Function
      ? T[P]
      : DeepPartial<T[P]>
    : T[P];
};

// 获取函数参数类型
type GetParameters<T> = T extends (...args: infer P) => any ? P : never;

type Params = GetParameters<(a: string, b: number) => void>; // [string, number]

// 获取 Promise 的值类型
type Awaited<T> = T extends Promise<infer U> ? U : T;

type Result = Awaited<Promise<string>>; // string
type Result2 = Awaited<string>; // string

// 递归条件类型
type Flatten<T> = T extends readonly (infer U)[]
  ? Flatten<U>
  : T;

type Deep = Flatten<string[][][]>; // string
```

## 模板字面量类型

```typescript
// 模板字面量类型
type World = "world";
type Greeting = `hello ${World}`; // "hello world"

// 联合类型的模板字面量
type EmailLocaleIDs = "welcome_email" | "email_heading";
type FooterLocaleIDs = "footer_title" | "footer_sendoff";

type AllLocaleIDs = `${EmailLocaleIDs | FooterLocaleIDs}_id`;
// "welcome_email_id" | "email_heading_id" | "footer_title_id" | "footer_sendoff_id"

// 模板字面量类型的实际应用
type EventNames<T extends Record<string, any>> = {
  [K in keyof T]: `${string & K}Changed`;
}[keyof T];

interface Person {
  name: string;
  age: number;
  email: string;
}

type PersonEvents = EventNames<Person>; // "nameChanged" | "ageChanged" | "emailChanged"

// 字符串操作类型
type Uppercase<S extends string> = intrinsic;
type Lowercase<S extends string> = intrinsic;
type Capitalize<S extends string> = intrinsic;
type Uncapitalize<S extends string> = intrinsic;

type UppercaseGreeting = Uppercase<"hello world">; // "HELLO WORLD"
type LowercaseGreeting = Lowercase<"HELLO WORLD">; // "hello world"
type CapitalizedGreeting = Capitalize<"hello world">; // "Hello world"
type UncapitalizedGreeting = Uncapitalize<"Hello World">; // "hello World"

// 路径类型生成
type PathsToStringProps<T> = T extends string
  ? []
  : {
      [K in Extract<keyof T, string>]: [K, ...PathsToStringProps<T[K]>];
    }[Extract<keyof T, string>];

type ObjectPaths = PathsToStringProps<{
  name: string;
  age: number;
  address: {
    street: string;
    city: string;
  };
}>;
// ["name"] | ["age"] | ["address", "street"] | ["address", "city"]
```

## 实际项目应用

### 类型安全的配置系统

```typescript
// 配置类型定义
interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

interface AppConfig {
  port: number;
  env: 'development' | 'production' | 'test';
  database: DatabaseConfig;
  redis: RedisConfig;
  jwt: {
    secret: string;
    expiresIn: string;
  };
}

// 配置验证装饰器
function validateConfig<T>(schema: T) {
  return function <U extends { new (...args: any[]): {} }>(constructor: U) {
    return class extends constructor {
      constructor(...args: any[]) {
        super(...args);
        // 验证配置逻辑
        this.validate(schema);
      }
      
      private validate(schema: T) {
        // 实现配置验证
      }
    };
  };
}

// 配置管理类
@validateConfig({
  port: 'number',
  env: ['development', 'production', 'test'],
  database: {
    host: 'string',
    port: 'number',
    username: 'string',
    password: 'string',
    database: 'string'
  }
})
class ConfigManager {
  private config: AppConfig;
  
  constructor() {
    this.config = this.loadConfig();
  }
  
  private loadConfig(): AppConfig {
    return {
      port: parseInt(process.env.PORT || '3000'),
      env: (process.env.NODE_ENV as AppConfig['env']) || 'development',
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'user',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'myapp'
      },
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD
      },
      jwt: {
        secret: process.env.JWT_SECRET || 'secret',
        expiresIn: process.env.JWT_EXPIRES_IN || '1d'
      }
    };
  }
  
  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }
  
  getAll(): AppConfig {
    return { ...this.config };
  }
}

// 使用配置
const config = new ConfigManager();
const dbConfig = config.get('database');
const port = config.get('port');
```

### 类型安全的 ORM

```typescript
// 实体装饰器
function Entity(tableName: string) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    Reflect.defineMetadata('tableName', tableName, constructor);
    return constructor;
  };
}

function Column(options?: { type?: string; nullable?: boolean }) {
  return function (target: any, propertyKey: string) {
    const columns = Reflect.getMetadata('columns', target.constructor) || [];
    columns.push({ name: propertyKey, ...options });
    Reflect.defineMetadata('columns', columns, target.constructor);
  };
}

function PrimaryKey() {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata('primaryKey', propertyKey, target.constructor);
  };
}

// 实体定义
@Entity('users')
class User {
  @PrimaryKey()
  @Column({ type: 'int' })
  id: number;
  
  @Column({ type: 'varchar' })
  name: string;
  
  @Column({ type: 'varchar' })
  email: string;
  
  @Column({ type: 'int', nullable: true })
  age?: number;
}

// 查询构建器
class QueryBuilder<T> {
  private entity: new () => T;
  private conditions: string[] = [];
  private selectFields: (keyof T)[] = [];
  
  constructor(entity: new () => T) {
    this.entity = entity;
  }
  
  select<K extends keyof T>(...fields: K[]): QueryBuilder<Pick<T, K>> {
    this.selectFields = fields;
    return this as any;
  }
  
  where<K extends keyof T>(field: K, operator: '=' | '!=' | '>' | '<', value: T[K]): this {
    this.conditions.push(`${String(field)} ${operator} '${value}'`);
    return this;
  }
  
  async execute(): Promise<T[]> {
    const tableName = Reflect.getMetadata('tableName', this.entity);
    const fields = this.selectFields.length > 0 
      ? this.selectFields.map(f => String(f)).join(', ')
      : '*';
    
    const whereClause = this.conditions.length > 0 
      ? ` WHERE ${this.conditions.join(' AND ')}`
      : '';
    
    const sql = `SELECT ${fields} FROM ${tableName}${whereClause}`;
    
    // 执行 SQL 查询
    console.log('Executing SQL:', sql);
    return [] as T[]; // 实际实现中会执行真正的数据库查询
  }
}

// Repository 模式
class Repository<T> {
  constructor(private entity: new () => T) {}
  
  createQueryBuilder(): QueryBuilder<T> {
    return new QueryBuilder(this.entity);
  }
  
  async findById(id: number): Promise<T | null> {
    return this.createQueryBuilder()
      .where('id' as keyof T, '=', id as T[keyof T])
      .execute()
      .then(results => results[0] || null);
  }
  
  async findAll(): Promise<T[]> {
    return this.createQueryBuilder().execute();
  }
}

// 使用示例
const userRepository = new Repository(User);

// 类型安全的查询
const users = await userRepository
  .createQueryBuilder()
  .select('name', 'email')
  .where('age', '>', 18)
  .execute();

const user = await userRepository.findById(1);
```

## 总结

TypeScript 的高级特性为我们提供了强大的工具：

### 装饰器：
1. **元编程能力**：在运行时修改类和方法行为
2. **代码复用**：通过装饰器实现横切关注点
3. **类型安全**：结合 TypeScript 类型系统

### 模块系统：
1. **代码组织**：清晰的模块边界和依赖关系
2. **类型安全**：编译时检查模块导入导出
3. **动态加载**：支持按需加载和代码分割

### 声明合并：
1. **扩展性**：扩展现有类型和接口
2. **模块增强**：为第三方库添加类型定义
3. **渐进式迁移**：逐步添加类型定义

### 高级类型：
1. **类型计算**：在类型层面进行复杂计算
2. **代码生成**：基于类型自动生成代码
3. **类型安全**：编译时保证类型正确性

这些高级特性使 TypeScript 不仅仅是 JavaScript 的类型化版本，而是一个功能强大的类型安全编程语言。