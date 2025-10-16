# 事件循环深入解析

## 什么是事件循环

事件循环（Event Loop）是 Node.js 实现异步非阻塞 I/O 的核心机制，它允许 Node.js 在单线程中处理大量并发操作。

```
   ┌───────────────────────────┐
┌─>│           timers          │
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     pending callbacks     │
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │       idle, prepare       │
│  └─────────────┬─────────────┘      ┌───────────────┐
│  ┌─────────────┴─────────────┐      │   incoming:   │
│  │           poll            │<─────┤  connections, │
│  └─────────────┬─────────────┘      │   data, etc.  │
│  ┌─────────────┴─────────────┐      └───────────────┘
│  │           check           │
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
└──┤      close callbacks      │
   └───────────────────────────┘
```

## 事件循环的六个阶段

### 1. Timers 阶段

执行 `setTimeout()` 和 `setInterval()` 的回调。

```javascript
console.log('1. start')

setTimeout(() => {
  console.log('2. setTimeout 0ms')
}, 0)

setTimeout(() => {
  console.log('3. setTimeout 10ms')
}, 10)

console.log('4. end')

// 输出：
// 1. start
// 4. end
// 2. setTimeout 0ms
// 3. setTimeout 10ms
```

**原理**：
- Timer 只能保证在指定时间之后执行，不能保证精确时间
- Timer 的最小延迟时间受系统影响（Windows 约 15ms，Linux 约 1ms）

```javascript
const start = Date.now()

setTimeout(() => {
  const delay = Date.now() - start
  console.log(`实际延迟: ${delay}ms`)
}, 0)

// 实际延迟可能是 1-15ms
```

### 2. Pending Callbacks 阶段

执行延迟到下一个循环迭代的 I/O 回调。

```javascript
const fs = require('fs')

// 文件操作的回调在此阶段执行
fs.readFile('/path/to/file', (err, data) => {
  if (err) throw err
  console.log('文件读取完成')
})
```

### 3. Idle, Prepare 阶段

仅供内部使用。

### 4. Poll 阶段

**最重要的阶段**，执行 I/O 相关的回调（除了 close callbacks、timers、setImmediate）。

```javascript
const fs = require('fs')

console.log('1. start')

// Poll 阶段执行
fs.readFile(__filename, () => {
  console.log('2. readFile callback')
})

console.log('3. end')

// 输出：
// 1. start
// 3. end
// 2. readFile callback
```

**Poll 阶段做两件事**：
1. 执行与 I/O 相关的回调
2. 决定事件循环需要阻塞多久

```javascript
const fs = require('fs')

console.log('1. start')

// Poll 阶段
fs.readFile(__filename, () => {
  console.log('2. readFile callback')
  
  // Check 阶段（下一个阶段）
  setImmediate(() => {
    console.log('3. setImmediate in readFile')
  })
  
  // 下一轮 Timer 阶段
  setTimeout(() => {
    console.log('4. setTimeout in readFile')
  }, 0)
})

console.log('5. end')

// 输出：
// 1. start
// 5. end
// 2. readFile callback
// 3. setImmediate in readFile
// 4. setTimeout in readFile
```

### 5. Check 阶段

执行 `setImmediate()` 的回调。

```javascript
console.log('1. start')

setImmediate(() => {
  console.log('2. setImmediate')
})

console.log('3. end')

// 输出：
// 1. start
// 3. end
// 2. setImmediate
```

### 6. Close Callbacks 阶段

执行 close 事件的回调。

```javascript
const net = require('net')

const server = net.createServer()

server.on('close', () => {
  console.log('Server closed')
})

server.listen(8080)
server.close()

// Close callbacks 阶段执行
```

## 微任务和宏任务

### 宏任务（Macrotask）

- `setTimeout`
- `setInterval`
- `setImmediate`
- I/O 操作
- UI 渲染（浏览器）

### 微任务（Microtask）

- `Promise.then/catch/finally`
- `process.nextTick`
- `queueMicrotask`
- `MutationObserver`（浏览器）

```javascript
console.log('1. script start')

setTimeout(() => {
  console.log('2. setTimeout')
}, 0)

Promise.resolve().then(() => {
  console.log('3. promise1')
}).then(() => {
  console.log('4. promise2')
})

console.log('5. script end')

// 输出：
// 1. script start
// 5. script end
// 3. promise1
// 4. promise2
// 2. setTimeout
```

## process.nextTick

`process.nextTick` 的优先级高于所有微任务和宏任务。

```javascript
console.log('1. start')

setTimeout(() => {
  console.log('2. setTimeout')
}, 0)

Promise.resolve().then(() => {
  console.log('3. promise')
})

process.nextTick(() => {
  console.log('4. nextTick')
})

console.log('5. end')

// 输出：
// 1. start
// 5. end
// 4. nextTick
// 3. promise
// 2. setTimeout
```

**执行顺序**：
```
同步代码 → nextTick → 微任务 → 宏任务
```

### nextTick 的应用场景

