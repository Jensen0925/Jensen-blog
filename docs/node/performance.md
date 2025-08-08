# Node.js 性能优化

性能优化是构建高质量 Node.js 应用的关键环节。本章将介绍各种性能优化策略和技术。

## 性能监控和分析

### 内置性能监控

```javascript
// performance/monitor.js
const { performance, PerformanceObserver } = require('perf_hooks');
const process = require('process');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      responses: 0,
      errors: 0,
      avgResponseTime: 0,
      memoryUsage: {},
      cpuUsage: {}
    };
    
    this.startTime = Date.now();
    this.setupObservers();
    this.startMemoryMonitoring();
  }
  
  setupObservers() {
    // HTTP 请求性能观察器
    const httpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name.startsWith('http-request')) {
          this.updateResponseTime(entry.duration);
        }
      });
    });
    
    httpObserver.observe({ entryTypes: ['measure'] });
    
    // GC 性能观察器
    const gcObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        console.log(`GC ${entry.kind}: ${entry.duration}ms`);
      });
    });
    
    gcObserver.observe({ entryTypes: ['gc'] });
  }
  
  startMemoryMonitoring() {
    setInterval(() => {
      this.metrics.memoryUsage = process.memoryUsage();
      this.metrics.cpuUsage = process.cpuUsage();
    }, 5000);
  }
  
  markRequestStart(requestId) {
    performance.mark(`request-start-${requestId}`);
    this.metrics.requests++;
  }
  
  markRequestEnd(requestId) {
    performance.mark(`request-end-${requestId}`);
    performance.measure(
      `http-request-${requestId}`,
      `request-start-${requestId}`,
      `request-end-${requestId}`
    );
    this.metrics.responses++;
  }
  
  updateResponseTime(duration) {
    const currentAvg = this.metrics.avgResponseTime;
    const count = this.metrics.responses;
    this.metrics.avgResponseTime = (currentAvg * (count - 1) + duration) / count;
  }
  
  recordError() {
    this.metrics.errors++;
  }
  
  getMetrics() {
    const uptime = Date.now() - this.startTime;
    
    return {
      ...this.metrics,
      uptime,
      requestsPerSecond: this.metrics.requests / (uptime / 1000),
      errorRate: this.metrics.errors / this.metrics.requests,
      memoryUsageMB: {
        rss: Math.round(this.metrics.memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(this.metrics.memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(this.metrics.memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(this.metrics.memoryUsage.external / 1024 / 1024)
      }
    };
  }
  
  // 中间件
  middleware() {
    return (req, res, next) => {
      const requestId = `${Date.now()}-${Math.random()}`;
      req.performanceId = requestId;
      
      this.markRequestStart(requestId);
      
      // 监听响应结束
      res.on('finish', () => {
        this.markRequestEnd(requestId);
        
        if (res.statusCode >= 400) {
          this.recordError();
        }
      });
      
      next();
    };
  }
}

module.exports = new PerformanceMonitor();
```

### 使用 Clinic.js 进行性能分析

```bash
# 安装 Clinic.js
npm install -g clinic

# 性能分析
clinic doctor -- node app.js
clinic bubbleprof -- node app.js
clinic flame -- node app.js
```

## 内存优化

### 内存泄漏检测和预防

