# Node.js 微服务架构

本章将介绍如何使用 Node.js 构建微服务架构，包括服务设计、通信模式、服务发现、负载均衡等核心概念。

## 微服务基础

### 1. 微服务架构概述

微服务架构是一种将单一应用程序开发为一组小型服务的方法，每个服务运行在自己的进程中，并使用轻量级机制（通常是 HTTP API）进行通信。

**优势：**
- 独立部署和扩展
- 技术栈多样性
- 故障隔离
- 团队独立性

**挑战：**
- 分布式系统复杂性
- 服务间通信
- 数据一致性
- 监控和调试

### 2. 服务拆分策略

```javascript
// 服务拆分示例：电商系统

// 用户服务 (User Service)
const userService = {
  responsibilities: [
    '用户注册和认证',
    '用户信息管理',
    '用户权限控制'
  ],
  endpoints: [
    'POST /users/register',
    'POST /users/login',
    'GET /users/:id',
    'PUT /users/:id',
    'DELETE /users/:id'
  ]
};

// 产品服务 (Product Service)
const productService = {
  responsibilities: [
    '产品信息管理',
    '库存管理',
    '产品搜索'
  ],
  endpoints: [
    'GET /products',
    'GET /products/:id',
    'POST /products',
    'PUT /products/:id',
    'DELETE /products/:id'
  ]
};

// 订单服务 (Order Service)
const orderService = {
  responsibilities: [
    '订单创建和管理',
    '订单状态跟踪',
    '订单历史'
  ],
  endpoints: [
    'POST /orders',
    'GET /orders/:id',
    'GET /orders/user/:userId',
    'PUT /orders/:id/status'
  ]
};

// 支付服务 (Payment Service)
const paymentService = {
  responsibilities: [
    '支付处理',
    '退款处理',
    '支付记录'
  ],
  endpoints: [
    'POST /payments',
    'GET /payments/:id',
    'POST /payments/:id/refund'
  ]
};
```

## 服务间通信

### 1. 同步通信 - HTTP/REST

```javascript
// HTTP 客户端封装
const axios = require('axios');
const CircuitBreaker = require('opossum');

class ServiceClient {
  constructor(baseURL, options = {}) {
    this.client = axios.create({
      baseURL,
      timeout: options.timeout || 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    this.setupInterceptors();
    this.setupCircuitBreaker(options.circuitBreaker);
  }
  
  // 设置拦截器
  setupInterceptors() {
    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        // 添加认证头
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // 添加请求 ID
        config.headers['X-Request-ID'] = this.generateRequestId();
        
        console.log(`[HTTP] ${config.method.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[HTTP] Request error:', error.message);
        return Promise.reject(error);
      }
    );
    
    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[HTTP] ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error(`[HTTP] Response error:`, {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url
        });
        
        // 处理特定错误
        if (error.response?.status === 401) {
          this.handleUnauthorized();
        }
        
        return Promise.reject(error);
      }
    );
  }
  
  // 设置熔断器
  setupCircuitBreaker(options = {}) {
    const breakerOptions = {
      timeout: 3000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      ...options
    };
    
    this.breaker = new CircuitBreaker(this.makeRequest.bind(this), breakerOptions);
    
    this.breaker.on('open', () => {
      console.warn('[Circuit Breaker] Circuit opened');
    });
    
    this.breaker.on('halfOpen', () => {
      console.info('[Circuit Breaker] Circuit half-opened');
    });
    
    this.breaker.on('close', () => {
      console.info('[Circuit Breaker] Circuit closed');
    });
  }
  
  // 发起请求
  async makeRequest(config) {
    const response = await this.client(config);
    return response.data;
  }
  
  // 通过熔断器发起请求
  async request(config) {
    try {
      return await this.breaker.fire(config);
    } catch (error) {
      if (error.code === 'EOPENBREAKER') {
        throw new Error('Service temporarily unavailable');
      }
      throw error;
    }
  }
  
  // GET 请求
  async get(url, config = {}) {
    return this.request({ method: 'GET', url, ...config });
  }
  
  // POST 请求
  async post(url, data, config = {}) {
    return this.request({ method: 'POST', url, data, ...config });
  }
  
  // PUT 请求
  async put(url, data, config = {}) {
    return this.request({ method: 'PUT', url, data, ...config });
  }
  
  // DELETE 请求
  async delete(url, config = {}) {
    return this.request({ method: 'DELETE', url, ...config });
  }
  
  // 获取认证令牌
  getAuthToken() {
    // 从环境变量、配置文件或其他地方获取
    return process.env.SERVICE_TOKEN;
  }
  
  // 生成请求 ID
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // 处理未授权错误
  handleUnauthorized() {
    console.error('Service authentication failed');
    // 可以触发重新认证或其他处理逻辑
  }
}

// 服务客户端工厂
class ServiceClientFactory {
  constructor() {
    this.clients = new Map();
  }
  
  // 创建服务客户端
  createClient(serviceName, config) {
    if (!this.clients.has(serviceName)) {
      const client = new ServiceClient(config.baseURL, config.options);
      this.clients.set(serviceName, client);
    }
    
    return this.clients.get(serviceName);
  }
  
  // 获取用户服务客户端
  getUserService() {
    return this.createClient('user', {
      baseURL: process.env.USER_SERVICE_URL || 'http://localhost:3001',
      options: {
        timeout: 5000,
        circuitBreaker: {
          errorThresholdPercentage: 60
        }
      }
    });
  }
  
  // 获取产品服务客户端
  getProductService() {
    return this.createClient('product', {
      baseURL: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
      options: {
        timeout: 3000
      }
    });
  }
  
  // 获取订单服务客户端
  getOrderService() {
    return this.createClient('order', {
      baseURL: process.env.ORDER_SERVICE_URL || 'http://localhost:3003',
      options: {
        timeout: 10000 // 订单处理可能需要更长时间
      }
    });
  }
}

// 使用示例
const serviceFactory = new ServiceClientFactory();

// 在订单服务中调用用户服务
class OrderController {
  constructor() {
    this.userService = serviceFactory.getUserService();
    this.productService = serviceFactory.getProductService();
  }
  
