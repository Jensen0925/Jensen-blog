# 原型与继承

## 原型（Prototype）

### 什么是原型

JavaScript 中每个对象都有一个内部属性 `[[Prototype]]`，指向另一个对象，这就是**原型**。

```javascript
// 创建对象
const person = {
  name: 'Jensen',
  greet() {
    console.log(`Hello, I'm ${this.name}`);
  }
};

// 访问原型
Object.getPrototypeOf(person); // Object.prototype
person.__proto__; // Object.prototype（不推荐使用）
```

### 原型链

```javascript
const animal = {
  eat() {
    console.log('eating');
  }
};

const dog = Object.create(animal);
dog.bark = function() {
  console.log('woof');
};

const myDog = Object.create(dog);
myDog.name = 'Buddy';

// 原型链查找
myDog.eat(); // 'eating' - 从 animal 找到
myDog.bark(); // 'woof' - 从 dog 找到
myDog.name; // 'Buddy' - 自身属性

// 原型链：myDog -> dog -> animal -> Object.prototype -> null
console.log(Object.getPrototypeOf(myDog) === dog); // true
console.log(Object.getPrototypeOf(dog) === animal); // true
console.log(Object.getPrototypeOf(animal) === Object.prototype); // true
console.log(Object.getPrototypeOf(Object.prototype)); // null
```

### 原型图解

```
myDog {
  name: 'Buddy'
  [[Prototype]]: dog
}
  ↓
dog {
  bark: function()
  [[Prototype]]: animal
}
  ↓
animal {
  eat: function()
  [[Prototype]]: Object.prototype
}
  ↓
Object.prototype {
  toString: function()
  valueOf: function()
  hasOwnProperty: function()
  ...
  [[Prototype]]: null
}
```

## 构造函数

### 基本概念

```javascript
// 构造函数
function Person(name, age) {
  this.name = name;
  this.age = age;
}

// 在原型上添加方法
Person.prototype.greet = function() {
  console.log(`Hello, I'm ${this.name}`);
};

// 创建实例
const person1 = new Person('Alice', 25);
const person2 = new Person('Bob', 30);

// 共享原型方法
person1.greet === person2.greet; // true

// 原型链
person1.__proto__ === Person.prototype; // true
Person.prototype.__proto__ === Object.prototype; // true
```

### new 关键字的工作原理

```javascript
// new 做了什么？
function myNew(Constructor, ...args) {
  // 1. 创建新对象，原型指向构造函数的 prototype
  const obj = Object.create(Constructor.prototype);
  
  // 2. 执行构造函数，绑定 this
  const result = Constructor.apply(obj, args);
  
  // 3. 如果构造函数返回对象，则返回该对象，否则返回新对象
  return result instanceof Object ? result : obj;
}

// 使用
const person = myNew(Person, 'Jensen', 25);
```

### constructor 属性

```javascript
function Person(name) {
  this.name = name;
}

// prototype.constructor 指回构造函数
Person.prototype.constructor === Person; // true

const person = new Person('Alice');
person.constructor === Person; // true

// 重写 prototype 时要注意
Person.prototype = {
  greet() {
    console.log('Hi');
  }
};

// constructor 丢失
Person.prototype.constructor === Person; // false

// 修复
Person.prototype.constructor = Person;
```

## 原型方法

### Object.create()

```javascript
// 创建对象，指定原型
const animal = {
  type: 'Animal',
  eat() {
    console.log('eating');
  }
};

const dog = Object.create(animal);
dog.bark = function() {
  console.log('woof');
};

dog.eat(); // 'eating' - 继承自 animal
dog.type; // 'Animal' - 继承自 animal

// 创建纯净对象（没有原型）
const pureObject = Object.create(null);
pureObject.toString; // undefined
```

### Object.getPrototypeOf() / Object.setPrototypeOf()

```javascript
const animal = { type: 'Animal' };
const dog = Object.create(animal);

// 获取原型
Object.getPrototypeOf(dog) === animal; // true

// 设置原型（不推荐，性能差）
const cat = {};
Object.setPrototypeOf(cat, animal);
Object.getPrototypeOf(cat) === animal; // true
```

### hasOwnProperty()

```javascript
const animal = { type: 'Animal' };
const dog = Object.create(animal);
dog.name = 'Buddy';

// 检查自身属性（不包括原型链）
dog.hasOwnProperty('name'); // true
dog.hasOwnProperty('type'); // false

// 检查属性是否存在（包括原型链）
'name' in dog; // true
'type' in dog; // true
```

### isPrototypeOf()

```javascript
const animal = { type: 'Animal' };
const dog = Object.create(animal);

