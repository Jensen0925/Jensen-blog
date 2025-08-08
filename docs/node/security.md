# Node.js 安全最佳实践

安全是 Node.js 应用开发中的重要考虑因素。本章将介绍常见的安全威胁和防护措施。

## 常见安全威胁

### 1. 注入攻击

#### SQL 注入防护

```javascript
// 错误示例 - 容易受到 SQL 注入攻击
const getUserById = (id) => {
  const query = `SELECT * FROM users WHERE id = ${id}`; // 危险！
  return db.query(query);
};

// 正确示例 - 使用参数化查询
const getUserById = (id) => {
  const query = 'SELECT * FROM users WHERE id = ?';
  return db.query(query, [id]);
};

// 使用 ORM 的安全查询
const User = require('./models/User');

const getUserById = async (id) => {
  // Sequelize 自动处理参数化查询
  return await User.findByPk(id);
};

// 输入验证
const { body, validationResult } = require('express-validator');

const validateUserId = [
  body('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

app.post('/users/:id', validateUserId, async (req, res) => {
  try {
    const user = await getUserById(req.params.id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

#### NoSQL 注入防护

```javascript
// 错误示例 - MongoDB 注入
const getUser = (username, password) => {
  // 如果 username = { $ne: null }，将匹配所有用户
  return db.collection('users').findOne({
    username: username,
    password: password
  });
};

// 正确示例 - 输入验证和清理
const mongoSanitize = require('express-mongo-sanitize');
const validator = require('validator');

// 中间件清理
app.use(mongoSanitize());

// 手动验证
const getUser = (username, password) => {
  // 确保输入是字符串
  if (typeof username !== 'string' || typeof password !== 'string') {
    throw new Error('Invalid input type');
  }
  
  // 验证格式
  if (!validator.isAlphanumeric(username) || username.length > 50) {
    throw new Error('Invalid username format');
  }
  
  return db.collection('users').findOne({
    username: username,
    password: password
  });
};

// 使用 Mongoose 的内置验证
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    match: /^[a-zA-Z0-9]+$/,
    maxlength: 50
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  }
});
```

### 2. 跨站脚本攻击 (XSS)

```javascript
// XSS 防护中间件
const xss = require('xss-clean');
const helmet = require('helmet');

// 清理用户输入
app.use(xss());

// 设置安全头
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // 生产环境应避免 unsafe-inline
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  }
}));

// 输出编码
const escapeHtml = require('escape-html');

const renderUserProfile = (user) => {
  return `
    <div class="profile">
      <h1>${escapeHtml(user.name)}</h1>
      <p>${escapeHtml(user.bio)}</p>
    </div>
  `;
};

// 使用模板引擎的自动转义
// EJS 示例
app.set('view engine', 'ejs');

// 在模板中，EJS 默认转义 <%= %>
// <h1><%= user.name %></h1> // 自动转义
// <h1><%- user.name %></h1> // 不转义（危险）

// 输入验证和清理
const { body } = require('express-validator');

const validateUserInput = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .escape(), // HTML 转义
  
  body('bio')
    .trim()
    .isLength({ max: 500 })
    .escape()
];

app.post('/profile', validateUserInput, (req, res) => {
  // 输入已经被验证和清理
  const { name, bio } = req.body;
  // 保存到数据库...
});
```

### 3. 跨站请求伪造 (CSRF)

```javascript
// CSRF 防护
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

// 设置 cookie 解析器
app.use(cookieParser());

// CSRF 中间件
const csrfProtection = csrf({ cookie: true });

// 应用到需要保护的路由
app.use('/api', csrfProtection);

// 提供 CSRF token
app.get('/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// 在表单中包含 CSRF token
app.get('/form', csrfProtection, (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() });
});

// 验证 CSRF token
app.post('/api/data', csrfProtection, (req, res) => {
  // CSRF token 自动验证
  res.json({ message: 'Data processed successfully' });
});

// 自定义 CSRF 验证
const crypto = require('crypto');

