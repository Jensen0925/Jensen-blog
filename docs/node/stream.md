# Stream 流深入解析

## 什么是 Stream

Stream（流）是 Node.js 中处理数据的抽象接口，用于高效地处理大量数据。

```javascript
// 不使用 Stream - 一次性读取整个文件
const fs = require('fs')

// ❌ 如果文件很大，会占用大量内存
const data = fs.readFileSync('large-file.txt')
console.log(data)

// ✅ 使用 Stream - 分块读取
const readStream = fs.createReadStream('large-file.txt')
readStream.on('data', (chunk) => {
  console.log(`接收到 ${chunk.length} 字节`)
})
```

## Stream 的优势

1. **内存效率**：不需要一次性加载所有数据到内存
2. **时间效率**：可以边读边处理，不需要等待全部数据
3. **组合性**：可以通过管道（pipe）连接多个流

```javascript
// 复制文件示例
const fs = require('fs')

// ❌ 占用大量内存
const data = fs.readFileSync('source.txt')
fs.writeFileSync('destination.txt', data)

// ✅ 内存占用小
fs.createReadStream('source.txt')
  .pipe(fs.createWriteStream('destination.txt'))
```

## Stream 的四种类型

### 1. Readable Stream（可读流）

从源读取数据。

```javascript
const { Readable } = require('stream')

// 创建自定义可读流
class MyReadable extends Readable {
  constructor(options) {
    super(options)
    this.index = 0
    this.max = 5
  }

  _read() {
    if (this.index < this.max) {
      // 推送数据
      this.push(`数据 ${this.index}\n`)
      this.index++
    } else {
      // 结束流
      this.push(null)
    }
  }
}

const readable = new MyReadable()
readable.on('data', (chunk) => {
  console.log(chunk.toString())
})
```

### 2. Writable Stream（可写流）

向目标写入数据。

```javascript
const { Writable } = require('stream')

// 创建自定义可写流
class MyWritable extends Writable {
  _write(chunk, encoding, callback) {
    console.log(`写入: ${chunk.toString()}`)
    callback()
  }
}

const writable = new MyWritable()
writable.write('Hello ')
writable.write('World!')
writable.end()
```

### 3. Duplex Stream（双工流）

既可读又可写。

```javascript
const { Duplex } = require('stream')

class MyDuplex extends Duplex {
  constructor(options) {
    super(options)
    this.index = 0
  }

  _read() {
    if (this.index < 3) {
      this.push(`读取 ${this.index}\n`)
      this.index++
    } else {
      this.push(null)
    }
  }

  _write(chunk, encoding, callback) {
    console.log(`写入: ${chunk.toString()}`)
    callback()
  }
}

const duplex = new MyDuplex()

// 读取
duplex.on('data', (chunk) => {
  console.log(chunk.toString())
})

// 写入
duplex.write('Hello')
duplex.end()
```

### 4. Transform Stream（转换流）

在读写过程中修改或转换数据。

```javascript
const { Transform } = require('stream')

// 创建转换为大写的流
class UpperCaseTransform extends Transform {
  _transform(chunk, encoding, callback) {
    this.push(chunk.toString().toUpperCase())
    callback()
  }
}

const upperCase = new UpperCaseTransform()

// 使用管道连接
process.stdin
  .pipe(upperCase)
  .pipe(process.stdout)

// 输入 "hello" → 输出 "HELLO"
```

## 流的两种模式

### 1. Flowing Mode（流动模式）

数据自动从底层系统读取，通过事件尽快提供给应用程序。

```javascript
const fs = require('fs')

const readable = fs.createReadStream('file.txt')

// 进入流动模式
readable.on('data', (chunk) => {
  console.log(`接收到 ${chunk.length} 字节`)
})
```

### 2. Paused Mode（暂停模式）

必须显式调用 `stream.read()` 来读取数据块。

```javascript
const fs = require('fs')

const readable = fs.createReadStream('file.txt')

// 暂停模式
readable.on('readable', () => {
  let chunk
  while ((chunk = readable.read()) !== null) {
    console.log(`读取 ${chunk.length} 字节`)
  }
})
```

### 模式切换

```javascript
const fs = require('fs')
const readable = fs.createReadStream('file.txt')

// 默认是暂停模式
console.log('暂停模式')

// 切换到流动模式
readable.on('data', (chunk) => {
  console.log('流动模式')
  
  // 切换回暂停模式
  readable.pause()
  
  setTimeout(() => {
    console.log('恢复流动模式')
    readable.resume()
  }, 1000)
})
```

## 管道（Pipe）

管道是连接流的最简单方式。

### 基本用法

```javascript
const fs = require('fs')

// source.pipe(destination)
fs.createReadStream('input.txt')
  .pipe(fs.createWriteStream('output.txt'))
```

