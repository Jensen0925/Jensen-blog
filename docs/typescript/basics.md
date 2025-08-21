# TypeScript 基础

TypeScript 是 JavaScript 的超集，为 JavaScript 添加了可选的静态类型定义。本章将介绍 TypeScript 的基础概念和语法。

## 基本类型

### 原始类型

```typescript
// 布尔值
let isDone: boolean = false;

// 数字
let decimal: number = 6;
let hex: number = 0xf00d;
let binary: number = 0b1010;
let octal: number = 0o744;

// 字符串
let color: string = "blue";
let fullName: string = `Bob Bobbington`;
let sentence: string = `Hello, my name is ${fullName}.`;

// 空值
let unusable: void = undefined;

// Null 和 Undefined
let u: undefined = undefined;
let n: null = null;
```

### 数组

```typescript
// 数组类型的两种写法
let list: number[] = [1, 2, 3];
let list2: Array<number> = [1, 2, 3];

// 只读数组
let ro: ReadonlyArray<number> = [1, 2, 3, 4];
// ro[0] = 12; // 错误！
// ro.push(5); // 错误！
```

### 元组 (Tuple)

```typescript
// 声明一个元组类型
let x: [string, number];

// 初始化
x = ['hello', 10]; // OK
// x = [10, 'hello']; // Error

// 访问已知索引的元素
console.log(x[0].substring(1)); // OK
// console.log(x[1].substring(1)); // Error, 'number' 没有 'substring' 方法
```

### 枚举 (Enum)

```typescript
// 数字枚举
enum Color {
  Red,
  Green,
  Blue
}
let c: Color = Color.Green;

// 手动赋值
enum Color2 {
  Red = 1,
  Green,
  Blue
}

// 字符串枚举
enum Direction {
  Up = "UP",
  Down = "DOWN",
  Left = "LEFT",
  Right = "RIGHT"
}

// 常量枚举
const enum Directions {
  Up,
  Down,
  Left,
  Right
}
let directions = [Directions.Up, Directions.Down];
```

### Any 和 Unknown

```typescript
// any 类型
let notSure: any = 4;
notSure = "maybe a string instead";
notSure = false; // 也可以是个 boolean

// unknown 类型（更安全的 any）
let value: unknown;
value = true;
value = 42;
value = "Hello World";

// 使用 unknown 需要类型检查
if (typeof value === "string") {
  console.log(value.toUpperCase());
}
```

## 类型断言

```typescript
// 尖括号语法
let someValue: any = "this is a string";
let strLength: number = (<string>someValue).length;

// as 语法（推荐，在 JSX 中只能使用这种）
let someValue2: any = "this is a string";
let strLength2: number = (someValue2 as string).length;
```

## 变量声明

### let 和 const

```typescript
// let 声明
let hello = "Hello!";

// const 声明
const numLivesForCat = 9;

// 解构赋值
let input = [1, 2];
let [first, second] = input;

// 对象解构
let o = {
  a: "foo",
  b: 12,
  c: "bar"
};
let { a, b } = o;

// 重命名
let { a: newName1, b: newName2 } = o;

// 默认值
function keepWholeObject(wholeObject: { a: string, b?: number }) {
  let { a, b = 1001 } = wholeObject;
}
```

## 函数

### 函数类型

```typescript
// 函数声明
function add(x: number, y: number): number {
  return x + y;
}

// 函数表达式
let myAdd = function(x: number, y: number): number {
  return x + y;
};

// 完整的函数类型
let myAdd2: (x: number, y: number) => number = function(x: number, y: number): number {
  return x + y;
};
```

### 可选参数和默认参数

```typescript
// 可选参数
function buildName(firstName: string, lastName?: string) {
  if (lastName)
    return firstName + " " + lastName;
  else
    return firstName;
}

// 默认参数
function buildName2(firstName: string, lastName = "Smith") {
  return firstName + " " + lastName;
}

// 剩余参数
function buildName3(firstName: string, ...restOfName: string[]) {
  return firstName + " " + restOfName.join(" ");
}
```

### 函数重载

```typescript
// 重载签名
function pickCard(x: { suit: string; card: number }[]): number;
function pickCard(x: number): { suit: string; card: number };

// 实现签名
function pickCard(x: any): any {
  if (typeof x == "object") {
    let pickedCard = Math.floor(Math.random() * x.length);
    return pickedCard;
  } else if (typeof x == "number") {
    let pickedSuit = Math.floor(x / 13);
    return { suit: suits[pickedSuit], card: x % 13 };
  }
}
```

## 对象类型

### 对象类型注解

```typescript
// 对象类型
function printCoord(pt: { x: number; y: number }) {
  console.log("The coordinate's x value is " + pt.x);
  console.log("The coordinate's y value is " + pt.y);
}

// 可选属性
function printName(obj: { first: string; last?: string }) {
  console.log(obj.first);
  if (obj.last !== undefined) {
    console.log(obj.last);
  }
}
```

## 联合类型

```typescript
// 联合类型
function printId(id: number | string) {
  console.log("Your ID is: " + id);
}

// 类型收窄
function printId2(id: number | string) {
  if (typeof id === "string") {
    // 在这个分支里，id 的类型是 'string'
    console.log(id.toUpperCase());
  } else {
    // 在这个分支里，id 的类型是 'number'
    console.log(id);
  }
}
```

## 类型别名

```typescript
// 类型别名
type Point = {
  x: number;
  y: number;
};

function printCoord2(pt: Point) {
  console.log("The coordinate's x value is " + pt.x);
  console.log("The coordinate's y value is " + pt.y);
}

// 联合类型别名
type ID = number | string;

function printId3(id: ID) {
  console.log("Your ID is: " + id);
}
```

## 字面量类型

```typescript
// 字符串字面量类型
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

// 数字字面量类型
function rollDice(): 1 | 2 | 3 | 4 | 5 | 6 {
  return (Math.floor(Math.random() * 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6;
}
```

## 类型守卫

```typescript
// typeof 类型守卫
function padLeft(value: string, padding: string | number) {
  if (typeof padding === "number") {
    return Array(padding + 1).join(" ") + value;
  }
  if (typeof padding === "string") {
    return padding + value;
  }
  throw new Error(`Expected string or number, got '${padding}'.`);
}

// instanceof 类型守卫
class Bird {
  fly() {
    console.log("bird fly");
  }
  layEggs() {
    console.log("bird lay eggs");
  }
}

class Fish {
  swim() {
    console.log("fish swim");
  }
  layEggs() {
    console.log("fish lay eggs");
  }
}

function getSmallPet(): Fish | Bird {
  return Math.random() > 0.5 ? new Bird() : new Fish();
}

let pet = getSmallPet();

if (pet instanceof Bird) {
  pet.fly();
}
if (pet instanceof Fish) {
  pet.swim();
}
```

## 总结

TypeScript 的基础类型系统为 JavaScript 提供了强大的静态类型检查能力。通过掌握这些基础概念，你可以：

1. **提高代码质量**：编译时发现潜在错误
2. **增强代码可读性**：类型注解使代码意图更清晰
3. **改善开发体验**：更好的 IDE 支持和智能提示
4. **便于重构**：类型系统帮助安全地修改代码

下一步，我们将学习 TypeScript 的接口和类，进一步探索面向对象编程的特性。