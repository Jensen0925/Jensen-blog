# Process 和 Worker Threads

## Process 进程

### 什么是 Process

`process` 是一个全局对象，提供有关当前 Node.js 进程的信息和控制能力。

```javascript
// process 是全局对象
console.log(process.version)      // Node.js 版本
console.log(process.platform)     // 操作系统平台
console.log(process.arch)         // CPU 架构
console.log(process.pid)          // 进程 ID
console.log(process.cwd())        // 当前工作目录
console.log(process.execPath)     // Node.js 可执行文件路径
```

### 环境变量

```javascript
// 读取环境变量
console.log(process.env.NODE_ENV)     // 'development' 或 'production'
console.log(process.env.PORT)         // 端口号
console.log(process.env.DATABASE_URL) // 数据库 URL

// 设置环境变量
process.env.MY_VAR = 'value'

// 使用 dotenv 管理环境变量
require('dotenv').config()
```

```bash
# .env 文件
NODE_ENV=production
PORT=3000
DATABASE_URL=mongodb://localhost/myapp
API_KEY=secret_key
```

### 命令行参数

```javascript
// node app.js --port=3000 --mode=production

console.log(process.argv)
// [
//   '/usr/local/bin/node',
//   '/path/to/app.js',
//   '--port=3000',
//   '--mode=production'
// ]

// 解析命令行参数
function parseArgs() {
  const args = {}
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=')
      args[key] = value || true
    }
  })
  return args
}

const args = parseArgs()
console.log(args) // { port: '3000', mode: 'production' }
```

### 进程退出

```javascript
// 正常退出
process.exit(0)

// 异常退出
process.exit(1)

// 退出前清理
process.on('exit', (code) => {
  console.log(`进程即将退出，退出码: ${code}`)
  // 只能执行同步操作
  // 异步操作不会执行
})

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号')
  
  // 停止接受新连接
  server.close(() => {
    console.log('服务器已关闭')
    
    // 关闭数据库连接
    db.close(() => {
      console.log('数据库连接已关闭')
      process.exit(0)
    })
  })
  
  // 设置超时强制退出
  setTimeout(() => {
    console.error('强制退出')
    process.exit(1)
  }, 10000)
})

// Ctrl+C
process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号')
  process.exit(0)
})
```

### 内存使用

```javascript
// 查看内存使用情况
const used = process.memoryUsage()

console.log({
  rss: `${Math.round(used.rss / 1024 / 1024)}MB`,           // 常驻集大小
  heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`, // 堆总大小
  heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,   // 堆使用
  external: `${Math.round(used.external / 1024 / 1024)}MB`,   // 外部内存
  arrayBuffers: `${Math.round(used.arrayBuffers / 1024 / 1024)}MB` // ArrayBuffer
})

// 监控内存泄漏
setInterval(() => {
  const usage = process.memoryUsage()
  if (usage.heapUsed / usage.heapTotal > 0.9) {
    console.warn('内存使用率过高!')
  }
}, 5000)
```

### CPU 使用

```javascript
// 查看 CPU 使用情况
const startUsage = process.cpuUsage()

// 执行一些操作
doSomething()

const endUsage = process.cpuUsage(startUsage)

console.log({
  user: `${endUsage.user / 1000}ms`,     // 用户 CPU 时间
  system: `${endUsage.system / 1000}ms`  // 系统 CPU 时间
})
```

### 进程标题

```javascript
// 设置进程标题（在 ps 或 top 中显示）
process.title = 'my-app-server'

console.log(process.title) // 'my-app-server'
```

### 标准输入输出

```javascript
// 标准输入
process.stdin.setEncoding('utf8')
process.stdin.on('data', (data) => {
  console.log(`输入: ${data}`)
  process.stdout.write(`你输入了: ${data}`)
})

// 标准输出
process.stdout.write('Hello World\n')

// 标准错误
process.stderr.write('Error message\n')

