# 接口 (Interface)

接口是 TypeScript 的核心特性之一，用于定义对象的形状（shape）和结构。接口提供了强大的方式来定义代码契约，使代码更加规范和易于维护。

## 基本接口

### 对象类型接口

```typescript
// 定义接口
interface User {
  name: string;
  age: number;
}

// 使用接口
const user: User = {
  name: "Alice",
  age: 25
};

// 错误示例
const invalidUser: User = {
  name: "Bob"
  // 错误：缺少 age 属性
};
```

### 可选属性

```typescript
interface User {
  name: string;
  age?: number; // 可选属性
  email?: string;
}

const user1: User = { name: "Alice" }; // 正确
const user2: User = { name: "Bob", age: 30 }; // 正确
const user3: User = { name: "Charlie", age: 25, email: "charlie@example.com" }; // 正确
```

### 只读属性

```typescript
interface Point {
  readonly x: number;
  readonly y: number;
}

let point: Point = { x: 10, y: 20 };
// point.x = 5; // 错误：只读属性不能修改

// ReadonlyArray
let arr: ReadonlyArray<number> = [1, 2, 3];
// arr.push(4); // 错误
// arr[0] = 0; // 错误
```

### 额外属性检查

```typescript
interface Config {
  color?: string;
  width?: number;
}

// 字面量对象会进行额外属性检查
// const config: Config = {
//   colour: "red", // 错误：对象字面量只能指定已知属性
//   width: 100
// };

// 解决方法 1：类型断言
const config1 = {
  colour: "red",
  width: 100
} as Config;

// 解决方法 2：使用索引签名
interface Config2 {
  color?: string;
  width?: number;
  [propName: string]: any; // 索引签名
}

const config2: Config2 = {
  colour: "red",
  width: 100
};

// 解决方法 3：使用中间变量
const obj = { colour: "red", width: 100 };
const config3: Config = obj;
```

## 函数类型接口

### 函数签名

```typescript
// 定义函数类型接口
interface SearchFunc {
  (source: string, subString: string): boolean;
}

// 实现函数
const mySearch: SearchFunc = function(source, subString) {
  return source.includes(subString);
};

// 箭头函数实现
const mySearch2: SearchFunc = (src, sub) => src.includes(sub);
```

### 构造函数类型

```typescript
// 定义构造函数接口
interface ClockConstructor {
  new (hour: number, minute: number): ClockInterface;
}

interface ClockInterface {
  tick(): void;
}

// 实现类
class DigitalClock implements ClockInterface {
  constructor(h: number, m: number) {}
  tick() {
    console.log("beep beep");
  }
}

class AnalogClock implements ClockInterface {
  constructor(h: number, m: number) {}
  tick() {
    console.log("tick tock");
  }
}

// 工厂函数
function createClock(
  ctor: ClockConstructor,
  hour: number,
  minute: number
): ClockInterface {
  return new ctor(hour, minute);
}

let digital = createClock(DigitalClock, 12, 17);
let analog = createClock(AnalogClock, 7, 32);
```

### 混合类型

```typescript
// 一个对象可以同时作为函数和对象使用
interface Counter {
  (start: number): string;
  interval: number;
  reset(): void;
}

function getCounter(): Counter {
  let counter = function(start: number) {
    return `Count: ${start}`;
  } as Counter;
  
  counter.interval = 123;
  counter.reset = function() {
    console.log("Reset");
  };
  
  return counter;
}

let c = getCounter();
c(10); // "Count: 10"
c.reset();
c.interval = 5.0;
```

## 索引签名

### 字符串索引签名

```typescript
// 可以用任意字符串访问
interface StringDictionary {
  [key: string]: string;
}

const dict: StringDictionary = {
  name: "Alice",
  city: "Beijing",
  country: "China"
};

// 访问
console.log(dict["name"]); // "Alice"
console.log(dict.city); // "Beijing"
```

### 数字索引签名

```typescript
// 可以用数字访问
interface NumberArray {
  [index: number]: string;
}

const arr: NumberArray = ["Alice", "Bob", "Charlie"];
console.log(arr[0]); // "Alice"
```

### 混合索引签名

```typescript
// 数字索引的返回值必须是字符串索引返回值的子类型
interface MixedArray {
  [index: number]: string;
  [key: string]: string | number;
  length: number; // 正确：length 是 number 类型
}

const arr: MixedArray = ["a", "b", "c"];
arr.length = 3;
```

### 索引签名的约束

```typescript
interface Dictionary {
  [key: string]: number;
  count: number; // 正确
  // name: string; // 错误：类型不匹配
}

// 只读索引签名
interface ReadonlyDictionary {
  readonly [key: string]: number;
}

const dict: ReadonlyDictionary = { a: 1, b: 2 };
// dict.a = 100; // 错误：只读
```

