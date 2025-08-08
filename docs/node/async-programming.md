# Node.js 异步编程

Node.js 的核心特性之一就是异步、非阻塞的 I/O 模型。理解异步编程对于编写高效的 Node.js 应用至关重要。

## 异步编程的重要性

### 为什么需要异步？

```javascript
// 同步代码示例（阻塞）
const fs = require('fs');

console.log('开始读取文件');
const data = fs.readFileSync('large-file.txt', 'utf8'); // 阻塞操作
console.log('文件读取完成');
console.log('继续执行其他任务');

// 异步代码示例（非阻塞）
console.log('开始读取文件');
fs.readFile('large-file.txt', 'utf8', (err, data) => {
  if (err) {
    console.error('读取失败:', err);
    return;
  }
  console.log('文件读取完成');
});
console.log('继续执行其他任务'); // 这行会立即执行
```

### 事件循环

Node.js 使用事件循环来处理异步操作：

```javascript
// 事件循环示例
console.log('1. 同步代码开始');

setTimeout(() => {
  console.log('4. setTimeout 回调');
}, 0);

setImmediate(() => {
  console.log('5. setImmediate 回调');
});

process.nextTick(() => {
  console.log('3. nextTick 回调');
});

console.log('2. 同步代码结束');

// 输出顺序:
// 1. 同步代码开始
// 2. 同步代码结束
// 3. nextTick 回调
// 4. setTimeout 回调
// 5. setImmediate 回调
```

## 回调函数 (Callbacks)

回调函数是 Node.js 中最基本的异步编程模式。

### 基本回调模式

```javascript
const fs = require('fs');

// Node.js 回调约定：错误优先
function readFileCallback(filename, callback) {
  fs.readFile(filename, 'utf8', (err, data) => {
    if (err) {
      callback(err, null); // 错误作为第一个参数
      return;
    }
    callback(null, data); // 成功时错误为 null
  });
}

// 使用回调
readFileCallback('example.txt', (err, data) => {
  if (err) {
    console.error('读取失败:', err.message);
    return;
  }
  console.log('文件内容:', data);
});
```

### 回调地狱 (Callback Hell)

```javascript
// 回调地狱示例
const fs = require('fs');

fs.readFile('file1.txt', 'utf8', (err1, data1) => {
  if (err1) {
    console.error('读取 file1 失败:', err1);
    return;
  }
  
  fs.readFile('file2.txt', 'utf8', (err2, data2) => {
    if (err2) {
      console.error('读取 file2 失败:', err2);
      return;
    }
    
    fs.readFile('file3.txt', 'utf8', (err3, data3) => {
      if (err3) {
        console.error('读取 file3 失败:', err3);
        return;
      }
      
      // 处理三个文件的数据
      const combinedData = data1 + data2 + data3;
      
      fs.writeFile('combined.txt', combinedData, (err4) => {
        if (err4) {
          console.error('写入失败:', err4);
          return;
        }
        console.log('文件合并完成');
      });
    });
  });
});
```

### 解决回调地狱

```javascript
// 使用命名函数避免嵌套
const fs = require('fs');

function handleError(err, operation) {
  console.error(`${operation} 失败:`, err.message);
}

function writeFile(data) {
  fs.writeFile('combined.txt', data, (err) => {
    if (err) {
      handleError(err, '写入文件');
      return;
    }
    console.log('文件合并完成');
  });
}

function readFile3(data1, data2) {
  fs.readFile('file3.txt', 'utf8', (err, data3) => {
    if (err) {
      handleError(err, '读取 file3');
      return;
    }
    const combinedData = data1 + data2 + data3;
    writeFile(combinedData);
  });
}

function readFile2(data1) {
  fs.readFile('file2.txt', 'utf8', (err, data2) => {
    if (err) {
      handleError(err, '读取 file2');
      return;
    }
    readFile3(data1, data2);
  });
}

function readFile1() {
  fs.readFile('file1.txt', 'utf8', (err, data1) => {
    if (err) {
      handleError(err, '读取 file1');
      return;
    }
    readFile2(data1);
  });
}

// 开始执行
readFile1();
```

## Promise

Promise 是解决回调地狱的现代方案。

### 基本 Promise 用法

```javascript
// 创建 Promise
function readFilePromise(filename) {
  return new Promise((resolve, reject) => {
    const fs = require('fs');
    
    fs.readFile(filename, 'utf8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

// 使用 Promise
readFilePromise('example.txt')
  .then(data => {
    console.log('文件内容:', data);
    return data.toUpperCase();
  })
  .then(upperData => {
    console.log('大写内容:', upperData);
  })
  .catch(err => {
    console.error('读取失败:', err.message);
  })
  .finally(() => {
    console.log('操作完成');
  });
```

