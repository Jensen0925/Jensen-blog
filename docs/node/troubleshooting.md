# Node.js 故障排除指南

本章将介绍 Node.js 应用开发和部署过程中常见问题的诊断和解决方法。

## 常见错误类型

### 1. 语法错误 (Syntax Errors)

```javascript
// 常见语法错误示例

// 1. 缺少括号或大括号
if (condition {
  console.log('Missing closing parenthesis');
}
// SyntaxError: Unexpected token '{'

// 2. 缺少逗号
const obj = {
  name: 'John'
  age: 30  // 缺少逗号
};
// SyntaxError: Unexpected token 'age'

// 3. 字符串引号不匹配
const message = "Hello World';
// SyntaxError: Unterminated string constant

// 4. 非法的变量名
const 123name = 'invalid';
// SyntaxError: Unexpected number

// 解决方法：
// 1. 使用代码编辑器的语法高亮
// 2. 使用 ESLint 进行代码检查
// 3. 仔细检查括号、引号的匹配
```

### 2. 引用错误 (Reference Errors)

```javascript
// 常见引用错误

// 1. 使用未声明的变量
console.log(undeclaredVariable);
// ReferenceError: undeclaredVariable is not defined

// 2. 在声明前使用变量（let/const）
console.log(myVar);
let myVar = 'Hello';
// ReferenceError: Cannot access 'myVar' before initialization

// 3. 模块导入错误
const nonExistentModule = require('./non-existent');
// Error: Cannot find module './non-existent'

// 解决方法：
// 1. 检查变量名拼写
// 2. 确保变量在使用前已声明
// 3. 检查模块路径是否正确
// 4. 使用严格模式捕获更多错误
'use strict';

// 调试技巧
const debugVariables = () => {
  console.log('Available variables:', Object.keys(global));
  console.log('Local scope:', Object.keys(this));
};
```

### 3. 类型错误 (Type Errors)

```javascript
// 常见类型错误

// 1. 调用非函数
const notAFunction = 'Hello';
notAFunction();
// TypeError: notAFunction is not a function

// 2. 访问 null/undefined 的属性
const obj = null;
console.log(obj.property);
// TypeError: Cannot read property 'property' of null

// 3. 数组方法用于非数组
const notArray = 'string';
notArray.push('item');
// TypeError: notArray.push is not a function

// 防御性编程解决方案
class TypeSafeUtils {
  // 安全的属性访问
  static safeGet(obj, path, defaultValue = null) {
    try {
      return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : defaultValue;
      }, obj);
    } catch (error) {
      return defaultValue;
    }
  }
  
  // 类型检查
  static isFunction(value) {
    return typeof value === 'function';
  }
  
  static isArray(value) {
    return Array.isArray(value);
  }
  
  static isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
  
  static isString(value) {
    return typeof value === 'string';
  }
  
  static isNumber(value) {
    return typeof value === 'number' && !isNaN(value);
  }
  
  // 安全的函数调用
  static safeCall(fn, ...args) {
    if (this.isFunction(fn)) {
      try {
        return fn(...args);
      } catch (error) {
        console.error('Function call failed:', error.message);
        return null;
      }
    }
    console.warn('Attempted to call non-function:', typeof fn);
    return null;
  }
  
  // 类型转换
  static toNumber(value, defaultValue = 0) {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }
  
  static toString(value, defaultValue = '') {
    return value != null ? String(value) : defaultValue;
  }
  
  static toArray(value) {
    if (this.isArray(value)) return value;
    if (value == null) return [];
    return [value];
  }
}

// 使用示例
const data = { user: { profile: { name: 'John' } } };
const userName = TypeSafeUtils.safeGet(data, 'user.profile.name', 'Unknown');
const invalidName = TypeSafeUtils.safeGet(data, 'user.profile.age', 0);

console.log(userName); // 'John'
console.log(invalidName); // 0
```

## 异步编程问题

### 1. 回调地狱和错误处理

