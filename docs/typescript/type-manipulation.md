# TypeScript 类型操控与校验

TypeScript 提供了多种关键字和语法特性用于类型校验、类型关联或类型精细化控制。这些特性的核心目标是在保证类型安全的同时提升类型灵活性。

## satisfies 运算符

`satisfies` 是 TypeScript 4.9 引入的新运算符，用于验证表达式是否满足某个类型，同时保留表达式的精确类型。

### 基本用法

```typescript
// 问题：使用类型注解会丢失精确类型
type Colors = "red" | "green" | "blue";

type RGB = [red: number, green: number, blue: number];

type Palette = Record<Colors, string | RGB>;

// 使用类型注解：丢失了具体的类型信息
const palette: Palette = {
  red: [255, 0, 0],
  green: "#00ff00",
  blue: [0, 0, 255]
};

// palette.red 的类型是 string | RGB，需要类型守护才能使用
// palette.red.map(...); // 错误：string 没有 map 方法

// 使用 satisfies：保留精确类型
const palette2 = {
  red: [255, 0, 0],
  green: "#00ff00",
  blue: [0, 0, 255]
} satisfies Palette;

// palette2.red 的类型是 [number, number, number]
palette2.red.map(x => x * 0.5); // 正确！类型被保留
// palette2.green.toUpperCase(); // 正确！类型是 string
```

### satisfies vs as（类型断言）

```typescript
type Point = { x: number; y: number };

// 使用 as：可能不安全，会覆盖原有类型
const p1 = { x: 10, y: 20, z: 30 } as Point;
// p1.z; // 错误：类型 Point 上不存在属性 z（但实际上存在）

// 使用 satisfies：类型安全，保留所有属性
const p2 = { x: 10, y: 20, z: 30 } satisfies Point;
p2.z; // 正确！z 属性被保留
```

### satisfies vs 类型注解

```typescript
interface Config {
  url: string;
  port: number;
}

// 类型注解：精确匹配类型，不能有额外属性
const config1: Config = {
  url: "http://localhost",
  port: 3000
  // timeout: 5000 // 错误：Config 上不存在 timeout
};

// satisfies：满足类型约束，可以有额外属性
const config2 = {
  url: "http://localhost",
  port: 3000,
  timeout: 5000
} satisfies Config;

config2.timeout; // 正确！额外属性被保留
```

### 实用场景

#### 1. 配置对象验证

```typescript
type RouteConfig = Record<string, { path: string; component: any }>;

const routes = {
  home: {
    path: "/",
    component: "HomePage"
  },
  about: {
    path: "/about",
    component: "AboutPage"
  },
  contact: {
    path: "/contact",
    component: "ContactPage",
    meta: { requiresAuth: true } // 额外属性
  }
} satisfies RouteConfig;

// 类型安全且保留了精确类型
routes.home.path; // string
routes.contact.meta; // { requiresAuth: boolean } - 额外属性被保留
```

#### 2. 主题配置

```typescript
type Theme = Record<string, string | { light: string; dark: string }>;

const theme = {
  primary: "#007bff",
  secondary: "#6c757d",
  background: {
    light: "#ffffff",
    dark: "#1a1a1a"
  }
} satisfies Theme;

// 保留精确类型
theme.primary.toUpperCase(); // 正确：string
theme.background.light; // 正确：可以访问 light 属性
theme.background.dark; // 正确：可以访问 dark 属性
```

#### 3. API 端点定义

```typescript
type ApiEndpoint = {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
};

type ApiEndpoints = Record<string, ApiEndpoint>;

const api = {
  getUsers: {
    url: "/api/users",
    method: "GET"
  },
  createUser: {
    url: "/api/users",
    method: "POST",
    requiresAuth: true // 额外信息
  }
} satisfies ApiEndpoints;

// 类型推断保留了精确信息
api.createUser.requiresAuth; // boolean - 额外属性被保留
```

## as（类型断言）

类型断言告诉编译器"相信我，我知道自己在做什么"，会覆盖类型推断。

### 基本用法

```typescript
// 从更宽泛的类型断言为更具体的类型
const value: unknown = "hello";
const str = value as string;
str.toUpperCase(); // 正确

// DOM 元素断言
const input = document.getElementById("input") as HTMLInputElement;
input.value = "text";
```

