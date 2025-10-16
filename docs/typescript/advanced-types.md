# TypeScript 高级类型

高级类型是 TypeScript 类型系统的强大特性，包括类型别名、联合类型、交叉类型、字面量类型等。掌握这些特性能让我们编写更灵活、更安全的代码。

## 类型别名 (Type Aliases)

类型别名用 `type` 关键字为类型创建一个新名字。

### 基本用法

```typescript
// 为基础类型创建别名
type Name = string;
type Age = number;
type IsActive = boolean;

let userName: Name = "Alice";
let userAge: Age = 25;
let active: IsActive = true;

// 为对象类型创建别名
type Point = {
  x: number;
  y: number;
};

let point: Point = { x: 10, y: 20 };
```

### 函数类型别名

```typescript
// 函数类型
type Operation = (a: number, b: number) => number;

const add: Operation = (a, b) => a + b;
const subtract: Operation = (a, b) => a - b;
const multiply: Operation = (a, b) => a * b;

// 带泛型的函数类型
type Predicate<T> = (value: T) => boolean;
type Mapper<T, U> = (value: T) => U;

const isEven: Predicate<number> = (n) => n % 2 === 0;
const toString: Mapper<number, string> = (n) => n.toString();
```

### 复杂类型别名

```typescript
// 嵌套对象类型
type User = {
  id: number;
  name: string;
  address: {
    street: string;
    city: string;
    country: string;
  };
  contacts: {
    email: string;
    phone?: string;
  };
};

// 数组和元组类型
type StringArray = string[];
type NumberArray = Array<number>;
type Coordinates = [number, number];
type RGB = [number, number, number];

// 函数重载类型
type Overloaded = {
  (s: string): string;
  (n: number): number;
  (b: boolean): boolean;
};
```

## 联合类型 (Union Types)

联合类型表示一个值可以是几种类型之一，使用 `|` 分隔每个类型。

### 基本联合类型

```typescript
// 基础类型联合
type StringOrNumber = string | number;

let value: StringOrNumber;
value = "hello"; // 正确
value = 42; // 正确
// value = true; // 错误

// 函数参数使用联合类型
function formatValue(value: string | number): string {
  if (typeof value === "string") {
    return value.toUpperCase();
  }
  return value.toFixed(2);
}

formatValue("hello"); // "HELLO"
formatValue(42); // "42.00"
```

### 字面量联合类型

```typescript
// 字符串字面量联合
type Direction = "north" | "south" | "east" | "west";
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

function move(direction: Direction) {
  console.log(`Moving ${direction}`);
}

move("north"); // 正确
// move("up"); // 错误

// 数字字面量联合
type DiceRoll = 1 | 2 | 3 | 4 | 5 | 6;

function rollDice(): DiceRoll {
  return (Math.floor(Math.random() * 6) + 1) as DiceRoll;
}

// 混合字面量联合
type Status = "success" | "error" | 404 | 500;
type BooleanLike = true | false | 1 | 0 | "yes" | "no";
```

### 对象联合类型

```typescript
// 判别联合（Discriminated Unions）
type Square = {
  kind: "square";
  size: number;
};

type Rectangle = {
  kind: "rectangle";
  width: number;
  height: number;
};

type Circle = {
  kind: "circle";
  radius: number;
};

type Shape = Square | Rectangle | Circle;

function getArea(shape: Shape): number {
  switch (shape.kind) {
    case "square":
      return shape.size ** 2;
    case "rectangle":
      return shape.width * shape.height;
    case "circle":
      return Math.PI * shape.radius ** 2;
  }
}

// 使用
const square: Shape = { kind: "square", size: 10 };
const area = getArea(square); // 100
```

### 联合类型的类型守护

```typescript
type NetworkLoadingState = {
  state: "loading";
};

type NetworkFailedState = {
  state: "failed";
  code: number;
};

type NetworkSuccessState = {
  state: "success";
  response: {
    title: string;
    duration: number;
    summary: string;
  };
};

type NetworkState =
  | NetworkLoadingState
  | NetworkFailedState
  | NetworkSuccessState;

function renderState(state: NetworkState): string {
  // 使用类型守护
  switch (state.state) {
    case "loading":
      return "Loading...";
    case "failed":
      return `Error ${state.code}`;
    case "success":
      return `Downloaded ${state.response.title}`;
  }
}
```