// 检查原型链
animal.isPrototypeOf(dog); // true
Object.prototype.isPrototypeOf(dog); // true
```

## 继承模式

### 1. 原型链继承

```javascript
function Animal(name) {
  this.name = name;
  this.colors = ['black', 'white'];
}

Animal.prototype.eat = function() {
  console.log(`${this.name} is eating`);
};

function Dog(name) {
  this.name = name;
}

// 原型链继承
Dog.prototype = new Animal();

const dog1 = new Dog('Buddy');
const dog2 = new Dog('Max');

// 问题：共享引用类型属性
dog1.colors.push('brown');
console.log(dog2.colors); // ['black', 'white', 'brown']
```

### 2. 构造函数继承

```javascript
function Animal(name) {
  this.name = name;
  this.colors = ['black', 'white'];
}

Animal.prototype.eat = function() {
  console.log('eating');
};

function Dog(name, breed) {
  // 调用父构造函数
  Animal.call(this, name);
  this.breed = breed;
}

const dog1 = new Dog('Buddy', 'Golden Retriever');
const dog2 = new Dog('Max', 'Husky');

// 优点：解决了引用类型共享问题
dog1.colors.push('brown');
console.log(dog2.colors); // ['black', 'white']

// 缺点：无法继承原型方法
dog1.eat(); // TypeError: dog1.eat is not a function
```

### 3. 组合继承

```javascript
function Animal(name) {
  this.name = name;
  this.colors = ['black', 'white'];
}

Animal.prototype.eat = function() {
  console.log('eating');
};

function Dog(name, breed) {
  // 继承属性
  Animal.call(this, name);
  this.breed = breed;
}

// 继承方法
Dog.prototype = new Animal();
Dog.prototype.constructor = Dog;

Dog.prototype.bark = function() {
  console.log('woof');
};

const dog = new Dog('Buddy', 'Golden');
dog.eat(); // 'eating'
dog.bark(); // 'woof'

// 缺点：调用了两次父构造函数
```

### 4. 寄生组合继承（最佳）

```javascript
function Animal(name) {
  this.name = name;
  this.colors = ['black', 'white'];
}

Animal.prototype.eat = function() {
  console.log('eating');
};

function Dog(name, breed) {
  Animal.call(this, name);
  this.breed = breed;
}

// 使用 Object.create 避免调用两次构造函数
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog;

Dog.prototype.bark = function() {
  console.log('woof');
};

const dog = new Dog('Buddy', 'Golden');
dog.eat(); // 'eating'
dog.bark(); // 'woof'

// 封装继承函数
function inherit(Child, Parent) {
  Child.prototype = Object.create(Parent.prototype);
  Child.prototype.constructor = Child;
}

inherit(Dog, Animal);
```

## ES6 Class

### 基本语法

```javascript
class Animal {
  constructor(name) {
    this.name = name;
  }
  
  eat() {
    console.log(`${this.name} is eating`);
  }
  
  // 静态方法
  static create(name) {
    return new Animal(name);
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name); // 调用父类构造函数
    this.breed = breed;
  }
  
  bark() {
    console.log('woof');
  }
  
  // 重写方法
  eat() {
    super.eat(); // 调用父类方法
    console.log('Dog is eating');
  }
}

const dog = new Dog('Buddy', 'Golden');
dog.eat(); // 'Buddy is eating' 和 'Dog is eating'
dog.bark(); // 'woof'

// 静态方法继承
Dog.create === Animal.create; // false
Dog.create('Max') instanceof Animal; // true
```

### Class 的本质

```javascript
// Class 只是语法糖
class Person {
  constructor(name) {
    this.name = name;
  }
  
  greet() {
    console.log('Hi');
  }
}

// 等价于
function Person(name) {
  this.name = name;
}

Person.prototype.greet = function() {
  console.log('Hi');
};

// 但有一些区别：
// 1. Class 必须用 new 调用
// 2. Class 内部自动启用严格模式
// 3. Class 的方法不可枚举
// 4. Class 有暂时性死区
```

### 私有属性和方法

```javascript
class Person {
  // 私有属性
  #age = 0;
  
  constructor(name, age) {
    this.name = name;
    this.#age = age;
  }
  
  // 私有方法
  #calculateBirthYear() {
    return new Date().getFullYear() - this.#age;
  }
  
  // 公共方法
  getBirthYear() {
    return this.#calculateBirthYear();
  }
}

