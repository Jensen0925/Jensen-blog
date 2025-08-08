# Node.js 数据库操作

Node.js 支持多种数据库，包括关系型数据库（MySQL、PostgreSQL）和非关系型数据库（MongoDB、Redis）。本章将介绍如何在 Node.js 中操作这些数据库。

## MongoDB 操作

MongoDB 是最流行的 NoSQL 数据库之一，与 Node.js 配合使用非常广泛。

### 使用原生 MongoDB 驱动

#### 安装和连接

```bash
npm install mongodb
```

```javascript
// db/mongodb.js
const { MongoClient } = require('mongodb');

class MongoDB {
  constructor() {
    this.client = null;
    this.db = null;
    this.url = process.env.MONGODB_URL || 'mongodb://localhost:27017';
    this.dbName = process.env.DB_NAME || 'myapp';
  }
  
  async connect() {
    try {
      this.client = new MongoClient(this.url, {
        useUnifiedTopology: true
      });
      
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      
      console.log('MongoDB 连接成功');
      return this.db;
    } catch (error) {
      console.error('MongoDB 连接失败:', error);
      throw error;
    }
  }
  
  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('MongoDB 连接已关闭');
    }
  }
  
  getDb() {
    if (!this.db) {
      throw new Error('数据库未连接');
    }
    return this.db;
  }
}

module.exports = new MongoDB();
```

#### CRUD 操作

```javascript
// models/User.js
const mongodb = require('../db/mongodb');
const { ObjectId } = require('mongodb');

class User {
  constructor() {
    this.collection = null;
  }
  
  async init() {
    const db = mongodb.getDb();
    this.collection = db.collection('users');
  }
  
  // 创建用户
  async create(userData) {
    try {
      const result = await this.collection.insertOne({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      return {
        success: true,
        data: {
          _id: result.insertedId,
          ...userData
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // 查找所有用户
  async findAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sort = { createdAt: -1 },
        filter = {}
      } = options;
      
      const skip = (page - 1) * limit;
      
      const users = await this.collection
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray();
      
      const total = await this.collection.countDocuments(filter);
      
      return {
        success: true,
        data: users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // 根据 ID 查找用户
  async findById(id) {
    try {
      const user = await this.collection.findOne({
        _id: new ObjectId(id)
      });
      
      return {
        success: true,
        data: user
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // 根据条件查找用户
  async findOne(filter) {
    try {
      const user = await this.collection.findOne(filter);
      
      return {
        success: true,
        data: user
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // 更新用户
  async updateById(id, updateData) {
    try {
      const result = await this.collection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            ...updateData,
            updatedAt: new Date()
          }
        }
      );
      
      if (result.matchedCount === 0) {
        return {
          success: false,
          error: '用户未找到'
        };
      }
      
      const updatedUser = await this.findById(id);
      
      return {
        success: true,
        data: updatedUser.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // 删除用户
  async deleteById(id) {
    try {
      const result = await this.collection.deleteOne({
        _id: new ObjectId(id)
      });
      
      if (result.deletedCount === 0) {
        return {
          success: false,
          error: '用户未找到'
        };
      }
      
      return {
        success: true,
        message: '用户删除成功'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // 批量操作
  async bulkCreate(usersData) {
    try {
      const result = await this.collection.insertMany(
        usersData.map(user => ({
          ...user,
          createdAt: new Date(),
          updatedAt: new Date()
        }))
      );
      
      return {
        success: true,
        data: result.insertedIds,
        count: result.insertedCount
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = User;
```

### 使用 Mongoose ODM

Mongoose 是 MongoDB 的对象文档映射（ODM）库，提供了更高级的抽象。

#### 安装和配置

```bash
npm install mongoose
```