```javascript
// utils/memoryManager.js
class MemoryManager {
  constructor() {
    this.intervals = new Set();
    this.timeouts = new Set();
    this.eventListeners = new Map();
    this.streams = new Set();
  }
  
  // 安全的 setInterval
  setInterval(callback, delay) {
    const id = setInterval(callback, delay);
    this.intervals.add(id);
    return id;
  }
  
  // 安全的 setTimeout
  setTimeout(callback, delay) {
    const id = setTimeout(() => {
      callback();
      this.timeouts.delete(id);
    }, delay);
    this.timeouts.add(id);
    return id;
  }
  
  // 清理定时器
  clearInterval(id) {
    clearInterval(id);
    this.intervals.delete(id);
  }
  
  clearTimeout(id) {
    clearTimeout(id);
    this.timeouts.delete(id);
  }
  
  // 事件监听器管理
  addEventListener(emitter, event, listener) {
    emitter.on(event, listener);
    
    if (!this.eventListeners.has(emitter)) {
      this.eventListeners.set(emitter, new Map());
    }
    
    const emitterListeners = this.eventListeners.get(emitter);
    if (!emitterListeners.has(event)) {
      emitterListeners.set(event, new Set());
    }
    
    emitterListeners.get(event).add(listener);
  }
  
  removeEventListener(emitter, event, listener) {
    emitter.removeListener(event, listener);
    
    const emitterListeners = this.eventListeners.get(emitter);
    if (emitterListeners) {
      const eventListeners = emitterListeners.get(event);
      if (eventListeners) {
        eventListeners.delete(listener);
      }
    }
  }
  
  // 流管理
  registerStream(stream) {
    this.streams.add(stream);
    
    stream.on('close', () => {
      this.streams.delete(stream);
    });
    
    stream.on('error', () => {
      this.streams.delete(stream);
    });
  }
  
  // 清理所有资源
  cleanup() {
    // 清理定时器
    this.intervals.forEach(id => clearInterval(id));
    this.timeouts.forEach(id => clearTimeout(id));
    
    // 清理事件监听器
    this.eventListeners.forEach((emitterListeners, emitter) => {
      emitterListeners.forEach((listeners, event) => {
        listeners.forEach(listener => {
          emitter.removeListener(event, listener);
        });
      });
    });
    
    // 关闭流
    this.streams.forEach(stream => {
      if (!stream.destroyed) {
        stream.destroy();
      }
    });
    
    // 清空集合
    this.intervals.clear();
    this.timeouts.clear();
    this.eventListeners.clear();
    this.streams.clear();
  }
  
  // 内存使用报告
  getMemoryReport() {
    const usage = process.memoryUsage();
    
    return {
      rss: `${Math.round(usage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(usage.external / 1024 / 1024)} MB`,
      activeTimers: this.intervals.size + this.timeouts.size,
      activeListeners: Array.from(this.eventListeners.values())
        .reduce((total, emitterListeners) => {
          return total + Array.from(emitterListeners.values())
            .reduce((sum, listeners) => sum + listeners.size, 0);
        }, 0),
      activeStreams: this.streams.size
    };
  }
}

module.exports = new MemoryManager();
```

### 对象池模式

```javascript
// utils/objectPool.js
class ObjectPool {
  constructor(createFn, resetFn, maxSize = 100) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
    this.pool = [];
    this.created = 0;
    this.acquired = 0;
    this.released = 0;
  }
  
  acquire() {
    let obj;
    
    if (this.pool.length > 0) {
      obj = this.pool.pop();
    } else {
      obj = this.createFn();
      this.created++;
    }
    
    this.acquired++;
    return obj;
  }
  
  release(obj) {
    if (this.pool.length < this.maxSize) {
      if (this.resetFn) {
        this.resetFn(obj);
      }
      this.pool.push(obj);
    }
    
    this.released++;
  }
  
  getStats() {
    return {
      poolSize: this.pool.length,
      created: this.created,
      acquired: this.acquired,
      released: this.released,
      inUse: this.acquired - this.released
    };
  }
  
  clear() {
    this.pool.length = 0;
  }
}

// 使用示例：HTTP 请求对象池
class HttpRequestPool {
  constructor() {
    this.pool = new ObjectPool(
      () => ({
        url: '',
        method: 'GET',
        headers: {},
        body: null,
        timestamp: 0
      }),
      (obj) => {
        obj.url = '';
        obj.method = 'GET';
        obj.headers = {};
        obj.body = null;
        obj.timestamp = 0;
      },
      50
    );
  }
  
  createRequest(url, method = 'GET', headers = {}, body = null) {
    const request = this.pool.acquire();
    request.url = url;
    request.method = method;
    request.headers = { ...headers };
    request.body = body;
    request.timestamp = Date.now();
    return request;
  }
  
  releaseRequest(request) {
    this.pool.release(request);
  }
  
  getStats() {
    return this.pool.getStats();
  }
}

module.exports = { ObjectPool, HttpRequestPool };
```

## CPU 优化

### Worker Threads 使用

```javascript
// workers/cpuIntensiveWorker.js
const { parentPort, workerData } = require('worker_threads');

// CPU 密集型任务
function fibonacci(n) {
  if (n < 2) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

function primeFactors(n) {
  const factors = [];
  let divisor = 2;
  
  while (n >= 2) {
    if (n % divisor === 0) {
      factors.push(divisor);
      n = n / divisor;
    } else {
      divisor++;
    }
  }
  
  return factors;
}

function processData(data) {
  return data.map(item => {
    if (item.type === 'fibonacci') {
      return {
        ...item,
        result: fibonacci(item.value)
      };
    } else if (item.type === 'primeFactors') {
      return {
        ...item,
        result: primeFactors(item.value)
      };
    }
    return item;
  });
}

// 监听主线程消息
parentPort.on('message', (data) => {
  try {
    const result = processData(data);
    parentPort.postMessage({ success: true, result });
  } catch (error) {
    parentPort.postMessage({ success: false, error: error.message });
  }
});
```

```javascript
// services/workerPool.js
const { Worker } = require('worker_threads');
const path = require('path');

class WorkerPool {
  constructor(workerScript, poolSize = require('os').cpus().length) {
    this.workerScript = workerScript;
    this.poolSize = poolSize;
    this.workers = [];
    this.queue = [];
    this.activeJobs = new Map();
    
    this.createWorkers();
  }
  
  createWorkers() {
    for (let i = 0; i < this.poolSize; i++) {
      this.createWorker();
    }
  }
  
  createWorker() {
    const worker = new Worker(this.workerScript);
    
    worker.on('message', (result) => {
      const jobId = this.activeJobs.get(worker);
      if (jobId) {
        const job = this.queue.find(j => j.id === jobId);
        if (job) {
          if (result.success) {
            job.resolve(result.result);
          } else {
            job.reject(new Error(result.error));
          }
          
          // 移除已完成的任务
          const index = this.queue.findIndex(j => j.id === jobId);
          if (index !== -1) {
            this.queue.splice(index, 1);
          }
          
          this.activeJobs.delete(worker);
          this.processQueue();
        }
      }
    });
    
    worker.on('error', (error) => {
      console.error('Worker error:', error);
      this.replaceWorker(worker);
    });
    
    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`);
        this.replaceWorker(worker);
      }
    });
    
    this.workers.push(worker);
  }
  
  replaceWorker(deadWorker) {
    const index = this.workers.indexOf(deadWorker);
    if (index !== -1) {
      this.workers.splice(index, 1);
      this.createWorker();
    }
    
    // 处理该 worker 的活跃任务
    const jobId = this.activeJobs.get(deadWorker);
    if (jobId) {
      const job = this.queue.find(j => j.id === jobId);
      if (job) {
        job.reject(new Error('Worker died'));
        const index = this.queue.findIndex(j => j.id === jobId);
        if (index !== -1) {
          this.queue.splice(index, 1);
        }
      }
      this.activeJobs.delete(deadWorker);
    }
  }
  
  execute(data) {
    return new Promise((resolve, reject) => {
      const job = {
        id: Date.now() + Math.random(),
        data,
        resolve,
        reject,
        timestamp: Date.now()
      };
      
      this.queue.push(job);
      this.processQueue();
    });
  }
  
  processQueue() {
    if (this.queue.length === 0) return;
    
    // 找到空闲的 worker
    const availableWorker = this.workers.find(worker => !this.activeJobs.has(worker));
    
    if (availableWorker) {
      // 获取队列中最早的任务
      const job = this.queue.find(j => !this.activeJobs.has(j));
      
      if (job) {
        this.activeJobs.set(availableWorker, job.id);
        availableWorker.postMessage(job.data);
      }
    }
  }
  
  getStats() {
    return {
      poolSize: this.poolSize,
      activeWorkers: this.activeJobs.size,
      queueLength: this.queue.length,
      totalWorkers: this.workers.length
    };
  }
  
  async terminate() {
    await Promise.all(
      this.workers.map(worker => worker.terminate())
    );
    this.workers = [];
    this.activeJobs.clear();
    this.queue = [];
  }
}

