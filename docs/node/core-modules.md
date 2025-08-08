# Node.js 核心模块

Node.js 提供了许多内置的核心模块，无需安装即可使用。这些模块提供了文件系统操作、网络通信、路径处理等基础功能。

## 文件系统模块 (fs)

`fs` 模块提供了与文件系统交互的 API。

### 同步 vs 异步操作

::: code-group

```javascript [异步操作（推荐）]
const fs = require('fs');

// 异步读取文件
fs.readFile('example.txt', 'utf8', (err, data) => {
  if (err) {
    console.error('读取文件失败:', err);
    return;
  }
  console.log('文件内容:', data);
});

// 使用 Promise 版本
const fsPromises = require('fs').promises;

async function readFileAsync() {
  try {
    const data = await fsPromises.readFile('example.txt', 'utf8');
    console.log('文件内容:', data);
  } catch (err) {
    console.error('读取文件失败:', err);
  }
}
```

```javascript [同步操作]
const fs = require('fs');

try {
  // 同步读取文件（会阻塞线程）
  const data = fs.readFileSync('example.txt', 'utf8');
  console.log('文件内容:', data);
} catch (err) {
  console.error('读取文件失败:', err);
}
```

:::

### 常用文件操作

```javascript
const fs = require('fs');
const path = require('path');

// 写入文件
fs.writeFile('output.txt', 'Hello, Node.js!', 'utf8', (err) => {
  if (err) {
    console.error('写入失败:', err);
    return;
  }
  console.log('文件写入成功');
});

// 追加内容到文件
fs.appendFile('output.txt', '\n追加的内容', 'utf8', (err) => {
  if (err) {
    console.error('追加失败:', err);
    return;
  }
  console.log('内容追加成功');
});

// 检查文件是否存在
fs.access('example.txt', fs.constants.F_OK, (err) => {
  if (err) {
    console.log('文件不存在');
  } else {
    console.log('文件存在');
  }
});

// 获取文件信息
fs.stat('example.txt', (err, stats) => {
  if (err) {
    console.error('获取文件信息失败:', err);
    return;
  }
  
  console.log('文件大小:', stats.size, '字节');
  console.log('是否为文件:', stats.isFile());
  console.log('是否为目录:', stats.isDirectory());
  console.log('创建时间:', stats.birthtime);
  console.log('修改时间:', stats.mtime);
});

// 删除文件
fs.unlink('temp.txt', (err) => {
  if (err) {
    console.error('删除文件失败:', err);
    return;
  }
  console.log('文件删除成功');
});
```

### 目录操作

```javascript
const fs = require('fs');

// 创建目录
fs.mkdir('new-directory', { recursive: true }, (err) => {
  if (err) {
    console.error('创建目录失败:', err);
    return;
  }
  console.log('目录创建成功');
});

// 读取目录内容
fs.readdir('.', (err, files) => {
  if (err) {
    console.error('读取目录失败:', err);
    return;
  }
  console.log('目录内容:', files);
});

// 删除目录
fs.rmdir('old-directory', { recursive: true }, (err) => {
  if (err) {
    console.error('删除目录失败:', err);
    return;
  }
  console.log('目录删除成功');
});
```

### 文件流操作

```javascript
const fs = require('fs');

// 创建可读流
const readStream = fs.createReadStream('large-file.txt', {
  encoding: 'utf8',
  highWaterMark: 1024 // 缓冲区大小
});

readStream.on('data', (chunk) => {
  console.log('读取到数据块:', chunk.length, '字符');
});

readStream.on('end', () => {
  console.log('文件读取完成');
});

readStream.on('error', (err) => {
  console.error('读取错误:', err);
});

// 创建可写流
const writeStream = fs.createWriteStream('output.txt', {
  encoding: 'utf8'
});

writeStream.write('第一行内容\n');
writeStream.write('第二行内容\n');
writeStream.end('最后一行内容\n');

writeStream.on('finish', () => {
  console.log('写入完成');
});

// 管道操作
const readStream2 = fs.createReadStream('input.txt');
const writeStream2 = fs.createWriteStream('copy.txt');

readStream2.pipe(writeStream2);

readStream2.on('end', () => {
  console.log('文件复制完成');
});
```

## 路径模块 (path)

`path` 模块提供了处理文件和目录路径的工具。