class CSRFProtection {
  constructor() {
    this.secret = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');
  }
  
  generateToken(sessionId) {
    const timestamp = Date.now();
    const data = `${sessionId}:${timestamp}`;
    const hash = crypto.createHmac('sha256', this.secret).update(data).digest('hex');
    return `${timestamp}:${hash}`;
  }
  
  validateToken(token, sessionId) {
    if (!token || !sessionId) return false;
    
    const [timestamp, hash] = token.split(':');
    if (!timestamp || !hash) return false;
    
    // 检查时间戳（token 有效期 1 小时）
    const tokenAge = Date.now() - parseInt(timestamp);
    if (tokenAge > 3600000) return false;
    
    // 验证哈希
    const data = `${sessionId}:${timestamp}`;
    const expectedHash = crypto.createHmac('sha256', this.secret).update(data).digest('hex');
    
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
  }
  
  middleware() {
    return (req, res, next) => {
      if (req.method === 'GET') {
        // 为 GET 请求生成 token
        req.csrfToken = () => this.generateToken(req.sessionID);
        return next();
      }
      
      // 验证 POST/PUT/DELETE 请求的 token
      const token = req.headers['x-csrf-token'] || req.body._csrf;
      
      if (!this.validateToken(token, req.sessionID)) {
        return res.status(403).json({ error: 'Invalid CSRF token' });
      }
      
      next();
    };
  }
}

const csrfProtection = new CSRFProtection();
app.use(csrfProtection.middleware());
```

## 身份验证和授权

### JWT 安全实现

```javascript
// JWT 安全配置
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    this.saltRounds = 12;
    
    if (!this.jwtSecret || !this.jwtRefreshSecret) {
      throw new Error('JWT secrets must be configured');
    }
  }
  
  // 安全的密码哈希
  async hashPassword(password) {
    return await bcrypt.hash(password, this.saltRounds);
  }
  
  // 验证密码
  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }
  
  // 生成访问令牌
  generateAccessToken(payload) {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: '15m', // 短期有效
      issuer: 'myapp',
      audience: 'myapp-users'
    });
  }
  
  // 生成刷新令牌
  generateRefreshToken(payload) {
    return jwt.sign(payload, this.jwtRefreshSecret, {
      expiresIn: '7d', // 长期有效
      issuer: 'myapp',
      audience: 'myapp-users'
    });
  }
  
  // 验证访问令牌
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'myapp',
        audience: 'myapp-users'
      });
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }
  
  // 验证刷新令牌
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, this.jwtRefreshSecret, {
        issuer: 'myapp',
        audience: 'myapp-users'
      });
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }
  
  // 生成安全的随机令牌
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }
}

// 认证中间件
const authService = new AuthService();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  try {
    const decoded = authService.verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// 角色授权中间件
const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

// 使用示例
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 查找用户
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // 验证密码
    const isValid = await authService.verifyPassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // 生成令牌
    const payload = { userId: user.id, username: user.username, role: user.role };
    const accessToken = authService.generateAccessToken(payload);
    const refreshToken = authService.generateRefreshToken(payload);
    
    // 保存刷新令牌到数据库
    await user.update({ refreshToken });
    
    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 刷新令牌
app.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }
    
    // 验证刷新令牌
    const decoded = authService.verifyRefreshToken(refreshToken);
    
    // 检查令牌是否在数据库中
    const user = await User.findOne({ 
      id: decoded.userId, 
      refreshToken 
    });
    
    if (!user) {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }
    
    // 生成新的访问令牌
    const payload = { userId: user.id, username: user.username, role: user.role };
    const newAccessToken = authService.generateAccessToken(payload);
    
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(403).json({ error: 'Invalid refresh token' });
  }
});