module.exports = WorkerPool;
```

```javascript
// services/cpuIntensiveService.js
const WorkerPool = require('./workerPool');
const path = require('path');

class CpuIntensiveService {
  constructor() {
    this.workerPool = new WorkerPool(
      path.join(__dirname, '../workers/cpuIntensiveWorker.js'),
      4 // 使用 4 个 worker
    );
  }
  
  async processLargeDataset(dataset) {
    // 将大数据集分块处理
    const chunkSize = Math.ceil(dataset.length / 4);
    const chunks = [];
    
    for (let i = 0; i < dataset.length; i += chunkSize) {
      chunks.push(dataset.slice(i, i + chunkSize));
    }
    
    // 并行处理所有块
    const results = await Promise.all(
      chunks.map(chunk => this.workerPool.execute(chunk))
    );
    
    // 合并结果
    return results.flat();
  }
  
  async calculateFibonacci(numbers) {
    const data = numbers.map(n => ({ type: 'fibonacci', value: n }));
    return await this.workerPool.execute(data);
  }
  
  async findPrimeFactors(numbers) {
    const data = numbers.map(n => ({ type: 'primeFactors', value: n }));
    return await this.workerPool.execute(data);
  }
  
  getStats() {
    return this.workerPool.getStats();
  }
  
  async shutdown() {
    await this.workerPool.terminate();
  }
}

module.exports = new CpuIntensiveService();
```

### 集群模式

```javascript
// cluster.js
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const app = require('./app');

if (cluster.isMaster) {
  console.log(`主进程 ${process.pid} 正在运行`);
  
  // 创建工作进程
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  // 监听工作进程退出
  cluster.on('exit', (worker, code, signal) => {
    console.log(`工作进程 ${worker.process.pid} 已退出`);
    console.log('启动新的工作进程...');
    cluster.fork();
  });
  
  // 优雅关闭
  process.on('SIGTERM', () => {
    console.log('收到 SIGTERM 信号，正在关闭集群...');
    
    for (const id in cluster.workers) {
      cluster.workers[id].kill();
    }
  });
  
} else {
  // 工作进程
  const server = app.listen(process.env.PORT || 3000, () => {
    console.log(`工作进程 ${process.pid} 启动，端口 ${server.address().port}`);
  });
  
  // 优雅关闭工作进程
  process.on('SIGTERM', () => {
    console.log(`工作进程 ${process.pid} 收到 SIGTERM 信号`);
    
    server.close(() => {
      console.log(`工作进程 ${process.pid} 已关闭`);
      process.exit(0);
    });
  });
}
```

## I/O 优化

### 连接池优化

```javascript
// db/connectionPool.js
const mysql = require('mysql2/promise');

class ConnectionPool {
  constructor(config) {
    this.config = {
      host: config.host || 'localhost',
      user: config.user || 'root',
      password: config.password || '',
      database: config.database,
      connectionLimit: config.connectionLimit || 10,
      queueLimit: config.queueLimit || 0,
      acquireTimeout: config.acquireTimeout || 60000,
      timeout: config.timeout || 60000,
      reconnect: config.reconnect !== false,
      reconnectDelay: config.reconnectDelay || 2000
    };
    
    this.pool = null;
    this.stats = {
      created: 0,
      acquired: 0,
      released: 0,
      errors: 0
    };
  }
  
