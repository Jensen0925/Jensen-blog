# TypeScript 泛型

泛型（Generics）是 TypeScript 中最强大的特性之一，它允许我们编写可复用的、类型安全的代码。通过泛型，我们可以创建能够适用于多种类型的组件，而不是单一类型。

## 为什么需要泛型

### 问题示例

```typescript
// 不使用泛型：类型不安全
function identity(arg: any): any {
  return arg;
}

let output = identity("myString");
// output 的类型是 any，丢失了类型信息

// 使用具体类型：不够灵活
function identityString(arg: string): string {
  return arg;
}

function identityNumber(arg: number): number {
  return arg;
}
// 需要为每种类型都写一个函数
```

### 使用泛型解决

```typescript
// 使用泛型：类型安全且灵活
function identity<T>(arg: T): T {
  return arg;
}

let output1 = identity<string>("myString"); // string
let output2 = identity<number>(42); // number

// 类型推断
let output3 = identity("myString"); // 自动推断为 string
let output4 = identity(42); // 自动推断为 number
```

## 泛型函数

### 基本语法

```typescript
// 单个类型参数
function identity<T>(arg: T): T {
  return arg;
}

// 多个类型参数
function pair<T, U>(first: T, second: U): [T, U] {
  return [first, second];
}

const result = pair<string, number>("hello", 42);
// result 的类型是 [string, number]

// 泛型箭头函数
const identity2 = <T>(arg: T): T => {
  return arg;
};

// 在 TSX 中，需要添加 extends 约束避免解析错误
const identity3 = <T extends unknown>(arg: T): T => {
  return arg;
};
```

### 泛型函数类型

```typescript
// 函数类型定义
type IdentityFn = <T>(arg: T) => T;

const myIdentity: IdentityFn = (arg) => arg;

// 或者使用接口
interface GenericIdentityFn {
  <T>(arg: T): T;
}

const myIdentity2: GenericIdentityFn = (arg) => arg;

// 将泛型参数提升到接口层面
interface GenericIdentityFn2<T> {
  (arg: T): T;
}

const myIdentity3: GenericIdentityFn2<number> = (arg) => arg;
// 现在只能接受 number 类型
```

### 泛型数组

```typescript
function loggingIdentity<T>(arg: T[]): T[] {
  console.log(arg.length); // 可以访问 length 属性
  return arg;
}

// 或使用 Array<T> 语法
function loggingIdentity2<T>(arg: Array<T>): Array<T> {
  console.log(arg.length);
  return arg;
}

loggingIdentity([1, 2, 3]); // number[]
loggingIdentity(["a", "b", "c"]); // string[]
```

## 泛型约束

### 基本约束

```typescript
// 约束泛型必须有 length 属性
interface Lengthwise {
  length: number;
}

function loggingIdentity<T extends Lengthwise>(arg: T): T {
  console.log(arg.length); // 现在可以安全访问 length
  return arg;
}

loggingIdentity({ length: 10, value: 3 }); // 正确
loggingIdentity("hello"); // 正确，字符串有 length
loggingIdentity([1, 2, 3]); // 正确，数组有 length
// loggingIdentity(3); // 错误，数字没有 length
```

### 多个约束

```typescript
interface HasLength {
  length: number;
}

interface HasName {
  name: string;
}

// 使用交叉类型实现多个约束
function process<T extends HasLength & HasName>(arg: T): void {
  console.log(arg.length);
  console.log(arg.name);
}

process({ length: 10, name: "test" }); // 正确
```

### 在泛型约束中使用类型参数

```typescript
// K 必须是 T 的键
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

let obj = { a: 1, b: 2, c: 3, d: 4 };

getProperty(obj, "a"); // 正确
getProperty(obj, "b"); // 正确
// getProperty(obj, "e"); // 错误：'e' 不是 obj 的键
```

### 使用类类型约束

```typescript
// 约束必须是类类型
function create<T extends new (...args: any[]) => any>(
  constructor: T,
  ...args: any[]
): InstanceType<T> {
  return new constructor(...args);
}

class Person {
  constructor(public name: string, public age: number) {}
}

const person = create(Person, "Alice", 30);
// person 的类型是 Person
```

## 泛型接口

### 基本泛型接口