// 受保护的路由
app.get('/profile', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// 管理员专用路由
app.get('/admin/users', authenticateToken, authorize(['admin']), (req, res) => {
  // 只有管理员可以访问
  res.json({ users: [] });
});
```

### 会话安全

```javascript
// 安全的会话配置
const session = require('express-session');
const MongoStore = require('connect-mongo');
const crypto = require('crypto');

// 会话配置
const sessionConfig = {
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  name: 'sessionId', // 不使用默认的 connect.sid
  resave: false,
  saveUninitialized: false,
  
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // 防止 XSS
    maxAge: 1000 * 60 * 60 * 24, // 24 小时
    sameSite: 'strict' // CSRF 防护
  },
  
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600, // 24 小时内不更新
    crypto: {
      secret: process.env.SESSION_ENCRYPTION_KEY
    }
  })
};

app.use(session(sessionConfig));

// 会话安全中间件
const sessionSecurity = (req, res, next) => {
  // 检查会话劫持
  if (req.session.userAgent && req.session.userAgent !== req.get('User-Agent')) {
    req.session.destroy();
    return res.status(401).json({ error: 'Session security violation' });
  }
  
  // 记录用户代理
  if (req.session.userId && !req.session.userAgent) {
    req.session.userAgent = req.get('User-Agent');
  }
  
  // 会话固定攻击防护
  if (req.session.userId && !req.session.regenerated) {
    req.session.regenerate((err) => {
      if (err) {
        return next(err);
      }
      req.session.regenerated = true;
      next();
    });
  } else {
    next();
  }
};

app.use(sessionSecurity);

// 登录时重新生成会话 ID
app.post('/login', (req, res) => {
  // 验证用户凭据...
  
  req.session.regenerate((err) => {
    if (err) {
      return res.status(500).json({ error: 'Session error' });
    }
    
    req.session.userId = user.id;
    req.session.userAgent = req.get('User-Agent');
    
    res.json({ message: 'Login successful' });
  });
});

// 登出时销毁会话
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout error' });
    }
    
    res.clearCookie('sessionId');
    res.json({ message: 'Logout successful' });
  });
});
```

## 数据保护

### 敏感数据加密

```javascript
// 数据加密服务
const crypto = require('crypto');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
    this.key = this.deriveKey(process.env.ENCRYPTION_KEY);
  }
  
  // 从密码派生密钥
  deriveKey(password) {
    if (!password) {
      throw new Error('Encryption key is required');
    }
    
    const salt = Buffer.from(process.env.ENCRYPTION_SALT || 'default-salt', 'hex');
    return crypto.pbkdf2Sync(password, salt, 100000, this.keyLength, 'sha256');
  }
  
  // 加密数据
  encrypt(text) {
    if (!text) return null;
    
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipher(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // 返回 iv:tag:encrypted 格式
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  }
  
  // 解密数据
  decrypt(encryptedData) {
    if (!encryptedData) return null;
    
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const [ivHex, tagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    
    const decipher = crypto.createDecipher(this.algorithm, this.key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  // 哈希敏感数据（不可逆）
  hash(data, salt = null) {
    if (!salt) {
      salt = crypto.randomBytes(16).toString('hex');
    }
    
    const hash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha256').toString('hex');
    return `${salt}:${hash}`;
  }
  
  // 验证哈希
  verifyHash(data, hashedData) {
    const [salt, hash] = hashedData.split(':');
    const newHash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha256').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(newHash));
  }
}

const encryptionService = new EncryptionService();

// 数据库模型中的加密字段
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    set: function(email) {
      // 加密邮箱
      return encryptionService.encrypt(email);
    },
    get: function(encryptedEmail) {
      // 解密邮箱
      return encryptionService.decrypt(encryptedEmail);
    }
  },
  phone: {
    type: String,
    set: function(phone) {
      return phone ? encryptionService.encrypt(phone) : null;
    },
    get: function(encryptedPhone) {
      return encryptedPhone ? encryptionService.decrypt(encryptedPhone) : null;
    }
  },
  password: {
    type: String,
    required: true,
    set: function(password) {
      // 哈希密码
      return encryptionService.hash(password);
    }
  },
  ssn: {
    type: String,
    set: function(ssn) {
      // 社会保险号等高敏感数据
      return ssn ? encryptionService.encrypt(ssn) : null;
    },
    get: function(encryptedSSN) {
      return encryptedSSN ? encryptionService.decrypt(encryptedSSN) : null;
    }
  }
}, {
  toJSON: {
    getters: true,
    transform: function(doc, ret) {
      // 从 JSON 输出中移除敏感字段
      delete ret.password;
      delete ret.ssn;
      return ret;
    }
  }
});