  async initialize() {
    this.pool = mysql.createPool(this.config);
    
    // 监听连接事件
    this.pool.on('connection', (connection) => {
      this.stats.created++;
      console.log(`新连接已建立: ${connection.threadId}`);
    });
    
    this.pool.on('acquire', (connection) => {
      this.stats.acquired++;
    });
    
    this.pool.on('release', (connection) => {
      this.stats.released++;
    });
    
    this.pool.on('error', (error) => {
      this.stats.errors++;
      console.error('连接池错误:', error);
    });
    
    // 测试连接
    try {
      const connection = await this.pool.getConnection();
      connection.release();
      console.log('数据库连接池初始化成功');
    } catch (error) {
      console.error('数据库连接池初始化失败:', error);
      throw error;
    }
  }
  
  async query(sql, params = []) {
    const startTime = Date.now();
    
    try {
      const [rows, fields] = await this.pool.execute(sql, params);
      const duration = Date.now() - startTime;
      
      if (duration > 1000) {
        console.warn(`慢查询检测 (${duration}ms): ${sql}`);
      }
      
      return rows;
    } catch (error) {
      this.stats.errors++;
      console.error('查询错误:', error);
      throw error;
    }
  }
  
  async transaction(callback) {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const result = await callback(connection);
      
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  
  getStats() {
    return {
      ...this.stats,
      poolSize: this.pool ? this.pool.pool.config.connectionLimit : 0,
      activeConnections: this.pool ? this.pool.pool._allConnections.length : 0,
      idleConnections: this.pool ? this.pool.pool._freeConnections.length : 0
    };
  }
  
  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('数据库连接池已关闭');
    }
  }
}

module.exports = ConnectionPool;
```

### 流式处理

```javascript
// utils/streamProcessor.js
const { Transform, pipeline } = require('stream');
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);

class StreamProcessor {
  // 批处理转换流
  static createBatchTransform(batchSize, processBatch) {
    let batch = [];
    
    return new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        batch.push(chunk);
        
        if (batch.length >= batchSize) {
          const currentBatch = batch;
          batch = [];
          
          processBatch(currentBatch)
            .then(results => {
              results.forEach(result => this.push(result));
              callback();
            })
            .catch(callback);
        } else {
          callback();
        }
      },
      
      flush(callback) {
        if (batch.length > 0) {
          processBatch(batch)
            .then(results => {
              results.forEach(result => this.push(result));
              callback();
            })
            .catch(callback);
        } else {
          callback();
        }
      }
    });
  }
  
  // 限流转换流
  static createThrottleTransform(maxPerSecond) {
    let tokens = maxPerSecond;
    let lastRefill = Date.now();
    
    return new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        const now = Date.now();
        const timePassed = now - lastRefill;
        
        // 补充令牌
        tokens = Math.min(maxPerSecond, tokens + (timePassed / 1000) * maxPerSecond);
        lastRefill = now;
        
        if (tokens >= 1) {
          tokens -= 1;
          this.push(chunk);
          callback();
        } else {
          // 等待直到有令牌可用
          const waitTime = (1 - tokens) / maxPerSecond * 1000;
          setTimeout(() => {
            tokens = 0;
            this.push(chunk);
            callback();
          }, waitTime);
        }
      }
    });
  }
  
  // 错误重试转换流
  static createRetryTransform(maxRetries, retryDelay, processor) {
    return new Transform({
      objectMode: true,
      async transform(chunk, encoding, callback) {
        let attempts = 0;
        
        while (attempts <= maxRetries) {
          try {
            const result = await processor(chunk);
            this.push(result);
            callback();
            return;
          } catch (error) {
            attempts++;
            
            if (attempts > maxRetries) {
              callback(error);
              return;
            }
            
            // 等待后重试
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempts));
          }
        }
      }
    });
  }
  
  // 并行处理流
  static createParallelTransform(concurrency, processor) {
    let activePromises = 0;
    const queue = [];
    
    return new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        const processChunk = async () => {
          activePromises++;
          
          try {
            const result = await processor(chunk);
            this.push(result);
          } catch (error) {
            this.emit('error', error);
          } finally {
            activePromises--;
            
            // 处理队列中的下一个任务
            if (queue.length > 0) {
              const nextTask = queue.shift();
              nextTask();
            }
          }
        };
        
        if (activePromises < concurrency) {
          processChunk();
        } else {
          queue.push(processChunk);
        }
        
        callback();
      }
    });
  }
  
  // 处理大文件
  static async processLargeFile(inputPath, outputPath, processor) {
    const fs = require('fs');
    const readline = require('readline');
    
    const fileStream = fs.createReadStream(inputPath);
    const outputStream = fs.createWriteStream(outputPath);
    
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    
    let lineNumber = 0;
    const batchSize = 1000;
    let batch = [];
    
    for await (const line of rl) {
      lineNumber++;
      batch.push({ lineNumber, content: line });
      
      if (batch.length >= batchSize) {
        const processedBatch = await processor(batch);
        
        for (const item of processedBatch) {
          outputStream.write(JSON.stringify(item) + '\n');
        }
        
        batch = [];
      }
    }
    
    // 处理剩余的批次
    if (batch.length > 0) {
      const processedBatch = await processor(batch);
      
      for (const item of processedBatch) {
        outputStream.write(JSON.stringify(item) + '\n');
      }
    }
    
    outputStream.end();
    
    return new Promise((resolve, reject) => {
      outputStream.on('finish', resolve);
      outputStream.on('error', reject);
    });
  }
}

module.exports = StreamProcessor;
```

## 缓存优化

### 多级缓存系统

```javascript
// cache/multiLevelCache.js
const NodeCache = require('node-cache');
const redis = require('../db/redis');