```javascript
// 问题：回调地狱
const fs = require('fs');

// 错误的嵌套回调
fs.readFile('file1.txt', (err1, data1) => {
  if (err1) throw err1;
  fs.readFile('file2.txt', (err2, data2) => {
    if (err2) throw err2;
    fs.readFile('file3.txt', (err3, data3) => {
      if (err3) throw err3;
      console.log('All files read');
    });
  });
});

// 解决方案1：Promise 化
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);

const readMultipleFiles = async () => {
  try {
    const [data1, data2, data3] = await Promise.all([
      readFileAsync('file1.txt'),
      readFileAsync('file2.txt'),
      readFileAsync('file3.txt')
    ]);
    console.log('All files read');
    return { data1, data2, data3 };
  } catch (error) {
    console.error('Error reading files:', error.message);
    throw error;
  }
};

// 解决方案2：错误优先的回调处理
class CallbackHandler {
  static handleCallback(callback) {
    return (error, result) => {
      if (error) {
        console.error('Callback error:', error.message);
        if (typeof callback === 'function') {
          callback(error, null);
        }
        return;
      }
      
      if (typeof callback === 'function') {
        callback(null, result);
      }
    };
  }
  
  static promisifyCallback(fn) {
    return (...args) => {
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
}

// 使用示例
const readFilePromise = CallbackHandler.promisifyCallback(fs.readFile);

readFilePromise('package.json', 'utf8')
  .then(data => console.log('File content:', data))
  .catch(error => console.error('Read error:', error.message));
```

### 2. Promise 和 async/await 错误

```javascript
// 常见 Promise 错误

// 1. 忘记返回 Promise
const badPromiseChain = () => {
  return fetch('/api/data')
    .then(response => {
      // 忘记返回，导致下一个 then 接收到 undefined
      response.json();
    })
    .then(data => {
      console.log(data); // undefined
    });
};

// 正确的做法
const goodPromiseChain = () => {
  return fetch('/api/data')
    .then(response => response.json()) // 返回 Promise
    .then(data => {
      console.log(data); // 正确的数据
      return data;
    });
};

// 2. 未处理的 Promise 拒绝
const unhandledRejection = () => {
  Promise.reject(new Error('Unhandled error'));
  // 这会导致 UnhandledPromiseRejectionWarning
};

// 正确处理
const handledRejection = () => {
  Promise.reject(new Error('Handled error'))
    .catch(error => {
      console.error('Caught error:', error.message);
    });
};

// 3. async/await 错误处理
const asyncErrorHandling = async () => {
  try {
    // 并行执行多个异步操作
    const [result1, result2, result3] = await Promise.allSettled([
      fetch('/api/endpoint1'),
      fetch('/api/endpoint2'),
      fetch('/api/endpoint3')
    ]);
    
    // 检查每个结果
    const processResults = (results) => {
      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return { success: true, data: result.value, index };
        } else {
          console.error(`Request ${index + 1} failed:`, result.reason.message);
          return { success: false, error: result.reason.message, index };
        }
      });
    };
    
    return processResults([result1, result2, result3]);
  } catch (error) {
    console.error('Unexpected error:', error.message);
    throw error;
  }
};

// Promise 超时处理
class PromiseUtils {
  static timeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timed out after ${ms}ms`));
        }, ms);
      })
    ]);
  }
  
  static retry(fn, maxAttempts = 3, delay = 1000) {
    return new Promise(async (resolve, reject) => {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const result = await fn();
          resolve(result);
          return;
        } catch (error) {
          console.warn(`Attempt ${attempt} failed:`, error.message);
          
          if (attempt === maxAttempts) {
            reject(new Error(`All ${maxAttempts} attempts failed. Last error: ${error.message}`));
            return;
          }
          
          // 等待后重试
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    });
  }
  
  static async batchProcess(items, processor, batchSize = 5) {
    const results = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      try {
        const batchResults = await Promise.all(
          batch.map(item => processor(item))
        );
        results.push(...batchResults);
      } catch (error) {
        console.error(`Batch ${Math.floor(i / batchSize) + 1} failed:`, error.message);
        // 可以选择继续处理其他批次或抛出错误
        throw error;
      }
    }
    
    return results;
  }
}

// 使用示例
const fetchWithTimeout = async (url) => {
  return PromiseUtils.timeout(fetch(url), 5000);
};

const fetchWithRetry = async (url) => {
  return PromiseUtils.retry(() => fetch(url), 3, 1000);
};
```

## 内存问题

### 1. 内存泄漏检测和修复

```javascript
// 内存泄漏检测工具
class MemoryMonitor {
  constructor() {
    this.initialMemory = process.memoryUsage();
    this.snapshots = [];
  }
  