```javascript
class EventEmitter extends require('events') {}

const emitter = new EventEmitter()

// ❌ 问题：事件监听器还未注册
emitter.emit('event')
emitter.on('event', () => console.log('event fired'))

// ✅ 解决：使用 nextTick 延迟触发
class MyEmitter extends require('events') {}

function createEmitter() {
  const emitter = new MyEmitter()
  
  process.nextTick(() => {
    emitter.emit('event')
  })
  
  return emitter
}

const myEmitter = createEmitter()
myEmitter.on('event', () => console.log('event fired')) // ✅ 能够监听到
```

## setImmediate vs setTimeout

### 在主模块中

```javascript
// 执行顺序不确定
setTimeout(() => {
  console.log('timeout')
}, 0)

setImmediate(() => {
  console.log('immediate')
})
```

**原因**：
- 进入事件循环时，如果 Timer 阶段还未到达 1ms，则先执行 Timer
- 如果已超过 1ms，则跳过 Timer，先执行 Check 阶段的 setImmediate

### 在 I/O 回调中

```javascript
const fs = require('fs')

fs.readFile(__filename, () => {
  // 执行顺序确定：setImmediate 总是先执行
  setTimeout(() => {
    console.log('timeout')
  }, 0)

  setImmediate(() => {
    console.log('immediate')
  })
})

// 输出：
// immediate
// timeout
```

**原因**：
- I/O 回调在 Poll 阶段执行
- Poll 阶段之后是 Check 阶段（setImmediate）
- 然后才是下一轮的 Timer 阶段（setTimeout）

## 复杂示例

### 示例 1：完整的执行顺序

```javascript
console.log('1. script start')

setTimeout(() => {
  console.log('2. setTimeout')
}, 0)

setImmediate(() => {
  console.log('3. setImmediate')
})

process.nextTick(() => {
  console.log('4. nextTick')
})

Promise.resolve()
  .then(() => {
    console.log('5. promise1')
  })
  .then(() => {
    console.log('6. promise2')
  })

console.log('7. script end')

// 输出：
// 1. script start
// 7. script end
// 4. nextTick
// 5. promise1
// 6. promise2
// 2. setTimeout（或 3）
// 3. setImmediate（或 2）
```

### 示例 2：嵌套的事件循环

```javascript
setTimeout(() => {
  console.log('1. setTimeout')
  
  process.nextTick(() => {
    console.log('2. nextTick in setTimeout')
  })
  
  Promise.resolve().then(() => {
    console.log('3. promise in setTimeout')
  })
}, 0)

setImmediate(() => {
  console.log('4. setImmediate')
  
  process.nextTick(() => {
    console.log('5. nextTick in setImmediate')
  })
  
  Promise.resolve().then(() => {
    console.log('6. promise in setImmediate')
  })
})

// 可能的输出（顺序可能不同）：
// 1. setTimeout
// 2. nextTick in setTimeout
// 3. promise in setTimeout
// 4. setImmediate
// 5. nextTick in setImmediate
// 6. promise in setImmediate
```

### 示例 3：I/O 操作中的执行顺序

```javascript
const fs = require('fs')

console.log('1. start')

fs.readFile(__filename, () => {
  console.log('2. readFile callback')
  
  setTimeout(() => {
    console.log('3. setTimeout in readFile')
  }, 0)
  
  setImmediate(() => {
    console.log('4. setImmediate in readFile')
  })
  
  process.nextTick(() => {
    console.log('5. nextTick in readFile')
  })
  
  Promise.resolve().then(() => {
    console.log('6. promise in readFile')
  })
})

console.log('7. end')

// 输出：
// 1. start
// 7. end
// 2. readFile callback
// 5. nextTick in readFile
// 6. promise in readFile
// 4. setImmediate in readFile
// 3. setTimeout in readFile
```

## libuv 与事件循环

Node.js 的事件循环基于 libuv 实现。

### libuv 架构

```
┌─────────────────────────────────┐
│        JavaScript Code           │
│         (Node.js API)            │
└───────────────┬─────────────────┘
                │
┌───────────────▼─────────────────┐
│           Node.js Bindings       │
└───────────────┬─────────────────┘
                │
┌───────────────▼─────────────────┐
│             V8 Engine            │
└───────────────┬─────────────────┘
                │
┌───────────────▼─────────────────┐
│            libuv                 │
│  ┌──────────────────────────┐   │
│  │   Event Loop             │   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │   Thread Pool (4-128)    │   │
│  └──────────────────────────┘   │
└───────────────┬─────────────────┘
                │
┌───────────────▼─────────────────┐
│      Operating System            │
│    (epoll, kqueue, IOCP)         │
└─────────────────────────────────┘
```

### 线程池

某些操作会在 libuv 的线程池中执行：

```javascript
const crypto = require('crypto')
const fs = require('fs')

// 在线程池中执行（CPU 密集型）
crypto.pbkdf2('password', 'salt', 100000, 512, 'sha512', (err, key) => {
  console.log('crypto done')
})

// 在线程池中执行（文件 I/O）
fs.readFile('/path/to/file', (err, data) => {
  console.log('file read done')
})

// 在主线程执行（网络 I/O，通过系统调用）
const http = require('http')
http.get('http://example.com', (res) => {
  console.log('http request done')
})
```

