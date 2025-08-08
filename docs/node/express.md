# Express.js 框架

Express.js 是 Node.js 最流行的 Web 应用框架，提供了简洁而灵活的 Web 应用开发功能。

## 什么是 Express？

Express 是一个基于 Node.js 平台的极简、灵活的 Web 应用开发框架，它提供了一系列强大的特性来帮助你创建各种 Web 和移动设备应用。

### 主要特性

- **路由系统**：强大的路由功能
- **中间件**：可扩展的中间件系统
- **模板引擎**：支持多种模板引擎
- **静态文件服务**：内置静态文件服务
- **错误处理**：完善的错误处理机制

## 安装和基本设置

### 安装 Express

```bash
# 创建项目目录
mkdir my-express-app
cd my-express-app

# 初始化 package.json
npm init -y

# 安装 Express
npm install express

# 安装开发依赖
npm install --save-dev nodemon
```

### 第一个 Express 应用

```javascript
// app.js
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// 基本路由
app.get('/', (req, res) => {
  res.send('Hello, Express!');
});

app.get('/about', (req, res) => {
  res.send('关于我们页面');
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
```

### 运行应用

```bash
# 直接运行
node app.js

# 或使用 nodemon（自动重启）
npx nodemon app.js

# 或在 package.json 中添加脚本
# "scripts": {
#   "start": "node app.js",
#   "dev": "nodemon app.js"
# }
npm run dev
```

## 路由系统

### 基本路由

```javascript
const express = require('express');
const app = express();

// GET 请求
app.get('/', (req, res) => {
  res.send('GET 请求到首页');
});

// POST 请求
app.post('/users', (req, res) => {
  res.send('POST 请求到 /users');
});

// PUT 请求
app.put('/users/:id', (req, res) => {
  res.send(`PUT 请求到 /users/${req.params.id}`);
});

// DELETE 请求
app.delete('/users/:id', (req, res) => {
  res.send(`DELETE 请求到 /users/${req.params.id}`);
});

// 处理所有 HTTP 方法
app.all('/secret', (req, res) => {
  res.send('访问秘密页面');
});

app.listen(3000);
```

### 路由参数

```javascript
// 路径参数
app.get('/users/:id', (req, res) => {
  const userId = req.params.id;
  res.send(`用户 ID: ${userId}`);
});

// 多个参数
app.get('/users/:userId/posts/:postId', (req, res) => {
  const { userId, postId } = req.params;
  res.json({
    userId,
    postId,
    message: `用户 ${userId} 的帖子 ${postId}`
  });
});

// 可选参数
app.get('/posts/:year/:month?', (req, res) => {
  const { year, month } = req.params;
  res.json({
    year,
    month: month || '所有月份'
  });
});

// 通配符
app.get('/files/*', (req, res) => {
  const filePath = req.params[0];
  res.send(`文件路径: ${filePath}`);
});

// 正则表达式
app.get(/.*fly$/, (req, res) => {
  res.send('以 "fly" 结尾的路径');
});
```

### 查询参数

```javascript
// 查询参数示例: /search?q=nodejs&category=tutorial&page=1
app.get('/search', (req, res) => {
  const {
    q: query,
    category = 'all',
    page = 1,
    limit = 10
  } = req.query;
  
  res.json({
    query,
    category,
    page: parseInt(page),
    limit: parseInt(limit),
    results: `搜索 "${query}" 在 "${category}" 分类中的结果`
  });
});
```

### 路由模块化

```javascript
// routes/users.js
const express = require('express');
const router = express.Router();

// 中间件：仅对此路由器生效
router.use((req, res, next) => {
  console.log('用户路由中间件:', new Date().toISOString());
  next();
});

// 定义路由
router.get('/', (req, res) => {
  res.json({
    message: '用户列表',
    users: [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ]
  });
});

router.get('/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  res.json({
    id: userId,
    name: `用户 ${userId}`,
    email: `user${userId}@example.com`
  });
});

router.post('/', (req, res) => {
  const { name, email } = req.body;
  res.status(201).json({
    id: Date.now(),
    name,
    email,
    message: '用户创建成功'
  });
});

module.exports = router;
```

