# TypeScript 基础类型

TypeScript 的类型系统是其核心特性，提供了丰富的基础类型来描述 JavaScript 中的各种值。掌握这些基础类型是学习 TypeScript 的第一步。

## 布尔类型 (Boolean)

最基本的数据类型，只有 `true` 和 `false` 两个值。

```typescript
let isDone: boolean = false;
let isActive: boolean = true;

// 类型推断
let isValid = true; // 自动推断为 boolean
```

## 数字类型 (Number)

TypeScript 中所有数字都是浮点数，支持十进制、十六进制、二进制和八进制字面量。

```typescript
// 十进制
let decimal: number = 6;

// 十六进制
let hex: number = 0xf00d;

// 二进制
let binary: number = 0b1010;

// 八进制
let octal: number = 0o744;

// 大整数 (ES2020)
let big: bigint = 100n;

// 数字分隔符 (ES2021)
let million: number = 1_000_000;
let billion: number = 1_000_000_000;
```

### 数字方法和属性

```typescript
const num: number = 123.456;

// 转换为字符串
num.toString(); // "123.456"
num.toFixed(2); // "123.46"
num.toExponential(2); // "1.23e+2"

// 数字常量
Number.MAX_VALUE;
Number.MIN_VALUE;
Number.NaN;
Number.POSITIVE_INFINITY;
Number.NEGATIVE_INFINITY;
```

## 字符串类型 (String)

用于表示文本数据，可以使用单引号、双引号或模板字符串。

```typescript
let color: string = "blue";
let name: string = 'Alice';

// 模板字符串
let sentence: string = `Hello, my name is ${name}.
I am a developer.`;

// 字符串方法
name.toUpperCase(); // "ALICE"
name.toLowerCase(); // "alice"
name.charAt(0); // "A"
name.substring(0, 2); // "Al"
name.split(''); // ['A', 'l', 'i', 'c', 'e']
```

### 字符串字面量类型

```typescript
// 限制字符串的取值
type Direction = "up" | "down" | "left" | "right";
let dir: Direction = "up"; // 只能是这四个值之一

type Color = "red" | "green" | "blue";
let color: Color = "red";
```

## 数组类型 (Array)

有两种定义数组类型的方式：

### 方式 1：类型 + 方括号

```typescript
let list: number[] = [1, 2, 3];
let names: string[] = ["Alice", "Bob", "Charlie"];
let flags: boolean[] = [true, false, true];
```

### 方式 2：数组泛型

```typescript
let list: Array<number> = [1, 2, 3];
let names: Array<string> = ["Alice", "Bob"];
```

### 多维数组

```typescript
// 二维数组
let matrix: number[][] = [
  [1, 2, 3],
  [4, 5, 6]
];

let grid: Array<Array<number>> = [
  [1, 2],
  [3, 4]
];
```

### 数组方法

```typescript
const numbers: number[] = [1, 2, 3, 4, 5];

// 添加和删除
numbers.push(6); // [1, 2, 3, 4, 5, 6]
numbers.pop(); // 6
numbers.shift(); // 1
numbers.unshift(0); // [0, 2, 3, 4, 5]

// 查找
numbers.indexOf(3); // 索引
numbers.includes(3); // boolean
numbers.find(n => n > 3); // 4
numbers.findIndex(n => n > 3); // 3

// 转换
numbers.map(n => n * 2); // [2, 4, 6, 8, 10]
numbers.filter(n => n > 2); // [3, 4, 5]
numbers.reduce((sum, n) => sum + n, 0); // 15

// 排序
numbers.sort((a, b) => a - b);
numbers.reverse();
```

## 元组类型 (Tuple)

元组类型允许表示一个已知元素数量和类型的数组，各元素的类型不必相同。

```typescript
// 声明元组
let tuple: [string, number];
tuple = ["hello", 10]; // 正确
// tuple = [10, "hello"]; // 错误：类型不匹配

// 访问元素
console.log(tuple[0].substring(1)); // "ello"
console.log(tuple[1].toFixed(2)); // "10.00"

// 越界访问
// tuple[2] = "world"; // 错误
```

### 元组的可选元素

```typescript
let tuple: [string, number?];
tuple = ["hello"]; // 正确
tuple = ["hello", 10]; // 正确
```