class MultiLevelCache {
  constructor(options = {}) {
    // L1 缓存：内存缓存
    this.l1Cache = new NodeCache({
      stdTTL: options.l1TTL || 300, // 5分钟
      checkperiod: options.l1CheckPeriod || 60, // 1分钟检查一次过期
      maxKeys: options.l1MaxKeys || 1000
    });
    
    // L2 缓存：Redis
    this.l2Cache = redis;
    
    this.stats = {
      l1Hits: 0,
      l1Misses: 0,
      l2Hits: 0,
      l2Misses: 0,
      sets: 0,
      deletes: 0
    };
    
    this.l1TTL = options.l1TTL || 300;
    this.l2TTL = options.l2TTL || 3600; // 1小时
  }
  
  async get(key) {
    // 先检查 L1 缓存
    const l1Value = this.l1Cache.get(key);
    if (l1Value !== undefined) {
      this.stats.l1Hits++;
      return l1Value;
    }
    
    this.stats.l1Misses++;
    
    // 检查 L2 缓存
    const l2Value = await this.l2Cache.get(key);
    if (l2Value !== null) {
      this.stats.l2Hits++;
      
      // 将数据提升到 L1 缓存
      this.l1Cache.set(key, l2Value, this.l1TTL);
      
      return l2Value;
    }
    
    this.stats.l2Misses++;
    return null;
  }
  
  async set(key, value, ttl) {
    this.stats.sets++;
    
    const l1TTL = ttl || this.l1TTL;
    const l2TTL = ttl || this.l2TTL;
    
    // 同时设置 L1 和 L2 缓存
    this.l1Cache.set(key, value, l1TTL);
    await this.l2Cache.set(key, value, l2TTL);
  }
  
  async delete(key) {
    this.stats.deletes++;
    
    // 同时删除 L1 和 L2 缓存
    this.l1Cache.del(key);
    await this.l2Cache.del(key);
  }
  
  async clear() {
    this.l1Cache.flushAll();
    await this.l2Cache.clearAll();
  }
  
  // 缓存穿透保护
  async getWithFallback(key, fallbackFn, ttl) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }
    
    // 使用分布式锁防止缓存击穿
    const lockKey = `lock:${key}`;
    const lockValue = Date.now().toString();
    
    const acquired = await this.l2Cache.set(lockKey, lockValue, 10); // 10秒锁
    
    if (acquired) {
      try {
        // 再次检查缓存（可能在等待锁的过程中被其他进程设置）
        const doubleCheck = await this.get(key);
        if (doubleCheck !== null) {
          return doubleCheck;
        }
        
        // 执行回调获取数据
        const value = await fallbackFn();
        
        if (value !== null && value !== undefined) {
          await this.set(key, value, ttl);
        }
        
        return value;
      } finally {
        // 释放锁
        await this.l2Cache.del(lockKey);
      }
    } else {
      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, 100));
      return await this.getWithFallback(key, fallbackFn, ttl);
    }
  }
  
  // 批量获取
  async mget(keys) {
    const results = {};
    const l2Keys = [];
    
    // 先从 L1 缓存获取
    for (const key of keys) {
      const l1Value = this.l1Cache.get(key);
      if (l1Value !== undefined) {
        results[key] = l1Value;
        this.stats.l1Hits++;
      } else {
        l2Keys.push(key);
        this.stats.l1Misses++;
      }
    }
    
    // 从 L2 缓存获取剩余的键
    if (l2Keys.length > 0) {
      for (const key of l2Keys) {
        const l2Value = await this.l2Cache.get(key);
        if (l2Value !== null) {
          results[key] = l2Value;
          this.stats.l2Hits++;
          
          // 提升到 L1 缓存
          this.l1Cache.set(key, l2Value, this.l1TTL);
        } else {
          this.stats.l2Misses++;
        }
      }
    }
    
    return results;
  }
  
  // 批量设置
  async mset(keyValuePairs, ttl) {
    for (const [key, value] of Object.entries(keyValuePairs)) {
      await this.set(key, value, ttl);
    }
  }
  
  getStats() {
    const l1Stats = this.l1Cache.getStats();
    
    return {
      ...this.stats,
      l1Size: l1Stats.keys,
      l1HitRate: this.stats.l1Hits / (this.stats.l1Hits + this.stats.l1Misses) || 0,
      l2HitRate: this.stats.l2Hits / (this.stats.l2Hits + this.stats.l2Misses) || 0,
      overallHitRate: (this.stats.l1Hits + this.stats.l2Hits) / 
        (this.stats.l1Hits + this.stats.l1Misses + this.stats.l2Hits + this.stats.l2Misses) || 0
    };
  }
}

module.exports = MultiLevelCache;
```

### 智能缓存策略

```javascript
// cache/smartCache.js
const MultiLevelCache = require('./multiLevelCache');

class SmartCache extends MultiLevelCache {
  constructor(options = {}) {
    super(options);
    
    this.accessPatterns = new Map(); // 访问模式统计
    this.hotKeys = new Set(); // 热点键
    this.coldKeys = new Set(); // 冷键
    
    this.hotThreshold = options.hotThreshold || 10; // 热点阈值
    this.coldThreshold = options.coldThreshold || 2; // 冷键阈值
    this.analysisInterval = options.analysisInterval || 60000; // 分析间隔
    
    this.startAnalysis();
  }
  
