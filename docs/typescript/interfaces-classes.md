# 接口与类

深入学习 TypeScript 中的接口（Interface）和类（Class），掌握面向对象编程的核心概念。

## 接口（Interface）

### 基础接口定义

```typescript
// 基础接口
interface User {
  name: string;
  age: number;
  email: string;
}

// 使用接口
function greetUser(user: User) {
  console.log(`Hello, ${user.name}!`);
}

const user: User = {
  name: "Alice",
  age: 30,
  email: "alice@example.com"
};

greetUser(user);
```

### 可选属性和只读属性

```typescript
// 可选属性
interface Config {
  color?: string;
  width?: number;
  readonly id: number; // 只读属性
}

function createSquare(config: Config): { color: string; area: number } {
  let newSquare = { color: "white", area: 100 };
  if (config.color) {
    newSquare.color = config.color;
  }
  if (config.width) {
    newSquare.area = config.width * config.width;
  }
  return newSquare;
}

let mySquare = createSquare({ color: "black", id: 1 });
// mySquare.id = 2; // 错误：无法分配到 "id" ，因为它是只读属性
```

### 函数类型接口

```typescript
// 函数类型接口
interface SearchFunc {
  (source: string, subString: string): boolean;
}

let mySearch: SearchFunc;
mySearch = function(source: string, subString: string): boolean {
  let result = source.search(subString);
  return result > -1;
};

// 简化写法
mySearch = function(src, sub) {
  let result = src.search(sub);
  return result > -1;
};
```

### 可索引类型接口

```typescript
// 字符串索引签名
interface StringArray {
  [index: number]: string;
}

let myArray: StringArray;
myArray = ["Bob", "Fred"];
let myStr: string = myArray[0];

// 字符串索引签名
interface StringDictionary {
  [index: string]: string;
  length: number; // 可以，length是number类型
  name: string; // 可以，name是string类型
}

// 只读索引签名
interface ReadonlyStringArray {
  readonly [index: number]: string;
}

let myArray2: ReadonlyStringArray = ["Alice", "Bob"];
// myArray2[2] = "Mallory"; // 错误！
```

### 接口继承

```typescript
// 单继承
interface Shape {
  color: string;
}

interface Square extends Shape {
  sideLength: number;
}

let square = {} as Square;
square.color = "blue";
square.sideLength = 10;

// 多继承
interface PenStroke {
  penWidth: number;
}

interface Square2 extends Shape, PenStroke {
  sideLength: number;
}

let square2 = {} as Square2;
square2.color = "blue";
square2.sideLength = 10;
square2.penWidth = 5.0;
```

### 混合类型接口

```typescript
// 混合类型：既是函数又是对象
interface Counter {
  (start: number): string;
  interval: number;
  reset(): void;
}

function getCounter(): Counter {
  let counter = function(start: number) { return start.toString(); } as Counter;
  counter.interval = 123;
  counter.reset = function() { };
  return counter;
}

let c = getCounter();
c(10);
c.reset();
c.interval = 5.0;
```

### 接口与类型别名的区别

```typescript
// 接口
interface Point {
  x: number;
  y: number;
}

// 类型别名
type Point2 = {
  x: number;
  y: number;
};

// 接口可以被继承和实现
interface Shape {
  area(): number;
}

interface Circle extends Shape {
  radius: number;
}

// 类型别名可以表示联合类型
type StringOrNumber = string | number;

// 接口可以声明合并
interface User {
  name: string;
}

interface User {
  age: number;
}

// 现在 User 有 name 和 age 属性
const user: User = {
  name: "Alice",
  age: 30
};
```

## 类（Class）

### 基础类定义

```typescript
// 基础类
class Greeter {
  greeting: string;
  
  constructor(message: string) {
    this.greeting = message;
  }
  
  greet() {
    return "Hello, " + this.greeting;
  }
}

let greeter = new Greeter("world");
console.log(greeter.greet());
```

### 访问修饰符

```typescript
// 访问修饰符
class Animal {
  public name: string; // 公共的，默认
  private age: number; // 私有的
  protected species: string; // 受保护的
  readonly id: number; // 只读的
  
  constructor(name: string, age: number, species: string, id: number) {
    this.name = name;
    this.age = age;
    this.species = species;
    this.id = id;
  }
  
  public move(distanceInMeters: number): void {
    console.log(`${this.name} moved ${distanceInMeters}m.`);
  }
  
  private getAge(): number {
    return this.age;
  }
  
  protected getSpecies(): string {
    return this.species;
  }
}

class Dog extends Animal {
  constructor(name: string, age: number, id: number) {
    super(name, age, "Canine", id);
  }
  
  bark(): void {
    console.log("Woof! Woof!");
  }
  
  getInfo(): string {
    // return this.age; // 错误：age 是私有的
    return this.getSpecies(); // 可以访问受保护的方法
  }
}

let dog = new Dog("Rex", 3, 1);
dog.name = "Buddy"; // 可以访问公共属性
// dog.age = 4; // 错误：age 是私有的
// dog.id = 2; // 错误：id 是只读的
```