// 密码验证方法
userSchema.methods.verifyPassword = function(password) {
  return encryptionService.verifyHash(password, this.password);
};

const User = mongoose.model('User', userSchema);
```

### 数据脱敏

```javascript
// 数据脱敏服务
class DataMaskingService {
  // 邮箱脱敏
  maskEmail(email) {
    if (!email) return '';
    
    const [username, domain] = email.split('@');
    if (!username || !domain) return email;
    
    const maskedUsername = username.length > 2 
      ? username.substring(0, 2) + '*'.repeat(username.length - 2)
      : '*'.repeat(username.length);
    
    return `${maskedUsername}@${domain}`;
  }
  
  // 手机号脱敏
  maskPhone(phone) {
    if (!phone) return '';
    
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 7) return phone;
    
    return cleaned.substring(0, 3) + '*'.repeat(4) + cleaned.substring(cleaned.length - 4);
  }
  
  // 身份证号脱敏
  maskIdCard(idCard) {
    if (!idCard) return '';
    
    if (idCard.length < 8) return idCard;
    
    return idCard.substring(0, 4) + '*'.repeat(idCard.length - 8) + idCard.substring(idCard.length - 4);
  }
  
  // 银行卡号脱敏
  maskBankCard(cardNumber) {
    if (!cardNumber) return '';
    
    const cleaned = cardNumber.replace(/\s/g, '');
    if (cleaned.length < 8) return cardNumber;
    
    return cleaned.substring(0, 4) + ' **** **** ' + cleaned.substring(cleaned.length - 4);
  }
  
  // 姓名脱敏
  maskName(name) {
    if (!name) return '';
    
    if (name.length <= 2) {
      return name.charAt(0) + '*';
    } else {
      return name.charAt(0) + '*'.repeat(name.length - 2) + name.charAt(name.length - 1);
    }
  }
  
  // 地址脱敏
  maskAddress(address) {
    if (!address) return '';
    
    if (address.length <= 10) {
      return address.substring(0, Math.ceil(address.length / 2)) + '*'.repeat(Math.floor(address.length / 2));
    }
    
    return address.substring(0, 6) + '*'.repeat(address.length - 10) + address.substring(address.length - 4);
  }
  
  // 通用脱敏
  maskData(data, type) {
    switch (type) {
      case 'email':
        return this.maskEmail(data);
      case 'phone':
        return this.maskPhone(data);
      case 'idCard':
        return this.maskIdCard(data);
      case 'bankCard':
        return this.maskBankCard(data);
      case 'name':
        return this.maskName(data);
      case 'address':
        return this.maskAddress(data);
      default:
        return data;
    }
  }
  
  // 批量脱敏对象
  maskObject(obj, maskingRules) {
    const masked = { ...obj };
    
    for (const [field, type] of Object.entries(maskingRules)) {
      if (masked[field]) {
        masked[field] = this.maskData(masked[field], type);
      }
    }
    
    return masked;
  }
}

const dataMaskingService = new DataMaskingService();

// 使用示例
const maskingRules = {
  email: 'email',
  phone: 'phone',
  idCard: 'idCard',
  bankCard: 'bankCard',
  name: 'name',
  address: 'address'
};