  async get(key) {
    // 记录访问模式
    this.recordAccess(key);
    
    return await super.get(key);
  }
  
  recordAccess(key) {
    const now = Date.now();
    const pattern = this.accessPatterns.get(key) || {
      count: 0,
      lastAccess: now,
      frequency: 0
    };
    
    pattern.count++;
    pattern.lastAccess = now;
    pattern.frequency = pattern.count / ((now - (pattern.firstAccess || now)) / 1000 || 1);
    
    if (!pattern.firstAccess) {
      pattern.firstAccess = now;
    }
    
    this.accessPatterns.set(key, pattern);
  }
  
  startAnalysis() {
    setInterval(() => {
      this.analyzeAccessPatterns();
    }, this.analysisInterval);
  }
  
  analyzeAccessPatterns() {
    const now = Date.now();
    const newHotKeys = new Set();
    const newColdKeys = new Set();
    
    for (const [key, pattern] of this.accessPatterns.entries()) {
      const timeSinceLastAccess = now - pattern.lastAccess;
      
      // 识别热点键
      if (pattern.frequency >= this.hotThreshold) {
        newHotKeys.add(key);
      }
      
      // 识别冷键（长时间未访问）
      if (timeSinceLastAccess > 300000 && pattern.count <= this.coldThreshold) { // 5分钟
        newColdKeys.add(key);
      }
    }
    
    this.hotKeys = newHotKeys;
    this.coldKeys = newColdKeys;
    
    // 清理冷键
    this.cleanupColdKeys();
  }
  
  async cleanupColdKeys() {
    for (const key of this.coldKeys) {
      await this.delete(key);
      this.accessPatterns.delete(key);
    }
  }
  
  // 预热缓存
  async warmup(keys, dataLoader) {
    const warmupPromises = keys.map(async (key) => {
      const exists = await this.get(key);
      if (exists === null) {
        try {
          const data = await dataLoader(key);
          if (data !== null && data !== undefined) {
            await this.set(key, data);
          }
        } catch (error) {
          console.error(`缓存预热失败 ${key}:`, error);
        }
      }
    });
    
    await Promise.all(warmupPromises);
  }
  
  // 智能 TTL
  getSmartTTL(key) {
    const pattern = this.accessPatterns.get(key);
    
    if (!pattern) {
      return this.l1TTL; // 默认 TTL
    }
    
    // 热点键使用更长的 TTL
    if (this.hotKeys.has(key)) {
      return this.l1TTL * 3;
    }
    
    // 根据访问频率调整 TTL
    const frequencyMultiplier = Math.min(pattern.frequency / this.hotThreshold, 2);
    return Math.floor(this.l1TTL * (1 + frequencyMultiplier));
  }
  
  async smartSet(key, value) {
    const ttl = this.getSmartTTL(key);
    await this.set(key, value, ttl);
  }
  
  getAnalytics() {
    const hotKeysArray = Array.from(this.hotKeys);
    const coldKeysArray = Array.from(this.coldKeys);
    
    const topKeys = Array.from(this.accessPatterns.entries())
      .sort((a, b) => b[1].frequency - a[1].frequency)
      .slice(0, 10)
      .map(([key, pattern]) => ({
        key,
        frequency: pattern.frequency,
        count: pattern.count
      }));
    
    return {
      ...this.getStats(),
      hotKeysCount: hotKeysArray.length,
      coldKeysCount: coldKeysArray.length,
      totalTrackedKeys: this.accessPatterns.size,
      topKeys
    };
  }
}

module.exports = SmartCache;
```

## 网络优化

### HTTP/2 和压缩

```javascript
// server/optimizedServer.js
const http2 = require('http2');
const fs = require('fs');
const path = require('path');
const compression = require('compression');
const express = require('express');

class OptimizedServer {
  constructor(options = {}) {
    this.app = express();
    this.options = options;
    
    this.setupMiddleware();
    this.setupRoutes();
  }
  
  setupMiddleware() {
    // 启用压缩
    this.app.use(compression({
      level: 6, // 压缩级别
      threshold: 1024, // 只压缩大于 1KB 的响应
      filter: (req, res) => {
        // 自定义压缩过滤器
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      }
    }));
    
    // 静态文件优化
    this.app.use('/static', express.static('public', {
      maxAge: '1y', // 缓存一年
      etag: true,
      lastModified: true,
      setHeaders: (res, path) => {
        // 根据文件类型设置不同的缓存策略
        if (path.endsWith('.html')) {
          res.setHeader('Cache-Control', 'public, max-age=300'); // 5分钟
        } else if (path.match(/\.(js|css)$/)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1年
        } else if (path.match(/\.(jpg|jpeg|png|gif|ico|svg)$/)) {
          res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30天
        }
      }
    }));
    
    // 请求大小限制
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  }
  