```javascript
// db/mongoose.js
const mongoose = require('mongoose');

class MongooseDB {
  constructor() {
    this.connection = null;
  }
  
  async connect() {
    try {
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/myapp';
      
      this.connection = await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      
      console.log('Mongoose 连接成功');
      
      // 监听连接事件
      mongoose.connection.on('error', (err) => {
        console.error('Mongoose 连接错误:', err);
      });
      
      mongoose.connection.on('disconnected', () => {
        console.log('Mongoose 连接断开');
      });
      
      return this.connection;
    } catch (error) {
      console.error('Mongoose 连接失败:', error);
      throw error;
    }
  }
  
  async disconnect() {
    if (this.connection) {
      await mongoose.disconnect();
      console.log('Mongoose 连接已关闭');
    }
  }
}

module.exports = new MongooseDB();
```

#### 定义模型

```javascript
// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// 定义用户模式
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, '用户名是必需的'],
    unique: true,
    trim: true,
    minlength: [3, '用户名至少需要3个字符'],
    maxlength: [20, '用户名不能超过20个字符']
  },
  email: {
    type: String,
    required: [true, '邮箱是必需的'],
    unique: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, '请提供有效的邮箱地址']
  },
  password: {
    type: String,
    required: [true, '密码是必需的'],
    minlength: [6, '密码至少需要6个字符']
  },
  profile: {
    firstName: {
      type: String,
      trim: true
    },
    lastName: {
      type: String,
      trim: true
    },
    avatar: {
      type: String,
      default: null
    },
    bio: {
      type: String,
      maxlength: [500, '个人简介不能超过500个字符']
    }
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true, // 自动添加 createdAt 和 updatedAt
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password; // 序列化时移除密码
      return ret;
    }
  }
});

// 索引
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ createdAt: -1 });

// 中间件：保存前加密密码
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 实例方法：验证密码
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// 实例方法：获取完整姓名
userSchema.methods.getFullName = function() {
  return `${this.profile.firstName || ''} ${this.profile.lastName || ''}`.trim();
};

// 静态方法：根据邮箱查找用户
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// 静态方法：获取活跃用户
userSchema.statics.getActiveUsers = function() {
  return this.find({ isActive: true }).sort({ createdAt: -1 });
};

// 虚拟属性：用户统计
userSchema.virtual('stats').get(function() {
  return {
    id: this._id,
    memberSince: this.createdAt,
    lastActive: this.lastLogin || this.updatedAt
  };
});

module.exports = mongoose.model('User', userSchema);
```

#### 使用模型进行 CRUD 操作

```javascript
// services/userService.js
const User = require('../models/User');

class UserService {
  // 创建用户
  async createUser(userData) {
    try {
      const user = new User(userData);
      await user.save();
      
      return {
        success: true,
        data: user
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }
  
  // 获取用户列表
  async getUsers(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sort = '-createdAt',
        filter = {},
        populate = ''
      } = options;
      
      const skip = (page - 1) * limit;
      
      const query = User.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit);
      
      if (populate) {
        query.populate(populate);
      }
      
      const users = await query.exec();
      const total = await User.countDocuments(filter);
      
      return {
        success: true,
        data: users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }
  
  // 根据 ID 获取用户
  async getUserById(id) {
    try {
      const user = await User.findById(id);
      
      if (!user) {
        return {
          success: false,
          error: '用户未找到'
        };
      }
      
      return {
        success: true,
        data: user
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }
  
  // 更新用户
  async updateUser(id, updateData) {
    try {
      const user = await User.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true, // 返回更新后的文档
          runValidators: true // 运行验证器
        }
      );
      
      if (!user) {
        return {
          success: false,
          error: '用户未找到'
        };
      }
      
      return {
        success: true,
        data: user
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }
  
  // 删除用户
  async deleteUser(id) {
    try {
      const user = await User.findByIdAndDelete(id);
      
      if (!user) {
        return {
          success: false,
          error: '用户未找到'
        };
      }
      
      return {
        success: true,
        message: '用户删除成功'
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }
  
  // 用户认证
  async authenticateUser(email, password) {
    try {
      const user = await User.findByEmail(email);
      
      if (!user) {
        return {
          success: false,
          error: '用户不存在'
        };
      }
      
      const isMatch = await user.comparePassword(password);
      
      if (!isMatch) {
        return {
          success: false,
          error: '密码错误'
        };
      }
      
      // 更新最后登录时间
      user.lastLogin = new Date();
      await user.save();
      
      return {
        success: true,
        data: user
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }
  
  // 搜索用户
  async searchUsers(query, options = {}) {
    try {
      const {
        page = 1,
        limit = 10
      } = options;
      
      const skip = (page - 1) * limit;
      
      const searchFilter = {
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { 'profile.firstName': { $regex: query, $options: 'i' } },
          { 'profile.lastName': { $regex: query, $options: 'i' } }
        ]
      };
      
      const users = await User.find(searchFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      const total = await User.countDocuments(searchFilter);
      
      return {
        success: true,
        data: users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }
  
  // 错误处理
  handleError(error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return `验证错误: ${errors.join(', ')}`;
    }
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return `${field} 已存在`;
    }
    
    if (error.name === 'CastError') {
      return '无效的 ID 格式';
    }
    
    return error.message || '服务器内部错误';
  }
}

module.exports = new UserService();
```

