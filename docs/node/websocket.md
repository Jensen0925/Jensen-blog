# Node.js WebSocket 实时通信指南

本章将介绍如何在 Node.js 中实现 WebSocket 实时通信，包括 Socket.IO、原生 WebSocket、实时聊天、推送通知、性能优化等核心内容。

## WebSocket 基础

### 1. WebSocket 概述

WebSocket 是一种在单个 TCP 连接上进行全双工通信的协议，它使得客户端和服务器之间的数据交换变得更加简单。

**优势：**
- 全双工通信
- 低延迟
- 减少服务器负载
- 实时性强
- 支持二进制数据

**应用场景：**
- 实时聊天
- 在线游戏
- 实时协作
- 股票行情
- 系统监控
- 推送通知

### 2. 技术选型

```javascript
// 原生 WebSocket
const WebSocket = require('ws');

// Socket.IO (推荐)
const io = require('socket.io');

// uWebSockets.js (高性能)
const uWS = require('uWebSockets.js');
```

## Socket.IO 实现

### 1. 基础服务器设置

```javascript
// server.js - Socket.IO 服务器
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const Redis = require('ioredis');

class WebSocketServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    });
    
    // Socket.IO 配置
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6, // 1MB
      allowEIO3: true
    });
    
    this.setupMiddleware();
    this.setupAuthentication();
    this.setupEventHandlers();
    this.setupRedisAdapter();
  }
  
  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static('public'));
    
    // 健康检查
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        connections: this.io.engine.clientsCount,
        timestamp: new Date().toISOString()
      });
    });
  }
  
  setupAuthentication() {
    // Socket.IO 认证中间件
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || 
                     socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          throw new Error('No token provided');
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await this.getUserById(decoded.id);
        
        if (!user) {
          throw new Error('User not found');
        }
        
        socket.userId = user.id;
        socket.username = user.username;
        socket.user = user;
        
        next();
      } catch (error) {
        console.error('Socket authentication error:', error.message);
        next(new Error('Authentication failed'));
      }
    });
  }
  
  setupRedisAdapter() {
    // Redis 适配器用于多实例扩展
    const redisAdapter = require('socket.io-redis');
    this.io.adapter(redisAdapter({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    }));
  }
  
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User ${socket.username} connected: ${socket.id}`);
      
      // 用户上线
      this.handleUserOnline(socket);
      
      // 聊天相关事件
      this.setupChatHandlers(socket);
      
      // 房间相关事件
      this.setupRoomHandlers(socket);
      
      // 通知相关事件
      this.setupNotificationHandlers(socket);
      
      // 断开连接
      socket.on('disconnect', (reason) => {
        console.log(`User ${socket.username} disconnected: ${reason}`);
        this.handleUserOffline(socket);
      });
      
      // 错误处理
      socket.on('error', (error) => {
        console.error(`Socket error for user ${socket.username}:`, error);
      });
    });
  }
  
  async handleUserOnline(socket) {
    // 更新用户在线状态
    await this.redis.hset('users:online', socket.userId, JSON.stringify({
      socketId: socket.id,
      username: socket.username,
      connectedAt: new Date().toISOString()
    }));
    
    // 加入用户个人房间
    socket.join(`user:${socket.userId}`);
    
    // 通知好友用户上线
    const friends = await this.getUserFriends(socket.userId);
    friends.forEach(friendId => {
      socket.to(`user:${friendId}`).emit('user:online', {
        userId: socket.userId,
        username: socket.username
      });
    });
    
    // 发送未读消息
    const unreadMessages = await this.getUnreadMessages(socket.userId);
    if (unreadMessages.length > 0) {
      socket.emit('messages:unread', unreadMessages);
    }
  }
  
  async handleUserOffline(socket) {
    // 移除用户在线状态
    await this.redis.hdel('users:online', socket.userId);
    
    // 通知好友用户下线
    const friends = await this.getUserFriends(socket.userId);
    friends.forEach(friendId => {
      socket.to(`user:${friendId}`).emit('user:offline', {
        userId: socket.userId,
        username: socket.username
      });
    });
  }
  
  setupChatHandlers(socket) {
    // 发送私聊消息
    socket.on('message:send', async (data) => {
      try {
        const { recipientId, content, type = 'text' } = data;
        
        // 验证输入
        if (!recipientId || !content) {
          socket.emit('error', { message: 'Missing required fields' });
          return;
        }
        
        // 检查是否为好友关系
        const isFriend = await this.checkFriendship(socket.userId, recipientId);
        if (!isFriend) {
          socket.emit('error', { message: 'Can only send messages to friends' });
          return;
        }
        
        // 保存消息到数据库
        const message = await this.saveMessage({
          senderId: socket.userId,
          recipientId,
          content,
          type,
          timestamp: new Date()
        });
        
        // 发送给接收者
        socket.to(`user:${recipientId}`).emit('message:received', {
          id: message.id,
          senderId: socket.userId,
          senderUsername: socket.username,
          content,
          type,
          timestamp: message.timestamp
        });
        
        // 确认发送成功
        socket.emit('message:sent', {
          id: message.id,
          recipientId,
          timestamp: message.timestamp
        });
        
        // 推送通知（如果用户离线）
        const isRecipientOnline = await this.redis.hexists('users:online', recipientId);
        if (!isRecipientOnline) {
          await this.sendPushNotification(recipientId, {
            title: `New message from ${socket.username}`,
            body: content.substring(0, 100),
            type: 'message'
          });
        }
        
      } catch (error) {
        console.error('Message send error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
    
    // 标记消息已读
    socket.on('message:read', async (data) => {
      try {
        const { messageIds } = data;
        
        await this.markMessagesAsRead(messageIds, socket.userId);
        
        // 通知发送者消息已读
        for (const messageId of messageIds) {
          const message = await this.getMessage(messageId);
          if (message && message.senderId !== socket.userId) {
            socket.to(`user:${message.senderId}`).emit('message:read', {
              messageId,
              readBy: socket.userId,
              readAt: new Date()
            });
          }
        }
        
      } catch (error) {
        console.error('Mark message read error:', error);
      }
    });
    
    // 正在输入状态
    socket.on('typing:start', (data) => {
      const { recipientId } = data;
      socket.to(`user:${recipientId}`).emit('typing:start', {
        userId: socket.userId,
        username: socket.username
      });
    });
    
    socket.on('typing:stop', (data) => {
      const { recipientId } = data;
      socket.to(`user:${recipientId}`).emit('typing:stop', {
        userId: socket.userId
      });
    });
  }
  
  setupRoomHandlers(socket) {
    // 加入房间
    socket.on('room:join', async (data) => {
      try {
        const { roomId } = data;
        
        // 验证用户是否有权限加入房间
        const hasPermission = await this.checkRoomPermission(socket.userId, roomId);
        if (!hasPermission) {
          socket.emit('error', { message: 'No permission to join room' });
          return;
        }
        
        socket.join(roomId);
        
        // 通知房间内其他用户
        socket.to(roomId).emit('room:user_joined', {
          userId: socket.userId,
          username: socket.username
        });
        
        // 发送房间历史消息
        const roomMessages = await this.getRoomMessages(roomId, 50);
        socket.emit('room:messages', roomMessages);
        
        console.log(`User ${socket.username} joined room ${roomId}`);
        
      } catch (error) {
        console.error('Room join error:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });
    
    // 离开房间
    socket.on('room:leave', (data) => {
      const { roomId } = data;
      socket.leave(roomId);
      
      // 通知房间内其他用户
      socket.to(roomId).emit('room:user_left', {
        userId: socket.userId,
        username: socket.username
      });
      
      console.log(`User ${socket.username} left room ${roomId}`);
    });
    
    // 房间消息
    socket.on('room:message', async (data) => {
      try {
        const { roomId, content, type = 'text' } = data;
        
        // 验证用户是否在房间中
        if (!socket.rooms.has(roomId)) {
          socket.emit('error', { message: 'Not in room' });
          return;
        }
        
        // 保存房间消息
        const message = await this.saveRoomMessage({
          roomId,
          senderId: socket.userId,
          content,
          type,
          timestamp: new Date()
        });
        
        // 广播给房间内所有用户
        this.io.to(roomId).emit('room:message', {
          id: message.id,
          roomId,
          senderId: socket.userId,
          senderUsername: socket.username,
          content,
          type,
          timestamp: message.timestamp
        });
        
      } catch (error) {
        console.error('Room message error:', error);
        socket.emit('error', { message: 'Failed to send room message' });
      }
    });
  }
  
  setupNotificationHandlers(socket) {
    // 订阅通知
    socket.on('notification:subscribe', (data) => {
      const { topics } = data;
      
      topics.forEach(topic => {
        socket.join(`notification:${topic}`);
      });
      
      console.log(`User ${socket.username} subscribed to notifications:`, topics);
    });
    
    // 取消订阅通知
    socket.on('notification:unsubscribe', (data) => {
      const { topics } = data;
      
      topics.forEach(topic => {
        socket.leave(`notification:${topic}`);
      });
      
      console.log(`User ${socket.username} unsubscribed from notifications:`, topics);
    });
  }
  
  // 广播通知
  async broadcastNotification(topic, notification) {
    this.io.to(`notification:${topic}`).emit('notification', {
      ...notification,
      timestamp: new Date()
    });
  }
  
  // 发送个人通知
  async sendPersonalNotification(userId, notification) {
    this.io.to(`user:${userId}`).emit('notification', {
      ...notification,
      timestamp: new Date()
    });
  }
  
  // 获取在线用户数
  getOnlineUsersCount() {
    return this.io.engine.clientsCount;
  }
  
  // 获取房间用户数
  getRoomUsersCount(roomId) {
    const room = this.io.sockets.adapter.rooms.get(roomId);
    return room ? room.size : 0;
  }
  
  // 辅助方法（需要根据实际数据库实现）
  async getUserById(id) {
    // 实现获取用户逻辑
    return { id, username: 'user' + id };
  }
  
  async getUserFriends(userId) {
    // 实现获取用户好友列表逻辑
    return [];
  }
  
  async checkFriendship(userId1, userId2) {
    // 实现检查好友关系逻辑
    return true;
  }
  
  async saveMessage(messageData) {
    // 实现保存消息逻辑
    return { id: Date.now(), ...messageData };
  }
  
  async getMessage(messageId) {
    // 实现获取消息逻辑
    return null;
  }
  
  async getUnreadMessages(userId) {
    // 实现获取未读消息逻辑
    return [];
  }
  
  async markMessagesAsRead(messageIds, userId) {
    // 实现标记消息已读逻辑
  }
  
  async checkRoomPermission(userId, roomId) {
    // 实现检查房间权限逻辑
    return true;
  }
  
  async getRoomMessages(roomId, limit) {
    // 实现获取房间消息逻辑
    return [];
  }
  
  async saveRoomMessage(messageData) {
    // 实现保存房间消息逻辑
    return { id: Date.now(), ...messageData };
  }
  
  async sendPushNotification(userId, notification) {
    // 实现推送通知逻辑
  }
  
  start(port = 3000) {
    this.server.listen(port, () => {
      console.log(`WebSocket server running on port ${port}`);
    });
  }
}

// 启动服务器
const wsServer = new WebSocketServer();
wsServer.start(process.env.PORT || 3000);

module.exports = WebSocketServer;
```

### 2. 客户端实现

```javascript
// client/websocket-client.js
class WebSocketClient {
  constructor(serverUrl, options = {}) {
    this.serverUrl = serverUrl;
    this.options = {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      ...options
    };
    
    this.socket = null;
    this.isConnected = false;
    this.eventHandlers = new Map();
    this.messageQueue = [];
    this.reconnectAttempts = 0;
    
    if (this.options.autoConnect) {
      this.connect();
    }
  }
  
  connect(token) {
    if (this.socket && this.isConnected) {
      console.warn('Already connected');
      return;
    }
    
    this.socket = io(this.serverUrl, {
      auth: {
        token: token || this.getStoredToken()
      },
      transports: ['websocket', 'polling'],
      timeout: this.options.timeout
    });
    
    this.setupEventHandlers();
  }
  
  setupEventHandlers() {
    // 连接成功
    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // 发送队列中的消息
      this.flushMessageQueue();
      
      this.emit('connected');
    });
    
    // 连接失败
    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
      this.isConnected = false;
      this.emit('connection_error', error);
      
      // 自动重连
      if (this.options.reconnection && 
          this.reconnectAttempts < this.options.reconnectionAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => {
          console.log(`Reconnection attempt ${this.reconnectAttempts}`);
          this.connect();
        }, this.options.reconnectionDelay * this.reconnectAttempts);
      }
    });
    
    // 断开连接
    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected:', reason);
      this.isConnected = false;
      this.emit('disconnected', reason);
    });
    
    // 错误处理
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.emit('error', error);
    });
    
    // 消息事件
    this.socket.on('message:received', (data) => {
      this.emit('message_received', data);
    });
    
    this.socket.on('message:sent', (data) => {
      this.emit('message_sent', data);
    });
    
    this.socket.on('message:read', (data) => {
      this.emit('message_read', data);
    });
    
    // 用户状态事件
    this.socket.on('user:online', (data) => {
      this.emit('user_online', data);
    });
    
    this.socket.on('user:offline', (data) => {
      this.emit('user_offline', data);
    });
    
    // 输入状态事件
    this.socket.on('typing:start', (data) => {
      this.emit('typing_start', data);
    });
    
    this.socket.on('typing:stop', (data) => {
      this.emit('typing_stop', data);
    });
    
    // 房间事件
    this.socket.on('room:user_joined', (data) => {
      this.emit('room_user_joined', data);
    });
    
    this.socket.on('room:user_left', (data) => {
      this.emit('room_user_left', data);
    });
    
    this.socket.on('room:message', (data) => {
      this.emit('room_message', data);
    });
    
    this.socket.on('room:messages', (data) => {
      this.emit('room_messages', data);
    });
    
    // 通知事件
    this.socket.on('notification', (data) => {
      this.emit('notification', data);
    });
  }
  
  // 发送消息
  sendMessage(recipientId, content, type = 'text') {
    const messageData = {
      recipientId,
      content,
      type,
      timestamp: new Date()
    };
    
    if (this.isConnected) {
      this.socket.emit('message:send', messageData);
    } else {
      // 添加到队列，连接后发送
      this.messageQueue.push({
        event: 'message:send',
        data: messageData
      });
    }
  }
  
  // 标记消息已读
  markMessagesRead(messageIds) {
    if (this.isConnected) {
      this.socket.emit('message:read', { messageIds });
    }
  }
  
  // 发送输入状态
  startTyping(recipientId) {
    if (this.isConnected) {
      this.socket.emit('typing:start', { recipientId });
    }
  }
  
  stopTyping(recipientId) {
    if (this.isConnected) {
      this.socket.emit('typing:stop', { recipientId });
    }
  }
  
  // 加入房间
  joinRoom(roomId) {
    if (this.isConnected) {
      this.socket.emit('room:join', { roomId });
    }
  }
  
  // 离开房间
  leaveRoom(roomId) {
    if (this.isConnected) {
      this.socket.emit('room:leave', { roomId });
    }
  }
  
  // 发送房间消息
  sendRoomMessage(roomId, content, type = 'text') {
    if (this.isConnected) {
      this.socket.emit('room:message', {
        roomId,
        content,
        type
      });
    }
  }
  
  // 订阅通知
  subscribeNotifications(topics) {
    if (this.isConnected) {
      this.socket.emit('notification:subscribe', { topics });
    }
  }
  
  // 取消订阅通知
  unsubscribeNotifications(topics) {
    if (this.isConnected) {
      this.socket.emit('notification:unsubscribe', { topics });
    }
  }
  
  // 事件监听
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }
  
  // 移除事件监听
  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
  
  // 触发事件
  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }
  
  // 发送队列中的消息
  flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const { event, data } = this.messageQueue.shift();
      this.socket.emit(event, data);
    }
  }
  
  // 获取存储的令牌
  getStoredToken() {
    return localStorage.getItem('auth_token');
  }
  
  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
    }
  }
  
  // 获取连接状态
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      socketId: this.socket?.id,
      transport: this.socket?.io?.engine?.transport?.name
    };
  }
}