```javascript
const path = require('path');

// 路径拼接
const fullPath = path.join('/users', 'john', 'documents', 'file.txt');
console.log('完整路径:', fullPath);
// 输出: /users/john/documents/file.txt (Unix) 或 \users\john\documents\file.txt (Windows)

// 解析路径
const filePath = '/users/john/documents/file.txt';
console.log('目录名:', path.dirname(filePath));  // /users/john/documents
console.log('文件名:', path.basename(filePath)); // file.txt
console.log('扩展名:', path.extname(filePath));  // .txt
console.log('文件名(无扩展名):', path.basename(filePath, '.txt')); // file

// 路径解析对象
const parsed = path.parse(filePath);
console.log('解析结果:', parsed);
/*
{
  root: '/',
  dir: '/users/john/documents',
  base: 'file.txt',
  ext: '.txt',
  name: 'file'
}
*/

// 格式化路径
const formatted = path.format({
  dir: '/users/john/documents',
  name: 'file',
  ext: '.txt'
});
console.log('格式化路径:', formatted); // /users/john/documents/file.txt

// 绝对路径和相对路径
console.log('是否为绝对路径:', path.isAbsolute('/users/john')); // true
console.log('是否为绝对路径:', path.isAbsolute('documents/file.txt')); // false

// 解析相对路径为绝对路径
const absolutePath = path.resolve('documents', 'file.txt');
console.log('绝对路径:', absolutePath);

// 计算相对路径
const relativePath = path.relative('/users/john', '/users/john/documents/file.txt');
console.log('相对路径:', relativePath); // documents/file.txt

// 规范化路径
const normalizedPath = path.normalize('/users/john/../jane/./documents//file.txt');
console.log('规范化路径:', normalizedPath); // /users/jane/documents/file.txt

// 平台相关
console.log('路径分隔符:', path.sep);       // '/' (Unix) 或 '\\' (Windows)
console.log('路径定界符:', path.delimiter); // ':' (Unix) 或 ';' (Windows)
```

## HTTP 模块

`http` 模块用于创建 HTTP 服务器和客户端。

### 创建 HTTP 服务器

```javascript
const http = require('http');
const url = require('url');
const querystring = require('querystring');

// 创建基本服务器
const server = http.createServer((req, res) => {
  // 设置响应头
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // 解析 URL
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;
  
  console.log(`${req.method} ${req.url}`);
  
  // 路由处理
  if (pathname === '/') {
    res.statusCode = 200;
    res.end('<h1>欢迎访问 Node.js 服务器</h1>');
  } else if (pathname === '/api/users') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      users: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
      ]
    }));
  } else if (pathname === '/api/echo' && req.method === 'POST') {
    // 处理 POST 请求
    let body = '';
    
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        message: 'Echo',
        data: body,
        headers: req.headers
      }));
    });
  } else {
    res.statusCode = 404;
    res.end('<h1>404 - 页面未找到</h1>');
  }
});

// 监听端口
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

// 错误处理
server.on('error', (err) => {
  console.error('服务器错误:', err);
});
```

### HTTP 客户端请求

```javascript
const http = require('http');
const https = require('https');

// GET 请求
function makeGetRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// POST 请求
function makePostRequest(hostname, port, path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: hostname,
      port: port,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: responseData
        });
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.write(postData);
    req.end();
  });
}

// 使用示例
async function example() {
  try {
    // GET 请求
    const getResponse = await makeGetRequest('http://localhost:3000/api/users');
    console.log('GET 响应:', getResponse);
    
    // POST 请求
    const postResponse = await makePostRequest('localhost', 3000, '/api/echo', {
      message: 'Hello from client'
    });
    console.log('POST 响应:', postResponse);
  } catch (err) {
    console.error('请求失败:', err);
  }
}
```

## 事件模块 (events)

`events` 模块提供了事件发射器的实现。

```javascript
const EventEmitter = require('events');

// 创建事件发射器
class MyEmitter extends EventEmitter {}
const myEmitter = new MyEmitter();

// 监听事件
myEmitter.on('event', (data) => {
  console.log('事件触发:', data);
});

// 一次性监听
myEmitter.once('onceEvent', (data) => {
  console.log('一次性事件:', data);
});

// 触发事件
myEmitter.emit('event', { message: 'Hello Events!' });
myEmitter.emit('onceEvent', { message: 'This will only fire once' });
myEmitter.emit('onceEvent', { message: 'This will not fire' });

// 错误处理
myEmitter.on('error', (err) => {
  console.error('事件错误:', err);
});

// 移除监听器
function listener(data) {
  console.log('临时监听器:', data);
}

myEmitter.on('temp', listener);
myEmitter.emit('temp', 'First call'); // 会触发

myEmitter.removeListener('temp', listener);
myEmitter.emit('temp', 'Second call'); // 不会触发

// 获取监听器信息
console.log('event 监听器数量:', myEmitter.listenerCount('event'));
console.log('所有事件名:', myEmitter.eventNames());
```

### 实际应用示例