  async createOrder(req, res) {
    try {
      const { userId, items } = req.body;
      
      // 验证用户
      const user = await this.userService.get(`/users/${userId}`);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // 验证产品和库存
      const productPromises = items.map(item => 
        this.productService.get(`/products/${item.productId}`)
      );
      
      const products = await Promise.all(productPromises);
      
      // 检查库存
      for (let i = 0; i < items.length; i++) {
        const product = products[i];
        const item = items[i];
        
        if (product.stock < item.quantity) {
          return res.status(400).json({
            error: `Insufficient stock for product ${product.name}`
          });
        }
      }
      
      // 创建订单
      const order = {
        userId,
        items: items.map((item, index) => ({
          productId: item.productId,
          productName: products[index].name,
          price: products[index].price,
          quantity: item.quantity
        })),
        totalAmount: items.reduce((total, item, index) => 
          total + (products[index].price * item.quantity), 0
        ),
        status: 'pending',
        createdAt: new Date()
      };
      
      // 保存订单到数据库
      const savedOrder = await this.saveOrder(order);
      
      res.status(201).json(savedOrder);
    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  async saveOrder(order) {
    // 保存订单到数据库的逻辑
    // 这里简化处理
    return { id: Date.now(), ...order };
  }
}

module.exports = {
  ServiceClient,
  ServiceClientFactory,
  OrderController
};
```

### 2. 异步通信 - 消息队列

```javascript
// 消息队列抽象层
const EventEmitter = require('events');

class MessageBroker extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = config;
    this.subscribers = new Map();
    this.deadLetterQueue = [];
  }
  
  // 发布消息
  async publish(topic, message, options = {}) {
    const messageWithMetadata = {
      id: this.generateMessageId(),
      topic,
      payload: message,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      ...options
    };
    
    console.log(`[MessageBroker] Publishing to ${topic}:`, messageWithMetadata.id);
    
    // 触发事件
    this.emit('message', messageWithMetadata);
    
    // 处理订阅者
    const subscribers = this.subscribers.get(topic) || [];
    
    for (const subscriber of subscribers) {
      try {
        await this.deliverMessage(subscriber, messageWithMetadata);
      } catch (error) {
        console.error(`[MessageBroker] Delivery failed for ${subscriber.name}:`, error.message);
        await this.handleDeliveryFailure(messageWithMetadata, subscriber, error);
      }
    }
  }
  
  // 订阅消息
  subscribe(topic, handler, options = {}) {
    const subscriber = {
      name: options.name || `subscriber_${Date.now()}`,
      handler,
      options: {
        maxRetries: 3,
        retryDelay: 1000,
        ...options
      }
    };
    
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, []);
    }
    
    this.subscribers.get(topic).push(subscriber);
    
    console.log(`[MessageBroker] Subscribed ${subscriber.name} to ${topic}`);
    
    // 返回取消订阅函数
    return () => {
      const subscribers = this.subscribers.get(topic);
      const index = subscribers.indexOf(subscriber);
      if (index > -1) {
        subscribers.splice(index, 1);
        console.log(`[MessageBroker] Unsubscribed ${subscriber.name} from ${topic}`);
      }
    };
  }
  
  // 投递消息
  async deliverMessage(subscriber, message) {
    const startTime = Date.now();
    
    try {
      await subscriber.handler(message.payload, message);
      
      const duration = Date.now() - startTime;
      console.log(`[MessageBroker] Message ${message.id} processed by ${subscriber.name} in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[MessageBroker] Message ${message.id} failed in ${subscriber.name} after ${duration}ms:`, error.message);
      throw error;
    }
  }
  
  // 处理投递失败
  async handleDeliveryFailure(message, subscriber, error) {
    message.retryCount++;
    
    if (message.retryCount <= subscriber.options.maxRetries) {
      console.log(`[MessageBroker] Retrying message ${message.id} (attempt ${message.retryCount})`);
      
      // 延迟重试
      setTimeout(async () => {
        try {
          await this.deliverMessage(subscriber, message);
        } catch (retryError) {
          await this.handleDeliveryFailure(message, subscriber, retryError);
        }
      }, subscriber.options.retryDelay * message.retryCount);
    } else {
      console.error(`[MessageBroker] Message ${message.id} moved to dead letter queue`);
      this.deadLetterQueue.push({
        message,
        subscriber: subscriber.name,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      this.emit('deadLetter', message, subscriber, error);
    }
  }
  
  // 生成消息 ID
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // 获取死信队列
  getDeadLetterQueue() {
    return this.deadLetterQueue;
  }
  
  // 清理死信队列
  clearDeadLetterQueue() {
    this.deadLetterQueue.length = 0;
  }
}

// Redis 消息代理实现
const redis = require('redis');

class RedisMessageBroker extends MessageBroker {
  constructor(config = {}) {
    super(config);
    
    this.publisher = redis.createClient(config.redis);
    this.subscriber = redis.createClient(config.redis);
    
    this.setupRedisHandlers();
  }
  
  // 设置 Redis 处理器
  setupRedisHandlers() {
    this.subscriber.on('message', async (channel, message) => {
      try {
        const parsedMessage = JSON.parse(message);
        await this.handleRedisMessage(channel, parsedMessage);
      } catch (error) {
        console.error('[RedisMessageBroker] Message parsing error:', error.message);
      }
    });
    
    this.subscriber.on('error', (error) => {
      console.error('[RedisMessageBroker] Subscriber error:', error.message);
    });
    
    this.publisher.on('error', (error) => {
      console.error('[RedisMessageBroker] Publisher error:', error.message);
    });
  }
  
  // 连接 Redis
  async connect() {
    await Promise.all([
      this.publisher.connect(),
      this.subscriber.connect()
    ]);
    
    console.log('[RedisMessageBroker] Connected to Redis');
  }
  
  // 发布消息到 Redis
  async publish(topic, message, options = {}) {
    const messageWithMetadata = {
      id: this.generateMessageId(),
      topic,
      payload: message,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      ...options
    };
    
    await this.publisher.publish(topic, JSON.stringify(messageWithMetadata));
    
    console.log(`[RedisMessageBroker] Published to ${topic}:`, messageWithMetadata.id);
    
    // 同时触发本地事件
    this.emit('message', messageWithMetadata);
  }
  
  // 订阅 Redis 频道
  async subscribe(topic, handler, options = {}) {
    // 调用父类方法注册本地处理器
    const unsubscribe = super.subscribe(topic, handler, options);
    
    // 订阅 Redis 频道
    await this.subscriber.subscribe(topic);
    
    console.log(`[RedisMessageBroker] Subscribed to Redis channel: ${topic}`);
    
    return async () => {
      await this.subscriber.unsubscribe(topic);
      unsubscribe();
    };
  }
  
  // 处理 Redis 消息
  async handleRedisMessage(channel, message) {
    const subscribers = this.subscribers.get(channel) || [];
    
    for (const subscriber of subscribers) {
      try {
        await this.deliverMessage(subscriber, message);
      } catch (error) {
        await this.handleDeliveryFailure(message, subscriber, error);
      }
    }
  }
  
  // 断开连接
  async disconnect() {
    await Promise.all([
      this.publisher.disconnect(),
      this.subscriber.disconnect()
    ]);
    
    console.log('[RedisMessageBroker] Disconnected from Redis');
  }
}

// 事件定义
const Events = {
  USER_REGISTERED: 'user.registered',
  USER_UPDATED: 'user.updated',
  ORDER_CREATED: 'order.created',
  ORDER_UPDATED: 'order.updated',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  INVENTORY_UPDATED: 'inventory.updated'
};

// 事件发布器
class EventPublisher {
  constructor(messageBroker) {
    this.broker = messageBroker;
  }
  
  // 用户注册事件
  async publishUserRegistered(user) {
    await this.broker.publish(Events.USER_REGISTERED, {
      userId: user.id,
      email: user.email,
      registeredAt: user.createdAt
    });
  }
  
  // 订单创建事件
  async publishOrderCreated(order) {
    await this.broker.publish(Events.ORDER_CREATED, {
      orderId: order.id,
      userId: order.userId,
      items: order.items,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt
    });
  }
  
  // 支付完成事件
  async publishPaymentCompleted(payment) {
    await this.broker.publish(Events.PAYMENT_COMPLETED, {
      paymentId: payment.id,
      orderId: payment.orderId,
      amount: payment.amount,
      completedAt: payment.completedAt
    });
  }
}

// 事件处理器
class EventHandlers {
  constructor(messageBroker) {
    this.broker = messageBroker;
    this.setupHandlers();
  }
  
  setupHandlers() {
    // 处理用户注册事件
    this.broker.subscribe(Events.USER_REGISTERED, async (data) => {
      console.log('Handling user registered event:', data);
      
      // 发送欢迎邮件
      await this.sendWelcomeEmail(data.email);
      
      // 创建用户统计记录
      await this.createUserStats(data.userId);
    }, { name: 'user-registration-handler' });
    
    // 处理订单创建事件
    this.broker.subscribe(Events.ORDER_CREATED, async (data) => {
      console.log('Handling order created event:', data);
      
      // 更新库存
      await this.updateInventory(data.items);
      
      // 发送订单确认邮件
      await this.sendOrderConfirmation(data);
    }, { name: 'order-creation-handler' });
    
    // 处理支付完成事件
    this.broker.subscribe(Events.PAYMENT_COMPLETED, async (data) => {
      console.log('Handling payment completed event:', data);
      
      // 更新订单状态
      await this.updateOrderStatus(data.orderId, 'paid');
      
      // 触发发货流程
      await this.triggerShipping(data.orderId);
    }, { name: 'payment-completion-handler' });
  }
  
  async sendWelcomeEmail(email) {
    console.log(`Sending welcome email to ${email}`);
    // 实际的邮件发送逻辑
  }
  
  async createUserStats(userId) {
    console.log(`Creating stats for user ${userId}`);
    // 创建用户统计记录
  }
  
  async updateInventory(items) {
    console.log('Updating inventory for items:', items);
    // 更新库存逻辑
  }
  
  async sendOrderConfirmation(orderData) {
    console.log(`Sending order confirmation for order ${orderData.orderId}`);
    // 发送订单确认邮件
  }
  
  async updateOrderStatus(orderId, status) {
    console.log(`Updating order ${orderId} status to ${status}`);
    // 更新订单状态
  }
  
  async triggerShipping(orderId) {
    console.log(`Triggering shipping for order ${orderId}`);
    // 触发发货流程
  }
}

// 使用示例
const setupMessageBroker = async () => {
  // 创建消息代理
  const broker = new RedisMessageBroker({
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    }
  });
  
  await broker.connect();
  
  // 创建事件发布器和处理器
  const eventPublisher = new EventPublisher(broker);
  const eventHandlers = new EventHandlers(broker);
  
  return { broker, eventPublisher, eventHandlers };
};