### 链式管道

```javascript
const fs = require('fs')
const zlib = require('zlib')

// 读取 → 压缩 → 写入
fs.createReadStream('input.txt')
  .pipe(zlib.createGzip())
  .pipe(fs.createWriteStream('input.txt.gz'))
```

### 错误处理

```javascript
const fs = require('fs')
const { pipeline } = require('stream')

// ❌ 不好：pipe 不会传播错误
fs.createReadStream('input.txt')
  .pipe(fs.createWriteStream('output.txt'))

// ✅ 好：使用 pipeline
pipeline(
  fs.createReadStream('input.txt'),
  fs.createWriteStream('output.txt'),
  (err) => {
    if (err) {
      console.error('Pipeline 失败:', err)
    } else {
      console.log('Pipeline 成功')
    }
  }
)
```

### Promise 版本

```javascript
const { pipeline } = require('stream/promises')
const fs = require('fs')
const zlib = require('zlib')

async function compress() {
  try {
    await pipeline(
      fs.createReadStream('input.txt'),
      zlib.createGzip(),
      fs.createWriteStream('input.txt.gz')
    )
    console.log('压缩成功')
  } catch (err) {
    console.error('压缩失败:', err)
  }
}

compress()
```

## 背压（Backpressure）

当消费者处理数据的速度慢于生产者时，会发生背压。

```javascript
const fs = require('fs')

const readable = fs.createReadStream('large-file.txt')
const writable = fs.createWriteStream('output.txt')

readable.on('data', (chunk) => {
  // write() 返回 false 表示内部缓冲已满
  const canContinue = writable.write(chunk)
  
  if (!canContinue) {
    console.log('背压！暂停读取')
    readable.pause()
  }
})

// 当缓冲区排空时恢复读取
writable.on('drain', () => {
  console.log('缓冲区已排空，恢复读取')
  readable.resume()
})

// ✅ 使用 pipe 自动处理背压
readable.pipe(writable)
```

## 实战示例

### 1. 读取大文件并逐行处理

```javascript
const fs = require('fs')
const readline = require('readline')

async function processLineByLine() {
  const fileStream = fs.createReadStream('large-file.txt')
  
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  })

  let lineNumber = 0
  
  for await (const line of rl) {
    lineNumber++
    console.log(`Line ${lineNumber}: ${line}`)
  }
}

processLineByLine()
```

### 2. HTTP 响应流

```javascript
const http = require('http')
const fs = require('fs')

const server = http.createServer((req, res) => {
  // 流式传输文件
  const fileStream = fs.createReadStream('large-video.mp4')
  
  res.writeHead(200, {
    'Content-Type': 'video/mp4'
  })
  
  fileStream.pipe(res)
  
  fileStream.on('error', (err) => {
    res.statusCode = 500
    res.end('Internal Server Error')
  })
})

server.listen(3000)
```

### 3. 文件上传

```javascript
const http = require('http')
const fs = require('fs')

const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    const writeStream = fs.createWriteStream('uploaded-file.txt')
    
    // 将请求体流式写入文件
    req.pipe(writeStream)
    
    writeStream.on('finish', () => {
      res.end('上传成功')
    })
    
    writeStream.on('error', (err) => {
      res.statusCode = 500
      res.end('上传失败')
    })
  } else {
    res.end('请使用 POST 方法')
  }
})

server.listen(3000)
```

### 4. 数据转换管道

```javascript
const { Transform, pipeline } = require('stream')
const fs = require('fs')

// CSV 转 JSON
class CSVToJSON extends Transform {
  constructor(options) {
    super(options)
    this.headers = null
    this.isFirstLine = true
  }

  _transform(chunk, encoding, callback) {
    const lines = chunk.toString().split('\n')
    
    for (const line of lines) {
      if (!line.trim()) continue
      
      if (this.isFirstLine) {
        this.headers = line.split(',')
        this.isFirstLine = false
        continue
      }
      
      const values = line.split(',')
      const obj = {}
      
      this.headers.forEach((header, index) => {
        obj[header.trim()] = values[index]?.trim()
      })
      
      this.push(JSON.stringify(obj) + '\n')
    }
    
    callback()
  }
}

// 使用
pipeline(
  fs.createReadStream('data.csv'),
  new CSVToJSON(),
  fs.createWriteStream('data.json'),
  (err) => {
    if (err) {
      console.error('转换失败:', err)
    } else {
      console.log('转换成功')
    }
  }
)
```

### 5. 实时日志处理

