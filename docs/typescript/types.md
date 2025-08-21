# TypeScript 类型定义

深入了解 TypeScript 的类型系统，包括基础类型、复合类型和高级类型特性。

## 基础类型详解

### 原始类型的扩展用法

```typescript
// 字符串类型的模板字面量类型
type Greeting = `Hello ${string}`;
let greeting1: Greeting = "Hello World"; // ✓
let greeting2: Greeting = "Hi there"; // ✗ 类型错误

// 数字类型的范围限制
type PositiveNumber = number & { __brand: 'positive' };
function createPositive(n: number): PositiveNumber | null {
  return n > 0 ? n as PositiveNumber : null;
}

// 符号类型
const sym1 = Symbol();
const sym2 = Symbol("key");
type MySymbol = typeof sym1;
```

### BigInt 和 Symbol

```typescript
// BigInt 类型
let big: bigint = 100n;
let anotherBig: bigint = BigInt(100);

// Symbol 类型
let sym = Symbol("description");
type UniqueSymbol = typeof sym;

// 唯一符号类型
const uniqueSymbol: unique symbol = Symbol();
type UniqueSymbolType = typeof uniqueSymbol;
```

## 对象类型

### 对象类型的高级用法

```typescript
// 索引签名
interface StringArray {
  [index: number]: string;
}

interface StringDictionary {
  [key: string]: string;
}

// 混合索引签名
interface NumberOrStringDictionary {
  [index: string]: number | string;
  [index: number]: number; // 数字索引的返回值必须是字符串索引返回值的子类型
}

// 只读属性
interface ReadonlyPoint {
  readonly x: number;
  readonly y: number;
}

let p1: ReadonlyPoint = { x: 10, y: 20 };
// p1.x = 5; // 错误！
```

### 函数类型详解

```typescript
// 函数类型表达式
type GreetFunction = (a: string) => void;

// 调用签名
type DescribableFunction = {
  description: string;
  (someArg: number): boolean;
};

function doSomething(fn: DescribableFunction) {
  console.log(fn.description + " returned " + fn(6));
}

// 构造签名
type SomeConstructor = {
  new (s: string): SomeObject;
};

function fn(ctor: SomeConstructor) {
  return new ctor("hello");
}

// 函数重载
function makeDate(timestamp: number): Date;
function makeDate(m: number, d: number, y: number): Date;
function makeDate(mOrTimestamp: number, d?: number, y?: number): Date {
  if (d !== undefined && y !== undefined) {
    return new Date(y, mOrTimestamp, d);
  } else {
    return new Date(mOrTimestamp);
  }
}
```

## 联合类型和交叉类型

### 联合类型的高级用法

```typescript
// 判别联合类型
interface Square {
  kind: "square";
  size: number;
}

interface Rectangle {
  kind: "rectangle";
  width: number;
  height: number;
}

interface Circle {
  kind: "circle";
  radius: number;
}

type Shape = Square | Rectangle | Circle;

function getArea(shape: Shape) {
  switch (shape.kind) {
    case "square":
      return shape.size * shape.size;
    case "rectangle":
      return shape.width * shape.height;
    case "circle":
      return Math.PI * shape.radius ** 2;
    default:
      // 穷尽性检查
      const _exhaustiveCheck: never = shape;
      return _exhaustiveCheck;
  }
}

// 联合类型的类型收窄
function padLeft(value: string, padding: string | number) {
  if (typeof padding === "number") {
    return Array(padding + 1).join(" ") + value;
  }
  if (typeof padding === "string") {
    return padding + value;
  }
}
```

### 交叉类型

```typescript
// 交叉类型基础
interface Colorful {
  color: string;
}

interface Circle {
  radius: number;
}

type ColorfulCircle = Colorful & Circle;

function draw(circle: ColorfulCircle) {
  console.log(`Color was ${circle.color}`);
  console.log(`Radius was ${circle.radius}`);
}

// 交叉类型与联合类型的组合
type PrimaryColor = "red" | "green" | "blue";
type SecondaryColor = "orange" | "purple" | "yellow";
type Color = PrimaryColor | SecondaryColor;

interface ColoredShape {
  color: Color;
}

type ColoredSquare = ColoredShape & Square;
```

## 字面量类型

### 字符串字面量类型

```typescript
// 字符串字面量类型
type EventNames = "click" | "scroll" | "mousemove";

function handleEvent(ele: Element, event: EventNames) {
  // ...
}

// 模板字面量类型
type World = "world";
type Greeting = `hello ${World}`; // "hello world"

type EmailLocaleIDs = "welcome_email" | "email_heading";
type FooterLocaleIDs = "footer_title" | "footer_sendoff";
type AllLocaleIDs = `${EmailLocaleIDs | FooterLocaleIDs}_id`;
// "welcome_email_id" | "email_heading_id" | "footer_title_id" | "footer_sendoff_id"
```

### 数字字面量类型

```typescript
// 数字字面量类型
type DiceRoll = 1 | 2 | 3 | 4 | 5 | 6;

function rollDice(): DiceRoll {
  return (Math.floor(Math.random() * 6) + 1) as DiceRoll;
}

// 布尔字面量类型
type Success = true;
type Failure = false;
type Result = Success | Failure;
```

## 类型操作符

### typeof 操作符