### 元组的剩余元素

```typescript
// 使用剩余元素定义不定长元组
type StringNumberBooleans = [string, number, ...boolean[]];
let t1: StringNumberBooleans = ["hello", 1];
let t2: StringNumberBooleans = ["hello", 1, true, false];

// 命名元组
type Range = [start: number, end: number];
type Options = [enabled: boolean, timeout?: number];
```

### 元组解构

```typescript
const tuple: [string, number, boolean] = ["Alice", 25, true];

// 解构赋值
const [name, age, active] = tuple;
console.log(name); // "Alice"
console.log(age); // 25
console.log(active); // true

// 函数返回元组
function getUser(): [string, number] {
  return ["Alice", 25];
}

const [userName, userAge] = getUser();
```

## 枚举类型 (Enum)

枚举类型用于定义数值集合，提供友好的名称。

### 数字枚举

```typescript
enum Direction {
  Up,    // 0
  Down,  // 1
  Left,  // 2
  Right  // 3
}

let dir: Direction = Direction.Up;
console.log(dir); // 0

// 指定起始值
enum Color {
  Red = 1,
  Green,  // 2
  Blue    // 3
}

// 指定所有值
enum Status {
  Success = 200,
  NotFound = 404,
  ServerError = 500
}
```

### 字符串枚举

```typescript
enum Direction {
  Up = "UP",
  Down = "DOWN",
  Left = "LEFT",
  Right = "RIGHT"
}

let dir: Direction = Direction.Up;
console.log(dir); // "UP"

enum LogLevel {
  ERROR = "ERROR",
  WARN = "WARN",
  INFO = "INFO",
  DEBUG = "DEBUG"
}
```

### 异构枚举

```typescript
enum BooleanLikeHeterogeneousEnum {
  No = 0,
  Yes = "YES"
}
```

### 常量枚举

```typescript
// 常量枚举会在编译时被移除
const enum Directions {
  Up,
  Down,
  Left,
  Right
}

let dir = Directions.Up;

// 编译后的 JavaScript
// let dir = 0;
```

### 枚举成员的类型

```typescript
enum ShapeKind {
  Circle,
  Square
}

interface Circle {
  kind: ShapeKind.Circle;
  radius: number;
}

interface Square {
  kind: ShapeKind.Square;
  sideLength: number;
}

let circle: Circle = {
  kind: ShapeKind.Circle,
  radius: 100
};
```

### 反向映射

```typescript
enum Direction {
  Up = 1,
  Down,
  Left,
  Right
}

console.log(Direction.Up); // 1
console.log(Direction[1]); // "Up"

// 获取枚举的所有键
const keys = Object.keys(Direction).filter(key => isNaN(Number(key)));
console.log(keys); // ["Up", "Down", "Left", "Right"]
```

## Any 类型

`any` 类型表示任意类型，会关闭类型检查。

```typescript
let notSure: any = 4;
notSure = "maybe a string"; // 正确
notSure = false; // 正确

// 访问任意属性和方法
notSure.toFixed(); // 不会报错，但可能在运行时出错
notSure.ifItExists(); // 不会报错
notSure.something.deeply.nested; // 不会报错

// any 类型的数组
let list: any[] = [1, true, "free"];
list[1] = 100;
```

### 何时使用 any

```typescript
// 1. 从 JavaScript 迁移到 TypeScript
let legacy: any = getLegacyData();

// 2. 第三方库没有类型定义
declare const jQuery: any;

// 3. 值的类型真的无法确定
function parse(input: string): any {
  return JSON.parse(input);
}

// 但通常应该避免使用 any，可以使用 unknown 代替
```

## Unknown 类型

`unknown` 是 `any` 的类型安全版本，任何值都可以赋给 `unknown`，但不能直接使用。

```typescript
let value: unknown;

value = true; // 正确
value = 42; // 正确
value = "hello"; // 正确
value = []; // 正确
value = {}; // 正确

// 不能直接使用 unknown 类型的值
// let value1: boolean = value; // 错误
// value.toFixed(); // 错误
// value.toLowerCase(); // 错误

// 需要先进行类型检查
if (typeof value === "string") {
  console.log(value.toUpperCase()); // 正确
}

if (typeof value === "number") {
  console.log(value.toFixed(2)); // 正确
}
```