// API 响应脱敏中间件
const maskSensitiveData = (maskingRules) => {
  return (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      if (data && typeof data === 'object') {
        if (Array.isArray(data)) {
          data = data.map(item => 
            dataMaskingService.maskObject(item, maskingRules)
          );
        } else {
          data = dataMaskingService.maskObject(data, maskingRules);
        }
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// 应用脱敏中间件
app.get('/api/users', maskSensitiveData(maskingRules), async (req, res) => {
  const users = await User.find();
  res.json(users); // 自动脱敏
});
```

## 输入验证和清理

### 综合输入验证

```javascript
// 输入验证服务
const validator = require('validator');
const xss = require('xss');

class InputValidationService {
  constructor() {
    // XSS 过滤配置
    this.xssOptions = {
      whiteList: {
        p: [],
        br: [],
        strong: [],
        em: [],
        u: [],
        ol: [],
        ul: [],
        li: []
      },
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script']
    };
  }
  
  // 验证和清理字符串
  validateString(value, options = {}) {
    const {
      required = false,
      minLength = 0,
      maxLength = 255,
      allowEmpty = !required,
      trim = true,
      sanitize = true
    } = options;
    
    // 类型检查
    if (typeof value !== 'string') {
      if (required) {
        throw new Error('String value is required');
      }
      return allowEmpty ? '' : null;
    }
    
    // 修剪空白
    let cleaned = trim ? value.trim() : value;
    
    // 检查是否为空
    if (!cleaned && required) {
      throw new Error('Value cannot be empty');
    }
    
    if (!cleaned && allowEmpty) {
      return '';
    }
    
    // 长度验证
    if (cleaned.length < minLength) {
      throw new Error(`Value must be at least ${minLength} characters long`);
    }
    
    if (cleaned.length > maxLength) {
      throw new Error(`Value must not exceed ${maxLength} characters`);
    }
    
    // XSS 清理
    if (sanitize) {
      cleaned = xss(cleaned, this.xssOptions);
    }
    
    return cleaned;
  }
  
  // 验证邮箱
  validateEmail(email, required = false) {
    if (!email && !required) return null;
    
    if (!email && required) {
      throw new Error('Email is required');
    }
    
    const cleaned = email.trim().toLowerCase();
    
    if (!validator.isEmail(cleaned)) {
      throw new Error('Invalid email format');
    }
    
    // 检查邮箱长度
    if (cleaned.length > 254) {
      throw new Error('Email is too long');
    }
    
    return cleaned;
  }
  
  // 验证手机号
  validatePhone(phone, required = false) {
    if (!phone && !required) return null;
    
    if (!phone && required) {
      throw new Error('Phone number is required');
    }
    
    // 清理非数字字符
    const cleaned = phone.replace(/\D/g, '');
    
    // 验证长度（假设是中国手机号）
    if (cleaned.length !== 11) {
      throw new Error('Invalid phone number format');
    }
    
    // 验证开头数字
    if (!cleaned.startsWith('1')) {
      throw new Error('Invalid phone number format');
    }
    
    return cleaned;
  }
  
  // 验证密码
  validatePassword(password, options = {}) {
    const {
      minLength = 8,
      maxLength = 128,
      requireUppercase = true,
      requireLowercase = true,
      requireNumbers = true,
      requireSpecialChars = true,
      forbiddenPatterns = []
    } = options;
    
    if (!password) {
      throw new Error('Password is required');
    }
    
    if (password.length < minLength) {
      throw new Error(`Password must be at least ${minLength} characters long`);
    }
    
    if (password.length > maxLength) {
      throw new Error(`Password must not exceed ${maxLength} characters`);
    }
    
    if (requireUppercase && !/[A-Z]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }
    
    if (requireLowercase && !/[a-z]/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }
    
    if (requireNumbers && !/\d/.test(password)) {
      throw new Error('Password must contain at least one number');
    }
    
    if (requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      throw new Error('Password must contain at least one special character');
    }
    
    // 检查禁用模式
    for (const pattern of forbiddenPatterns) {
      if (password.toLowerCase().includes(pattern.toLowerCase())) {
        throw new Error('Password contains forbidden pattern');
      }
    }
    
    return password;
  }
  
  // 验证 URL
  validateUrl(url, required = false) {
    if (!url && !required) return null;
    
    if (!url && required) {
      throw new Error('URL is required');
    }
    
    const cleaned = url.trim();
    
    if (!validator.isURL(cleaned, {
      protocols: ['http', 'https'],
      require_protocol: true
    })) {
      throw new Error('Invalid URL format');
    }
    
    return cleaned;
  }
  
  // 验证整数
  validateInteger(value, options = {}) {
    const { min, max, required = false } = options;
    
    if (value === null || value === undefined) {
      if (required) {
        throw new Error('Integer value is required');
      }
      return null;
    }
    
    const num = parseInt(value, 10);
    
    if (isNaN(num)) {
      throw new Error('Invalid integer value');
    }
    
    if (min !== undefined && num < min) {
      throw new Error(`Value must be at least ${min}`);
    }
    
    if (max !== undefined && num > max) {
      throw new Error(`Value must not exceed ${max}`);
    }
    
    return num;
  }
  
  // 验证日期
  validateDate(date, required = false) {
    if (!date && !required) return null;
    
    if (!date && required) {
      throw new Error('Date is required');
    }
    
    const parsedDate = new Date(date);
    
    if (isNaN(parsedDate.getTime())) {
      throw new Error('Invalid date format');
    }
    
    return parsedDate;
  }
  
  // 批量验证对象
  validateObject(obj, schema) {
    const validated = {};
    const errors = [];
    
    for (const [field, rules] of Object.entries(schema)) {
      try {
        const value = obj[field];
        
        switch (rules.type) {
          case 'string':
            validated[field] = this.validateString(value, rules);
            break;
          case 'email':
            validated[field] = this.validateEmail(value, rules.required);
            break;
          case 'phone':
            validated[field] = this.validatePhone(value, rules.required);
            break;
          case 'password':
            validated[field] = this.validatePassword(value, rules);
            break;
          case 'url':
            validated[field] = this.validateUrl(value, rules.required);
            break;
          case 'integer':
            validated[field] = this.validateInteger(value, rules);
            break;
          case 'date':
            validated[field] = this.validateDate(value, rules.required);
            break;
          default:
            validated[field] = value;
        }
      } catch (error) {
        errors.push({ field, message: error.message });
      }
    }
    
    if (errors.length > 0) {
      const error = new Error('Validation failed');
      error.validationErrors = errors;
      throw error;
    }
    
    return validated;
  }
}

const inputValidation = new InputValidationService();

// 验证中间件
const validateInput = (schema) => {
  return (req, res, next) => {
    try {
      req.validatedBody = inputValidation.validateObject(req.body, schema);
      next();
    } catch (error) {
      if (error.validationErrors) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.validationErrors
        });
      }
      
      return res.status(400).json({ error: error.message });
    }
  };
};