module.exports = {
  MessageBroker,
  RedisMessageBroker,
  EventPublisher,
  EventHandlers,
  Events,
  setupMessageBroker
};
```

## 服务发现

### 1. 服务注册中心

```javascript
// 服务注册中心
const EventEmitter = require('events');

class ServiceRegistry extends EventEmitter {
  constructor() {
    super();
    this.services = new Map();
    this.healthCheckInterval = 30000; // 30 秒
    this.startHealthCheck();
  }
  
  // 注册服务
  register(serviceInfo) {
    const {
      name,
      version,
      host,
      port,
      protocol = 'http',
      healthCheckPath = '/health',
      metadata = {}
    } = serviceInfo;
    
    const serviceId = `${name}-${host}-${port}`;
    const service = {
      id: serviceId,
      name,
      version,
      host,
      port,
      protocol,
      url: `${protocol}://${host}:${port}`,
      healthCheckPath,
      metadata,
      registeredAt: new Date(),
      lastHealthCheck: null,
      healthy: true
    };
    
    this.services.set(serviceId, service);
    
    console.log(`[ServiceRegistry] Registered service: ${serviceId}`);
    this.emit('serviceRegistered', service);
    
    return serviceId;
  }
  
  // 注销服务
  deregister(serviceId) {
    const service = this.services.get(serviceId);
    if (service) {
      this.services.delete(serviceId);
      console.log(`[ServiceRegistry] Deregistered service: ${serviceId}`);
      this.emit('serviceDeregistered', service);
      return true;
    }
    return false;
  }
  
  // 发现服务
  discover(serviceName, options = {}) {
    const services = Array.from(this.services.values())
      .filter(service => {
        if (service.name !== serviceName) return false;
        if (options.version && service.version !== options.version) return false;
        if (options.onlyHealthy && !service.healthy) return false;
        return true;
      });
    
    return services;
  }
  
  // 获取服务实例
  getInstance(serviceName, strategy = 'round-robin') {
    const services = this.discover(serviceName, { onlyHealthy: true });
    
    if (services.length === 0) {
      throw new Error(`No healthy instances found for service: ${serviceName}`);
    }
    
    switch (strategy) {
      case 'random':
        return services[Math.floor(Math.random() * services.length)];
      
      case 'round-robin':
        return this.getRoundRobinInstance(serviceName, services);
      
      case 'least-connections':
        return this.getLeastConnectionsInstance(services);
      
      default:
        return services[0];
    }
  }
  
  // 轮询策略
  getRoundRobinInstance(serviceName, services) {
    if (!this.roundRobinCounters) {
      this.roundRobinCounters = new Map();
    }
    
    const counter = this.roundRobinCounters.get(serviceName) || 0;
    const instance = services[counter % services.length];
    
    this.roundRobinCounters.set(serviceName, counter + 1);
    
    return instance;
  }
  
  // 最少连接策略
  getLeastConnectionsInstance(services) {
    return services.reduce((least, current) => {
      const leastConnections = least.metadata.activeConnections || 0;
      const currentConnections = current.metadata.activeConnections || 0;
      
      return currentConnections < leastConnections ? current : least;
    });
  }
  
  // 更新服务元数据
  updateMetadata(serviceId, metadata) {
    const service = this.services.get(serviceId);
    if (service) {
      service.metadata = { ...service.metadata, ...metadata };
      this.emit('serviceUpdated', service);
      return true;
    }
    return false;
  }
  
