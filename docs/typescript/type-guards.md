# TypeScript 类型守护

类型守护（Type Guards）是 TypeScript 中用于缩小类型范围的一种技术。通过类型守护，我们可以在特定的代码块中确保变量是某个更具体的类型，从而安全地访问该类型的属性和方法。

## 为什么需要类型守护

```typescript
function process(value: string | number) {
  // 错误：number 类型没有 toUpperCase 方法
  // value.toUpperCase();
  
  // 错误：string 类型没有 toFixed 方法
  // value.toFixed(2);
  
  // 需要类型守护来缩小类型范围
}
```

## typeof 类型守护

`typeof` 是最基本的类型守护，用于检查原始类型。

### 基本用法

```typescript
function padLeft(value: string, padding: string | number) {
  if (typeof padding === "number") {
    // 在这个代码块中，padding 的类型是 number
    return " ".repeat(padding) + value;
  }
  // 在这个代码块中，padding 的类型是 string
  return padding + value;
}

console.log(padLeft("Hello", 4)); // "    Hello"
console.log(padLeft("Hello", ">>> ")); // ">>> Hello"
```

### typeof 可检测的类型

```typescript
function printValue(value: string | number | boolean | symbol) {
  if (typeof value === "string") {
    console.log(value.toUpperCase());
  } else if (typeof value === "number") {
    console.log(value.toFixed(2));
  } else if (typeof value === "boolean") {
    console.log(value ? "True" : "False");
  } else if (typeof value === "symbol") {
    console.log(value.toString());
  }
}
```

### typeof 的限制

```typescript
// typeof 对对象类型返回 "object"
console.log(typeof []); // "object"
console.log(typeof {}); // "object"
console.log(typeof null); // "object" (JavaScript 的历史遗留问题)
console.log(typeof new Date()); // "object"

// 需要使用其他类型守护来区分具体的对象类型
```

## instanceof 类型守护

`instanceof` 用于检查对象是否是某个类的实例。

### 基本用法

```typescript
class Bird {
  fly() {
    console.log("Flying");
  }
  layEggs() {
    console.log("Laying eggs");
  }
}

class Fish {
  swim() {
    console.log("Swimming");
  }
  layEggs() {
    console.log("Laying eggs");
  }
}

function move(animal: Bird | Fish) {
  if (animal instanceof Bird) {
    // animal 的类型是 Bird
    animal.fly();
  } else {
    // animal 的类型是 Fish
    animal.swim();
  }
  
  // 两种类型都有的方法可以直接调用
  animal.layEggs();
}

move(new Bird()); // Flying, Laying eggs
move(new Fish()); // Swimming, Laying eggs
```

### instanceof 与继承

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

class Cat extends Animal {
  meow() {
    console.log("Meow!");
  }
}

function makeSound(animal: Animal) {
  if (animal instanceof Dog) {
    animal.bark();
  } else if (animal instanceof Cat) {
    animal.meow();
  } else {
    console.log("Unknown animal");
  }
}

makeSound(new Dog()); // Woof!
makeSound(new Cat()); // Meow!
```

### instanceof 的限制

```typescript
// 无法使用 instanceof 检查接口
interface Shape {
  area(): number;
}

class Circle implements Shape {
  constructor(public radius: number) {}
  area() {
    return Math.PI * this.radius ** 2;
  }
}

function getArea(shape: Shape) {
  // 错误：'Shape' 仅表示类型，不能用于检查
  // if (shape instanceof Shape) {}
  
  // 需要使用其他方法
}
```

## in 操作符

`in` 操作符用于检查对象是否具有某个属性。

### 基本用法

```typescript
interface Bird {
  fly(): void;
  layEggs(): void;
}

interface Fish {
  swim(): void;
  layEggs(): void;
}

function move(animal: Bird | Fish) {
  if ("fly" in animal) {
    // animal 的类型是 Bird
    animal.fly();
  } else {
    // animal 的类型是 Fish
    animal.swim();
  }
}

move({ fly: () => {}, layEggs: () => {} }); // 调用 fly
move({ swim: () => {}, layEggs: () => {} }); // 调用 swim
```

### in 操作符与可选属性

```typescript
interface Person {
  name: string;
  age: number;
  email?: string;
}

function printEmail(person: Person) {
  if ("email" in person && person.email) {
    console.log(person.email);
  } else {
    console.log("No email");
  }
}
```

### in 操作符的优势

```typescript
// 可以检查接口类型
interface Car {
  drive(): void;
}

interface Boat {
  sail(): void;
}

type Vehicle = Car | Boat;

function operate(vehicle: Vehicle) {
  if ("drive" in vehicle) {
    vehicle.drive(); // Car
  } else {
    vehicle.sail(); // Boat
  }
}
```

## 自定义类型守护

使用 `is` 关键字创建自定义类型守护函数。

### 基本语法

```typescript
function isString(value: unknown): value is string {
  return typeof value === "string";
}

function process(value: unknown) {
  if (isString(value)) {
    // value 的类型是 string
    console.log(value.toUpperCase());
  }
}
```

### 复杂类型守护

```typescript
interface Cat {
  meow(): void;
}