  // 获取当前内存使用情况
  getCurrentMemory() {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024)
    };
  }
  
  // 创建内存快照
  takeSnapshot(label = '') {
    const snapshot = {
      label,
      timestamp: new Date().toISOString(),
      memory: this.getCurrentMemory()
    };
    
    this.snapshots.push(snapshot);
    console.log(`Memory snapshot [${label}]:`, snapshot.memory);
    return snapshot;
  }
  
  // 比较内存使用
  compareSnapshots(snapshot1, snapshot2) {
    const diff = {
      rss: snapshot2.memory.rss - snapshot1.memory.rss,
      heapTotal: snapshot2.memory.heapTotal - snapshot1.memory.heapTotal,
      heapUsed: snapshot2.memory.heapUsed - snapshot1.memory.heapUsed,
      external: snapshot2.memory.external - snapshot1.memory.external
    };
    
    console.log(`Memory diff [${snapshot1.label} -> ${snapshot2.label}]:`, diff);
    return diff;
  }
  
  // 监控内存增长
  startMonitoring(interval = 10000) {
    this.monitoringInterval = setInterval(() => {
      const current = this.getCurrentMemory();
      
      // 检查内存增长
      if (this.snapshots.length > 0) {
        const last = this.snapshots[this.snapshots.length - 1];
        const growth = current.heapUsed - last.memory.heapUsed;
        
        if (growth > 50) { // 50MB 增长警告
          console.warn(`Memory growth detected: +${growth}MB`);
        }
      }
      
      this.takeSnapshot('monitoring');
      
      // 保持最近 10 个快照
      if (this.snapshots.length > 10) {
        this.snapshots.shift();
      }
    }, interval);
  }
  
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
  
  // 强制垃圾回收（需要 --expose-gc 标志）
  forceGC() {
    if (global.gc) {
      console.log('Forcing garbage collection...');
      global.gc();
      return this.takeSnapshot('after-gc');
    } else {
      console.warn('Garbage collection not exposed. Run with --expose-gc flag.');
      return null;
    }
  }
}

// 常见内存泄漏模式和修复

// 1. 事件监听器泄漏
class EventLeakExample {
  constructor() {
    this.listeners = new Map();
  }
  
  // 错误：没有清理监听器
  badEventHandling() {
    const emitter = new EventEmitter();
    
    // 这些监听器永远不会被移除
    emitter.on('data', (data) => {
      console.log('Received:', data);
    });
    
    return emitter;
  }
  
  // 正确：管理监听器生命周期
  goodEventHandling() {
    const emitter = new EventEmitter();
    
    const dataHandler = (data) => {
      console.log('Received:', data);
    };
    
    emitter.on('data', dataHandler);
    
    // 保存引用以便后续清理
    this.listeners.set('dataHandler', { emitter, handler: dataHandler, event: 'data' });
    
    return emitter;
  }
  
  // 清理所有监听器
  cleanup() {
    for (const [name, { emitter, handler, event }] of this.listeners) {
      emitter.removeListener(event, handler);
      console.log(`Removed listener: ${name}`);
    }
    this.listeners.clear();
  }
}

// 2. 定时器泄漏
class TimerLeakExample {
  constructor() {
    this.timers = new Set();
  }
  
  // 错误：没有清理定时器
  badTimerHandling() {
    setInterval(() => {
      console.log('This timer will never be cleared');
    }, 1000);
  }
  
  // 正确：管理定时器
  goodTimerHandling() {
    const timerId = setInterval(() => {
      console.log('Managed timer');
    }, 1000);
    
    this.timers.add(timerId);
    return timerId;
  }
  
  clearTimer(timerId) {
    if (this.timers.has(timerId)) {
      clearInterval(timerId);
      this.timers.delete(timerId);
      console.log('Timer cleared');
    }
  }
  
  clearAllTimers() {
    for (const timerId of this.timers) {
      clearInterval(timerId);
    }
    this.timers.clear();
    console.log('All timers cleared');
  }
}

// 3. 闭包泄漏
class ClosureLeakExample {
  // 错误：闭包持有大对象引用
  badClosureHandling() {
    const largeData = new Array(1000000).fill('data');
    
    return function() {
      // 即使不使用 largeData，闭包仍然持有引用
      console.log('Function called');
    };
  }
  
  // 正确：避免不必要的闭包引用
  goodClosureHandling() {
    const processLargeData = (data) => {
      // 处理数据后立即释放引用
      const result = data.length;
      data = null; // 显式释放
      return result;
    };
    
    const largeData = new Array(1000000).fill('data');
    const result = processLargeData(largeData);
    
    return function() {
      console.log('Result:', result);
    };
  }
}

// 使用示例
const memoryMonitor = new MemoryMonitor();
memoryMonitor.startMonitoring(5000);

