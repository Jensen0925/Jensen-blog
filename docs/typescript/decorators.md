# TypeScript 装饰器

装饰器（Decorators）是一种特殊类型的声明，可以附加到类声明、方法、访问器、属性或参数上。装饰器使用 `@expression` 形式，其中 `expression` 必须求值为一个函数，该函数将在运行时被调用。

::: warning 注意
装饰器目前是 TypeScript 的实验性特性，需要在 `tsconfig.json` 中启用：

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```
:::

## 装饰器基础

### 装饰器是什么

装饰器本质上是一个函数，用于修改类及其成员的行为。

```typescript
// 简单的装饰器
function log(target: any) {
  console.log("Class decorated:", target.name);
}

@log
class MyClass {
  // ...
}
// 输出：Class decorated: MyClass
```

### 装饰器工厂

装饰器工厂是一个返回装饰器函数的函数，可以接收参数。

```typescript
// 装饰器工厂
function log(prefix: string) {
  return function(target: any) {
    console.log(`${prefix}: ${target.name}`);
  };
}

@log("MyApp")
class MyClass {
  // ...
}
// 输出：MyApp: MyClass
```

### 装饰器组合

多个装饰器可以应用到同一个声明上。

```typescript
function first() {
  console.log("first(): factory evaluated");
  return function(target: any) {
    console.log("first(): called");
  };
}

function second() {
  console.log("second(): factory evaluated");
  return function(target: any) {
    console.log("second(): called");
  };
}

@first()
@second()
class ExampleClass {}

// 输出顺序：
// first(): factory evaluated
// second(): factory evaluated
// second(): called
// first(): called
```

## 类装饰器

类装饰器在类声明之前声明，应用于类的构造函数。

### 基本用法

```typescript
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
    return `Hello, ${this.greeting}`;
  }
}
```

### 修改类构造函数

```typescript
function classDecorator<T extends { new(...args: any[]): {} }>(
  constructor: T
) {
  return class extends constructor {
    newProperty = "new property";
    hello = "override";
  };
}

@classDecorator
class Greeter {
  property = "property";
  hello: string;
  
  constructor(m: string) {
    this.hello = m;
  }
}

const greeter = new Greeter("world");
console.log(greeter.property); // "property"
console.log(greeter.hello); // "override"
```

### 实用示例：单例模式

```typescript
function Singleton<T extends { new(...args: any[]): {} }>(
  constructor: T
) {
  let instance: T;
  
  return class extends constructor {
    constructor(...args: any[]) {
      if (instance) {
        return instance as any;
      }
      super(...args);
      instance = this as any;
      return instance as any;
    }
  };
}

@Singleton
class Database {
  constructor(public name: string) {}
}

const db1 = new Database("MySQL");
const db2 = new Database("PostgreSQL");

console.log(db1 === db2); // true
console.log(db1.name); // "MySQL"
console.log(db2.name); // "MySQL" (同一个实例)
```

### 实用示例：日志记录

```typescript
function Logger(prefix: string) {
  return function<T extends { new(...args: any[]): {} }>(
    constructor: T
  ) {
    return class extends constructor {
      constructor(...args: any[]) {
        console.log(`${prefix} - Creating instance with args:`, args);
        super(...args);
      }
    };
  };
}

@Logger("UserService")
class UserService {
  constructor(public name: string) {}
  
  getUser(id: number) {
    return { id, name: this.name };
  }
}

const service = new UserService("MyService");
// 输出：UserService - Creating instance with args: ["MyService"]
```

## 方法装饰器

方法装饰器声明在方法声明之前，应用于方法的属性描述符。

### 基本用法

```typescript
function enumerable(value: boolean) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    descriptor.enumerable = value;
  };
}

class Greeter {
  greeting: string;
  
  constructor(message: string) {
    this.greeting = message;
  }
  
  @enumerable(false)
  greet() {
    return `Hello, ${this.greeting}`;
  }
}
```

### 方法日志装饰器

```typescript
function log(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;
  
  descriptor.value = function(...args: any[]) {
    console.log(`Calling ${propertyKey} with args:`, args);
    const result = originalMethod.apply(this, args);
    console.log(`Result:`, result);
    return result;
  };
  
  return descriptor;
}

class Calculator {
  @log
  add(a: number, b: number) {
    return a + b;
  }
}

const calc = new Calculator();
calc.add(2, 3);
// 输出：
// Calling add with args: [2, 3]
// Result: 5
```

### 性能监控装饰器

```typescript
function measure(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;
  
  descriptor.value = async function(...args: any[]) {
    const start = performance.now();
    const result = await originalMethod.apply(this, args);
    const end = performance.now();
    console.log(`${propertyKey} took ${(end - start).toFixed(2)}ms`);
    return result;
  };
  
  return descriptor;
}

