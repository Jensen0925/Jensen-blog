# Buffer 和二进制数据

## 什么是 Buffer

Buffer 是 Node.js 中处理二进制数据的类，它在全局作用域中，不需要引入。

```javascript
// Buffer 是全局对象
console.log(typeof Buffer) // 'function'

// 创建 Buffer
const buf = Buffer.from('Hello')
console.log(buf) // <Buffer 48 65 6c 6c 6f>
```

## 为什么需要 Buffer

JavaScript 最初设计用于处理 UTF-16 字符串，不擅长处理二进制数据。Node.js 引入 Buffer 来处理：

- TCP 流
- 文件系统操作
- 图片处理
- 加密操作
- 等其他二进制数据

```javascript
// 字符串 vs Buffer
const str = 'Hello'
const buf = Buffer.from(str)

console.log(str.length)        // 5（字符数）
console.log(buf.length)        // 5（字节数）

// 中文示例
const chinese = '你好'
const chineseBuf = Buffer.from(chinese)

console.log(chinese.length)        // 2（字符数）
console.log(chineseBuf.length)     // 6（UTF-8 编码字节数）
```

## 创建 Buffer

### 1. Buffer.from()

从现有数据创建 Buffer。

```javascript
// 从字符串创建
const buf1 = Buffer.from('Hello')
console.log(buf1) // <Buffer 48 65 6c 6c 6f>

// 指定编码
const buf2 = Buffer.from('Hello', 'utf8')
const buf3 = Buffer.from('48656c6c6f', 'hex')

// 从数组创建
const buf4 = Buffer.from([72, 101, 108, 108, 111])
console.log(buf4.toString()) // 'Hello'

// 从 ArrayBuffer 创建
const arr = new Uint8Array([72, 101, 108, 108, 111])
const buf5 = Buffer.from(arr.buffer)
```

### 2. Buffer.alloc()

创建指定大小的 Buffer，并用 0 填充。

```javascript
// 创建 10 字节的 Buffer
const buf = Buffer.alloc(10)
console.log(buf) // <Buffer 00 00 00 00 00 00 00 00 00 00>

// 创建并填充指定值
const buf2 = Buffer.alloc(5, 1)
console.log(buf2) // <Buffer 01 01 01 01 01>
```

### 3. Buffer.allocUnsafe()

创建未初始化的 Buffer（性能更好，但可能包含旧数据）。

```javascript
// ⚠️ 可能包含敏感的旧数据
const buf = Buffer.allocUnsafe(10)
console.log(buf) // <Buffer ... 可能是任意值 ...>

// 使用前应该填充
buf.fill(0)
console.log(buf) // <Buffer 00 00 00 00 00 00 00 00 00 00>
```

### 4. 不推荐的方式

```javascript
// ❌ 已弃用：不安全
const buf = new Buffer(10)

// ✅ 使用这些替代
const buf1 = Buffer.alloc(10)
const buf2 = Buffer.from('Hello')
```

## Buffer 编码

### 支持的编码类型

- `utf8`: 默认编码
- `utf16le` / `ucs2`: UTF-16
- `latin1` / `binary`: Latin-1
- `base64`: Base64 编码
- `hex`: 十六进制
- `ascii`: ASCII

```javascript
const str = 'Hello 你好'

// UTF-8（默认）
const buf1 = Buffer.from(str, 'utf8')
console.log(buf1.length) // 12 字节

// Base64
const buf2 = Buffer.from(str, 'utf8')
const base64 = buf2.toString('base64')
console.log(base64) // 'SGVsbG8g5L2g5aW9'

// Hex
const hex = buf2.toString('hex')
console.log(hex) // '48656c6c6f20e4bda0e5a5bd'

// 转回字符串
console.log(Buffer.from(base64, 'base64').toString()) // 'Hello 你好'
console.log(Buffer.from(hex, 'hex').toString())       // 'Hello 你好'
```

## 读取和写入 Buffer

### 读取

