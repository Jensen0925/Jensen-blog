# ES6+ 特性

ES6（ECMAScript 2015）及后续版本引入了许多新特性，极大地增强了 JavaScript 的能力。

## let 和 const

```js
// let - 块级作用域变量
let x = 10;
if (true) {
  let x = 20; // 不同的变量
  console.log(x); // 20
}
console.log(x); // 10

// const - 常量
const PI = 3.14159;
// PI = 3.14; // 错误：不能重新赋值

// 但对于对象，const 只保证引用不变
const obj = { name: 'Jensen' };
obj.name = 'John'; // 可以修改属性
// obj = {}; // 错误：不能重新赋值
```

## 箭头函数

```js
// 传统函数
function add(a, b) {
  return a + b;
}

// 箭头函数
const add = (a, b) => a + b;

// 多行箭头函数
const multiply = (a, b) => {
  const result = a * b;
  return result;
};

// 箭头函数没有自己的 this
const obj = {
  name: 'Jensen',
  sayNameTraditional: function() {
    console.log(this.name); // 'Jensen'
  },
  sayNameArrow: () => {
    console.log(this.name); // undefined (this 指向外部作用域)
  }
};
```

## 模板字符串

```js
const name = 'Jensen';
const age = 25;

// 传统字符串拼接
const message1 = 'My name is ' + name + ' and I am ' + age + ' years old.';

// 模板字符串
const message2 = `My name is ${name} and I am ${age} years old.`;

// 多行字符串
const multiline = `
  This is a
  multiline
  string.
`;
```

## 解构赋值

```js
// 数组解构
const numbers = [1, 2, 3, 4, 5];
const [first, second, ...rest] = numbers;
console.log(first);  // 1
console.log(second); // 2
console.log(rest);   // [3, 4, 5]

// 对象解构
const person = { name: 'Jensen', age: 25, job: 'Developer' };
const { name, age, job: profession } = person;
console.log(name);       // 'Jensen'
console.log(age);        // 25
console.log(profession); // 'Developer'

// 函数参数解构
function printPerson({ name, age }) {
  console.log(`${name} is ${age} years old.`);
}
printPerson(person); // 'Jensen is 25 years old.'
```

## 展开运算符

```js
// 数组展开
const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];
const combined = [...arr1, ...arr2]; // [1, 2, 3, 4, 5, 6]

// 对象展开
const defaults = { theme: 'dark', fontSize: 16 };
const userSettings = { fontSize: 18 };
const settings = { ...defaults, ...userSettings }; // { theme: 'dark', fontSize: 18 }

// 函数参数
function sum(...numbers) {
  return numbers.reduce((total, num) => total + num, 0);
}
console.log(sum(1, 2, 3, 4, 5)); // 15
```

## 默认参数

```js
function greet(name = 'Guest', greeting = 'Hello') {
  return `${greeting}, ${name}!`;
}

console.log(greet());                // 'Hello, Guest!'
console.log(greet('Jensen'));        // 'Hello, Jensen!'
console.log(greet('Jensen', 'Hi'));  // 'Hi, Jensen!'
```

## 类

```js
class Person {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }
  
  greet() {
    return `Hello, my name is ${this.name}`;
  }
  
  static create(name, age) {
    return new Person(name, age);
  }
}

class Employee extends Person {
  constructor(name, age, title) {
    super(name, age);
    this.title = title;
  }
  
  greet() {
    return `${super.greet()} and I am a ${this.title}`;
  }
}

const person = new Person('Jensen', 25);
console.log(person.greet()); // 'Hello, my name is Jensen'

const employee = new Employee('Jensen', 25, 'Developer');
console.log(employee.greet()); // 'Hello, my name is Jensen and I am a Developer'
```

## 模块

```js
// math.js
export const PI = 3.14159;
export function add(a, b) {
  return a + b;
}
export default function multiply(a, b) {
  return a * b;
}

// main.js
import multiply, { PI, add } from './math.js';

console.log(PI);           // 3.14159
console.log(add(2, 3));     // 5
console.log(multiply(2, 3)); // 6
```

## Promise