// 使用示例
const wsClient = new WebSocketClient('http://localhost:3000');

// 监听消息
wsClient.on('message_received', (message) => {
  console.log('New message:', message);
  // 更新UI显示新消息
});

// 监听用户状态
wsClient.on('user_online', (user) => {
  console.log('User online:', user.username);
  // 更新用户在线状态
});

// 发送消息
wsClient.sendMessage('user123', 'Hello, how are you?');

module.exports = WebSocketClient;
```

## 原生 WebSocket 实现

### 1. 原生 WebSocket 服务器

```javascript
// native-websocket-server.js
const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const jwt = require('jsonwebtoken');

class NativeWebSocketServer {
  constructor(options = {}) {
    this.options = {
      port: 8080,
      maxConnections: 1000,
      heartbeatInterval: 30000,
      ...options
    };
    
    this.clients = new Map();
    this.rooms = new Map();
    this.server = null;
    this.wss = null;
    
    this.setupServer();
    this.startHeartbeat();
  }
  
  setupServer() {
    // 创建 HTTP 服务器
    this.server = http.createServer();
    
    // 创建 WebSocket 服务器
    this.wss = new WebSocket.Server({
      server: this.server,
      verifyClient: this.verifyClient.bind(this),
      maxPayload: 1024 * 1024 // 1MB
    });
    
    this.wss.on('connection', this.handleConnection.bind(this));
    
    this.server.on('upgrade', (request, socket, head) => {
      console.log('WebSocket upgrade request');
    });
  }
  
  verifyClient(info) {
    try {
      const query = url.parse(info.req.url, true).query;
      const token = query.token || info.req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        console.log('No token provided');
        return false;
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      info.req.user = decoded;
      
      // 检查连接数限制
      if (this.clients.size >= this.options.maxConnections) {
        console.log('Max connections reached');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Token verification failed:', error.message);
      return false;
    }
  }
  
  handleConnection(ws, request) {
    const user = request.user;
    const clientId = this.generateClientId();
    
    // 客户端信息
    const client = {
      id: clientId,
      ws,
      user,
      rooms: new Set(),
      lastPing: Date.now(),
      isAlive: true
    };
    
    this.clients.set(clientId, client);
    
    console.log(`Client connected: ${user.username} (${clientId})`);
    
    // 设置事件处理
    ws.on('message', (data) => this.handleMessage(client, data));
    ws.on('close', (code, reason) => this.handleDisconnect(client, code, reason));
    ws.on('error', (error) => this.handleError(client, error));
    ws.on('pong', () => this.handlePong(client));
    
    // 发送连接确认
    this.sendToClient(client, {
      type: 'connection',
      status: 'connected',
      clientId
    });
  }
  
  handleMessage(client, data) {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'chat':
          this.handleChatMessage(client, message);
          break;
        case 'join_room':
          this.handleJoinRoom(client, message);
          break;
        case 'leave_room':
          this.handleLeaveRoom(client, message);
          break;
        case 'ping':
          this.handlePing(client);
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Message parsing error:', error);
      this.sendError(client, 'Invalid message format');
    }
  }
  
  handleChatMessage(client, message) {
    const { recipientId, content, roomId } = message;
    
    if (roomId) {
      // 房间消息
      this.broadcastToRoom(roomId, {
        type: 'chat',
        senderId: client.user.id,
        senderName: client.user.username,
        content,
        timestamp: new Date().toISOString()
      }, client.id);
    } else if (recipientId) {
      // 私聊消息
      const recipient = this.findClientByUserId(recipientId);
      if (recipient) {
        this.sendToClient(recipient, {
          type: 'chat',
          senderId: client.user.id,
          senderName: client.user.username,
          content,
          timestamp: new Date().toISOString()
        });
      }
    }
  }
  
  handleJoinRoom(client, message) {
    const { roomId } = message;
    
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    
    this.rooms.get(roomId).add(client.id);
    client.rooms.add(roomId);
    
    // 通知房间内其他用户
    this.broadcastToRoom(roomId, {
      type: 'user_joined',
      userId: client.user.id,
      username: client.user.username
    }, client.id);
    
    // 确认加入成功
    this.sendToClient(client, {
      type: 'room_joined',
      roomId
    });
    
    console.log(`User ${client.user.username} joined room ${roomId}`);
  }
  
  handleLeaveRoom(client, message) {
    const { roomId } = message;
    
    if (this.rooms.has(roomId)) {
      this.rooms.get(roomId).delete(client.id);
      
      // 如果房间为空，删除房间
      if (this.rooms.get(roomId).size === 0) {
        this.rooms.delete(roomId);
      }
    }
    
    client.rooms.delete(roomId);
    
    // 通知房间内其他用户
    this.broadcastToRoom(roomId, {
      type: 'user_left',
      userId: client.user.id,
      username: client.user.username
    });
    
    console.log(`User ${client.user.username} left room ${roomId}`);
  }
  
  handlePing(client) {
    client.lastPing = Date.now();
    this.sendToClient(client, { type: 'pong' });
  }
  