// 使用示例
const userRegistrationSchema = {
  username: {
    type: 'string',
    required: true,
    minLength: 3,
    maxLength: 30
  },
  email: {
    type: 'email',
    required: true
  },
  password: {
    type: 'password',
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    forbiddenPatterns: ['password', '123456', 'qwerty']
  },
  phone: {
    type: 'phone',
    required: false
  },
  age: {
    type: 'integer',
    min: 18,
    max: 120,
    required: true
  }
};

app.post('/register', validateInput(userRegistrationSchema), async (req, res) => {
  // req.validatedBody 包含已验证和清理的数据
  const userData = req.validatedBody;
  
  try {
    const user = await User.create(userData);
    res.json({ message: 'User created successfully', userId: user.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

module.exports = {
  InputValidationService,
  inputValidation,
  validateInput
};
```

## 安全配置和最佳实践

### 环境变量安全管理

```javascript
// config/security.js
const crypto = require('crypto');

class SecurityConfig {
  constructor() {
    this.validateEnvironment();
    this.secrets = this.loadSecrets();
  }
  
  // 验证必需的环境变量
  validateEnvironment() {
    const requiredVars = [
      'NODE_ENV',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'ENCRYPTION_KEY',
      'SESSION_SECRET',
      'DATABASE_URL'
    ];
    
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    // 验证密钥强度
    this.validateSecretStrength('JWT_SECRET', process.env.JWT_SECRET);
    this.validateSecretStrength('JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET);
    this.validateSecretStrength('ENCRYPTION_KEY', process.env.ENCRYPTION_KEY);
    this.validateSecretStrength('SESSION_SECRET', process.env.SESSION_SECRET);
  }
  
  // 验证密钥强度
  validateSecretStrength(name, secret) {
    if (secret.length < 32) {
      throw new Error(`${name} must be at least 32 characters long`);
    }
    
    // 检查熵（简单检查）
    const uniqueChars = new Set(secret).size;
    if (uniqueChars < 10) {
      console.warn(`Warning: ${name} has low entropy (${uniqueChars} unique characters)`);
    }
  }
  
  // 加载密钥
  loadSecrets() {
    return {
      jwtSecret: process.env.JWT_SECRET,
      jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
      encryptionKey: process.env.ENCRYPTION_KEY,
      sessionSecret: process.env.SESSION_SECRET,
      databaseUrl: process.env.DATABASE_URL
    };
  }
  
  // 生成安全的随机密钥
  static generateSecureKey(length = 64) {
    return crypto.randomBytes(length).toString('hex');
  }
  
  // 获取安全配置
  getSecurityConfig() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    return {
      // CORS 配置
      cors: {
        origin: isProduction 
          ? process.env.ALLOWED_ORIGINS?.split(',') || []
          : ['http://localhost:3000', 'http://localhost:3001'],
        credentials: true,
        optionsSuccessStatus: 200
      },
      
      // 限流配置
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 分钟
        max: isProduction ? 100 : 1000, // 生产环境更严格
        message: 'Too many requests from this IP',
        standardHeaders: true,
        legacyHeaders: false
      },
      
      // Helmet 安全头配置
      helmet: {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
          }
        },
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true
        },
        noSniff: true,
        xssFilter: true,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
      },
      
      // 会话配置
      session: {
        secret: this.secrets.sessionSecret,
        name: 'sessionId',
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: isProduction,
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000, // 24 小时
          sameSite: 'strict'
        }
      },
      
      // JWT 配置
      jwt: {
        secret: this.secrets.jwtSecret,
        refreshSecret: this.secrets.jwtRefreshSecret,
        accessTokenExpiry: '15m',
        refreshTokenExpiry: '7d',
        issuer: 'myapp',
        audience: 'myapp-users'
      },
      
      // 加密配置
      encryption: {
        key: this.secrets.encryptionKey,
        algorithm: 'aes-256-gcm'
      }
    };
  }
}