### unknown vs any

```typescript
// any：完全不进行类型检查
let anyValue: any = "hello";
anyValue.toUpperCase(); // 不会报错
anyValue.someMethod(); // 不会报错（但运行时可能出错）

// unknown：必须进行类型检查
let unknownValue: unknown = "hello";
// unknownValue.toUpperCase(); // 错误
if (typeof unknownValue === "string") {
  unknownValue.toUpperCase(); // 正确
}
```

## Void 类型

`void` 表示没有任何类型，通常用于函数没有返回值的情况。

```typescript
// 函数没有返回值
function warnUser(): void {
  console.log("This is a warning message");
}

// 可以返回 undefined
function doSomething(): void {
  return undefined;
}

// 变量声明为 void（几乎不使用）
let unusable: void = undefined;
// unusable = null; // 错误（strictNullChecks 下）
```

## Null 和 Undefined

TypeScript 中，`undefined` 和 `null` 有各自的类型。

```typescript
let u: undefined = undefined;
let n: null = null;

// 默认情况下，null 和 undefined 是所有类型的子类型
let num: number = undefined; // 正确（非严格模式）
let str: string = null; // 正确（非严格模式）

// 启用 strictNullChecks 后
// let num: number = undefined; // 错误
// let str: string = null; // 错误

// 使用联合类型
let value: string | null = null;
value = "hello";

let count: number | undefined = undefined;
count = 42;
```

### 可选属性和可选参数

```typescript
// 可选属性（自动包含 undefined）
interface User {
  name: string;
  age?: number; // number | undefined
}

const user1: User = { name: "Alice" };
const user2: User = { name: "Bob", age: 25 };

// 可选参数
function greet(name: string, greeting?: string): string {
  return `${greeting || "Hello"}, ${name}!`;
}

greet("Alice"); // "Hello, Alice!"
greet("Bob", "Hi"); // "Hi, Bob!"
```

## Never 类型

`never` 类型表示永不存在的值的类型，是所有类型的子类型。

```typescript
// 永远抛出错误的函数
function error(message: string): never {
  throw new Error(message);
}

// 永远不会返回的函数
function infiniteLoop(): never {
  while (true) {
    // 无限循环
  }
}

// 类型守护中的 never
function exhaustiveCheck(value: never): never {
  throw new Error(`Unhandled value: ${value}`);
}

type Shape = Circle | Square;

function getArea(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.sideLength ** 2;
    default:
      return exhaustiveCheck(shape); // 确保处理了所有情况
  }
}
```

### never 的应用场景

```typescript
// 1. 详尽性检查
type Action = { type: "increment" } | { type: "decrement" };

function reducer(action: Action) {
  switch (action.type) {
    case "increment":
      return;
    case "decrement":
      return;
    default:
      const _exhaustiveCheck: never = action;
      return _exhaustiveCheck;
  }
}

// 2. 过滤联合类型
type NonNullable<T> = T extends null | undefined ? never : T;

type Result = NonNullable<string | number | null>; // string | number
```

## Object 类型

`object` 类型表示非原始类型，即除 `number`、`string`、`boolean`、`symbol`、`null` 或 `undefined` 之外的类型。

```typescript
// object 类型
let obj: object;

obj = { prop: 0 }; // 正确
obj = [1, 2, 3]; // 正确
obj = () => {}; // 正确

// obj = 1; // 错误
// obj = "string"; // 错误
// obj = true; // 错误
// obj = null; // 错误

// Object（大写）类型
let obj2: Object;
obj2 = { prop: 0 }; // 正确
obj2 = 1; // 正确（装箱类型）
obj2 = "string"; // 正确

// {}（空对象类型）
let obj3: {};
obj3 = { prop: 0 }; // 正确
obj3 = 1; // 正确
obj3 = "string"; // 正确
// obj3 = null; // 错误
// obj3 = undefined; // 错误
```

### 对象字面量类型