  handlePong(client) {
    client.isAlive = true;
    client.lastPing = Date.now();
  }
  
  handleDisconnect(client, code, reason) {
    console.log(`Client disconnected: ${client.user.username} (${code}: ${reason})`);
    
    // 从所有房间中移除
    client.rooms.forEach(roomId => {
      if (this.rooms.has(roomId)) {
        this.rooms.get(roomId).delete(client.id);
        
        // 通知房间内其他用户
        this.broadcastToRoom(roomId, {
          type: 'user_left',
          userId: client.user.id,
          username: client.user.username
        });
        
        // 如果房间为空，删除房间
        if (this.rooms.get(roomId).size === 0) {
          this.rooms.delete(roomId);
        }
      }
    });
    
    // 移除客户端
    this.clients.delete(client.id);
  }
  
  handleError(client, error) {
    console.error(`Client error for ${client.user.username}:`, error);
  }
  
  sendToClient(client, data) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(data));
    }
  }
  
  sendError(client, message) {
    this.sendToClient(client, {
      type: 'error',
      message
    });
  }
  
  broadcastToRoom(roomId, data, excludeClientId = null) {
    if (!this.rooms.has(roomId)) return;
    
    this.rooms.get(roomId).forEach(clientId => {
      if (clientId !== excludeClientId) {
        const client = this.clients.get(clientId);
        if (client) {
          this.sendToClient(client, data);
        }
      }
    });
  }
  
  broadcast(data, excludeClientId = null) {
    this.clients.forEach((client, clientId) => {
      if (clientId !== excludeClientId) {
        this.sendToClient(client, data);
      }
    });
  }
  
  findClientByUserId(userId) {
    for (const client of this.clients.values()) {
      if (client.user.id === userId) {
        return client;
      }
    }
    return null;
  }
  
  generateClientId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
  
  startHeartbeat() {
    setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (!client.isAlive) {
          console.log(`Terminating inactive client: ${client.user.username}`);
          client.ws.terminate();
          this.clients.delete(clientId);
          return;
        }
        
        client.isAlive = false;
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        }
      });
    }, this.options.heartbeatInterval);
  }
  
  getStats() {
    return {
      totalClients: this.clients.size,
      totalRooms: this.rooms.size,
      roomStats: Array.from(this.rooms.entries()).map(([roomId, clients]) => ({
        roomId,
        clientCount: clients.size
      }))
    };
  }
  
  start() {
    this.server.listen(this.options.port, () => {
      console.log(`Native WebSocket server running on port ${this.options.port}`);
    });
  }
}

// 启动服务器
const wsServer = new NativeWebSocketServer({ port: 8080 });
wsServer.start();

module.exports = NativeWebSocketServer;
```

### 2. 原生 WebSocket 客户端

```javascript
// native-websocket-client.js
class NativeWebSocketClient {
  constructor(url, options = {}) {
    this.url = url;
    this.options = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      pingInterval: 30000,
      ...options
    };
    
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.eventHandlers = {};
    this.messageQueue = [];
    this.pingTimer = null;
    