// 读取管道输入
// echo "hello" | node app.js
if (!process.stdin.isTTY) {
  let input = ''
  process.stdin.on('data', (chunk) => {
    input += chunk
  })
  process.stdin.on('end', () => {
    console.log('管道输入:', input)
  })
}
```

## Child Process 子进程

### 为什么需要子进程

Node.js 是单线程的，子进程可以：
- 执行 CPU 密集型任务
- 运行其他程序
- 实现进程隔离
- 提高系统可靠性

### spawn - 流式数据

```javascript
const { spawn } = require('child_process')

// 执行命令
const ls = spawn('ls', ['-lh', '/usr'])

// 监听输出
ls.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`)
})

ls.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`)
})

ls.on('close', (code) => {
  console.log(`子进程退出，退出码: ${code}`)
})

// 处理错误
ls.on('error', (err) => {
  console.error('启动子进程失败:', err)
})
```

### exec - 缓冲输出

```javascript
const { exec } = require('child_process')

// 执行 shell 命令
exec('ls -lh', (error, stdout, stderr) => {
  if (error) {
    console.error(`执行错误: ${error}`)
    return
  }
  console.log(`stdout: ${stdout}`)
  console.error(`stderr: ${stderr}`)
})

// 带选项
exec('ls -lh', {
  cwd: '/usr',           // 工作目录
  env: { ...process.env }, // 环境变量
  timeout: 5000,         // 超时时间
  maxBuffer: 1024 * 1024 // 最大缓冲
}, (error, stdout, stderr) => {
  // ...
})
```

### execFile - 执行文件

```javascript
const { execFile } = require('child_process')

// 执行可执行文件（不通过 shell）
execFile('node', ['--version'], (error, stdout, stderr) => {
  if (error) {
    console.error(`执行错误: ${error}`)
    return
  }
  console.log(`Node 版本: ${stdout}`)
})
```

### fork - Node.js 进程

```javascript
// parent.js
const { fork } = require('child_process')

const child = fork('./child.js')

// 发送消息给子进程
child.send({ type: 'start', data: [1, 2, 3, 4, 5] })

// 接收子进程消息
child.on('message', (msg) => {
  console.log('子进程返回:', msg)
})

child.on('exit', (code) => {
  console.log(`子进程退出，退出码: ${code}`)
})
```

```javascript
// child.js
process.on('message', (msg) => {
  console.log('收到消息:', msg)
  
  if (msg.type === 'start') {
    // 执行计算密集型任务
    const result = msg.data.reduce((sum, n) => sum + n, 0)
    
    // 发送结果回父进程
    process.send({ type: 'result', data: result })
    
    // 退出
    process.exit(0)
  }
})
```

### Promise 版本

```javascript
const { promisify } = require('util')
const { exec } = require('child_process')

const execPromise = promisify(exec)

async function runCommand() {
  try {
    const { stdout, stderr } = await execPromise('ls -lh')
    console.log('输出:', stdout)
  } catch (error) {
    console.error('错误:', error)
  }
}

runCommand()
```

## Worker Threads 工作线程

### 为什么需要 Worker Threads

- 真正的并行计算（多核 CPU）
- 不阻塞主线程
- 共享内存（ArrayBuffer）
- 比子进程更轻量

```javascript
// 子进程 vs Worker Threads
// 子进程：独立的 V8 实例，开销大，进程间通信慢
// Worker Threads：共享 V8 实例，开销小，线程间通信快
```

### 基本使用

```javascript
// main.js
const { Worker } = require('worker_threads')

const worker = new Worker('./worker.js')

// 发送消息
worker.postMessage({ n: 44 })

// 接收消息
worker.on('message', (result) => {
  console.log('计算结果:', result)
})

worker.on('error', (err) => {
  console.error('Worker 错误:', err)
})

worker.on('exit', (code) => {
  console.log(`Worker 退出，退出码: ${code}`)
})
```

```javascript
// worker.js
const { parentPort } = require('worker_threads')

// 计算斐波那契
function fibonacci(n) {
  if (n <= 1) return n
  return fibonacci(n - 1) + fibonacci(n - 2)
}

parentPort.on('message', (msg) => {
  const result = fibonacci(msg.n)
  parentPort.postMessage(result)
})
```

### 使用 workerData

```javascript
// main.js
const { Worker } = require('worker_threads')

