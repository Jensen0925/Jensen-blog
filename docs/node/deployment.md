# Node.js 部署指南

本章将介绍 Node.js 应用的部署策略、最佳实践和常用工具。

## 部署环境准备

### 服务器环境配置

```bash
# Ubuntu/Debian 系统
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 安装必要工具
sudo apt install -y curl wget git build-essential

# 安装 Node.js (使用 NodeSource 仓库)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version

# 安装 PM2 (进程管理器)
npm install -g pm2

# 安装 Nginx (反向代理)
sudo apt install -y nginx

# 启动并启用服务
sudo systemctl start nginx
sudo systemctl enable nginx
```

```bash
# CentOS/RHEL 系统
# 更新系统
sudo yum update -y

# 安装开发工具
sudo yum groupinstall -y "Development Tools"
sudo yum install -y curl wget git

# 安装 Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 安装 PM2
npm install -g pm2

# 安装 Nginx
sudo yum install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 环境变量配置

```bash
# /etc/environment
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp
DB_USER=myuser
DB_PASSWORD=mypassword
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret
API_KEY=your-api-key
```

```javascript
// config/environment.js
const config = {
  development: {
    port: process.env.PORT || 3000,
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      name: process.env.DB_NAME || 'myapp_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password'
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    },
    logging: {
      level: 'debug'
    }
  },
  
  production: {
    port: process.env.PORT || 3000,
    database: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      name: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: true,
      pool: {
        min: 2,
        max: 10
      }
    },
    redis: {
      url: process.env.REDIS_URL
    },
    logging: {
      level: 'info'
    },
    security: {
      jwtSecret: process.env.JWT_SECRET,
      apiKey: process.env.API_KEY
    }
  }
};

module.exports = config[process.env.NODE_ENV || 'development'];
```

## PM2 进程管理

### PM2 配置文件

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'myapp',
    script: './app.js',
    instances: 'max', // 使用所有 CPU 核心
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // 日志配置
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // 自动重启配置
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    
    // 监控配置
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    
    // 其他配置
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 3000
  }],
  
  // 部署配置
  deploy: {
    production: {
      user: 'deploy',
      host: ['192.168.1.100'],
      ref: 'origin/main',
      repo: 'git@github.com:username/myapp.git',
      path: '/var/www/myapp',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production'
    },
    
    staging: {
      user: 'deploy',
      host: ['192.168.1.101'],
      ref: 'origin/develop',
      repo: 'git@github.com:username/myapp.git',
      path: '/var/www/myapp-staging',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env staging'
    }
  }
};
```

### PM2 常用命令

```bash
# 启动应用
pm2 start ecosystem.config.js --env production

# 重启应用
pm2 restart myapp

# 重新加载应用（零停机时间）
pm2 reload myapp

# 停止应用
pm2 stop myapp

# 删除应用
pm2 delete myapp

# 查看应用状态
pm2 status
pm2 list

# 查看日志
pm2 logs myapp
pm2 logs myapp --lines 100

# 监控应用
pm2 monit

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME

# 部署应用
pm2 deploy production setup
pm2 deploy production
```

### 健康检查和自动重启

```javascript
// health/healthCheck.js
const http = require('http');
const { promisify } = require('util');

class HealthChecker {
  constructor(options = {}) {
    this.port = options.port || process.env.PORT || 3000;
    this.timeout = options.timeout || 5000;
    this.interval = options.interval || 30000;
    this.maxFailures = options.maxFailures || 3;
    this.failures = 0;
    this.isHealthy = true;
    
    this.checks = new Map();
    this.startHealthCheck();
  }
  
  // 添加健康检查项
  addCheck(name, checkFn) {
    this.checks.set(name, checkFn);
  }
  
  // 执行所有健康检查
  async runChecks() {
    const results = {};
    let allHealthy = true;
    
    for (const [name, checkFn] of this.checks.entries()) {
      try {
        const startTime = Date.now();
        const result = await Promise.race([
          checkFn(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), this.timeout)
          )
        ]);
        
        results[name] = {
          status: 'healthy',
          responseTime: Date.now() - startTime,
          details: result
        };
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          error: error.message
        };
        allHealthy = false;
      }
    }
    
    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: results
    };
  }
  
  // 启动定期健康检查
  startHealthCheck() {
    setInterval(async () => {
      try {
        const health = await this.runChecks();
        
        if (health.status === 'healthy') {
          this.failures = 0;
          this.isHealthy = true;
        } else {
          this.failures++;
          
          if (this.failures >= this.maxFailures) {
            this.isHealthy = false;
            console.error('应用健康检查失败，准备重启...');
            
            // 通知 PM2 重启
            if (process.send) {
              process.send('shutdown');
            } else {
              process.exit(1);
            }
          }
        }
      } catch (error) {
        console.error('健康检查执行失败:', error);
      }
    }, this.interval);
  }
  
  // 创建健康检查端点
  createHealthEndpoint(app) {
    app.get('/health', async (req, res) => {
      try {
        const health = await this.runChecks();
        const statusCode = health.status === 'healthy' ? 200 : 503;
        
        res.status(statusCode).json({
          ...health,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          pid: process.pid
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          error: error.message
        });
      }
    });
    
    // 简单的存活检查
    app.get('/ping', (req, res) => {
      res.json({ status: 'ok', timestamp: Date.now() });
    });
  }
}

module.exports = HealthChecker;
```