## MySQL 操作

### 使用 mysql2 驱动

```bash
npm install mysql2
```

```javascript
// db/mysql.js
const mysql = require('mysql2/promise');

class MySQL {
  constructor() {
    this.pool = null;
  }
  
  async connect() {
    try {
      this.pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'myapp',
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        acquireTimeout: 60000,
        timeout: 60000
      });
      
      // 测试连接
      const connection = await this.pool.getConnection();
      console.log('MySQL 连接成功');
      connection.release();
      
      return this.pool;
    } catch (error) {
      console.error('MySQL 连接失败:', error);
      throw error;
    }
  }
  
  async query(sql, params = []) {
    try {
      const [rows, fields] = await this.pool.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('SQL 查询错误:', error);
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
  
  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('MySQL 连接池已关闭');
    }
  }
}

module.exports = new MySQL();
```

```javascript
// models/User.js
const mysql = require('../db/mysql');
const bcrypt = require('bcrypt');

class User {
  // 创建用户表
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(50),
        last_name VARCHAR(50),
        avatar VARCHAR(255),
        role ENUM('user', 'admin', 'moderator') DEFAULT 'user',
        is_active BOOLEAN DEFAULT TRUE,
        last_login DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    
    await mysql.query(sql);
  }
  
  // 创建用户
  static async create(userData) {
    try {
      const {
        username,
        email,
        password,
        firstName,
        lastName,
        role = 'user'
      } = userData;
      
      // 加密密码
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      const sql = `
        INSERT INTO users (username, email, password, first_name, last_name, role)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      const result = await mysql.query(sql, [
        username,
        email,
        hashedPassword,
        firstName,
        lastName,
        role
      ]);
      
      return {
        success: true,
        data: {
          id: result.insertId,
          username,
          email,
          firstName,
          lastName,
          role
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }
  
  // 获取所有用户
  static async findAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        orderBy = 'created_at',
        order = 'DESC',
        where = ''
      } = options;
      
      const offset = (page - 1) * limit;
      
      let sql = `
        SELECT id, username, email, first_name, last_name, role, is_active, last_login, created_at, updated_at
        FROM users
      `;
      
      let params = [];
      
      if (where) {
        sql += ` WHERE ${where.condition}`;
        params = where.params || [];
      }
      
      sql += ` ORDER BY ${orderBy} ${order} LIMIT ? OFFSET ?`;
      params.push(limit, offset);
      
      const users = await mysql.query(sql, params);
      
      // 获取总数
      let countSql = 'SELECT COUNT(*) as total FROM users';
      let countParams = [];
      
      if (where) {
        countSql += ` WHERE ${where.condition}`;
        countParams = where.params || [];
      }
      
      const [{ total }] = await mysql.query(countSql, countParams);
      
      return {
        success: true,
        data: users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }
  
  // 根据 ID 查找用户
  static async findById(id) {
    try {
      const sql = `
        SELECT id, username, email, first_name, last_name, role, is_active, last_login, created_at, updated_at
        FROM users
        WHERE id = ?
      `;
      
      const users = await mysql.query(sql, [id]);
      
      return {
        success: true,
        data: users[0] || null
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }
  
  // 根据邮箱查找用户
  static async findByEmail(email) {
    try {
      const sql = `
        SELECT id, username, email, password, first_name, last_name, role, is_active, last_login, created_at, updated_at
        FROM users
        WHERE email = ?
      `;
      
      const users = await mysql.query(sql, [email]);
      
      return {
        success: true,
        data: users[0] || null
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }
  
  // 更新用户
  static async updateById(id, updateData) {
    try {
      const fields = [];
      const values = [];
      
      // 动态构建更新字段
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          fields.push(`${key} = ?`);
          values.push(updateData[key]);
        }
      });
      
      if (fields.length === 0) {
        return {
          success: false,
          error: '没有要更新的字段'
        };
      }
      
      values.push(id);
      
      const sql = `
        UPDATE users
        SET ${fields.join(', ')}
        WHERE id = ?
      `;
      
      const result = await mysql.query(sql, values);
      
      if (result.affectedRows === 0) {
        return {
          success: false,
          error: '用户未找到'
        };
      }
      
      const updatedUser = await this.findById(id);
      
      return {
        success: true,
        data: updatedUser.data
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }
  
  // 删除用户
  static async deleteById(id) {
    try {
      const sql = 'DELETE FROM users WHERE id = ?';
      const result = await mysql.query(sql, [id]);
      
      if (result.affectedRows === 0) {
        return {
          success: false,
          error: '用户未找到'
        };
      }
      
      return {
        success: true,
        message: '用户删除成功'
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }
  
  // 验证密码
  static async verifyPassword(email, password) {
    try {
      const userResult = await this.findByEmail(email);
      
      if (!userResult.success || !userResult.data) {
        return {
          success: false,
          error: '用户不存在'
        };
      }
      
      const user = userResult.data;
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        return {
          success: false,
          error: '密码错误'
        };
      }
      
      // 更新最后登录时间
      await this.updateById(user.id, {
        last_login: new Date()
      });
      
      // 移除密码字段
      delete user.password;
      
      return {
        success: true,
        data: user
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }
  
  // 错误处理
  static handleError(error) {
    if (error.code === 'ER_DUP_ENTRY') {
      if (error.message.includes('username')) {
        return '用户名已存在';
      }
      if (error.message.includes('email')) {
        return '邮箱已存在';
      }
      return '数据重复';
    }
    
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return '数据表不存在';
    }
    
    return error.message || '数据库操作失败';
  }
}

module.exports = User;
```

## Redis 操作

Redis 常用于缓存、会话存储和消息队列。

```bash
npm install redis
```

```javascript
// db/redis.js
const redis = require('redis');

class Redis {
  constructor() {
    this.client = null;
  }
  
  async connect() {
    try {
      this.client = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0
      });
      
      this.client.on('error', (err) => {
        console.error('Redis 错误:', err);
      });
      
      this.client.on('connect', () => {
        console.log('Redis 连接成功');
      });
      
      this.client.on('ready', () => {
        console.log('Redis 准备就绪');
      });
      
      await this.client.connect();
      return this.client;
    } catch (error) {
      console.error('Redis 连接失败:', error);
      throw error;
    }
  }
  
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      console.log('Redis 连接已关闭');
    }
  }
  
  // 基本操作
  async set(key, value, expireInSeconds = null) {
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      
      if (expireInSeconds) {
        await this.client.setEx(key, expireInSeconds, stringValue);
      } else {
        await this.client.set(key, stringValue);
      }
      
      return true;
    } catch (error) {
      console.error('Redis SET 错误:', error);
      return false;
    }
  }
  
  async get(key) {
    try {
      const value = await this.client.get(key);
      
      if (value === null) {
        return null;
      }
      
      // 尝试解析 JSON
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error('Redis GET 错误:', error);
      return null;
    }
  }
  
  async del(key) {
    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      console.error('Redis DEL 错误:', error);
      return false;
    }
  }
  
  async exists(key) {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS 错误:', error);
      return false;
    }
  }
  
  async expire(key, seconds) {
    try {
      const result = await this.client.expire(key, seconds);
      return result === 1;
    } catch (error) {
      console.error('Redis EXPIRE 错误:', error);
      return false;
    }
  }
  
  // 哈希操作
  async hset(key, field, value) {
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      await this.client.hSet(key, field, stringValue);
      return true;
    } catch (error) {
      console.error('Redis HSET 错误:', error);
      return false;
    }
  }
  
  async hget(key, field) {
    try {
      const value = await this.client.hGet(key, field);
      
      if (value === null) {
        return null;
      }
      
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error('Redis HGET 错误:', error);
      return null;
    }
  }
  
  async hgetall(key) {
    try {
      const hash = await this.client.hGetAll(key);
      
      // 尝试解析每个值
      const result = {};
      for (const [field, value] of Object.entries(hash)) {
        try {
          result[field] = JSON.parse(value);
        } catch {
          result[field] = value;
        }
      }
      
      return result;
    } catch (error) {
      console.error('Redis HGETALL 错误:', error);
      return {};
    }
  }
  
  // 列表操作
  async lpush(key, ...values) {
    try {
      const stringValues = values.map(v => 
        typeof v === 'object' ? JSON.stringify(v) : String(v)
      );
      const result = await this.client.lPush(key, stringValues);
      return result;
    } catch (error) {
      console.error('Redis LPUSH 错误:', error);
      return 0;
    }
  }
  
  async rpop(key) {
    try {
      const value = await this.client.rPop(key);
      
      if (value === null) {
        return null;
      }
      
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error('Redis RPOP 错误:', error);
      return null;
    }
  }
  
  // 发布/订阅
  async publish(channel, message) {
    try {
      const stringMessage = typeof message === 'object' ? JSON.stringify(message) : String(message);
      const result = await this.client.publish(channel, stringMessage);
      return result;
    } catch (error) {
      console.error('Redis PUBLISH 错误:', error);
      return 0;
    }
  }
  
  async subscribe(channel, callback) {
    try {
      const subscriber = this.client.duplicate();
      await subscriber.connect();
      
      await subscriber.subscribe(channel, (message) => {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch {
          callback(message);
        }
      });
      
      return subscriber;
    } catch (error) {
      console.error('Redis SUBSCRIBE 错误:', error);
      return null;
    }
  }
}