    this.connect();
  }
  
  connect() {
    try {
      const token = this.getToken();
      const wsUrl = `${this.url}?token=${encodeURIComponent(token)}`;
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.scheduleReconnect();
    }
  }
  
  handleOpen() {
    console.log('WebSocket connected');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    
    // 发送队列中的消息
    this.flushMessageQueue();
    
    // 开始心跳
    this.startPing();
    
    this.emit('connected');
  }
  
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'connection':
          this.emit('connection', data);
          break;
        case 'chat':
          this.emit('message', data);
          break;
        case 'user_joined':
          this.emit('user_joined', data);
          break;
        case 'user_left':
          this.emit('user_left', data);
          break;
        case 'room_joined':
          this.emit('room_joined', data);
          break;
        case 'pong':
          // 心跳响应
          break;
        case 'error':
          this.emit('error', data);
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Message parsing error:', error);
    }
  }
  
  handleClose(event) {
    console.log('WebSocket disconnected:', event.code, event.reason);
    this.isConnected = false;
    this.stopPing();
    
    this.emit('disconnected', { code: event.code, reason: event.reason });
    
    // 自动重连
    if (this.reconnectAttempts < this.options.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }
  
  handleError(error) {
    console.error('WebSocket error:', error);
    this.emit('error', error);
  }
  
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    console.log(`Reconnecting in ${this.options.reconnectInterval}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, this.options.reconnectInterval);
  }
  
  send(data) {
    const message = JSON.stringify(data);
    
    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      // 添加到队列
      this.messageQueue.push(message);
    }
  }
  
  sendMessage(recipientId, content) {
    this.send({
      type: 'chat',
      recipientId,
      content,
      timestamp: new Date().toISOString()
    });
  }
  
  sendRoomMessage(roomId, content) {
    this.send({
      type: 'chat',
      roomId,
      content,
      timestamp: new Date().toISOString()
    });
  }
  
  joinRoom(roomId) {
    this.send({
      type: 'join_room',
      roomId
    });
  }
  
  leaveRoom(roomId) {
    this.send({
      type: 'leave_room',
      roomId
    });
  }
  
  startPing() {
    this.pingTimer = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping' });
      }
    }, this.options.pingInterval);
  }
  
  stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
  
  flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.ws.send(message);
    }
  }
  
  on(event, handler) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }
  
  off(event, handler) {
    if (this.eventHandlers[event]) {
      const index = this.eventHandlers[event].indexOf(handler);
      if (index > -1) {
        this.eventHandlers[event].splice(index, 1);
      }
    }
  }
  
  emit(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }
  
  getToken() {
    // 从 localStorage 或其他地方获取令牌
    return localStorage.getItem('auth_token') || '';
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
    this.stopPing();
  }
  
  getConnectionState() {
    return {
      connected: this.isConnected,
      readyState: this.ws?.readyState,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// 使用示例
const client = new NativeWebSocketClient('ws://localhost:8080');

client.on('connected', () => {
  console.log('Connected to server');
  client.joinRoom('general');
});

client.on('message', (data) => {
  console.log('Received message:', data);
});

client.on('user_joined', (data) => {
  console.log('User joined:', data.username);
});

// 发送消息
client.sendRoomMessage('general', 'Hello everyone!');

module.exports = NativeWebSocketClient;
```

## 实时聊天应用

### 1. 聊天室管理器

```javascript
// chat-room-manager.js
const EventEmitter = require('events');
const Redis = require('ioredis');

class ChatRoomManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.redis = new Redis({
      host: options.redisHost || 'localhost',
      port: options.redisPort || 6379
    });
    
    this.rooms = new Map();
    this.userRooms = new Map(); // 用户所在房间映射
    this.messageHistory = new Map(); // 消息历史缓存
    
    this.setupRedisSubscription();
  }
  
  setupRedisSubscription() {
    // 订阅 Redis 频道用于多实例同步
    const subscriber = this.redis.duplicate();
    subscriber.subscribe('chat:room:*');
    
    subscriber.on('message', (channel, message) => {
      const [, , , roomId] = channel.split(':');
      const data = JSON.parse(message);
      
      this.emit('room_event', {
        roomId,
        ...data
      });
    });
  }
  
  async createRoom(roomData) {
    const {
      id,
      name,
      description,
      type = 'public', // public, private, direct
      maxMembers = 100,
      createdBy
    } = roomData;
    
    const room = {
      id,
      name,
      description,
      type,
      maxMembers,
      createdBy,
      createdAt: new Date(),
      members: new Set(),
      admins: new Set([createdBy]),
      banned: new Set(),
      settings: {
        allowFileUpload: true,
        allowVoiceMessage: true,
        messageRetention: 30 // 天
      }
    };
    
    this.rooms.set(id, room);
    
    // 保存到 Redis
    await this.redis.hset('chat:rooms', id, JSON.stringify({
      ...room,
      members: Array.from(room.members),
      admins: Array.from(room.admins),
      banned: Array.from(room.banned)
    }));
    
    return room;
  }
  
  async joinRoom(roomId, userId, userInfo) {
    const room = await this.getRoom(roomId);
    if (!room) {
      throw new Error('Room not found');
    }
    
    // 检查是否被禁止
    if (room.banned.has(userId)) {
      throw new Error('User is banned from this room');
    }
    
    // 检查房间人数限制
    if (room.members.size >= room.maxMembers) {
      throw new Error('Room is full');
    }
    
    // 检查私有房间权限
    if (room.type === 'private' && !room.members.has(userId) && !room.admins.has(userId)) {
      throw new Error('No permission to join private room');
    }
    
    room.members.add(userId);
    
    // 更新用户房间映射
    if (!this.userRooms.has(userId)) {
      this.userRooms.set(userId, new Set());
    }
    this.userRooms.get(userId).add(roomId);
    
    // 保存到 Redis
    await this.saveRoom(room);
    
    // 发布加入事件
    await this.publishRoomEvent(roomId, {
      type: 'user_joined',
      userId,
      userInfo,
      timestamp: new Date()
    });
    
    return {
      room: this.serializeRoom(room),
      recentMessages: await this.getRecentMessages(roomId, 50)
    };
  }
  
  async leaveRoom(roomId, userId) {
    const room = await this.getRoom(roomId);
    if (!room) return;
    
    room.members.delete(userId);
    
    // 更新用户房间映射
    if (this.userRooms.has(userId)) {
      this.userRooms.get(userId).delete(roomId);
    }
    
    // 如果是直接聊天房间且没有成员，删除房间
    if (room.type === 'direct' && room.members.size === 0) {
      await this.deleteRoom(roomId);
    } else {
      await this.saveRoom(room);
    }
    
    // 发布离开事件
    await this.publishRoomEvent(roomId, {
      type: 'user_left',
      userId,
      timestamp: new Date()
    });
  }
  
  async sendMessage(roomId, senderId, messageData) {
    const room = await this.getRoom(roomId);
    if (!room) {
      throw new Error('Room not found');
    }
    
    // 检查用户是否在房间中
    if (!room.members.has(senderId)) {
      throw new Error('User not in room');
    }
    
    const message = {
      id: this.generateMessageId(),
      roomId,
      senderId,
      content: messageData.content,
      type: messageData.type || 'text',
      timestamp: new Date(),
      edited: false,
      reactions: {},
      replyTo: messageData.replyTo || null,
      attachments: messageData.attachments || []
    };
    
    // 保存消息
    await this.saveMessage(message);
    
    // 更新消息历史缓存
    if (!this.messageHistory.has(roomId)) {
      this.messageHistory.set(roomId, []);
    }
    const history = this.messageHistory.get(roomId);
    history.push(message);
    
    // 限制缓存大小
    if (history.length > 100) {
      history.shift();
    }
    
    // 发布消息事件
    await this.publishRoomEvent(roomId, {
      type: 'message',
      message
    });
    
    return message;
  }
  
  async editMessage(messageId, userId, newContent) {
    const message = await this.getMessage(messageId);
    if (!message) {
      throw new Error('Message not found');
    }
    
    if (message.senderId !== userId) {
      throw new Error('Can only edit own messages');
    }
    
    // 检查编辑时间限制（例如：5分钟内）
    const editTimeLimit = 5 * 60 * 1000; // 5分钟
    if (Date.now() - new Date(message.timestamp).getTime() > editTimeLimit) {
      throw new Error('Message edit time limit exceeded');
    }
    
    message.content = newContent;
    message.edited = true;
    message.editedAt = new Date();
    
    await this.saveMessage(message);
    
    // 发布编辑事件
    await this.publishRoomEvent(message.roomId, {
      type: 'message_edited',
      message
    });
    
    return message;
  }
  
  async deleteMessage(messageId, userId) {
    const message = await this.getMessage(messageId);
    if (!message) {
      throw new Error('Message not found');
    }
    
    const room = await this.getRoom(message.roomId);
    
    // 检查删除权限（消息发送者或房间管理员）
    if (message.senderId !== userId && !room.admins.has(userId)) {
      throw new Error('No permission to delete message');
    }
    
    await this.redis.hdel('chat:messages', messageId);
    
    // 从缓存中移除
    if (this.messageHistory.has(message.roomId)) {
      const history = this.messageHistory.get(message.roomId);
      const index = history.findIndex(msg => msg.id === messageId);
      if (index > -1) {
        history.splice(index, 1);
      }
    }
    
    // 发布删除事件
    await this.publishRoomEvent(message.roomId, {
      type: 'message_deleted',
      messageId,
      deletedBy: userId
    });
  }
  
  async addReaction(messageId, userId, emoji) {
    const message = await this.getMessage(messageId);
    if (!message) {
      throw new Error('Message not found');
    }
    
    if (!message.reactions[emoji]) {
      message.reactions[emoji] = [];
    }
    
    if (!message.reactions[emoji].includes(userId)) {
      message.reactions[emoji].push(userId);
      
      await this.saveMessage(message);
      
      // 发布反应事件
      await this.publishRoomEvent(message.roomId, {
        type: 'reaction_added',
        messageId,
        userId,
        emoji
      });
    }
  }
  
  async removeReaction(messageId, userId, emoji) {
    const message = await this.getMessage(messageId);
    if (!message) {
      throw new Error('Message not found');
    }
    
    if (message.reactions[emoji]) {
      const index = message.reactions[emoji].indexOf(userId);
      if (index > -1) {
        message.reactions[emoji].splice(index, 1);
        
        if (message.reactions[emoji].length === 0) {
          delete message.reactions[emoji];
        }
        
        await this.saveMessage(message);
        
        // 发布反应移除事件
        await this.publishRoomEvent(message.roomId, {
          type: 'reaction_removed',
          messageId,
          userId,
          emoji
        });
      }
    }
  }
  
  async getRoom(roomId) {
    if (this.rooms.has(roomId)) {
      return this.rooms.get(roomId);
    }
    
    // 从 Redis 加载
    const roomData = await this.redis.hget('chat:rooms', roomId);
    if (roomData) {
      const room = JSON.parse(roomData);
      room.members = new Set(room.members);
      room.admins = new Set(room.admins);
      room.banned = new Set(room.banned);
      
      this.rooms.set(roomId, room);
      return room;
    }
    
    return null;
  }
  
  async saveRoom(room) {
    await this.redis.hset('chat:rooms', room.id, JSON.stringify({
      ...room,
      members: Array.from(room.members),
      admins: Array.from(room.admins),
      banned: Array.from(room.banned)
    }));
  }
  
  async deleteRoom(roomId) {
    this.rooms.delete(roomId);
    await this.redis.hdel('chat:rooms', roomId);
    
    // 删除房间消息
    const messageKeys = await this.redis.keys(`chat:messages:${roomId}:*`);
    if (messageKeys.length > 0) {
      await this.redis.del(...messageKeys);
    }
  }
  
  async saveMessage(message) {
    await this.redis.hset('chat:messages', message.id, JSON.stringify(message));
    
    // 添加到房间消息列表
    await this.redis.zadd(
      `chat:room:${message.roomId}:messages`,
      new Date(message.timestamp).getTime(),
      message.id
    );
  }
  
  async getMessage(messageId) {
    const messageData = await this.redis.hget('chat:messages', messageId);
    return messageData ? JSON.parse(messageData) : null;
  }
  
  async getRecentMessages(roomId, limit = 50) {
    // 先从缓存获取
    if (this.messageHistory.has(roomId)) {
      const cached = this.messageHistory.get(roomId);
      if (cached.length >= limit) {
        return cached.slice(-limit);
      }
    }
    
    // 从 Redis 获取
    const messageIds = await this.redis.zrevrange(
      `chat:room:${roomId}:messages`,
      0,
      limit - 1
    );
    
    const messages = [];
    for (const messageId of messageIds) {
      const message = await this.getMessage(messageId);
      if (message) {
        messages.push(message);
      }
    }
    
    return messages.reverse();
  }
  
  async publishRoomEvent(roomId, eventData) {
    await this.redis.publish(
      `chat:room:${roomId}`,
      JSON.stringify(eventData)
    );
  }
  
  serializeRoom(room) {
    return {
      ...room,
      members: Array.from(room.members),
      admins: Array.from(room.admins),
      banned: Array.from(room.banned)
    };
  }
  
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
  
  // 获取用户参与的所有房间
  async getUserRooms(userId) {
    const rooms = [];
    
    if (this.userRooms.has(userId)) {
      for (const roomId of this.userRooms.get(userId)) {
        const room = await this.getRoom(roomId);
        if (room) {
          rooms.push(this.serializeRoom(room));
        }
      }
    }
    
    return rooms;
  }
  
  // 搜索房间
  async searchRooms(query, userId, limit = 20) {
    const allRoomIds = await this.redis.hkeys('chat:rooms');
    const results = [];
    
    for (const roomId of allRoomIds) {
      if (results.length >= limit) break;
      
      const room = await this.getRoom(roomId);
      if (room && room.type === 'public' && 
          (room.name.toLowerCase().includes(query.toLowerCase()) ||
           room.description?.toLowerCase().includes(query.toLowerCase()))) {
        results.push(this.serializeRoom(room));
      }
    }
    
    return results;
  }
}

module.exports = ChatRoomManager;
```

### 2. 文件上传处理

```javascript
// file-upload-handler.js
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');

class FileUploadHandler {
  constructor(options = {}) {
    this.uploadDir = options.uploadDir || './uploads';
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
    this.allowedTypes = options.allowedTypes || [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm',
      'audio/mp3', 'audio/wav', 'audio/ogg',
      'application/pdf', 'text/plain'
    ];
    
    this.setupUploadDir();
    this.setupMulter();
  }
  
  async setupUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
    
    // 创建子目录
    const subdirs = ['images', 'videos', 'audio', 'documents'];
    for (const subdir of subdirs) {
      const dirPath = path.join(this.uploadDir, subdir);
      try {
        await fs.access(dirPath);
      } catch {
        await fs.mkdir(dirPath, { recursive: true });
      }
    }
  }
  
  setupMulter() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        let subdir = 'documents';
        
        if (file.mimetype.startsWith('image/')) {
          subdir = 'images';
        } else if (file.mimetype.startsWith('video/')) {
          subdir = 'videos';
        } else if (file.mimetype.startsWith('audio/')) {
          subdir = 'audio';
        }
        
        cb(null, path.join(this.uploadDir, subdir));
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      }
    });
    
    this.upload = multer({
      storage,
      limits: {
        fileSize: this.maxFileSize
      },
      fileFilter: (req, file, cb) => {
        if (this.allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`File type ${file.mimetype} not allowed`));
        }
      }
    });
  }
  
  async processUpload(file, userId) {
    const fileInfo = {
      id: this.generateFileId(),
      originalName: file.originalname,
      filename: file.filename,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
      uploadedBy: userId,
      uploadedAt: new Date(),
      processed: false
    };
    
    // 根据文件类型进行处理
    if (file.mimetype.startsWith('image/')) {
      await this.processImage(fileInfo);
    } else if (file.mimetype.startsWith('video/')) {
      await this.processVideo(fileInfo);
    } else if (file.mimetype.startsWith('audio/')) {
      await this.processAudio(fileInfo);
    }
    
    fileInfo.processed = true;
    return fileInfo;
  }
  
  async processImage(fileInfo) {
    const inputPath = fileInfo.path;
    const dir = path.dirname(inputPath);
    const name = path.parse(fileInfo.filename).name;
    
    try {
      // 生成缩略图
      const thumbnailPath = path.join(dir, `${name}_thumb.jpg`);
      await sharp(inputPath)
        .resize(200, 200, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);
      
      fileInfo.thumbnail = thumbnailPath;
      
      // 获取图片信息
      const metadata = await sharp(inputPath).metadata();
      fileInfo.metadata = {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format
      };
      
      // 如果图片过大，生成压缩版本
      if (fileInfo.size > 2 * 1024 * 1024) { // 2MB
        const compressedPath = path.join(dir, `${name}_compressed.jpg`);
        await sharp(inputPath)
          .jpeg({ quality: 70 })
          .toFile(compressedPath);
        
        fileInfo.compressed = compressedPath;
      }
      
    } catch (error) {
      console.error('Image processing error:', error);
    }
  }
  
  async processVideo(fileInfo) {
    const inputPath = fileInfo.path;
    const dir = path.dirname(inputPath);
    const name = path.parse(fileInfo.filename).name;
    
    return new Promise((resolve, reject) => {
      // 生成视频缩略图
      const thumbnailPath = path.join(dir, `${name}_thumb.jpg`);
      
      ffmpeg(inputPath)
        .screenshots({
          timestamps: ['00:00:01'],
          filename: `${name}_thumb.jpg`,
          folder: dir,
          size: '200x200'
        })
        .on('end', () => {
          fileInfo.thumbnail = thumbnailPath;
          
          // 获取视频信息
          ffmpeg.ffprobe(inputPath, (err, metadata) => {
            if (!err && metadata) {
              const videoStream = metadata.streams.find(s => s.codec_type === 'video');
              if (videoStream) {
                fileInfo.metadata = {
                  duration: metadata.format.duration,
                  width: videoStream.width,
                  height: videoStream.height,
                  bitrate: metadata.format.bit_rate
                };
              }
            }
            resolve();
          });
        })
        .on('error', (error) => {
          console.error('Video processing error:', error);
          resolve(); // 不阻塞上传
        });
    });
  }
  
  async processAudio(fileInfo) {
    const inputPath = fileInfo.path;
    
    return new Promise((resolve) => {
      // 获取音频信息
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (!err && metadata) {
          const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
          if (audioStream) {
            fileInfo.metadata = {
              duration: metadata.format.duration,
              bitrate: metadata.format.bit_rate,
              sampleRate: audioStream.sample_rate
            };
          }
        }
        resolve();
      });
    });
  }
  
  generateFileId() {
    return `file_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
  
  getUploadMiddleware() {
    return this.upload.single('file');
  }
  
  async deleteFile(fileInfo) {
    try {
      // 删除主文件
      await fs.unlink(fileInfo.path);
      
      // 删除缩略图
      if (fileInfo.thumbnail) {
        await fs.unlink(fileInfo.thumbnail);
      }
      
      // 删除压缩版本
      if (fileInfo.compressed) {
        await fs.unlink(fileInfo.compressed);
      }
    } catch (error) {
      console.error('File deletion error:', error);
    }
  }
}

module.exports = FileUploadHandler;
```

## 推送通知系统

### 1. 通知管理器

```javascript
// notification-manager.js
const webpush = require('web-push');
const apn = require('apn');
const admin = require('firebase-admin');
const Redis = require('ioredis');

class NotificationManager {
  constructor(options = {}) {
    this.redis = new Redis({
      host: options.redisHost || 'localhost',
      port: options.redisPort || 6379
    });
    
    this.setupWebPush(options.webPush);
    this.setupAPNS(options.apns);
    this.setupFCM(options.fcm);
    
    this.subscriptions = new Map();
    this.loadSubscriptions();
  }
  
  setupWebPush(config) {
    if (config) {
      webpush.setVapidDetails(
        config.subject,
        config.publicKey,
        config.privateKey
      );
      this.webPushEnabled = true;
    }
  }
  
  setupAPNS(config) {
    if (config) {
      this.apnProvider = new apn.Provider({
        token: {
          key: config.keyPath,
          keyId: config.keyId,
          teamId: config.teamId
        },
        production: config.production || false
      });
      this.apnsEnabled = true;
    }
  }
  
  setupFCM(config) {
    if (config) {
      admin.initializeApp({
        credential: admin.credential.cert(config.serviceAccount)
      });
      this.fcmEnabled = true;
    }
  }
  
  async loadSubscriptions() {
    try {
      const subscriptionData = await this.redis.hgetall('push:subscriptions');
      
      for (const [userId, data] of Object.entries(subscriptionData)) {
        this.subscriptions.set(userId, JSON.parse(data));
      }
      
      console.log(`Loaded ${this.subscriptions.size} push subscriptions`);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    }
  }
  
  async saveSubscription(userId, subscription) {
    this.subscriptions.set(userId, subscription);
    
    await this.redis.hset(
      'push:subscriptions',
      userId,
      JSON.stringify(subscription)
    );
  }
  
  async removeSubscription(userId) {
    this.subscriptions.delete(userId);
    await this.redis.hdel('push:subscriptions', userId);
  }
  
  async subscribeWebPush(userId, subscription) {
    if (!this.webPushEnabled) {
      throw new Error('Web Push not configured');
    }
    
    const userSubscription = this.subscriptions.get(userId) || {};
    userSubscription.webPush = subscription;
    
    await this.saveSubscription(userId, userSubscription);
    
    console.log(`Web Push subscription saved for user ${userId}`);
  }
  
  async subscribeAPNS(userId, deviceToken) {
    if (!this.apnsEnabled) {
      throw new Error('APNS not configured');
    }
    
    const userSubscription = this.subscriptions.get(userId) || {};
    userSubscription.apns = { deviceToken };
    
    await this.saveSubscription(userId, userSubscription);
    
    console.log(`APNS subscription saved for user ${userId}`);
  }
  
  async subscribeFCM(userId, registrationToken) {
    if (!this.fcmEnabled) {
      throw new Error('FCM not configured');
    }
    
    const userSubscription = this.subscriptions.get(userId) || {};
    userSubscription.fcm = { registrationToken };
    
    await this.saveSubscription(userId, userSubscription);
    
    console.log(`FCM subscription saved for user ${userId}`);
  }
  
  async sendNotification(userId, notification) {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) {
      console.log(`No subscription found for user ${userId}`);
      return;
    }
    
    const results = [];
    
    // Web Push
    if (subscription.webPush && this.webPushEnabled) {
      try {
        const result = await this.sendWebPush(subscription.webPush, notification);
        results.push({ type: 'webpush', success: true, result });
      } catch (error) {
        console.error('Web Push error:', error);
        results.push({ type: 'webpush', success: false, error: error.message });
        
        // 如果订阅无效，移除它
        if (error.statusCode === 410) {
          delete subscription.webPush;
          await this.saveSubscription(userId, subscription);
        }
      }
    }
    
    // APNS
    if (subscription.apns && this.apnsEnabled) {
      try {
        const result = await this.sendAPNS(subscription.apns.deviceToken, notification);
        results.push({ type: 'apns', success: true, result });
      } catch (error) {
        console.error('APNS error:', error);
        results.push({ type: 'apns', success: false, error: error.message });
      }
    }
    
    // FCM
    if (subscription.fcm && this.fcmEnabled) {
      try {
        const result = await this.sendFCM(subscription.fcm.registrationToken, notification);
        results.push({ type: 'fcm', success: true, result });
      } catch (error) {
        console.error('FCM error:', error);
        results.push({ type: 'fcm', success: false, error: error.message });
      }
    }
    
    // 保存通知历史
    await this.saveNotificationHistory(userId, notification, results);
    
    return results;
  }
  
  async sendWebPush(subscription, notification) {
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/icon-192x192.png',
      badge: notification.badge || '/badge-72x72.png',
      data: notification.data || {},
      actions: notification.actions || [],
      tag: notification.tag,
      requireInteraction: notification.requireInteraction || false
    });
    
    const options = {
      TTL: notification.ttl || 24 * 60 * 60, // 24 hours
      urgency: notification.urgency || 'normal'
    };
    
    return await webpush.sendNotification(subscription, payload, options);
  }
  
  async sendAPNS(deviceToken, notification) {
    const note = new apn.Notification();
    
    note.expiry = Math.floor(Date.now() / 1000) + (notification.ttl || 24 * 60 * 60);
    note.badge = notification.badge;
    note.sound = notification.sound || 'ping.aiff';
    note.alert = {
      title: notification.title,
      body: notification.body
    };
    note.payload = notification.data || {};
    note.topic = notification.bundleId;
    
    const result = await this.apnProvider.send(note, deviceToken);
    
    if (result.failed.length > 0) {
      throw new Error(`APNS failed: ${result.failed[0].response.reason}`);
    }
    
    return result;
  }
  
  async sendFCM(registrationToken, notification) {
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.image
      },
      data: notification.data || {},
      token: registrationToken,
      android: {
        notification: {
          icon: notification.icon,
          color: notification.color,
          sound: notification.sound,
          tag: notification.tag
        },
        ttl: (notification.ttl || 24 * 60 * 60) * 1000
      },
      apns: {
        payload: {
          aps: {
            badge: notification.badge,
            sound: notification.sound || 'default'
          }
        }
      }
    };
    
    return await admin.messaging().send(message);
  }
  
  async sendBulkNotification(userIds, notification) {
    const results = [];
    
    // 批量发送，避免并发过高
    const batchSize = 100;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(userId => 
        this.sendNotification(userId, notification)
          .catch(error => ({ userId, error: error.message }))
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // 短暂延迟避免过载
      if (i + batchSize < userIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }
  
  async saveNotificationHistory(userId, notification, results) {
    const historyEntry = {
      userId,
      notification,
      results,
      timestamp: new Date(),
      success: results.some(r => r.success)
    };
    
    await this.redis.zadd(
      `notifications:history:${userId}`,
      Date.now(),
      JSON.stringify(historyEntry)
    );
    
    // 保留最近100条记录
    await this.redis.zremrangebyrank(
      `notifications:history:${userId}`,
      0,
      -101
    );
  }
  
  async getNotificationHistory(userId, limit = 50) {
    const history = await this.redis.zrevrange(
      `notifications:history:${userId}`,
      0,
      limit - 1
    );
    
    return history.map(entry => JSON.parse(entry));
  }
  
  async getSubscriptionStats() {
    const stats = {
      total: this.subscriptions.size,
      webPush: 0,
      apns: 0,
      fcm: 0
    };
    
    for (const subscription of this.subscriptions.values()) {
      if (subscription.webPush) stats.webPush++;
      if (subscription.apns) stats.apns++;
      if (subscription.fcm) stats.fcm++;
    }
    
    return stats;
  }
}

module.exports = NotificationManager;
```

### 2. 推送通知客户端

```javascript
// push-notification-client.js
class PushNotificationClient {
  constructor(options = {}) {
    this.vapidPublicKey = options.vapidPublicKey;
    this.serviceWorkerPath = options.serviceWorkerPath || '/sw.js';
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    
    this.subscription = null;
    this.registration = null;
    
    if (this.isSupported) {
      this.init();
    }
  }
  
  async init() {
    try {
      // 注册 Service Worker
      this.registration = await navigator.serviceWorker.register(this.serviceWorkerPath);
      console.log('Service Worker registered');
      
      // 检查现有订阅
      this.subscription = await this.registration.pushManager.getSubscription();
      
      if (this.subscription) {
        console.log('Existing push subscription found');
        await this.sendSubscriptionToServer(this.subscription);
      }
      
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
  
  async requestPermission() {
    if (!this.isSupported) {
      throw new Error('Push notifications not supported');
    }
    
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      throw new Error('Push notification permission denied');
    }
    
    return permission;
  }
  
  async subscribe() {
    if (!this.isSupported) {
      throw new Error('Push notifications not supported');
    }
    
    if (!this.registration) {
      throw new Error('Service Worker not registered');
    }
    
    // 请求权限
    await this.requestPermission();
    
    // 创建订阅
    this.subscription = await this.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
    });
    
    console.log('Push subscription created');
    
    // 发送订阅信息到服务器
    await this.sendSubscriptionToServer(this.subscription);
    
    return this.subscription;
  }
  
  async unsubscribe() {
    if (this.subscription) {
      await this.subscription.unsubscribe();
      await this.removeSubscriptionFromServer();
      this.subscription = null;
      console.log('Push subscription removed');
    }
  }
  
  async sendSubscriptionToServer(subscription) {
    try {
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(subscription)
      });
      
      if (!response.ok) {
        throw new Error('Failed to send subscription to server');
      }
      
      console.log('Subscription sent to server');
    } catch (error) {
      console.error('Error sending subscription to server:', error);
    }
  }
  
  async removeSubscriptionFromServer() {
    try {
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove subscription from server');
      }
      
      console.log('Subscription removed from server');
    } catch (error) {
      console.error('Error removing subscription from server:', error);
    }
  }
  
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }
  
  getAuthToken() {
    return localStorage.getItem('auth_token') || '';
  }
  
  isSubscribed() {
    return !!this.subscription;
  }
  
  getSubscription() {
    return this.subscription;
  }
  
  // 显示本地通知
  showLocalNotification(title, options = {}) {
    if (!this.isSupported) {
      console.warn('Notifications not supported');
      return;
    }
    
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: options.icon || '/icon-192x192.png',
        badge: options.badge || '/badge-72x72.png',
        body: options.body,
        data: options.data,
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        actions: options.actions || []
      });
      
      // 设置点击事件
      notification.onclick = (event) => {
        event.preventDefault();
        
        if (options.onClick) {
          options.onClick(event);
        } else if (options.url) {
          window.open(options.url, '_blank');
        }
        
        notification.close();
      };
      
      // 自动关闭
      if (options.autoClose) {
        setTimeout(() => {
          notification.close();
        }, options.autoClose);
      }
      
      return notification;
    }
  }
}