**默认线程池大小**：4

```javascript
// 修改线程池大小
process.env.UV_THREADPOOL_SIZE = 8
```

## 性能优化建议

### 1. 避免阻塞事件循环

```javascript
// ❌ 阻塞事件循环
function fibonacci(n) {
  if (n <= 1) return n
  return fibonacci(n - 1) + fibonacci(n - 2)
}

// 这会阻塞事件循环很长时间
console.log(fibonacci(40))

// ✅ 使用 Worker Threads
const { Worker } = require('worker_threads')

function runWorker(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./fibonacci-worker.js', {
      workerData: data
    })
    worker.on('message', resolve)
    worker.on('error', reject)
  })
}

runWorker(40).then(result => {
  console.log(result)
})
```

### 2. 使用 setImmediate 拆分任务

```javascript
// ❌ 处理大数组会阻塞事件循环
function processArray(array) {
  array.forEach(item => {
    // 处理每个项目
    heavyComputation(item)
  })
}

// ✅ 使用 setImmediate 分批处理
function processArrayAsync(array, batchSize = 100) {
  let index = 0
  
  function processBatch() {
    const end = Math.min(index + batchSize, array.length)
    
    for (; index < end; index++) {
      heavyComputation(array[index])
    }
    
    if (index < array.length) {
      setImmediate(processBatch)
    }
  }
  
  processBatch()
}
```

### 3. 监控事件循环延迟

```javascript
const { performance } = require('perf_hooks')

let lastCheck = performance.now()

function checkEventLoop() {
  const now = performance.now()
  const delay = now - lastCheck - 100 // 减去预期的 100ms
  
  if (delay > 10) {
    console.warn(`事件循环延迟: ${delay}ms`)
  }
  
  lastCheck = now
  setTimeout(checkEventLoop, 100)
}

checkEventLoop()
```

### 4. 使用 Async Hooks 监控异步操作

```javascript
const asyncHooks = require('async_hooks')
const fs = require('fs')

const hook = asyncHooks.createHook({
  init(asyncId, type, triggerAsyncId) {
    fs.writeSync(1, `Init: ${type}(${asyncId}), trigger: ${triggerAsyncId}\n`)
  },
  before(asyncId) {
    fs.writeSync(1, `Before: ${asyncId}\n`)
  },
  after(asyncId) {
    fs.writeSync(1, `After: ${asyncId}\n`)
  },
  destroy(asyncId) {
    fs.writeSync(1, `Destroy: ${asyncId}\n`)
  }
})

hook.enable()

// 创建异步操作
setTimeout(() => {
  console.log('timeout')
}, 100)
```

## 调试技巧

### 1. 可视化事件循环

```javascript
// 使用 clinic.js
// npm install -g clinic
// clinic bubbleprof -- node app.js
```

### 2. 监控事件循环利用率

```javascript
const v8 = require('v8')
const { performance } = require('perf_hooks')

setInterval(() => {
  const heapStats = v8.getHeapStatistics()
  console.log({
    heapUsed: `${Math.round(heapStats.used_heap_size / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(heapStats.total_heap_size / 1024 / 1024)}MB`,
    rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`
  })
}, 5000)
```

## 常见问题

### 1. 为什么 setTimeout 不准确？

```javascript
const start = Date.now()

setTimeout(() => {
  console.log(`延迟: ${Date.now() - start}ms`) // 可能是 1-15ms
}, 0)
```

**原因**：
- 事件循环需要时间处理
- 系统定时器精度限制
- CPU 负载影响

### 2. process.nextTick 会导致事件循环饥饿吗？

```javascript
// ❌ 会导致事件循环饥饿
function recursiveNextTick() {
  process.nextTick(recursiveNextTick)
}
recursiveNextTick()

// 其他代码永远不会执行
setTimeout(() => {
  console.log('never executed')
}, 0)
```

**解决方案**：使用 setImmediate

```javascript
// ✅ 不会导致饥饿
function recursiveImmediate() {
  setImmediate(recursiveImmediate)
}
recursiveImmediate()

// 其他代码可以执行
setTimeout(() => {
  console.log('will be executed')
}, 0)
```

## 总结

事件循环的核心要点：

1. **六个阶段**
   - Timers → Pending → Idle → Poll → Check → Close

2. **执行顺序**
   - 同步代码 → nextTick → 微任务 → 宏任务

3. **性能优化**
   - 避免阻塞事件循环
   - 使用 setImmediate 拆分任务
   - 监控事件循环延迟

4. **最佳实践**
   - 理解异步操作的执行时机
   - 合理使用 nextTick 和 setImmediate
   - 避免长时间的同步操作

## 相关阅读

- [异步编程](/node/async-programming)
- [性能优化](/node/performance)
- [Worker Threads](/node/process-threads)