module.exports = new Redis();
```

### 缓存服务

```javascript
// services/cacheService.js
const redis = require('../db/redis');

class CacheService {
  constructor() {
    this.defaultTTL = 3600; // 1小时
  }
  
  // 生成缓存键
  generateKey(prefix, ...parts) {
    return `${prefix}:${parts.join(':')}`;
  }
  
  // 缓存用户数据
  async cacheUser(userId, userData, ttl = this.defaultTTL) {
    const key = this.generateKey('user', userId);
    return await redis.set(key, userData, ttl);
  }
  
  // 获取缓存的用户数据
  async getCachedUser(userId) {
    const key = this.generateKey('user', userId);
    return await redis.get(key);
  }
  
  // 删除用户缓存
  async deleteCachedUser(userId) {
    const key = this.generateKey('user', userId);
    return await redis.del(key);
  }
  
  // 缓存查询结果
  async cacheQuery(queryKey, result, ttl = 300) {
    const key = this.generateKey('query', queryKey);
    return await redis.set(key, result, ttl);
  }
  
  // 获取缓存的查询结果
  async getCachedQuery(queryKey) {
    const key = this.generateKey('query', queryKey);
    return await redis.get(key);
  }
  
  // 会话管理
  async setSession(sessionId, sessionData, ttl = 86400) {
    const key = this.generateKey('session', sessionId);
    return await redis.set(key, sessionData, ttl);
  }
  