// Service Worker 代码 (sw.js)
const SW_CODE = `
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: data.icon || '/icon-192x192.png',
      badge: data.badge || '/badge-72x72.png',
      data: data.data || {},
      actions: data.actions || [],
      tag: data.tag,
      requireInteraction: data.requireInteraction || false
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const data = event.notification.data;
  
  if (event.action) {
    // 处理操作按钮点击
    console.log('Action clicked:', event.action);
  } else {
    // 处理通知点击
    if (data.url) {
      event.waitUntil(
        clients.openWindow(data.url)
      );
    }
  }
});

self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed:', event.notification.tag);
});
`;

module.exports = { PushNotificationClient, SW_CODE };
```

## 性能优化

### 1. 连接池管理

```javascript
// connection-pool-manager.js
class ConnectionPoolManager {
  constructor(options = {}) {
    this.maxConnections = options.maxConnections || 10000;
    this.connectionTimeout = options.connectionTimeout || 30000;
    this.heartbeatInterval = options.heartbeatInterval || 25000;
    
    this.connections = new Map();
    this.connectionsByUser = new Map();
    this.connectionStats = {
      total: 0,
      active: 0,
      idle: 0,
      peak: 0
    };
    
    this.startCleanupTimer();
    this.startStatsTimer();
  }
  