```javascript
const buf = Buffer.from([0x12, 0x34, 0x56, 0x78])

// 读取单个字节
console.log(buf[0])              // 18 (0x12)
console.log(buf.readUInt8(0))    // 18

// 读取 16 位整数
console.log(buf.readUInt16BE(0)) // 4660 (0x1234) Big-Endian
console.log(buf.readUInt16LE(0)) // 13330 (0x3412) Little-Endian

// 读取 32 位整数
console.log(buf.readUInt32BE(0)) // 305419896 (0x12345678)
console.log(buf.readUInt32LE(0)) // 2018915346 (0x78563412)
```

### 写入

```javascript
const buf = Buffer.alloc(4)

// 写入单个字节
buf[0] = 0x12
buf.writeUInt8(0x34, 1)

// 写入 16 位整数
buf.writeUInt16BE(0x5678, 2)

console.log(buf) // <Buffer 12 34 56 78>
```

### 字节序（Endianness）

```javascript
const buf = Buffer.allocUnsafe(4)

// Big-Endian (网络字节序)
// 高位字节存在低地址
buf.writeUInt32BE(0x12345678, 0)
console.log(buf) // <Buffer 12 34 56 78>

// Little-Endian (x86 架构)
// 低位字节存在低地址
buf.writeUInt32LE(0x12345678, 0)
console.log(buf) // <Buffer 78 56 34 12>
```

## Buffer 操作

### 1. 拼接

```javascript
// 方式 1: Buffer.concat()
const buf1 = Buffer.from('Hello ')
const buf2 = Buffer.from('World')
const result = Buffer.concat([buf1, buf2])
console.log(result.toString()) // 'Hello World'

// 方式 2: 手动复制（性能更好）
const buf3 = Buffer.alloc(buf1.length + buf2.length)
buf1.copy(buf3, 0)
buf2.copy(buf3, buf1.length)
console.log(buf3.toString()) // 'Hello World'
```

### 2. 切片

```javascript
const buf = Buffer.from('Hello World')

// slice() 返回新 Buffer，但共享内存
const slice = buf.slice(0, 5)
console.log(slice.toString()) // 'Hello'

// 修改 slice 会影响原 Buffer
slice[0] = 0x68 // 'h'
console.log(buf.toString()) // 'hello World'

// subarray() 同 slice()（推荐使用）
const sub = buf.subarray(6)
console.log(sub.toString()) // 'World'
```

### 3. 复制

```javascript
const buf1 = Buffer.from('Hello')
const buf2 = Buffer.alloc(5)

// 复制到另一个 Buffer
buf1.copy(buf2)
console.log(buf2.toString()) // 'Hello'

// 部分复制
const buf3 = Buffer.alloc(10, '.')
buf1.copy(buf3, 2, 0, 3) // target, targetStart, sourceStart, sourceEnd
console.log(buf3.toString()) // '..Hel.....'
```

### 4. 填充

```javascript
const buf = Buffer.alloc(10)

// 填充单个字节
buf.fill(0xFF)
console.log(buf) // <Buffer ff ff ff ff ff ff ff ff ff ff>

// 填充字符串
buf.fill('abc')
console.log(buf.toString()) // 'abcabcabca'

// 部分填充
buf.fill('x', 2, 8)
console.log(buf.toString()) // 'abxxxxxxca'
```

### 5. 比较

```javascript
const buf1 = Buffer.from('ABC')
const buf2 = Buffer.from('ABD')
const buf3 = Buffer.from('ABC')

// compare() 返回 -1, 0, 或 1
console.log(buf1.compare(buf2)) // -1
console.log(buf1.compare(buf3)) //  0
console.log(buf2.compare(buf1)) //  1

// equals() 判断是否相等
console.log(buf1.equals(buf3)) // true
console.log(buf1.equals(buf2)) // false
```

## 实战示例

### 1. 文件读写

```javascript
const fs = require('fs')

// 读取二进制文件
const imageBuffer = fs.readFileSync('image.png')
console.log(imageBuffer.length) // 文件大小（字节）

// 检查文件类型（PNG 文件头）
if (imageBuffer[0] === 0x89 && 
    imageBuffer[1] === 0x50 && 
    imageBuffer[2] === 0x4E && 
    imageBuffer[3] === 0x47) {
  console.log('这是一个 PNG 文件')
}

// 写入二进制文件
fs.writeFileSync('copy.png', imageBuffer)
```