  async getSession(sessionId) {
    const key = this.generateKey('session', sessionId);
    return await redis.get(key);
  }
  
  async deleteSession(sessionId) {
    const key = this.generateKey('session', sessionId);
    return await redis.del(key);
  }
  
  // 速率限制
  async checkRateLimit(identifier, limit, window) {
    const key = this.generateKey('rate_limit', identifier);
    
    try {
      const current = await redis.get(key);
      
      if (current === null) {
        await redis.set(key, 1, window);
        return {
          allowed: true,
          remaining: limit - 1,
          resetTime: Date.now() + (window * 1000)
        };
      }
      
      const count = parseInt(current);
      
      if (count >= limit) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: Date.now() + (window * 1000)
        };
      }
      
      await redis.client.incr(key);
      
      return {
        allowed: true,
        remaining: limit - count - 1,
        resetTime: Date.now() + (window * 1000)
      };
    } catch (error) {
      console.error('速率限制检查错误:', error);
      return {
        allowed: true,
        remaining: limit,
        resetTime: Date.now() + (window * 1000)
      };
    }
  }
  
  // 清除所有缓存
  async clearAll() {
    try {
      await redis.client.flushDb();
      return true;
    } catch (error) {
      console.error('清除缓存错误:', error);
      return false;
    }
  }
  
  // 获取缓存统计
  async getStats() {
    try {
      const info = await redis.client.info('memory');
      const keyspace = await redis.client.info('keyspace');
      
      return {
        memory: info,
        keyspace: keyspace
      };
    } catch (error) {
      console.error('获取缓存统计错误:', error);
      return null;
    }
  }
}