### 双重断言

```typescript
// 有时需要先断言为 unknown，再断言为目标类型
const num = 123;
// const str = num as string; // 错误：不能直接转换
const str = num as unknown as string; // 正确（但不安全）
```

### 非空断言 (!)

```typescript
function getValue(): string | null {
  return "hello";
}

const value = getValue();
// value.toUpperCase(); // 错误：可能是 null

// 非空断言：告诉编译器值不是 null/undefined
value!.toUpperCase(); // 正确（但要确保值确实不为空）

// DOM 操作中常用
const button = document.getElementById("btn")!;
button.addEventListener("click", () => {});
```

### as 的风险

```typescript
// as 可能导致运行时错误
interface User {
  name: string;
  age: number;
}

const data = { name: "Alice" } as User;
console.log(data.age.toFixed()); // 运行时错误：undefined.toFixed()

// 应该使用类型守护或 satisfies
function isUser(obj: any): obj is User {
  return typeof obj.name === "string" && typeof obj.age === "number";
}
```

## as const（常量断言）

`as const` 将值断言为字面量类型，使所有属性变为只读。

### 基本用法

```typescript
// 不使用 as const
let x = "hello"; // string
let arr = [1, 2, 3]; // number[]
let obj = { x: 10, y: 20 }; // { x: number; y: number }

// 使用 as const
let x2 = "hello" as const; // "hello"
let arr2 = [1, 2, 3] as const; // readonly [1, 2, 3]
let obj2 = { x: 10, y: 20 } as const; // { readonly x: 10; readonly y: 20 }

// 不能修改
// obj2.x = 20; // 错误：readonly
// arr2.push(4); // 错误：readonly
```

### 实用场景

#### 1. 配置常量

```typescript
const Config = {
  API_URL: "https://api.example.com",
  API_KEY: "secret-key",
  TIMEOUT: 5000
} as const;

// Config.API_URL 的类型是 "https://api.example.com" 而不是 string
// Config.TIMEOUT 的类型是 5000 而不是 number

// 不能修改
// Config.API_URL = "other"; // 错误：readonly
```

#### 2. 枚举替代

```typescript
// 使用 as const 创建类似枚举的结构
const Status = {
  PENDING: "pending",
  SUCCESS: "success",
  ERROR: "error"
} as const;

// 提取类型
type StatusType = typeof Status[keyof typeof Status];
// "pending" | "success" | "error"

function setStatus(status: StatusType) {
  console.log(status);
}

setStatus(Status.PENDING); // 正确
setStatus("pending"); // 正确
// setStatus("invalid"); // 错误
```

#### 3. 路由配置

```typescript
const routes = [
  { path: "/", name: "home" },
  { path: "/about", name: "about" },
  { path: "/contact", name: "contact" }
] as const;

// 提取路由名称类型
type RouteName = typeof routes[number]["name"];
// "home" | "about" | "contact"

function navigateTo(name: RouteName) {
  const route = routes.find(r => r.name === name);
  // ...
}
```

#### 4. 动作类型

```typescript
const actions = {
  INCREMENT: "INCREMENT",
  DECREMENT: "DECREMENT",
  RESET: "RESET"
} as const;

type Action =
  | { type: typeof actions.INCREMENT; payload: number }
  | { type: typeof actions.DECREMENT; payload: number }
  | { type: typeof actions.RESET };

function reducer(state: number, action: Action): number {
  switch (action.type) {
    case actions.INCREMENT:
      return state + action.payload;
    case actions.DECREMENT:
      return state - action.payload;
    case actions.RESET:
      return 0;
  }
}
```

## is（类型谓词）

`is` 用于自定义类型守护函数，告诉 TypeScript 如何缩小类型范围。

### 基本用法

```typescript
function isString(value: unknown): value is string {
  return typeof value === "string";
}

function process(value: unknown) {
  if (isString(value)) {
    // 在这里，value 的类型是 string
    console.log(value.toUpperCase());
  }
}
```

### 复杂类型守护