  setupRoutes() {
    // 健康检查
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: Date.now() });
    });
    
    // 性能指标
    this.app.get('/metrics', (req, res) => {
      const metrics = this.getMetrics();
      res.json(metrics);
    });
  }
  
  // HTTP/2 服务器
  createHttp2Server() {
    const options = {
      key: fs.readFileSync(this.options.keyPath || 'server.key'),
      cert: fs.readFileSync(this.options.certPath || 'server.crt'),
      allowHTTP1: true // 允许 HTTP/1.1 回退
    };
    
    const server = http2.createSecureServer(options, this.app);
    
    // HTTP/2 推送
    server.on('stream', (stream, headers) => {
      if (headers[':path'] === '/') {
        // 推送关键资源
        this.pushResources(stream, [
          '/static/css/main.css',
          '/static/js/main.js'
        ]);
      }
    });
    
    return server;
  }
  
  pushResources(stream, resources) {
    resources.forEach(resource => {
      const filePath = path.join(__dirname, '../public', resource);
      
      if (fs.existsSync(filePath)) {
        stream.pushStream({ ':path': resource }, (err, pushStream) => {
          if (err) {
            console.error('推送失败:', err);
            return;
          }
          
          const fileStream = fs.createReadStream(filePath);
          fileStream.pipe(pushStream);
        });
      }
    });
  }
  
  // 连接池优化
  setupConnectionPool() {
    const http = require('http');
    const https = require('https');
    
    // HTTP Agent 配置
    const httpAgent = new http.Agent({
      keepAlive: true,
      keepAliveMsecs: 30000,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: 60000
    });
    
    const httpsAgent = new https.Agent({
      keepAlive: true,
      keepAliveMsecs: 30000,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: 60000
    });
    
    return { httpAgent, httpsAgent };
  }
  
  getMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: process.uptime(),
      version: process.version
    };
  }
  
  start(port = 3000) {
    if (this.options.http2) {
      const server = this.createHttp2Server();
      server.listen(port, () => {
        console.log(`HTTP/2 服务器运行在端口 ${port}`);
      });
      return server;
    } else {
      const server = this.app.listen(port, () => {
        console.log(`HTTP/1.1 服务器运行在端口 ${port}`);
      });
      return server;
    }
  }
}

module.exports = OptimizedServer;
```

## 性能测试和基准测试

### 基准测试工具

```javascript
// benchmark/performanceBenchmark.js
const Benchmark = require('benchmark');
const { performance } = require('perf_hooks');

class PerformanceBenchmark {
  constructor() {
    this.suites = new Map();
    this.results = [];
  }
  
  // 创建测试套件
  createSuite(name) {
    const suite = new Benchmark.Suite(name);
    this.suites.set(name, suite);
    return suite;
  }
  
  // 添加测试用例
  addTest(suiteName, testName, testFn, options = {}) {
    const suite = this.suites.get(suiteName);
    if (!suite) {
      throw new Error(`测试套件 ${suiteName} 不存在`);
    }
    
    suite.add(testName, testFn, options);
  }
  
  // 运行基准测试
  async runSuite(suiteName) {
    const suite = this.suites.get(suiteName);
    if (!suite) {
      throw new Error(`测试套件 ${suiteName} 不存在`);
    }
    
    return new Promise((resolve) => {
      suite
        .on('cycle', (event) => {
          console.log(String(event.target));
        })
        .on('complete', function() {
          console.log(`最快的是 ${this.filter('fastest').map('name')}`);
          resolve(this);
        })
        .run({ async: true });
    });
  }
  
  // 内存使用测试
  async memoryTest(testFn, iterations = 1000) {
    // 强制垃圾回收
    if (global.gc) {
      global.gc();
    }
    
    const initialMemory = process.memoryUsage();
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      await testFn();
    }
    
    const endTime = performance.now();
    
    // 再次强制垃圾回收
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = process.memoryUsage();
    
    return {
      duration: endTime - startTime,
      iterations,
      avgDuration: (endTime - startTime) / iterations,
      memoryDelta: {
        rss: finalMemory.rss - initialMemory.rss,
        heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
        heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
        external: finalMemory.external - initialMemory.external
      }
    };
  }
  
  // CPU 密集型测试
  cpuIntensiveTest(testFn, duration = 5000) {
    const startTime = performance.now();
    const endTime = startTime + duration;
    let iterations = 0;
    
    while (performance.now() < endTime) {
      testFn();
      iterations++;
    }
    
    const actualDuration = performance.now() - startTime;
    
    return {
      iterations,
      duration: actualDuration,
      operationsPerSecond: iterations / (actualDuration / 1000)
    };
  }
  
  // 并发测试
  async concurrencyTest(testFn, concurrency = 10, totalRequests = 1000) {
    const startTime = performance.now();
    const results = [];
    const errors = [];
    
    const executeRequest = async () => {
      try {
        const requestStart = performance.now();
        const result = await testFn();
        const requestEnd = performance.now();
        
        results.push({
          duration: requestEnd - requestStart,
          result
        });
      } catch (error) {
        errors.push(error);
      }
    };
    
    // 创建并发请求
    const batches = [];
    for (let i = 0; i < totalRequests; i += concurrency) {
      const batchSize = Math.min(concurrency, totalRequests - i);
      const batch = Array(batchSize).fill().map(() => executeRequest());
      batches.push(Promise.all(batch));
    }
    
    await Promise.all(batches);
    
    const endTime = performance.now();
    const durations = results.map(r => r.duration);
    
    return {
      totalRequests,
      successfulRequests: results.length,
      failedRequests: errors.length,
      totalDuration: endTime - startTime,
      avgResponseTime: durations.reduce((a, b) => a + b, 0) / durations.length,
      minResponseTime: Math.min(...durations),
      maxResponseTime: Math.max(...durations),
      requestsPerSecond: results.length / ((endTime - startTime) / 1000),
      errors: errors.slice(0, 10) // 只返回前10个错误
    };
  }
}

