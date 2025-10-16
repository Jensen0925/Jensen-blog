# 异步编程

## 什么是异步编程

JavaScript 是**单线程**语言，但通过异步编程可以在不阻塞主线程的情况下执行耗时操作。

```javascript
// 同步代码 - 会阻塞
console.log('1');
for (let i = 0; i < 1000000000; i++) {} // 阻塞主线程
console.log('2');

// 异步代码 - 不会阻塞
console.log('1');
setTimeout(() => console.log('2'), 1000);
console.log('3');
// 输出：1 3 2
```

## 回调函数（Callback）

### 基本概念

回调函数是作为参数传递给另一个函数的函数。

```javascript
// 基本回调
function fetchData(callback) {
  setTimeout(() => {
    const data = { id: 1, name: 'Jensen' };
    callback(data);
  }, 1000);
}

fetchData((data) => {
  console.log(data); // { id: 1, name: 'Jensen' }
});
```

### 回调地狱（Callback Hell）

```javascript
// ❌ 回调地狱
getUserInfo(userId, (user) => {
  getOrders(user.id, (orders) => {
    getOrderDetails(orders[0].id, (details) => {
      getProductInfo(details.productId, (product) => {
        console.log(product);
        // 嵌套太深，难以维护
      });
    });
  });
});
```

### 错误处理

```javascript
// Node.js 错误优先回调
function readFile(path, callback) {
  fs.readFile(path, (error, data) => {
    if (error) {
      return callback(error);
    }
    callback(null, data);
  });
}

readFile('file.txt', (error, data) => {
  if (error) {
    console.error('读取失败:', error);
    return;
  }
  console.log('内容:', data);
});
```

## Promise

### 基本概念

Promise 是异步操作的占位符，表示未来某个时间点会完成或失败。

```javascript
// Promise 的三种状态
// pending（进行中）
// fulfilled（已成功）
// rejected（已失败）

const promise = new Promise((resolve, reject) => {
  setTimeout(() => {
    const success = true;
    if (success) {
      resolve('操作成功');
    } else {
      reject('操作失败');
    }
  }, 1000);
});

promise
  .then(result => console.log(result))
  .catch(error => console.error(error));
```

### 创建 Promise

```javascript
// 方式 1：使用构造函数
const promise1 = new Promise((resolve, reject) => {
  // 异步操作
  if (/* 成功 */) {
    resolve(value);
  } else {
    reject(error);
  }
});

// 方式 2：Promise.resolve
const promise2 = Promise.resolve(42);

// 方式 3：Promise.reject
const promise3 = Promise.reject(new Error('失败'));

// 方式 4：包装回调
function promisify(fn) {
  return function(...args) {
    return new Promise((resolve, reject) => {
      fn(...args, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  };
}

const readFilePromise = promisify(fs.readFile);
```

### 链式调用

```javascript
// 链式调用解决回调地狱
getUserInfo(userId)
  .then(user => getOrders(user.id))
  .then(orders => getOrderDetails(orders[0].id))
  .then(details => getProductInfo(details.productId))
  .then(product => console.log(product))
  .catch(error => console.error('出错了:', error));

// 每个 then 返回新的 Promise
fetch('/api/users')
  .then(response => response.json())
  .then(data => {
    console.log(data);
    return fetch(`/api/orders/${data.id}`);
  })
  .then(response => response.json())
  .then(orders => console.log(orders));
```

### 错误处理

```javascript
// catch 捕获错误
promise
  .then(result => {
    throw new Error('出错了');
  })
  .catch(error => {
    console.error(error); // 捕获上面的错误
    return '默认值'; // 可以从错误中恢复
  })
  .then(result => {
    console.log(result); // "默认值"
  });

// finally 总是执行
promise
  .then(result => console.log(result))
  .catch(error => console.error(error))
  .finally(() => {
    console.log('清理工作');
    // 无论成功还是失败都会执行
  });
```

### Promise 静态方法

```javascript
// Promise.all - 全部成功才成功
Promise.all([
  fetch('/api/users'),
  fetch('/api/posts'),
  fetch('/api/comments')
])
  .then(([users, posts, comments]) => {
    console.log('全部完成');
  })
  .catch(error => {
    console.error('有一个失败了');
  });

// Promise.allSettled - 等待全部完成（不管成功失败）
Promise.allSettled([
  Promise.resolve(1),
  Promise.reject('错误'),
  Promise.resolve(3)
])
  .then(results => {
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        console.log('成功:', result.value);
      } else {
        console.log('失败:', result.reason);
      }
    });
  });

// Promise.race - 第一个完成的结果
Promise.race([
  fetch('/api/fast'),
  fetch('/api/slow')
])
  .then(result => console.log('最快的结果:', result));

// Promise.any - 第一个成功的结果
Promise.any([
  Promise.reject('错误1'),
  Promise.resolve('成功'),
  Promise.reject('错误2')
])
  .then(result => console.log('第一个成功:', result));
```