class DataService {
  @measure
  async fetchData() {
    // 模拟异步操作
    await new Promise(resolve => setTimeout(resolve, 100));
    return { data: "sample" };
  }
}

const service = new DataService();
service.fetchData();
// 输出：fetchData took 100.xx ms
```

### 重试装饰器

```typescript
function retry(maxRetries: number = 3, delay: number = 1000) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      let lastError: any;
      
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error;
          console.log(`Attempt ${i + 1} failed, retrying...`);
          
          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      throw lastError;
    };
    
    return descriptor;
  };
}

class ApiService {
  @retry(3, 1000)
  async fetchData() {
    // 模拟可能失败的请求
    if (Math.random() > 0.5) {
      throw new Error("Request failed");
    }
    return { data: "success" };
  }
}
```

### 缓存装饰器

```typescript
function cache(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;
  const cacheMap = new Map<string, any>();
  
  descriptor.value = function(...args: any[]) {
    const key = JSON.stringify(args);
    
    if (cacheMap.has(key)) {
      console.log(`Cache hit for ${propertyKey}`);
      return cacheMap.get(key);
    }
    
    const result = originalMethod.apply(this, args);
    cacheMap.set(key, result);
    return result;
  };
  
  return descriptor;
}

class MathService {
  @cache
  fibonacci(n: number): number {
    if (n <= 1) return n;
    return this.fibonacci(n - 1) + this.fibonacci(n - 2);
  }
}

const math = new MathService();
console.log(math.fibonacci(10)); // 计算
console.log(math.fibonacci(10)); // 使用缓存
```

## 访问器装饰器

访问器装饰器应用于属性的 getter 或 setter。

### 基本用法

```typescript
function configurable(value: boolean) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    descriptor.configurable = value;
  };
}

class Point {
  private _x: number;
  private _y: number;
  
  constructor(x: number, y: number) {
    this._x = x;
    this._y = y;
  }
  
  @configurable(false)
  get x() {
    return this._x;
  }
  
  @configurable(false)
  get y() {
    return this._y;
  }
}
```

### 验证装饰器

```typescript
function validate(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalSet = descriptor.set;
  
  descriptor.set = function(value: any) {
    if (typeof value !== "number" || value < 0) {
      throw new Error(`Invalid value for ${propertyKey}: ${value}`);
    }
    originalSet?.call(this, value);
  };
  
  return descriptor;
}

class Product {
  private _price: number = 0;
  
  @validate
  set price(value: number) {
    this._price = value;
  }
  
  get price() {
    return this._price;
  }
}

const product = new Product();
product.price = 100; // 正确
// product.price = -10; // 错误：Invalid value for price: -10
```

### 格式化装饰器

```typescript
function format(formatFn: (value: any) => any) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalGet = descriptor.get;
    
    if (originalGet) {
      descriptor.get = function() {
        const value = originalGet.call(this);
        return formatFn(value);
      };
    }
    
    return descriptor;
  };
}

class User {
  private _name: string;
  
  constructor(name: string) {
    this._name = name;
  }
  
  @format((value: string) => value.toUpperCase())
  get name() {
    return this._name;
  }
}

const user = new User("alice");
console.log(user.name); // "ALICE"
```

## 属性装饰器

属性装饰器声明在属性声明之前。

### 基本用法

```typescript
function DefaultValue(value: any) {
  return function(target: any, propertyKey: string) {
    let val = value;
    
    const getter = function() {
      return val;
    };
    
    const setter = function(newVal: any) {
      val = newVal;
    };
    
    Object.defineProperty(target, propertyKey, {
      get: getter,
      set: setter,
      enumerable: true,
      configurable: true
    });
  };
}

class Config {
  @DefaultValue("localhost")
  host!: string;
  
  @DefaultValue(3000)
  port!: number;
}

const config = new Config();
console.log(config.host); // "localhost"
console.log(config.port); // 3000
```

### 必需属性装饰器

```typescript
const requiredFields = new Map<any, string[]>();

function Required(target: any, propertyKey: string) {
  if (!requiredFields.has(target.constructor)) {
    requiredFields.set(target.constructor, []);
  }
  requiredFields.get(target.constructor)!.push(propertyKey);
}

function validate(instance: any) {
  const required = requiredFields.get(instance.constructor) || [];
  
  for (const field of required) {
    if (!instance[field]) {
      throw new Error(`${field} is required`);
    }
  }
}

class User {
  @Required
  name!: string;
  
  @Required
  email!: string;
  
  age?: number;
}

const user = new User();
user.name = "Alice";
user.email = "alice@example.com";

validate(user); // 正确
```

### 只读装饰器

```typescript
function Readonly(target: any, propertyKey: string) {
  let value: any;
  
  const getter = function() {
    return value;
  };
  
  const setter = function(newVal: any) {
    if (value !== undefined) {
      throw new Error(`${propertyKey} is readonly`);
    }
    value = newVal;
  };
  
  Object.defineProperty(target, propertyKey, {
    get: getter,
    set: setter
  });
}

