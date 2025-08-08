# Node.js 监控和日志

本章将介绍 Node.js 应用的监控策略、日志管理和运维最佳实践。

## 应用监控

### 1. 健康检查

```javascript
// 健康检查服务
const os = require('os');
const mongoose = require('mongoose');
const redis = require('redis');

class HealthCheckService {
  constructor() {
    this.checks = new Map();
    this.setupDefaultChecks();
  }
  
  // 注册健康检查
  registerCheck(name, checkFunction, timeout = 5000) {
    this.checks.set(name, { checkFunction, timeout });
  }
  
  // 设置默认检查
  setupDefaultChecks() {
    // 数据库连接检查
    this.registerCheck('mongodb', async () => {
      if (mongoose.connection.readyState !== 1) {
        throw new Error('MongoDB not connected');
      }
      
      await mongoose.connection.db.admin().ping();
      return { status: 'healthy', latency: Date.now() };
    });
    
    // Redis 连接检查
    this.registerCheck('redis', async () => {
      const client = redis.createClient();
      await client.connect();
      
      const start = Date.now();
      await client.ping();
      const latency = Date.now() - start;
      
      await client.disconnect();
      return { status: 'healthy', latency };
    });
    
    // 内存使用检查
    this.registerCheck('memory', async () => {
      const usage = process.memoryUsage();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;
      const heapUsagePercent = (usage.heapUsed / usage.heapTotal) * 100;
      
      const status = memoryUsagePercent > 90 || heapUsagePercent > 90 ? 'unhealthy' : 'healthy';
      
      return {
        status,
        systemMemory: {
          total: Math.round(totalMemory / 1024 / 1024),
          used: Math.round(usedMemory / 1024 / 1024),
          free: Math.round(freeMemory / 1024 / 1024),
          usagePercent: Math.round(memoryUsagePercent)
        },
        heapMemory: {
          total: Math.round(usage.heapTotal / 1024 / 1024),
          used: Math.round(usage.heapUsed / 1024 / 1024),
          usagePercent: Math.round(heapUsagePercent)
        }
      };
    });
    
    // CPU 使用检查
    this.registerCheck('cpu', async () => {
      const cpus = os.cpus();
      const loadAvg = os.loadavg();
      
      // 计算 CPU 使用率
      const cpuUsage = await this.getCPUUsage();
      
      const status = loadAvg[0] > cpus.length * 0.8 ? 'unhealthy' : 'healthy';
      
      return {
        status,
        cores: cpus.length,
        loadAverage: {
          '1min': loadAvg[0].toFixed(2),
          '5min': loadAvg[1].toFixed(2),
          '15min': loadAvg[2].toFixed(2)
        },
        usage: `${cpuUsage.toFixed(2)}%`
      };
    });
    
    // 磁盘空间检查
    this.registerCheck('disk', async () => {
      const stats = await this.getDiskUsage();
      const usagePercent = ((stats.total - stats.free) / stats.total) * 100;
      
      const status = usagePercent > 90 ? 'unhealthy' : 'healthy';
      
      return {
        status,
        total: `${Math.round(stats.total / 1024 / 1024 / 1024)}GB`,
        used: `${Math.round((stats.total - stats.free) / 1024 / 1024 / 1024)}GB`,
        free: `${Math.round(stats.free / 1024 / 1024 / 1024)}GB`,
        usagePercent: Math.round(usagePercent)
      };
    });
  }
  
  // 获取 CPU 使用率
  async getCPUUsage() {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = Date.now();
      
      setTimeout(() => {
        const currentUsage = process.cpuUsage(startUsage);
        const currentTime = Date.now();
        
        const elapsedTime = (currentTime - startTime) * 1000; // 微秒
        const totalUsage = currentUsage.user + currentUsage.system;
        const cpuPercent = (totalUsage / elapsedTime) * 100;
        
        resolve(Math.min(cpuPercent, 100));
      }, 100);
    });
  }
  
  // 获取磁盘使用情况
  async getDiskUsage() {
    const fs = require('fs').promises;
    
    try {
      const stats = await fs.statfs('.');
      return {
        total: stats.blocks * stats.bsize,
        free: stats.bavail * stats.bsize
      };
    } catch (error) {
      // 备用方法
      return {
        total: 100 * 1024 * 1024 * 1024, // 假设 100GB
        free: 50 * 1024 * 1024 * 1024    // 假设 50GB 可用
      };
    }
  }
  
  // 执行单个检查
  async runCheck(name) {
    const check = this.checks.get(name);
    if (!check) {
      throw new Error(`Health check '${name}' not found`);
    }
    
    const { checkFunction, timeout } = check;
    
    try {
      const result = await Promise.race([
        checkFunction(),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Health check timeout')), timeout);
        })
      ]);
      
      return {
        name,
        status: result.status || 'healthy',
        timestamp: new Date().toISOString(),
        details: result
      };
    } catch (error) {
      return {
        name,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
  
  // 执行所有检查
  async runAllChecks() {
    const results = await Promise.allSettled(
      Array.from(this.checks.keys()).map(name => this.runCheck(name))
    );
    
    const healthChecks = results.map(result => 
      result.status === 'fulfilled' ? result.value : {
        name: 'unknown',
        status: 'error',
        timestamp: new Date().toISOString(),
        error: result.reason.message
      }
    );
    
    const overallStatus = healthChecks.every(check => check.status === 'healthy') 
      ? 'healthy' 
      : 'unhealthy';
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: healthChecks,
      uptime: process.uptime(),
      version: process.version
    };
  }
  
  // 创建健康检查端点
  createHealthEndpoint(app) {
    // 简单健康检查
    app.get('/health', async (req, res) => {
      try {
        const health = await this.runAllChecks();
        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);
      } catch (error) {
        res.status(500).json({
          status: 'error',
          timestamp: new Date().toISOString(),
          error: error.message
        });
      }
    });
    
    // 详细健康检查
    app.get('/health/detailed', async (req, res) => {
      try {
        const health = await this.runAllChecks();
        res.json(health);
      } catch (error) {
        res.status(500).json({
          status: 'error',
          timestamp: new Date().toISOString(),
          error: error.message
        });
      }
    });
    
    // 单个检查
    app.get('/health/:checkName', async (req, res) => {
      try {
        const result = await this.runCheck(req.params.checkName);
        const statusCode = result.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(result);
      } catch (error) {
        res.status(404).json({
          status: 'error',
          timestamp: new Date().toISOString(),
          error: error.message
        });
      }
    });
  }
}

// 使用示例
const healthCheck = new HealthCheckService();

// 注册自定义检查
healthCheck.registerCheck('external-api', async () => {
  const response = await fetch('https://api.example.com/health');
  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }
  
  return {
    status: 'healthy',
    latency: response.headers.get('x-response-time')
  };
});

// 在 Express 应用中使用
const express = require('express');
const app = express();

healthCheck.createHealthEndpoint(app);

module.exports = { HealthCheckService, healthCheck };
```

### 2. 性能指标收集

