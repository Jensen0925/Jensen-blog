# Node.js 错误处理

## 概述

错误处理是 Node.js 应用开发中的关键环节，良好的错误处理机制能够提高应用的稳定性和用户体验。本章将详细介绍 Node.js 中的错误处理最佳实践。

## 错误类型

### 1. 同步错误

```javascript
// sync-error-handler.js
class SyncErrorHandler {
  constructor() {
    this.errorTypes = {
      VALIDATION_ERROR: 'ValidationError',
      TYPE_ERROR: 'TypeError',
      REFERENCE_ERROR: 'ReferenceError',
      SYNTAX_ERROR: 'SyntaxError'
    };
  }
  
  // Try-Catch 错误处理
  handleSyncOperation(operation, data) {
    try {
      const result = operation(data);
      return { success: true, data: result };
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  // 数据验证错误
  validateUserData(userData) {
    try {
      if (!userData) {
        throw new Error('User data is required');
      }
      
      if (!userData.email || !this.isValidEmail(userData.email)) {
        throw new ValidationError('Invalid email address');
      }
      
      if (!userData.password || userData.password.length < 8) {
        throw new ValidationError('Password must be at least 8 characters');
      }
      
      return { valid: true, data: userData };
    } catch (error) {
      return { valid: false, error: this.handleError(error) };
    }
  }
  
  // JSON 解析错误
  parseJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      return { success: true, data };
    } catch (error) {
      if (error instanceof SyntaxError) {
        return {
          success: false,
          error: {
            type: 'JSON_PARSE_ERROR',
            message: 'Invalid JSON format',
            details: error.message
          }
        };
      }
      return this.handleError(error);
    }
  }
  
  // 类型转换错误
  convertToNumber(value) {
    try {
      if (value === null || value === undefined) {
        throw new TypeError('Value cannot be null or undefined');
      }
      
      const number = Number(value);
      
      if (isNaN(number)) {
        throw new TypeError(`Cannot convert '${value}' to number`);
      }
      
      return { success: true, data: number };
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  handleError(error) {
    const errorInfo = {
      success: false,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }
    };
    
    // 记录错误日志
    console.error('Sync Error:', errorInfo);
    
    return errorInfo;
  }
  
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// 自定义错误类
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.code = 'VALIDATION_FAILED';
  }
}

module.exports = { SyncErrorHandler, ValidationError };
```

### 2. 异步错误

```javascript
// async-error-handler.js
const fs = require('fs').promises;
const http = require('http');
const https = require('https');

class AsyncErrorHandler {
  constructor() {
    this.retryAttempts = 3;
    this.retryDelay = 1000;
  }
  
  // Promise 错误处理
  async handleAsyncOperation(operation, ...args) {
    try {
      const result = await operation(...args);
      return { success: true, data: result };
    } catch (error) {
      return this.handleAsyncError(error);
    }
  }
  
  // 文件操作错误处理
  async readFileWithErrorHandling(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return { success: true, data };
    } catch (error) {
      switch (error.code) {
        case 'ENOENT':
          return {
            success: false,
            error: {
              type: 'FILE_NOT_FOUND',
              message: `File not found: ${filePath}`,
              code: error.code
            }
          };
        case 'EACCES':
          return {
            success: false,
            error: {
              type: 'PERMISSION_DENIED',
              message: `Permission denied: ${filePath}`,
              code: error.code
            }
          };
        case 'EISDIR':
          return {
            success: false,
            error: {
              type: 'IS_DIRECTORY',
              message: `Path is a directory: ${filePath}`,
              code: error.code
            }
          };
        default:
          return this.handleAsyncError(error);
      }
    }
  }
  
  // HTTP 请求错误处理
  async makeHttpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https:') ? https : http;
      
      const req = protocol.request(url, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              success: true,
              data: {
                statusCode: res.statusCode,
                headers: res.headers,
                body: data
              }
            });
          } else {
            resolve({
              success: false,
              error: {
                type: 'HTTP_ERROR',
                statusCode: res.statusCode,
                message: `HTTP ${res.statusCode}: ${res.statusMessage}`,
                body: data
              }
            });
          }
        });
      });
      
      req.on('error', (error) => {
        resolve({
          success: false,
          error: {
            type: 'REQUEST_ERROR',
            message: error.message,
            code: error.code
          }
        });
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          error: {
            type: 'TIMEOUT_ERROR',
            message: 'Request timeout'
          }
        });
      });
      
      if (options.timeout) {
        req.setTimeout(options.timeout);
      }
      
      req.end();
    });
  }
  
  // 重试机制
  async withRetry(operation, maxAttempts = this.retryAttempts) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation();
        return { success: true, data: result, attempt };
      } catch (error) {
        lastError = error;
        
        console.warn(`Attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1); // 指数退避
          await this.sleep(delay);
        }
      }
    }
    
    return {
      success: false,
      error: {
        type: 'MAX_RETRIES_EXCEEDED',
        message: `Operation failed after ${maxAttempts} attempts`,
        lastError: this.handleAsyncError(lastError).error,
        attempts: maxAttempts
      }
    };
  }
  
  // 超时处理
  async withTimeout(operation, timeoutMs) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
    
    try {
      const result = await Promise.race([operation(), timeoutPromise]);
      return { success: true, data: result };
    } catch (error) {
      return this.handleAsyncError(error);
    }
  }
  
  // 并发错误处理
  async handleConcurrentOperations(operations) {
    const results = await Promise.allSettled(operations);
    
    const successful = [];
    const failed = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push({ index, data: result.value });
      } else {
        failed.push({
          index,
          error: this.handleAsyncError(result.reason).error
        });
      }
    });
    
    return {
      successful,
      failed,
      totalCount: operations.length,
      successCount: successful.length,
      failureCount: failed.length
    };
  }
  
  handleAsyncError(error) {
    const errorInfo = {
      success: false,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }
    };
    
    // 记录错误日志
    console.error('Async Error:', errorInfo);
    
    return errorInfo;
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = AsyncErrorHandler;
```

### 3. 流错误处理

```javascript
// stream-error-handler.js
const fs = require('fs');
const { Transform, Writable, Readable } = require('stream');
const { pipeline } = require('stream/promises');