class Config {
  @Readonly
  apiKey!: string;
}

const config = new Config();
config.apiKey = "abc123"; // 正确（首次赋值）
// config.apiKey = "xyz789"; // 错误：apiKey is readonly
```

## 参数装饰器

参数装饰器声明在参数声明之前。

### 基本用法

```typescript
function logParameter(
  target: any,
  propertyKey: string,
  parameterIndex: number
) {
  console.log(`Parameter at index ${parameterIndex} in ${propertyKey}`);
}

class Example {
  method(@logParameter arg1: string, @logParameter arg2: number) {
    console.log(arg1, arg2);
  }
}

// 输出：
// Parameter at index 1 in method
// Parameter at index 0 in method
```

### 参数验证装饰器

```typescript
const validators = new Map<any, Map<string, any[]>>();

function ValidateParam(
  validatorFn: (value: any) => boolean,
  errorMessage: string
) {
  return function(
    target: any,
    propertyKey: string,
    parameterIndex: number
  ) {
    if (!validators.has(target)) {
      validators.set(target, new Map());
    }
    
    const methodValidators = validators.get(target)!;
    
    if (!methodValidators.has(propertyKey)) {
      methodValidators.set(propertyKey, []);
    }
    
    methodValidators.get(propertyKey)![parameterIndex] = {
      validator: validatorFn,
      errorMessage
    };
  };
}

function Validate(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;
  
  descriptor.value = function(...args: any[]) {
    const methodValidators = validators.get(target)?.get(propertyKey);
    
    if (methodValidators) {
      for (let i = 0; i < args.length; i++) {
        const validator = methodValidators[i];
        if (validator && !validator.validator(args[i])) {
          throw new Error(validator.errorMessage);
        }
      }
    }
    
    return originalMethod.apply(this, args);
  };
  
  return descriptor;
}

class UserService {
  @Validate
  createUser(
    @ValidateParam((v) => typeof v === "string" && v.length > 0, "Name is required")
    name: string,
    @ValidateParam((v) => typeof v === "number" && v >= 18, "Age must be at least 18")
    age: number
  ) {
    return { name, age };
  }
}

const service = new UserService();
service.createUser("Alice", 25); // 正确
// service.createUser("", 15); // 错误
```

## 装饰器元数据

使用 `reflect-metadata` 库可以添加和读取元数据。

### 安装和配置

```bash
npm install reflect-metadata
```

```typescript
import "reflect-metadata";

// 定义元数据键
const formatMetadataKey = Symbol("format");

function format(formatString: string) {
  return Reflect.metadata(formatMetadataKey, formatString);
}

function getFormat(target: any, propertyKey: string) {
  return Reflect.getMetadata(formatMetadataKey, target, propertyKey);
}

class Greeter {
  @format("Hello, %s")
  greeting: string;
  
  constructor(message: string) {
    this.greeting = message;
  }
}

const formatString = getFormat(Greeter.prototype, "greeting");
console.log(formatString); // "Hello, %s"
```

### 类型元数据

```typescript
import "reflect-metadata";

function logType(target: any, key: string) {
  const type = Reflect.getMetadata("design:type", target, key);
  console.log(`${key} type: ${type.name}`);
}

class Demo {
  @logType
  name!: string;
  
  @logType
  age!: number;
}

// 输出：
// age type: Number
// name type: String
```

### 依赖注入

```typescript
import "reflect-metadata";

const INJECTABLE_KEY = Symbol("injectable");

function Injectable() {
  return function(target: any) {
    Reflect.defineMetadata(INJECTABLE_KEY, true, target);
  };
}

function Inject(token: any) {
  return function(target: any, propertyKey: string | undefined, parameterIndex: number) {
    const existingInjectedParameters = Reflect.getMetadata("inject", target) || [];
    existingInjectedParameters.push({ index: parameterIndex, token });
    Reflect.defineMetadata("inject", existingInjectedParameters, target);
  };
}

@Injectable()
class Database {
  query(sql: string) {
    console.log(`Executing: ${sql}`);
  }
}

@Injectable()
class UserService {
  constructor(@Inject(Database) private db: Database) {}
  
  getUser(id: number) {
    this.db.query(`SELECT * FROM users WHERE id = ${id}`);
  }
}

// 简单的依赖注入容器
class Container {
  private services = new Map<any, any>();
  
  register(token: any, service: any) {
    this.services.set(token, service);
  }
  
  resolve<T>(target: new (...args: any[]) => T): T {
    const tokens = Reflect.getMetadata("inject", target) || [];
    const dependencies = tokens.map((token: any) =>
      this.resolve(token.token)
    );
    return new target(...dependencies);
  }
}