```javascript
// 性能指标收集器
const EventEmitter = require('events');

class MetricsCollector extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.counters = new Map();
    this.histograms = new Map();
    this.gauges = new Map();
    
    this.startCollection();
  }
  
  // 开始收集系统指标
  startCollection() {
    // 每秒收集一次指标
    this.collectionInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 1000);
    
    // 每分钟收集一次详细指标
    this.detailedInterval = setInterval(() => {
      this.collectDetailedMetrics();
    }, 60000);
  }
  
  // 收集系统指标
  collectSystemMetrics() {
    const timestamp = Date.now();
    
    // 内存指标
    const memUsage = process.memoryUsage();
    this.setGauge('memory.rss', memUsage.rss, timestamp);
    this.setGauge('memory.heap_total', memUsage.heapTotal, timestamp);
    this.setGauge('memory.heap_used', memUsage.heapUsed, timestamp);
    this.setGauge('memory.external', memUsage.external, timestamp);
    
    // CPU 指标
    const cpuUsage = process.cpuUsage();
    this.setGauge('cpu.user', cpuUsage.user, timestamp);
    this.setGauge('cpu.system', cpuUsage.system, timestamp);
    
    // 事件循环延迟
    this.measureEventLoopDelay();
    
    // 活跃句柄和请求
    this.setGauge('handles.active', process._getActiveHandles().length, timestamp);
    this.setGauge('requests.active', process._getActiveRequests().length, timestamp);
  }
  
  // 收集详细指标
  collectDetailedMetrics() {
    const timestamp = Date.now();
    
    // 系统负载
    const os = require('os');
    const loadAvg = os.loadavg();
    this.setGauge('system.load_1m', loadAvg[0], timestamp);
    this.setGauge('system.load_5m', loadAvg[1], timestamp);
    this.setGauge('system.load_15m', loadAvg[2], timestamp);
    
    // 系统内存
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    this.setGauge('system.memory_total', totalMem, timestamp);
    this.setGauge('system.memory_free', freeMem, timestamp);
    this.setGauge('system.memory_used', totalMem - freeMem, timestamp);
    
    // 运行时间
    this.setGauge('process.uptime', process.uptime(), timestamp);
  }
  
  // 测量事件循环延迟
  measureEventLoopDelay() {
    const start = process.hrtime.bigint();
    
    setImmediate(() => {
      const delay = Number(process.hrtime.bigint() - start) / 1000000; // 转换为毫秒
      this.setGauge('eventloop.delay', delay, Date.now());
      
      if (delay > 10) {
        this.emit('high_eventloop_delay', { delay });
      }
    });
  }
  
  // 计数器
  incrementCounter(name, value = 1, tags = {}) {
    const key = this.getMetricKey(name, tags);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
    
    this.emit('counter', { name, value, tags, total: current + value });
  }
  
  // 直方图（用于测量分布）
  recordHistogram(name, value, tags = {}) {
    const key = this.getMetricKey(name, tags);
    
    if (!this.histograms.has(key)) {
      this.histograms.set(key, []);
    }
    
    const values = this.histograms.get(key);
    values.push({ value, timestamp: Date.now() });
    
    // 保持最近 1000 个值
    if (values.length > 1000) {
      values.shift();
    }
    
    this.emit('histogram', { name, value, tags });
  }
  
  // 仪表盘（瞬时值）
  setGauge(name, value, timestamp = Date.now(), tags = {}) {
    const key = this.getMetricKey(name, tags);
    this.gauges.set(key, { value, timestamp, tags });
    
    this.emit('gauge', { name, value, timestamp, tags });
  }
  
  // 获取指标键
  getMetricKey(name, tags) {
    const tagString = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    
    return tagString ? `${name}{${tagString}}` : name;
  }
  
  // 获取直方图统计
  getHistogramStats(name, tags = {}) {
    const key = this.getMetricKey(name, tags);
    const values = this.histograms.get(key);
    
    if (!values || values.length === 0) {
      return null;
    }
    
    const sortedValues = values.map(v => v.value).sort((a, b) => a - b);
    const count = sortedValues.length;
    const sum = sortedValues.reduce((a, b) => a + b, 0);
    
    return {
      count,
      sum,
      min: sortedValues[0],
      max: sortedValues[count - 1],
      mean: sum / count,
      p50: this.percentile(sortedValues, 0.5),
      p90: this.percentile(sortedValues, 0.9),
      p95: this.percentile(sortedValues, 0.95),
      p99: this.percentile(sortedValues, 0.99)
    };
  }
  
  // 计算百分位数
  percentile(sortedValues, p) {
    const index = Math.ceil(sortedValues.length * p) - 1;
    return sortedValues[Math.max(0, index)];
  }
  
  // 获取所有指标
  getAllMetrics() {
    const timestamp = Date.now();
    
    return {
      timestamp,
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(
        Array.from(this.histograms.keys()).map(key => [
          key,
          this.getHistogramStats(key.split('{')[0], {})
        ])
      )
    };
  }
  
  // 重置指标
  reset() {
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
  }
  
  // 停止收集
  stop() {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
    }
    
    if (this.detailedInterval) {
      clearInterval(this.detailedInterval);
    }
  }
}

// HTTP 请求指标中间件
const createMetricsMiddleware = (metricsCollector) => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // 记录请求开始
    metricsCollector.incrementCounter('http.requests.total', 1, {
      method: req.method,
      route: req.route?.path || req.path
    });
    
    // 监听响应完成
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const statusClass = `${Math.floor(res.statusCode / 100)}xx`;
      
      // 记录响应时间
      metricsCollector.recordHistogram('http.request.duration', duration, {
        method: req.method,
        status_class: statusClass,
        status_code: res.statusCode.toString()
      });
      
      // 记录响应状态
      metricsCollector.incrementCounter('http.responses.total', 1, {
        method: req.method,
        status_class: statusClass,
        status_code: res.statusCode.toString()
      });
      
      // 记录响应大小
      const contentLength = res.get('Content-Length');
      if (contentLength) {
        metricsCollector.recordHistogram('http.response.size', parseInt(contentLength), {
          method: req.method
        });
      }
    });
    
    next();
  };
};

// 数据库查询指标
const createDatabaseMetrics = (metricsCollector) => {
  return {
    // 记录查询
    recordQuery: (operation, collection, duration, success = true) => {
      metricsCollector.recordHistogram('db.query.duration', duration, {
        operation,
        collection
      });
      
      metricsCollector.incrementCounter('db.queries.total', 1, {
        operation,
        collection,
        status: success ? 'success' : 'error'
      });
    },
    
    // 记录连接池状态
    recordConnectionPool: (active, idle, total) => {
      metricsCollector.setGauge('db.connections.active', active);
      metricsCollector.setGauge('db.connections.idle', idle);
      metricsCollector.setGauge('db.connections.total', total);
    }
  };
};

// 使用示例
const metricsCollector = new MetricsCollector();

// 监听高事件循环延迟
metricsCollector.on('high_eventloop_delay', ({ delay }) => {
  console.warn(`High event loop delay detected: ${delay.toFixed(2)}ms`);
});

// 在 Express 应用中使用
const express = require('express');
const app = express();

app.use(createMetricsMiddleware(metricsCollector));

// 指标端点
app.get('/metrics', (req, res) => {
  const metrics = metricsCollector.getAllMetrics();
  res.json(metrics);
});

// Prometheus 格式指标
app.get('/metrics/prometheus', (req, res) => {
  const metrics = metricsCollector.getAllMetrics();
  const prometheus = convertToPrometheusFormat(metrics);
  res.set('Content-Type', 'text/plain');
  res.send(prometheus);
});

// 转换为 Prometheus 格式
function convertToPrometheusFormat(metrics) {
  let output = '';
  
  // 计数器
  for (const [key, value] of Object.entries(metrics.counters)) {
    output += `# TYPE ${key.replace(/\./g, '_')} counter\n`;
    output += `${key.replace(/\./g, '_')} ${value}\n`;
  }
  
  // 仪表盘
  for (const [key, data] of Object.entries(metrics.gauges)) {
    output += `# TYPE ${key.replace(/\./g, '_')} gauge\n`;
    output += `${key.replace(/\./g, '_')} ${data.value}\n`;
  }
  
  return output;
}