### 2. Base64 图片编码

```javascript
const fs = require('fs')

// 读取图片
const imageBuffer = fs.readFileSync('image.png')

// 转换为 Base64
const base64Image = imageBuffer.toString('base64')
const dataUrl = `data:image/png;base64,${base64Image}`

console.log(dataUrl)

// Base64 解码
const decoded = Buffer.from(base64Image, 'base64')
fs.writeFileSync('decoded.png', decoded)
```

### 3. 加密和哈希

```javascript
const crypto = require('crypto')

const data = 'Hello World'

// MD5 哈希
const md5 = crypto.createHash('md5')
  .update(data)
  .digest()
console.log(md5) // Buffer
console.log(md5.toString('hex')) // 十六进制字符串

// SHA256 哈希
const sha256 = crypto.createHash('sha256')
  .update(data)
  .digest('hex')
console.log(sha256)

// AES 加密
const algorithm = 'aes-256-cbc'
const key = crypto.randomBytes(32)
const iv = crypto.randomBytes(16)

const cipher = crypto.createCipheriv(algorithm, key, iv)
let encrypted = cipher.update(data, 'utf8', 'hex')
encrypted += cipher.final('hex')
console.log('加密:', encrypted)

// AES 解密
const decipher = crypto.createDecipheriv(algorithm, key, iv)
let decrypted = decipher.update(encrypted, 'hex', 'utf8')
decrypted += decipher.final('utf8')
console.log('解密:', decrypted)
```

### 4. 网络数据包解析

```javascript
// 解析简单的网络协议
function parsePacket(buffer) {
  return {
    version: buffer.readUInt8(0),
    type: buffer.readUInt8(1),
    length: buffer.readUInt16BE(2),
    data: buffer.slice(4, 4 + buffer.readUInt16BE(2))
  }
}

// 构建数据包
function buildPacket(version, type, data) {
  const dataBuffer = Buffer.from(data)
  const packet = Buffer.alloc(4 + dataBuffer.length)
  
  packet.writeUInt8(version, 0)
  packet.writeUInt8(type, 1)
  packet.writeUInt16BE(dataBuffer.length, 2)
  dataBuffer.copy(packet, 4)
  
  return packet
}

// 使用
const packet = buildPacket(1, 2, 'Hello')
console.log(packet)

const parsed = parsePacket(packet)
console.log(parsed)
```

### 5. 二进制协议通信

```javascript
const net = require('net')

// 服务器
const server = net.createServer((socket) => {
  socket.on('data', (buffer) => {
    const command = buffer.readUInt8(0)
    
    switch (command) {
      case 0x01: // PING
        const pong = Buffer.from([0x02]) // PONG
        socket.write(pong)
        break
      case 0x03: // MESSAGE
        const length = buffer.readUInt16BE(1)
        const message = buffer.slice(3, 3 + length).toString()
        console.log('收到消息:', message)
        break
    }
  })
})

server.listen(8080)

// 客户端
const client = net.connect(8080, () => {
  // 发送 PING
  client.write(Buffer.from([0x01]))
  
  // 发送消息
  const message = 'Hello Server'
  const buf = Buffer.alloc(3 + message.length)
  buf.writeUInt8(0x03, 0)
  buf.writeUInt16BE(message.length, 1)
  buf.write(message, 3)
  client.write(buf)
})
```

## 性能优化

### 1. 预分配 Buffer

```javascript
// ❌ 不好：频繁创建小 Buffer
function badConcat(buffers) {
  let result = Buffer.alloc(0)
  for (const buf of buffers) {
    result = Buffer.concat([result, buf])
  }
  return result
}

// ✅ 好：预先计算总大小
function goodConcat(buffers) {
  const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0)
  const result = Buffer.allocUnsafe(totalLength)
  
  let offset = 0
  for (const buf of buffers) {
    buf.copy(result, offset)
    offset += buf.length
  }
  
  return result
}
```

### 2. 使用 allocUnsafe