  addConnection(socket) {
    const connectionId = socket.id;
    const userId = socket.userId;
    
    // 检查连接数限制
    if (this.connections.size >= this.maxConnections) {
      socket.emit('error', { message: 'Server at capacity' });
      socket.disconnect(true);
      return false;
    }
    
    const connection = {
      id: connectionId,
      socket,
      userId,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      isActive: true,
      rooms: new Set(),
      messageCount: 0,
      bytesReceived: 0,
      bytesSent: 0
    };
    
    this.connections.set(connectionId, connection);
    
    // 用户连接映射
    if (!this.connectionsByUser.has(userId)) {
      this.connectionsByUser.set(userId, new Set());
    }
    this.connectionsByUser.get(userId).add(connectionId);
    
    // 更新统计
    this.connectionStats.total++;
    this.connectionStats.active++;
    
    if (this.connectionStats.active > this.connectionStats.peak) {
      this.connectionStats.peak = this.connectionStats.active;
    }
    
    console.log(`Connection added: ${connectionId} (User: ${userId})`);
    return true;
  }
  
  removeConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
    
    const userId = connection.userId;
    
    // 从用户连接映射中移除
    if (this.connectionsByUser.has(userId)) {
      this.connectionsByUser.get(userId).delete(connectionId);
      
      if (this.connectionsByUser.get(userId).size === 0) {
        this.connectionsByUser.delete(userId);
      }
    }
    
    this.connections.delete(connectionId);
    
    // 更新统计
    this.connectionStats.active--;
    
    console.log(`Connection removed: ${connectionId} (User: ${userId})`);
  }
  
  updateActivity(connectionId, bytesReceived = 0, bytesSent = 0) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastActivity = Date.now();
      connection.bytesReceived += bytesReceived;
      connection.bytesSent += bytesSent;
      connection.messageCount++;
    }
  }
  
  getUserConnections(userId) {
    const connectionIds = this.connectionsByUser.get(userId);
    if (!connectionIds) return [];
    
    return Array.from(connectionIds)
      .map(id => this.connections.get(id))
      .filter(conn => conn && conn.isActive);
  }
  
  broadcastToUser(userId, event, data) {
    const connections = this.getUserConnections(userId);
    connections.forEach(connection => {
      if (connection.socket.connected) {
        connection.socket.emit(event, data);
        this.updateActivity(connection.id, 0, JSON.stringify(data).length);
      }
    });
  }
  
  startCleanupTimer() {
    setInterval(() => {
      this.cleanupInactiveConnections();
    }, 60000); // 每分钟清理一次
  }
  
  cleanupInactiveConnections() {
    const now = Date.now();
    const inactiveConnections = [];
    
    for (const [connectionId, connection] of this.connections) {
      const inactiveTime = now - connection.lastActivity;
      
      if (inactiveTime > this.connectionTimeout) {
        inactiveConnections.push(connectionId);
      }
    }
    
    inactiveConnections.forEach(connectionId => {
      const connection = this.connections.get(connectionId);
      if (connection && connection.socket.connected) {
        console.log(`Disconnecting inactive connection: ${connectionId}`);
        connection.socket.disconnect(true);
      }
    });
  }
  
  startStatsTimer() {
    setInterval(() => {
      this.updateStats();
    }, 10000); // 每10秒更新统计
  }
  
  updateStats() {
    let activeCount = 0;
    let idleCount = 0;
    
    for (const connection of this.connections.values()) {
      const inactiveTime = Date.now() - connection.lastActivity;
      
      if (inactiveTime < 30000) { // 30秒内有活动
        activeCount++;
      } else {
        idleCount++;
      }
    }
    
    this.connectionStats.active = activeCount;
    this.connectionStats.idle = idleCount;
  }
  
  getStats() {
    return {
      ...this.connectionStats,
      current: this.connections.size,
      users: this.connectionsByUser.size,
      avgConnectionsPerUser: this.connectionsByUser.size > 0 
        ? this.connections.size / this.connectionsByUser.size 
        : 0
    };
  }
  
  getDetailedStats() {
    const stats = this.getStats();
    const connectionDetails = [];
    
    for (const connection of this.connections.values()) {
      connectionDetails.push({
        id: connection.id,
        userId: connection.userId,
        connectedAt: connection.connectedAt,
        lastActivity: connection.lastActivity,
        messageCount: connection.messageCount,
        bytesReceived: connection.bytesReceived,
        bytesSent: connection.bytesSent,
        rooms: Array.from(connection.rooms)
      });
    }
    
    return {
      ...stats,
      connections: connectionDetails
    };
  }
}

module.exports = ConnectionPoolManager;
```

### 2. 消息队列优化

```javascript
// message-queue-optimizer.js
const Redis = require('ioredis');
const { Worker } = require('worker_threads');

class MessageQueueOptimizer {
  constructor(options = {}) {
    this.redis = new Redis({
      host: options.redisHost || 'localhost',
      port: options.redisPort || 6379
    });
    
    this.batchSize = options.batchSize || 100;
    this.batchTimeout = options.batchTimeout || 1000;
    this.maxRetries = options.maxRetries || 3;
    this.workerCount = options.workerCount || 4;
    
    this.messageQueue = [];
    this.batchTimer = null;
    this.workers = [];
    
    this.setupWorkers();
    this.startBatchProcessor();
  }
  
  setupWorkers() {
    for (let i = 0; i < this.workerCount; i++) {
      const worker = new Worker(`
        const { parentPort } = require('worker_threads');
        const Redis = require('ioredis');
        
        const redis = new Redis({
          host: '${this.redis.options.host}',
          port: ${this.redis.options.port}
        });
        
        parentPort.on('message', async (batch) => {
          try {
            const results = [];
            
            for (const message of batch) {
              const result = await processMessage(message);
              results.push(result);
            }
            
            parentPort.postMessage({ success: true, results });
          } catch (error) {
            parentPort.postMessage({ success: false, error: error.message });
          }
        });
        
        async function processMessage(message) {
          // 处理消息逻辑
          switch (message.type) {
            case 'broadcast':
              return await processBroadcast(message);
            case 'notification':
              return await processNotification(message);
            case 'analytics':
              return await processAnalytics(message);
            default:
              throw new Error('Unknown message type');
          }
        }
        
        async function processBroadcast(message) {
          // 广播消息处理
          await redis.publish(message.channel, JSON.stringify(message.data));
          return { messageId: message.id, status: 'broadcasted' };
        }
        
        async function processNotification(message) {
          // 通知处理
          await redis.zadd(
            'notifications:pending',
            Date.now(),
            JSON.stringify(message.data)
          );
          return { messageId: message.id, status: 'queued' };
        }
        
        async function processAnalytics(message) {
          // 分析数据处理
          await redis.hincrby('analytics:events', message.data.event, 1);
          return { messageId: message.id, status: 'recorded' };
        }
      `, { eval: true });
      
      worker.on('message', (result) => {
        if (result.success) {
          console.log('Batch processed successfully:', result.results.length);
        } else {
          console.error('Batch processing failed:', result.error);
        }
      });
      
      worker.on('error', (error) => {
        console.error('Worker error:', error);
      });
      
      this.workers.push(worker);
    }
  }
  
  queueMessage(message) {
    const queuedMessage = {
      id: this.generateMessageId(),
      ...message,
      queuedAt: Date.now(),
      retries: 0
    };
    
    this.messageQueue.push(queuedMessage);
    
    // 如果队列达到批处理大小，立即处理
    if (this.messageQueue.length >= this.batchSize) {
      this.processBatch();
    }
  }
  
  startBatchProcessor() {
    this.batchTimer = setInterval(() => {
      if (this.messageQueue.length > 0) {
        this.processBatch();
      }
    }, this.batchTimeout);
  }
  
  processBatch() {
    if (this.messageQueue.length === 0) return;
    
    const batch = this.messageQueue.splice(0, this.batchSize);
    const availableWorker = this.getAvailableWorker();
    
    if (availableWorker) {
      availableWorker.postMessage(batch);
    } else {
      // 如果没有可用的工作线程，重新加入队列
      this.messageQueue.unshift(...batch);
    }
  }
  