```typescript
interface GenericBox<T> {
  value: T;
  getValue(): T;
  setValue(value: T): void;
}

const numberBox: GenericBox<number> = {
  value: 42,
  getValue() {
    return this.value;
  },
  setValue(value) {
    this.value = value;
  }
};

const stringBox: GenericBox<string> = {
  value: "hello",
  getValue() {
    return this.value;
  },
  setValue(value) {
    this.value = value;
  }
};
```

### 泛型数据结构

```typescript
// 栈接口
interface Stack<T> {
  push(item: T): void;
  pop(): T | undefined;
  peek(): T | undefined;
  size(): number;
}

class ArrayStack<T> implements Stack<T> {
  private items: T[] = [];
  
  push(item: T): void {
    this.items.push(item);
  }
  
  pop(): T | undefined {
    return this.items.pop();
  }
  
  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }
  
  size(): number {
    return this.items.length;
  }
}

const numberStack = new ArrayStack<number>();
numberStack.push(1);
numberStack.push(2);
console.log(numberStack.pop()); // 2
```

### 泛型响应接口

```typescript
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

interface User {
  id: number;
  name: string;
  email: string;
}

async function getUser(id: number): Promise<ApiResponse<User>> {
  // 模拟 API 请求
  return {
    code: 200,
    message: "Success",
    data: {
      id: id,
      name: "Alice",
      email: "alice@example.com"
    },
    timestamp: Date.now()
  };
}

// 泛型分页接口
interface PageResponse<T> extends ApiResponse<T> {
  page: number;
  pageSize: number;
  total: number;
}

async function getUserList(): Promise<PageResponse<User[]>> {
  return {
    code: 200,
    message: "Success",
    data: [
      { id: 1, name: "Alice", email: "alice@example.com" },
      { id: 2, name: "Bob", email: "bob@example.com" }
    ],
    page: 1,
    pageSize: 10,
    total: 100,
    timestamp: Date.now()
  };
}
```

## 泛型类

### 基本泛型类

```typescript
class GenericNumber<T> {
  zeroValue: T;
  add: (x: T, y: T) => T;
  
  constructor(zeroValue: T, add: (x: T, y: T) => T) {
    this.zeroValue = zeroValue;
    this.add = add;
  }
}

// 数字版本
let myGenericNumber = new GenericNumber<number>(
  0,
  (x, y) => x + y
);

// 字符串版本
let myGenericString = new GenericNumber<string>(
  "",
  (x, y) => x + y
);

console.log(myGenericNumber.add(5, 10)); // 15
console.log(myGenericString.add("Hello", " World")); // "Hello World"
```

### 泛型数据结构类

```typescript
// 双向链表
class LinkedListNode<T> {
  constructor(
    public value: T,
    public next: LinkedListNode<T> | null = null,
    public prev: LinkedListNode<T> | null = null
  ) {}
}

class LinkedList<T> {
  private head: LinkedListNode<T> | null = null;
  private tail: LinkedListNode<T> | null = null;
  private length: number = 0;
  
  append(value: T): void {
    const node = new LinkedListNode(value);
    
    if (!this.tail) {
      this.head = this.tail = node;
    } else {
      this.tail.next = node;
      node.prev = this.tail;
      this.tail = node;
    }
    
    this.length++;
  }
  
  prepend(value: T): void {
    const node = new LinkedListNode(value);
    
    if (!this.head) {
      this.head = this.tail = node;
    } else {
      node.next = this.head;
      this.head.prev = node;
      this.head = node;
    }
    
    this.length++;
  }
  
  toArray(): T[] {
    const result: T[] = [];
    let current = this.head;
    
    while (current) {
      result.push(current.value);
      current = current.next;
    }
    
    return result;
  }
  
  size(): number {
    return this.length;
  }
}

const list = new LinkedList<number>();
list.append(1);
list.append(2);
list.prepend(0);
console.log(list.toArray()); // [0, 1, 2]
```

### 泛型单例模式

```typescript
class Singleton<T> {
  private static instances: Map<any, any> = new Map();
  
  protected constructor() {}
  
  static getInstance<T>(this: new () => T): T {
    if (!Singleton.instances.has(this)) {
      Singleton.instances.set(this, new this());
    }
    return Singleton.instances.get(this);
  }
}

class Database extends Singleton<Database> {
  private connections: number = 0;
  
  connect() {
    this.connections++;
    console.log(`Connected. Total connections: ${this.connections}`);
  }
}

const db1 = Database.getInstance();
const db2 = Database.getInstance();

db1.connect(); // Connected. Total connections: 1
db2.connect(); // Connected. Total connections: 2

console.log(db1 === db2); // true
```