// 在应用关闭时清理
process.on('SIGINT', () => {
  console.log('Cleaning up...');
  memoryMonitor.stopMonitoring();
  process.exit(0);
});
```

### 2. 大文件处理

```javascript
// 大文件处理最佳实践
const fs = require('fs');
const { pipeline } = require('stream');
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);

class LargeFileHandler {
  // 错误：一次性读取大文件
  static badLargeFileHandling(filePath) {
    // 这会将整个文件加载到内存中
    return fs.readFileSync(filePath, 'utf8');
  }
  
  // 正确：使用流处理大文件
  static async goodLargeFileHandling(inputPath, outputPath, processor) {
    const readStream = fs.createReadStream(inputPath, { encoding: 'utf8' });
    const writeStream = fs.createWriteStream(outputPath);
    
    // 创建转换流
    const transformStream = new require('stream').Transform({
      transform(chunk, encoding, callback) {
        try {
          const processed = processor(chunk.toString());
          callback(null, processed);
        } catch (error) {
          callback(error);
        }
      }
    });
    
    try {
      await pipelineAsync(readStream, transformStream, writeStream);
      console.log('File processed successfully');
    } catch (error) {
      console.error('File processing failed:', error.message);
      throw error;
    }
  }
  
  // 分块读取大文件
  static async readFileInChunks(filePath, chunkSize = 1024 * 1024) {
    const chunks = [];
    const readStream = fs.createReadStream(filePath, { 
      highWaterMark: chunkSize 
    });
    
    return new Promise((resolve, reject) => {
      readStream.on('data', (chunk) => {
        chunks.push(chunk);
        
        // 可以在这里处理每个块
        console.log(`Read chunk of size: ${chunk.length}`);
      });
      
      readStream.on('end', () => {
        console.log(`Total chunks read: ${chunks.length}`);
        resolve(chunks);
      });
      
      readStream.on('error', reject);
    });
  }
  
  // CSV 文件逐行处理
  static async processCSVFile(filePath, processor) {
    const readline = require('readline');
    const fileStream = fs.createReadStream(filePath);
    
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity // 处理 Windows 换行符
    });
    
    let lineNumber = 0;
    const results = [];
    
    try {
      for await (const line of rl) {
        lineNumber++;
        
        try {
          const result = await processor(line, lineNumber);
          if (result !== null) {
            results.push(result);
          }
        } catch (error) {
          console.error(`Error processing line ${lineNumber}:`, error.message);
          // 可以选择继续或停止处理
        }
        
        // 每处理 1000 行报告进度
        if (lineNumber % 1000 === 0) {
          console.log(`Processed ${lineNumber} lines`);
        }
      }
      
      console.log(`Total lines processed: ${lineNumber}`);
      return results;
    } catch (error) {
      console.error('CSV processing failed:', error.message);
      throw error;
    }
  }
  
  // 监控文件处理进度
  static async processFileWithProgress(filePath, processor) {
    const stats = fs.statSync(filePath);
    const totalSize = stats.size;
    let processedSize = 0;
    
    const readStream = fs.createReadStream(filePath);
    
    readStream.on('data', (chunk) => {
      processedSize += chunk.length;
      const progress = (processedSize / totalSize * 100).toFixed(2);
      
      // 更新进度（可以发送到客户端）
      process.stdout.write(`\rProgress: ${progress}%`);
    });
    
    return new Promise((resolve, reject) => {
      let result = '';
      
      readStream.on('data', (chunk) => {
        result += processor(chunk.toString());
      });
      
      readStream.on('end', () => {
        console.log('\nFile processing completed');
        resolve(result);
      });
      
      readStream.on('error', reject);
    });
  }
}

// 使用示例
const processLargeCSV = async () => {
  try {
    const results = await LargeFileHandler.processCSVFile(
      'large-data.csv',
      async (line, lineNumber) => {
        // 跳过标题行
        if (lineNumber === 1) return null;
        
        const columns = line.split(',');
        
        // 处理每行数据
        return {
          id: columns[0],
          name: columns[1],
          processed: true
        };
      }
    );
    
    console.log(`Processed ${results.length} records`);
  } catch (error) {
    console.error('Failed to process CSV:', error.message);
  }
};
```

## 网络和 API 问题

### 1. HTTP 请求错误处理

```javascript
// HTTP 客户端错误处理
const axios = require('axios');