  // 健康检查
  async performHealthCheck(service) {
    const axios = require('axios');
    
    try {
      const response = await axios.get(
        `${service.url}${service.healthCheckPath}`,
        { timeout: 5000 }
      );
      
      const wasHealthy = service.healthy;
      service.healthy = response.status === 200;
      service.lastHealthCheck = new Date();
      
      if (!wasHealthy && service.healthy) {
        console.log(`[ServiceRegistry] Service ${service.id} is now healthy`);
        this.emit('serviceHealthy', service);
      }
      
      return service.healthy;
    } catch (error) {
      const wasHealthy = service.healthy;
      service.healthy = false;
      service.lastHealthCheck = new Date();
      
      if (wasHealthy) {
        console.warn(`[ServiceRegistry] Service ${service.id} is now unhealthy: ${error.message}`);
        this.emit('serviceUnhealthy', service);
      }
      
      return false;
    }
  }
  
  // 启动健康检查
  startHealthCheck() {
    setInterval(async () => {
      const services = Array.from(this.services.values());
      
      const healthCheckPromises = services.map(service => 
        this.performHealthCheck(service).catch(error => {
          console.error(`[ServiceRegistry] Health check failed for ${service.id}:`, error.message);
        })
      );
      
      await Promise.allSettled(healthCheckPromises);
    }, this.healthCheckInterval);
  }
  
  // 获取所有服务
  getAllServices() {
    return Array.from(this.services.values());
  }
  
  // 获取服务统计
  getStats() {
    const services = this.getAllServices();
    const servicesByName = new Map();
    
    services.forEach(service => {
      if (!servicesByName.has(service.name)) {
        servicesByName.set(service.name, {
          name: service.name,
          totalInstances: 0,
          healthyInstances: 0,
          unhealthyInstances: 0
        });
      }
      
      const stats = servicesByName.get(service.name);
      stats.totalInstances++;
      
      if (service.healthy) {
        stats.healthyInstances++;
      } else {
        stats.unhealthyInstances++;
      }
    });
    
    return {
      totalServices: services.length,
      serviceTypes: servicesByName.size,
      services: Array.from(servicesByName.values())
    };
  }
}

// 服务发现客户端
class ServiceDiscoveryClient {
  constructor(registry) {
    this.registry = registry;
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 秒缓存
  }
  