```javascript
// 如果会立即写入数据，使用 allocUnsafe 更快
const buf = Buffer.allocUnsafe(1024)
buf.fill(0) // 需要时才清零

// 对比
console.time('alloc')
for (let i = 0; i < 10000; i++) {
  Buffer.alloc(1024)
}
console.timeEnd('alloc') // 约 3ms

console.time('allocUnsafe')
for (let i = 0; i < 10000; i++) {
  Buffer.allocUnsafe(1024)
}
console.timeEnd('allocUnsafe') // 约 1ms
```

### 3. 缓冲池

```javascript
class BufferPool {
  constructor(blockSize = 8192) {
    this.blockSize = blockSize
    this.buffer = Buffer.allocUnsafe(blockSize)
    this.offset = 0
  }

  alloc(size) {
    if (size > this.blockSize) {
      return Buffer.allocUnsafe(size)
    }

    if (this.offset + size > this.blockSize) {
      this.buffer = Buffer.allocUnsafe(this.blockSize)
      this.offset = 0
    }

    const buf = this.buffer.slice(this.offset, this.offset + size)
    this.offset += size
    return buf
  }
}

const pool = new BufferPool()
const buf1 = pool.alloc(100)
const buf2 = pool.alloc(200)
```

## Buffer 与 TypedArray

Buffer 是 Uint8Array 的子类。

```javascript
const buf = Buffer.from([1, 2, 3, 4])

// Buffer 是 Uint8Array 的实例
console.log(buf instanceof Uint8Array) // true

// 可以使用 TypedArray 的方法
console.log(buf.filter(x => x > 2)) // [3, 4]
console.log(buf.map(x => x * 2))    // [2, 4, 6, 8]

// 创建其他类型的视图
const view = new DataView(buf.buffer)
console.log(view.getUint16(0, true)) // 513 (Little-Endian)

// 创建不同类型的数组
const uint16 = new Uint16Array(buf.buffer)
console.log(uint16) // [513, 1027]
```

## 内存管理

### Buffer 的内存分配

```javascript
// 小于 4KB 的 Buffer 使用共享内存池
const small = Buffer.alloc(1024)

// 大于等于 4KB 的 Buffer 直接分配
const large = Buffer.alloc(8192)

// 查看内存使用
console.log(process.memoryUsage())
```

### 内存泄漏预防

```javascript
// ❌ 可能导致内存泄漏
const leaks = []
setInterval(() => {
  leaks.push(Buffer.alloc(1024 * 1024)) // 每次分配 1MB
}, 100)

// ✅ 限制缓存大小
const cache = []
const MAX_SIZE = 10

function addToCache(buf) {
  cache.push(buf)
  if (cache.length > MAX_SIZE) {
    cache.shift() // 移除最旧的
  }
}
```

## 常见问题

### 1. Buffer 与字符串编码问题

```javascript
// 中文字符在 UTF-8 中占 3 个字节
const str = '你好世界'
const buf = Buffer.from(str)

console.log(buf.length) // 12 (4 * 3)

// ⚠️ 截取可能导致乱码
console.log(buf.slice(0, 4).toString()) // '你�' (乱码)

// ✅ 正确的截取方式
const StringDecoder = require('string_decoder').StringDecoder
const decoder = new StringDecoder('utf8')
console.log(decoder.write(buf.slice(0, 4))) // '你'（自动处理不完整字符）
```

### 2. Buffer 大小限制

```javascript
// Buffer 最大大小受限于系统
// 32 位系统：约 1GB
// 64 位系统：约 2GB

try {
  const huge = Buffer.alloc(2 ** 31) // 2GB
} catch (err) {
  console.error('Buffer 太大:', err.message)
}
```

## 总结

Buffer 的核心要点：

1. **创建方式**
   - `Buffer.from()`: 从现有数据创建
   - `Buffer.alloc()`: 安全创建
   - `Buffer.allocUnsafe()`: 快速创建

2. **编码支持**
   - UTF-8, Base64, Hex, ASCII 等

3. **性能优化**
   - 预分配 Buffer
   - 使用 allocUnsafe
   - 缓冲池

4. **应用场景**
   - 文件操作
   - 网络通信
   - 加密解密
   - 图片处理

## 相关阅读

- [Stream 流](/node/stream)
- [文件系统](/node/core-modules)
- [网络编程](/node/core-modules)