## 接口继承

### 单继承

```typescript
interface Shape {
  color: string;
}

interface Square extends Shape {
  sideLength: number;
}

let square: Square = {
  color: "blue",
  sideLength: 10
};
```

### 多继承

```typescript
interface Shape {
  color: string;
}

interface PenStroke {
  penWidth: number;
}

interface Square extends Shape, PenStroke {
  sideLength: number;
}

let square: Square = {
  color: "blue",
  sideLength: 10,
  penWidth: 5.0
};
```

### 继承类

```typescript
class Control {
  private state: any;
}

// 接口可以继承类
interface SelectableControl extends Control {
  select(): void;
}

class Button extends Control implements SelectableControl {
  select() {
    console.log("Button selected");
  }
}

// 错误：缺少 state 属性
// class Image implements SelectableControl {
//   select() {}
// }
```

## 类实现接口

### 基本实现

```typescript
interface Printable {
  print(): void;
}

class Document implements Printable {
  print() {
    console.log("Printing document...");
  }
}

class Image implements Printable {
  print() {
    console.log("Printing image...");
  }
}
```

### 实现多个接口

```typescript
interface Movable {
  move(): void;
}

interface Drawable {
  draw(): void;
}

class Sprite implements Movable, Drawable {
  move() {
    console.log("Moving...");
  }
  
  draw() {
    console.log("Drawing...");
  }
}
```

### 接口和抽象类的区别

```typescript
// 接口：只定义结构，不提供实现
interface Animal {
  name: string;
  makeSound(): void;
}

// 抽象类：可以包含实现
abstract class AbstractAnimal {
  abstract name: string;
  abstract makeSound(): void;
  
  // 可以提供具体实现
  move() {
    console.log("Moving...");
  }
}

// 实现接口
class Dog implements Animal {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
  makeSound() {
    console.log("Woof!");
  }
}

// 继承抽象类
class Cat extends AbstractAnimal {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
  makeSound() {
    console.log("Meow!");
  }
}
```

## 接口合并（声明合并）

同名接口会自动合并。

```typescript
interface Box {
  height: number;
  width: number;
}

interface Box {
  scale: number;
}

// 合并后的接口
let box: Box = {
  height: 5,
  width: 6,
  scale: 10
};

// 函数重载
interface Document {
  createElement(tagName: "div"): HTMLDivElement;
  createElement(tagName: "span"): HTMLSpanElement;
  createElement(tagName: string): HTMLElement;
}
```

### 命名空间与接口合并

```typescript
interface Person {
  name: string;
}

namespace Person {
  export const defaultAge = 18;
  export function greet(person: Person) {
    console.log(`Hello, ${person.name}!`);
  }
}

const person: Person = { name: "Alice" };
Person.greet(person); // "Hello, Alice!"
console.log(Person.defaultAge); // 18
```

## 接口的高级用法

### 映射类型

```typescript
interface Person {
  name: string;
  age: number;
}

// 将所有属性变为可选
type Partial<T> = {
  [P in keyof T]?: T[P];
};

type PartialPerson = Partial<Person>;
// 等价于：{ name?: string; age?: number; }

// 将所有属性变为只读
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

type ReadonlyPerson = Readonly<Person>;
// 等价于：{ readonly name: string; readonly age: number; }
```

### 条件类型

```typescript
interface Animal {
  live(): void;
}

interface Dog extends Animal {
  woof(): void;
}

// 如果 T 是 Animal 的子类型，返回 number，否则返回 string
type Example1 = Dog extends Animal ? number : string; // number
type Example2 = RegExp extends Animal ? number : string; // string
```

### 索引访问类型

```typescript
interface Person {
  name: string;
  age: number;
  alive: boolean;
}

// 访问单个属性类型
type Name = Person["name"]; // string
type Age = Person["age"]; // number

// 访问多个属性类型
type NameOrAge = Person["name" | "age"]; // string | number

// 访问所有属性类型
type AllValues = Person[keyof Person]; // string | number | boolean
```

### 模板字面量类型

```typescript
type World = "world";
type Greeting = `hello ${World}`; // "hello world"

// 事件名称
type EventName = "click" | "scroll" | "mousemove";
type OnEvent = `on${Capitalize<EventName>}`;
// "onClick" | "onScroll" | "onMousemove"

// 应用示例
interface Events {
  onClick: (e: MouseEvent) => void;
  onScroll: (e: Event) => void;
  onMousemove: (e: MouseEvent) => void;
}
```

## 实用接口示例

### HTTP 请求接口