  // 发现服务
  async discoverService(serviceName, options = {}) {
    const cacheKey = `${serviceName}-${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.services;
    }
    
    const services = this.registry.discover(serviceName, options);
    
    this.cache.set(cacheKey, {
      services,
      timestamp: Date.now()
    });
    
    return services;
  }
  
  // 获取服务实例
  async getServiceInstance(serviceName, strategy = 'round-robin') {
    try {
      return this.registry.getInstance(serviceName, strategy);
    } catch (error) {
      // 清除缓存并重试
      this.clearCache(serviceName);
      throw error;
    }
  }
  
  // 清除缓存
  clearCache(serviceName) {
    if (serviceName) {
      const keysToDelete = Array.from(this.cache.keys())
        .filter(key => key.startsWith(serviceName));
      
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }
  
  // 监听服务变化
  onServiceChange(callback) {
    this.registry.on('serviceRegistered', (service) => {
      this.clearCache(service.name);
      callback('registered', service);
    });
    
    this.registry.on('serviceDeregistered', (service) => {
      this.clearCache(service.name);
      callback('deregistered', service);
    });
    
    this.registry.on('serviceHealthy', (service) => {
      this.clearCache(service.name);
      callback('healthy', service);
    });
    
    this.registry.on('serviceUnhealthy', (service) => {
      this.clearCache(service.name);
      callback('unhealthy', service);
    });
  }
}

// 自动服务注册
class AutoServiceRegistration {
  constructor(registry, serviceInfo) {
    this.registry = registry;
    this.serviceInfo = serviceInfo;
    this.serviceId = null;
    this.heartbeatInterval = null;
  }
  
  // 启动自动注册
  start() {
    // 注册服务
    this.serviceId = this.registry.register(this.serviceInfo);
    
    // 启动心跳
    this.startHeartbeat();
    
    // 处理进程退出
    this.setupGracefulShutdown();
    
    console.log(`[AutoServiceRegistration] Started for service: ${this.serviceId}`);
  }
  
  // 启动心跳
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.serviceId) {
        this.registry.updateMetadata(this.serviceId, {
          lastHeartbeat: new Date().toISOString(),
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage()
        });
      }
    }, 15000); // 15 秒心跳
  }
  
  // 设置优雅关闭
  setupGracefulShutdown() {
    const shutdown = () => {
      console.log('[AutoServiceRegistration] Shutting down...');
      
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
      
      if (this.serviceId) {
        this.registry.deregister(this.serviceId);
      }
      
      process.exit(0);
    };
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    process.on('uncaughtException', (error) => {
      console.error('[AutoServiceRegistration] Uncaught exception:', error);
      shutdown();
    });
  }
  
  // 停止注册
  stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    if (this.serviceId) {
      this.registry.deregister(this.serviceId);
      this.serviceId = null;
    }
  }
}

// 使用示例
const setupServiceDiscovery = () => {
  // 创建服务注册中心
  const registry = new ServiceRegistry();
  
  // 创建服务发现客户端
  const discoveryClient = new ServiceDiscoveryClient(registry);
  
  // 监听服务变化
  discoveryClient.onServiceChange((event, service) => {
    console.log(`[ServiceDiscovery] Service ${service.name} ${event}`);
  });
  
  return { registry, discoveryClient };
};

// 在服务中使用
const registerCurrentService = (registry) => {
  const serviceInfo = {
    name: process.env.SERVICE_NAME || 'unknown-service',
    version: process.env.SERVICE_VERSION || '1.0.0',
    host: process.env.SERVICE_HOST || 'localhost',
    port: parseInt(process.env.SERVICE_PORT) || 3000,
    protocol: 'http',
    healthCheckPath: '/health',
    metadata: {
      environment: process.env.NODE_ENV || 'development',
      startTime: new Date().toISOString()
    }
  };
  
  const autoRegistration = new AutoServiceRegistration(registry, serviceInfo);
  autoRegistration.start();
  
  return autoRegistration;
};

module.exports = {
  ServiceRegistry,
  ServiceDiscoveryClient,
  AutoServiceRegistration,
  setupServiceDiscovery,
  registerCurrentService
};
```

## API 网关

### 1. 网关实现

```javascript
// API 网关
const express = require('express');
const httpProxy = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

class APIGateway {
  constructor(config = {}) {
    this.app = express();
    this.config = {
      port: 3000,
      jwtSecret: 'your-secret-key',
      rateLimitWindow: 15 * 60 * 1000, // 15 分钟
      rateLimitMax: 100, // 每个窗口最多 100 个请求
      ...config
    };
    
    this.routes = new Map();
    this.middlewares = [];
    this.serviceDiscovery = null;
    
    this.setupMiddlewares();
  }
  
  // 设置中间件
  setupMiddlewares() {
    // 解析 JSON
    this.app.use(express.json());
    
    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
    
    // 请求日志
    this.app.use((req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[Gateway] ${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
      });
      
      next();
    });
    
    // 全局限流
    const globalLimiter = rateLimit({
      windowMs: this.config.rateLimitWindow,
      max: this.config.rateLimitMax,
      message: {
        error: 'Too many requests, please try again later'
      },
      standardHeaders: true,
      legacyHeaders: false
    });
    
    this.app.use(globalLimiter);
  }
  
  // 设置服务发现
  setServiceDiscovery(serviceDiscovery) {
    this.serviceDiscovery = serviceDiscovery;
  }
  
  // 添加路由
  addRoute(config) {
    const {
      path,
      method = 'all',
      target,
      serviceName,
      auth = false,
      rateLimit: routeRateLimit,
      transform,
      middleware = []
    } = config;
    
    const routeMiddlewares = [];
    
    // 路由级别限流
    if (routeRateLimit) {
      const limiter = rateLimit({
        windowMs: routeRateLimit.window || this.config.rateLimitWindow,
        max: routeRateLimit.max || this.config.rateLimitMax,
        message: {
          error: 'Route rate limit exceeded'
        }
      });
      routeMiddlewares.push(limiter);
    }
    
    // 认证中间件
    if (auth) {
      routeMiddlewares.push(this.authMiddleware.bind(this));
    }
    
    // 自定义中间件
    routeMiddlewares.push(...middleware);
    
    // 代理中间件
    const proxyMiddleware = this.createProxyMiddleware({
      target,
      serviceName,
      transform
    });
    
    routeMiddlewares.push(proxyMiddleware);
    
    // 注册路由
    if (method === 'all') {
      this.app.use(path, ...routeMiddlewares);
    } else {
      this.app[method.toLowerCase()](path, ...routeMiddlewares);
    }
    
    this.routes.set(`${method.toUpperCase()} ${path}`, config);
    
    console.log(`[Gateway] Added route: ${method.toUpperCase()} ${path}`);
  }
  
  // 创建代理中间件
  createProxyMiddleware(config) {
    const { target, serviceName, transform } = config;
    
    return async (req, res, next) => {
      try {
        let proxyTarget = target;
        
        // 如果指定了服务名，使用服务发现
        if (serviceName && this.serviceDiscovery) {
          const service = await this.serviceDiscovery.getServiceInstance(serviceName);
          proxyTarget = service.url;
        }
        
        // 请求转换
        if (transform && transform.request) {
          await transform.request(req);
        }
        
        // 创建代理
        const proxy = httpProxy.createProxyMiddleware({
          target: proxyTarget,
          changeOrigin: true,
          pathRewrite: (path, req) => {
            // 移除网关路径前缀
            const routePath = this.findMatchingRoute(req.method, req.path);
            if (routePath) {
              return path.replace(new RegExp(`^${routePath.replace(/\*/g, '.*')}`), '');
            }
            return path;
          },
          onProxyReq: (proxyReq, req, res) => {
            // 添加请求头
            proxyReq.setHeader('X-Gateway-Request-ID', this.generateRequestId());
            proxyReq.setHeader('X-Forwarded-For', req.ip);
            
            if (req.user) {
              proxyReq.setHeader('X-User-ID', req.user.id);
              proxyReq.setHeader('X-User-Role', req.user.role);
            }
          },
          onProxyRes: async (proxyRes, req, res) => {
            // 响应转换
            if (transform && transform.response) {
              await transform.response(proxyRes, req, res);
            }
          },
          onError: (err, req, res) => {
            console.error(`[Gateway] Proxy error for ${req.method} ${req.url}:`, err.message);
            
            if (!res.headersSent) {
              res.status(502).json({
                error: 'Bad Gateway',
                message: 'Service temporarily unavailable'
              });
            }
          }
        });
        
        proxy(req, res, next);
      } catch (error) {
        console.error(`[Gateway] Route error:`, error.message);
        
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Internal Server Error',
            message: 'Gateway processing failed'
          });
        }
      }
    };
  }
  
  // 认证中间件
  authMiddleware(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided'
      });
    }
    
    try {
      const decoded = jwt.verify(token, this.config.jwtSecret);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token'
      });
    }
  }
  
  // 查找匹配的路由
  findMatchingRoute(method, path) {
    for (const [routeKey, routeConfig] of this.routes) {
      const [routeMethod, routePath] = routeKey.split(' ');
      
      if (routeMethod === method || routeMethod === 'ALL') {
        const regex = new RegExp(`^${routePath.replace(/\*/g, '.*')}`);
        if (regex.test(path)) {
          return routePath;
        }
      }
    }
    
    return null;
  }
  
  // 生成请求 ID
  generateRequestId() {
    return `gw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // 健康检查端点
  setupHealthCheck() {
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        routes: this.routes.size
      });
    });
  }
  
  // 网关统计端点
  setupStatsEndpoint() {
    this.app.get('/gateway/stats', (req, res) => {
      res.json({
        routes: Array.from(this.routes.entries()).map(([key, config]) => ({
          route: key,
          target: config.target,
          serviceName: config.serviceName,
          auth: config.auth
        })),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      });
    });
  }
  
  // 启动网关
  start() {
    this.setupHealthCheck();
    this.setupStatsEndpoint();
    
    this.app.listen(this.config.port, () => {
      console.log(`[Gateway] API Gateway running on port ${this.config.port}`);
    });
  }
}

// 网关配置示例
const setupGateway = (serviceDiscovery) => {
  const gateway = new APIGateway({
    port: 3000,
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key'
  });
  
  gateway.setServiceDiscovery(serviceDiscovery);
  
  // 用户服务路由
  gateway.addRoute({
    path: '/api/users/*',
    serviceName: 'user-service',
    auth: true,
    rateLimit: {
      window: 15 * 60 * 1000,
      max: 50
    }
  });
  
  // 产品服务路由
  gateway.addRoute({
    path: '/api/products/*',
    serviceName: 'product-service',
    rateLimit: {
      window: 15 * 60 * 1000,
      max: 100
    }
  });
  
  // 订单服务路由
  gateway.addRoute({
    path: '/api/orders/*',
    serviceName: 'order-service',
    auth: true,
    rateLimit: {
      window: 15 * 60 * 1000,
      max: 30
    },
    transform: {
      request: async (req) => {
        // 添加用户信息到请求体
        if (req.user) {
          req.body.userId = req.user.id;
        }
      }
    }
  });
  
  // 支付服务路由
  gateway.addRoute({
    path: '/api/payments/*',
    serviceName: 'payment-service',
    auth: true,
    rateLimit: {
      window: 15 * 60 * 1000,
      max: 10
    }
  });
  
  // 静态文件服务
  gateway.addRoute({
    path: '/static/*',
    target: 'http://localhost:8080'
  });
  
  return gateway;
};