```javascript
// app.js
const express = require('express');
const usersRouter = require('./routes/users');

const app = express();

// 使用路由模块
app.use('/api/users', usersRouter);

app.listen(3000);
```

## 中间件

中间件是 Express 的核心概念，它是在请求-响应循环中执行的函数。

### 应用级中间件

```javascript
const express = require('express');
const app = express();

// 全局中间件
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
  next(); // 调用下一个中间件
});

// 解析 JSON 请求体
app.use(express.json());

// 解析 URL 编码的请求体
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static('public'));

// 自定义中间件
app.use('/api', (req, res, next) => {
  // 为 API 路由添加 CORS 头
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// 路由
app.get('/', (req, res) => {
  res.send('Hello World');
});

app.listen(3000);
```

### 路由级中间件

```javascript
const express = require('express');
const router = express.Router();

// 认证中间件
function authenticate(req, res, next) {
  const token = req.headers.authorization;
  
  if (!token) {
    return res.status(401).json({ error: '缺少认证令牌' });
  }
  
  // 模拟令牌验证
  if (token !== 'Bearer valid-token') {
    return res.status(403).json({ error: '无效的令牌' });
  }
  
  req.user = { id: 1, name: 'John Doe' };
  next();
}

// 日志中间件
function logger(req, res, next) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
}

// 应用中间件到特定路由
router.use('/protected', authenticate);
router.use(logger);

router.get('/public', (req, res) => {
  res.json({ message: '公开接口' });
});

router.get('/protected/profile', (req, res) => {
  res.json({
    message: '受保护的接口',
    user: req.user
  });
});

module.exports = router;
```

### 错误处理中间件

```javascript
// 错误处理中间件必须有4个参数
function errorHandler(err, req, res, next) {
  console.error('错误详情:', err);
  
  // 设置默认错误信息
  let status = err.status || 500;
  let message = err.message || '服务器内部错误';
  
  // 根据错误类型设置响应
  if (err.name === 'ValidationError') {
    status = 400;
    message = '请求数据验证失败';
  } else if (err.name === 'UnauthorizedError') {
    status = 401;
    message = '未授权访问';
  }
  
  res.status(status).json({
    error: {
      message,
      status,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
}

// 404 处理中间件
function notFoundHandler(req, res, next) {
  const error = new Error(`路径 ${req.originalUrl} 未找到`);
  error.status = 404;
  next(error);
}

// 使用错误处理中间件
app.use(notFoundHandler);
app.use(errorHandler);
```

### 第三方中间件

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const app = express();

// 安全头部
app.use(helmet());

// CORS 跨域
app.use(cors({
  origin: ['http://localhost:3000', 'https://myapp.com'],
  credentials: true
}));

// 请求日志
app.use(morgan('combined'));

// Gzip 压缩
app.use(compression());

// 请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.listen(3000);
```

## 请求和响应对象

### 请求对象 (req)

```javascript
app.get('/request-info', (req, res) => {
  const requestInfo = {
    // 基本信息
    method: req.method,
    url: req.url,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    path: req.path,
    
    // 参数
    params: req.params,
    query: req.query,
    body: req.body,
    
    // 头部信息
    headers: req.headers,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    
    // 网络信息
    ip: req.ip,
    ips: req.ips,
    hostname: req.hostname,
    protocol: req.protocol,
    secure: req.secure,
    
    // 其他
    cookies: req.cookies,
    signedCookies: req.signedCookies,
    fresh: req.fresh,
    stale: req.stale,
    xhr: req.xhr
  };
  
  res.json(requestInfo);
});
```

### 响应对象 (res)

```javascript
app.get('/response-examples', (req, res) => {
  // 设置状态码
  res.status(200);
  
  // 设置头部
  res.set('X-Custom-Header', 'MyValue');
  res.set({
    'X-Another-Header': 'AnotherValue',
    'Content-Type': 'application/json'
  });
  
  // 发送响应
  res.json({ message: '成功' });
});