const worker = new Worker('./worker.js', {
  workerData: { n: 44 }
})

worker.on('message', (result) => {
  console.log('结果:', result)
})
```

```javascript
// worker.js
const { parentPort, workerData } = require('worker_threads')

function fibonacci(n) {
  if (n <= 1) return n
  return fibonacci(n - 1) + fibonacci(n - 2)
}

const result = fibonacci(workerData.n)
parentPort.postMessage(result)
```

### 共享内存

```javascript
// main.js
const { Worker } = require('worker_threads')

// 创建共享内存
const sharedBuffer = new SharedArrayBuffer(4)
const sharedArray = new Int32Array(sharedBuffer)

const worker = new Worker('./worker.js', {
  workerData: { sharedBuffer }
})

// 主线程写入
sharedArray[0] = 123

setTimeout(() => {
  console.log('主线程读取:', sharedArray[0])
}, 1000)
```

```javascript
// worker.js
const { workerData } = require('worker_threads')

const sharedArray = new Int32Array(workerData.sharedBuffer)

// Worker 线程修改
setTimeout(() => {
  sharedArray[0] = 456
}, 500)
```

### 线程池

```javascript
class WorkerPool {
  constructor(workerPath, poolSize = 4) {
    this.workerPath = workerPath
    this.poolSize = poolSize
    this.workers = []
    this.queue = []
    
    this.init()
  }

  init() {
    for (let i = 0; i < this.poolSize; i++) {
      this.workers.push({
        worker: new Worker(this.workerPath),
        busy: false
      })
    }
  }

  async exec(data) {
    return new Promise((resolve, reject) => {
      this.queue.push({ data, resolve, reject })
      this.processQueue()
    })
  }

  processQueue() {
    if (this.queue.length === 0) return

    const availableWorker = this.workers.find(w => !w.busy)
    if (!availableWorker) return

    const task = this.queue.shift()
    availableWorker.busy = true

    const { worker } = availableWorker

    worker.once('message', (result) => {
      availableWorker.busy = false
      task.resolve(result)
      this.processQueue()
    })

    worker.once('error', (err) => {
      availableWorker.busy = false
      task.reject(err)
      this.processQueue()
    })

    worker.postMessage(task.data)
  }

  destroy() {
    this.workers.forEach(({ worker }) => worker.terminate())
  }
}

// 使用
const pool = new WorkerPool('./worker.js', 4)

async function main() {
  const tasks = [40, 41, 42, 43, 44].map(n => pool.exec({ n }))
  const results = await Promise.all(tasks)
  console.log('所有结果:', results)
  pool.destroy()
}

main()
```

### 使用 Piscina

```javascript
// npm install piscina
const Piscina = require('piscina')

const pool = new Piscina({
  filename: './worker.js',
  minThreads: 2,
  maxThreads: 4
})

async function main() {
  const tasks = [40, 41, 42, 43, 44].map(n => pool.run({ n }))
  const results = await Promise.all(tasks)
  console.log('所有结果:', results)
}

main()
```

## Cluster 集群

### 什么是 Cluster

Cluster 允许创建多个工作进程共享同一个端口，充分利用多核 CPU。

```javascript
const cluster = require('cluster')
const http = require('http')
const os = require('os')

if (cluster.isMaster) {
  // 主进程
  const numCPUs = os.cpus().length
  console.log(`主进程 ${process.pid} 正在运行`)
  console.log(`启动 ${numCPUs} 个工作进程`)

  // 创建工作进程
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork()
  }

  // 监听工作进程退出
  cluster.on('exit', (worker, code, signal) => {
    console.log(`工作进程 ${worker.process.pid} 已退出`)
    // 重启工作进程
    cluster.fork()
  })
} else {
  // 工作进程
  const server = http.createServer((req, res) => {
    res.writeHead(200)
    res.end(`工作进程 ${process.pid} 处理请求\n`)
  })

  server.listen(3000)
  console.log(`工作进程 ${process.pid} 已启动`)
}
```

### 零停机重启

```javascript
const cluster = require('cluster')
const http = require('http')
const os = require('os')