interface Dog {
  bark(): void;
}

// 自定义类型守护
function isCat(animal: Cat | Dog): animal is Cat {
  return (animal as Cat).meow !== undefined;
}

function makeSound(animal: Cat | Dog) {
  if (isCat(animal)) {
    animal.meow(); // Cat
  } else {
    animal.bark(); // Dog
  }
}
```

### 对象类型守护

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

function isUser(obj: any): obj is User {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof obj.id === "number" &&
    typeof obj.name === "string" &&
    typeof obj.email === "string"
  );
}

function processUser(data: unknown) {
  if (isUser(data)) {
    // data 的类型是 User
    console.log(data.name);
    console.log(data.email);
  } else {
    console.log("Invalid user data");
  }
}
```

### 数组类型守护

```typescript
function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every(item => typeof item === "string")
  );
}

function processArray(value: unknown) {
  if (isStringArray(value)) {
    // value 的类型是 string[]
    value.forEach(str => console.log(str.toUpperCase()));
  }
}
```

### 泛型类型守护

```typescript
function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

function isArrayOf<T>(
  value: unknown,
  check: (item: unknown) => item is T
): value is T[] {
  return Array.isArray(value) && value.every(check);
}

// 使用
function processData(data: unknown) {
  if (isArrayOf(data, isString)) {
    // data 的类型是 string[]
    data.forEach(str => console.log(str.length));
  }
}
```

## 判别联合类型

使用共同的属性（通常是字面量类型）来区分联合类型。

### 基本判别联合

```typescript
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

function getArea(shape: Shape): number {
  switch (shape.kind) {
    case "square":
      // shape 的类型是 Square
      return shape.size ** 2;
    case "rectangle":
      // shape 的类型是 Rectangle
      return shape.width * shape.height;
    case "circle":
      // shape 的类型是 Circle
      return Math.PI * shape.radius ** 2;
  }
}
```

### 详尽性检查

```typescript
type Shape = Square | Rectangle | Circle;

function getArea(shape: Shape): number {
  switch (shape.kind) {
    case "square":
      return shape.size ** 2;
    case "rectangle":
      return shape.width * shape.height;
    case "circle":
      return Math.PI * shape.radius ** 2;
    default:
      // 详尽性检查
      const _exhaustiveCheck: never = shape;
      return _exhaustiveCheck;
  }
}

// 如果添加新的 Shape 类型但没有处理，编译器会报错
```

### 状态管理中的判别联合

```typescript
type LoadingState = {
  status: "loading";
};

type SuccessState<T> = {
  status: "success";
  data: T;
};

type ErrorState = {
  status: "error";
  error: Error;
};

type AsyncState<T> = LoadingState | SuccessState<T> | ErrorState;

function renderState<T>(state: AsyncState<T>) {
  switch (state.status) {
    case "loading":
      return "Loading...";
    case "success":
      // state.data 是类型安全的
      return `Data: ${JSON.stringify(state.data)}`;
    case "error":
      // state.error 是类型安全的
      return `Error: ${state.error.message}`;
  }
}
```

### HTTP 请求状态

```typescript
type ApiState<T> =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; data: T }
  | { type: "error"; error: string };

interface User {
  id: number;
  name: string;
}

function handleUserState(state: ApiState<User>) {
  switch (state.type) {
    case "idle":
      console.log("Not started");
      break;
    case "loading":
      console.log("Loading...");
      break;
    case "success":
      console.log("User:", state.data.name);
      break;
    case "error":
      console.log("Error:", state.error);
      break;
  }
}
```

## 类型断言函数

使用 `asserts` 关键字创建断言函数，如果断言失败则抛出错误。

### 基本断言函数

```typescript
function assert(condition: any, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

function processValue(value: string | null) {
  assert(value !== null, "Value cannot be null");
  // 在这里，value 的类型是 string（排除了 null）
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

### 断言非空

```typescript
function assertNonNull<T>(value: T): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error("Value is null or undefined");
  }
}

function getUser(id: number): User | null {
  // 模拟数据库查询
  return null;
}

function processUser(id: number) {
  const user = getUser(id);
  assertNonNull(user);
  // user 的类型是 User（排除了 null）
  console.log(user.name);
}
```

### 复杂对象断言

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

function assertIsUser(obj: any): asserts obj is User {
  if (
    typeof obj !== "object" ||
    obj === null ||
    typeof obj.id !== "number" ||
    typeof obj.name !== "string" ||
    typeof obj.email !== "string"
  ) {
    throw new Error("Object is not a valid User");
  }
}

function processData(data: unknown) {
  assertIsUser(data);
  // data 的类型是 User
  console.log(data.name);
  console.log(data.email);
}
```

## 类型谓词的组合

### 组合多个类型守护

```typescript
function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

function isNotUndefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function process(value: string | null | undefined) {
  if (isDefined(value)) {
    // value 的类型是 string
    console.log(value.toUpperCase());
  }
}
```

### 链式类型守护