module.exports = {
  MetricsCollector,
  createMetricsMiddleware,
  createDatabaseMetrics
};
```

## 日志管理

### 1. 结构化日志

```javascript
// 高级日志管理系统
const winston = require('winston');
const path = require('path');
const fs = require('fs');

class LogManager {
  constructor(config = {}) {
    this.config = {
      level: process.env.LOG_LEVEL || 'info',
      format: 'json',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      logDir: path.join(process.cwd(), 'logs'),
      ...config
    };
    
    this.ensureLogDirectory();
    this.createLoggers();
    this.setupProcessHandlers();
  }
  
  // 确保日志目录存在
  ensureLogDirectory() {
    if (!fs.existsSync(this.config.logDir)) {
      fs.mkdirSync(this.config.logDir, { recursive: true });
    }
  }
  
  // 创建日志记录器
  createLoggers() {
    // 主应用日志
    this.appLogger = winston.createLogger({
      level: this.config.level,
      format: this.createFormat('app'),
      transports: [
        new winston.transports.File({
          filename: path.join(this.config.logDir, 'app-error.log'),
          level: 'error',
          maxsize: this.config.maxFileSize,
          maxFiles: this.config.maxFiles
        }),
        new winston.transports.File({
          filename: path.join(this.config.logDir, 'app-combined.log'),
          maxsize: this.config.maxFileSize,
          maxFiles: this.config.maxFiles
        })
      ]
    });
    
    // HTTP 访问日志
    this.accessLogger = winston.createLogger({
      level: 'info',
      format: this.createFormat('access'),
      transports: [
        new winston.transports.File({
          filename: path.join(this.config.logDir, 'access.log'),
          maxsize: this.config.maxFileSize,
          maxFiles: this.config.maxFiles
        })
      ]
    });
    
    // 安全日志
    this.securityLogger = winston.createLogger({
      level: 'info',
      format: this.createFormat('security'),
      transports: [
        new winston.transports.File({
          filename: path.join(this.config.logDir, 'security.log'),
          maxsize: this.config.maxFileSize,
          maxFiles: this.config.maxFiles
        })
      ]
    });
    
    // 性能日志
    this.performanceLogger = winston.createLogger({
      level: 'info',
      format: this.createFormat('performance'),
      transports: [
        new winston.transports.File({
          filename: path.join(this.config.logDir, 'performance.log'),
          maxsize: this.config.maxFileSize,
          maxFiles: this.config.maxFiles
        })
      ]
    });
    
    // 审计日志
    this.auditLogger = winston.createLogger({
      level: 'info',
      format: this.createFormat('audit'),
      transports: [
        new winston.transports.File({
          filename: path.join(this.config.logDir, 'audit.log'),
          maxsize: this.config.maxFileSize,
          maxFiles: this.config.maxFiles
        })
      ]
    });
    
    // 开发环境添加控制台输出
    if (process.env.NODE_ENV !== 'production') {
      const consoleTransport = new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      });
      
      this.appLogger.add(consoleTransport);
    }
  }
  
  // 创建日志格式
  createFormat(loggerType) {
    return winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(info => {
        return JSON.stringify({
          timestamp: info.timestamp,
          level: info.level,
          logger: loggerType,
          message: info.message,
          ...info.meta,
          ...(info.stack && { stack: info.stack })
        });
      })
    );
  }
  
  // 设置进程处理器
  setupProcessHandlers() {
    // 未捕获异常
    process.on('uncaughtException', (error) => {
      this.appLogger.error('Uncaught Exception', {
        error: {
          message: error.message,
          stack: error.stack,
          code: error.code
        },
        process: {
          pid: process.pid,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage()
        }
      });
      
      // 给日志时间写入后退出
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    });
    
    // 未处理的 Promise 拒绝
    process.on('unhandledRejection', (reason, promise) => {
      this.appLogger.error('Unhandled Promise Rejection', {
        reason: reason instanceof Error ? {
          message: reason.message,
          stack: reason.stack
        } : reason,
        promise: promise.toString()
      });
    });
    
    // 进程退出
    process.on('exit', (code) => {
      this.appLogger.info('Process Exit', {
        exitCode: code,
        uptime: process.uptime()
      });
    });
  }
  
  // 应用日志方法
  info(message, meta = {}) {
    this.appLogger.info(message, { meta });
  }
  
  error(message, error = null, meta = {}) {
    const errorMeta = error ? {
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      }
    } : {};
    
    this.appLogger.error(message, { meta: { ...meta, ...errorMeta } });
  }
  
  warn(message, meta = {}) {
    this.appLogger.warn(message, { meta });
  }
  
  debug(message, meta = {}) {
    this.appLogger.debug(message, { meta });
  }
  
  // HTTP 访问日志
  logAccess(req, res, responseTime) {
    this.accessLogger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: res.get('Content-Length') || 0,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id,
      sessionId: req.sessionID
    });
  }
  
  // 安全事件日志
  logSecurity(event, details = {}) {
    this.securityLogger.warn('Security Event', {
      event,
      ...details,
      timestamp: new Date().toISOString()
    });
  }
  
  // 性能日志
  logPerformance(operation, duration, details = {}) {
    const level = duration > 1000 ? 'warn' : 'info';
    
    this.performanceLogger.log(level, 'Performance Metric', {
      operation,
      duration: `${duration}ms`,
      ...details
    });
  }
  
  // 审计日志
  logAudit(action, details = {}) {
    this.auditLogger.info('Audit Event', {
      action,
      ...details,
      timestamp: new Date().toISOString()
    });
  }
  
  // 创建子日志器
  createChildLogger(module, additionalMeta = {}) {
    return {
      info: (message, meta = {}) => {
        this.info(message, { module, ...additionalMeta, ...meta });
      },
      error: (message, error = null, meta = {}) => {
        this.error(message, error, { module, ...additionalMeta, ...meta });
      },
      warn: (message, meta = {}) => {
        this.warn(message, { module, ...additionalMeta, ...meta });
      },
      debug: (message, meta = {}) => {
        this.debug(message, { module, ...additionalMeta, ...meta });
      }
    };
  }
  
  // 日志轮转
  async rotateLogs() {
    const logFiles = fs.readdirSync(this.config.logDir)
      .filter(file => file.endsWith('.log'))
      .map(file => path.join(this.config.logDir, file));
    
    for (const logFile of logFiles) {
      const stats = fs.statSync(logFile);
      
      if (stats.size > this.config.maxFileSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedFile = `${logFile}.${timestamp}`;
        
        fs.renameSync(logFile, rotatedFile);
        this.info('Log file rotated', {
          originalFile: logFile,
          rotatedFile,
          size: stats.size
        });
      }
    }
  }
  
  // 清理旧日志
  async cleanupOldLogs(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 天
    const logFiles = fs.readdirSync(this.config.logDir)
      .map(file => path.join(this.config.logDir, file))
      .filter(file => {
        const stats = fs.statSync(file);
        return Date.now() - stats.mtime.getTime() > maxAge;
      });
    
    for (const logFile of logFiles) {
      fs.unlinkSync(logFile);
      this.info('Old log file deleted', { file: logFile });
    }
  }
}

// 日志中间件
const createLoggingMiddleware = (logManager) => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      logManager.logAccess(req, res, responseTime);
    });
    
    next();
  };
};