class HTTPClient {
  constructor(baseURL, timeout = 10000) {
    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        'User-Agent': 'MyApp/1.0.0'
      }
    });
    
    this.setupInterceptors();
  }
  
  setupInterceptors() {
    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        console.log(`Making ${config.method.toUpperCase()} request to ${config.url}`);
        return config;
      },
      (error) => {
        console.error('Request setup failed:', error.message);
        return Promise.reject(error);
      }
    );
    
    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => {
        console.log(`Response received: ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        return this.handleResponseError(error);
      }
    );
  }
  
  handleResponseError(error) {
    if (error.response) {
      // 服务器响应了错误状态码
      const { status, statusText, data } = error.response;
      
      switch (status) {
        case 400:
          console.error('Bad Request:', data.message || statusText);
          break;
        case 401:
          console.error('Unauthorized: Please check your credentials');
          // 可以触发重新登录
          this.handleUnauthorized();
          break;
        case 403:
          console.error('Forbidden: Insufficient permissions');
          break;
        case 404:
          console.error('Not Found: Resource does not exist');
          break;
        case 429:
          console.error('Rate Limited: Too many requests');
          // 可以实现退避重试
          return this.handleRateLimit(error);
        case 500:
          console.error('Internal Server Error:', data.message || statusText);
          break;
        default:
          console.error(`HTTP Error ${status}:`, statusText);
      }
      
      const customError = new Error(`HTTP ${status}: ${statusText}`);
      customError.status = status;
      customError.response = error.response;
      return Promise.reject(customError);
    } else if (error.request) {
      // 请求发出但没有收到响应
      console.error('Network Error: No response received');
      const networkError = new Error('Network connection failed');
      networkError.code = 'NETWORK_ERROR';
      return Promise.reject(networkError);
    } else {
      // 请求设置出错
      console.error('Request Setup Error:', error.message);
      return Promise.reject(error);
    }
  }
  
  handleUnauthorized() {
    // 清除认证信息
    localStorage.removeItem('authToken');
    // 重定向到登录页面
    window.location.href = '/login';
  }
  
  async handleRateLimit(error) {
    const retryAfter = error.response.headers['retry-after'];
    const delay = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
    
    console.log(`Rate limited. Retrying after ${delay}ms`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // 重试原始请求
    return this.client.request(error.config);
  }
  
  // 带重试的请求方法
  async requestWithRetry(config, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.client.request(config);
        return response;
      } catch (error) {
        console.warn(`Attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // 指数退避
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // 并发请求控制
  async batchRequests(requests, concurrency = 5) {
    const results = [];
    
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      
      try {
        const batchResults = await Promise.allSettled(
          batch.map(request => this.client.request(request))
        );
        
        results.push(...batchResults);
      } catch (error) {
        console.error(`Batch ${Math.floor(i / concurrency) + 1} failed:`, error.message);
      }
    }
    
    return results;
  }
}

// 使用示例
const apiClient = new HTTPClient('https://api.example.com');

const fetchUserData = async (userId) => {
  try {
    const response = await apiClient.requestWithRetry({
      method: 'GET',
      url: `/users/${userId}`
    });
    
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user data:', error.message);
    throw error;
  }
};
```

### 2. 数据库连接问题

```javascript
// 数据库连接错误处理
const mongoose = require('mongoose');
const mysql = require('mysql2/promise');

class DatabaseManager {
  constructor() {
    this.mongoConnection = null;
    this.mysqlPool = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }
  
  // MongoDB 连接管理
  async connectMongoDB(uri, options = {}) {
    const defaultOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      bufferCommands: false,
      ...options
    };
    
