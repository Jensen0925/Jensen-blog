# Node.js 测试

测试是软件开发中的重要环节，确保代码质量和功能正确性。本章将介绍 Node.js 中的各种测试方法和最佳实践。

## 测试类型

### 单元测试（Unit Testing）
测试单个函数或模块的功能。

### 集成测试（Integration Testing）
测试多个模块之间的交互。

### 端到端测试（E2E Testing）
测试完整的用户流程。

### API 测试
测试 REST API 接口的功能。

## Jest 测试框架

Jest 是 Facebook 开发的 JavaScript 测试框架，功能强大且易于使用。

### 安装和配置

```bash
npm install --save-dev jest
```

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "testEnvironment": "node",
    "collectCoverageFrom": [
      "src/**/*.js",
      "!src/**/*.test.js",
      "!src/config/**"
    ],
    "coverageDirectory": "coverage",
    "coverageReporters": ["text", "lcov", "html"],
    "testMatch": [
      "**/__tests__/**/*.js",
      "**/?(*.)+(spec|test).js"
    ],
    "setupFilesAfterEnv": ["<rootDir>/tests/setup.js"]
  }
}
```

### 基本测试示例

```javascript
// src/utils/math.js
class MathUtils {
  static add(a, b) {
    if (typeof a !== 'number' || typeof b !== 'number') {
      throw new Error('参数必须是数字');
    }
    return a + b;
  }
  
  static subtract(a, b) {
    if (typeof a !== 'number' || typeof b !== 'number') {
      throw new Error('参数必须是数字');
    }
    return a - b;
  }
  
  static multiply(a, b) {
    if (typeof a !== 'number' || typeof b !== 'number') {
      throw new Error('参数必须是数字');
    }
    return a * b;
  }
  
  static divide(a, b) {
    if (typeof a !== 'number' || typeof b !== 'number') {
      throw new Error('参数必须是数字');
    }
    if (b === 0) {
      throw new Error('除数不能为零');
    }
    return a / b;
  }
  
  static factorial(n) {
    if (typeof n !== 'number' || n < 0 || !Number.isInteger(n)) {
      throw new Error('参数必须是非负整数');
    }
    if (n === 0 || n === 1) {
      return 1;
    }
    return n * this.factorial(n - 1);
  }
}

module.exports = MathUtils;
```

```javascript
// src/utils/__tests__/math.test.js
const MathUtils = require('../math');

describe('MathUtils', () => {
  describe('add', () => {
    test('应该正确计算两个正数的和', () => {
      expect(MathUtils.add(2, 3)).toBe(5);
    });
    
    test('应该正确计算负数', () => {
      expect(MathUtils.add(-2, 3)).toBe(1);
      expect(MathUtils.add(-2, -3)).toBe(-5);
    });
    
    test('应该正确处理小数', () => {
      expect(MathUtils.add(0.1, 0.2)).toBeCloseTo(0.3);
    });
    
    test('参数不是数字时应该抛出错误', () => {
      expect(() => MathUtils.add('a', 2)).toThrow('参数必须是数字');
      expect(() => MathUtils.add(2, null)).toThrow('参数必须是数字');
    });
  });
  
  describe('subtract', () => {
    test('应该正确计算减法', () => {
      expect(MathUtils.subtract(5, 3)).toBe(2);
      expect(MathUtils.subtract(3, 5)).toBe(-2);
    });
  });
  
  describe('multiply', () => {
    test('应该正确计算乘法', () => {
      expect(MathUtils.multiply(3, 4)).toBe(12);
      expect(MathUtils.multiply(-3, 4)).toBe(-12);
      expect(MathUtils.multiply(0, 5)).toBe(0);
    });
  });
  
  describe('divide', () => {
    test('应该正确计算除法', () => {
      expect(MathUtils.divide(10, 2)).toBe(5);
      expect(MathUtils.divide(7, 2)).toBe(3.5);
    });
    
    test('除数为零时应该抛出错误', () => {
      expect(() => MathUtils.divide(5, 0)).toThrow('除数不能为零');
    });
  });
  
  describe('factorial', () => {
    test('应该正确计算阶乘', () => {
      expect(MathUtils.factorial(0)).toBe(1);
      expect(MathUtils.factorial(1)).toBe(1);
      expect(MathUtils.factorial(5)).toBe(120);
    });
    
    test('负数或非整数应该抛出错误', () => {
      expect(() => MathUtils.factorial(-1)).toThrow('参数必须是非负整数');
      expect(() => MathUtils.factorial(3.5)).toThrow('参数必须是非负整数');
    });
  });
});
```

### 异步测试

```javascript
// src/services/userService.js
const User = require('../models/User');