// 不同类型的响应
app.get('/responses/:type', (req, res) => {
  const { type } = req.params;
  
  switch (type) {
    case 'text':
      res.send('纯文本响应');
      break;
      
    case 'json':
      res.json({ message: 'JSON 响应', timestamp: Date.now() });
      break;
      
    case 'html':
      res.send('<h1>HTML 响应</h1><p>这是一个 HTML 页面</p>');
      break;
      
    case 'file':
      res.sendFile(__dirname + '/public/sample.pdf');
      break;
      
    case 'download':
      res.download('./public/sample.pdf', 'downloaded-file.pdf');
      break;
      
    case 'redirect':
      res.redirect('/');
      break;
      
    case 'cookie':
      res.cookie('username', 'john', {
        maxAge: 900000,
        httpOnly: true,
        secure: false
      });
      res.send('Cookie 已设置');
      break;
      
    case 'clear-cookie':
      res.clearCookie('username');
      res.send('Cookie 已清除');
      break;
      
    default:
      res.status(400).json({ error: '未知的响应类型' });
  }
});
```

## 模板引擎

### 使用 EJS

```bash
npm install ejs
```

```javascript
// app.js
const express = require('express');
const app = express();

// 设置模板引擎
app.set('view engine', 'ejs');
app.set('views', './views');

// 路由
app.get('/', (req, res) => {
  const data = {
    title: '我的网站',
    message: '欢迎来到我的网站！',
    users: [
      { name: 'Alice', age: 25 },
      { name: 'Bob', age: 30 },
      { name: 'Charlie', age: 35 }
    ]
  };
  
  res.render('index', data);
});