module.exports = {
  APIGateway,
  setupGateway
};
```

## 配置管理

### 1. 分布式配置

```javascript
// 配置管理器
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class ConfigManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      configDir: options.configDir || './config',
      environment: options.environment || process.env.NODE_ENV || 'development',
      watchFiles: options.watchFiles !== false,
      ...options
    };
    
    this.config = new Map();
    this.watchers = new Map();
    
    this.loadConfigs();
    
    if (this.options.watchFiles) {
      this.setupFileWatchers();
    }
  }
  
  // 加载配置文件
  loadConfigs() {
    const configDir = this.options.configDir;
    
    if (!fs.existsSync(configDir)) {
      console.warn(`[ConfigManager] Config directory not found: ${configDir}`);
      return;
    }
    
    // 加载基础配置
    this.loadConfigFile('default.json');
    
    // 加载环境特定配置
    this.loadConfigFile(`${this.options.environment}.json`);
    
    // 加载本地配置（通常不提交到版本控制）
    this.loadConfigFile('local.json');
    
    console.log(`[ConfigManager] Loaded configuration for environment: ${this.options.environment}`);
  }
  
  // 加载单个配置文件
  loadConfigFile(filename) {
    const filePath = path.join(this.options.configDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return;
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const config = JSON.parse(content);
      
      this.mergeConfig(config);
      
      console.log(`[ConfigManager] Loaded config file: ${filename}`);
    } catch (error) {
      console.error(`[ConfigManager] Failed to load config file ${filename}:`, error.message);
    }
  }
  
  // 合并配置
  mergeConfig(newConfig, prefix = '') {
    for (const [key, value] of Object.entries(newConfig)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        this.mergeConfig(value, fullKey);
      } else {
        this.config.set(fullKey, value);
      }
    }
  }
  
  // 设置文件监听
  setupFileWatchers() {
    const configDir = this.options.configDir;
    
    if (!fs.existsSync(configDir)) {
      return;
    }
    
    const configFiles = [
      'default.json',
      `${this.options.environment}.json`,
      'local.json'
    ];
    
    configFiles.forEach(filename => {
      const filePath = path.join(configDir, filename);
      
      if (fs.existsSync(filePath)) {
        const watcher = fs.watch(filePath, (eventType) => {
          if (eventType === 'change') {
            console.log(`[ConfigManager] Config file changed: ${filename}`);
            this.reloadConfig();
          }
        });
        
        this.watchers.set(filename, watcher);
      }
    });
  }
  
  // 重新加载配置
  reloadConfig() {
    const oldConfig = new Map(this.config);
    this.config.clear();
    
    this.loadConfigs();
    
    // 检查变化的配置项
    const changes = this.getConfigChanges(oldConfig, this.config);
    
    if (changes.length > 0) {
      console.log(`[ConfigManager] Configuration changed:`, changes);
      this.emit('configChanged', changes);
    }
  }
  
  // 获取配置变化
  getConfigChanges(oldConfig, newConfig) {
    const changes = [];
    
    // 检查新增和修改的配置
    for (const [key, value] of newConfig) {
      const oldValue = oldConfig.get(key);
      
      if (oldValue === undefined) {
        changes.push({ type: 'added', key, value });
      } else if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
        changes.push({ type: 'modified', key, oldValue, newValue: value });
      }
    }
    
    // 检查删除的配置
    for (const [key, value] of oldConfig) {
      if (!newConfig.has(key)) {
        changes.push({ type: 'deleted', key, oldValue: value });
      }
    }
    
    return changes;
  }
  
  // 获取配置值
  get(key, defaultValue = undefined) {
    // 支持环境变量覆盖
    const envKey = key.toUpperCase().replace(/\./g, '_');
    const envValue = process.env[envKey];
    
    if (envValue !== undefined) {
      return this.parseValue(envValue);
    }
    
    return this.config.get(key) ?? defaultValue;
  }
  
  // 设置配置值
  set(key, value) {
    const oldValue = this.config.get(key);
    this.config.set(key, value);
    
    if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
      this.emit('configChanged', [{
        type: oldValue === undefined ? 'added' : 'modified',
        key,
        oldValue,
        newValue: value
      }]);
    }
  }
  
  // 检查配置是否存在
  has(key) {
    const envKey = key.toUpperCase().replace(/\./g, '_');
    return process.env[envKey] !== undefined || this.config.has(key);
  }
  
  // 获取所有配置
  getAll() {
    const result = {};
    
    for (const [key, value] of this.config) {
      this.setNestedValue(result, key, value);
    }
    
    return result;
  }
  
  // 设置嵌套值
  setNestedValue(obj, key, value) {
    const keys = key.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }
  
  // 解析值类型
  parseValue(value) {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (value === 'undefined') return undefined;
    
    // 尝试解析数字
    const num = Number(value);
    if (!isNaN(num)) return num;
    
    // 尝试解析 JSON
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  
  // 销毁配置管理器
  destroy() {
    // 关闭文件监听器
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    
    this.watchers.clear();
    this.config.clear();
    this.removeAllListeners();
  }
}