### 参数属性

```typescript
// 参数属性：在构造函数参数上使用访问修饰符
class Octopus {
  constructor(
    public name: string,
    private age: number,
    protected species: string,
    readonly id: number
  ) {
    // 不需要手动赋值，TypeScript 会自动创建和赋值
  }
  
  getInfo(): string {
    return `${this.name} is ${this.age} years old`;
  }
}

let octopus = new Octopus("Ollie", 2, "Octopus vulgaris", 1);
console.log(octopus.name); // 可以访问
// console.log(octopus.age); // 错误：age 是私有的
```

### 存取器（Getter/Setter）

```typescript
// 存取器
class Employee {
  private _fullName: string = "";
  
  get fullName(): string {
    return this._fullName;
  }
  
  set fullName(newName: string) {
    if (newName && newName.length > 0) {
      this._fullName = newName;
    } else {
      console.log("Error: Name cannot be empty");
    }
  }
}

let employee = new Employee();
employee.fullName = "Bob Smith";
if (employee.fullName) {
  console.log(employee.fullName);
}
```

### 静态属性和方法

```typescript
// 静态成员
class Grid {
  static origin = { x: 0, y: 0 };
  
  calculateDistanceFromOrigin(point: { x: number; y: number }) {
    let xDist = point.x - Grid.origin.x;
    let yDist = point.y - Grid.origin.y;
    return Math.sqrt(xDist * xDist + yDist * yDist) / this.scale;
  }
  
  constructor(public scale: number) {}
  
  static createGrid(scale: number): Grid {
    return new Grid(scale);
  }
}

let grid1 = new Grid(1.0);
let grid2 = Grid.createGrid(2.0);
console.log(Grid.origin.x);
```

### 抽象类

```typescript
// 抽象类
abstract class Animal2 {
  abstract makeSound(): void; // 抽象方法
  
  move(): void { // 具体方法
    console.log("roaming the earth...");
  }
  
  abstract get name(): string; // 抽象存取器
}

class Dog2 extends Animal2 {
  private _name: string;
  
  constructor(name: string) {
    super();
    this._name = name;
  }
  
  makeSound(): void {
    console.log("Woof! Woof!");
  }
  
  get name(): string {
    return this._name;
  }
}

// let animal = new Animal2(); // 错误：无法创建抽象类的实例
let dog2 = new Dog2("Buddy");
dog2.makeSound();
dog2.move();
```

### 类实现接口

```typescript
// 类实现接口
interface Flyable {
  fly(): void;
}

interface Swimmable {
  swim(): void;
}

// 实现单个接口
class Bird implements Flyable {
  fly(): void {
    console.log("Flying high in the sky");
  }
}

// 实现多个接口
class Duck implements Flyable, Swimmable {
  fly(): void {
    console.log("Duck is flying");
  }
  
  swim(): void {
    console.log("Duck is swimming");
  }
}

// 接口继承类
class Control {
  private state: any;
}

interface SelectableControl extends Control {
  select(): void;
}

class Button extends Control implements SelectableControl {
  select() {
    console.log("Button selected");
  }
}

// 错误：Image 类型缺少 state 属性
// class Image implements SelectableControl {
//   select() { }
// }
```

### 类的类型

```typescript
// 类的类型
class Point {
  x: number;
  y: number;
  
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

// 类作为类型
let point: Point = new Point(1, 2);

// 类的构造函数类型
let PointClass: typeof Point = Point;
let point2: Point = new PointClass(3, 4);

// 类的实例类型
type PointInstance = InstanceType<typeof Point>;
let point3: PointInstance = new Point(5, 6);
```

## 高级特性

### 装饰器基础

```typescript
// 启用装饰器支持需要在 tsconfig.json 中设置 "experimentalDecorators": true

// 类装饰器
function sealed(constructor: Function) {
  Object.seal(constructor);
  Object.seal(constructor.prototype);
}

@sealed
class Greeter2 {
  greeting: string;
  constructor(message: string) {
    this.greeting = message;
  }
  greet() {
    return "Hello, " + this.greeting;
  }
}

// 方法装饰器
function enumerable(value: boolean) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    descriptor.enumerable = value;
  };
}

class Greeter3 {
  greeting: string;
  constructor(message: string) {
    this.greeting = message;
  }
  
  @enumerable(false)
  greet() {
    return "Hello, " + this.greeting;
  }
}

// 属性装饰器
function format(formatString: string) {
  return function (target: any, propertyKey: string) {
    // 装饰器逻辑
  };
}

class Greeter4 {
  @format("Hello, %s")
  greeting: string;
  
  constructor(message: string) {
    this.greeting = message;
  }
}
```