// 错误日志中间件
const createErrorLoggingMiddleware = (logManager) => {
  return (error, req, res, next) => {
    logManager.error('HTTP Error', error, {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id
    });
    
    next(error);
  };
};

// 使用示例
const logManager = new LogManager({
  level: 'debug',
  logDir: path.join(__dirname, '../logs')
});

// 创建模块特定的日志器
const dbLogger = logManager.createChildLogger('database');
const authLogger = logManager.createChildLogger('authentication');

// 在 Express 应用中使用
const express = require('express');
const app = express();

app.use(createLoggingMiddleware(logManager));
app.use(createErrorLoggingMiddleware(logManager));

// 定期清理日志
setInterval(() => {
  logManager.rotateLogs();
  logManager.cleanupOldLogs();
}, 24 * 60 * 60 * 1000); // 每天执行一次

module.exports = {
  LogManager,
  createLoggingMiddleware,
  createErrorLoggingMiddleware
};
```

### 2. 日志聚合和分析

```javascript
// 日志聚合和分析工具
const fs = require('fs');
const readline = require('readline');
const path = require('path');

class LogAnalyzer {
  constructor(logDir) {
    this.logDir = logDir;
  }
  
  // 分析访问日志
  async analyzeAccessLogs(timeRange = 24 * 60 * 60 * 1000) { // 24小时
    const logFile = path.join(this.logDir, 'access.log');
    const cutoffTime = Date.now() - timeRange;
    
    const stats = {
      totalRequests: 0,
      statusCodes: {},
      methods: {},
      topUrls: {},
      topIPs: {},
      topUserAgents: {},
      responseTimeStats: [],
      errorRequests: []
    };
    
    if (!fs.existsSync(logFile)) {
      return stats;
    }
    
    const fileStream = fs.createReadStream(logFile);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    
    for await (const line of rl) {
      try {
        const logEntry = JSON.parse(line);
        const timestamp = new Date(logEntry.timestamp).getTime();
        
        // 只分析指定时间范围内的日志
        if (timestamp < cutoffTime) continue;
        
        stats.totalRequests++;
        
        // 状态码统计
        const statusCode = logEntry.statusCode;
        stats.statusCodes[statusCode] = (stats.statusCodes[statusCode] || 0) + 1;
        
        // HTTP 方法统计
        const method = logEntry.method;
        stats.methods[method] = (stats.methods[method] || 0) + 1;
        
        // URL 统计
        const url = logEntry.url;
        stats.topUrls[url] = (stats.topUrls[url] || 0) + 1;
        
        // IP 统计
        const ip = logEntry.ip;
        stats.topIPs[ip] = (stats.topIPs[ip] || 0) + 1;
        
        // User Agent 统计
        const userAgent = logEntry.userAgent;
        if (userAgent) {
          stats.topUserAgents[userAgent] = (stats.topUserAgents[userAgent] || 0) + 1;
        }
        
        // 响应时间统计
        const responseTime = parseInt(logEntry.responseTime);
        if (!isNaN(responseTime)) {
          stats.responseTimeStats.push(responseTime);
        }
        
        // 错误请求
        if (statusCode >= 400) {
          stats.errorRequests.push({
            timestamp: logEntry.timestamp,
            method: logEntry.method,
            url: logEntry.url,
            statusCode: logEntry.statusCode,
            ip: logEntry.ip,
            userAgent: logEntry.userAgent
          });
        }
      } catch (error) {
        // 忽略无法解析的日志行
        continue;
      }
    }
    
    // 处理响应时间统计
    if (stats.responseTimeStats.length > 0) {
      stats.responseTimeStats.sort((a, b) => a - b);
      const count = stats.responseTimeStats.length;
      
      stats.responseTime = {
        min: stats.responseTimeStats[0],
        max: stats.responseTimeStats[count - 1],
        mean: stats.responseTimeStats.reduce((a, b) => a + b, 0) / count,
        median: stats.responseTimeStats[Math.floor(count / 2)],
        p95: stats.responseTimeStats[Math.floor(count * 0.95)],
        p99: stats.responseTimeStats[Math.floor(count * 0.99)]
      };
    }
    
    // 转换为排序的数组
    stats.topUrls = this.sortObject(stats.topUrls, 10);
    stats.topIPs = this.sortObject(stats.topIPs, 10);
    stats.topUserAgents = this.sortObject(stats.topUserAgents, 5);
    
    return stats;
  }
  
  // 分析错误日志
  async analyzeErrorLogs(timeRange = 24 * 60 * 60 * 1000) {
    const logFile = path.join(this.logDir, 'app-error.log');
    const cutoffTime = Date.now() - timeRange;
    
    const stats = {
      totalErrors: 0,
      errorTypes: {},
      errorMessages: {},
      errorsByHour: {},
      criticalErrors: []
    };
    
    if (!fs.existsSync(logFile)) {
      return stats;
    }
    
    const fileStream = fs.createReadStream(logFile);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    
    for await (const line of rl) {
      try {
        const logEntry = JSON.parse(line);
        const timestamp = new Date(logEntry.timestamp).getTime();
        
        if (timestamp < cutoffTime) continue;
        
        stats.totalErrors++;
        
        // 按小时分组
        const hour = new Date(timestamp).getHours();
        stats.errorsByHour[hour] = (stats.errorsByHour[hour] || 0) + 1;
        
        // 错误类型统计
        const errorType = logEntry.meta?.error?.code || 'UNKNOWN';
        stats.errorTypes[errorType] = (stats.errorTypes[errorType] || 0) + 1;
        
        // 错误消息统计
        const errorMessage = logEntry.meta?.error?.message || logEntry.message;
        stats.errorMessages[errorMessage] = (stats.errorMessages[errorMessage] || 0) + 1;
        
        // 关键错误
        if (logEntry.level === 'error' && logEntry.meta?.error?.stack) {
          stats.criticalErrors.push({
            timestamp: logEntry.timestamp,
            message: errorMessage,
            stack: logEntry.meta.error.stack,
            module: logEntry.meta?.module
          });
        }
      } catch (error) {
        continue;
      }
    }
    
    stats.errorTypes = this.sortObject(stats.errorTypes, 10);
    stats.errorMessages = this.sortObject(stats.errorMessages, 10);
    
    return stats;
  }
  