## 交叉类型 (Intersection Types)

交叉类型将多个类型合并为一个类型，使用 `&` 连接。

### 基本交叉类型

```typescript
type Person = {
  name: string;
  age: number;
};

type Employee = {
  employeeId: number;
  department: string;
};

// 交叉类型包含两个类型的所有属性
type Staff = Person & Employee;

const staff: Staff = {
  name: "Alice",
  age: 30,
  employeeId: 12345,
  department: "Engineering"
};
```

### Mixin 模式

```typescript
// 定义基础类型
type Loggable = {
  log(): void;
};

type Serializable = {
  serialize(): string;
};

type Timestamped = {
  timestamp: Date;
};

// 组合多个类型
type LoggedSerializedTimestamped = Loggable & Serializable & Timestamped;

class DataRecord implements LoggedSerializedTimestamped {
  timestamp = new Date();
  
  log() {
    console.log("Logging data...");
  }
  
  serialize() {
    return JSON.stringify(this);
  }
}
```

### 交叉类型与联合类型的结合

```typescript
type A = { a: number };
type B = { b: string };
type C = { c: boolean };

// 联合类型的交叉类型
type AB = A & B; // { a: number; b: string }
type BC = B & C; // { b: string; c: boolean }

// 交叉类型的联合类型
type Union = (A & B) | (B & C);

const value1: Union = { a: 1, b: "hello" }; // 正确
const value2: Union = { b: "world", c: true }; // 正确
```

### 类型冲突

```typescript
type A = {
  value: string;
};

type B = {
  value: number;
};

// 交叉类型产生冲突
type C = A & B;
// C 的 value 类型是 string & number，即 never

const c: C = {
  // value 无法赋值，因为不存在既是 string 又是 number 的值
  value: "hello" as never
};
```

## 字面量类型 (Literal Types)

字面量类型是更具体的类型，可以是字符串、数字或布尔值的具体值。

### 字符串字面量类型

```typescript
type Easing = "ease-in" | "ease-out" | "ease-in-out";

class UIElement {
  animate(dx: number, dy: number, easing: Easing) {
    if (easing === "ease-in") {
      // ...
    } else if (easing === "ease-out") {
      // ...
    } else if (easing === "ease-in-out") {
      // ...
    }
  }
}

let element = new UIElement();
element.animate(0, 0, "ease-in"); // 正确
// element.animate(0, 0, "ease-up"); // 错误
```

### 数字字面量类型

```typescript
type DiceValue = 1 | 2 | 3 | 4 | 5 | 6;
type HttpStatus = 200 | 404 | 500;
type Version = 1 | 2 | 3;

function rollDice(): DiceValue {
  return (Math.floor(Math.random() * 6) + 1) as DiceValue;
}

function handleResponse(status: HttpStatus) {
  switch (status) {
    case 200:
      console.log("Success");
      break;
    case 404:
      console.log("Not Found");
      break;
    case 500:
      console.log("Server Error");
      break;
  }
}
```

### 布尔字面量类型

```typescript
type True = true;
type False = false;

// 通常用于类型守护
function isTrue(value: any): value is True {
  return value === true;
}

// 限制函数参数
function setFlag(flag: true) {
  console.log("Flag is set");
}

setFlag(true); // 正确
// setFlag(false); // 错误
```

### 模板字面量类型

```typescript
// 基本模板字面量
type World = "world";
type Greeting = `hello ${World}`; // "hello world"

// 联合类型的模板字面量
type Color = "red" | "blue" | "green";
type Shade = "light" | "dark";
type ColorShade = `${Shade}-${Color}`;
// "light-red" | "light-blue" | "light-green" | "dark-red" | "dark-blue" | "dark-green"

// 事件名称生成
type PropEventSource<T> = {
  on<K extends string & keyof T>(
    eventName: `${K}Changed`,
    callback: (newValue: T[K]) => void
  ): void;
};

declare function makeWatchedObject<T>(obj: T): T & PropEventSource<T>;

const person = makeWatchedObject({
  firstName: "Alice",
  age: 30
});

person.on("firstNameChanged", (newValue) => {
  // newValue 的类型是 string
  console.log(`Name changed to ${newValue}`);
});

person.on("ageChanged", (newValue) => {
  // newValue 的类型是 number
  console.log(`Age changed to ${newValue}`);
});
```

### 内置字符串操作类型