class StreamErrorHandler {
  constructor() {
    this.errorHandlers = new Map();
  }
  
  // 文件流错误处理
  createSafeFileStream(filePath, options = {}) {
    const stream = fs.createReadStream(filePath, options);
    
    stream.on('error', (error) => {
      this.handleStreamError('file-read', error, { filePath });
    });
    
    return stream;
  }
  
  // Transform 流错误处理
  createSafeTransformStream(transformFn) {
    return new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        try {
          const result = transformFn(chunk);
          callback(null, result);
        } catch (error) {
          this.emit('error', error);
        }
      }
    });
  }
  
  // 写入流错误处理
  createSafeWriteStream(filePath, options = {}) {
    const stream = fs.createWriteStream(filePath, options);
    
    stream.on('error', (error) => {
      this.handleStreamError('file-write', error, { filePath });
    });
    
    return stream;
  }
  
  // Pipeline 错误处理
  async safePipeline(...streams) {
    try {
      await pipeline(...streams);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: this.handleStreamError('pipeline', error, {
          streamCount: streams.length
        })
      };
    }
  }
  
  // 流数据处理错误恢复
  createResilientProcessor(processFn, options = {}) {
    const { skipOnError = true, maxErrors = 10 } = options;
    let errorCount = 0;
    
    return new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        try {
          const result = processFn(chunk);
          callback(null, result);
        } catch (error) {
          errorCount++;
          
          console.error(`Processing error ${errorCount}:`, error.message);
          
          if (errorCount >= maxErrors) {
            return callback(new Error(`Too many errors: ${errorCount}`));
          }
          
          if (skipOnError) {
            // 跳过错误数据，继续处理
            callback();
          } else {
            callback(error);
          }
        }
      }
    });
  }
  
  // 流监控和错误统计
  createMonitoredStream(stream, streamName) {
    const stats = {
      bytesProcessed: 0,
      chunksProcessed: 0,
      errors: 0,
      startTime: Date.now()
    };
    
    stream.on('data', (chunk) => {
      stats.chunksProcessed++;
      stats.bytesProcessed += chunk.length || 0;
    });
    
    stream.on('error', (error) => {
      stats.errors++;
      this.handleStreamError(streamName, error, stats);
    });
    
    stream.on('end', () => {
      const duration = Date.now() - stats.startTime;
      console.log(`Stream ${streamName} completed:`, {
        ...stats,
        duration: `${duration}ms`,
        throughput: `${(stats.bytesProcessed / duration * 1000).toFixed(2)} bytes/sec`
      });
    });
    
    return stream;
  }
  
  // 批处理流错误处理
  createBatchProcessor(batchSize, processBatch) {
    let batch = [];
    
    return new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        batch.push(chunk);
        
        if (batch.length >= batchSize) {
          this.processBatch(batch, callback);
          batch = [];
        } else {
          callback();
        }
      },
      
      flush(callback) {
        if (batch.length > 0) {
          this.processBatch(batch, callback);
        } else {
          callback();
        }
      },
      
      processBatch(items, callback) {
        try {
          const results = processBatch(items);
          results.forEach(result => this.push(result));
          callback();
        } catch (error) {
          callback(error);
        }
      }
    });
  }
  
  handleStreamError(streamType, error, context = {}) {
    const errorInfo = {
      type: 'STREAM_ERROR',
      streamType,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      },
      context,
      timestamp: new Date().toISOString()
    };
    
    console.error('Stream Error:', errorInfo);
    
    // 触发错误处理器
    const handler = this.errorHandlers.get(streamType);
    if (handler) {
      handler(errorInfo);
    }
    
    return errorInfo;
  }
  
  // 注册错误处理器
  registerErrorHandler(streamType, handler) {
    this.errorHandlers.set(streamType, handler);
  }
  
  // 创建错误恢复流
  createRecoveryStream(options = {}) {
    const { maxRetries = 3, retryDelay = 1000 } = options;
    
    return new Transform({
      objectMode: true,
      async transform(chunk, encoding, callback) {
        let retries = 0;
        
        while (retries <= maxRetries) {
          try {
            // 处理数据
            const result = await this.processChunk(chunk);
            return callback(null, result);
          } catch (error) {
            retries++;
            
            if (retries > maxRetries) {
              return callback(error);
            }
            
            console.warn(`Retry ${retries} for chunk processing:`, error.message);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      },
      
      async processChunk(chunk) {
        // 实际的数据处理逻辑
        return chunk;
      }
    });
  }
}

module.exports = StreamErrorHandler;
```

## 全局错误处理

### 1. 未捕获异常处理

```javascript
// global-error-handler.js
const fs = require('fs');
const path = require('path');
const cluster = require('cluster');

class GlobalErrorHandler {
  constructor(options = {}) {
    this.logDir = options.logDir || './logs';
    this.exitOnUncaught = options.exitOnUncaught !== false;
    this.restartOnExit = options.restartOnExit !== false;
    this.maxRestarts = options.maxRestarts || 5;
    this.restartCount = 0;
    
    this.setupErrorHandlers();
    this.ensureLogDirectory();
  }
  
  setupErrorHandlers() {
    // 未捕获的异常
    process.on('uncaughtException', (error) => {
      this.handleUncaughtException(error);
    });
    
    // 未处理的 Promise 拒绝
    process.on('unhandledRejection', (reason, promise) => {
      this.handleUnhandledRejection(reason, promise);
    });
    
    // 警告处理
    process.on('warning', (warning) => {
      this.handleWarning(warning);
    });
    
    // 进程退出处理
    process.on('exit', (code) => {
      this.handleExit(code);
    });
    
    // 信号处理
    ['SIGTERM', 'SIGINT', 'SIGUSR2'].forEach(signal => {
      process.on(signal, () => {
        this.handleSignal(signal);
      });
    });
  }
  
  handleUncaughtException(error) {
    const errorInfo = {
      type: 'UNCAUGHT_EXCEPTION',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      },
      timestamp: new Date().toISOString()
    };
    
    console.error('UNCAUGHT EXCEPTION:', errorInfo);
    this.logError(errorInfo);
    
    // 发送错误报告
    this.sendErrorReport(errorInfo);
    
    if (this.exitOnUncaught) {
      console.error('Exiting process due to uncaught exception...');
      process.exit(1);
    }
  }
  
  handleUnhandledRejection(reason, promise) {
    const errorInfo = {
      type: 'UNHANDLED_REJECTION',
      reason: reason instanceof Error ? {
        name: reason.name,
        message: reason.message,
        stack: reason.stack
      } : reason,
      promise: promise.toString(),
      process: {
        pid: process.pid,
        uptime: process.uptime()
      },
      timestamp: new Date().toISOString()
    };
    
    console.error('UNHANDLED REJECTION:', errorInfo);
    this.logError(errorInfo);
    
    // 发送错误报告
    this.sendErrorReport(errorInfo);
  }
  
  handleWarning(warning) {
    const warningInfo = {
      type: 'WARNING',
      name: warning.name,
      message: warning.message,
      stack: warning.stack,
      timestamp: new Date().toISOString()
    };
    
    console.warn('PROCESS WARNING:', warningInfo);
    this.logError(warningInfo, 'warning');
  }
  
  handleExit(code) {
    const exitInfo = {
      type: 'PROCESS_EXIT',
      exitCode: code,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
    
    console.log('PROCESS EXIT:', exitInfo);
    this.logError(exitInfo, 'exit');
    
    // 如果是集群模式且需要重启
    if (cluster.isWorker && this.restartOnExit && code !== 0) {
      this.requestRestart();
    }
  }
  
  handleSignal(signal) {
    const signalInfo = {
      type: 'SIGNAL_RECEIVED',
      signal,
      timestamp: new Date().toISOString()
    };
    
    console.log('SIGNAL RECEIVED:', signalInfo);
    this.logError(signalInfo, 'signal');
    
    // 优雅关闭
    this.gracefulShutdown();
  }
  
  logError(errorInfo, level = 'error') {
    const logFile = path.join(this.logDir, `${level}-${this.getDateString()}.log`);
    const logEntry = JSON.stringify(errorInfo) + '\n';
    
    try {
      fs.appendFileSync(logFile, logEntry);
    } catch (err) {
      console.error('Failed to write error log:', err);
    }
  }
  
  sendErrorReport(errorInfo) {
    // 这里可以实现发送错误报告到监控系统
    // 例如：Sentry, Bugsnag, 自定义错误收集服务等
    
    if (process.env.ERROR_REPORTING_URL) {
      this.sendToErrorService(errorInfo);
    }
    
    // 发送邮件通知
    if (process.env.ERROR_EMAIL) {
      this.sendEmailNotification(errorInfo);
    }
  }
  
  async sendToErrorService(errorInfo) {
    try {
      const response = await fetch(process.env.ERROR_REPORTING_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ERROR_REPORTING_TOKEN}`
        },
        body: JSON.stringify(errorInfo)
      });
      
      if (!response.ok) {
        console.error('Failed to send error report:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending error report:', error);
    }
  }
  
  sendEmailNotification(errorInfo) {
    // 实现邮件发送逻辑
    console.log('Email notification would be sent for:', errorInfo.type);
  }
  
  requestRestart() {
    if (this.restartCount >= this.maxRestarts) {
      console.error(`Max restarts (${this.maxRestarts}) exceeded, not restarting`);
      return;
    }
    
    this.restartCount++;
    console.log(`Requesting restart (${this.restartCount}/${this.maxRestarts})`);
    
    // 向主进程发送重启请求
    if (process.send) {
      process.send({ cmd: 'restart', restartCount: this.restartCount });
    }
  }
  
  gracefulShutdown() {
    console.log('Starting graceful shutdown...');
    
    // 停止接受新连接
    if (this.server) {
      this.server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
      
      // 强制退出超时
      setTimeout(() => {
        console.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);
    } else {
      process.exit(0);
    }
  }
  
  ensureLogDirectory() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }
  
  getDateString() {
    return new Date().toISOString().split('T')[0];
  }
  
  // 设置服务器引用（用于优雅关闭）
  setServer(server) {
    this.server = server;
  }
  
  // 获取错误统计
  getErrorStats() {
    const stats = {
      restartCount: this.restartCount,
      maxRestarts: this.maxRestarts,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    };
    
    return stats;
  }
}

module.exports = GlobalErrorHandler;
```

### 2. Express 错误处理中间件

```javascript
// express-error-middleware.js
const winston = require('winston');

class ExpressErrorHandler {
  constructor(options = {}) {
    this.logger = options.logger || this.createDefaultLogger();
    this.includeStack = options.includeStack !== false;
    this.logErrors = options.logErrors !== false;
    this.errorHandlers = new Map();
    
    this.setupErrorHandlers();
  }
  
  createDefaultLogger() {
    return winston.createLogger({
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/express-errors.log' }),
        new winston.transports.Console()
      ]
    });
  }
  
  setupErrorHandlers() {
    // 注册常见错误类型的处理器
    this.registerErrorHandler('ValidationError', this.handleValidationError.bind(this));
    this.registerErrorHandler('UnauthorizedError', this.handleUnauthorizedError.bind(this));
    this.registerErrorHandler('ForbiddenError', this.handleForbiddenError.bind(this));
    this.registerErrorHandler('NotFoundError', this.handleNotFoundError.bind(this));
    this.registerErrorHandler('DatabaseError', this.handleDatabaseError.bind(this));
    this.registerErrorHandler('RateLimitError', this.handleRateLimitError.bind(this));
  }
  
  // 主要错误处理中间件
  errorHandler() {
    return (error, req, res, next) => {
      // 记录错误
      if (this.logErrors) {
        this.logError(error, req);
      }
      
      // 检查是否已经发送响应
      if (res.headersSent) {
        return next(error);
      }
      
      // 获取错误处理器
      const handler = this.errorHandlers.get(error.name) || this.handleGenericError.bind(this);
      
      // 处理错误
      const errorResponse = handler(error, req);
      
      // 发送响应
      res.status(errorResponse.statusCode).json(errorResponse);
    };
  }
  
  // 404 处理中间件
  notFoundHandler() {
    return (req, res, next) => {
      const error = new Error(`Route not found: ${req.method} ${req.path}`);
      error.name = 'NotFoundError';
      error.statusCode = 404;
      next(error);
    };
  }
  
  // 异步错误捕获中间件
  asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
  
  // 验证错误处理
  handleValidationError(error, req) {
    return {
      statusCode: 400,
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.details || error.message,
        field: error.field
      },
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    };
  }
  
  // 未授权错误处理
  handleUnauthorizedError(error, req) {
    return {
      statusCode: 401,
      error: {
        type: 'UNAUTHORIZED',
        message: 'Authentication required',
        details: error.message
      },
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    };
  }
  
  // 禁止访问错误处理
  handleForbiddenError(error, req) {
    return {
      statusCode: 403,
      error: {
        type: 'FORBIDDEN',
        message: 'Access denied',
        details: error.message
      },
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    };
  }
  
  // 未找到错误处理
  handleNotFoundError(error, req) {
    return {
      statusCode: 404,
      error: {
        type: 'NOT_FOUND',
        message: 'Resource not found',
        details: error.message
      },
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    };
  }
  
  // 数据库错误处理
  handleDatabaseError(error, req) {
    let statusCode = 500;
    let message = 'Database error';
    
    // MongoDB 错误
    if (error.code === 11000) {
      statusCode = 409;
      message = 'Duplicate key error';
    } else if (error.name === 'CastError') {
      statusCode = 400;
      message = 'Invalid ID format';
    }
    
    return {
      statusCode,
      error: {
        type: 'DATABASE_ERROR',
        message,
        code: error.code,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    };
  }
  
  // 速率限制错误处理
  handleRateLimitError(error, req) {
    return {
      statusCode: 429,
      error: {
        type: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
        retryAfter: error.retryAfter,
        limit: error.limit
      },
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    };
  }
  
  // 通用错误处理
  handleGenericError(error, req) {
    const statusCode = error.statusCode || error.status || 500;
    const isProduction = process.env.NODE_ENV === 'production';
    
    return {
      statusCode,
      error: {
        type: 'INTERNAL_ERROR',
        message: isProduction ? 'Internal server error' : error.message,
        stack: !isProduction && this.includeStack ? error.stack : undefined
      },
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    };
  }
  
  // 记录错误
  logError(error, req) {
    const errorInfo = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        statusCode: error.statusCode || error.status
      },
      request: {
        method: req.method,
        url: req.url,
        path: req.path,
        query: req.query,
        params: req.params,
        headers: req.headers,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      },
      user: req.user ? {
        id: req.user.id,
        email: req.user.email
      } : null,
      timestamp: new Date().toISOString()
    };
    
    this.logger.error('Express Error', errorInfo);
  }
  
  // 注册错误处理器
  registerErrorHandler(errorName, handler) {
    this.errorHandlers.set(errorName, handler);
  }
  
  // 创建自定义错误类
  static createErrorClass(name, defaultMessage, defaultStatusCode = 500) {
    class CustomError extends Error {
      constructor(message = defaultMessage, statusCode = defaultStatusCode) {
        super(message);
        this.name = name;
        this.statusCode = statusCode;
        Error.captureStackTrace(this, CustomError);
      }
    }
    
    return CustomError;
  }
}

// 预定义错误类
const ValidationError = ExpressErrorHandler.createErrorClass('ValidationError', 'Validation failed', 400);
const UnauthorizedError = ExpressErrorHandler.createErrorClass('UnauthorizedError', 'Unauthorized', 401);
const ForbiddenError = ExpressErrorHandler.createErrorClass('ForbiddenError', 'Forbidden', 403);
const NotFoundError = ExpressErrorHandler.createErrorClass('NotFoundError', 'Not found', 404);
const DatabaseError = ExpressErrorHandler.createErrorClass('DatabaseError', 'Database error', 500);
const RateLimitError = ExpressErrorHandler.createErrorClass('RateLimitError', 'Rate limit exceeded', 429);

module.exports = {
  ExpressErrorHandler,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  DatabaseError,
  RateLimitError
};
```

## 错误监控和报告

### 1. 错误收集和分析

```javascript
// error-collector.js
const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class ErrorCollector extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.maxErrors = options.maxErrors || 1000;
    this.flushInterval = options.flushInterval || 60000; // 1分钟
    this.storageDir = options.storageDir || './error-storage';
    
    this.errors = [];
    this.errorStats = {
      total: 0,
      byType: new Map(),
      byHour: new Map(),
      byEndpoint: new Map()
    };
    
    this.startFlushTimer();
    this.ensureStorageDir();
  }
  
  // 收集错误
  collect(error, context = {}) {
    const errorEntry = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      context,
      fingerprint: this.generateFingerprint(error)
    };
    
    this.errors.push(errorEntry);
    this.updateStats(errorEntry);
    
    // 触发事件
    this.emit('error-collected', errorEntry);
    
    // 检查是否需要立即刷新
    if (this.errors.length >= this.maxErrors) {
      this.flush();
    }
    
    return errorEntry.id;
  }
  
  // 更新统计信息
  updateStats(errorEntry) {
    this.errorStats.total++;
    
    // 按类型统计
    const errorType = errorEntry.error.name;
    this.errorStats.byType.set(
      errorType,
      (this.errorStats.byType.get(errorType) || 0) + 1
    );
    
    // 按小时统计
    const hour = new Date(errorEntry.timestamp).getHours();
    this.errorStats.byHour.set(
      hour,
      (this.errorStats.byHour.get(hour) || 0) + 1
    );
    
    // 按端点统计
    if (errorEntry.context.endpoint) {
      const endpoint = errorEntry.context.endpoint;
      this.errorStats.byEndpoint.set(
        endpoint,
        (this.errorStats.byEndpoint.get(endpoint) || 0) + 1
      );
    }
  }
  
  // 生成错误指纹（用于去重）
  generateFingerprint(error) {
    const crypto = require('crypto');
    const content = `${error.name}:${error.message}:${this.getStackTrace(error)}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }
  
  getStackTrace(error) {
    if (!error.stack) return '';
    
    // 只取前3行堆栈信息用于指纹生成
    return error.stack.split('\n').slice(0, 3).join('\n');
  }
  
  // 刷新错误到存储
  async flush() {
    if (this.errors.length === 0) return;
    
    const errorsToFlush = [...this.errors];
    this.errors = [];
    
    try {
      await this.saveErrors(errorsToFlush);
      this.emit('errors-flushed', errorsToFlush.length);
    } catch (error) {
      console.error('Failed to flush errors:', error);
      // 将错误重新加入队列
      this.errors.unshift(...errorsToFlush);
    }
  }
  
  // 保存错误到文件
  async saveErrors(errors) {
    const date = new Date().toISOString().split('T')[0];
    const filename = `errors-${date}.jsonl`;
    const filepath = path.join(this.storageDir, filename);
    
    const lines = errors.map(error => JSON.stringify(error)).join('\n') + '\n';
    
    await fs.appendFile(filepath, lines);
  }
  
  // 分析错误趋势
  analyzeErrors(timeRange = '24h') {
    const now = new Date();
    let startTime;
    
    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    
    const recentErrors = this.errors.filter(
      error => new Date(error.timestamp) >= startTime
    );
    
    return {
      totalErrors: recentErrors.length,
      errorRate: recentErrors.length / (timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : 168),
      topErrors: this.getTopErrors(recentErrors),
      errorsByHour: this.groupErrorsByHour(recentErrors),
      affectedEndpoints: this.getAffectedEndpoints(recentErrors)
    };
  }
  
  getTopErrors(errors) {
    const errorCounts = new Map();
    
    errors.forEach(error => {
      const key = `${error.error.name}: ${error.error.message}`;
      errorCounts.set(key, (errorCounts.get(key) || 0) + 1);
    });
    
    return Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([error, count]) => ({ error, count }));
  }
  
  groupErrorsByHour(errors) {
    const hourlyErrors = new Map();
    
    errors.forEach(error => {
      const hour = new Date(error.timestamp).getHours();
      hourlyErrors.set(hour, (hourlyErrors.get(hour) || 0) + 1);
    });
    
    return Object.fromEntries(hourlyErrors);
  }
  
  getAffectedEndpoints(errors) {
    const endpointErrors = new Map();
    
    errors.forEach(error => {
      if (error.context.endpoint) {
        const endpoint = error.context.endpoint;
        endpointErrors.set(endpoint, (endpointErrors.get(endpoint) || 0) + 1);
      }
    });
    
    return Array.from(endpointErrors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }));
  }
  
  // 获取错误统计
  getStats() {
    return {
      ...this.errorStats,
      byType: Object.fromEntries(this.errorStats.byType),
      byHour: Object.fromEntries(this.errorStats.byHour),
      byEndpoint: Object.fromEntries(this.errorStats.byEndpoint),
      queueSize: this.errors.length
    };
  }
  
  // 搜索错误
  searchErrors(query) {
    const results = this.errors.filter(error => {
      const searchText = `${error.error.name} ${error.error.message} ${error.error.stack}`
        .toLowerCase();
      return searchText.includes(query.toLowerCase());
    });
    
    return results.slice(0, 100); // 限制结果数量
  }
  
  // 获取错误详情
  getErrorById(id) {
    return this.errors.find(error => error.id === id);
  }
  
  startFlushTimer() {
    setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }
  
  async ensureStorageDir() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create storage directory:', error);
    }
  }
  
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
  
  // 清理旧错误
  async cleanup(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    try {
      const files = await fs.readdir(this.storageDir);
      
      for (const file of files) {
        if (file.startsWith('errors-') && file.endsWith('.jsonl')) {
          const filePath = path.join(this.storageDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime < cutoffDate) {
            await fs.unlink(filePath);
            console.log(`Cleaned up old error file: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

module.exports = ErrorCollector;
```

### 2. 错误报告和通知

```javascript
// error-reporter.js
const nodemailer = require('nodemailer');
const axios = require('axios');

class ErrorReporter {
  constructor(options = {}) {
    this.emailConfig = options.email;
    this.slackConfig = options.slack;
    this.webhookConfig = options.webhook;
    this.sentryConfig = options.sentry;
    
    this.alertThresholds = {
      errorRate: options.errorRateThreshold || 10, // 每分钟错误数
      criticalErrors: options.criticalErrorThreshold || 5, // 严重错误数
      responseTime: options.responseTimeThreshold || 5000 // 响应时间阈值
    };
    
    this.setupEmailTransporter();
    this.setupSentry();
  }
  
  setupEmailTransporter() {
    if (this.emailConfig) {
      this.emailTransporter = nodemailer.createTransporter({
        host: this.emailConfig.host,
        port: this.emailConfig.port,
        secure: this.emailConfig.secure,
        auth: {
          user: this.emailConfig.user,
          pass: this.emailConfig.password
        }
      });
    }
  }
  
  setupSentry() {
    if (this.sentryConfig) {
      const Sentry = require('@sentry/node');
      
      Sentry.init({
        dsn: this.sentryConfig.dsn,
        environment: this.sentryConfig.environment || 'production',
        tracesSampleRate: this.sentryConfig.tracesSampleRate || 0.1
      });
      
      this.sentry = Sentry;
    }
  }
  
  // 报告错误
  async reportError(error, context = {}) {
    const errorReport = this.createErrorReport(error, context);
    
    // 并行发送到各个渠道
    const promises = [];
    
    if (this.shouldSendEmail(errorReport)) {
      promises.push(this.sendEmailReport(errorReport));
    }
    
    if (this.shouldSendSlack(errorReport)) {
      promises.push(this.sendSlackReport(errorReport));
    }
    
    if (this.webhookConfig) {
      promises.push(this.sendWebhookReport(errorReport));
    }
    
    if (this.sentry) {
      promises.push(this.sendSentryReport(error, context));
    }
    
    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Error sending reports:', error);
    }
  }
  
  createErrorReport(error, context) {
    return {
      id: this.generateReportId(),
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      context: {
        ...context,
        environment: process.env.NODE_ENV,
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      },
      severity: this.determineSeverity(error, context)
    };
  }
  
  determineSeverity(error, context) {
    // 严重错误
    if (error.name === 'DatabaseError' || 
        error.message.includes('ECONNREFUSED') ||
        context.statusCode >= 500) {
      return 'critical';
    }
    
    // 警告级别
    if (context.statusCode >= 400 || 
        error.name === 'ValidationError') {
      return 'warning';
    }
    
    return 'info';
  }
  
  shouldSendEmail(errorReport) {
    return this.emailConfig && 
           (errorReport.severity === 'critical' || 
            this.isHighFrequencyError(errorReport));
  }
  
  shouldSendSlack(errorReport) {
    return this.slackConfig && 
           errorReport.severity !== 'info';
  }
  
  isHighFrequencyError(errorReport) {
    // 这里可以实现高频错误检测逻辑
    return false;
  }
  
  // 发送邮件报告
  async sendEmailReport(errorReport) {
    if (!this.emailTransporter) return;
    
    const subject = `[${errorReport.severity.toUpperCase()}] ${errorReport.error.name}: ${errorReport.error.message}`;
    
    const html = this.generateEmailHTML(errorReport);
    
    const mailOptions = {
      from: this.emailConfig.from,
      to: this.emailConfig.to,
      subject,
      html
    };
    
    try {
      await this.emailTransporter.sendMail(mailOptions);
      console.log('Error report sent via email');
    } catch (error) {
      console.error('Failed to send email report:', error);
    }
  }
  
  generateEmailHTML(errorReport) {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
            <h1 style="color: ${this.getSeverityColor(errorReport.severity)};">
              Error Report - ${errorReport.severity.toUpperCase()}
            </h1>
            
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h2>Error Details</h2>
              <p><strong>Type:</strong> ${errorReport.error.name}</p>
              <p><strong>Message:</strong> ${errorReport.error.message}</p>
              <p><strong>Time:</strong> ${errorReport.timestamp}</p>
              ${errorReport.error.code ? `<p><strong>Code:</strong> ${errorReport.error.code}</p>` : ''}
            </div>
            
            <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h2>Context</h2>
              <p><strong>Environment:</strong> ${errorReport.context.environment}</p>
              <p><strong>Node Version:</strong> ${errorReport.context.nodeVersion}</p>
              <p><strong>Platform:</strong> ${errorReport.context.platform}</p>
              <p><strong>Uptime:</strong> ${Math.round(errorReport.context.uptime)} seconds</p>
              ${errorReport.context.endpoint ? `<p><strong>Endpoint:</strong> ${errorReport.context.endpoint}</p>` : ''}
              ${errorReport.context.userId ? `<p><strong>User ID:</strong> ${errorReport.context.userId}</p>` : ''}
            </div>
            
            ${errorReport.error.stack ? `
              <div style="background: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h2>Stack Trace</h2>
                <pre style="white-space: pre-wrap; font-size: 12px; overflow-x: auto;">${errorReport.error.stack}</pre>
              </div>
            ` : ''}
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
              <p>Report ID: ${errorReport.id}</p>
              <p>Generated by Node.js Error Reporter</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
  
  getSeverityColor(severity) {
    switch (severity) {
      case 'critical': return '#d32f2f';
      case 'warning': return '#f57c00';
      case 'info': return '#1976d2';
      default: return '#666';
    }
  }
  
  // 发送 Slack 报告
  async sendSlackReport(errorReport) {
    if (!this.slackConfig) return;
    
    const payload = {
      text: `Error Report - ${errorReport.severity.toUpperCase()}`,
      attachments: [
        {
          color: this.getSlackColor(errorReport.severity),
          fields: [
            {
              title: 'Error Type',
              value: errorReport.error.name,
              short: true
            },
            {
              title: 'Message',
              value: errorReport.error.message,
              short: true
            },
            {
              title: 'Environment',
              value: errorReport.context.environment,
              short: true
            },
            {
              title: 'Time',
              value: errorReport.timestamp,
              short: true
            }
          ],
          footer: `Report ID: ${errorReport.id}`,
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    };
    
    try {
      await axios.post(this.slackConfig.webhookUrl, payload);
      console.log('Error report sent to Slack');
    } catch (error) {
      console.error('Failed to send Slack report:', error);
    }
  }
  
  getSlackColor(severity) {
    switch (severity) {
      case 'critical': return 'danger';
      case 'warning': return 'warning';
      case 'info': return 'good';
      default: return '#666666';
    }
  }
  
  // 发送 Webhook 报告
  async sendWebhookReport(errorReport) {
    try {
      await axios.post(this.webhookConfig.url, errorReport, {
        headers: {
          'Content-Type': 'application/json',
          ...this.webhookConfig.headers
        },
        timeout: 5000
      });
      console.log('Error report sent via webhook');
    } catch (error) {
      console.error('Failed to send webhook report:', error);
    }
  }
  
  // 发送 Sentry 报告
  async sendSentryReport(error, context) {
    if (!this.sentry) return;
    
    this.sentry.withScope((scope) => {
      // 设置上下文
      if (context.userId) {
        scope.setUser({ id: context.userId });
      }
      
      if (context.endpoint) {
        scope.setTag('endpoint', context.endpoint);
      }
      
      if (context.requestId) {
        scope.setTag('requestId', context.requestId);
      }
      
      // 设置额外数据
      scope.setContext('context', context);
      
      // 发送错误
      this.sentry.captureException(error);
    });
    
    console.log('Error report sent to Sentry');
  }
  
  // 批量报告错误
  async reportBatch(errors) {
    const reports = errors.map(({ error, context }) => 
      this.reportError(error, context)
    );
    
    await Promise.allSettled(reports);
  }
  
  // 生成报告摘要
  generateSummaryReport(errors, timeRange = '24h') {
    const now = new Date();
    const startTime = new Date(now.getTime() - this.getTimeRangeMs(timeRange));
    
    const recentErrors = errors.filter(
      error => new Date(error.timestamp) >= startTime
    );
    
    const summary = {
      timeRange,
      totalErrors: recentErrors.length,
      errorsByType: this.groupBy(recentErrors, 'error.name'),
      errorsBySeverity: this.groupBy(recentErrors, 'severity'),
      topEndpoints: this.getTopEndpoints(recentErrors),
      errorTrend: this.calculateErrorTrend(recentErrors)
    };
    
    return summary;
  }
  
  getTimeRangeMs(timeRange) {
    switch (timeRange) {
      case '1h': return 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }
  
  groupBy(array, path) {
    const result = {};
    array.forEach(item => {
      const key = this.getNestedValue(item, path);
      result[key] = (result[key] || 0) + 1;
    });
    return result;
  }
  
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
  
  getTopEndpoints(errors) {
    const endpointCounts = {};
    errors.forEach(error => {
      if (error.context?.endpoint) {
        const endpoint = error.context.endpoint;
        endpointCounts[endpoint] = (endpointCounts[endpoint] || 0) + 1;
      }
    });
    
    return Object.entries(endpointCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([endpoint, count]) => ({ endpoint, count }));
  }
  
  calculateErrorTrend(errors) {
    const hourlyErrors = {};
    errors.forEach(error => {
      const hour = new Date(error.timestamp).getHours();
      hourlyErrors[hour] = (hourlyErrors[hour] || 0) + 1;
    });
    
    return hourlyErrors;
  }
  
  generateReportId() {
    return `report_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
}

module.exports = ErrorReporter;
```

## 最佳实践

### 1. 错误处理策略

```javascript
// error-strategy.js
class ErrorHandlingStrategy {
  constructor() {
    this.strategies = {
      // 快速失败策略
      FAIL_FAST: 'fail_fast',
      // 优雅降级策略
      GRACEFUL_DEGRADATION: 'graceful_degradation',
      // 重试策略
      RETRY: 'retry',
      // 断路器策略
      CIRCUIT_BREAKER: 'circuit_breaker'
    };
  }
  
  // 根据错误类型选择处理策略
  selectStrategy(error, context) {
    // 网络错误 - 使用重试策略
    if (this.isNetworkError(error)) {
      return this.strategies.RETRY;
    }
    
    // 验证错误 - 快速失败
    if (this.isValidationError(error)) {
      return this.strategies.FAIL_FAST;
    }
    
    // 外部服务错误 - 优雅降级
    if (this.isExternalServiceError(error)) {
      return this.strategies.GRACEFUL_DEGRADATION;
    }
    
    // 高频错误 - 断路器
    if (this.isHighFrequencyError(error, context)) {
      return this.strategies.CIRCUIT_BREAKER;
    }
    
    return this.strategies.FAIL_FAST;
  }
  
  isNetworkError(error) {
    return error.code === 'ECONNREFUSED' ||
           error.code === 'ETIMEDOUT' ||
           error.code === 'ENOTFOUND';
  }
  
  isValidationError(error) {
    return error.name === 'ValidationError' ||
           error.name === 'TypeError';
  }
  
  isExternalServiceError(error) {
    return error.message?.includes('external service') ||
           error.statusCode >= 500;
  }
  
  isHighFrequencyError(error, context) {
    // 实现高频错误检测逻辑
    return false;
  }
}

module.exports = ErrorHandlingStrategy;
```

### 2. 错误恢复机制

```javascript
// error-recovery.js
class ErrorRecovery {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 30000;
    this.backoffFactor = options.backoffFactor || 2;
  }
  
  // 指数退避重试
  async retryWithBackoff(operation, context = {}) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await operation();
        return { success: true, data: result, attempts: attempt };
      } catch (error) {
        lastError = error;
        
        if (attempt === this.maxRetries) {
          break;
        }
        
        if (!this.shouldRetry(error)) {
          break;
        }
        
        const delay = Math.min(
          this.baseDelay * Math.pow(this.backoffFactor, attempt - 1),
          this.maxDelay
        );
        
        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
        await this.sleep(delay);
      }
    }
    
    return {
      success: false,
      error: lastError,
      attempts: this.maxRetries
    };
  }
  
  shouldRetry(error) {
    // 不重试的错误类型
    const nonRetryableErrors = [
      'ValidationError',
      'AuthenticationError',
      'AuthorizationError'
    ];
    
    if (nonRetryableErrors.includes(error.name)) {
      return false;
    }
    
    // HTTP 状态码判断
    if (error.statusCode) {
      // 4xx 错误通常不需要重试（除了 429）
      if (error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
        return false;
      }
    }
    
    return true;
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ErrorRecovery;
```

### 3. 错误日志记录

```javascript
// error-logger.js
const winston = require('winston');
const path = require('path');

class ErrorLogger {
  constructor(options = {}) {
    this.logDir = options.logDir || './logs';
    this.maxFiles = options.maxFiles || 14;
    this.maxSize = options.maxSize || '20m';
    
    this.logger = this.createLogger();
  }
  
  createLogger() {
    return winston.createLogger({
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            message,
            stack,
            ...meta
          });
        })
      ),
      transports: [
        // 错误日志文件
        new winston.transports.File({
          filename: path.join(this.logDir, 'error.log'),
          level: 'error',
          maxsize: this.maxSize,
          maxFiles: this.maxFiles,
          tailable: true
        }),
        
        // 所有日志文件
        new winston.transports.File({
          filename: path.join(this.logDir, 'combined.log'),
          maxsize: this.maxSize,
          maxFiles: this.maxFiles,
          tailable: true
        }),
        
        // 控制台输出
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ],
      
      // 处理未捕获的异常
      exceptionHandlers: [
        new winston.transports.File({
          filename: path.join(this.logDir, 'exceptions.log')
        })
      ],
      
      // 处理未处理的 Promise 拒绝
      rejectionHandlers: [
        new winston.transports.File({
          filename: path.join(this.logDir, 'rejections.log')
        })
      ]
    });
  }
  
  // 记录错误
  logError(error, context = {}) {
    const errorInfo = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      context: {
        ...context,
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    };
    
    this.logger.error('Application Error', errorInfo);
  }
  
  // 记录警告
  logWarning(message, context = {}) {
    this.logger.warn(message, context);
  }
  
  // 记录信息
  logInfo(message, context = {}) {
    this.logger.info(message, context);
  }
  
  // 创建子日志器
  createChildLogger(defaultMeta) {
    return this.logger.child(defaultMeta);
  }
}