class UserService {
  async createUser(userData) {
    try {
      // 验证用户数据
      if (!userData.email || !userData.password) {
        throw new Error('邮箱和密码是必需的');
      }
      
      // 检查用户是否已存在
      const existingUser = await User.findByEmail(userData.email);
      if (existingUser.data) {
        throw new Error('用户已存在');
      }
      
      // 创建用户
      const result = await User.create(userData);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async getUserById(id) {
    try {
      if (!id) {
        throw new Error('用户 ID 是必需的');
      }
      
      const result = await User.findById(id);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      if (!result.data) {
        throw new Error('用户未找到');
      }
      
      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async updateUser(id, updateData) {
    try {
      if (!id) {
        throw new Error('用户 ID 是必需的');
      }
      
      // 检查用户是否存在
      const existingUser = await this.getUserById(id);
      if (!existingUser.success) {
        throw new Error('用户未找到');
      }
      
      const result = await User.updateById(id, updateData);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async deleteUser(id) {
    try {
      if (!id) {
        throw new Error('用户 ID 是必需的');
      }
      
      const result = await User.deleteById(id);
      
      if (!result.success) {
        throw new Error(result.error);
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
}

module.exports = new UserService();
```

```javascript
// src/services/__tests__/userService.test.js
const UserService = require('../userService');
const User = require('../../models/User');

// Mock User 模型
jest.mock('../../models/User');

describe('UserService', () => {
  beforeEach(() => {
    // 清除所有 mock
    jest.clearAllMocks();
  });
  
  describe('createUser', () => {
    test('应该成功创建用户', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser'
      };
      
      // Mock 方法
      User.findByEmail.mockResolvedValue({ success: true, data: null });
      User.create.mockResolvedValue({
        success: true,
        data: { id: 1, ...userData }
      });
      
      const result = await UserService.createUser(userData);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, ...userData });
      expect(User.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(User.create).toHaveBeenCalledWith(userData);
    });
    
    test('缺少必需字段时应该返回错误', async () => {
      const userData = {
        username: 'testuser'
        // 缺少 email 和 password
      };
      
      const result = await UserService.createUser(userData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('邮箱和密码是必需的');
    });
    
    test('用户已存在时应该返回错误', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'password123'
      };
      
      User.findByEmail.mockResolvedValue({
        success: true,
        data: { id: 1, email: userData.email }
      });
      
      const result = await UserService.createUser(userData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('用户已存在');
    });
    
    test('数据库错误时应该返回错误', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      User.findByEmail.mockResolvedValue({ success: true, data: null });
      User.create.mockResolvedValue({
        success: false,
        error: '数据库连接失败'
      });
      
      const result = await UserService.createUser(userData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('数据库连接失败');
    });
  });
  
  describe('getUserById', () => {
    test('应该成功获取用户', async () => {
      const userId = 1;
      const userData = {
        id: userId,
        email: 'test@example.com',
        username: 'testuser'
      };
      
      User.findById.mockResolvedValue({
        success: true,
        data: userData
      });
      
      const result = await UserService.getUserById(userId);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(userData);
      expect(User.findById).toHaveBeenCalledWith(userId);
    });
    
    test('用户 ID 为空时应该返回错误', async () => {
      const result = await UserService.getUserById(null);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('用户 ID 是必需的');
    });
    
    test('用户不存在时应该返回错误', async () => {
      User.findById.mockResolvedValue({
        success: true,
        data: null
      });
      
      const result = await UserService.getUserById(999);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('用户未找到');
    });
  });
  
  describe('updateUser', () => {
    test('应该成功更新用户', async () => {
      const userId = 1;
      const updateData = { username: 'newusername' };
      const existingUser = {
        id: userId,
        email: 'test@example.com',
        username: 'oldusername'
      };
      const updatedUser = {
        ...existingUser,
        ...updateData
      };
      
      // Mock getUserById 方法
      jest.spyOn(UserService, 'getUserById').mockResolvedValue({
        success: true,
        data: existingUser
      });
      
      User.updateById.mockResolvedValue({
        success: true,
        data: updatedUser
      });
      
      const result = await UserService.updateUser(userId, updateData);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedUser);
      expect(UserService.getUserById).toHaveBeenCalledWith(userId);
      expect(User.updateById).toHaveBeenCalledWith(userId, updateData);
    });
  });
  
  describe('deleteUser', () => {
    test('应该成功删除用户', async () => {
      const userId = 1;
      
      User.deleteById.mockResolvedValue({
        success: true,
        message: '用户删除成功'
      });
      
      const result = await UserService.deleteUser(userId);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('用户删除成功');
      expect(User.deleteById).toHaveBeenCalledWith(userId);
    });
  });
});
```

## API 测试

使用 Supertest 进行 API 测试。

```bash
npm install --save-dev supertest
```

```javascript
// src/app.js
const express = require('express');
const userRoutes = require('./routes/users');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());
app.use('/api/users', userRoutes);
app.use(errorHandler);

module.exports = app;
```

```javascript
// src/routes/users.js
const express = require('express');
const UserService = require('../services/userService');
const { validateUser, validateUpdateUser } = require('../middleware/validation');

const router = express.Router();

// 获取所有用户
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const result = await UserService.getUsers({ page, limit });
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 根据 ID 获取用户
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await UserService.getUserById(id);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 创建用户
router.post('/', validateUser, async (req, res) => {
  try {
    const result = await UserService.createUser(req.body);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
    
    res.status(201).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 更新用户
router.put('/:id', validateUpdateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await UserService.updateUser(id, req.body);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 删除用户
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await UserService.deleteUser(id);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error
      });
    }
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
```

```javascript
// src/routes/__tests__/users.test.js
const request = require('supertest');
const app = require('../../app');
const UserService = require('../../services/userService');

// Mock UserService
jest.mock('../../services/userService');

describe('Users API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('GET /api/users', () => {
    test('应该返回用户列表', async () => {
      const mockUsers = [
        { id: 1, username: 'user1', email: 'user1@example.com' },
        { id: 2, username: 'user2', email: 'user2@example.com' }
      ];
      
      UserService.getUsers.mockResolvedValue({
        success: true,
        data: mockUsers,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1
        }
      });
      
      const response = await request(app)
        .get('/api/users')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUsers);
      expect(response.body.pagination).toBeDefined();
    });
    
    test('服务错误时应该返回 500', async () => {
      UserService.getUsers.mockResolvedValue({
        success: false,
        error: '数据库连接失败'
      });
      
      const response = await request(app)
        .get('/api/users')
        .expect(500);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('数据库连接失败');
    });
  });
  
  describe('GET /api/users/:id', () => {
    test('应该返回指定用户', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com'
      };
      
      UserService.getUserById.mockResolvedValue({
        success: true,
        data: mockUser
      });
      
      const response = await request(app)
        .get('/api/users/1')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUser);
    });
    