```typescript
interface User {
  type: "user";
  name: string;
  email: string;
}

interface Admin {
  type: "admin";
  name: string;
  email: string;
  permissions: string[];
}

type Person = User | Admin;

// 自定义类型守护
function isAdmin(person: Person): person is Admin {
  return person.type === "admin";
}

function greet(person: Person) {
  if (isAdmin(person)) {
    // person 的类型是 Admin
    console.log(`Admin: ${person.name}, Permissions: ${person.permissions.join(", ")}`);
  } else {
    // person 的类型是 User
    console.log(`User: ${person.name}`);
  }
}
```

### 数组类型守护

```typescript
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === "string");
}

function processData(data: unknown) {
  if (isStringArray(data)) {
    // data 的类型是 string[]
    data.forEach(str => console.log(str.toUpperCase()));
  }
}
```

### 泛型类型守护

```typescript
function isArrayOf<T>(
  value: unknown,
  check: (item: unknown) => item is T
): value is T[] {
  return Array.isArray(value) && value.every(check);
}

// 使用
function processNumbers(data: unknown) {
  if (isArrayOf(data, (item): item is number => typeof item === "number")) {
    // data 的类型是 number[]
    const sum = data.reduce((a, b) => a + b, 0);
  }
}
```

## asserts（断言函数）

`asserts` 用于创建断言函数，如果断言失败则抛出错误。

### 基本用法

```typescript
function assert(condition: any, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

function process(value: string | null) {
  assert(value !== null, "Value cannot be null");
  // 在这里，value 的类型是 string（null 被排除）
  console.log(value.toUpperCase());
}
```

### 类型断言函数

```typescript
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new Error("Value is not a string");
  }
}

function processValue(value: unknown) {
  assertIsString(value);
  // 在这里，value 的类型是 string
  console.log(value.toUpperCase());
}
```

### 非空断言

```typescript
function assertNonNull<T>(value: T, name: string): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error(`${name} cannot be null or undefined`);
  }
}

function getUser(id: number): User | null {
  // 模拟数据库查询
  return null;
}

function processUser(id: number) {
  const user = getUser(id);
  assertNonNull(user, "user");
  // 在这里，user 的类型是 User
  console.log(user.name);
}
```

### 对象结构断言

```typescript
interface Config {
  host: string;
  port: number;
}

function assertIsConfig(obj: unknown): asserts obj is Config {
  if (
    typeof obj !== "object" ||
    obj === null ||
    !("host" in obj) ||
    typeof (obj as any).host !== "string" ||
    !("port" in obj) ||
    typeof (obj as any).port !== "number"
  ) {
    throw new Error("Invalid config object");
  }
}

function loadConfig(data: unknown): Config {
  assertIsConfig(data);
  // data 的类型是 Config
  return data;
}
```

## keyof 运算符

`keyof` 获取对象类型的所有键，返回键的联合类型。

### 基本用法

```typescript
interface User {
  name: string;
  age: number;
  email: string;
}

type UserKeys = keyof User; // "name" | "age" | "email"

function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user: User = { name: "Alice", age: 25, email: "alice@example.com" };
const name = getProperty(user, "name"); // string
const age = getProperty(user, "age"); // number
```

### 索引类型查询