  getAvailableWorker() {
    // 简单的轮询策略
    return this.workers[Math.floor(Math.random() * this.workers.length)];
  }
  
  // 优先级队列
  queuePriorityMessage(message, priority = 'normal') {
    const queuedMessage = {
      id: this.generateMessageId(),
      ...message,
      priority,
      queuedAt: Date.now(),
      retries: 0
    };
    
    // 根据优先级插入到队列中的适当位置
    const priorityOrder = { 'high': 0, 'normal': 1, 'low': 2 };
    const messagePriority = priorityOrder[priority] || 1;
    
    let insertIndex = this.messageQueue.length;
    for (let i = 0; i < this.messageQueue.length; i++) {
      const existingPriority = priorityOrder[this.messageQueue[i].priority] || 1;
      if (messagePriority < existingPriority) {
        insertIndex = i;
        break;
      }
    }
    
    this.messageQueue.splice(insertIndex, 0, queuedMessage);
  }
  
  // 延迟消息
  queueDelayedMessage(message, delay) {
    setTimeout(() => {
      this.queueMessage(message);
    }, delay);
  }
  
  // 定时消息
  queueScheduledMessage(message, scheduleTime) {
    const delay = scheduleTime - Date.now();
    if (delay > 0) {
      this.queueDelayedMessage(message, delay);
    } else {
      this.queueMessage(message);
    }
  }
  
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
  
  getQueueStats() {
    return {
      queueLength: this.messageQueue.length,
      workerCount: this.workers.length,
      batchSize: this.batchSize,
      batchTimeout: this.batchTimeout
    };
  }
  
  async shutdown() {
    // 清理定时器
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    
    // 处理剩余消息
    if (this.messageQueue.length > 0) {
      console.log(`Processing remaining ${this.messageQueue.length} messages...`);
      while (this.messageQueue.length > 0) {
        this.processBatch();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // 终止工作线程
    await Promise.all(this.workers.map(worker => worker.terminate()));
    
    // 关闭 Redis 连接
    await this.redis.quit();
  }
}

module.exports = MessageQueueOptimizer;
```

### 3. 内存优化

```javascript
// memory-optimizer.js
class MemoryOptimizer {
  constructor(options = {}) {
    this.maxMemoryUsage = options.maxMemoryUsage || 1024 * 1024 * 1024; // 1GB
    this.gcThreshold = options.gcThreshold || 0.8; // 80%
    this.cacheSize = options.cacheSize || 10000;
    
    this.messageCache = new Map();
    this.userCache = new Map();
    this.roomCache = new Map();
    
    this.startMemoryMonitoring();
  }
  
  startMemoryMonitoring() {
    setInterval(() => {
      this.checkMemoryUsage();
    }, 30000); // 每30秒检查一次
  }
  
  checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const usageRatio = memUsage.heapUsed / this.maxMemoryUsage;
    
    console.log('Memory usage:', {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
      external: Math.round(memUsage.external / 1024 / 1024) + 'MB',
      usageRatio: Math.round(usageRatio * 100) + '%'
    });
    
    if (usageRatio > this.gcThreshold) {
      console.log('Memory usage high, triggering cleanup...');
      this.performCleanup();
    }
  }
  
  performCleanup() {
    // 清理消息缓存
    this.cleanupCache(this.messageCache, 'messages');
    
    // 清理用户缓存
    this.cleanupCache(this.userCache, 'users');
    
    // 清理房间缓存
    this.cleanupCache(this.roomCache, 'rooms');
    
    // 强制垃圾回收
    if (global.gc) {
      global.gc();
      console.log('Garbage collection triggered');
    }
  }
  
  cleanupCache(cache, type) {
    const initialSize = cache.size;
    
    if (cache.size > this.cacheSize) {
      // 删除最旧的条目
      const entries = Array.from(cache.entries());
      const toDelete = entries
        .sort((a, b) => (a[1].lastAccessed || 0) - (b[1].lastAccessed || 0))
        .slice(0, Math.floor(cache.size * 0.3)); // 删除30%最旧的条目
      
      toDelete.forEach(([key]) => cache.delete(key));
      
      console.log(`Cleaned up ${type} cache: ${initialSize} -> ${cache.size}`);
    }
  }
  
  // 智能缓存管理
  setCache(cache, key, value, ttl = 300000) { // 默认5分钟TTL
    const entry = {
      value,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      ttl,
      accessCount: 0
    };
    
    cache.set(key, entry);
    
    // 如果缓存过大，触发清理
    if (cache.size > this.cacheSize * 1.2) {
      this.cleanupCache(cache, 'cache');
    }
  }
  
  getCache(cache, key) {
    const entry = cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // 检查TTL
    if (Date.now() - entry.createdAt > entry.ttl) {
      cache.delete(key);
      return null;
    }
    
    // 更新访问信息
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    
    return entry.value;
  }
  
  // 对象池管理
  createObjectPool(createFn, resetFn, initialSize = 10) {
    const pool = [];
    
    // 预创建对象
    for (let i = 0; i < initialSize; i++) {
      pool.push(createFn());
    }
    
    return {
      acquire() {
        return pool.length > 0 ? pool.pop() : createFn();
      },
      
      release(obj) {
        if (pool.length < initialSize * 2) {
          resetFn(obj);
          pool.push(obj);
        }
      },
      
      size() {
        return pool.length;
      }
    };
  }
  
  // 字符串池
  createStringPool() {
    const stringPool = new Map();
    
    return {
      intern(str) {
        if (stringPool.has(str)) {
          return stringPool.get(str);
        }
        
        stringPool.set(str, str);
        return str;
      },
      
      size() {
        return stringPool.size;
      },
      
      clear() {
        stringPool.clear();
      }
    };
  }
  
  // 缓冲区池
  createBufferPool(bufferSize = 1024, poolSize = 100) {
    const buffers = [];
    
    for (let i = 0; i < poolSize; i++) {
      buffers.push(Buffer.allocUnsafe(bufferSize));
    }
    
    return {
      acquire() {
        return buffers.length > 0 ? buffers.pop() : Buffer.allocUnsafe(bufferSize);
      },
      
      release(buffer) {
        if (buffers.length < poolSize && buffer.length === bufferSize) {
          buffer.fill(0); // 清零
          buffers.push(buffer);
        }
      },
      
      size() {
        return buffers.length;
      }
    };
  }
  
  getMemoryStats() {
    const memUsage = process.memoryUsage();
    
    return {
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss
      },
      caches: {
        messages: this.messageCache.size,
        users: this.userCache.size,
        rooms: this.roomCache.size
      },
      usage: {
        ratio: memUsage.heapUsed / this.maxMemoryUsage,
        threshold: this.gcThreshold
      }
    };
  }
}

module.exports = MemoryOptimizer;
```

## 最佳实践

### 1. 安全最佳实践

```javascript
// security-best-practices.js
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
const xss = require('xss');

class WebSocketSecurity {
  constructor() {
    this.rateLimiters = new Map();
    this.blockedIPs = new Set();
    this.suspiciousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /eval\s*\(/gi
    ];
  }
  
  // 输入验证和清理
  validateAndSanitizeInput(data) {
    const errors = [];
    const sanitized = {};
    
    for (const [key, value] of Object.entries(data)) {
      try {
        // 基本类型检查
        if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
          if (value !== null && value !== undefined) {
            errors.push(`Invalid type for field ${key}`);
            continue;
          }
        }
        
        if (typeof value === 'string') {
          // 长度检查
          if (value.length > 10000) {
            errors.push(`Field ${key} too long`);
            continue;
          }
          
          // XSS 检查
          if (this.containsSuspiciousContent(value)) {
            errors.push(`Field ${key} contains suspicious content`);
            continue;
          }
          
          // 清理 HTML
          sanitized[key] = xss(value, {
            whiteList: {}, // 不允许任何 HTML 标签
            stripIgnoreTag: true,
            stripIgnoreTagBody: ['script']
          });
        } else {
          sanitized[key] = value;
        }
      } catch (error) {
        errors.push(`Validation error for field ${key}: ${error.message}`);
      }
    }
    
    return { sanitized, errors };
  }
  
  containsSuspiciousContent(content) {
    return this.suspiciousPatterns.some(pattern => pattern.test(content));
  }
  
  // 速率限制
  createRateLimiter(key, options = {}) {
    const limiter = {
      windowMs: options.windowMs || 60000, // 1分钟
      maxRequests: options.maxRequests || 100,
      requests: new Map()
    };
    
    this.rateLimiters.set(key, limiter);
    return limiter;
  }
  
  checkRateLimit(limitKey, identifier) {
    const limiter = this.rateLimiters.get(limitKey);
    if (!limiter) return true;
    
    const now = Date.now();
    const userRequests = limiter.requests.get(identifier) || [];
    
    // 清理过期请求
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < limiter.windowMs
    );
    
    if (validRequests.length >= limiter.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    limiter.requests.set(identifier, validRequests);
    
    return true;
  }
  
  // IP 封禁管理
  blockIP(ip, duration = 3600000) { // 默认1小时
    this.blockedIPs.add(ip);
    
    setTimeout(() => {
      this.blockedIPs.delete(ip);
      console.log(`IP ${ip} unblocked`);
    }, duration);
    
    console.log(`IP ${ip} blocked for ${duration}ms`);
  }
  
  isIPBlocked(ip) {
    return this.blockedIPs.has(ip);
  }
  
  // 消息内容过滤
  filterMessage(content) {
    // 敏感词过滤
    const sensitiveWords = ['spam', 'hack', 'exploit']; // 实际应用中应该从配置文件加载
    
    let filtered = content;
    sensitiveWords.forEach(word => {
      const regex = new RegExp(word, 'gi');
      filtered = filtered.replace(regex, '*'.repeat(word.length));
    });
    
    return filtered;
  }
  
  // 连接安全检查
  validateConnection(socket, token) {
    const ip = socket.handshake.address;
    
    // 检查 IP 是否被封禁
    if (this.isIPBlocked(ip)) {
      throw new Error('IP blocked');
    }
    
    // 检查连接速率
    if (!this.checkRateLimit('connection', ip)) {
      throw new Error('Connection rate limit exceeded');
    }
    
    // 验证 token
    if (!token || !this.validateToken(token)) {
      throw new Error('Invalid token');
    }
    
    return true;
  }
  
  validateToken(token) {
    try {
      // 这里应该实现实际的 token 验证逻辑
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return !!decoded;
    } catch (error) {
      return false;
    }
  }
  
  // 安全中间件
  createSecurityMiddleware() {
    return [
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:"]
          }
        }
      }),
      
      rateLimit({
        windowMs: 15 * 60 * 1000, // 15分钟
        max: 1000, // 限制每个IP 15分钟内最多1000个请求
        message: 'Too many requests from this IP'
      })
    ];
  }
}

