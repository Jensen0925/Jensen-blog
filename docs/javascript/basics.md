# JavaScript 基础知识

## 变量和数据类型

JavaScript 中的变量声明方式有三种：`var`、`let` 和 `const`。

```js
// var - 函数作用域
var name = 'Jensen';

// let - 块级作用域
let age = 25;

// const - 常量，不可重新赋值
const PI = 3.14159;
```

## 基本数据类型

JavaScript 有以下基本数据类型：

- **String**：字符串
- **Number**：数字
- **Boolean**：布尔值
- **Null**：空值
- **Undefined**：未定义
- **Symbol**：符号 (ES6)
- **BigInt**：大整数 (ES2020)

## 引用数据类型

- **Object**：对象
- **Array**：数组
- **Function**：函数
- **Date**：日期
- **RegExp**：正则表达式

## 运算符

### 算术运算符

```js
let a = 10;
let b = 5;

let sum = a + b;      // 加法: 15
let difference = a - b; // 减法: 5
let product = a * b;   // 乘法: 50
let quotient = a / b;  // 除法: 2
let remainder = a % b; // 取余: 0
let power = a ** b;    // 幂运算: 100000
```

### 比较运算符

```js
a > b;   // 大于: true
a < b;   // 小于: false
a >= b;  // 大于等于: true
a <= b;  // 小于等于: false
a == b;  // 等于（值相等）: false
a === b; // 严格等于（值和类型都相等）: false
a != b;  // 不等于: true
a !== b; // 严格不等于: true
```

## 条件语句

```js
if (condition) {
  // 条件为真时执行
} else if (anotherCondition) {
  // 另一个条件为真时执行
} else {
  // 所有条件都为假时执行
}

// 三元运算符
let result = condition ? valueIfTrue : valueIfFalse;
```

## 循环

```js
// for 循环
for (let i = 0; i < 5; i++) {
  console.log(i);
}

// while 循环
let i = 0;
while (i < 5) {
  console.log(i);
  i++;
}

// do-while 循环
i = 0;
do {
  console.log(i);
  i++;
} while (i < 5);

// for...of 循环（遍历可迭代对象的值）
const array = [1, 2, 3];
for (const value of array) {
  console.log(value);
}

// for...in 循环（遍历对象的属性）
const object = { a: 1, b: 2 };
for (const key in object) {
  console.log(key, object[key]);
}
```

## 函数

```js
// 函数声明
function greet(name) {
  return `Hello, ${name}!`;
}

// 函数表达式
const greet = function(name) {
  return `Hello, ${name}!`;
};

// 箭头函数 (ES6)
const greet = (name) => {
  return `Hello, ${name}!`;
};

// 简化的箭头函数
const greet = name => `Hello, ${name}!`;
```

## 对象

```js
// 对象字面量
const person = {
  name: 'Jensen',
  age: 25,
  greet: function() {
    return `Hello, my name is ${this.name}`;
  }
};

// 访问对象属性
console.log(person.name);       // 点表示法
console.log(person['name']);    // 括号表示法

// 对象方法
console.log(person.greet());
```

## 数组

```js
// 数组字面量
const fruits = ['Apple', 'Banana', 'Cherry'];

// 访问数组元素
console.log(fruits[0]); // 'Apple'

// 数组方法
fruits.push('Date');        // 添加到末尾
fruits.pop();               // 移除末尾元素
fruits.unshift('Apricot');  // 添加到开头
fruits.shift();             // 移除开头元素
fruits.slice(1, 3);         // 返回子数组 [1,3)
fruits.splice(1, 1, 'Blueberry'); // 删除并替换元素
fruits.forEach(fruit => console.log(fruit)); // 遍历数组
```

## 错误处理

```js
try {
  // 可能会抛出错误的代码
  throw new Error('Something went wrong');
} catch (error) {
  // 处理错误
  console.error(error.message);
} finally {
  // 无论是否有错误都会执行
  console.log('Cleanup code');
}
```