    test('用户不存在时应该返回 404', async () => {
      UserService.getUserById.mockResolvedValue({
        success: false,
        error: '用户未找到'
      });
      
      const response = await request(app)
        .get('/api/users/999')
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('用户未找到');
    });
  });
  
  describe('POST /api/users', () => {
    test('应该成功创建用户', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123'
      };
      
      const createdUser = {
        id: 1,
        ...userData
      };
      
      UserService.createUser.mockResolvedValue({
        success: true,
        data: createdUser
      });
      
      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(createdUser);
    });
    
    test('数据验证失败时应该返回 400', async () => {
      const invalidData = {
        username: 'newuser'
        // 缺少 email 和 password
      };
      
      const response = await request(app)
        .post('/api/users')
        .send(invalidData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
    
    test('用户已存在时应该返回 400', async () => {
      const userData = {
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'password123'
      };
      
      UserService.createUser.mockResolvedValue({
        success: false,
        error: '用户已存在'
      });
      
      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('用户已存在');
    });
  });
  
  describe('PUT /api/users/:id', () => {
    test('应该成功更新用户', async () => {
      const updateData = {
        username: 'updateduser'
      };
      
      const updatedUser = {
        id: 1,
        username: 'updateduser',
        email: 'test@example.com'
      };
      
      UserService.updateUser.mockResolvedValue({
        success: true,
        data: updatedUser
      });
      
      const response = await request(app)
        .put('/api/users/1')
        .send(updateData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(updatedUser);
    });
  });
  
  describe('DELETE /api/users/:id', () => {
    test('应该成功删除用户', async () => {
      UserService.deleteUser.mockResolvedValue({
        success: true,
        message: '用户删除成功'
      });
      
      const response = await request(app)
        .delete('/api/users/1')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('用户删除成功');
    });
    
    test('用户不存在时应该返回 404', async () => {
      UserService.deleteUser.mockResolvedValue({
        success: false,
        error: '用户未找到'
      });
      
      const response = await request(app)
        .delete('/api/users/999')
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('用户未找到');
    });
  });
});
```

## 数据库测试

### 使用内存数据库进行测试

```javascript
// tests/setup.js
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod;