```typescript
// Uppercase - 转大写
type Loud = Uppercase<"hello">; // "HELLO"

// Lowercase - 转小写
type Quiet = Lowercase<"HELLO">; // "hello"

// Capitalize - 首字母大写
type Cap = Capitalize<"hello">; // "Hello"

// Uncapitalize - 首字母小写
type Uncap = Uncapitalize<"Hello">; // "hello"

// 实际应用
type Methods = "get" | "post" | "put" | "delete";
type MethodHandlers = {
  [M in Methods as `handle${Capitalize<M>}`]: () => void;
};
// {
//   handleGet: () => void;
//   handlePost: () => void;
//   handlePut: () => void;
//   handleDelete: () => void;
// }
```

## 类型守护 (Type Guards)

虽然类型守护会在专门章节详细介绍，这里简单展示其在高级类型中的应用。

### typeof 类型守护

```typescript
function padLeft(value: string, padding: string | number) {
  if (typeof padding === "number") {
    return " ".repeat(padding) + value;
  }
  return padding + value;
}

padLeft("Hello", 4); // "    Hello"
padLeft("Hello", ">>> "); // ">>> Hello"
```

### instanceof 类型守护

```typescript
class Bird {
  fly() {
    console.log("Flying");
  }
}

class Fish {
  swim() {
    console.log("Swimming");
  }
}

function move(animal: Bird | Fish) {
  if (animal instanceof Bird) {
    animal.fly();
  } else {
    animal.swim();
  }
}
```

### in 操作符

```typescript
type Fish = { swim: () => void };
type Bird = { fly: () => void };

function move(animal: Fish | Bird) {
  if ("swim" in animal) {
    animal.swim();
  } else {
    animal.fly();
  }
}
```

## 映射类型 (Mapped Types)

映射类型可以基于旧类型创建新类型。

### 基本映射类型

```typescript
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

type Partial<T> = {
  [P in keyof T]?: T[P];
};

type Required<T> = {
  [P in keyof T]-?: T[P];
};

// 使用
interface Person {
  name: string;
  age: number;
}

type ReadonlyPerson = Readonly<Person>;
// { readonly name: string; readonly age: number; }

type PartialPerson = Partial<Person>;
// { name?: string; age?: number; }
```

### 键重映射

```typescript
type Getters<T> = {
  [P in keyof T as `get${Capitalize<string & P>}`]: () => T[P];
};

interface Person {
  name: string;
  age: number;
}

type PersonGetters = Getters<Person>;
// {
//   getName: () => string;
//   getAge: () => number;
// }
```

### 条件映射

```typescript
type NonNullableProperties<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

type StringProperties<T> = {
  [P in keyof T as T[P] extends string ? P : never]: T[P];
};

interface User {
  id: number;
  name: string;
  email: string | null;
  age: number;
}

type UserStrings = StringProperties<User>;
// { name: string; email: string | null }
```

## 条件类型 (Conditional Types)

条件类型根据条件表达式选择类型。

### 基本条件类型

```typescript
type TypeName<T> = T extends string
  ? "string"
  : T extends number
  ? "number"
  : T extends boolean
  ? "boolean"
  : T extends undefined
  ? "undefined"
  : T extends Function
  ? "function"
  : "object";

type T0 = TypeName<string>; // "string"
type T1 = TypeName<42>; // "number"
type T2 = TypeName<true>; // "boolean"
type T3 = TypeName<() => void>; // "function"
type T4 = TypeName<string[]>; // "object"
```

### 分布式条件类型

```typescript
// 联合类型会被分发
type ToArray<T> = T extends any ? T[] : never;

type StrArrOrNumArr = ToArray<string | number>;
// string[] | number[] (分发后)
// 而不是 (string | number)[]

// 阻止分发
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;

type StrOrNumArr = ToArrayNonDist<string | number>;
// (string | number)[]
```

### infer 关键字

```typescript
// 提取函数返回类型
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

type Func = () => string;
type Result = ReturnType<Func>; // string

// 提取数组元素类型
type Flatten<T> = T extends Array<infer U> ? U : T;

type Str = Flatten<string[]>; // string
type Num = Flatten<number>; // number

// 提取 Promise 返回类型
type Unpacked<T> = T extends Promise<infer U> ? U : T;

type PromiseStr = Unpacked<Promise<string>>; // string
type RegularStr = Unpacked<string>; // string
```