module.exports = new SecurityConfig();
```

### 安全审计和日志

```javascript
// security/auditLogger.js
const winston = require('winston');
const path = require('path');

class SecurityAuditLogger {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({
          filename: path.join(__dirname, '../logs/security-audit.log'),
          maxsize: 10485760, // 10MB
          maxFiles: 10
        }),
        new winston.transports.File({
          filename: path.join(__dirname, '../logs/security-errors.log'),
          level: 'error',
          maxsize: 10485760,
          maxFiles: 5
        })
      ]
    });
  }
  
  // 记录认证事件
  logAuthEvent(event, details) {
    this.logger.info('AUTH_EVENT', {
      event,
      ...details,
      timestamp: new Date().toISOString()
    });
  }
  
  // 记录授权事件
  logAuthzEvent(event, details) {
    this.logger.info('AUTHZ_EVENT', {
      event,
      ...details,
      timestamp: new Date().toISOString()
    });
  }
  
  // 记录安全违规
  logSecurityViolation(violation, details) {
    this.logger.error('SECURITY_VIOLATION', {
      violation,
      ...details,
      timestamp: new Date().toISOString()
    });
  }
  
  // 记录数据访问
  logDataAccess(action, details) {
    this.logger.info('DATA_ACCESS', {
      action,
      ...details,
      timestamp: new Date().toISOString()
    });
  }
  
  // 记录配置变更
  logConfigChange(change, details) {
    this.logger.warn('CONFIG_CHANGE', {
      change,
      ...details,
      timestamp: new Date().toISOString()
    });
  }
}