```typescript
interface Response {
  data?: {
    user?: {
      name?: string;
    };
  };
}

function hasData(response: Response): response is Response & { data: NonNullable<Response["data"]> } {
  return response.data !== undefined;
}

function hasUser(response: Response & { data: NonNullable<Response["data"]> }): response is Response & {
  data: {
    user: NonNullable<Response["data"]["user"]>;
  };
} {
  return response.data.user !== undefined;
}

function hasName(response: Response & {
  data: {
    user: NonNullable<Response["data"]["user"]>;
  };
}): response is Response & {
  data: {
    user: {
      name: string;
    };
  };
} {
  return response.data.user.name !== undefined;
}

function processResponse(response: Response) {
  if (hasData(response) && hasUser(response) && hasName(response)) {
    // 完全类型安全
    console.log(response.data.user.name.toUpperCase());
  }
}
```

## 实战示例

### 表单验证

```typescript
interface FormData {
  username?: string;
  email?: string;
  password?: string;
}

interface ValidFormData {
  username: string;
  email: string;
  password: string;
}

function isValidFormData(data: FormData): data is ValidFormData {
  return (
    typeof data.username === "string" &&
    data.username.length > 0 &&
    typeof data.email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) &&
    typeof data.password === "string" &&
    data.password.length >= 6
  );
}

function submitForm(data: FormData) {
  if (isValidFormData(data)) {
    // data 的类型是 ValidFormData
    console.log("Submitting:", data.username, data.email);
  } else {
    console.log("Invalid form data");
  }
}
```

### API 响应处理

```typescript
interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiError {
  success: false;
  error: string;
  code: number;
}

type ApiResponse<T> = ApiSuccess<T> | ApiError;

function isApiSuccess<T>(
  response: ApiResponse<T>
): response is ApiSuccess<T> {
  return response.success === true;
}

async function fetchUser(id: number): Promise<ApiResponse<User>> {
  // 模拟 API 请求
  return {
    success: true,
    data: { id, name: "Alice", email: "alice@example.com" }
  };
}

async function handleUser(id: number) {
  const response = await fetchUser(id);
  
  if (isApiSuccess(response)) {
    // response 的类型是 ApiSuccess<User>
    console.log(response.data.name);
  } else {
    // response 的类型是 ApiError
    console.error(`Error ${response.code}: ${response.error}`);
  }
}
```

### 事件处理

```typescript
interface ClickEvent {
  type: "click";
  x: number;
  y: number;
}

interface KeyEvent {
  type: "keypress";
  key: string;
}

interface ScrollEvent {
  type: "scroll";
  scrollY: number;
}

type Event = ClickEvent | KeyEvent | ScrollEvent;

function isClickEvent(event: Event): event is ClickEvent {
  return event.type === "click";
}

function isKeyEvent(event: Event): event is KeyEvent {
  return event.type === "keypress";
}

function isScrollEvent(event: Event): event is ScrollEvent {
  return event.type === "scroll";
}

function handleEvent(event: Event) {
  if (isClickEvent(event)) {
    console.log(`Clicked at ${event.x}, ${event.y}`);
  } else if (isKeyEvent(event)) {
    console.log(`Key pressed: ${event.key}`);
  } else if (isScrollEvent(event)) {
    console.log(`Scrolled to ${event.scrollY}`);
  }
}
```

## 类型守护最佳实践

### 1. 使用判别联合而不是多个类型守护

```typescript
// ❌ 不好
interface Response {
  data?: any;
  error?: string;
}

function handleResponse(response: Response) {
  if (response.data) {
    // 不够类型安全
  } else if (response.error) {
    // 可能同时存在 data 和 error
  }
}

// ✅ 好
type Response =
  | { success: true; data: any }
  | { success: false; error: string };

function handleResponse(response: Response) {
  if (response.success) {
    // 类型安全
    console.log(response.data);
  } else {
    console.log(response.error);
  }
}
```

### 2. 为复杂检查创建自定义类型守护

```typescript
// ✅ 好
function isValidUser(obj: any): obj is User {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof obj.id === "number" &&
    typeof obj.name === "string" &&
    typeof obj.email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(obj.email)
  );
}
```

### 3. 使用断言函数简化错误处理

```typescript
function assertNonNull<T>(value: T, name: string): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error(`${name} is null or undefined`);
  }
}

function process(user: User | null) {
  assertNonNull(user, "user");
  // 之后的代码中，user 一定不是 null
  console.log(user.name);
}
```

### 4. 避免过度使用类型断言

```typescript
// ❌ 不好
function process(value: unknown) {
  (value as User).name; // 不安全
}

// ✅ 好
function process(value: unknown) {
  if (isUser(value)) {
    value.name; // 类型安全
  }
}
```

## 总结

类型守护是 TypeScript 类型系统的重要组成部分，它提供了：

1. **typeof 守护**：检查原始类型
2. **instanceof 守护**：检查类实例
3. **in 操作符**：检查属性存在
4. **自定义类型守护**：使用 `is` 关键字
5. **判别联合**：使用共同属性区分类型
6. **断言函数**：使用 `asserts` 关键字

合理使用类型守护可以让代码更加类型安全，减少运行时错误。