module.exports = new CacheService();
```

## 数据库连接管理

```javascript
// db/index.js
const mongoose = require('./mongoose');
const mysql = require('./mysql');
const redis = require('./redis');

class DatabaseManager {
  constructor() {
    this.connections = {
      mongoose: null,
      mysql: null,
      redis: null
    };
  }
  
  async connectAll() {
    try {
      console.log('开始连接所有数据库...');
      
      // 并行连接所有数据库
      const [mongooseConn, mysqlConn, redisConn] = await Promise.all([
        mongoose.connect().catch(err => {
          console.warn('MongoDB 连接失败:', err.message);
          return null;
        }),
        mysql.connect().catch(err => {
          console.warn('MySQL 连接失败:', err.message);
          return null;
        }),
        redis.connect().catch(err => {
          console.warn('Redis 连接失败:', err.message);
          return null;
        })
      ]);
      
      this.connections.mongoose = mongooseConn;
      this.connections.mysql = mysqlConn;
      this.connections.redis = redisConn;
      
      console.log('数据库连接完成');
      return this.connections;
    } catch (error) {
      console.error('数据库连接失败:', error);
      throw error;
    }
  }
  
  async disconnectAll() {
    try {
      console.log('开始断开所有数据库连接...');
      
      await Promise.all([
        this.connections.mongoose && mongoose.disconnect(),
        this.connections.mysql && mysql.close(),
        this.connections.redis && redis.disconnect()
      ]);
      
      console.log('所有数据库连接已断开');
    } catch (error) {
      console.error('断开数据库连接失败:', error);
    }
  }
  
  getConnection(type) {
    return this.connections[type];
  }
  
  isConnected(type) {
    return this.connections[type] !== null;
  }
}

module.exports = new DatabaseManager();
```

## 数据库迁移

```javascript
// migrations/001_create_users_table.js
const mysql = require('../db/mysql');