module.exports = PerformanceBenchmark;
```

### 性能测试示例

```javascript
// benchmark/examples.js
const PerformanceBenchmark = require('./performanceBenchmark');
const UserService = require('../services/userService');
const SmartCache = require('../cache/smartCache');

const benchmark = new PerformanceBenchmark();

// 数组操作基准测试
const arraySuite = benchmark.createSuite('Array Operations');

const largeArray = Array.from({ length: 100000 }, (_, i) => i);

benchmark.addTest('Array Operations', 'for loop', () => {
  let sum = 0;
  for (let i = 0; i < largeArray.length; i++) {
    sum += largeArray[i];
  }
  return sum;
});

benchmark.addTest('Array Operations', 'forEach', () => {
  let sum = 0;
  largeArray.forEach(num => {
    sum += num;
  });
  return sum;
});

benchmark.addTest('Array Operations', 'reduce', () => {
  return largeArray.reduce((sum, num) => sum + num, 0);
});

// 缓存性能测试
async function runCacheTests() {
  const cache = new SmartCache();
  
  console.log('\n=== 缓存性能测试 ===');
  
  // 内存测试
  const memoryResult = await benchmark.memoryTest(async () => {
    const key = `test_${Math.random()}`;
    await cache.set(key, { data: 'test data', timestamp: Date.now() });
    await cache.get(key);
  }, 1000);
  
  console.log('缓存内存测试结果:', memoryResult);
  
  // 并发测试
  const concurrencyResult = await benchmark.concurrencyTest(async () => {
    // 模拟数据库查询
    const users = await UserService.findAll({ limit: 10 });
    return users;
  }, 20, 500);
  
  console.log('数据库并发测试结果:', concurrencyResult);
}

// 运行所有测试
async function runAllTests() {
  console.log('开始性能基准测试...');
  
  // 数组操作测试
  await benchmark.runSuite('Array Operations');
  
  // 缓存测试
  await runCacheTests();
  
  // 数据库测试
  await runDatabaseTests();
  
  console.log('\n所有测试完成!');
}

// 如果直接运行此文件
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  PerformanceBenchmark,
  runAllTests,
  runCacheTests,
  runDatabaseTests
};
```

## 最佳实践

### 1. 代码优化

- **避免同步操作**：使用异步 I/O 操作
- **合理使用缓存**：实施多级缓存策略
- **优化数据库查询**：使用索引、连接池、查询优化
- **内存管理**：及时清理不需要的对象和事件监听器

### 2. 架构优化

- **微服务架构**：将大型应用拆分为小型服务
- **负载均衡**：使用集群模式或反向代理
- **CDN 使用**：静态资源使用 CDN 加速
- **数据库分片**：大数据量时考虑分库分表

### 3. 监控和调试

- **性能监控**：使用 APM 工具监控应用性能
- **日志管理**：合理的日志级别和日志轮转
- **错误追踪**：使用错误追踪服务
- **健康检查**：实现应用健康检查端点

### 4. 部署优化

- **容器化**：使用 Docker 容器化部署
- **自动扩缩容**：根据负载自动调整实例数量
- **蓝绿部署**：零停机时间部署
- **配置管理**：环境变量和配置文件管理

## 性能优化检查清单

### 开发阶段

- [ ] 使用异步编程模式
- [ ] 实现适当的错误处理
- [ ] 避免内存泄漏
- [ ] 使用对象池模式
- [ ] 实现缓存策略
- [ ] 优化数据库查询
- [ ] 使用流式处理大数据
- [ ] 实现请求限流

### 测试阶段

- [ ] 进行负载测试
- [ ] 内存泄漏检测
- [ ] 性能基准测试
- [ ] 并发测试
- [ ] 数据库性能测试
- [ ] 缓存命中率测试

### 部署阶段

- [ ] 启用 HTTP/2
- [ ] 配置压缩
- [ ] 设置适当的缓存头
- [ ] 使用 CDN
- [ ] 配置负载均衡
- [ ] 实现健康检查
- [ ] 设置监控和告警
- [ ] 配置日志收集

## 常见性能问题和解决方案

### 1. 内存泄漏

**问题**：应用内存使用持续增长

**解决方案**：
- 使用内存分析工具（如 heapdump）
- 及时清理事件监听器
- 避免全局变量积累
- 使用弱引用（WeakMap、WeakSet）

### 2. CPU 使用率过高

**问题**：CPU 使用率持续很高

**解决方案**：
- 使用 Worker Threads 处理 CPU 密集型任务
- 优化算法复杂度
- 使用缓存减少重复计算
- 实现任务队列和限流

### 3. 数据库连接问题

**问题**：数据库连接超时或连接池耗尽

**解决方案**：
- 配置合适的连接池大小
- 实现连接重试机制
- 优化查询性能
- 使用读写分离

### 4. 响应时间过长

**问题**：API 响应时间过长

**解决方案**：
- 实现缓存策略
- 优化数据库查询
- 使用 CDN 加速静态资源
- 实现异步处理

## 总结

Node.js 性能优化是一个持续的过程，需要从多个维度进行考虑：

1. **监控先行**：建立完善的性能监控体系
2. **分层优化**：从代码、架构、部署等多个层面优化
3. **测试驱动**：通过基准测试和负载测试验证优化效果
4. **持续改进**：根据监控数据持续优化性能