### Promise 链式调用

```javascript
const fs = require('fs').promises;

// 使用 Promise 解决回调地狱
fs.readFile('file1.txt', 'utf8')
  .then(data1 => {
    console.log('读取 file1 完成');
    return fs.readFile('file2.txt', 'utf8')
      .then(data2 => ({ data1, data2 }));
  })
  .then(({ data1, data2 }) => {
    console.log('读取 file2 完成');
    return fs.readFile('file3.txt', 'utf8')
      .then(data3 => ({ data1, data2, data3 }));
  })
  .then(({ data1, data2, data3 }) => {
    const combinedData = data1 + data2 + data3;
    return fs.writeFile('combined.txt', combinedData);
  })
  .then(() => {
    console.log('文件合并完成');
  })
  .catch(err => {
    console.error('操作失败:', err.message);
  });
```

### Promise 工具方法

```javascript
// Promise.all - 并行执行，全部成功才成功
const promises = [
  fs.readFile('file1.txt', 'utf8'),
  fs.readFile('file2.txt', 'utf8'),
  fs.readFile('file3.txt', 'utf8')
];

Promise.all(promises)
  .then(([data1, data2, data3]) => {
    console.log('所有文件读取完成');
    const combinedData = data1 + data2 + data3;
    return fs.writeFile('combined.txt', combinedData);
  })
  .then(() => {
    console.log('文件合并完成');
  })
  .catch(err => {
    console.error('有文件读取失败:', err.message);
  });

// Promise.allSettled - 并行执行，等待所有完成
Promise.allSettled(promises)
  .then(results => {
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`file${index + 1} 读取成功`);
      } else {
        console.log(`file${index + 1} 读取失败:`, result.reason.message);
      }
    });
  });

// Promise.race - 竞速，第一个完成的决定结果
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('超时')), 5000);
});

Promise.race([
  fs.readFile('large-file.txt', 'utf8'),
  timeoutPromise
])
  .then(data => {
    console.log('文件在超时前读取完成');
  })
  .catch(err => {
    console.error('读取超时或失败:', err.message);
  });

// Promise.any - 任意一个成功即成功
Promise.any([
  fs.readFile('file1.txt', 'utf8'),
  fs.readFile('file2.txt', 'utf8'),
  fs.readFile('file3.txt', 'utf8')
])
  .then(data => {
    console.log('至少有一个文件读取成功:', data.substring(0, 50));
  })
  .catch(err => {
    console.error('所有文件读取都失败了');
  });
```

## async/await

async/await 是基于 Promise 的语法糖，让异步代码看起来像同步代码。

### 基本用法

```javascript
const fs = require('fs').promises;

// async 函数
async function readFileAsync(filename) {
  try {
    const data = await fs.readFile(filename, 'utf8');
    console.log('文件内容:', data);
    return data;
  } catch (err) {
    console.error('读取失败:', err.message);
    throw err;
  }
}

// 使用 async 函数
async function main() {
  try {
    const data = await readFileAsync('example.txt');
    const upperData = data.toUpperCase();
    console.log('大写内容:', upperData);
  } catch (err) {
    console.error('主函数错误:', err.message);
  }
}

main();
```

### 解决回调地狱 - async/await 版本

```javascript
const fs = require('fs').promises;

async function combineFiles() {
  try {
    console.log('开始读取文件...');
    
    const data1 = await fs.readFile('file1.txt', 'utf8');
    console.log('file1 读取完成');
    
    const data2 = await fs.readFile('file2.txt', 'utf8');
    console.log('file2 读取完成');
    
    const data3 = await fs.readFile('file3.txt', 'utf8');
    console.log('file3 读取完成');
    
    const combinedData = data1 + data2 + data3;
    
    await fs.writeFile('combined.txt', combinedData);
    console.log('文件合并完成');
    
    return combinedData;
  } catch (err) {
    console.error('操作失败:', err.message);
    throw err;
  }
}

// 并行读取文件
async function combineFilesParallel() {
  try {
    console.log('开始并行读取文件...');
    
    const [data1, data2, data3] = await Promise.all([
      fs.readFile('file1.txt', 'utf8'),
      fs.readFile('file2.txt', 'utf8'),
      fs.readFile('file3.txt', 'utf8')
    ]);
    
    console.log('所有文件读取完成');
    
    const combinedData = data1 + data2 + data3;
    await fs.writeFile('combined.txt', combinedData);
    
    console.log('文件合并完成');
    return combinedData;
  } catch (err) {
    console.error('操作失败:', err.message);
    throw err;
  }
}

// 执行
combineFilesParallel();
```

### 错误处理