const person = new Person('Alice', 25);
console.log(person.name); // 'Alice'
console.log(person.#age); // SyntaxError: 私有属性
console.log(person.getBirthYear()); // 可以访问
```

### Getter 和 Setter

```javascript
class Circle {
  constructor(radius) {
    this._radius = radius;
  }
  
  get radius() {
    return this._radius;
  }
  
  set radius(value) {
    if (value < 0) {
      throw new Error('半径不能为负数');
    }
    this._radius = value;
  }
  
  get area() {
    return Math.PI * this._radius ** 2;
  }
}

const circle = new Circle(5);
console.log(circle.radius); // 5
console.log(circle.area); // 78.54

circle.radius = 10;
console.log(circle.area); // 314.16
```

### 静态属性和方法

```javascript
class MathUtils {
  // 静态属性
  static PI = 3.14159;
  
  // 静态方法
  static square(x) {
    return x * x;
  }
  
  // 静态私有方法
  static #helper() {
    return 'helper';
  }
}

console.log(MathUtils.PI); // 3.14159
console.log(MathUtils.square(5)); // 25

const util = new MathUtils();
console.log(util.PI); // undefined（静态属性不在实例上）
```

## 原型污染

### 什么是原型污染

```javascript
// 原型污染示例
function merge(target, source) {
  for (let key in source) {
    target[key] = source[key];
  }
  return target;
}

const obj = {};
const malicious = JSON.parse('{"__proto__": {"polluted": true}}');

merge(obj, malicious);

// 所有对象都被污染了
const newObj = {};
console.log(newObj.polluted); // true
```

### 防御原型污染

```javascript
// 方法 1：检查键名
function safeMerge(target, source) {
  for (let key in source) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    target[key] = source[key];
  }
  return target;
}

// 方法 2：使用 hasOwnProperty
function safeMerge2(target, source) {
  for (let key in source) {
    if (source.hasOwnProperty(key)) {
      target[key] = source[key];
    }
  }
  return target;
}

// 方法 3：使用 Object.create(null)
const safeObj = Object.create(null);
safeObj.__proto__ = { polluted: true };
console.log(safeObj.polluted); // undefined

// 方法 4：冻结原型
Object.freeze(Object.prototype);
```

## 实用技巧

### 1. 检查对象类型

```javascript
// instanceof
function isArray(obj) {
  return obj instanceof Array;
}

// Object.prototype.toString
function getType(obj) {
  return Object.prototype.toString.call(obj).slice(8, -1);
}

getType([]); // 'Array'
getType({}); // 'Object'
getType(null); // 'Null'
getType(undefined); // 'Undefined'
```

### 2. 克隆对象

```javascript
// 浅克隆
function shallowClone(obj) {
  return Object.create(
    Object.getPrototypeOf(obj),
    Object.getOwnPropertyDescriptors(obj)
  );
}

// 深克隆（简单版）
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  const clone = Array.isArray(obj) ? [] : {};
  
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      clone[key] = deepClone(obj[key]);
    }
  }
  
  return clone;
}
```

### 3. 混入（Mixin）

```javascript
// 混入多个对象的属性
function mixin(target, ...sources) {
  return Object.assign(target, ...sources);
}

// 使用
class Person {
  constructor(name) {
    this.name = name;
  }
}

const canEat = {
  eat() {
    console.log('eating');
  }
};

const canWalk = {
  walk() {
    console.log('walking');
  }
};

mixin(Person.prototype, canEat, canWalk);

const person = new Person('Alice');
person.eat(); // 'eating'
person.walk(); // 'walking'
```

## 最佳实践

### 1. 优先使用 Class

```javascript
// ✅ 推荐：使用 Class
class Animal {
  constructor(name) {
    this.name = name;
  }
  
  eat() {
    console.log('eating');
  }
}

// ❌ 避免：使用构造函数（除非有特殊需求）
function Animal(name) {
  this.name = name;
}

Animal.prototype.eat = function() {
  console.log('eating');
};
```

### 2. 不要修改内置原型

```javascript
// ❌ 非常不好
Array.prototype.myMethod = function() {
  // ...
};

// ✅ 使用工具函数
function arrayMyMethod(arr) {
  // ...
}
```

### 3. 使用 Object.create(null) 创建纯净对象

```javascript
// ✅ 用作 Map 时使用
const map = Object.create(null);
map['key'] = 'value';
// 没有原型，更安全

// 普通对象仍然使用字面量
const obj = {};
```

## 总结

原型和继承的核心要点：

1. **原型链**
   - 每个对象都有原型
   - 形成原型链
   - 属性查找机制

2. **构造函数**
   - 创建对象
   - prototype 属性
   - new 关键字

3. **继承方式**
   - 原型链继承
   - 构造函数继承
   - 组合继承
   - 寄生组合继承

4. **ES6 Class**
   - 语法糖
   - extends 关键字
   - super 关键字
   - 私有属性

5. **最佳实践**
   - 优先使用 Class
   - 避免原型污染
   - 不修改内置原型

## 相关阅读

- [JavaScript 基础知识](/javascript/basics)
- [ES6+ 特性](/javascript/es6)
- [设计模式](/javascript/patterns)