## async/await

### 基本概念

`async/await` 是 Promise 的语法糖，让异步代码看起来像同步代码。

```javascript
// 使用 Promise
function fetchUser() {
  return fetch('/api/user')
    .then(response => response.json())
    .then(data => {
      console.log(data);
      return data;
    })
    .catch(error => {
      console.error(error);
      throw error;
    });
}

// 使用 async/await
async function fetchUser() {
  try {
    const response = await fetch('/api/user');
    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
```

### async 函数

```javascript
// async 函数总是返回 Promise
async function example() {
  return 42;
}

example().then(value => console.log(value)); // 42

// 等价于
function example() {
  return Promise.resolve(42);
}

// async 函数中的错误会被转换为 rejected Promise
async function example() {
  throw new Error('出错了');
}

example().catch(error => console.error(error));
```

### await 表达式

```javascript
// await 只能在 async 函数中使用
async function example() {
  // 等待 Promise 完成
  const result = await someAsyncOperation();
  
  // 可以像同步代码一样使用结果
  console.log(result);
  
  return result;
}

// ❌ 错误：await 必须在 async 函数中
function example() {
  const result = await someAsyncOperation(); // 语法错误
}

// ✅ 顶层 await（ES2022+，在模块中）
const data = await fetch('/api/data');
```

### 错误处理

```javascript
// try-catch 处理错误
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('获取数据失败:', error);
    return null;
  }
}

// 多个错误处理
async function processData() {
  try {
    const data = await fetchData();
    
    try {
      const processed = await processData(data);
      return processed;
    } catch (error) {
      console.error('处理数据失败:', error);
    }
  } catch (error) {
    console.error('获取数据失败:', error);
  }
}

// 使用 Promise.catch
async function fetchData() {
  const data = await fetch('/api/data')
    .catch(error => {
      console.error(error);
      return null;
    });
  
  return data;
}
```

### 并行执行

```javascript
// ❌ 串行执行（慢）
async function fetchData() {
  const users = await fetch('/api/users');
  const posts = await fetch('/api/posts');
  const comments = await fetch('/api/comments');
  
  return { users, posts, comments };
}

// ✅ 并行执行（快）
async function fetchData() {
  const [users, posts, comments] = await Promise.all([
    fetch('/api/users'),
    fetch('/api/posts'),
    fetch('/api/comments')
  ]);
  
  return { users, posts, comments };
}

// 或者
async function fetchData() {
  const usersPromise = fetch('/api/users');
  const postsPromise = fetch('/api/posts');
  const commentsPromise = fetch('/api/comments');
  
  const users = await usersPromise;
  const posts = await postsPromise;
  const comments = await commentsPromise;
  
  return { users, posts, comments };
}
```

### 循环中的 async/await

```javascript
const urls = ['/api/1', '/api/2', '/api/3'];

// 串行执行
async function fetchSequential() {
  const results = [];
  
  for (const url of urls) {
    const response = await fetch(url);
    const data = await response.json();
    results.push(data);
  }
  
  return results;
}

// 并行执行
async function fetchParallel() {
  const promises = urls.map(url =>
    fetch(url).then(res => res.json())
  );
  
  return await Promise.all(promises);
}

// 使用 for await...of（异步迭代器）
async function* fetchGenerator() {
  for (const url of urls) {
    yield fetch(url).then(res => res.json());
  }
}

async function fetchData() {
  const results = [];
  
  for await (const data of fetchGenerator()) {
    results.push(data);
  }
  
  return results;
}
```

## 事件循环（Event Loop）

### 执行栈和任务队列

```javascript
console.log('1');

setTimeout(() => {
  console.log('2');
}, 0);

Promise.resolve().then(() => {
  console.log('3');
});

console.log('4');

// 输出：1 4 3 2
// 同步代码 -> 微任务 -> 宏任务
```

### 宏任务和微任务

```javascript
// 宏任务（Macro Task）
// - setTimeout
// - setInterval
// - setImmediate（Node.js）
// - I/O 操作
// - UI 渲染

// 微任务（Micro Task）
// - Promise.then/catch/finally
// - MutationObserver
// - queueMicrotask
// - process.nextTick（Node.js）

// 执行顺序示例
console.log('script start');

setTimeout(() => {
  console.log('setTimeout');
}, 0);

Promise.resolve()
  .then(() => {
    console.log('promise1');
  })
  .then(() => {
    console.log('promise2');
  });

console.log('script end');

// 输出：
// script start
// script end
// promise1
// promise2
// setTimeout
```

### 详细执行流程