```javascript
// 多种错误处理方式
async function errorHandlingExample() {
  // 方式1: try-catch
  try {
    const data = await fs.readFile('nonexistent.txt', 'utf8');
    console.log(data);
  } catch (err) {
    console.error('方式1 - 捕获错误:', err.message);
  }
  
  // 方式2: 使用 Promise 的 catch
  const result = await fs.readFile('nonexistent.txt', 'utf8')
    .catch(err => {
      console.error('方式2 - 捕获错误:', err.message);
      return '默认内容'; // 返回默认值
    });
  
  console.log('结果:', result);
  
  // 方式3: 包装函数
  async function safeReadFile(filename) {
    try {
      const data = await fs.readFile(filename, 'utf8');
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  
  const { success, data, error } = await safeReadFile('example.txt');
  if (success) {
    console.log('读取成功:', data);
  } else {
    console.error('读取失败:', error);
  }
}

errorHandlingExample();
```

### 循环中的异步操作

```javascript
const fs = require('fs').promises;

// 错误示例：forEach 中的 await
async function wrongWay() {
  const files = ['file1.txt', 'file2.txt', 'file3.txt'];
  
  // 这样不会等待异步操作完成
  files.forEach(async (file) => {
    const data = await fs.readFile(file, 'utf8');
    console.log(`${file}:`, data.length);
  });
  
  console.log('这行会立即执行'); // 不会等待文件读取完成
}

// 正确示例1：使用 for...of
async function correctWay1() {
  const files = ['file1.txt', 'file2.txt', 'file3.txt'];
  
  for (const file of files) {
    try {
      const data = await fs.readFile(file, 'utf8');
      console.log(`${file}:`, data.length);
    } catch (err) {
      console.error(`读取 ${file} 失败:`, err.message);
    }
  }
  
  console.log('所有文件处理完成');
}

// 正确示例2：使用 Promise.all 并行处理
async function correctWay2() {
  const files = ['file1.txt', 'file2.txt', 'file3.txt'];
  
  try {
    const results = await Promise.all(
      files.map(async (file) => {
        const data = await fs.readFile(file, 'utf8');
        return { file, length: data.length };
      })
    );
    
    results.forEach(({ file, length }) => {
      console.log(`${file}:`, length);
    });
    
    console.log('所有文件处理完成');
  } catch (err) {
    console.error('处理文件时出错:', err.message);
  }
}

// 正确示例3：使用传统 for 循环
async function correctWay3() {
  const files = ['file1.txt', 'file2.txt', 'file3.txt'];
  
  for (let i = 0; i < files.length; i++) {
    try {
      const data = await fs.readFile(files[i], 'utf8');
      console.log(`${files[i]}:`, data.length);
    } catch (err) {
      console.error(`读取 ${files[i]} 失败:`, err.message);
    }
  }
  
  console.log('所有文件处理完成');
}

correctWay2(); // 推荐：并行处理
```

## 实际应用示例

### 文件处理工具

```javascript
const fs = require('fs').promises;
const path = require('path');

class FileProcessor {
  constructor(inputDir, outputDir) {
    this.inputDir = inputDir;
    this.outputDir = outputDir;
  }
  
  async ensureOutputDir() {
    try {
      await fs.access(this.outputDir);
    } catch {
      await fs.mkdir(this.outputDir, { recursive: true });
    }
  }
  
  async processFile(filename) {
    const inputPath = path.join(this.inputDir, filename);
    const outputPath = path.join(this.outputDir, `processed_${filename}`);
    
    try {
      const data = await fs.readFile(inputPath, 'utf8');
      
      // 模拟处理：转换为大写并添加时间戳
      const processedData = `处理时间: ${new Date().toISOString()}\n\n${data.toUpperCase()}`;
      
      await fs.writeFile(outputPath, processedData);
      
      return {
        success: true,
        inputFile: filename,
        outputFile: `processed_${filename}`,
        size: processedData.length
      };
    } catch (err) {
      return {
        success: false,
        inputFile: filename,
        error: err.message
      };
    }
  }
  
  async processAllFiles() {
    try {
      await this.ensureOutputDir();
      
      const files = await fs.readdir(this.inputDir);
      const textFiles = files.filter(file => path.extname(file) === '.txt');
      
      console.log(`找到 ${textFiles.length} 个文本文件`);
      
      const results = await Promise.allSettled(
        textFiles.map(file => this.processFile(file))
      );
      
      const summary = {
        total: textFiles.length,
        successful: 0,
        failed: 0,
        details: []
      };
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const fileResult = result.value;
          summary.details.push(fileResult);
          
          if (fileResult.success) {
            summary.successful++;
            console.log(`✓ ${fileResult.inputFile} -> ${fileResult.outputFile}`);
          } else {
            summary.failed++;
            console.log(`✗ ${fileResult.inputFile}: ${fileResult.error}`);
          }
        } else {
          summary.failed++;
          console.log(`✗ ${textFiles[index]}: ${result.reason.message}`);
        }
      });
      
      console.log(`\n处理完成: ${summary.successful} 成功, ${summary.failed} 失败`);
      return summary;
    } catch (err) {
      console.error('处理文件时出错:', err.message);
      throw err;
    }
  }
}

// 使用示例
async function main() {
  const processor = new FileProcessor('./input', './output');
  
  try {
    const summary = await processor.processAllFiles();
    console.log('处理摘要:', summary);
  } catch (err) {
    console.error('主程序错误:', err.message);
  }
}

main();
```