// 远程配置客户端
class RemoteConfigClient extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      endpoint: options.endpoint || 'http://localhost:8500',
      serviceName: options.serviceName || 'default',
      pollInterval: options.pollInterval || 30000,
      ...options
    };
    
    this.config = new Map();
    this.lastVersion = null;
    this.pollTimer = null;
    
    this.startPolling();
  }
  
  // 开始轮询配置
  startPolling() {
    this.pollTimer = setInterval(async () => {
      try {
        await this.fetchConfig();
      } catch (error) {
        console.error('[RemoteConfigClient] Failed to fetch config:', error.message);
      }
    }, this.options.pollInterval);
    
    // 立即获取一次配置
    this.fetchConfig().catch(error => {
      console.error('[RemoteConfigClient] Initial config fetch failed:', error.message);
    });
  }
  
  // 获取远程配置
  async fetchConfig() {
    const axios = require('axios');
    
    const response = await axios.get(
      `${this.options.endpoint}/v1/kv/${this.options.serviceName}`,
      {
        params: {
          recurse: true,
          index: this.lastVersion
        },
        timeout: 5000
      }
    );
    
    if (response.status === 304) {
      // 配置未变化
      return;
    }
    
    const newVersion = response.headers['x-consul-index'];
    const configData = response.data;
    
    if (configData && configData.length > 0) {
      const oldConfig = new Map(this.config);
      this.config.clear();
      
      // 解析配置数据
      configData.forEach(item => {
        const key = item.Key.replace(`${this.options.serviceName}/`, '');
        const value = item.Value ? Buffer.from(item.Value, 'base64').toString() : '';
        
        try {
          this.config.set(key, JSON.parse(value));
        } catch {
          this.config.set(key, value);
        }
      });
      
      this.lastVersion = newVersion;
      
      // 检查配置变化
      const changes = this.getConfigChanges(oldConfig, this.config);
      if (changes.length > 0) {
        console.log('[RemoteConfigClient] Configuration updated');
        this.emit('configChanged', changes);
      }
    }
  }
  
  // 获取配置变化
  getConfigChanges(oldConfig, newConfig) {
    const changes = [];
    
    for (const [key, value] of newConfig) {
      const oldValue = oldConfig.get(key);
      if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
        changes.push({
          type: oldValue === undefined ? 'added' : 'modified',
          key,
          oldValue,
          newValue: value
        });
      }
    }
    
    for (const [key, value] of oldConfig) {
      if (!newConfig.has(key)) {
        changes.push({ type: 'deleted', key, oldValue: value });
      }
    }
    
    return changes;
  }
  
  // 获取配置值
  get(key, defaultValue = undefined) {
    return this.config.get(key) ?? defaultValue;
  }
  
  // 停止轮询
  stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}

// 配置工厂
class ConfigFactory {
  static create(type = 'local', options = {}) {
    switch (type) {
      case 'local':
        return new ConfigManager(options);
      case 'remote':
        return new RemoteConfigClient(options);
      default:
        throw new Error(`Unknown config type: ${type}`);
    }
  }
}

module.exports = {
  ConfigManager,
  RemoteConfigClient,
  ConfigFactory
};
```

## 容器化部署

### 1. Docker 配置

```dockerfile
# 用户服务 Dockerfile
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001

# 复制应用代码
COPY --chown=nodeuser:nodejs . .

# 切换到非 root 用户
USER nodeuser

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# 启动应用
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  # 服务发现
  consul:
    image: consul:1.15
    ports:
      - "8500:8500"
    command: agent -server -ui -node=server-1 -bootstrap-expect=1 -client=0.0.0.0
    environment:
      - CONSUL_BIND_INTERFACE=eth0
    volumes:
      - consul_data:/consul/data

  # API 网关
  api-gateway:
    build:
      context: ./gateway
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - CONSUL_HOST=consul
      - CONSUL_PORT=8500
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - consul
      - redis
    restart: unless-stopped

  # 用户服务
  user-service:
    build:
      context: ./services/user
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - SERVICE_NAME=user-service
      - SERVICE_PORT=3001
      - CONSUL_HOST=consul
      - CONSUL_PORT=8500
      - MONGODB_URI=mongodb://mongo:27017/userdb
      - REDIS_URL=redis://redis:6379
    depends_on:
      - consul
      - mongo
      - redis
    deploy:
      replicas: 2
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3

  # 产品服务
  product-service:
    build:
      context: ./services/product
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - SERVICE_NAME=product-service
      - SERVICE_PORT=3002
      - CONSUL_HOST=consul
      - CONSUL_PORT=8500
      - MONGODB_URI=mongodb://mongo:27017/productdb
      - REDIS_URL=redis://redis:6379
    depends_on:
      - consul
      - mongo
      - redis
    deploy:
      replicas: 2

  # 订单服务
  order-service:
    build:
      context: ./services/order
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - SERVICE_NAME=order-service
      - SERVICE_PORT=3003
      - CONSUL_HOST=consul
      - CONSUL_PORT=8500
      - MONGODB_URI=mongodb://mongo:27017/orderdb
      - REDIS_URL=redis://redis:6379
    depends_on:
      - consul
      - mongo
      - redis
    deploy:
      replicas: 2

  # MongoDB
  mongo:
    image: mongo:6.0
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASSWORD}
    volumes:
      - mongo_data:/data/db
      - ./mongo-init:/docker-entrypoint-initdb.d
    restart: unless-stopped

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped

  # Prometheus
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
    restart: unless-stopped

  # Grafana
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    restart: unless-stopped

volumes:
  consul_data:
  mongo_data:
  redis_data:
  prometheus_data:
  grafana_data:

networks:
  default:
    driver: bridge
```

### 2. Kubernetes 部署

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: microservices
---
# k8s/user-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: microservices
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
      - name: user-service
        image: your-registry/user-service:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: SERVICE_NAME
          value: "user-service"
        - name: SERVICE_PORT
          value: "3001"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: mongodb-secret
              key: uri
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: user-service
  namespace: microservices
spec:
  selector:
    app: user-service
  ports:
  - port: 80
    targetPort: 3001
  type: ClusterIP
---
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-gateway
  namespace: microservices
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 80
```

## 监控和日志

### 1. 应用监控

```javascript
// 监控中间件
const prometheus = require('prom-client');

class MetricsCollector {
  constructor() {
    // 创建指标
    this.httpRequestDuration = new prometheus.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code', 'service']
    });
    
    this.httpRequestTotal = new prometheus.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'service']
    });
    
    this.activeConnections = new prometheus.Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      labelNames: ['service']
    });
    
    this.databaseQueries = new prometheus.Counter({
      name: 'database_queries_total',
      help: 'Total number of database queries',
      labelNames: ['operation', 'collection', 'status', 'service']
    });
    
    this.serviceName = process.env.SERVICE_NAME || 'unknown';
    
    // 注册默认指标
    prometheus.register.setDefaultLabels({
      service: this.serviceName
    });
    
    prometheus.collectDefaultMetrics();
  }
  
  // HTTP 请求监控中间件
  httpMetricsMiddleware() {
    return (req, res, next) => {
      const start = Date.now();
      
      // 增加活跃连接数
      this.activeConnections.inc({ service: this.serviceName });
      
      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route?.path || req.path;
        
        // 记录请求持续时间
        this.httpRequestDuration
          .labels(req.method, route, res.statusCode, this.serviceName)
          .observe(duration);
        
        // 记录请求总数
        this.httpRequestTotal
          .labels(req.method, route, res.statusCode, this.serviceName)
          .inc();
        
        // 减少活跃连接数
        this.activeConnections.dec({ service: this.serviceName });
      });
      
      next();
    };
  }
  
  // 数据库查询监控
  recordDatabaseQuery(operation, collection, status = 'success') {
    this.databaseQueries
      .labels(operation, collection, status, this.serviceName)
      .inc();
  }
  
  // 获取指标
  async getMetrics() {
    return prometheus.register.metrics();
  }
}

// 健康检查
class HealthChecker {
  constructor() {
    this.checks = new Map();
  }
  
  // 添加健康检查
  addCheck(name, checkFunction) {
    this.checks.set(name, checkFunction);
  }
  
  // 执行所有健康检查
  async performChecks() {
    const results = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {}
    };
    
    for (const [name, checkFunction] of this.checks) {
      try {
        const start = Date.now();
        const result = await Promise.race([
          checkFunction(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 5000)
          )
        ]);
        
        results.checks[name] = {
          status: 'healthy',
          responseTime: Date.now() - start,
          details: result
        };
      } catch (error) {
        results.checks[name] = {
          status: 'unhealthy',
          error: error.message
        };
        results.status = 'unhealthy';
      }
    }
    
    return results;
  }
}

// 使用示例
const setupMonitoring = (app) => {
  const metricsCollector = new MetricsCollector();
  const healthChecker = new HealthChecker();
  
  // 添加监控中间件
  app.use(metricsCollector.httpMetricsMiddleware());
  
  // 添加健康检查
  healthChecker.addCheck('database', async () => {
    // 检查数据库连接
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected');
    }
    return { connected: true };
  });
  
  healthChecker.addCheck('redis', async () => {
    // 检查 Redis 连接
    const redis = require('redis');
    const client = redis.createClient();
    await client.ping();
    return { connected: true };
  });
  
  // 健康检查端点
  app.get('/health', async (req, res) => {
    const health = await healthChecker.performChecks();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  });
  
  // 指标端点
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', prometheus.register.contentType);
    const metrics = await metricsCollector.getMetrics();
    res.end(metrics);
  });
  
  return { metricsCollector, healthChecker };
};

module.exports = {
  MetricsCollector,
  HealthChecker,
  setupMonitoring
};
```