```typescript
// 具体的对象类型
let point: { x: number; y: number };
point = { x: 10, y: 20 };

// 可选属性
let user: { name: string; age?: number };
user = { name: "Alice" };
user = { name: "Bob", age: 25 };

// 只读属性
let readonlyPoint: { readonly x: number; readonly y: number };
readonlyPoint = { x: 10, y: 20 };
// readonlyPoint.x = 5; // 错误

// 索引签名
let dict: { [key: string]: number };
dict = { a: 1, b: 2, c: 3 };
```

## Symbol 类型

`symbol` 是 ES6 引入的原始数据类型，表示独一无二的值。

```typescript
// 创建 symbol
let sym1: symbol = Symbol();
let sym2: symbol = Symbol("key");

// 每个 symbol 都是唯一的
let sym3 = Symbol("key");
console.log(sym2 === sym3); // false

// 作为对象属性
const sym = Symbol("name");
let obj = {
  [sym]: "value"
};

console.log(obj[sym]); // "value"

// 内置 symbol
Symbol.iterator;
Symbol.hasInstance;
Symbol.toPrimitive;
```

## 类型断言

当你比 TypeScript 更了解某个值的类型时，可以使用类型断言。

### as 语法

```typescript
let someValue: unknown = "this is a string";
let strLength: number = (someValue as string).length;

// 多次断言
let value = someValue as any as number;
```

### 尖括号语法

```typescript
let someValue: unknown = "this is a string";
let strLength: number = (<string>someValue).length;

// 注意：在 JSX 中不能使用尖括号语法，必须使用 as
```

### 非空断言

```typescript
// 告诉编译器某个值一定不是 null 或 undefined
function getValue(): string | null {
  return "hello";
}

let value = getValue();
// console.log(value.length); // 错误
console.log(value!.length); // 正确（使用 !）

// DOM 操作中常用
const button = document.getElementById("btn")!;
button.addEventListener("click", () => {});
```

### const 断言

```typescript
// as const 会将类型推断为最具体的类型
let x = "hello"; // string
let y = "hello" as const; // "hello"

const arr = [1, 2, 3]; // number[]
const arr2 = [1, 2, 3] as const; // readonly [1, 2, 3]

const obj = { x: 10, y: 20 }; // { x: number; y: number }
const obj2 = { x: 10, y: 20 } as const; // { readonly x: 10; readonly y: 20 }
```

## 类型推断

TypeScript 能够根据上下文自动推断类型。

```typescript
// 变量初始化
let x = 3; // number
let name = "Alice"; // string
let flag = true; // boolean

// 函数返回值
function add(a: number, b: number) {
  return a + b; // 推断返回类型为 number
}

// 数组
let numbers = [1, 2, 3]; // number[]
let mixed = [1, "two", true]; // (number | string | boolean)[]

// 对象
let point = { x: 10, y: 20 }; // { x: number; y: number }

// 最佳通用类型
let zoo = [new Rhino(), new Elephant(), new Snake()];
// 推断为 (Rhino | Elephant | Snake)[]
```

### 上下文类型推断

```typescript
// 事件处理
window.onmousedown = function(mouseEvent) {
  // mouseEvent 自动推断为 MouseEvent
  console.log(mouseEvent.button);
};

// 数组方法
const numbers = [1, 2, 3];
numbers.map(num => num * 2); // num 推断为 number
```

## 类型别名 vs 接口

选择使用哪种方式取决于具体需求，在基础类型章节中简单对比：

```typescript
// 类型别名：可以为任何类型创建别名
type Name = string;
type Point = { x: number; y: number };
type SetPoint = (x: number, y: number) => void;

// 接口：主要用于对象类型
interface IPoint {
  x: number;
  y: number;
}

// 两者在对象类型上几乎等价
type PointAlias = { x: number; y: number };
interface PointInterface { x: number; y: number }

let p1: PointAlias = { x: 1, y: 2 };
let p2: PointInterface = { x: 1, y: 2 };
```

## 总结

TypeScript 的基础类型为我们提供了丰富的类型定义能力：

- **原始类型**：`boolean`、`number`、`string`、`symbol`
- **复合类型**：`array`、`tuple`、`object`
- **特殊类型**：`any`、`unknown`、`void`、`null`、`undefined`、`never`
- **枚举类型**：`enum`

理解这些基础类型是掌握 TypeScript 的基础，后续的高级类型、接口、泛型等都建立在这些基础类型之上。