const auditLogger = new SecurityAuditLogger();

// 安全审计中间件
const securityAuditMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // 记录请求信息
  const requestInfo = {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    sessionId: req.sessionID
  };
  
  // 监听响应完成
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // 记录可疑活动
    if (res.statusCode === 401) {
      auditLogger.logAuthEvent('UNAUTHORIZED_ACCESS', {
        ...requestInfo,
        statusCode: res.statusCode,
        duration
      });
    }
    
    if (res.statusCode === 403) {
      auditLogger.logAuthzEvent('FORBIDDEN_ACCESS', {
        ...requestInfo,
        statusCode: res.statusCode,
        duration
      });
    }
    
    // 记录慢请求
    if (duration > 5000) {
      auditLogger.logSecurityViolation('SLOW_REQUEST', {
        ...requestInfo,
        duration,
        statusCode: res.statusCode
      });
    }
    
    // 记录大量数据请求
    const contentLength = res.get('Content-Length');
    if (contentLength && parseInt(contentLength) > 10485760) { // 10MB
      auditLogger.logDataAccess('LARGE_DATA_TRANSFER', {
        ...requestInfo,
        contentLength,
        statusCode: res.statusCode
      });
    }
  });
  
  next();
};

// 登录审计
const auditLogin = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    if (res.statusCode === 200 && data.accessToken) {
      auditLogger.logAuthEvent('LOGIN_SUCCESS', {
        userId: data.user?.id,
        username: data.user?.username,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    } else if (res.statusCode === 401) {
      auditLogger.logAuthEvent('LOGIN_FAILURE', {
        username: req.body?.username,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        reason: data.error
      });
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

// 数据访问审计
const auditDataAccess = (resource) => {
  return (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      if (res.statusCode === 200) {
        auditLogger.logDataAccess('DATA_READ', {
          resource,
          userId: req.user?.id,
          ip: req.ip,
          recordCount: Array.isArray(data) ? data.length : 1
        });
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  SecurityAuditLogger,
  auditLogger,
  securityAuditMiddleware,
  auditLogin,
  auditDataAccess
};
```

## 总结

Node.js 应用安全需要从多个层面进行防护：

1. **输入验证**：严格验证和清理所有用户输入
2. **身份认证**：实施强密码策略和安全的认证机制
3. **授权控制**：基于角色的访问控制
4. **数据保护**：敏感数据加密和脱敏
5. **安全配置**：使用安全的默认配置
6. **审计日志**：记录所有安全相关事件
7. **定期更新**：保持依赖包和系统的最新状态

## 安全检查清单

### 开发阶段
- [ ] 实施输入验证和清理
- [ ] 使用参数化查询防止注入攻击
- [ ] 实施 XSS 防护
- [ ] 配置 CSRF 保护
- [ ] 使用安全的密码哈希
- [ ] 实施适当的错误处理
- [ ] 避免敏感信息泄露

### 部署阶段
- [ ] 配置安全头（Helmet）
- [ ] 启用 HTTPS
- [ ] 设置适当的 CORS 策略
- [ ] 配置限流和防暴力破解
- [ ] 实施安全的会话管理
- [ ] 配置安全的环境变量
- [ ] 启用安全审计日志

### 运维阶段
- [ ] 定期更新依赖包
- [ ] 监控安全日志
- [ ] 进行安全扫描
- [ ] 实施入侵检测
- [ ] 定期备份数据
- [ ] 制定安全事件响应计划

## 下一步

- [故障排除](./troubleshooting.md) - 学习常见问题的诊断和解决
- [性能优化](./performance.md) - 回顾性能优化策略
- [监控和日志](./monitoring.md) - 深入了解应用监控