```javascript
// 使用健康检查
const express = require('express');
const HealthChecker = require('./health/healthCheck');
const db = require('./db/connection');
const redis = require('./db/redis');

const app = express();
const healthChecker = new HealthChecker();

// 添加数据库健康检查
healthChecker.addCheck('database', async () => {
  const result = await db.query('SELECT 1');
  return { connected: true, result: result.rows[0] };
});

// 添加 Redis 健康检查
healthChecker.addCheck('redis', async () => {
  const result = await redis.ping();
  return { connected: true, response: result };
});

// 添加外部 API 健康检查
healthChecker.addCheck('external-api', async () => {
  const response = await fetch('https://api.example.com/health');
  return { status: response.status, ok: response.ok };
});

// 创建健康检查端点
healthChecker.createHealthEndpoint(app);

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，开始优雅关闭...');
  
  server.close(() => {
    console.log('HTTP 服务器已关闭');
    
    // 关闭数据库连接
    db.end(() => {
      console.log('数据库连接已关闭');
      process.exit(0);
    });
  });
});

const server = app.listen(3000, () => {
  console.log('服务器启动在端口 3000');
  
  // 通知 PM2 应用已准备就绪
  if (process.send) {
    process.send('ready');
  }
});
```

## Nginx 反向代理

### Nginx 配置

```nginx
# /etc/nginx/sites-available/myapp
upstream myapp {
    least_conn;
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3002 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3003 max_fails=3 fail_timeout=30s;
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name myapp.com www.myapp.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS 配置
server {
    listen 443 ssl http2;
    server_name myapp.com www.myapp.com;
    
    # SSL 证书配置
    ssl_certificate /etc/letsencrypt/live/myapp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/myapp.com/privkey.pem;
    
    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # 安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # API 请求
    location /api/ {
        proxy_pass http://myapp;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时配置
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # 缓冲配置
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        
        # 限流
        limit_req zone=api burst=20 nodelay;
    }
    
    # WebSocket 支持
    location /socket.io/ {
        proxy_pass http://myapp;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 健康检查
    location /health {
        proxy_pass http://myapp;
        access_log off;
    }
    
    # 主应用
    location / {
        proxy_pass http://myapp;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 错误页面
    error_page 502 503 504 /50x.html;
    location = /50x.html {
        root /var/www/html;
    }
}

# 限流配置
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
}
```

### SSL 证书配置

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d myapp.com -d www.myapp.com

# 自动续期
sudo crontab -e
# 添加以下行
0 12 * * * /usr/bin/certbot renew --quiet

# 测试续期
sudo certbot renew --dry-run
```

## Docker 容器化部署

### Dockerfile

```dockerfile
# Dockerfile
# 使用官方 Node.js 镜像
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 复制源代码
COPY . .

# 构建应用（如果需要）
RUN npm run build

# 生产镜像
FROM node:18-alpine AS production

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# 设置工作目录
WORKDIR /app