## 泛型工具类型

### 内置工具类型

```typescript
// Partial - 所有属性变为可选
type MyPartial<T> = {
  [P in keyof T]?: T[P];
};

// Required - 所有属性变为必需
type MyRequired<T> = {
  [P in keyof T]-?: T[P];
};

// Readonly - 所有属性变为只读
type MyReadonly<T> = {
  readonly [P in keyof T]: T[P];
};

// Pick - 选择部分属性
type MyPick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// Omit - 排除部分属性
type MyOmit<T, K extends keyof T> = {
  [P in Exclude<keyof T, K>]: T[P];
};

// Record - 创建对象类型
type MyRecord<K extends keyof any, T> = {
  [P in K]: T;
};

// Exclude - 从联合类型中排除类型
type MyExclude<T, U> = T extends U ? never : T;

// Extract - 从联合类型中提取类型
type MyExtract<T, U> = T extends U ? T : never;

// NonNullable - 排除 null 和 undefined
type MyNonNullable<T> = T extends null | undefined ? never : T;

// ReturnType - 获取函数返回类型
type MyReturnType<T extends (...args: any) => any> = T extends (
  ...args: any
) => infer R
  ? R
  : never;

// Parameters - 获取函数参数类型
type MyParameters<T extends (...args: any) => any> = T extends (
  ...args: infer P
) => any
  ? P
  : never;
```

### 自定义工具类型

```typescript
// DeepPartial - 深度可选
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// DeepReadonly - 深度只读
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// Mutable - 移除只读
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

// ValueOf - 获取对象值的类型
type ValueOf<T> = T[keyof T];

interface Person {
  name: string;
  age: number;
  active: boolean;
}

type PersonValue = ValueOf<Person>; // string | number | boolean

// PromiseType - 提取 Promise 类型
type PromiseType<T> = T extends Promise<infer U> ? U : never;

type Result = PromiseType<Promise<string>>; // string

// FunctionKeys - 提取函数属性
type FunctionKeys<T> = {
  [K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];

interface MyObject {
  name: string;
  age: number;
  greet(): void;
  sayBye(): void;
}

type Funcs = FunctionKeys<MyObject>; // "greet" | "sayBye"

// NonFunctionKeys - 提取非函数属性
type NonFunctionKeys<T> = {
  [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];

type Props = NonFunctionKeys<MyObject>; // "name" | "age"
```

### 高级工具类型

```typescript
// RequireAtLeastOne - 至少需要一个属性
type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

interface Options {
  a?: string;
  b?: number;
  c?: boolean;
}

type AtLeastOne = RequireAtLeastOne<Options>;
// 必须至少有 a、b、c 其中之一

const valid1: AtLeastOne = { a: "hello" };
const valid2: AtLeastOne = { b: 42 };
const valid3: AtLeastOne = { a: "hi", b: 10 };
// const invalid: AtLeastOne = {}; // 错误

// RequireOnlyOne - 只能有一个属性
type RequireOnlyOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> &
      Partial<Record<Exclude<Keys, K>, undefined>>;
  }[Keys];

type OnlyOne = RequireOnlyOne<Options>;

const valid4: OnlyOne = { a: "hello" };
// const invalid2: OnlyOne = { a: "hello", b: 10 }; // 错误

// Flatten - 展平类型
type Flatten<T> = T extends Array<infer U> ? U : T;

type Arr = Flatten<string[]>; // string
type NotArr = Flatten<number>; // number

// DeepFlatten - 深度展平
type DeepFlatten<T> = T extends Array<infer U>
  ? DeepFlatten<U>
  : T;

type Deep = DeepFlatten<string[][][]>; // string
```

## 泛型约束实战

### 复制对象属性

```typescript
function copyFields<T extends U, U>(target: T, source: U): T {
  for (let key in source) {
    (target as any)[key] = source[key];
  }
  return target;
}

let obj1 = { a: 1, b: 2, c: 3, d: 4 };
let obj2 = copyFields(obj1, { b: 10, d: 20 });
// obj2 = { a: 1, b: 10, c: 3, d: 20 }
```

### 合并对象

```typescript
function merge<T, U>(obj1: T, obj2: U): T & U {
  return { ...obj1, ...obj2 };
}

const merged = merge(
  { name: "Alice", age: 25 },
  { email: "alice@example.com", active: true }
);
// merged: { name: string; age: number; email: string; active: boolean }
```