module.exports = WebSocketSecurity;
```

### 2. 监控和日志

```javascript
// monitoring-and-logging.js
const winston = require('winston');
const prometheus = require('prom-client');

class WebSocketMonitoring {
  constructor() {
    this.setupLogger();
    this.setupMetrics();
    this.startMetricsCollection();
  }
  
  setupLogger() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'websocket-server' },
      transports: [
        new winston.transports.File({ 
          filename: 'logs/websocket-error.log', 
          level: 'error' 
        }),
        new winston.transports.File({ 
          filename: 'logs/websocket-combined.log' 
        }),
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }
  
  setupMetrics() {
    // 连接数指标
    this.connectionGauge = new prometheus.Gauge({
      name: 'websocket_connections_total',
      help: 'Total number of WebSocket connections',
      labelNames: ['status']
    });
    
    // 消息数指标
    this.messageCounter = new prometheus.Counter({
      name: 'websocket_messages_total',
      help: 'Total number of WebSocket messages',
      labelNames: ['type', 'status']
    });
    
    // 响应时间指标
    this.responseTimeHistogram = new prometheus.Histogram({
      name: 'websocket_response_time_seconds',
      help: 'WebSocket response time in seconds',
      labelNames: ['operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]
    });
    
    // 错误数指标
    this.errorCounter = new prometheus.Counter({
      name: 'websocket_errors_total',
      help: 'Total number of WebSocket errors',
      labelNames: ['type', 'code']
    });
    
    // 内存使用指标
    this.memoryGauge = new prometheus.Gauge({
      name: 'websocket_memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type']
    });
  }
  
  startMetricsCollection() {
    // 收集默认指标
    prometheus.collectDefaultMetrics({ prefix: 'websocket_' });
    
    // 定期更新内存指标
    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.memoryGauge.set({ type: 'heap_used' }, memUsage.heapUsed);
      this.memoryGauge.set({ type: 'heap_total' }, memUsage.heapTotal);
      this.memoryGauge.set({ type: 'external' }, memUsage.external);
      this.memoryGauge.set({ type: 'rss' }, memUsage.rss);
    }, 10000);
  }
  
  // 记录连接事件
  logConnection(event, data) {
    this.logger.info('Connection event', {
      event,
      ...data,
      timestamp: new Date().toISOString()
    });
    
    if (event === 'connected') {
      this.connectionGauge.inc({ status: 'active' });
    } else if (event === 'disconnected') {
      this.connectionGauge.dec({ status: 'active' });
    }
  }
  
  // 记录消息事件
  logMessage(type, status, data = {}) {
    this.logger.info('Message event', {
      type,
      status,
      ...data,
      timestamp: new Date().toISOString()
    });
    
    this.messageCounter.inc({ type, status });
  }
  
  // 记录错误
  logError(error, context = {}) {
    this.logger.error('WebSocket error', {
      error: error.message,
      stack: error.stack,
      ...context,
      timestamp: new Date().toISOString()
    });
    
    this.errorCounter.inc({ 
      type: error.name || 'UnknownError',
      code: error.code || 'unknown'
    });
  }
  
  // 性能监控
  measurePerformance(operation, fn) {
    const startTime = Date.now();
    const timer = this.responseTimeHistogram.startTimer({ operation });
    
    try {
      const result = fn();
      
      if (result && typeof result.then === 'function') {
        // 异步操作
        return result
          .then(res => {
            timer();
            this.logPerformance(operation, Date.now() - startTime, true);
            return res;
          })
          .catch(err => {
            timer();
            this.logPerformance(operation, Date.now() - startTime, false);
            throw err;
          });
      } else {
        // 同步操作
        timer();
        this.logPerformance(operation, Date.now() - startTime, true);
        return result;
      }
    } catch (error) {
      timer();
      this.logPerformance(operation, Date.now() - startTime, false);
      throw error;
    }
  }
  
  logPerformance(operation, duration, success) {
    this.logger.info('Performance metric', {
      operation,
      duration,
      success,
      timestamp: new Date().toISOString()
    });
  }
  
  // 健康检查
  getHealthStatus() {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    return {
      status: 'healthy',
      uptime,
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
        external: Math.round(memUsage.external / 1024 / 1024) + 'MB',
        rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB'
      },
      timestamp: new Date().toISOString()
    };
  }
  
  // 获取指标
  async getMetrics() {
    return await prometheus.register.metrics();
  }
  
  // 创建监控中间件
  createMonitoringMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        this.logger.info('HTTP request', {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          timestamp: new Date().toISOString()
        });
      });
      
      next();
    };
  }
}

module.exports = WebSocketMonitoring;
```

### 3. 部署配置

```javascript
// deployment-config.js
const cluster = require('cluster');
const os = require('os');

class WebSocketDeployment {
  constructor(options = {}) {
    this.numWorkers = options.numWorkers || os.cpus().length;
    this.port = options.port || process.env.PORT || 3000;
    this.environment = options.environment || process.env.NODE_ENV || 'development';
    
    this.setupCluster();
  }
  
  setupCluster() {
    if (cluster.isMaster) {
      this.setupMaster();
    } else {
      this.setupWorker();
    }
  }
  
  setupMaster() {
    console.log(`Master ${process.pid} is running`);
    console.log(`Starting ${this.numWorkers} workers...`);
    
    // 创建工作进程
    for (let i = 0; i < this.numWorkers; i++) {
      this.forkWorker();
    }
    
    // 监听工作进程退出
    cluster.on('exit', (worker, code, signal) => {
      console.log(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
      console.log('Starting a new worker...');
      this.forkWorker();
    });
    
    // 优雅关闭
    process.on('SIGTERM', () => {
      console.log('Master received SIGTERM, shutting down gracefully...');
      this.gracefulShutdown();
    });
    
    process.on('SIGINT', () => {
      console.log('Master received SIGINT, shutting down gracefully...');
      this.gracefulShutdown();
    });
  }
  
  forkWorker() {
    const worker = cluster.fork();
    
    // 设置工作进程超时
    const timeout = setTimeout(() => {
      console.log(`Worker ${worker.process.pid} startup timeout, killing...`);
      worker.kill();
    }, 30000); // 30秒超时
    
    worker.on('listening', () => {
      clearTimeout(timeout);
      console.log(`Worker ${worker.process.pid} is listening on port ${this.port}`);
    });
    
    return worker;
  }
  
  setupWorker() {
    const WebSocketServer = require('./websocket-server');
    
    const server = new WebSocketServer({
      port: this.port,
      environment: this.environment,
      workerId: cluster.worker.id
    });
    
    server.start();
    
    console.log(`Worker ${process.pid} started`);
    
    // 优雅关闭
    process.on('SIGTERM', () => {
      console.log(`Worker ${process.pid} received SIGTERM, shutting down gracefully...`);
      server.gracefulShutdown();
    });
  }
  
  gracefulShutdown() {
    const workers = Object.values(cluster.workers);
    let shutdownCount = 0;
    
    workers.forEach(worker => {
      worker.send('shutdown');
      
      const timeout = setTimeout(() => {
        console.log(`Force killing worker ${worker.process.pid}`);
        worker.kill('SIGKILL');
      }, 10000); // 10秒强制关闭
      
      worker.on('disconnect', () => {
        clearTimeout(timeout);
        shutdownCount++;
        
        if (shutdownCount === workers.length) {
          console.log('All workers shut down, exiting master...');
          process.exit(0);
        }
      });
    });
  }
  
  // Docker 配置
  static getDockerConfig() {
    return `
# Dockerfile
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制应用代码
COPY . .

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S websocket -u 1001

# 更改文件所有权
RUN chown -R websocket:nodejs /app
USER websocket

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 启动应用
CMD ["node", "server.js"]
`;
  }
  
  // Docker Compose 配置
  static getDockerComposeConfig() {
    return `
# docker-compose.yml
version: '3.8'

services:
  websocket-server:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - redis
    restart: unless-stopped
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
  
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - websocket-server
    restart: unless-stopped

volumes:
  redis_data:
`;
  }
  
  // Nginx 配置
  static getNginxConfig() {
    return `
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream websocket_backend {
        least_conn;
        server websocket-server:3000;
    }
    
    map $http_upgrade $connection_upgrade {
        default upgrade;
        '' close;
    }
    
    server {
        listen 80;
        server_name your-domain.com;
        
        # 重定向到 HTTPS
        return 301 https://$server_name$request_uri;
    }
    
    server {
        listen 443 ssl http2;
        server_name your-domain.com;
        
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        
        # SSL 配置
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        
        # WebSocket 代理
        location /socket.io/ {
            proxy_pass http://websocket_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket 特定配置
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 86400;
            proxy_send_timeout 86400;
        }
        
        # 静态文件
        location / {
            proxy_pass http://websocket_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # 健康检查
        location /health {
            proxy_pass http://websocket_backend/health;
            access_log off;
        }
    }
}
`;
  }
  
  // Kubernetes 配置
  static getKubernetesConfig() {
    return `
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: websocket-server
  labels:
    app: websocket-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: websocket-server
  template:
    metadata:
      labels:
        app: websocket-server
    spec:
      containers:
      - name: websocket-server
        image: your-registry/websocket-server:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_HOST
          value: "redis-service"
        - name: REDIS_PORT
          value: "6379"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: websocket-service
spec:
  selector:
    app: websocket-server
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
`;
  }
}

module.exports = WebSocketDeployment;
```

## 总结

本章详细介绍了 Node.js 中 WebSocket 实时通信的完整实现方案，包括：

### 核心功能
- **Socket.IO 实现**：完整的服务器和客户端实现，支持认证、房间管理、消息处理
- **原生 WebSocket**：高性能的原生 WebSocket 服务器和客户端
- **实时聊天应用**：聊天室管理、文件上传、消息处理
- **推送通知系统**：支持 Web Push、APNS、FCM 多平台推送

### 性能优化
- **连接池管理**：智能连接管理和资源优化
- **消息队列优化**：批处理、工作线程、优先级队列
- **内存优化**：缓存管理、对象池、垃圾回收优化

### 最佳实践
- **安全最佳实践**：输入验证、速率限制、IP 封禁、XSS 防护
- **监控和日志**：完整的监控指标、日志记录、性能分析
- **部署配置**：集群部署、Docker 容器化、Kubernetes 编排

### 关键特性
- 高并发连接支持
- 实时双向通信
- 多房间管理
- 文件上传处理
- 推送通知集成
- 性能监控
- 安全防护
- 容器化部署