module.exports = ErrorLogger;
```

## 使用示例

### 1. Express 应用错误处理

```javascript
// app.js
const express = require('express');
const { ExpressErrorHandler, ValidationError } = require('./express-error-middleware');
const GlobalErrorHandler = require('./global-error-handler');
const ErrorCollector = require('./error-collector');
const ErrorReporter = require('./error-reporter');

const app = express();

// 初始化错误处理组件
const globalErrorHandler = new GlobalErrorHandler({
  logDir: './logs',
  exitOnUncaught: false
});

const errorCollector = new ErrorCollector({
  maxErrors: 1000,
  flushInterval: 30000
});

const errorReporter = new ErrorReporter({
  email: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: 'errors@myapp.com',
    to: 'admin@myapp.com'
  },
  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL
  }
});

const expressErrorHandler = new ExpressErrorHandler({
  includeStack: process.env.NODE_ENV !== 'production',
  logErrors: true
});

// 中间件
app.use(express.json());

// 路由
app.get('/api/users/:id', expressErrorHandler.asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // 验证 ID
  if (!id || isNaN(id)) {
    throw new ValidationError('Invalid user ID');
  }
  
  // 模拟数据库查询
  const user = await getUserById(id);
  
  if (!user) {
    throw new NotFoundError('User not found');
  }
  
  res.json(user);
}));