```javascript
const EventEmitter = require('events');
const fs = require('fs');

// 文件处理器类
class FileProcessor extends EventEmitter {
  processFile(filePath) {
    this.emit('start', { file: filePath });
    
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        this.emit('error', err);
        return;
      }
      
      this.emit('data', { file: filePath, content: data });
      
      // 模拟处理时间
      setTimeout(() => {
        this.emit('complete', { file: filePath, size: data.length });
      }, 1000);
    });
  }
}

// 使用文件处理器
const processor = new FileProcessor();

processor.on('start', (info) => {
  console.log(`开始处理文件: ${info.file}`);
});

processor.on('data', (info) => {
  console.log(`读取文件 ${info.file}, 内容长度: ${info.content.length}`);
});

processor.on('complete', (info) => {
  console.log(`文件 ${info.file} 处理完成, 大小: ${info.size} 字符`);
});

processor.on('error', (err) => {
  console.error('处理文件时出错:', err.message);
});

// 处理文件
processor.processFile('example.txt');
```

## URL 模块

`url` 模块提供了 URL 解析和格式化功能。

```javascript
const url = require('url');

// 解析 URL
const myUrl = 'https://www.example.com:8080/path/to/resource?name=john&age=30#section1';

// 使用 url.parse() (已废弃，但仍可用)
const parsed = url.parse(myUrl, true);
console.log('解析结果:', parsed);
/*
{
  protocol: 'https:',
  slashes: true,
  auth: null,
  host: 'www.example.com:8080',
  port: '8080',
  hostname: 'www.example.com',
  hash: '#section1',
  search: '?name=john&age=30',
  query: { name: 'john', age: '30' },
  pathname: '/path/to/resource',
  path: '/path/to/resource?name=john&age=30',
  href: 'https://www.example.com:8080/path/to/resource?name=john&age=30#section1'
}
*/

// 使用 URL 构造函数 (推荐)
const myURL = new URL(myUrl);
console.log('协议:', myURL.protocol);     // https:
console.log('主机:', myURL.hostname);     // www.example.com
console.log('端口:', myURL.port);         // 8080
console.log('路径:', myURL.pathname);     // /path/to/resource
console.log('查询参数:', myURL.search);   // ?name=john&age=30
console.log('哈希:', myURL.hash);         // #section1

// 操作查询参数
console.log('name 参数:', myURL.searchParams.get('name')); // john
myURL.searchParams.set('city', 'beijing');
myURL.searchParams.delete('age');
console.log('修改后的 URL:', myURL.toString());

// 格式化 URL
const urlObject = {
  protocol: 'https:',
  hostname: 'api.example.com',
  port: 443,
  pathname: '/v1/users',
  search: '?limit=10&offset=0'
};

const formattedUrl = url.format(urlObject);
console.log('格式化的 URL:', formattedUrl);

// 解析相对 URL
const baseUrl = 'https://www.example.com/api/';
const relativeUrl = '../users/profile';
const absoluteUrl = new URL(relativeUrl, baseUrl);
console.log('绝对 URL:', absoluteUrl.toString()); // https://www.example.com/users/profile
```

## 查询字符串模块 (querystring)

```javascript
const querystring = require('querystring');

// 解析查询字符串
const query = 'name=john&age=30&city=beijing&hobbies=reading&hobbies=coding';
const parsed = querystring.parse(query);
console.log('解析结果:', parsed);
// { name: 'john', age: '30', city: 'beijing', hobbies: ['reading', 'coding'] }

// 格式化对象为查询字符串
const obj = {
  name: 'alice',
  age: 25,
  city: 'shanghai',
  hobbies: ['music', 'travel']
};

const stringified = querystring.stringify(obj);
console.log('格式化结果:', stringified);
// name=alice&age=25&city=shanghai&hobbies=music&hobbies=travel

// 自定义分隔符
const customQuery = 'name:john;age:30;city:beijing';
const customParsed = querystring.parse(customQuery, ';', ':');
console.log('自定义解析:', customParsed);
// { name: 'john', age: '30', city: 'beijing' }

// URL 编码和解码
const encoded = querystring.escape('hello world & 你好');
console.log('编码结果:', encoded); // hello%20world%20%26%20%E4%BD%A0%E5%A5%BD

const decoded = querystring.unescape(encoded);
console.log('解码结果:', decoded); // hello world & 你好
```

## 操作系统模块 (os)