### 类型安全的事件系统

```typescript
type EventMap = Record<string, any>;

class TypedEventEmitter<T extends EventMap> {
  private events: {
    [K in keyof T]?: Array<(data: T[K]) => void>;
  } = {};
  
  on<K extends keyof T>(event: K, handler: (data: T[K]) => void): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event]!.push(handler);
  }
  
  emit<K extends keyof T>(event: K, data: T[K]): void {
    const handlers = this.events[event];
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }
  
  off<K extends keyof T>(event: K, handler: (data: T[K]) => void): void {
    const handlers = this.events[event];
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
}

// 使用
interface MyEvents {
  userLogin: { userId: string; timestamp: number };
  userLogout: { userId: string };
  dataUpdate: { key: string; value: any };
}

const emitter = new TypedEventEmitter<MyEvents>();

emitter.on("userLogin", (data) => {
  // data 的类型是 { userId: string; timestamp: number }
  console.log(`User ${data.userId} logged in at ${data.timestamp}`);
});

emitter.emit("userLogin", {
  userId: "123",
  timestamp: Date.now()
});
```

### 类型安全的 API 客户端

```typescript
interface ApiEndpoints {
  "/users": {
    GET: { response: User[] };
    POST: { body: Omit<User, "id">; response: User };
  };
  "/users/:id": {
    GET: { params: { id: string }; response: User };
    PUT: { params: { id: string }; body: Partial<User>; response: User };
    DELETE: { params: { id: string }; response: void };
  };
}

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

class ApiClient {
  async request<
    Path extends keyof ApiEndpoints,
    Method extends keyof ApiEndpoints[Path] & HttpMethod
  >(
    path: Path,
    method: Method,
    options?: ApiEndpoints[Path][Method] extends { params: infer P }
      ? { params: P }
      : {} & ApiEndpoints[Path][Method] extends { body: infer B }
      ? { body: B }
      : {}
  ): Promise<
    ApiEndpoints[Path][Method] extends { response: infer R } ? R : never
  > {
    // 实现 API 请求
    return {} as any;
  }
}

// 使用
const client = new ApiClient();

// 类型安全的请求
const users = await client.request("/users", "GET");
// users 的类型是 User[]

const newUser = await client.request("/users", "POST", {
  body: { name: "Alice", email: "alice@example.com" }
});
// newUser 的类型是 User

const user = await client.request("/users/:id", "GET", {
  params: { id: "123" }
});
// user 的类型是 User
```

## 泛型最佳实践

### 1. 使用有意义的类型参数名

```typescript
// ❌ 不好
function process<T, U, V>(a: T, b: U): V {
  // ...
}

// ✅ 好
function processUserData<UserData, ProcessedResult>(
  data: UserData
): ProcessedResult {
  // ...
}

// 常用约定
// T = Type
// K = Key
// V = Value
// E = Element
// P = Props
// S = State
```

### 2. 避免过度使用泛型

```typescript
// ❌ 不必要的泛型
function identity<T>(arg: T): T {
  return arg;
}

// ✅ 如果只用一次，可以直接用 any 或 unknown
function identity(arg: unknown): unknown {
  return arg;
}
```

### 3. 提供默认类型

```typescript
interface Response<T = any> {
  code: number;
  message: string;
  data: T;
}

// 可以不指定类型
const response1: Response = {
  code: 200,
  message: "OK",
  data: { anything: "here" }
};

// 也可以指定具体类型
const response2: Response<User> = {
  code: 200,
  message: "OK",
  data: { id: 1, name: "Alice" }
};
```

### 4. 使用约束提高类型安全

```typescript
// ❌ 太宽松
function getProperty<T>(obj: T, key: string) {
  return obj[key]; // 错误：无法索引
}

// ✅ 添加约束
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
```

### 5. 善用类型推断

```typescript
// ❌ 显式指定类型参数
const numbers = map<number, string>([1, 2, 3], (n) => n.toString());

// ✅ 让 TypeScript 推断
const numbers = map([1, 2, 3], (n) => n.toString());
```

## 总结

泛型是 TypeScript 中最强大的特性之一，它提供了：

1. **类型安全**：在编译时捕获类型错误
2. **代码复用**：一份代码适用于多种类型
3. **灵活性**：通过约束控制泛型的范围
4. **可维护性**：清晰的类型定义使代码更易理解

掌握泛型能够显著提升 TypeScript 代码的质量和开发效率。