// 测试开始前
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
});

// 每个测试后清理数据
afterEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// 测试结束后
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
});
```

### 数据库集成测试

```javascript
// src/models/__tests__/User.integration.test.js
const User = require('../User');
const mongoose = require('mongoose');

describe('User Model Integration', () => {
  describe('创建用户', () => {
    test('应该成功创建有效用户', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        profile: {
          firstName: 'Test',
          lastName: 'User'
        }
      };
      
      const user = new User(userData);
      const savedUser = await user.save();
      
      expect(savedUser._id).toBeDefined();
      expect(savedUser.username).toBe(userData.username);
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.password).not.toBe(userData.password); // 应该被加密
      expect(savedUser.profile.firstName).toBe(userData.profile.firstName);
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
    });
    
    test('重复邮箱应该抛出错误', async () => {
      const userData = {
        username: 'testuser1',
        email: 'duplicate@example.com',
        password: 'password123'
      };
      
      // 创建第一个用户
      const user1 = new User(userData);
      await user1.save();
      
      // 尝试创建相同邮箱的用户
      const user2 = new User({
        ...userData,
        username: 'testuser2'
      });
      
      await expect(user2.save()).rejects.toThrow();
    });
    
    test('缺少必需字段应该抛出验证错误', async () => {
      const userData = {
        username: 'testuser'
        // 缺少 email 和 password
      };
      
      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow('邮箱是必需的');
    });
  });
  
  describe('用户方法', () => {
    let user;
    
    beforeEach(async () => {
      user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        profile: {
          firstName: 'Test',
          lastName: 'User'
        }
      });
      
      await user.save();
    });
    
    test('comparePassword 应该正确验证密码', async () => {
      const isMatch = await user.comparePassword('password123');
      expect(isMatch).toBe(true);
      
      const isNotMatch = await user.comparePassword('wrongpassword');
      expect(isNotMatch).toBe(false);
    });
    
    test('getFullName 应该返回完整姓名', () => {
      const fullName = user.getFullName();
      expect(fullName).toBe('Test User');
    });
  });
  
  describe('静态方法', () => {
    beforeEach(async () => {
      await User.create({
        username: 'testuser1',
        email: 'test1@example.com',
        password: 'password123'
      });
      
      await User.create({
        username: 'testuser2',
        email: 'test2@example.com',
        password: 'password123',
        isActive: false
      });
    });
    
    test('findByEmail 应该根据邮箱查找用户', async () => {
      const user = await User.findByEmail('test1@example.com');
      expect(user).toBeTruthy();
      expect(user.username).toBe('testuser1');
      
      const notFound = await User.findByEmail('notfound@example.com');
      expect(notFound).toBeNull();
    });
    
    test('getActiveUsers 应该只返回活跃用户', async () => {
      const activeUsers = await User.getActiveUsers();
      expect(activeUsers).toHaveLength(1);
      expect(activeUsers[0].username).toBe('testuser1');
    });
  });
});
```

## 测试覆盖率

```bash
# 运行测试并生成覆盖率报告
npm run test:coverage
```

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/__tests__/**',
    '!src/config/**',
    '!src/migrations/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 10000
};
```

## 端到端测试

使用 Playwright 进行端到端测试。

```bash
npm install --save-dev @playwright/test
```

```javascript
// tests/e2e/user-management.spec.js
const { test, expect } = require('@playwright/test');

test.describe('用户管理', () => {
  test.beforeEach(async ({ page }) => {
    // 访问应用首页
    await page.goto('http://localhost:3000');
  });
  
  test('应该能够注册新用户', async ({ page }) => {
    // 点击注册按钮
    await page.click('text=注册');
    
    // 填写注册表单
    await page.fill('[data-testid="username"]', 'testuser');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.fill('[data-testid="confirmPassword"]', 'password123');
    
    // 提交表单
    await page.click('[data-testid="submit"]');
    
    // 验证注册成功
    await expect(page.locator('text=注册成功')).toBeVisible();
  });
  
  test('应该能够登录', async ({ page }) => {
    // 点击登录按钮
    await page.click('text=登录');
    
    // 填写登录表单
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    
    // 提交表单
    await page.click('[data-testid="login"]');
    
    // 验证登录成功
    await expect(page.locator('text=欢迎回来')).toBeVisible();
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });
  
  test('应该能够查看用户列表', async ({ page }) => {
    // 先登录
    await page.click('text=登录');
    await page.fill('[data-testid="email"]', 'admin@example.com');
    await page.fill('[data-testid="password"]', 'admin123');
    await page.click('[data-testid="login"]');
    
    // 访问用户管理页面
    await page.click('text=用户管理');
    
    // 验证用户列表显示
    await expect(page.locator('[data-testid="user-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-item"]')).toHaveCount.greaterThan(0);
  });
});
```