```javascript
const os = require('os');

// 系统信息
console.log('操作系统类型:', os.type());        // Linux, Darwin, Windows_NT
console.log('操作系统平台:', os.platform());    // linux, darwin, win32
console.log('系统架构:', os.arch());            // x64, arm64
console.log('系统版本:', os.release());
console.log('主机名:', os.hostname());

// 内存信息
console.log('总内存:', (os.totalmem() / 1024 / 1024 / 1024).toFixed(2), 'GB');
console.log('空闲内存:', (os.freemem() / 1024 / 1024 / 1024).toFixed(2), 'GB');

// CPU 信息
const cpus = os.cpus();
console.log('CPU 核心数:', cpus.length);
console.log('CPU 型号:', cpus[0].model);
console.log('CPU 速度:', cpus[0].speed, 'MHz');

// 网络接口
const networkInterfaces = os.networkInterfaces();
console.log('网络接口:', Object.keys(networkInterfaces));

// 用户信息
console.log('当前用户:', os.userInfo());

// 系统负载 (仅 Unix 系统)
if (os.platform() !== 'win32') {
  console.log('系统负载:', os.loadavg());
}

// 系统运行时间
const uptime = os.uptime();
console.log('系统运行时间:', Math.floor(uptime / 3600), '小时');

// 临时目录
console.log('临时目录:', os.tmpdir());

// 行结束符
console.log('行结束符:', JSON.stringify(os.EOL)); // "\n" (Unix) 或 "\r\n" (Windows)
```

## 加密模块 (crypto)

```javascript
const crypto = require('crypto');

// 生成随机数据
const randomBytes = crypto.randomBytes(16);
console.log('随机字节:', randomBytes.toString('hex'));

// 哈希函数
const hash = crypto.createHash('sha256');
hash.update('Hello, World!');
const hashResult = hash.digest('hex');
console.log('SHA256 哈希:', hashResult);

// 简化的哈希计算
const quickHash = crypto.createHash('md5').update('Hello, World!').digest('hex');
console.log('MD5 哈希:', quickHash);

// HMAC (Hash-based Message Authentication Code)
const hmac = crypto.createHmac('sha256', 'secret-key');
hmac.update('Hello, World!');
const hmacResult = hmac.digest('hex');
console.log('HMAC:', hmacResult);

// 对称加密 (AES)
function encrypt(text, password) {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(password, 'salt', 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipher(algorithm, key);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted
  };
}

function decrypt(encryptedData, password) {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(password, 'salt', 32);
  
  const decipher = crypto.createDecipher(algorithm, key);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// 使用加密
const originalText = '这是需要加密的敏感信息';
const password = 'my-secret-password';

const encrypted = encrypt(originalText, password);
console.log('加密结果:', encrypted);

const decrypted = decrypt(encrypted.encryptedData, password);
console.log('解密结果:', decrypted);

// 生成密钥对 (RSA)
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

console.log('公钥:', publicKey);
console.log('私钥:', privateKey);
```

## 实用工具模块 (util)

```javascript
const util = require('util');
const fs = require('fs');

// promisify - 将回调函数转换为 Promise
const readFileAsync = util.promisify(fs.readFile);

async function readFile() {
  try {
    const data = await readFileAsync('example.txt', 'utf8');
    console.log('文件内容:', data);
  } catch (err) {
    console.error('读取失败:', err);
  }
}

// inspect - 格式化对象输出
const obj = {
  name: 'John',
  age: 30,
  address: {
    city: 'Beijing',
    country: 'China'
  },
  hobbies: ['reading', 'coding']
};

console.log('格式化输出:');
console.log(util.inspect(obj, {
  colors: true,
  depth: null,
  compact: false
}));

// format - 字符串格式化
const formatted = util.format('用户 %s 今年 %d 岁', 'Alice', 25);
console.log(formatted); // 用户 Alice 今年 25 岁

// 类型检查
console.log('是否为数组:', util.isArray([1, 2, 3]));     // true
console.log('是否为日期:', util.isDate(new Date()));      // true
console.log('是否为错误:', util.isError(new Error()));    // true

// 继承
function Animal(name) {
  this.name = name;
}

Animal.prototype.speak = function() {
  console.log(`${this.name} makes a sound`);
};

function Dog(name, breed) {
  Animal.call(this, name);
  this.breed = breed;
}

// 设置原型链继承
util.inherits(Dog, Animal);

Dog.prototype.bark = function() {
  console.log(`${this.name} barks!`);
};

const dog = new Dog('Buddy', 'Golden Retriever');
dog.speak(); // Buddy makes a sound
dog.bark();  // Buddy barks!
```

## 最佳实践

1. **优先使用异步 API**：避免阻塞事件循环
2. **错误处理**：始终处理异步操作的错误
3. **使用 Promise 或 async/await**：提高代码可读性
4. **合理使用流**：处理大文件时使用流而不是一次性读取
5. **路径处理**：使用 `path` 模块处理文件路径，确保跨平台兼容性
6. **安全性**：使用 `crypto` 模块进行加密和哈希操作