// 错误处理中间件
app.use(expressErrorHandler.notFoundHandler());
app.use(expressErrorHandler.errorHandler());

// 错误收集和报告
app.use((error, req, res, next) => {
  // 收集错误
  const errorId = errorCollector.collect(error, {
    endpoint: `${req.method} ${req.path}`,
    userId: req.user?.id,
    requestId: req.id,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  // 报告严重错误
  if (error.statusCode >= 500) {
    errorReporter.reportError(error, {
      endpoint: `${req.method} ${req.path}`,
      userId: req.user?.id,
      requestId: req.id,
      errorId
    });
  }
  
  next();
});

// 设置服务器引用
const server = app.listen(3000, () => {
  console.log('Server running on port 3000');
});

globalErrorHandler.setServer(server);

// 模拟数据库查询函数
async function getUserById(id) {
  // 模拟数据库错误
  if (id === '999') {
    const error = new Error('Database connection failed');
    error.name = 'DatabaseError';
    throw error;
  }
  
  // 模拟用户不存在
  if (id === '404') {
    return null;
  }
  
  return {
    id: parseInt(id),
    name: `User ${id}`,
    email: `user${id}@example.com`
  };
}
```

### 2. 微服务错误处理

```javascript
// microservice-error-handler.js
const AsyncErrorHandler = require('./async-error-handler');
const ErrorRecovery = require('./error-recovery');

class MicroserviceErrorHandler {
  constructor(serviceName, options = {}) {
    this.serviceName = serviceName;
    this.asyncErrorHandler = new AsyncErrorHandler();
    this.errorRecovery = new ErrorRecovery(options.recovery);
    this.circuitBreaker = new Map(); // 简单的断路器实现
  }
  
  // 服务间调用错误处理
  async callService(serviceName, operation, ...args) {
    // 检查断路器状态
    if (this.isCircuitOpen(serviceName)) {
      throw new Error(`Circuit breaker is open for service: ${serviceName}`);
    }
    
    try {
      const result = await this.errorRecovery.retryWithBackoff(
        () => operation(...args)
      );
      
      if (result.success) {
        this.recordSuccess(serviceName);
        return result.data;
      } else {
        this.recordFailure(serviceName);
        throw result.error;
      }
    } catch (error) {
      this.recordFailure(serviceName);
      throw error;
    }
  }
  
  // 断路器逻辑
  isCircuitOpen(serviceName) {
    const circuit = this.circuitBreaker.get(serviceName);
    if (!circuit) return false;
    
    const now = Date.now();
    
    // 如果在冷却期内，检查是否可以尝试
    if (circuit.state === 'open' && now - circuit.lastFailure > circuit.timeout) {
      circuit.state = 'half-open';
      return false;
    }
    
    return circuit.state === 'open';
  }
  
  recordSuccess(serviceName) {
    const circuit = this.circuitBreaker.get(serviceName);
    if (circuit) {
      circuit.failures = 0;
      circuit.state = 'closed';
    }
  }
  
  recordFailure(serviceName) {
    let circuit = this.circuitBreaker.get(serviceName);
    if (!circuit) {
      circuit = {
        failures: 0,
        state: 'closed',
        threshold: 5,
        timeout: 60000, // 1分钟
        lastFailure: null
      };
      this.circuitBreaker.set(serviceName, circuit);
    }
    
    circuit.failures++;
    circuit.lastFailure = Date.now();
    
    if (circuit.failures >= circuit.threshold) {
      circuit.state = 'open';
    }
  }
}

module.exports = MicroserviceErrorHandler;
```

## 总结

本章详细介绍了 Node.js 中的错误处理最佳实践，包括：

1. **错误类型处理**：同步错误、异步错误、流错误的处理方法
2. **全局错误处理**：未捕获异常、未处理的 Promise 拒绝处理
3. **Express 错误处理**：中间件、自定义错误类、错误响应格式化
4. **错误监控**：错误收集、分析、报告和通知机制
5. **最佳实践**：错误处理策略、恢复机制、日志记录

通过合理的错误处理机制，可以显著提高 Node.js 应用的稳定性和可维护性。

## 下一步

- 学习性能优化技术
- 了解安全最佳实践
- 掌握部署和运维知识