# 复制依赖和应用
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# 启动应用
CMD ["node", "dist/app.js"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: myapp
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./logs:/app/logs
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  postgres:
    image: postgres:15-alpine
    container_name: myapp-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=myuser
      - POSTGRES_PASSWORD=mypassword
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myuser -d myapp"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    container_name: myapp-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    container_name: myapp-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - app
    networks:
      - app-network

volumes:
  postgres_data:
  redis_data:

networks:
  app-network:
    driver: bridge
```

### 健康检查脚本

```javascript
// healthcheck.js
const http = require('http');

const options = {
  host: 'localhost',
  port: process.env.PORT || 3000,
  path: '/health',
  timeout: 2000
};

const request = http.request(options, (res) => {
  console.log(`健康检查状态: ${res.statusCode}`);
  
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', (err) => {
  console.log('健康检查失败:', err.message);
  process.exit(1);
});

request.on('timeout', () => {
  console.log('健康检查超时');
  request.destroy();
  process.exit(1);
});

request.end();
```

### Docker 部署命令

```bash
# 构建镜像
docker build -t myapp:latest .

# 运行容器
docker run -d \
  --name myapp \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_HOST=localhost \
  --restart unless-stopped \
  myapp:latest

# 使用 Docker Compose
docker-compose up -d

# 查看日志
docker-compose logs -f app

# 扩展服务
docker-compose up -d --scale app=3

# 更新服务
docker-compose pull
docker-compose up -d

# 清理
docker-compose down
docker system prune -f
```

## CI/CD 自动化部署

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [16.x, 18.x]
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
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
      run: npm test
      env:
        NODE_ENV: test
        DB_HOST: localhost
        DB_PORT: 5432
        DB_NAME: test
        DB_USER: postgres
        DB_PASSWORD: postgres
        REDIS_URL: redis://localhost:6379
    
    - name: Run coverage
      run: npm run test:coverage
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to Docker Hub
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}
    
    - name: Build and push Docker image
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: |
          myapp:latest
          myapp:${{ github.sha }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to server
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /var/www/myapp
          git pull origin main
          docker-compose pull
          docker-compose up -d
          docker system prune -f
    
    - name: Health check
      run: |
        sleep 30
        curl -f https://myapp.com/health || exit 1
    
    - name: Notify deployment
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        channel: '#deployments'
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
      if: always()
```

### 部署脚本

```bash
#!/bin/bash
# deploy.sh

set -e

APP_NAME="myapp"
APP_DIR="/var/www/$APP_NAME"
BACKUP_DIR="/var/backups/$APP_NAME"
GIT_REPO="https://github.com/username/myapp.git"
BRANCH="main"

echo "开始部署 $APP_NAME..."

# 创建备份
echo "创建备份..."
mkdir -p $BACKUP_DIR
cp -r $APP_DIR $BACKUP_DIR/$(date +%Y%m%d_%H%M%S)

# 保留最近 5 个备份
ls -t $BACKUP_DIR | tail -n +6 | xargs -r rm -rf

# 更新代码
echo "更新代码..."
cd $APP_DIR
git fetch origin
git reset --hard origin/$BRANCH

# 安装依赖
echo "安装依赖..."
npm ci --production

# 运行数据库迁移
echo "运行数据库迁移..."
npm run migrate

# 构建应用
echo "构建应用..."
npm run build

# 重启应用
echo "重启应用..."
pm2 reload ecosystem.config.js --env production

# 等待应用启动
echo "等待应用启动..."
sleep 10

# 健康检查
echo "执行健康检查..."
if curl -f http://localhost:3000/health; then
    echo "部署成功！"
else
    echo "健康检查失败，回滚到上一个版本..."
    
    # 回滚
    LATEST_BACKUP=$(ls -t $BACKUP_DIR | head -n 1)
    cp -r $BACKUP_DIR/$LATEST_BACKUP/* $APP_DIR/
    pm2 reload ecosystem.config.js --env production
    
    echo "回滚完成"
    exit 1
fi

# 清理
echo "清理临时文件..."
npm cache clean --force
docker system prune -f

echo "部署完成！"
```

## 监控和日志

### 日志管理

```javascript
// logger/winston.js
const winston = require('winston');
const path = require('path');

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// 创建 logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'myapp',
    version: process.env.APP_VERSION || '1.0.0'
  },
  transports: [
    // 错误日志
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // 组合日志
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ],
  
  // 异常处理
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/exceptions.log')
    })
  ],
  
  // 拒绝处理
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/rejections.log')
    })
  ]
});

// 生产环境不输出到控制台
if (process.env.NODE_ENV === 'production') {
  logger.remove(winston.transports.Console);
}

module.exports = logger;
```

### 应用监控

```javascript
// monitoring/metrics.js
const prometheus = require('prom-client');
const logger = require('../logger/winston');

class MetricsCollector {
  constructor() {
    // 创建注册表
    this.register = new prometheus.Registry();
    
    // 添加默认指标
    prometheus.collectDefaultMetrics({
      register: this.register,
      prefix: 'myapp_'
    });
    
    // 自定义指标
    this.httpRequestDuration = new prometheus.Histogram({
      name: 'myapp_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
    });
    
    this.httpRequestTotal = new prometheus.Counter({
      name: 'myapp_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code']
    });
    
    this.activeConnections = new prometheus.Gauge({
      name: 'myapp_active_connections',
      help: 'Number of active connections'
    });
    
    this.databaseConnections = new prometheus.Gauge({
      name: 'myapp_database_connections',
      help: 'Number of database connections',
      labelNames: ['state']
    });
    
    this.cacheHitRate = new prometheus.Gauge({
      name: 'myapp_cache_hit_rate',
      help: 'Cache hit rate'
    });
    
    // 注册指标
    this.register.registerMetric(this.httpRequestDuration);
    this.register.registerMetric(this.httpRequestTotal);
    this.register.registerMetric(this.activeConnections);
    this.register.registerMetric(this.databaseConnections);
    this.register.registerMetric(this.cacheHitRate);
  }
  
  // HTTP 请求中间件
  httpMetricsMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = (Date.now() - startTime) / 1000;
        const route = req.route ? req.route.path : req.path;
        
        this.httpRequestDuration
          .labels(req.method, route, res.statusCode)
          .observe(duration);
        
        this.httpRequestTotal
          .labels(req.method, route, res.statusCode)
          .inc();
      });
      
      next();
    };
  }
  
  // 更新活跃连接数
  updateActiveConnections(count) {
    this.activeConnections.set(count);
  }
  
  // 更新数据库连接数
  updateDatabaseConnections(active, idle) {
    this.databaseConnections.labels('active').set(active);
    this.databaseConnections.labels('idle').set(idle);
  }
  
  // 更新缓存命中率
  updateCacheHitRate(rate) {
    this.cacheHitRate.set(rate);
  }
  
  // 获取指标
  async getMetrics() {
    return await this.register.metrics();
  }
  
  // 创建指标端点
  createMetricsEndpoint(app) {
    app.get('/metrics', async (req, res) => {
      try {
        res.set('Content-Type', this.register.contentType);
        const metrics = await this.getMetrics();
        res.end(metrics);
      } catch (error) {
        logger.error('获取指标失败:', error);
        res.status(500).end('Internal Server Error');
      }
    });
  }
}

module.exports = new MetricsCollector();
```

## 安全配置

### 安全中间件

```javascript
// middleware/security.js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

// 安全配置
function setupSecurity(app) {
  // Helmet 安全头
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));
  
  // 限流
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 分钟
    max: 100, // 限制每个 IP 100 个请求
    message: {
      error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
  });
  
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: {
      error: 'Too many API requests from this IP, please try again later.'
    }
  });
  
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // 登录限制更严格
    message: {
      error: 'Too many authentication attempts, please try again later.'
    },
    skipSuccessfulRequests: true
  });
  
  // 应用限流
  app.use(limiter);
  app.use('/api/', apiLimiter);
  app.use('/auth/', authLimiter);
  
  // 慢速攻击防护
  const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000,
    delayAfter: 50,
    delayMs: 500
  });
  
  app.use(speedLimiter);
  
  // 数据清理
  app.use(mongoSanitize()); // 防止 NoSQL 注入
  app.use(xss()); // 防止 XSS 攻击
  app.use(hpp()); // 防止 HTTP 参数污染
  
  // CORS 配置
  app.use((req, res, next) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });
}

module.exports = setupSecurity;
```

## 总结

Node.js 应用部署涉及多个方面：

1. **环境准备**：服务器配置、依赖安装、环境变量设置
2. **进程管理**：使用 PM2 管理应用进程，实现自动重启和负载均衡
3. **反向代理**：使用 Nginx 提供静态文件服务、SSL 终止和负载均衡
4. **容器化**：使用 Docker 实现应用的标准化部署
5. **自动化**：通过 CI/CD 实现自动化测试和部署
6. **监控**：实施日志管理和性能监控
7. **安全**：配置安全中间件和防护措施