```javascript
// 复杂示例
console.log('1');

setTimeout(() => {
  console.log('2');
  Promise.resolve().then(() => {
    console.log('3');
  });
}, 0);

new Promise((resolve) => {
  console.log('4');
  resolve();
}).then(() => {
  console.log('5');
  setTimeout(() => {
    console.log('6');
  }, 0);
});

console.log('7');

// 执行顺序：
// 1. 同步代码：1 4 7
// 2. 微任务：5
// 3. 宏任务：2
// 4. 微任务：3
// 5. 宏任务：6
// 输出：1 4 7 5 2 3 6
```

## 异步迭代器

### 基本概念

```javascript
// 异步可迭代对象
const asyncIterable = {
  async *[Symbol.asyncIterator]() {
    yield 1;
    yield 2;
    yield 3;
  }
};

// 使用 for await...of
(async () => {
  for await (const value of asyncIterable) {
    console.log(value);
  }
})();
```

### 异步生成器

```javascript
// 异步生成器函数
async function* fetchPages(url) {
  let page = 1;
  
  while (true) {
    const response = await fetch(`${url}?page=${page}`);
    const data = await response.json();
    
    if (data.length === 0) break;
    
    yield data;
    page++;
  }
}

// 使用
(async () => {
  for await (const page of fetchPages('/api/users')) {
    console.log('一页数据:', page);
  }
})();
```

## 实际应用

### 1. 并发控制

```javascript
// 限制并发数量
class ConcurrencyLimit {
  constructor(limit) {
    this.limit = limit;
    this.running = 0;
    this.queue = [];
  }
  
  async run(fn) {
    while (this.running >= this.limit) {
      await new Promise(resolve => this.queue.push(resolve));
    }
    
    this.running++;
    
    try {
      return await fn();
    } finally {
      this.running--;
      const resolve = this.queue.shift();
      if (resolve) resolve();
    }
  }
}

// 使用
const limiter = new ConcurrencyLimit(3);

const urls = Array(10).fill('/api/data');
const promises = urls.map(url =>
  limiter.run(() => fetch(url))
);

Promise.all(promises).then(results => {
  console.log('完成');
});
```

### 2. 重试机制

```javascript
async function retry(fn, maxAttempts = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      
      console.log(`重试 ${attempt}/${maxAttempts}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// 使用
retry(() => fetch('/api/data'))
  .then(data => console.log(data))
  .catch(error => console.error('所有重试都失败了'));
```

### 3. 超时控制

```javascript
function timeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('超时')), ms)
    )
  ]);
}

// 使用
timeout(fetch('/api/data'), 5000)
  .then(data => console.log(data))
  .catch(error => console.error(error));

// 或使用 AbortController
async function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal
    });
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### 4. 防抖和节流

```javascript
// 防抖（Debounce）
function debounce(fn, delay) {
  let timeoutId;
  
  return function(...args) {
    clearTimeout(timeoutId);
    
    return new Promise(resolve => {
      timeoutId = setTimeout(() => {
        resolve(fn.apply(this, args));
      }, delay);
    });
  };
}

// 节流（Throttle）
function throttle(fn, delay) {
  let lastCall = 0;
  
  return function(...args) {
    const now = Date.now();
    
    if (now - lastCall < delay) {
      return Promise.resolve();
    }
    
    lastCall = now;
    return Promise.resolve(fn.apply(this, args));
  };
}
```

## 最佳实践

### 1. 避免混用 Promise 和 async/await

```javascript
// ❌ 不好
async function example() {
  return fetch('/api/data')
    .then(response => response.json())
    .then(data => {
      return data;
    });
}

// ✅ 好
async function example() {
  const response = await fetch('/api/data');
  const data = await response.json();
  return data;
}
```

### 2. 正确处理错误

```javascript
// ❌ 忘记处理错误
async function example() {
  const data = await fetch('/api/data'); // 可能出错
  return data;
}

// ✅ 处理错误
async function example() {
  try {
    const data = await fetch('/api/data');
    return data;
  } catch (error) {
    console.error('获取数据失败:', error);
    throw error;
  }
}
```

### 3. 避免不必要的 await

```javascript
// ❌ 不必要的 await
async function example() {
  return await someAsyncOperation();
}

// ✅ 直接返回 Promise
async function example() {
  return someAsyncOperation();
}

// 但如果需要 try-catch，就需要 await
async function example() {
  try {
    return await someAsyncOperation();
  } catch (error) {
    // 处理错误
  }
}
```

## 总结

异步编程的核心要点：

1. **回调函数**
   - 基础的异步处理方式
   - 容易产生回调地狱

2. **Promise**
   - 解决回调地狱
   - 链式调用
   - 丰富的静态方法

3. **async/await**
   - Promise 的语法糖
   - 更直观的异步代码
   - try-catch 错误处理

4. **事件循环**
   - 理解宏任务和微任务
   - 掌握执行顺序

5. **最佳实践**
   - 并发控制
   - 错误处理
   - 性能优化

## 相关阅读

- [JavaScript 进阶概念](/javascript/advanced)
- [ES6+ 特性](/javascript/es6)
- [性能优化](/javascript/performance)