    try {
      await mongoose.connect(uri, defaultOptions);
      console.log('MongoDB connected successfully');
      
      this.setupMongoEventHandlers();
      this.reconnectAttempts = 0;
      
      return mongoose.connection;
    } catch (error) {
      console.error('MongoDB connection failed:', error.message);
      await this.handleMongoReconnect(uri, defaultOptions);
    }
  }
  
  setupMongoEventHandlers() {
    mongoose.connection.on('error', (error) => {
      console.error('MongoDB error:', error.message);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
      this.handleMongoReconnect();
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
      this.reconnectAttempts = 0;
    });
  }
  
  async handleMongoReconnect(uri, options) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached for MongoDB');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.pow(2, this.reconnectAttempts) * 1000;
    
    console.log(`Attempting MongoDB reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(async () => {
      try {
        await mongoose.connect(uri, options);
      } catch (error) {
        console.error('MongoDB reconnection failed:', error.message);
        await this.handleMongoReconnect(uri, options);
      }
    }, delay);
  }
  
  // MySQL 连接池管理
  async createMySQLPool(config) {
    const defaultConfig = {
      host: 'localhost',
      port: 3306,
      connectionLimit: 10,
      acquireTimeout: 60000,
      timeout: 60000,
      reconnect: true,
      ...config
    };
    
    try {
      this.mysqlPool = mysql.createPool(defaultConfig);
      
      // 测试连接
      const connection = await this.mysqlPool.getConnection();
      await connection.ping();
      connection.release();
      
      console.log('MySQL pool created successfully');
      
      this.setupMySQLEventHandlers();
      return this.mysqlPool;
    } catch (error) {
      console.error('MySQL pool creation failed:', error.message);
      throw error;
    }
  }
  
  setupMySQLEventHandlers() {
    this.mysqlPool.on('connection', (connection) => {
      console.log('New MySQL connection established');
    });
    
    this.mysqlPool.on('error', (error) => {
      console.error('MySQL pool error:', error.message);
      
      if (error.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('Attempting to reconnect to MySQL...');
        // 连接池会自动重连
      }
    });
  }
  
  // 安全的数据库查询
  async safeMongoQuery(model, operation, ...args) {
    try {
      if (mongoose.connection.readyState !== 1) {
        throw new Error('MongoDB not connected');
      }
      
      const result = await model[operation](...args);
      return { success: true, data: result };
    } catch (error) {
      console.error(`MongoDB ${operation} failed:`, error.message);
      return { success: false, error: error.message };
    }
  }
  
  async safeMySQLQuery(query, params = []) {
    let connection;
    
    try {
      if (!this.mysqlPool) {
        throw new Error('MySQL pool not initialized');
      }
      
      connection = await this.mysqlPool.getConnection();
      const [rows, fields] = await connection.execute(query, params);
      
      return { success: true, data: rows, fields };
    } catch (error) {
      console.error('MySQL query failed:', error.message);
      return { success: false, error: error.message };
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
  
  // 健康检查
  async checkDatabaseHealth() {
    const health = {
      mongodb: { connected: false, error: null },
      mysql: { connected: false, error: null }
    };
    
    // 检查 MongoDB
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.admin().ping();
        health.mongodb.connected = true;
      }
    } catch (error) {
      health.mongodb.error = error.message;
    }
    
    // 检查 MySQL
    try {
      if (this.mysqlPool) {
        const connection = await this.mysqlPool.getConnection();
        await connection.ping();
        connection.release();
        health.mysql.connected = true;
      }
    } catch (error) {
      health.mysql.error = error.message;
    }
    
    return health;
  }
  
  // 优雅关闭
  async gracefulShutdown() {
    console.log('Shutting down database connections...');
    
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
      }
      
      if (this.mysqlPool) {
        await this.mysqlPool.end();
        console.log('MySQL pool closed');
      }
    } catch (error) {
      console.error('Error during database shutdown:', error.message);
    }
  }
}

// 使用示例
const dbManager = new DatabaseManager();

const initializeDatabases = async () => {
  try {
    await dbManager.connectMongoDB(process.env.MONGODB_URI);
    await dbManager.createMySQLPool({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE
    });
    
    console.log('All databases initialized');
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    process.exit(1);
  }
};

// 优雅关闭处理
process.on('SIGINT', async () => {
  await dbManager.gracefulShutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await dbManager.gracefulShutdown();
  process.exit(0);
});
```

## 调试技巧

### 1. 日志和调试

```javascript
// 高级日志系统
const winston = require('winston');
const path = require('path');

class Logger {
  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'myapp' },
      transports: [
        // 错误日志
        new winston.transports.File({
          filename: path.join(__dirname, '../logs/error.log'),
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        
        // 组合日志
        new winston.transports.File({
          filename: path.join(__dirname, '../logs/combined.log'),
          maxsize: 5242880,
          maxFiles: 5
        })
      ]
    });
    
    // 开发环境添加控制台输出
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }
  }
  
  // 结构化日志方法
  info(message, meta = {}) {
    this.logger.info(message, { ...meta, timestamp: new Date().toISOString() });
  }
  
  error(message, error = null, meta = {}) {
    const errorMeta = error ? {
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      }
    } : {};
    
    this.logger.error(message, { ...meta, ...errorMeta, timestamp: new Date().toISOString() });
  }
  
  warn(message, meta = {}) {
    this.logger.warn(message, { ...meta, timestamp: new Date().toISOString() });
  }
  
  debug(message, meta = {}) {
    this.logger.debug(message, { ...meta, timestamp: new Date().toISOString() });
  }
  
  // HTTP 请求日志
  logRequest(req, res, duration) {
    this.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id
    });
  }
  
  // 数据库操作日志
  logDatabaseOperation(operation, collection, query, duration, error = null) {
    const logData = {
      operation,
      collection,
      query: JSON.stringify(query),
      duration: `${duration}ms`
    };
    
    if (error) {
      this.error('Database Operation Failed', error, logData);
    } else {
      this.info('Database Operation', logData);
    }
  }
  
  // 性能日志
  logPerformance(operation, duration, meta = {}) {
    const level = duration > 1000 ? 'warn' : 'info';
    
    this.logger.log(level, 'Performance Metric', {
      operation,
      duration: `${duration}ms`,
      ...meta,
      timestamp: new Date().toISOString()
    });
  }
}

const logger = new Logger();

// 调试工具类
class Debugger {
  constructor() {
    this.enabled = process.env.DEBUG === 'true';
    this.timers = new Map();
  }
  
  // 条件调试
  debug(message, data = null) {
    if (this.enabled) {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`);
      if (data) {
        console.log(JSON.stringify(data, null, 2));
      }
    }
  }
  
  // 性能计时
  startTimer(label) {
    this.timers.set(label, Date.now());
    this.debug(`Timer started: ${label}`);
  }
  
  endTimer(label) {
    const startTime = this.timers.get(label);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.timers.delete(label);
      this.debug(`Timer ended: ${label} - ${duration}ms`);
      return duration;
    }
    return null;
  }
  
  // 内存使用情况
  logMemoryUsage(label = '') {
    if (this.enabled) {
      const usage = process.memoryUsage();
      console.log(`[MEMORY] ${label}:`, {
        rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(usage.external / 1024 / 1024)}MB`
      });
    }
  }
  
  // 函数执行跟踪
  trace(fn, context = null) {
    return function(...args) {
      const label = `${fn.name || 'anonymous'}_${Date.now()}`;
      
      debugger.debug(`Function called: ${fn.name}`, { args });
      debugger.startTimer(label);
      
      try {
        const result = fn.apply(context, args);
        
        // 处理 Promise
        if (result && typeof result.then === 'function') {
          return result
            .then(value => {
              debugger.endTimer(label);
              debugger.debug(`Function completed: ${fn.name}`, { result: value });
              return value;
            })
            .catch(error => {
              debugger.endTimer(label);
              debugger.debug(`Function failed: ${fn.name}`, { error: error.message });
              throw error;
            });
        }
        
        debugger.endTimer(label);
        debugger.debug(`Function completed: ${fn.name}`, { result });
        return result;
      } catch (error) {
        debugger.endTimer(label);
        debugger.debug(`Function failed: ${fn.name}`, { error: error.message });
        throw error;
      }
    };
  }
  
  // 对象深度检查
  inspect(obj, label = 'Object') {
    if (this.enabled) {
      console.log(`[INSPECT] ${label}:`);
      console.dir(obj, { depth: null, colors: true });
    }
  }
}

const debugger = new Debugger();

// 中间件：请求日志
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.logRequest(req, res, duration);
  });
  
  next();
};

// 中间件：错误处理
const errorHandler = (error, req, res, next) => {
  logger.error('Unhandled Error', error, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // 不在生产环境暴露错误详情
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    error: {
      message: error.message,
      ...(isDevelopment && { stack: error.stack })
    }
  });
};

// 使用示例
const tracedFunction = debugger.trace(async function fetchUserData(userId) {
  debugger.logMemoryUsage('Before DB query');
  
  const user = await User.findById(userId);
  
  debugger.logMemoryUsage('After DB query');
  debugger.inspect(user, 'Fetched User');
  
  return user;
});

module.exports = {
  Logger,
  logger,
  Debugger,
  debugger,
  requestLogger,
  errorHandler
};
```

### 2. 性能分析

```javascript
// 性能分析工具
class PerformanceAnalyzer {
  constructor() {
    this.metrics = new Map();
    this.hooks = new Map();
  }
  
  // 创建性能标记
  mark(name) {
    if (typeof performance !== 'undefined') {
      performance.mark(name);
    } else {
      // Node.js 环境
      this.metrics.set(name, process.hrtime.bigint());
    }
  }
  
  // 测量性能
  measure(name, startMark, endMark) {
    if (typeof performance !== 'undefined') {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name)[0];
      return measure.duration;
    } else {
      // Node.js 环境
      const start = this.metrics.get(startMark);
      const end = this.metrics.get(endMark);
      
      if (start && end) {
        const duration = Number(end - start) / 1000000; // 转换为毫秒
        return duration;
      }
      
      return null;
    }
  }
  
  // 函数性能分析
  profile(fn, name = fn.name || 'anonymous') {
    return async function(...args) {
      const startMark = `${name}-start-${Date.now()}`;
      const endMark = `${name}-end-${Date.now()}`;
      
      analyzer.mark(startMark);
      
      try {
        const result = await fn.apply(this, args);
        
        analyzer.mark(endMark);
        const duration = analyzer.measure(`${name}-duration`, startMark, endMark);
        
        console.log(`[PROFILE] ${name}: ${duration.toFixed(2)}ms`);
        
        return result;
      } catch (error) {
        analyzer.mark(endMark);
        const duration = analyzer.measure(`${name}-duration`, startMark, endMark);
        
        console.log(`[PROFILE] ${name} (failed): ${duration.toFixed(2)}ms`);
        throw error;
      }
    };
  }
  
  // CPU 使用率监控
  startCPUMonitoring(interval = 5000) {
    const startUsage = process.cpuUsage();
    
    this.cpuInterval = setInterval(() => {
      const currentUsage = process.cpuUsage(startUsage);
      const userCPU = currentUsage.user / 1000000; // 转换为秒
      const systemCPU = currentUsage.system / 1000000;
      
      console.log(`[CPU] User: ${userCPU.toFixed(2)}s, System: ${systemCPU.toFixed(2)}s`);
    }, interval);
  }
  
  stopCPUMonitoring() {
    if (this.cpuInterval) {
      clearInterval(this.cpuInterval);
      this.cpuInterval = null;
    }
  }
  
  // 事件循环延迟监控
  startEventLoopMonitoring(interval = 1000) {
    this.eventLoopInterval = setInterval(() => {
      const start = process.hrtime.bigint();
      
      setImmediate(() => {
        const delay = Number(process.hrtime.bigint() - start) / 1000000;
        
        if (delay > 10) { // 延迟超过 10ms 警告
          console.warn(`[EVENT LOOP] High delay detected: ${delay.toFixed(2)}ms`);
        }
      });
    }, interval);
  }
  
  stopEventLoopMonitoring() {
    if (this.eventLoopInterval) {
      clearInterval(this.eventLoopInterval);
      this.eventLoopInterval = null;
    }
  }
  
  // 生成性能报告
  generateReport() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      timestamp: new Date().toISOString(),
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      },
      cpu: {
        user: cpuUsage.user / 1000000,
        system: cpuUsage.system / 1000000
      },
      uptime: process.uptime(),
      version: process.version,
      platform: process.platform
    };
  }
}

const analyzer = new PerformanceAnalyzer();

// 使用示例
const profiledDatabaseQuery = analyzer.profile(async function queryUsers(filters) {
  const users = await User.find(filters);
  return users;
});

// 启动监控
analyzer.startCPUMonitoring();
analyzer.startEventLoopMonitoring();

// 定期生成报告
setInterval(() => {
  const report = analyzer.generateReport();
  console.log('[PERFORMANCE REPORT]', JSON.stringify(report, null, 2));
}, 30000);

module.exports = {
  PerformanceAnalyzer,
  analyzer
};
```

## 总结

Node.js 故障排除需要系统性的方法：

1. **错误分类**：了解不同类型的错误及其特征
2. **防御性编程**：实施类型检查和安全的数据访问
3. **异步处理**：正确处理 Promise 和 async/await
4. **内存管理**：监控和防止内存泄漏
5. **网络处理**：实施重试机制和错误恢复
6. **调试工具**：使用日志、性能分析和调试技术
7. **监控系统**：实时监控应用健康状况

## 故障排除检查清单

### 开发阶段
- [ ] 使用 ESLint 进行代码检查
- [ ] 实施类型检查（TypeScript 或运行时检查）
- [ ] 添加适当的错误处理
- [ ] 使用调试工具和日志
- [ ] 编写单元测试覆盖错误场景

### 测试阶段
- [ ] 进行负载测试
- [ ] 测试错误恢复机制
- [ ] 验证内存使用情况
- [ ] 检查数据库连接处理
- [ ] 测试网络故障场景

### 生产阶段
- [ ] 配置监控和告警
- [ ] 设置日志聚合
- [ ] 实施健康检查
- [ ] 准备故障恢复计划
- [ ] 定期性能分析