### Mixin 模式

```typescript
// Mixin 模式
type Constructor = new (...args: any[]) => {};

// Mixin 函数
function Timestamped<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    timestamp = Date.now();
  };
}

function Activatable<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    isActivated = false;
    
    activate() {
      this.isActivated = true;
    }
    
    deactivate() {
      this.isActivated = false;
    }
  };
}

// 基础类
class User {
  name = "";
}

// 应用 Mixin
const TimestampedUser = Timestamped(User);
const TimestampedActivatableUser = Timestamped(Activatable(User));

// 使用
const timestampedUserExample = new TimestampedUser();
console.log(timestampedUserExample.timestamp);

const timestampedActivatableUserExample = new TimestampedActivatableUser();
timestampedActivatableUserExample.activate();
console.log(timestampedActivatableUserExample.isActivated);
```

## 实际应用示例

### 构建一个简单的用户管理系统

```typescript
// 接口定义
interface IUser {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}

interface IUserRepository {
  create(user: Omit<IUser, 'id' | 'createdAt'>): Promise<IUser>;
  findById(id: number): Promise<IUser | null>;
  findAll(): Promise<IUser[]>;
  update(id: number, user: Partial<IUser>): Promise<IUser | null>;
  delete(id: number): Promise<boolean>;
}

// 用户实体类
class User implements IUser {
  constructor(
    public id: number,
    public name: string,
    public email: string,
    public createdAt: Date = new Date()
  ) {}
  
  // 业务方法
  getDisplayName(): string {
    return `${this.name} (${this.email})`;
  }
  
  isRecentlyCreated(): boolean {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return this.createdAt > oneWeekAgo;
  }
}

// 用户仓储实现
class UserRepository implements IUserRepository {
  private users: User[] = [];
  private nextId = 1;
  
  async create(userData: Omit<IUser, 'id' | 'createdAt'>): Promise<IUser> {
    const user = new User(this.nextId++, userData.name, userData.email);
    this.users.push(user);
    return user;
  }
  
  async findById(id: number): Promise<IUser | null> {
    return this.users.find(user => user.id === id) || null;
  }
  
  async findAll(): Promise<IUser[]> {
    return [...this.users];
  }
  
  async update(id: number, userData: Partial<IUser>): Promise<IUser | null> {
    const user = this.users.find(u => u.id === id);
    if (!user) return null;
    
    Object.assign(user, userData);
    return user;
  }
  
  async delete(id: number): Promise<boolean> {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return false;
    
    this.users.splice(index, 1);
    return true;
  }
}

// 用户服务类
class UserService {
  constructor(private userRepository: IUserRepository) {}
  
  async createUser(name: string, email: string): Promise<IUser> {
    // 验证邮箱格式
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }
    
    return await this.userRepository.create({ name, email });
  }
  
  async getUserById(id: number): Promise<IUser> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
  
  async getAllUsers(): Promise<IUser[]> {
    return await this.userRepository.findAll();
  }
  
  async updateUser(id: number, updates: Partial<IUser>): Promise<IUser> {
    const user = await this.userRepository.update(id, updates);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
  
  async deleteUser(id: number): Promise<void> {
    const success = await this.userRepository.delete(id);
    if (!success) {
      throw new Error('User not found');
    }
  }
  
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// 使用示例
async function example() {
  const userRepository = new UserRepository();
  const userService = new UserService(userRepository);
  
  try {
    // 创建用户
    const user1 = await userService.createUser('Alice', 'alice@example.com');
    const user2 = await userService.createUser('Bob', 'bob@example.com');
    
    console.log('Created users:', user1, user2);
    
    // 获取所有用户
    const allUsers = await userService.getAllUsers();
    console.log('All users:', allUsers);
    
    // 更新用户
    const updatedUser = await userService.updateUser(1, { name: 'Alice Smith' });
    console.log('Updated user:', updatedUser);
    
    // 删除用户
    await userService.deleteUser(2);
    console.log('User deleted');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

## 总结

接口和类是 TypeScript 面向对象编程的核心：

### 接口的特点：
1. **契约定义**：定义对象的结构和行为
2. **类型检查**：编译时类型安全
3. **继承支持**：支持单继承和多继承
4. **声明合并**：同名接口自动合并

### 类的特点：
1. **封装性**：访问修饰符控制成员访问
2. **继承性**：支持类继承和抽象类
3. **多态性**：方法重写和接口实现
4. **现代特性**：装饰器、Mixin 等高级功能

### 最佳实践：
1. 优先使用接口定义对象结构
2. 合理使用访问修饰符
3. 抽象类用于共享实现
4. 接口用于定义契约
5. 组合优于继承