module.exports = {
  up: async () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(50),
        last_name VARCHAR(50),
        avatar VARCHAR(255),
        role ENUM('user', 'admin', 'moderator') DEFAULT 'user',
        is_active BOOLEAN DEFAULT TRUE,
        last_login DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_username (username),
        INDEX idx_created_at (created_at)
      )
    `;
    
    await mysql.query(sql);
    console.log('用户表创建成功');
  },
  
  down: async () => {
    const sql = 'DROP TABLE IF EXISTS users';
    await mysql.query(sql);
    console.log('用户表删除成功');
  }
};
```

```javascript
// scripts/migrate.js
const fs = require('fs').promises;
const path = require('path');
const mysql = require('../db/mysql');

class Migrator {
  constructor() {
    this.migrationsDir = path.join(__dirname, '../migrations');
  }
  
  async createMigrationsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await mysql.query(sql);
  }
  
  async getExecutedMigrations() {
    const sql = 'SELECT filename FROM migrations ORDER BY executed_at';
    const rows = await mysql.query(sql);
    return rows.map(row => row.filename);
  }
  
  async getMigrationFiles() {
    const files = await fs.readdir(this.migrationsDir);
    return files
      .filter(file => file.endsWith('.js'))
      .sort();
  }
  
  async runMigrations() {
    try {
      await mysql.connect();
      await this.createMigrationsTable();
      
      const executedMigrations = await this.getExecutedMigrations();
      const migrationFiles = await this.getMigrationFiles();
      
      const pendingMigrations = migrationFiles.filter(
        file => !executedMigrations.includes(file)
      );
      
      if (pendingMigrations.length === 0) {
        console.log('没有待执行的迁移');
        return;
      }
      
      console.log(`发现 ${pendingMigrations.length} 个待执行的迁移`);
      
      for (const filename of pendingMigrations) {
        console.log(`执行迁移: ${filename}`);
        
        const migrationPath = path.join(this.migrationsDir, filename);
        const migration = require(migrationPath);
        
        await migration.up();
        
        // 记录已执行的迁移
        await mysql.query(
          'INSERT INTO migrations (filename) VALUES (?)',
          [filename]
        );
        
        console.log(`迁移 ${filename} 执行成功`);
      }
      
      console.log('所有迁移执行完成');
    } catch (error) {
      console.error('迁移执行失败:', error);
      throw error;
    }
  }
  
  async rollback(steps = 1) {
    try {
      await mysql.connect();
      
      const executedMigrations = await this.getExecutedMigrations();
      const migrationsToRollback = executedMigrations
        .slice(-steps)
        .reverse();
      
      for (const filename of migrationsToRollback) {
        console.log(`回滚迁移: ${filename}`);
        
        const migrationPath = path.join(this.migrationsDir, filename);
        const migration = require(migrationPath);
        
        if (migration.down) {
          await migration.down();
        }
        
        // 删除迁移记录
        await mysql.query(
          'DELETE FROM migrations WHERE filename = ?',
          [filename]
        );
        
        console.log(`迁移 ${filename} 回滚成功`);
      }
      
      console.log('迁移回滚完成');
    } catch (error) {
      console.error('迁移回滚失败:', error);
      throw error;
    }
  }
}

// 命令行使用
if (require.main === module) {
  const migrator = new Migrator();
  const command = process.argv[2];
  
  switch (command) {
    case 'up':
      migrator.runMigrations()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
      
    case 'down':
      const steps = parseInt(process.argv[3]) || 1;
      migrator.rollback(steps)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
      
    default:
      console.log('用法: node migrate.js [up|down] [steps]');
      process.exit(1);
  }
}

module.exports = Migrator;
```

## 最佳实践

1. **连接池管理**：使用连接池提高性能
2. **错误处理**：完善的错误处理和日志记录
3. **数据验证**：在数据库层和应用层都进行验证
4. **索引优化**：合理创建数据库索引
5. **事务处理**：对于复杂操作使用事务
6. **缓存策略**：合理使用缓存提高性能
7. **安全性**：防止 SQL 注入，使用参数化查询
8. **备份策略**：定期备份数据库