## 最佳实践

### 1. 设计原则

- **单一职责**：每个服务只负责一个业务领域
- **自治性**：服务应该能够独立开发、部署和扩展
- **去中心化**：避免单点故障，分散治理
- **容错性**：设计时考虑故障场景，实现优雅降级
- **可观测性**：完善的日志、监控和追踪

### 2. 开发最佳实践

```javascript
// 服务基类
class BaseService {
  constructor(config) {
    this.config = config;
    this.logger = this.createLogger();
    this.metrics = new MetricsCollector();
    this.healthChecker = new HealthChecker();
    
    this.setupGracefulShutdown();
  }
  
  // 创建日志器
  createLogger() {
    const winston = require('winston');
    
    return winston.createLogger({
      level: this.config.logLevel || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: this.config.serviceName
      },
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({
          filename: 'error.log',
          level: 'error'
        }),
        new winston.transports.File({
          filename: 'combined.log'
        })
      ]
    });
  }
  
  // 设置优雅关闭
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      this.logger.info(`Received ${signal}, starting graceful shutdown`);
      
      try {
        await this.stop();
        this.logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        this.logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
  
  // 启动服务
  async start() {
    this.logger.info('Starting service...');
    
    // 子类实现具体启动逻辑
    await this.initialize();
    
    this.logger.info('Service started successfully');
  }
  
  // 停止服务
  async stop() {
    this.logger.info('Stopping service...');
    
    // 子类实现具体停止逻辑
    await this.cleanup();
    
    this.logger.info('Service stopped');
  }
  
  // 子类需要实现的方法
  async initialize() {
    throw new Error('initialize() must be implemented by subclass');
  }
  
  async cleanup() {
    throw new Error('cleanup() must be implemented by subclass');
  }
}

// 具体服务实现
class UserService extends BaseService {
  constructor(config) {
    super(config);
    this.app = null;
    this.server = null;
    this.database = null;
  }
  
  async initialize() {
    // 连接数据库
    await this.connectDatabase();
    
    // 创建 Express 应用
    this.app = this.createApp();
    
    // 启动 HTTP 服务器
    this.server = this.app.listen(this.config.port, () => {
      this.logger.info(`User service listening on port ${this.config.port}`);
    });
  }
  
  async cleanup() {
    // 关闭 HTTP 服务器
    if (this.server) {
      await new Promise((resolve) => {
        this.server.close(resolve);
      });
    }
    
    // 断开数据库连接
    if (this.database) {
      await this.database.close();
    }
  }
  
  async connectDatabase() {
    const mongoose = require('mongoose');
    
    await mongoose.connect(this.config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    this.database = mongoose.connection;
    this.logger.info('Connected to MongoDB');
  }
  
  createApp() {
    const express = require('express');
    const app = express();
    
    // 添加中间件
    app.use(express.json());
    app.use(this.metrics.httpMetricsMiddleware());
    
    // 添加路由
    app.use('/users', this.createUserRoutes());
    
    // 添加健康检查
    this.setupHealthChecks(app);
    
    return app;
  }
  
  createUserRoutes() {
    const router = require('express').Router();
    
    router.get('/', async (req, res) => {
      try {
        // 用户列表逻辑
        res.json({ users: [] });
      } catch (error) {
        this.logger.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    
    return router;
  }
  
  setupHealthChecks(app) {
    this.healthChecker.addCheck('database', async () => {
      if (this.database.readyState !== 1) {
        throw new Error('Database not connected');
      }
      return { connected: true };
    });
    
    app.get('/health', async (req, res) => {
      const health = await this.healthChecker.performChecks();
      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);
    });
    
    app.get('/metrics', async (req, res) => {
      res.set('Content-Type', prometheus.register.contentType);
      const metrics = await this.metrics.getMetrics();
      res.end(metrics);
    });
  }
}

// 启动服务
const startUserService = async () => {
  const config = {
    serviceName: 'user-service',
    port: process.env.PORT || 3001,
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/userdb',
    logLevel: process.env.LOG_LEVEL || 'info'
  };
  
  const service = new UserService(config);
  await service.start();
};

// 如果直接运行此文件
if (require.main === module) {
  startUserService().catch(error => {
    console.error('Failed to start service:', error);
    process.exit(1);
  });
}

module.exports = {
  BaseService,
  UserService,
  startUserService
};
```

### 3. 部署和运维

- **容器化**：使用 Docker 容器化所有服务
- **编排**：使用 Kubernetes 或 Docker Compose 进行服务编排
- **CI/CD**：自动化构建、测试和部署流程
- **监控**：实施全面的监控和告警机制
- **日志**：集中化日志收集和分析
- **安全**：实施安全最佳实践，包括认证、授权和网络安全

## 总结

微服务架构为现代应用开发提供了强大的解决方案，但也带来了复杂性。成功实施微服务需要：

1. **合理的服务拆分**：基于业务领域进行服务划分
2. **可靠的通信机制**：同步和异步通信的合理使用
3. **完善的服务治理**：服务发现、负载均衡、熔断等
4. **强大的监控体系**：全面的可观测性
5. **自动化运维**：CI/CD、容器化、编排等