```typescript
interface RequestConfig {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
  timeout?: number;
}

interface Response<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

async function request<T = any>(config: RequestConfig): Promise<Response<T>> {
  // 实现请求逻辑
  return {} as Response<T>;
}

// 使用
interface User {
  id: number;
  name: string;
}

const response = await request<User>({
  url: "/api/user/1",
  method: "GET"
});

console.log(response.data.name);
```

### 表单接口

```typescript
interface FormField {
  name: string;
  label: string;
  type: "text" | "number" | "email" | "password";
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number;
  validation?: (value: any) => string | null;
}

interface Form {
  fields: FormField[];
  onSubmit: (data: Record<string, any>) => void;
}

const loginForm: Form = {
  fields: [
    {
      name: "username",
      label: "用户名",
      type: "text",
      required: true,
      placeholder: "请输入用户名"
    },
    {
      name: "password",
      label: "密码",
      type: "password",
      required: true,
      validation: (value) => {
        return value.length < 6 ? "密码至少6位" : null;
      }
    }
  ],
  onSubmit: (data) => {
    console.log("表单数据：", data);
  }
};
```

### 组件接口

```typescript
// React 组件 Props 接口
interface ButtonProps {
  type?: "primary" | "default" | "danger";
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  loading?: boolean;
  onClick?: (event: MouseEvent) => void;
  children: React.ReactNode;
}

// Vue 组件 Props 接口
interface TableColumn {
  key: string;
  title: string;
  dataIndex: string;
  width?: number;
  align?: "left" | "center" | "right";
  render?: (text: any, record: any, index: number) => any;
}

interface TableProps {
  dataSource: any[];
  columns: TableColumn[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
  };
  onPageChange?: (page: number, pageSize: number) => void;
}
```

### 状态管理接口

```typescript
// Redux Store 接口
interface RootState {
  user: UserState;
  posts: PostsState;
  comments: CommentsState;
}

interface UserState {
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;
}

interface PostsState {
  items: Post[];
  selectedPost: Post | null;
  isLoading: boolean;
}

// Action 接口
interface Action<T = any> {
  type: string;
  payload?: T;
}

interface UserActions {
  login: (credentials: LoginCredentials) => Action<User>;
  logout: () => Action;
  updateProfile: (data: Partial<User>) => Action<User>;
}
```

### 数据库模型接口

```typescript
// MongoDB 文档接口
interface Document {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

interface User extends Document {
  username: string;
  email: string;
  passwordHash: string;
  profile: {
    firstName: string;
    lastName: string;
    avatar?: string;
    bio?: string;
  };
  roles: ("user" | "admin" | "moderator")[];
}

interface Post extends Document {
  authorId: string;
  title: string;
  content: string;
  tags: string[];
  status: "draft" | "published" | "archived";
  views: number;
  likes: number;
}

// 查询接口
interface QueryOptions {
  filter?: Record<string, any>;
  sort?: Record<string, 1 | -1>;
  limit?: number;
  skip?: number;
  select?: string[];
}

interface Repository<T extends Document> {
  findById(id: string): Promise<T | null>;
  find(options?: QueryOptions): Promise<T[]>;
  create(data: Omit<T, keyof Document>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}
```

## 接口 vs 类型别名

虽然两者在很多情况下可以互换使用，但有一些区别：

### 相同点

```typescript
// 都可以描述对象
interface IPoint {
  x: number;
  y: number;
}

type TPoint = {
  x: number;
  y: number;
};

// 都可以扩展
interface IShape extends IPoint {
  color: string;
}

type TShape = TPoint & {
  color: string;
};
```

### 不同点

```typescript
// 1. 类型别名可以为任何类型命名
type ID = string | number;
type Callback = () => void;
type Point = [number, number];

// 2. 接口可以声明合并
interface Window {
  title: string;
}

interface Window {
  version: number;
}

// 合并后
const w: Window = {
  title: "My App",
  version: 1
};

// 3. 接口可以被类实现
interface Printable {
  print(): void;
}

class Document implements Printable {
  print() {
    console.log("Printing...");
  }
}

// 4. 类型别名支持映射类型
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

// 5. 类型别名支持条件类型
type IsString<T> = T extends string ? true : false;
```

### 使用建议

- **优先使用接口**：定义对象结构、类的契约
- **使用类型别名**：联合类型、交叉类型、映射类型、条件类型
- **保持一致**：在项目中保持风格统一

## 总结

接口是 TypeScript 的核心特性，提供了：

1. **类型约束**：定义对象的形状和结构
2. **代码契约**：确保代码符合预期的接口
3. **可扩展性**：通过继承和合并扩展接口
4. **灵活性**：支持可选属性、只读属性、索引签名等
5. **复用性**：接口可以被多个类实现

掌握接口的使用对于编写高质量的 TypeScript 代码至关重要。