if (cluster.isMaster) {
  const workers = []
  const numCPUs = os.cpus().length

  // 启动工作进程
  for (let i = 0; i < numCPUs; i++) {
    workers.push(cluster.fork())
  }

  // 优雅重启
  process.on('SIGUSR2', () => {
    console.log('开始优雅重启...')
    
    const restartWorker = (index) => {
      const worker = workers[index]
      if (!worker) return

      worker.on('exit', () => {
        console.log(`工作进程 ${worker.process.pid} 已停止`)
        workers[index] = cluster.fork()
        
        // 重启下一个
        setTimeout(() => restartWorker(index + 1), 1000)
      })

      worker.disconnect()
    }

    restartWorker(0)
  })

  cluster.on('exit', (worker, code, signal) => {
    if (code !== 0 && !worker.exitedAfterDisconnect) {
      console.log(`工作进程 ${worker.process.pid} 崩溃，重启中...`)
      cluster.fork()
    }
  })
} else {
  const server = http.createServer((req, res) => {
    res.end(`工作进程 ${process.pid}\n`)
  })

  server.listen(3000)
}
```

## PM2 进程管理

### 安装和基本使用

```bash
# 安装
npm install -g pm2

# 启动应用
pm2 start app.js

# 启动并命名
pm2 start app.js --name my-app

# 集群模式（利用所有 CPU 核心）
pm2 start app.js -i max

# 查看进程
pm2 list

# 查看详情
pm2 show my-app

# 监控
pm2 monit

# 查看日志
pm2 logs
pm2 logs my-app

# 重启
pm2 restart my-app

# 重载（零停机）
pm2 reload my-app

# 停止
pm2 stop my-app

# 删除
pm2 delete my-app
```

### ecosystem.config.js

```javascript
module.exports = {
  apps: [{
    name: 'my-app',
    script: './app.js',
    instances: 'max',          // 使用所有 CPU 核心
    exec_mode: 'cluster',      // 集群模式
    watch: false,              // 文件变化时重启
    max_memory_restart: '1G',  // 内存超过 1G 重启
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
}
```

```bash
# 使用配置文件
pm2 start ecosystem.config.js

# 生产环境
pm2 start ecosystem.config.js --env production
```

## 性能优化建议

### 1. 选择合适的并发模型

```javascript
// CPU 密集型：使用 Worker Threads
const { Worker } = require('worker_threads')

function cpuIntensive(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./cpu-worker.js', { workerData: data })
    worker.on('message', resolve)
    worker.on('error', reject)
  })
}

// I/O 密集型：使用异步 I/O（无需多线程）
async function ioIntensive() {
  const data = await fs.promises.readFile('large-file.txt')
  return data
}
```

### 2. 监控和限制资源使用

```javascript
// 监控内存
setInterval(() => {
  const usage = process.memoryUsage()
  if (usage.heapUsed > 500 * 1024 * 1024) { // 500MB
    console.warn('内存使用过高，考虑重启')
  }
}, 5000)

// 限制子进程数量
const MAX_WORKERS = 4
let activeWorkers = 0

function createWorker() {
  if (activeWorkers >= MAX_WORKERS) {
    return Promise.reject(new Error('Too many workers'))
  }
  
  activeWorkers++
  const worker = new Worker('./worker.js')
  
  worker.on('exit', () => {
    activeWorkers--
  })
  
  return worker
}
```

## 总结

进程和线程的核心要点：

1. **Process**
   - 全局进程信息
   - 环境变量和命令行参数
   - 优雅关闭和信号处理

2. **Child Process**
   - spawn：流式数据
   - exec：缓冲输出
   - fork：Node.js 进程通信

3. **Worker Threads**
   - CPU 密集型任务
   - 共享内存
   - 线程池管理

4. **Cluster**
   - 多核利用
   - 负载均衡
   - 零停机重启

5. **选择建议**
   - I/O 密集型：异步 I/O
   - CPU 密集型：Worker Threads
   - 多核利用：Cluster
   - 进程隔离：Child Process

## 相关阅读

- [事件循环](/node/event-loop)
- [性能优化](/node/performance)
- [部署](/node/deployment)