```typescript
// typeof 类型操作符
let s = "hello";
let n: typeof s; // string

// 对函数使用 typeof
function f() {
  return { x: 10, y: 3 };
}
type P = ReturnType<typeof f>; // { x: number; y: number }

// 对对象使用 typeof
const person = {
  name: "Alice",
  age: 30
};
type Person = typeof person; // { name: string; age: number }
```

### keyof 操作符

```typescript
// keyof 操作符
type Point = { x: number; y: number };
type P = keyof Point; // "x" | "y"

// 结合泛型使用
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

let x = { a: 1, b: 2, c: 3, d: 4 };
getProperty(x, "a"); // number
getProperty(x, "m"); // 错误：参数类型 '"m"' 不能赋给参数类型 'keyof { a: number; b: number; c: number; d: number; }'
```

### 索引访问类型

```typescript
// 索引访问类型
type Person = { age: number; name: string; alive: boolean };
type Age = Person["age"]; // number
type I1 = Person["age" | "name"]; // string | number
type I2 = Person[keyof Person]; // string | number | boolean

// 数组索引访问
const MyArray = [
  { name: "Alice", age: 15 },
  { name: "Bob", age: 23 },
  { name: "Eve", age: 38 },
];

type Person2 = typeof MyArray[number]; // { name: string; age: number }
type Age2 = typeof MyArray[number]["age"]; // number
type Age3 = Person2["age"]; // number
```

## 条件类型基础

```typescript
// 条件类型
type NameOrId<T extends number | string> = T extends number
  ? IdLabel
  : NameLabel;

interface IdLabel {
  id: number;
}

interface NameLabel {
  name: string;
}

function createLabel<T extends number | string>(idOrName: T): NameOrId<T> {
  throw "unimplemented";
}

let a = createLabel("typescript"); // NameLabel
let b = createLabel(2.8); // IdLabel
let c = createLabel(Math.random() ? "hello" : 42); // NameLabel | IdLabel
```

## 映射类型基础

```typescript
// 映射类型
type OptionsFlags<Type> = {
  [Property in keyof Type]: boolean;
};

type FeatureFlags = {
  darkMode: () => void;
  newUserProfile: () => void;
};

type FeatureOptions = OptionsFlags<FeatureFlags>;
// {
//   darkMode: boolean;
//   newUserProfile: boolean;
// }

// 映射修饰符
type CreateMutable<Type> = {
  -readonly [Property in keyof Type]: Type[Property];
};

type LockedAccount = {
  readonly id: string;
  readonly name: string;
};

type UnlockedAccount = CreateMutable<LockedAccount>;
// {
//   id: string;
//   name: string;
// }
```

## 实用工具类型

```typescript
// Partial<T> - 将所有属性变为可选
interface Todo {
  title: string;
  description: string;
}

function updateTodo(todo: Todo, fieldsToUpdate: Partial<Todo>) {
  return { ...todo, ...fieldsToUpdate };
}

// Required<T> - 将所有属性变为必需
interface Props {
  a?: number;
  b?: string;
}

const obj: Props = { a: 5 };
const obj2: Required<Props> = { a: 5 }; // 错误：缺少属性 'b'

// Readonly<T> - 将所有属性变为只读
interface Todo2 {
  title: string;
}

const todo: Readonly<Todo2> = {
  title: "Delete inactive users",
};
// todo.title = "Hello"; // 错误：无法分配到 "title" ，因为它是只读属性

// Pick<T, K> - 选择指定属性
interface Todo3 {
  title: string;
  description: string;
  completed: boolean;
}

type TodoPreview = Pick<Todo3, "title" | "completed">;
// {
//   title: string;
//   completed: boolean;
// }

// Omit<T, K> - 排除指定属性
type TodoInfo = Omit<Todo3, "completed">;
// {
//   title: string;
//   description: string;
// }
```

## 类型断言和类型守卫

### 类型断言

```typescript
// 类型断言
let someValue: unknown = "this is a string";
let strLength: number = (someValue as string).length;

// 双重断言（不推荐）
let a = (expr as any) as T;

// 非空断言操作符
function liveDangerously(x?: number | null) {
  // 没有错误
  console.log(x!.toFixed());
}
```

### 自定义类型守卫

```typescript
// 用户定义的类型守卫
function isFish(pet: Fish | Bird): pet is Fish {
  return (pet as Fish).swim !== undefined;
}

// 使用类型守卫
if (isFish(pet)) {
  pet.swim(); // pet 被收窄为 Fish 类型
} else {
  pet.fly(); // pet 被收窄为 Bird 类型
}

// 断言函数
function assertIsNumber(val: any): asserts val is number {
  if (typeof val !== "number") {
    throw new AssertionError("Not a number!");
  }
}

function multiply(x: unknown, y: unknown) {
  assertIsNumber(x);
  assertIsNumber(y);
  // 现在 TypeScript 知道 x 和 y 都是 number 类型
  return x * y;
}
```

## 总结

TypeScript 的类型系统提供了丰富的类型定义能力：

1. **基础类型**：原始类型、对象类型、函数类型
2. **复合类型**：联合类型、交叉类型、字面量类型
3. **类型操作**：typeof、keyof、索引访问类型
4. **高级特性**：条件类型、映射类型、工具类型
5. **类型安全**：类型断言、类型守卫、断言函数

掌握这些类型定义技巧，能够帮助你构建更加类型安全和可维护的 TypeScript 应用程序。