### HTTP 请求处理

```javascript
const http = require('http');
const fs = require('fs').promises;
const path = require('path');

class AsyncWebServer {
  constructor(port = 3000) {
    this.port = port;
    this.server = null;
  }
  
  async readFileAsync(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  
  async handleRequest(req, res) {
    const url = req.url;
    
    try {
      if (url === '/') {
        const { success, data, error } = await this.readFileAsync('./public/index.html');
        
        if (success) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(data);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('页面未找到');
        }
      } else if (url === '/api/files') {
        const files = await fs.readdir('./public');
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ files }));
      } else if (url.startsWith('/api/file/')) {
        const filename = url.replace('/api/file/', '');
        const filePath = path.join('./public', filename);
        
        const { success, data, error } = await this.readFileAsync(filePath);
        
        if (success) {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end(data);
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '文件未找到' }));
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 - 页面未找到');
      }
    } catch (err) {
      console.error('处理请求时出错:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('服务器内部错误');
    }
  }
  
  async start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res).catch(err => {
          console.error('异步处理错误:', err);
        });
      });
      
      this.server.listen(this.port, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`服务器运行在 http://localhost:${this.port}`);
          resolve();
        }
      });
      
      this.server.on('error', reject);
    });
  }
  
  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('服务器已关闭');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// 使用示例
async function startServer() {
  const server = new AsyncWebServer(3000);
  
  try {
    await server.start();
    
    // 优雅关闭
    process.on('SIGINT', async () => {
      console.log('\n收到关闭信号...');
      await server.stop();
      process.exit(0);
    });
  } catch (err) {
    console.error('启动服务器失败:', err.message);
  }
}

startServer();
```

## 性能优化

### 并发控制

```javascript
// 限制并发数量
class ConcurrencyLimiter {
  constructor(limit) {
    this.limit = limit;
    this.running = 0;
    this.queue = [];
  }
  
  async add(asyncFunction) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        asyncFunction,
        resolve,
        reject
      });
      
      this.process();
    });
  }
  
  async process() {
    if (this.running >= this.limit || this.queue.length === 0) {
      return;
    }
    
    this.running++;
    const { asyncFunction, resolve, reject } = this.queue.shift();
    
    try {
      const result = await asyncFunction();
      resolve(result);
    } catch (err) {
      reject(err);
    } finally {
      this.running--;
      this.process(); // 处理队列中的下一个任务
    }
  }
}

// 使用示例
async function downloadFiles() {
  const limiter = new ConcurrencyLimiter(3); // 最多同时3个请求
  const urls = [
    'http://example.com/file1.txt',
    'http://example.com/file2.txt',
    'http://example.com/file3.txt',
    'http://example.com/file4.txt',
    'http://example.com/file5.txt'
  ];
  
  const downloadTasks = urls.map(url => 
    limiter.add(async () => {
      console.log(`开始下载: ${url}`);
      // 模拟下载
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`完成下载: ${url}`);
      return `Downloaded: ${url}`;
    })
  );
  
  try {
    const results = await Promise.all(downloadTasks);
    console.log('所有下载完成:', results);
  } catch (err) {
    console.error('下载失败:', err);
  }
}

downloadFiles();
```

## 最佳实践

1. **优先使用 async/await**：代码更清晰易读
2. **合理使用并行处理**：使用 `Promise.all` 提高性能
3. **错误处理**：始终处理异步操作的错误
4. **避免阻塞操作**：不要在异步函数中使用同步 API
5. **控制并发数量**：避免同时发起过多异步操作
6. **使用 Promise 工具方法**：根据需求选择合适的方法

## 常见陷阱

1. **忘记 await**：异步函数不会等待
2. **在循环中错误使用 async**：forEach 不会等待异步操作
3. **Promise 构造函数中的错误**：需要正确处理同步错误
4. **内存泄漏**：未正确清理事件监听器和定时器

## 下一步

掌握异步编程后，你可以继续学习：

- [Express 框架](./express.md) - 构建 Web 应用
- [数据库操作](./database.md) - 异步数据库操作
- [性能优化](./performance.md) - 异步性能优化技巧