```typescript
type Person = {
  name: string;
  age: number;
  location: {
    city: string;
    country: string;
  };
};

type PersonKeys = keyof Person; // "name" | "age" | "location"
type LocationKeys = keyof Person["location"]; // "city" | "country"

// 递归获取所有键
type DeepKeys<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? K | `${K}.${DeepKeys<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

type PersonDeepKeys = DeepKeys<Person>;
// "name" | "age" | "location" | "location.city" | "location.country"
```

### 映射类型中的 keyof

```typescript
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

type Partial<T> = {
  [P in keyof T]?: T[P];
};

type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// 使用
interface Todo {
  title: string;
  description: string;
  completed: boolean;
}

type ReadonlyTodo = Readonly<Todo>;
type PartialTodo = Partial<Todo>;
type TodoPreview = Pick<Todo, "title" | "completed">;
```

## typeof 运算符

TypeScript 的 `typeof` 可以获取值的类型。

### 基本用法

```typescript
const person = {
  name: "Alice",
  age: 25,
  greet() {
    console.log(`Hello, I'm ${this.name}`);
  }
};

type Person = typeof person;
// {
//   name: string;
//   age: number;
//   greet: () => void;
// }

const anotherPerson: Person = {
  name: "Bob",
  age: 30,
  greet() {
    console.log(`Hi, I'm ${this.name}`);
  }
};
```

### 函数类型提取

```typescript
function add(a: number, b: number): number {
  return a + b;
}

type AddFunction = typeof add; // (a: number, b: number) => number

// 提取参数类型
type AddParams = Parameters<typeof add>; // [number, number]

// 提取返回类型
type AddReturn = ReturnType<typeof add>; // number
```

### 类型从值推断

```typescript
const colors = {
  red: "#ff0000",
  green: "#00ff00",
  blue: "#0000ff"
} as const;

type Colors = typeof colors;
// {
//   readonly red: "#ff0000";
//   readonly green: "#00ff00";
//   readonly blue: "#0000ff";
// }

type ColorName = keyof typeof colors; // "red" | "green" | "blue"
type ColorValue = typeof colors[ColorName]; // "#ff0000" | "#00ff00" | "#0000ff"
```

### 枚举类型提取

```typescript
enum Status {
  Pending = "pending",
  Success = "success",
  Error = "error"
}

type StatusType = typeof Status;
// {
//   Pending: Status.Pending;
//   Success: Status.Success;
//   Error: Status.Error;
// }

type StatusValue = typeof Status[keyof typeof Status];
// Status.Pending | Status.Success | Status.Error
```

## in 运算符

`in` 运算符用于检查属性是否存在于对象中，也用于映射类型。

### 类型守护中的 in

```typescript
interface Cat {
  meow(): void;
}

interface Dog {
  bark(): void;
}

type Animal = Cat | Dog;

function makeSound(animal: Animal) {
  if ("meow" in animal) {
    // animal 的类型是 Cat
    animal.meow();
  } else {
    // animal 的类型是 Dog
    animal.bark();
  }
}
```

### 映射类型中的 in

```typescript
// 遍历联合类型
type Keys = "name" | "age" | "email";

type Record<K extends keyof any, T> = {
  [P in K]: T;
};

type UserRecord = Record<Keys, string>;
// {
//   name: string;
//   age: string;
//   email: string;
// }
```

### 条件属性检查

```typescript
interface Response {
  data?: any;
  error?: string;
}

function handleResponse(response: Response) {
  if ("error" in response && response.error) {
    console.error(response.error);
  } else if ("data" in response && response.data) {
    console.log(response.data);
  }
}
```

## extends 关键字

`extends` 用于类型约束、条件类型和类继承。

### 泛型约束

```typescript
// 约束泛型必须有 length 属性
function getLength<T extends { length: number }>(arg: T): number {
  return arg.length;
}

getLength("hello"); // 5
getLength([1, 2, 3]); // 3
getLength({ length: 10 }); // 10
// getLength(123); // 错误：number 没有 length 属性

// 约束泛型必须是某个类型的键
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
```

### 条件类型

```typescript
// T extends U ? X : Y
type IsString<T> = T extends string ? true : false;

type A = IsString<string>; // true
type B = IsString<number>; // false

// 实用示例：排除 null 和 undefined
type NonNullable<T> = T extends null | undefined ? never : T;

type C = NonNullable<string | null>; // string
type D = NonNullable<number | undefined>; // number
```

### 分布式条件类型

```typescript
// 联合类型会被分发
type ToArray<T> = T extends any ? T[] : never;

type E = ToArray<string | number>; // string[] | number[]

// 提取函数类型
type GetFunctions<T> = T extends (...args: any[]) => any ? T : never;

type Functions = GetFunctions<string | number | (() => void) | ((x: number) => string)>;
// (() => void) | ((x: number) => string)
```

### 类继承

```typescript
class Animal {
  move() {
    console.log("Moving");
  }
}

class Dog extends Animal {
  bark() {
    console.log("Woof!");
  }
}

// 泛型约束为类
function createInstance<T extends Animal>(ctor: new () => T): T {
  return new ctor();
}

const dog = createInstance(Dog);
dog.move(); // 正确
dog.bark(); // 正确
```

## infer 关键字

`infer` 在条件类型中声明类型变量，用于提取类型。

### 提取函数返回类型

```typescript
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

function getUser() {
  return { name: "Alice", age: 25 };
}

type User = ReturnType<typeof getUser>; // { name: string; age: number }
```

### 提取函数参数类型

```typescript
type Parameters<T> = T extends (...args: infer P) => any ? P : never;

function createUser(name: string, age: number, email: string) {
  return { name, age, email };
}

type CreateUserParams = Parameters<typeof createUser>; // [string, number, string]
```

### 提取数组元素类型

```typescript
type Flatten<T> = T extends Array<infer U> ? U : T;

type A = Flatten<string[]>; // string
type B = Flatten<number>; // number
```

### 提取 Promise 类型

```typescript
type Unpacked<T> = T extends Promise<infer U> ? U : T;

type C = Unpacked<Promise<string>>; // string
type D = Unpacked<number>; // number

// 递归提取
type DeepUnpacked<T> = T extends Promise<infer U> ? DeepUnpacked<U> : T;

type E = DeepUnpacked<Promise<Promise<string>>>; // string
```

### 提取构造函数参数

```typescript
type ConstructorParameters<T> = T extends new (...args: infer P) => any ? P : never;

class User {
  constructor(public name: string, public age: number) {}
}

type UserParams = ConstructorParameters<typeof User>; // [string, number]
```

## 类型操控对比总结

| 特性          | 用途                     | 类型安全 | 保留精确类型 | 使用场景             |
| ------------- | ------------------------ | -------- | ------------ | -------------------- |
| **satisfies** | 验证类型同时保留精确类型 | ✅ 高     | ✅ 是         | 配置对象、类型验证   |
| **as**        | 类型断言，覆盖类型推断   | ⚠️ 低     | ❌ 否         | 明确知道类型时使用   |
| **as const**  | 常量断言，变为字面量类型 | ✅ 高     | ✅ 是         | 常量配置、枚举替代   |
| **is**        | 自定义类型守护           | ✅ 高     | ✅ 是         | 类型收窄、运行时检查 |
| **asserts**   | 断言函数，失败时抛出错误 | ✅ 高     | ✅ 是         | 前置条件检查         |
| **keyof**     | 获取对象键的联合类型     | ✅ 高     | ✅ 是         | 类型约束、映射类型   |
| **typeof**    | 获取值的类型             | ✅ 高     | ✅ 是         | 类型推断、类型复用   |
| **in**        | 属性检查                 | ✅ 高     | ✅ 是         | 类型守护、映射类型   |
| **extends**   | 类型约束、条件类型       | ✅ 高     | ✅ 是         | 泛型约束、条件判断   |
| **infer**     | 条件类型中提取类型       | ✅ 高     | ✅ 是         | 类型提取、类型转换   |

## 最佳实践

### 1. 优先使用 satisfies 而不是 as

```typescript
// ❌ 不好
const config = {
  url: "http://localhost",
  port: 3000
} as Config;

// ✅ 好
const config = {
  url: "http://localhost",
  port: 3000
} satisfies Config;
```

### 2. 使用 as const 创建常量

```typescript
// ✅ 好
const COLORS = {
  RED: "#ff0000",
  GREEN: "#00ff00",
  BLUE: "#0000ff"
} as const;
```

### 3. 创建类型守护函数

```typescript
// ✅ 好
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "name" in obj &&
    "email" in obj
  );
}
```

### 4. 使用断言函数进行前置检查

```typescript
// ✅ 好
function assertNonNull<T>(value: T): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error("Value is null or undefined");
  }
}
```

### 5. 组合使用多种特性

```typescript
// ✅ 好 - 组合使用
const routes = [
  { path: "/", name: "home" },
  { path: "/about", name: "about" }
] as const satisfies ReadonlyArray<{ path: string; name: string }>;

type RouteName = typeof routes[number]["name"]; // "home" | "about"
```

## 总结

TypeScript 提供了丰富的类型操控和校验特性：

1. **satisfies** - 验证类型同时保留精确类型，是最新也是最推荐的特性
2. **as / as const** - 类型断言和常量断言
3. **is / asserts** - 自定义类型守护和断言函数
4. **keyof / typeof** - 类型查询和提取
5. **in / extends / infer** - 类型判断、约束和提取

合理使用这些特性，可以在保证类型安全的同时，提供更好的类型推断和更灵活的类型控制。