  // 分析性能日志
  async analyzePerformanceLogs(timeRange = 24 * 60 * 60 * 1000) {
    const logFile = path.join(this.logDir, 'performance.log');
    const cutoffTime = Date.now() - timeRange;
    
    const stats = {
      totalOperations: 0,
      operationStats: {},
      slowOperations: [],
      averageResponseTime: 0
    };
    
    if (!fs.existsSync(logFile)) {
      return stats;
    }
    
    const fileStream = fs.createReadStream(logFile);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    
    const allDurations = [];
    
    for await (const line of rl) {
      try {
        const logEntry = JSON.parse(line);
        const timestamp = new Date(logEntry.timestamp).getTime();
        
        if (timestamp < cutoffTime) continue;
        
        stats.totalOperations++;
        
        const operation = logEntry.operation;
        const duration = parseInt(logEntry.duration);
        
        if (!isNaN(duration)) {
          allDurations.push(duration);
          
          if (!stats.operationStats[operation]) {
            stats.operationStats[operation] = {
              count: 0,
              totalDuration: 0,
              minDuration: Infinity,
              maxDuration: 0,
              durations: []
            };
          }
          
          const opStats = stats.operationStats[operation];
          opStats.count++;
          opStats.totalDuration += duration;
          opStats.minDuration = Math.min(opStats.minDuration, duration);
          opStats.maxDuration = Math.max(opStats.maxDuration, duration);
          opStats.durations.push(duration);
          
          // 慢操作（超过 1 秒）
          if (duration > 1000) {
            stats.slowOperations.push({
              timestamp: logEntry.timestamp,
              operation,
              duration,
              details: logEntry.meta
            });
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    // 计算平均响应时间
    if (allDurations.length > 0) {
      stats.averageResponseTime = allDurations.reduce((a, b) => a + b, 0) / allDurations.length;
    }
    
    // 计算每个操作的统计信息
    for (const [operation, opStats] of Object.entries(stats.operationStats)) {
      opStats.averageDuration = opStats.totalDuration / opStats.count;
      
      // 计算百分位数
      opStats.durations.sort((a, b) => a - b);
      const count = opStats.durations.length;
      opStats.p95 = opStats.durations[Math.floor(count * 0.95)];
      opStats.p99 = opStats.durations[Math.floor(count * 0.99)];
      
      // 清理原始数据以节省内存
      delete opStats.durations;
    }
    
    return stats;
  }
  
  // 生成综合报告
  async generateReport(timeRange = 24 * 60 * 60 * 1000) {
    const [accessStats, errorStats, performanceStats] = await Promise.all([
      this.analyzeAccessLogs(timeRange),
      this.analyzeErrorLogs(timeRange),
      this.analyzePerformanceLogs(timeRange)
    ]);
    
    return {
      timestamp: new Date().toISOString(),
      timeRange: `${timeRange / (60 * 60 * 1000)} hours`,
      access: accessStats,
      errors: errorStats,
      performance: performanceStats,
      summary: {
        totalRequests: accessStats.totalRequests,
        totalErrors: errorStats.totalErrors,
        errorRate: accessStats.totalRequests > 0 
          ? (errorStats.totalErrors / accessStats.totalRequests * 100).toFixed(2) + '%'
          : '0%',
        averageResponseTime: performanceStats.averageResponseTime
          ? `${performanceStats.averageResponseTime.toFixed(2)}ms`
          : 'N/A'
      }
    };
  }
  
  // 辅助方法：排序对象
  sortObject(obj, limit = 10) {
    return Object.entries(obj)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([key, value]) => ({ key, value }));
  }
  
  // 导出报告为 JSON
  async exportReport(outputPath, timeRange = 24 * 60 * 60 * 1000) {
    const report = await this.generateReport(timeRange);
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    return report;
  }
  
  // 实时日志监控
  startRealTimeMonitoring(callback) {
    const logFiles = [
      path.join(this.logDir, 'app-error.log'),
      path.join(this.logDir, 'access.log')
    ];
    
    const watchers = logFiles.map(logFile => {
      if (fs.existsSync(logFile)) {
        return fs.watch(logFile, (eventType) => {
          if (eventType === 'change') {
            this.readLatestLogEntries(logFile, callback);
          }
        });
      }
      return null;
    }).filter(Boolean);
    
    return () => {
      watchers.forEach(watcher => watcher.close());
    };
  }
  
  // 读取最新的日志条目
  async readLatestLogEntries(logFile, callback, lines = 10) {
    try {
      const data = fs.readFileSync(logFile, 'utf8');
      const logLines = data.trim().split('\n').slice(-lines);
      
      for (const line of logLines) {
        try {
          const logEntry = JSON.parse(line);
          callback(logEntry, path.basename(logFile));
        } catch (error) {
          // 忽略无法解析的行
        }
      }
    } catch (error) {
      console.error('Error reading log file:', error.message);
    }
  }
}

// 使用示例
const logAnalyzer = new LogAnalyzer(path.join(__dirname, '../logs'));

// 生成日报
const generateDailyReport = async () => {
  try {
    const report = await logAnalyzer.generateReport(24 * 60 * 60 * 1000);
    const outputPath = path.join(__dirname, '../reports', `daily-report-${new Date().toISOString().split('T')[0]}.json`);
    
    await logAnalyzer.exportReport(outputPath);
    console.log('Daily report generated:', outputPath);
    
    return report;
  } catch (error) {
    console.error('Failed to generate daily report:', error.message);
  }
};

// 启动实时监控
const stopMonitoring = logAnalyzer.startRealTimeMonitoring((logEntry, logFile) => {
  if (logEntry.level === 'error') {
    console.warn(`[ALERT] Error detected in ${logFile}:`, logEntry.message);
    
    // 可以在这里发送告警通知
    // sendAlert(logEntry);
  }
});

// 定期生成报告
setInterval(generateDailyReport, 24 * 60 * 60 * 1000); // 每天生成一次

module.exports = {
  LogAnalyzer
};
```

## 告警系统

### 1. 告警规则和通知

```javascript
// 告警系统
const nodemailer = require('nodemailer');
const axios = require('axios');

class AlertManager {
  constructor(config = {}) {
    this.config = {
      email: {
        enabled: false,
        smtp: {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        },
        from: process.env.ALERT_FROM_EMAIL,
        to: process.env.ALERT_TO_EMAIL?.split(',') || []
      },
      slack: {
        enabled: false,
        webhookUrl: process.env.SLACK_WEBHOOK_URL
      },
      webhook: {
        enabled: false,
        url: process.env.ALERT_WEBHOOK_URL
      },
      ...config
    };
    
    this.rules = new Map();
    this.alertHistory = [];
    this.setupDefaultRules();
    this.setupEmailTransporter();
  }
  
  // 设置邮件传输器
  setupEmailTransporter() {
    if (this.config.email.enabled) {
      this.emailTransporter = nodemailer.createTransporter(this.config.email.smtp);
    }
  }
  
  // 设置默认告警规则
  setupDefaultRules() {
    // 高错误率告警
    this.addRule('high_error_rate', {
      condition: (metrics) => {
        const totalRequests = metrics.counters['http.requests.total'] || 0;
        const errorRequests = metrics.counters['http.responses.5xx'] || 0;
        
        if (totalRequests > 100) {
          const errorRate = (errorRequests / totalRequests) * 100;
          return errorRate > 5; // 错误率超过 5%
        }
        
        return false;
      },
      severity: 'high',
      message: 'High error rate detected',
      cooldown: 5 * 60 * 1000 // 5 分钟冷却期
    });
    
    // 高内存使用告警
    this.addRule('high_memory_usage', {
      condition: (metrics) => {
        const heapUsed = metrics.gauges['memory.heap_used']?.value || 0;
        const heapTotal = metrics.gauges['memory.heap_total']?.value || 1;
        
        const memoryUsage = (heapUsed / heapTotal) * 100;
        return memoryUsage > 90; // 内存使用超过 90%
      },
      severity: 'medium',
      message: 'High memory usage detected',
      cooldown: 10 * 60 * 1000 // 10 分钟冷却期
    });
    
    // 高响应时间告警
    this.addRule('high_response_time', {
      condition: (metrics) => {
        const responseTimeStats = metrics.histograms['http.request.duration'];
        if (responseTimeStats && responseTimeStats.p95) {
          return responseTimeStats.p95 > 2000; // P95 响应时间超过 2 秒
        }
        return false;
      },
      severity: 'medium',
      message: 'High response time detected',
      cooldown: 5 * 60 * 1000
    });
    
    // 事件循环延迟告警
    this.addRule('high_eventloop_delay', {
      condition: (metrics) => {
        const eventLoopDelay = metrics.gauges['eventloop.delay']?.value || 0;
        return eventLoopDelay > 100; // 事件循环延迟超过 100ms
      },
      severity: 'high',
      message: 'High event loop delay detected',
      cooldown: 2 * 60 * 1000
    });
    
    // 数据库连接告警
    this.addRule('database_connection_issues', {
      condition: (metrics) => {
        const activeConnections = metrics.gauges['db.connections.active']?.value || 0;
        const totalConnections = metrics.gauges['db.connections.total']?.value || 1;
        
        const connectionUsage = (activeConnections / totalConnections) * 100;
        return connectionUsage > 95; // 连接池使用率超过 95%
      },
      severity: 'high',
      message: 'Database connection pool nearly exhausted',
      cooldown: 5 * 60 * 1000
    });
  }
  
  // 添加告警规则
  addRule(name, rule) {
    this.rules.set(name, {
      ...rule,
      lastTriggered: 0
    });
  }
  
  // 移除告警规则
  removeRule(name) {
    this.rules.delete(name);
  }
  
  // 检查告警条件
  async checkAlerts(metrics) {
    const currentTime = Date.now();
    const triggeredAlerts = [];
    
    for (const [name, rule] of this.rules) {
      try {
        // 检查冷却期
        if (currentTime - rule.lastTriggered < rule.cooldown) {
          continue;
        }
        
        // 检查条件
        if (rule.condition(metrics)) {
          rule.lastTriggered = currentTime;
          
          const alert = {
            name,
            severity: rule.severity,
            message: rule.message,
            timestamp: new Date().toISOString(),
            metrics: this.extractRelevantMetrics(metrics, name)
          };
          
          triggeredAlerts.push(alert);
          this.alertHistory.push(alert);
          
          // 发送告警
          await this.sendAlert(alert);
        }
      } catch (error) {
        console.error(`Error checking alert rule '${name}':`, error.message);
      }
    }
    
    // 保持告警历史记录在合理范围内
    if (this.alertHistory.length > 1000) {
      this.alertHistory = this.alertHistory.slice(-500);
    }
    
    return triggeredAlerts;
  }
  
  // 提取相关指标
  extractRelevantMetrics(metrics, ruleName) {
    const relevantMetrics = {};
    
    switch (ruleName) {
      case 'high_error_rate':
        relevantMetrics.totalRequests = metrics.counters['http.requests.total'];
        relevantMetrics.errorRequests = metrics.counters['http.responses.5xx'];
        break;
      
      case 'high_memory_usage':
        relevantMetrics.heapUsed = metrics.gauges['memory.heap_used'];
        relevantMetrics.heapTotal = metrics.gauges['memory.heap_total'];
        break;
      
      case 'high_response_time':
        relevantMetrics.responseTime = metrics.histograms['http.request.duration'];
        break;
      
      case 'high_eventloop_delay':
        relevantMetrics.eventLoopDelay = metrics.gauges['eventloop.delay'];
        break;
      
      case 'database_connection_issues':
        relevantMetrics.activeConnections = metrics.gauges['db.connections.active'];
        relevantMetrics.totalConnections = metrics.gauges['db.connections.total'];
        break;
    }
    
    return relevantMetrics;
  }
  
  // 发送告警
  async sendAlert(alert) {
    const promises = [];
    
    if (this.config.email.enabled) {
      promises.push(this.sendEmailAlert(alert));
    }
    
    if (this.config.slack.enabled) {
      promises.push(this.sendSlackAlert(alert));
    }
    
    if (this.config.webhook.enabled) {
      promises.push(this.sendWebhookAlert(alert));
    }
    
    await Promise.allSettled(promises);
  }
  
  // 发送邮件告警
  async sendEmailAlert(alert) {
    if (!this.emailTransporter) {
      throw new Error('Email transporter not configured');
    }
    
    const subject = `[${alert.severity.toUpperCase()}] ${alert.message}`;
    const html = this.generateEmailTemplate(alert);
    
    const mailOptions = {
      from: this.config.email.from,
      to: this.config.email.to,
      subject,
      html
    };
    
    await this.emailTransporter.sendMail(mailOptions);
  }
  
  // 发送 Slack 告警
  async sendSlackAlert(alert) {
    const color = {
      low: '#36a64f',
      medium: '#ff9500',
      high: '#ff0000'
    }[alert.severity] || '#808080';
    
    const payload = {
      attachments: [{
        color,
        title: `${alert.severity.toUpperCase()} Alert: ${alert.message}`,
        fields: [
          {
            title: 'Alert Name',
            value: alert.name,
            short: true
          },
          {
            title: 'Timestamp',
            value: alert.timestamp,
            short: true
          },
          {
            title: 'Metrics',
            value: JSON.stringify(alert.metrics, null, 2),
            short: false
          }
        ],
        footer: 'Node.js Monitoring System',
        ts: Math.floor(Date.now() / 1000)
      }]
    };
    
    await axios.post(this.config.slack.webhookUrl, payload);
  }
  
  // 发送 Webhook 告警
  async sendWebhookAlert(alert) {
    await axios.post(this.config.webhook.url, alert, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  
  // 生成邮件模板
  generateEmailTemplate(alert) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .alert-header { background-color: ${alert.severity === 'high' ? '#ff4444' : alert.severity === 'medium' ? '#ff9500' : '#36a64f'}; color: white; padding: 15px; border-radius: 5px; }
          .alert-content { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 10px; }
          .metrics { background-color: #e9e9e9; padding: 10px; border-radius: 3px; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="alert-header">
          <h2>${alert.severity.toUpperCase()} Alert: ${alert.message}</h2>
        </div>
        <div class="alert-content">
          <p><strong>Alert Name:</strong> ${alert.name}</p>
          <p><strong>Timestamp:</strong> ${alert.timestamp}</p>
          <p><strong>Severity:</strong> ${alert.severity}</p>
          <h3>Relevant Metrics:</h3>
          <div class="metrics">
            <pre>${JSON.stringify(alert.metrics, null, 2)}</pre>
          </div>
        </div>
      </body>
      </html>
    `;
  }
  
  // 获取告警历史
  getAlertHistory(limit = 50) {
    return this.alertHistory.slice(-limit);
  }
  
  // 获取告警统计
  getAlertStats(timeRange = 24 * 60 * 60 * 1000) {
    const cutoffTime = Date.now() - timeRange;
    const recentAlerts = this.alertHistory.filter(alert => 
      new Date(alert.timestamp).getTime() > cutoffTime
    );
    
    const stats = {
      total: recentAlerts.length,
      bySeverity: {},
      byRule: {},
      timeline: []
    };
    
    recentAlerts.forEach(alert => {
      // 按严重程度统计
      stats.bySeverity[alert.severity] = (stats.bySeverity[alert.severity] || 0) + 1;
      
      // 按规则统计
      stats.byRule[alert.name] = (stats.byRule[alert.name] || 0) + 1;
      
      // 时间线
      stats.timeline.push({
        timestamp: alert.timestamp,
        name: alert.name,
        severity: alert.severity
      });
    });
    
    return stats;
  }
}

// 使用示例
const alertManager = new AlertManager({
  email: {
    enabled: true,
    from: 'alerts@example.com',
    to: ['admin@example.com', 'dev@example.com']
  },
  slack: {
    enabled: true,
    webhookUrl: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
  }
});

// 自定义告警规则
alertManager.addRule('custom_business_metric', {
  condition: (metrics) => {
    const orderCount = metrics.counters['business.orders.total'] || 0;
    const lastHourOrders = orderCount; // 假设这是最近一小时的订单数
    
    return lastHourOrders < 10; // 如果一小时内订单少于 10 个则告警
  },
  severity: 'medium',
  message: 'Low order volume detected',
  cooldown: 30 * 60 * 1000 // 30 分钟冷却期
});

module.exports = { AlertManager };
```

### 2. 监控仪表板

```javascript
// 监控仪表板 API
const express = require('express');
const path = require('path');

class MonitoringDashboard {
  constructor(metricsCollector, logAnalyzer, alertManager) {
    this.metricsCollector = metricsCollector;
    this.logAnalyzer = logAnalyzer;
    this.alertManager = alertManager;
    this.app = express();
    
    this.setupRoutes();
    this.setupWebSocket();
  }
  
  // 设置路由
  setupRoutes() {
    // 静态文件服务
    this.app.use('/static', express.static(path.join(__dirname, 'dashboard-static')));
    
    // 主仪表板页面
    this.app.get('/', (req, res) => {
      res.send(this.generateDashboardHTML());
    });
    
    // 实时指标 API
    this.app.get('/api/metrics', (req, res) => {
      const metrics = this.metricsCollector.getAllMetrics();
      res.json(metrics);
    });
    
    // 历史指标 API
    this.app.get('/api/metrics/history', async (req, res) => {
      const timeRange = parseInt(req.query.timeRange) || 24 * 60 * 60 * 1000;
      const interval = parseInt(req.query.interval) || 60 * 1000; // 1 分钟间隔
      
      const history = await this.getMetricsHistory(timeRange, interval);
      res.json(history);
    });
    
    // 日志分析 API
    this.app.get('/api/logs/analysis', async (req, res) => {
      const timeRange = parseInt(req.query.timeRange) || 24 * 60 * 60 * 1000;
      const analysis = await this.logAnalyzer.generateReport(timeRange);
      res.json(analysis);
    });
    
    // 告警历史 API
    this.app.get('/api/alerts', (req, res) => {
      const limit = parseInt(req.query.limit) || 50;
      const alerts = this.alertManager.getAlertHistory(limit);
      res.json(alerts);
    });
    
    // 告警统计 API
    this.app.get('/api/alerts/stats', (req, res) => {
      const timeRange = parseInt(req.query.timeRange) || 24 * 60 * 60 * 1000;
      const stats = this.alertManager.getAlertStats(timeRange);
      res.json(stats);
    });
    
    // 系统健康检查 API
    this.app.get('/api/health', async (req, res) => {
      const health = await this.getSystemHealth();
      res.json(health);
    });
    
    // 性能概览 API
    this.app.get('/api/performance', (req, res) => {
      const performance = this.getPerformanceOverview();
      res.json(performance);
    });
  }
  
  // 设置 WebSocket 实时更新
  setupWebSocket() {
    const http = require('http');
    const socketIo = require('socket.io');
    
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server);
    
    this.io.on('connection', (socket) => {
      console.log('Dashboard client connected');
      
      // 发送初始数据
      socket.emit('metrics', this.metricsCollector.getAllMetrics());
      
      // 定期发送更新
      const interval = setInterval(() => {
        socket.emit('metrics', this.metricsCollector.getAllMetrics());
      }, 5000); // 每 5 秒更新一次
      
      socket.on('disconnect', () => {
        clearInterval(interval);
        console.log('Dashboard client disconnected');
      });
    });
    
    // 监听告警事件
    this.alertManager.on('alert', (alert) => {
      this.io.emit('alert', alert);
    });
  }
  
  // 获取指标历史
  async getMetricsHistory(timeRange, interval) {
    // 这里应该从持久化存储中获取历史数据
    // 为了演示，我们生成一些模拟数据
    const history = [];
    const now = Date.now();
    const points = Math.floor(timeRange / interval);
    
    for (let i = points; i >= 0; i--) {
      const timestamp = now - (i * interval);
      const metrics = this.metricsCollector.getAllMetrics();
      
      history.push({
        timestamp,
        ...metrics
      });
    }
    
    return history;
  }
  
  // 获取系统健康状态
  async getSystemHealth() {
    const metrics = this.metricsCollector.getAllMetrics();
    const alerts = this.alertManager.getAlertStats(60 * 60 * 1000); // 最近 1 小时
    
    // 计算健康分数
    let healthScore = 100;
    
    // 根据告警数量扣分
    healthScore -= alerts.total * 5;
    
    // 根据错误率扣分
    const totalRequests = metrics.counters['http.requests.total'] || 0;
    const errorRequests = metrics.counters['http.responses.5xx'] || 0;
    if (totalRequests > 0) {
      const errorRate = (errorRequests / totalRequests) * 100;
      healthScore -= errorRate * 10;
    }
    
    // 根据响应时间扣分
    const responseTime = metrics.histograms['http.request.duration'];
    if (responseTime && responseTime.p95 > 1000) {
      healthScore -= (responseTime.p95 - 1000) / 100;
    }
    
    healthScore = Math.max(0, Math.min(100, healthScore));
    
    return {
      score: Math.round(healthScore),
      status: healthScore > 80 ? 'healthy' : healthScore > 60 ? 'warning' : 'critical',
      uptime: process.uptime(),
      version: process.version,
      environment: process.env.NODE_ENV || 'development',
      lastUpdate: new Date().toISOString()
    };
  }
  
  // 获取性能概览
  getPerformanceOverview() {
    const metrics = this.metricsCollector.getAllMetrics();
    
    return {
      memory: {
        heapUsed: metrics.gauges['memory.heap_used']?.value || 0,
        heapTotal: metrics.gauges['memory.heap_total']?.value || 0,
        rss: metrics.gauges['memory.rss']?.value || 0
      },
      cpu: {
        usage: metrics.gauges['cpu.user']?.value || 0,
        loadAverage: {
          '1m': metrics.gauges['system.load_1m']?.value || 0,
          '5m': metrics.gauges['system.load_5m']?.value || 0,
          '15m': metrics.gauges['system.load_15m']?.value || 0
        }
      },
      eventLoop: {
        delay: metrics.gauges['eventloop.delay']?.value || 0
      },
      http: {
        totalRequests: metrics.counters['http.requests.total'] || 0,
        responseTime: metrics.histograms['http.request.duration'] || {},
        errorRate: this.calculateErrorRate(metrics)
      },
      database: {
        activeConnections: metrics.gauges['db.connections.active']?.value || 0,
        totalConnections: metrics.gauges['db.connections.total']?.value || 0
      }
    };
  }
  
  // 计算错误率
  calculateErrorRate(metrics) {
    const totalRequests = metrics.counters['http.requests.total'] || 0;
    const errorRequests = (metrics.counters['http.responses.4xx'] || 0) + 
                         (metrics.counters['http.responses.5xx'] || 0);
    
    return totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;
  }
  
  // 生成仪表板 HTML
  generateDashboardHTML() {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Node.js Monitoring Dashboard</title>
        <script src="https://cdn.socket.io/4.0.0/socket.io.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; }
          .header { background: #2c3e50; color: white; padding: 1rem; text-align: center; }
          .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
          .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; }
          .card { background: white; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .metric { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
          .metric-label { font-weight: 600; color: #555; }
          .metric-value { font-size: 1.2rem; font-weight: bold; }
          .status-healthy { color: #27ae60; }
          .status-warning { color: #f39c12; }
          .status-critical { color: #e74c3c; }
          .chart-container { position: relative; height: 300px; }
          .alert { padding: 0.75rem; margin-bottom: 0.5rem; border-radius: 4px; }
          .alert-high { background: #ffebee; border-left: 4px solid #f44336; }
          .alert-medium { background: #fff3e0; border-left: 4px solid #ff9800; }
          .alert-low { background: #e8f5e8; border-left: 4px solid #4caf50; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Node.js Monitoring Dashboard</h1>
          <p>Real-time application monitoring and alerting</p>
        </div>
        
        <div class="container">
          <div class="grid">
            <!-- 系统健康 -->
            <div class="card">
              <h3>System Health</h3>
              <div class="metric">
                <span class="metric-label">Health Score</span>
                <span class="metric-value" id="health-score">--</span>
              </div>
              <div class="metric">
                <span class="metric-label">Status</span>
                <span class="metric-value" id="health-status">--</span>
              </div>
              <div class="metric">
                <span class="metric-label">Uptime</span>
                <span class="metric-value" id="uptime">--</span>
              </div>
            </div>
            
            <!-- 内存使用 -->
            <div class="card">
              <h3>Memory Usage</h3>
              <div class="chart-container">
                <canvas id="memory-chart"></canvas>
              </div>
            </div>
            
            <!-- HTTP 指标 -->
            <div class="card">
              <h3>HTTP Metrics</h3>
              <div class="metric">
                <span class="metric-label">Total Requests</span>
                <span class="metric-value" id="total-requests">--</span>
              </div>
              <div class="metric">
                <span class="metric-label">Error Rate</span>
                <span class="metric-value" id="error-rate">--</span>
              </div>
              <div class="metric">
                <span class="metric-label">Avg Response Time</span>
                <span class="metric-value" id="avg-response-time">--</span>
              </div>
            </div>
            
            <!-- 最近告警 -->
            <div class="card">
              <h3>Recent Alerts</h3>
              <div id="recent-alerts">
                <p>No recent alerts</p>
              </div>
            </div>
          </div>
        </div>
        
        <script>
          const socket = io();
          let memoryChart;
          
          // 初始化图表
          function initCharts() {
            const ctx = document.getElementById('memory-chart').getContext('2d');
            memoryChart = new Chart(ctx, {
              type: 'line',
              data: {
                labels: [],
                datasets: [{
                  label: 'Heap Used (MB)',
                  data: [],
                  borderColor: '#3498db',
                  backgroundColor: 'rgba(52, 152, 219, 0.1)',
                  tension: 0.4
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true
                  }
                }
              }
            });
          }
          
          // 更新指标显示
          function updateMetrics(metrics) {
            // 更新内存图表
            const heapUsed = metrics.gauges['memory.heap_used']?.value || 0;
            const heapUsedMB = Math.round(heapUsed / 1024 / 1024);
            
            const now = new Date().toLocaleTimeString();
            memoryChart.data.labels.push(now);
            memoryChart.data.datasets[0].data.push(heapUsedMB);
            
            // 保持最近 20 个数据点
            if (memoryChart.data.labels.length > 20) {
              memoryChart.data.labels.shift();
              memoryChart.data.datasets[0].data.shift();
            }
            
            memoryChart.update('none');
            
            // 更新 HTTP 指标
            const totalRequests = metrics.counters['http.requests.total'] || 0;
            document.getElementById('total-requests').textContent = totalRequests.toLocaleString();
            
            const errorRate = calculateErrorRate(metrics);
            document.getElementById('error-rate').textContent = errorRate.toFixed(2) + '%';
            
            const responseTime = metrics.histograms['http.request.duration'];
            const avgResponseTime = responseTime?.mean || 0;
            document.getElementById('avg-response-time').textContent = Math.round(avgResponseTime) + 'ms';
          }
          
          // 计算错误率
          function calculateErrorRate(metrics) {
            const totalRequests = metrics.counters['http.requests.total'] || 0;
            const errorRequests = (metrics.counters['http.responses.4xx'] || 0) + 
                                 (metrics.counters['http.responses.5xx'] || 0);
            
            return totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;
          }
          
          // 更新系统健康状态
          async function updateHealth() {
            try {
              const response = await fetch('/api/health');
              const health = await response.json();
              
              document.getElementById('health-score').textContent = health.score;
              
              const statusElement = document.getElementById('health-status');
              statusElement.textContent = health.status.toUpperCase();
              statusElement.className = `metric-value status-${health.status}`;
              
              const uptimeHours = Math.floor(health.uptime / 3600);
              const uptimeMinutes = Math.floor((health.uptime % 3600) / 60);
              document.getElementById('uptime').textContent = `${uptimeHours}h ${uptimeMinutes}m`;
            } catch (error) {
              console.error('Failed to fetch health data:', error);
            }
          }
          
          // 更新告警显示
          async function updateAlerts() {
            try {
              const response = await fetch('/api/alerts?limit=5');
              const alerts = await response.json();
              
              const alertsContainer = document.getElementById('recent-alerts');
              
              if (alerts.length === 0) {
                alertsContainer.innerHTML = '<p>No recent alerts</p>';
                return;
              }
              
              alertsContainer.innerHTML = alerts.map(alert => `
                <div class="alert alert-${alert.severity}">
                  <strong>${alert.message}</strong><br>
                  <small>${new Date(alert.timestamp).toLocaleString()}</small>
                </div>
              `).join('');
            } catch (error) {
              console.error('Failed to fetch alerts:', error);
            }
          }
          
          // Socket 事件监听
          socket.on('metrics', updateMetrics);
          
          socket.on('alert', (alert) => {
            // 显示新告警通知
            console.log('New alert:', alert);
            updateAlerts();
          });
          
          // 初始化
          document.addEventListener('DOMContentLoaded', () => {
            initCharts();
            updateHealth();
            updateAlerts();
            
            // 定期更新健康状态和告警
            setInterval(updateHealth, 30000); // 每 30 秒
            setInterval(updateAlerts, 60000);  // 每分钟
          });
        </script>
      </body>
      </html>
    `;
  }
  
  // 启动仪表板服务器
  start(port = 3001) {
    this.server.listen(port, () => {
      console.log(`Monitoring dashboard running on http://localhost:${port}`);
    });
  }
}

module.exports = { MonitoringDashboard };
```

## 最佳实践

### 1. 监控策略

- **分层监控**：应用层、系统层、业务层
- **关键指标**：响应时间、错误率、吞吐量、资源使用
- **告警阈值**：根据历史数据设置合理阈值
- **监控覆盖**：覆盖所有关键路径和组件

### 2. 日志管理

- **结构化日志**：使用 JSON 格式便于分析
- **日志级别**：合理使用不同级别
- **日志轮转**：防止日志文件过大
- **敏感信息**：避免记录敏感数据

### 3. 告警设计

- **告警分级**：区分不同严重程度
- **告警去重**：避免重复告警
- **告警恢复**：及时通知问题解决
- **告警测试**：定期测试告警机制

### 4. 性能优化

- **异步处理**：避免阻塞主线程
- **批量操作**：减少 I/O 操作次数
- **缓存策略**：合理使用缓存
- **资源清理**：及时释放资源

## 总结

本章介绍了 Node.js 应用的监控和日志管理，包括：

- **健康检查**：系统状态监控
- **性能指标**：关键指标收集和分析
- **日志管理**：结构化日志和分析
- **告警系统**：智能告警和通知
- **监控仪表板**：可视化监控界面

通过完善的监控体系，可以及时发现和解决问题，确保应用的稳定运行。