const container = new Container();
container.register(Database, Database);
container.register(UserService, UserService);

const userService = container.resolve(UserService);
userService.getUser(1);
```

## 装饰器实战示例

### 路由装饰器

```typescript
const routeMetadataKey = Symbol("routes");

interface RouteMetadata {
  path: string;
  method: string;
  propertyKey: string;
}

function Controller(basePath: string) {
  return function(target: any) {
    Reflect.defineMetadata("basePath", basePath, target);
  };
}

function Get(path: string) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const routes: RouteMetadata[] = Reflect.getMetadata(routeMetadataKey, target.constructor) || [];
    routes.push({ path, method: "GET", propertyKey });
    Reflect.defineMetadata(routeMetadataKey, routes, target.constructor);
  };
}

function Post(path: string) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const routes: RouteMetadata[] = Reflect.getMetadata(routeMetadataKey, target.constructor) || [];
    routes.push({ path, method: "POST", propertyKey });
    Reflect.defineMetadata(routeMetadataKey, routes, target.constructor);
  };
}

@Controller("/api/users")
class UserController {
  @Get("/")
  getAllUsers() {
    return [{ id: 1, name: "Alice" }];
  }
  
  @Get("/:id")
  getUserById(id: string) {
    return { id, name: "Alice" };
  }
  
  @Post("/")
  createUser(data: any) {
    return { id: 2, ...data };
  }
}

// 获取路由信息
const basePath = Reflect.getMetadata("basePath", UserController);
const routes = Reflect.getMetadata(routeMetadataKey, UserController);

console.log(`Base path: ${basePath}`);
console.log("Routes:", routes);
```

### ORM 装饰器

```typescript
const tableMetadataKey = Symbol("table");
const columnMetadataKey = Symbol("columns");

function Entity(tableName: string) {
  return function(target: any) {
    Reflect.defineMetadata(tableMetadataKey, tableName, target);
  };
}

function Column(columnName?: string) {
  return function(target: any, propertyKey: string) {
    const columns = Reflect.getMetadata(columnMetadataKey, target.constructor) || [];
    columns.push({
      propertyKey,
      columnName: columnName || propertyKey
    });
    Reflect.defineMetadata(columnMetadataKey, columns, target.constructor);
  };
}

function PrimaryKey() {
  return function(target: any, propertyKey: string) {
    Reflect.defineMetadata("primaryKey", propertyKey, target.constructor);
  };
}

@Entity("users")
class User {
  @PrimaryKey()
  @Column()
  id!: number;
  
  @Column("user_name")
  name!: string;
  
  @Column()
  email!: string;
  
  @Column("created_at")
  createdAt!: Date;
}

// 生成 SQL
function generateSQL(entityClass: any): string {
  const tableName = Reflect.getMetadata(tableMetadataKey, entityClass);
  const columns = Reflect.getMetadata(columnMetadataKey, entityClass);
  const primaryKey = Reflect.getMetadata("primaryKey", entityClass);
  
  const columnDefinitions = columns.map((col: any) => col.columnName).join(", ");
  
  return `SELECT ${columnDefinitions} FROM ${tableName}`;
}

console.log(generateSQL(User));
// SELECT id, user_name, email, created_at FROM users
```

## 装饰器最佳实践

### 1. 保持装饰器简单

```typescript
// ✅ 好 - 单一职责
function log(target: any, key: string, descriptor: PropertyDescriptor) {
  // 只处理日志
}

// ❌ 不好 - 做太多事情
function complexDecorator(target: any, key: string, descriptor: PropertyDescriptor) {
  // 日志、验证、缓存、重试...
}
```

### 2. 使用装饰器工厂提供配置

```typescript
// ✅ 好
function retry(maxAttempts: number) {
  return function(target: any, key: string, descriptor: PropertyDescriptor) {
    // 使用 maxAttempts
  };
}

@retry(3)
method() {}
```

### 3. 组合装饰器

```typescript
// ✅ 好 - 组合多个简单装饰器
@log
@cache
@retry(3)
method() {}
```

### 4. 提供类型安全

```typescript
// ✅ 好 - 提供完整的类型定义
function log<T>(
  target: any,
  propertyKey: string,
  descriptor: TypedPropertyDescriptor<T>
): TypedPropertyDescriptor<T> | void {
  // 实现
}
```

## 总结

TypeScript 装饰器提供了强大的元编程能力：

1. **类装饰器**：修改类的行为
2. **方法装饰器**：增强方法功能
3. **访问器装饰器**：控制属性访问
4. **属性装饰器**：定义属性元数据
5. **参数装饰器**：验证参数

装饰器在以下场景特别有用：
- 日志记录
- 性能监控
- 依赖注入
- 路由配置
- ORM 映射
- 数据验证

合理使用装饰器可以使代码更加简洁、可维护和可扩展。