### 递归条件类型

```typescript
// 深度 Readonly
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

interface Person {
  name: string;
  address: {
    city: string;
    country: string;
  };
}

type ReadonlyPerson = DeepReadonly<Person>;
// {
//   readonly name: string;
//   readonly address: {
//     readonly city: string;
//     readonly country: string;
//   }
// }
```

## 工具类型 (Utility Types)

TypeScript 提供了许多内置的工具类型。

### Partial & Required

```typescript
interface Todo {
  title: string;
  description: string;
  completed: boolean;
}

// Partial - 所有属性可选
type PartialTodo = Partial<Todo>;
// { title?: string; description?: string; completed?: boolean }

// Required - 所有属性必需
type RequiredTodo = Required<PartialTodo>;
// { title: string; description: string; completed: boolean }
```

### Pick & Omit

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  address: string;
}

// Pick - 选择部分属性
type UserPreview = Pick<User, "id" | "name" | "email">;
// { id: number; name: string; email: string }

// Omit - 排除部分属性
type UserWithoutAddress = Omit<User, "address">;
// { id: number; name: string; email: string; age: number }
```

### Record

```typescript
// 创建对象类型
type PageInfo = {
  title: string;
  url: string;
};

type Pages = "home" | "about" | "contact";

const pages: Record<Pages, PageInfo> = {
  home: { title: "Home", url: "/" },
  about: { title: "About", url: "/about" },
  contact: { title: "Contact", url: "/contact" }
};
```

### Exclude & Extract

```typescript
type T0 = Exclude<"a" | "b" | "c", "a">; // "b" | "c"
type T1 = Exclude<string | number | (() => void), Function>; // string | number

type T2 = Extract<"a" | "b" | "c", "a" | "f">; // "a"
type T3 = Extract<string | number | (() => void), Function>; // () => void
```

### NonNullable

```typescript
type T0 = NonNullable<string | number | undefined>; // string | number
type T1 = NonNullable<string[] | null | undefined>; // string[]
```

### ReturnType & Parameters

```typescript
function f1(a: number, b: string): boolean {
  return true;
}

type T0 = ReturnType<typeof f1>; // boolean
type T1 = Parameters<typeof f1>; // [number, string]

// 实际应用
type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (
  ...args: any
) => Promise<infer R>
  ? R
  : never;

async function getData(): Promise<{ name: string; age: number }> {
  return { name: "Alice", age: 30 };
}

type Data = AsyncReturnType<typeof getData>; // { name: string; age: number }
```

## 实战示例

### API 响应类型

```typescript
type ApiResponse<T> =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "success"; data: T };

// 使用
interface User {
  id: number;
  name: string;
}

function handleResponse(response: ApiResponse<User>) {
  switch (response.status) {
    case "loading":
      console.log("Loading...");
      break;
    case "error":
      console.log("Error:", response.error);
      break;
    case "success":
      console.log("User:", response.data.name);
      break;
  }
}
```

### 深度可选类型

```typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

interface Config {
  database: {
    host: string;
    port: number;
    credentials: {
      username: string;
      password: string;
    };
  };
  cache: {
    enabled: boolean;
    ttl: number;
  };
}

type PartialConfig = DeepPartial<Config>;
// 所有嵌套属性都变为可选
```

### 类型安全的事件系统

```typescript
type EventMap = {
  click: { x: number; y: number };
  change: { value: string };
  submit: { data: Record<string, any> };
};

class EventEmitter<T extends Record<string, any>> {
  on<K extends keyof T>(event: K, handler: (data: T[K]) => void) {
    // 实现
  }
  
  emit<K extends keyof T>(event: K, data: T[K]) {
    // 实现
  }
}

const emitter = new EventEmitter<EventMap>();

emitter.on("click", (data) => {
  // data 的类型是 { x: number; y: number }
  console.log(data.x, data.y);
});

emitter.emit("click", { x: 10, y: 20 });
```

## 总结

TypeScript 的高级类型提供了强大的类型操作能力：

1. **类型别名**：为类型创建新名字
2. **联合类型**：值可以是多种类型之一
3. **交叉类型**：组合多个类型
4. **字面量类型**：更精确的类型定义
5. **映射类型**：基于旧类型创建新类型
6. **条件类型**：根据条件选择类型
7. **工具类型**：内置的类型转换工具