```javascript
const { Transform } = require('stream')
const fs = require('fs')

class LogFilter extends Transform {
  constructor(level, options) {
    super(options)
    this.level = level
  }

  _transform(chunk, encoding, callback) {
    const line = chunk.toString()
    
    // 只输出指定级别的日志
    if (line.includes(this.level)) {
      this.push(line)
    }
    
    callback()
  }
}

// 过滤 ERROR 级别的日志
fs.createReadStream('app.log')
  .pipe(new LogFilter('ERROR'))
  .pipe(fs.createWriteStream('errors.log'))
```

### 6. 数据压缩和解压

```javascript
const fs = require('fs')
const zlib = require('zlib')
const { pipeline } = require('stream/promises')

// 压缩
async function compress(input, output) {
  await pipeline(
    fs.createReadStream(input),
    zlib.createGzip(),
    fs.createWriteStream(output)
  )
}

// 解压
async function decompress(input, output) {
  await pipeline(
    fs.createReadStream(input),
    zlib.createGunzip(),
    fs.createWriteStream(output)
  )
}

// 使用
compress('file.txt', 'file.txt.gz')
  .then(() => console.log('压缩完成'))
  .catch(console.error)
```

## 性能优化

### 1. 设置合适的 highWaterMark

```javascript
const fs = require('fs')

// 默认 highWaterMark 是 64KB
const stream1 = fs.createReadStream('file.txt')

// 增大缓冲区大小（用于大文件）
const stream2 = fs.createReadStream('large-file.txt', {
  highWaterMark: 1024 * 1024 // 1MB
})

// 减小缓冲区大小（用于内存受限环境）
const stream3 = fs.createReadStream('file.txt', {
  highWaterMark: 16 * 1024 // 16KB
})
```

### 2. 使用 pipeline 而不是 pipe

```javascript
const { pipeline } = require('stream/promises')
const fs = require('fs')
const zlib = require('zlib')

// ✅ 更好：自动处理错误和清理
async function processFile() {
  await pipeline(
    fs.createReadStream('input.txt'),
    zlib.createGzip(),
    fs.createWriteStream('output.txt.gz')
  )
}
```

### 3. 避免在流中使用同步操作

```javascript
const { Transform } = require('stream')

// ❌ 不好：阻塞事件循环
class BadTransform extends Transform {
  _transform(chunk, encoding, callback) {
    const data = expensiveSyncOperation(chunk)
    this.push(data)
    callback()
  }
}

// ✅ 好：使用异步操作
class GoodTransform extends Transform {
  _transform(chunk, encoding, callback) {
    expensiveAsyncOperation(chunk)
      .then(data => {
        this.push(data)
        callback()
      })
      .catch(callback)
  }
}
```

## 调试技巧

### 1. 监听流事件

```javascript
const fs = require('fs')

const stream = fs.createReadStream('file.txt')

stream.on('open', () => console.log('流打开'))
stream.on('data', (chunk) => console.log(`接收数据: ${chunk.length} 字节`))
stream.on('end', () => console.log('流结束'))
stream.on('close', () => console.log('流关闭'))
stream.on('error', (err) => console.error('流错误:', err))
```

### 2. 使用 finished 检测流完成

```javascript
const { finished } = require('stream')
const fs = require('fs')

const stream = fs.createReadStream('file.txt')

finished(stream, (err) => {
  if (err) {
    console.error('流失败:', err)
  } else {
    console.log('流成功完成')
  }
})
```

## 常见问题

### 1. 内存泄漏

```javascript
// ❌ 可能导致内存泄漏
const fs = require('fs')

function badPipe() {
  const readable = fs.createReadStream('large-file.txt')
  const writable = fs.createWriteStream('output.txt')
  
  readable.pipe(writable)
  // 没有处理错误，流可能永远不会关闭
}

// ✅ 正确处理
const { pipeline } = require('stream/promises')

async function goodPipe() {
  await pipeline(
    fs.createReadStream('large-file.txt'),
    fs.createWriteStream('output.txt')
  )
  // pipeline 自动清理资源
}
```

### 2. 流已关闭错误

```javascript
const fs = require('fs')

const stream = fs.createReadStream('file.txt')

stream.on('data', (chunk) => {
  console.log(chunk)
})

stream.on('end', () => {
  // ❌ 错误：流已经关闭
  stream.write('data')
})
```

## 总结

Stream 的核心要点：

1. **类型**
   - Readable：读取数据
   - Writable：写入数据
   - Duplex：双工
   - Transform：转换数据

2. **模式**
   - Flowing：自动流动
   - Paused：手动读取

3. **最佳实践**
   - 使用 pipeline 处理错误
   - 注意背压问题
   - 设置合适的 highWaterMark
   - 避免同步操作

4. **应用场景**
   - 文件操作
   - HTTP 请求/响应
   - 数据转换
   - 实时处理

## 相关阅读

- [Buffer 和二进制数据](/node/buffer)
- [文件系统操作](/node/core-modules)
- [性能优化](/node/performance)