app.listen(3000);
```

```html
<!-- views/index.ejs -->
<!DOCTYPE html>
<html>
<head>
  <title><%= title %></title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .user { padding: 10px; border: 1px solid #ddd; margin: 5px 0; }
  </style>
</head>
<body>
  <h1><%= title %></h1>
  <p><%= message %></p>
  
  <h2>用户列表</h2>
  <% users.forEach(user => { %>
    <div class="user">
      <strong><%= user.name %></strong> - <%= user.age %> 岁
    </div>
  <% }); %>
  
  <% if (users.length === 0) { %>
    <p>暂无用户</p>
  <% } %>
</body>
</html>
```

### 使用 Handlebars

```bash
npm install express-handlebars
```

```javascript
const express = require('express');
const { engine } = require('express-handlebars');

const app = express();

// 设置 Handlebars
app.engine('handlebars', engine({
  defaultLayout: 'main',
  layoutsDir: './views/layouts',
  partialsDir: './views/partials'
}));
app.set('view engine', 'handlebars');
app.set('views', './views');

app.get('/', (req, res) => {
  res.render('home', {
    title: '首页',
    products: [
      { name: '产品1', price: 100 },
      { name: '产品2', price: 200 }
    ]
  });
});

app.listen(3000);
```

## 实际应用示例

### RESTful API 服务器

```javascript
// models/User.js (模拟数据模型)
class User {
  constructor() {
    this.users = [
      { id: 1, name: 'Alice', email: 'alice@example.com', age: 25 },
      { id: 2, name: 'Bob', email: 'bob@example.com', age: 30 }
    ];
    this.nextId = 3;
  }
  
  getAll() {
    return this.users;
  }
  
  getById(id) {
    return this.users.find(user => user.id === parseInt(id));
  }
  
  create(userData) {
    const user = {
      id: this.nextId++,
      ...userData,
      createdAt: new Date().toISOString()
    };
    this.users.push(user);
    return user;
  }
  
  update(id, userData) {
    const index = this.users.findIndex(user => user.id === parseInt(id));
    if (index === -1) return null;
    
    this.users[index] = {
      ...this.users[index],
      ...userData,
      updatedAt: new Date().toISOString()
    };
    return this.users[index];
  }
  
  delete(id) {
    const index = this.users.findIndex(user => user.id === parseInt(id));
    if (index === -1) return false;
    
    this.users.splice(index, 1);
    return true;
  }
}

module.exports = new User();
```

```javascript
// routes/api.js
const express = require('express');
const User = require('../models/User');

const router = express.Router();

// 输入验证中间件
function validateUser(req, res, next) {
  const { name, email, age } = req.body;
  const errors = [];
  
  if (!name || name.trim().length < 2) {
    errors.push('姓名至少需要2个字符');
  }
  
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('请提供有效的邮箱地址');
  }
  
  if (!age || age < 1 || age > 120) {
    errors.push('年龄必须在1-120之间');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  
  next();
}

// GET /api/users - 获取所有用户
router.get('/users', (req, res) => {
  const { page = 1, limit = 10, search } = req.query;
  let users = User.getAll();
  
  // 搜索功能
  if (search) {
    users = users.filter(user => 
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  // 分页
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedUsers = users.slice(startIndex, endIndex);
  
  res.json({
    users: paginatedUsers,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(users.length / limit),
      totalUsers: users.length,
      hasNext: endIndex < users.length,
      hasPrev: startIndex > 0
    }
  });
});

// GET /api/users/:id - 获取单个用户
router.get('/users/:id', (req, res) => {
  const user = User.getById(req.params.id);
  
  if (!user) {
    return res.status(404).json({ error: '用户未找到' });
  }
  
  res.json(user);
});

// POST /api/users - 创建用户
router.post('/users', validateUser, (req, res) => {
  try {
    const user = User.create(req.body);
    res.status(201).json({
      message: '用户创建成功',
      user
    });
  } catch (error) {
    res.status(500).json({ error: '创建用户失败' });
  }
});

// PUT /api/users/:id - 更新用户
router.put('/users/:id', validateUser, (req, res) => {
  const user = User.update(req.params.id, req.body);
  
  if (!user) {
    return res.status(404).json({ error: '用户未找到' });
  }
  
  res.json({
    message: '用户更新成功',
    user
  });
});

// DELETE /api/users/:id - 删除用户
router.delete('/users/:id', (req, res) => {
  const deleted = User.delete(req.params.id);
  
  if (!deleted) {
    return res.status(404).json({ error: '用户未找到' });
  }
  
  res.json({ message: '用户删除成功' });
});

module.exports = router;
```

```javascript
// app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由
app.use('/api', apiRoutes);

// 根路径
app.get('/', (req, res) => {
  res.json({
    message: '欢迎使用用户管理 API',
    version: '1.0.0',
    endpoints: {
      users: {
        'GET /api/users': '获取用户列表',
        'GET /api/users/:id': '获取单个用户',
        'POST /api/users': '创建用户',
        'PUT /api/users/:id': '更新用户',
        'DELETE /api/users/:id': '删除用户'
      }
    }
  });
});

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: '接口未找到',
    path: req.originalUrl
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : '请稍后重试'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`API 文档: http://localhost:${PORT}`);
});

module.exports = app;
```

## 文件上传

```bash
npm install multer
```

```javascript
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// 确保上传目录存在
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 只允许图片文件
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// 单文件上传
app.post('/upload/single', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '请选择要上传的文件' });
  }
  
  res.json({
    message: '文件上传成功',
    file: {
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path
    }
  });
});

// 多文件上传
app.post('/upload/multiple', upload.array('images', 5), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: '请选择要上传的文件' });
  }
  
  const files = req.files.map(file => ({
    originalName: file.originalname,
    filename: file.filename,
    size: file.size,
    mimetype: file.mimetype,
    path: file.path
  }));
  
  res.json({
    message: `成功上传 ${files.length} 个文件`,
    files
  });
});

// 错误处理
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件大小超过限制' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: '文件数量超过限制' });
    }
  }
  
  res.status(500).json({ error: error.message });
});

app.listen(3000);
```

## 会话管理

```bash
npm install express-session connect-mongo
```

```javascript
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();

// 会话配置
app.use(session({
  secret: 'your-secret-key', // 在生产环境中使用环境变量
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: 'mongodb://localhost:27017/myapp'
  }),
  cookie: {
    secure: false, // 在生产环境中设置为 true（需要 HTTPS）
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 24小时
  }
}));

app.use(express.json());