## 性能测试

使用 Artillery 进行负载测试。

```bash
npm install --save-dev artillery
```

```yaml
# tests/performance/load-test.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Load test"
    - duration: 60
      arrivalRate: 100
      name: "Stress test"
  payload:
    path: "./users.csv"
    fields:
      - "email"
      - "password"

scenarios:
  - name: "User registration and login"
    weight: 70
    flow:
      - post:
          url: "/api/auth/register"
          json:
            username: "user_{{ $randomString() }}"
            email: "{{ email }}"
            password: "{{ password }}"
      - post:
          url: "/api/auth/login"
          json:
            email: "{{ email }}"
            password: "{{ password }}"
          capture:
            - json: "$.token"
              as: "token"
      - get:
          url: "/api/users/profile"
          headers:
            Authorization: "Bearer {{ token }}"
  
  - name: "API endpoints"
    weight: 30
    flow:
      - get:
          url: "/api/users"
      - get:
          url: "/api/users/{{ $randomInt(1, 100) }}"
```

```bash
# 运行性能测试
npx artillery run tests/performance/load-test.yml
```

## 测试最佳实践

### 1. 测试结构

```javascript
// 使用 AAA 模式：Arrange, Act, Assert
test('应该正确计算用户年龄', () => {
  // Arrange - 准备测试数据
  const birthDate = new Date('1990-01-01');
  const currentDate = new Date('2023-01-01');
  
  // Act - 执行被测试的操作
  const age = calculateAge(birthDate, currentDate);
  
  // Assert - 验证结果
  expect(age).toBe(33);
});
```

### 2. 测试命名

```javascript
// 好的测试命名
describe('UserService', () => {
  describe('createUser', () => {
    test('应该成功创建有效用户', () => {});
    test('邮箱重复时应该抛出错误', () => {});
    test('缺少必需字段时应该抛出验证错误', () => {});
  });
});
```

### 3. 测试数据管理

```javascript
// tests/fixtures/users.js
module.exports = {
  validUser: {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123'
  },
  
  invalidUser: {
    username: 'testuser'
    // 缺少必需字段
  },
  
  createUser: (overrides = {}) => ({
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    ...overrides
  })
};
```

### 4. Mock 管理

```javascript
// tests/mocks/userService.js
module.exports = {
  createUser: jest.fn(),
  getUserById: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  
  // 重置所有 mock
  resetMocks: () => {
    Object.values(module.exports).forEach(mock => {
      if (typeof mock.mockReset === 'function') {
        mock.mockReset();
      }
    });
  }
};
```

### 5. 测试环境配置

```javascript
// config/test.js
module.exports = {
  database: {
    mongodb: {
      uri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test'
    },
    mysql: {
      host: process.env.DB_TEST_HOST || 'localhost',
      database: process.env.DB_TEST_NAME || 'test'
    }
  },
  
  server: {
    port: process.env.TEST_PORT || 3001
  },
  
  logging: {
    level: 'error' // 测试时减少日志输出
  }
};
```

## 持续集成

### GitHub Actions 配置

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [16.x, 18.x, 20.x]
    
    services:
      mongodb:
        image: mongo:5.0
        ports:
          - 27017:27017
      
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: password
          MYSQL_DATABASE: test
        ports:
          - 3306:3306
        options: --health-cmd="mysqladmin ping" --health-interval=10s --health-timeout=5s --health-retries=3
      
      redis:
        image: redis:6.2
        ports:
          - 6379:6379
        options: --health-cmd="redis-cli ping" --health-interval=10s --health-timeout=5s --health-retries=3
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run tests
      run: npm run test:coverage
      env:
        NODE_ENV: test
        MONGODB_URI: mongodb://localhost:27017/test
        DB_HOST: localhost
        DB_USER: root
        DB_PASSWORD: password
        DB_NAME: test
        REDIS_HOST: localhost
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
        flags: unittests
        name: codecov-umbrella
```

## 总结

测试是确保代码质量的重要手段：

1. **单元测试**：测试单个函数和模块
2. **集成测试**：测试模块间的交互
3. **API 测试**：测试接口功能
4. **端到端测试**：测试完整用户流程
5. **性能测试**：测试系统性能
6. **测试覆盖率**：确保代码覆盖率
7. **持续集成**：自动化测试流程