```js
function fetchData() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const success = true;
      if (success) {
        resolve({ id: 1, name: 'Jensen' });
      } else {
        reject(new Error('Failed to fetch data'));
      }
    }, 1000);
  });
}

fetchData()
  .then(data => {
    console.log('Data:', data);
    return data.id;
  })
  .then(id => {
    console.log('ID:', id);
  })
  .catch(error => {
    console.error('Error:', error.message);
  });
```

## async/await

```js
async function fetchUserData() {
  try {
    const data = await fetchData();
    console.log('Data:', data);
    return data;
  } catch (error) {
    console.error('Error:', error.message);
  }
}

fetchUserData().then(data => {
  console.log('Processed data:', data);
});
```

## Map 和 Set

```js
// Map
const map = new Map();
map.set('name', 'Jensen');
map.set('age', 25);
map.set(1, 'number key');
map.set({}, 'object key');

console.log(map.get('name')); // 'Jensen'
console.log(map.has('age'));  // true
map.delete('age');
console.log(map.size);        // 3

// 遍历 Map
for (const [key, value] of map) {
  console.log(key, value);
}

// Set
const set = new Set([1, 2, 3, 3, 4, 4, 5]);
console.log(set.size);    // 5 (重复值被忽略)
console.log(set.has(3));  // true
set.add(6);
set.delete(1);

// 遍历 Set
for (const value of set) {
  console.log(value);
}
```

## Symbol

```js
const id = Symbol('id');
const user = {
  name: 'Jensen',
  [id]: 12345
};

console.log(user.name);  // 'Jensen'
console.log(user[id]);   // 12345

// Symbol 作为属性名不会被常规方法枚举
console.log(Object.keys(user)); // ['name']
```

## 迭代器和生成器

```js
// 迭代器
const array = [1, 2, 3];
const iterator = array[Symbol.iterator]();

console.log(iterator.next()); // { value: 1, done: false }
console.log(iterator.next()); // { value: 2, done: false }
console.log(iterator.next()); // { value: 3, done: false }
console.log(iterator.next()); // { value: undefined, done: true }

// 生成器
function* countUp(max) {
  let count = 0;
  while (count < max) {
    yield count++;
  }
}

const counter = countUp(3);
console.log(counter.next()); // { value: 0, done: false }
console.log(counter.next()); // { value: 1, done: false }
console.log(counter.next()); // { value: 2, done: false }
console.log(counter.next()); // { value: undefined, done: true }

// 使用 for...of 遍历生成器
for (const value of countUp(3)) {
  console.log(value); // 0, 1, 2
}
```

## 可选链操作符

```js
const user = {
  name: 'Jensen',
  address: {
    city: 'New York'
  }
};

// 传统方式
const city1 = user.address && user.address.city;

// 可选链
const city2 = user?.address?.city;
const zipCode = user?.address?.zipCode; // undefined
```

## 空值合并操作符

```js
const name = null;
const username = name ?? 'Guest'; // 'Guest'

const count = 0;
const displayCount = count ?? 10; // 0 (只有 null 和 undefined 会被替换)
```

## 逻辑赋值操作符

```js
let x = 10;

// 逻辑与赋值
x &&= 5; // 等同于 x = x && 5
console.log(x); // 5

// 逻辑或赋值
x ||= 20; // 等同于 x = x || 20
console.log(x); // 5 (因为 x 已经是 5，是真值)

// 空值合并赋值
let y = null;
y ??= 30; // 等同于 y = y ?? 30
console.log(y); // 30
```

## BigInt

```js
const bigNumber = 9007199254740991n; // 使用 n 后缀创建 BigInt
const anotherBigNumber = BigInt(9007199254740991);

console.log(bigNumber + 1n); // 9007199254740992n
```

## 私有类字段

```js
class Person {
  #name; // 私有字段
  #age;
  
  constructor(name, age) {
    this.#name = name;
    this.#age = age;
  }
  
  get name() {
    return this.#name;
  }
  
  #privateMethod() {
    return `${this.#name} is ${this.#age} years old`;
  }
  
  getDetails() {
    return this.#privateMethod();
  }
}

const person = new Person('Jensen', 25);
console.log(person.name); // 'Jensen'
// console.log(person.#name); // 错误：私有字段不能在类外部访问
console.log(person.getDetails()); // 'Jensen is 25 years old'
```