// 登录
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // 模拟用户验证
  if (username === 'admin' && password === 'password') {
    req.session.user = {
      id: 1,
      username: 'admin',
      role: 'administrator'
    };
    
    res.json({
      message: '登录成功',
      user: req.session.user
    });
  } else {
    res.status(401).json({ error: '用户名或密码错误' });
  }
});

// 登出
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: '登出失败' });
    }
    
    res.clearCookie('connect.sid');
    res.json({ message: '登出成功' });
  });
});

// 受保护的路由
app.get('/profile', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: '请先登录' });
  }
  
  res.json({
    message: '用户资料',
    user: req.session.user
  });
});

app.listen(3000);
```

## 性能优化

### 缓存

```javascript
const express = require('express');
const redis = require('redis');

const app = express();
const client = redis.createClient();

// 缓存中间件
function cache(duration) {
  return async (req, res, next) => {
    const key = req.originalUrl;
    
    try {
      const cached = await client.get(key);
      
      if (cached) {
        console.log('缓存命中:', key);
        return res.json(JSON.parse(cached));
      }
      
      // 重写 res.json 以缓存响应
      const originalJson = res.json;
      res.json = function(data) {
        client.setex(key, duration, JSON.stringify(data));
        originalJson.call(this, data);
      };
      
      next();
    } catch (err) {
      console.error('缓存错误:', err);
      next();
    }
  };
}

// 使用缓存
app.get('/api/data', cache(300), (req, res) => {
  // 模拟耗时操作
  setTimeout(() => {
    res.json({
      data: '这是一些数据',
      timestamp: new Date().toISOString()
    });
  }, 1000);
});

app.listen(3000);
```

### 压缩和优化

```javascript
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');

const app = express();

// 启用 Gzip 压缩
app.use(compression());

// 安全头部
app.use(helmet());

// 设置缓存头部
app.use('/static', express.static('public', {
  maxAge: '1d', // 缓存1天
  etag: true
}));

// API 响应缓存
app.get('/api/static-data', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600'); // 缓存1小时
  res.json({ data: '静态数据' });
});

app.listen(3000);
```

## 测试

```bash
npm install --save-dev jest supertest
```

```javascript
// tests/app.test.js
const request = require('supertest');
const app = require('../app');

describe('用户 API', () => {
  test('GET /api/users 应该返回用户列表', async () => {
    const response = await request(app)
      .get('/api/users')
      .expect(200);
    
    expect(response.body).toHaveProperty('users');
    expect(Array.isArray(response.body.users)).toBe(true);
  });
  
  test('POST /api/users 应该创建新用户', async () => {
    const newUser = {
      name: 'Test User',
      email: 'test@example.com',
      age: 25
    };
    
    const response = await request(app)
      .post('/api/users')
      .send(newUser)
      .expect(201);
    
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.name).toBe(newUser.name);
  });
  
  test('GET /api/users/:id 应该返回特定用户', async () => {
    const response = await request(app)
      .get('/api/users/1')
      .expect(200);
    
    expect(response.body).toHaveProperty('id', 1);
  });
  
  test('GET /api/users/999 应该返回404', async () => {
    await request(app)
      .get('/api/users/999')
      .expect(404);
  });
});
```

## 部署准备

```javascript
// 生产环境配置
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();

// 安全中间件
app.use(helmet());

// 压缩
app.use(compression());

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 100个请求
  message: '请求过于频繁，请稍后再试'
});
app.use('/api', limiter);

// 信任代理（如果使用负载均衡器）
app.set('trust proxy', 1);

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，开始优雅关闭...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

const server = app.listen(process.env.PORT || 3000);
```

## 最佳实践

1. **结构化项目**：合理组织代码结构
2. **错误处理**：实现完善的错误处理机制
3. **安全性**：使用 helmet、CORS 等安全中间件
4. **性能优化**：使用压缩、缓存等优化技术
5. **日志记录**：使用 morgan 或其他日志中间件
6. **环境配置**：使用环境变量管理配置
7. **测试**：编写单元测试和集成测试
8. **文档**：为 API 编写清晰的文档

