# JavaScript 进阶概念

## 闭包

闭包是指一个函数可以访问其词法作用域外的变量。

```js
function createCounter() {
  let count = 0;
  
  return function() {
    count++;
    return count;
  };
}

const counter = createCounter();
console.log(counter()); // 1
console.log(counter()); // 2
console.log(counter()); // 3
```

在上面的例子中，内部函数可以访问外部函数的 `count` 变量，即使外部函数已经执行完毕。

## 原型和原型链

JavaScript 中的每个对象都有一个原型（prototype），对象可以从原型继承属性和方法。

```js
function Person(name) {
  this.name = name;
}

Person.prototype.greet = function() {
  return `Hello, my name is ${this.name}`;
};

const person = new Person('Jensen');
console.log(person.greet()); // "Hello, my name is Jensen"
```

原型链是 JavaScript 实现继承的机制：

```js
function Employee(name, title) {
  Person.call(this, name);
  this.title = title;
}

// 设置原型链
Employee.prototype = Object.create(Person.prototype);
Employee.prototype.constructor = Employee;

// 添加或覆盖方法
Employee.prototype.greet = function() {
  return `Hello, I'm ${this.name}, the ${this.title}`;
};

const employee = new Employee('Jensen', 'Developer');
console.log(employee.greet()); // "Hello, I'm Jensen, the Developer"
```

## this 关键字

`this` 关键字的值取决于函数的调用方式：

```js
// 全局上下文
console.log(this); // 在浏览器中是 window，在 Node.js 中是 global

// 对象方法中
const obj = {
  name: 'Jensen',
  greet() {
    console.log(this.name); // 'Jensen'
  }
};
obj.greet();

// 构造函数中
function Person(name) {
  this.name = name;
  console.log(this); // Person 实例
}
const person = new Person('Jensen');

// 显式绑定
function greet() {
  console.log(`Hello, ${this.name}`);
}
greet.call({ name: 'Jensen' }); // "Hello, Jensen"
greet.apply({ name: 'Jensen' }); // "Hello, Jensen"
const boundGreet = greet.bind({ name: 'Jensen' });
boundGreet(); // "Hello, Jensen"

// 箭头函数
const obj2 = {
  name: 'Jensen',
  greet: function() {
    const arrowFunc = () => {
      console.log(this.name); // 'Jensen'
    };
    arrowFunc();
  }
};
obj2.greet();
```

## 事件循环和异步编程

JavaScript 是单线程的，但通过事件循环机制实现异步编程。

```js
console.log('Start');

setTimeout(() => {
  console.log('Timeout');
}, 0);

Promise.resolve().then(() => {
  console.log('Promise');
});

console.log('End');

// 输出顺序：
// Start
// End
// Promise
// Timeout
```

## Promise

Promise 是处理异步操作的对象，有三种状态：pending（进行中）、fulfilled（已成功）和 rejected（已失败）。

```js
const fetchData = () => {
  return new Promise((resolve, reject) => {
    // 模拟异步操作
    setTimeout(() => {
      const data = { id: 1, name: 'Jensen' };
      // 成功时
      resolve(data);
      // 失败时
      // reject(new Error('Failed to fetch data'));
    }, 1000);
  });
};

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
  })
  .finally(() => {
    console.log('Operation completed');
  });
```

## 异步/等待

async/await 是基于 Promise 的语法糖，使异步代码更易读。

```js
const fetchData = () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({ id: 1, name: 'Jensen' });
    }, 1000);
  });
};

const fetchUserData = async () => {
  try {
    console.log('Fetching data...');
    const data = await fetchData();
    console.log('Data:', data);
    return data;
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    console.log('Operation completed');
  }
};

fetchUserData().then(data => {
  console.log('Processed data:', data);
});
```

## 模块化

ES6 引入了原生模块系统：

```js
// math.js
export const add = (a, b) => a + b;
export const subtract = (a, b) => a - b;

const multiply = (a, b) => a * b;
export default multiply;

// main.js
import multiply, { add, subtract } from './math.js';

console.log(add(5, 3));       // 8
console.log(subtract(5, 3));   // 2
console.log(multiply(5, 3));   // 15
```

## 设计模式

### 单例模式

```js
const Singleton = (function() {
  let instance;
  
  function createInstance() {
    return { data: 'Singleton instance' };
  }
  
  return {
    getInstance: function() {
      if (!instance) {
        instance = createInstance();
      }
      return instance;
    }
  };
})();

const instance1 = Singleton.getInstance();
const instance2 = Singleton.getInstance();
console.log(instance1 === instance2); // true
```

### 工厂模式

```js
function createUser(type) {
  if (type === 'admin') {
    return {
      name: 'Admin',
      permissions: ['read', 'write', 'delete']
    };
  } else if (type === 'user') {
    return {
      name: 'User',
      permissions: ['read']
    };
  }
}

const admin = createUser('admin');
const user = createUser('user');
```

### 观察者模式

```js
class EventEmitter {
  constructor() {
    this.events = {};
  }
  
  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }
  
  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args));
    }
  }
  
  off(event, listener) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(l => l !== listener);
    }
  }
}

const emitter = new EventEmitter();

function onUserCreated(user) {
  console.log('User created:', user);
}

emitter.on('userCreated', onUserCreated);
emitter.emit('userCreated', { name: 'Jensen' });
```

## 函数式编程

```js
// 纯函数
const add = (a, b) => a + b;

// 高阶函数
const twice = (fn) => (a, b) => fn(fn(a, b), fn(a, b));
const addTwice = twice(add);
console.log(addTwice(1, 2)); // add(add(1, 2), add(1, 2)) = add(3, 3) = 6

// 柯里化
const curry = (fn) => {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    } else {
      return function(...args2) {
        return curried.apply(this, args.concat(args2));
      };
    }
  };
};

const sum = (a, b, c) => a + b + c;
const curriedSum = curry(sum);
console.log(curriedSum(1)(2)(3)); // 6
console.log(curriedSum(1, 2)(3)); // 6
console.log(curriedSum(1)(2, 3)); // 6

// 组合
const compose = (...fns) => (x) => fns.reduceRight((acc, fn) => fn(acc), x);
const double = x => x * 2;
const increment = x => x + 1;
const doubleAndIncrement = compose(increment, double);
console.log(doubleAndIncrement(3)); // double(3) = 6, increment(6) = 7
```