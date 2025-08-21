# TypeScript 实战项目

通过实际项目案例，学习如何在真实场景中应用 TypeScript，包括项目配置、架构设计和最佳实践。

## 项目一：Todo 应用

### 项目结构

```
todo-app/
├── src/
│   ├── types/
│   │   └── index.ts
│   ├── models/
│   │   └── Todo.ts
│   ├── services/
│   │   └── TodoService.ts
│   ├── utils/
│   │   └── storage.ts
│   ├── components/
│   │   ├── TodoItem.ts
│   │   ├── TodoList.ts
│   │   └── TodoForm.ts
│   └── main.ts
├── public/
│   └── index.html
├── package.json
└── tsconfig.json
```

### 类型定义

```typescript
// src/types/index.ts
export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  priority: Priority;
  tags: string[];
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export interface CreateTodoRequest {
  title: string;
  description?: string;
  priority?: Priority;
  tags?: string[];
}

export interface UpdateTodoRequest {
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: Priority;
  tags?: string[];
}

export interface TodoFilter {
  completed?: boolean;
  priority?: Priority;
  tags?: string[];
  search?: string;
}

export interface TodoStats {
  total: number;
  completed: number;
  pending: number;
  byPriority: Record<Priority, number>;
}
```

### 数据模型

```typescript
// src/models/Todo.ts
import { Todo, Priority, CreateTodoRequest, UpdateTodoRequest } from '../types';

export class TodoModel implements Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  priority: Priority;
  tags: string[];

  constructor(data: CreateTodoRequest) {
    this.id = this.generateId();
    this.title = data.title;
    this.description = data.description;
    this.completed = false;
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.priority = data.priority || Priority.MEDIUM;
    this.tags = data.tags || [];
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  update(data: UpdateTodoRequest): void {
    if (data.title !== undefined) this.title = data.title;
    if (data.description !== undefined) this.description = data.description;
    if (data.completed !== undefined) this.completed = data.completed;
    if (data.priority !== undefined) this.priority = data.priority;
    if (data.tags !== undefined) this.tags = data.tags;
    this.updatedAt = new Date();
  }

  toggle(): void {
    this.completed = !this.completed;
    this.updatedAt = new Date();
  }

  addTag(tag: string): void {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
      this.updatedAt = new Date();
    }
  }

  removeTag(tag: string): void {
    const index = this.tags.indexOf(tag);
    if (index > -1) {
      this.tags.splice(index, 1);
      this.updatedAt = new Date();
    }
  }

  toJSON(): Todo {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      completed: this.completed,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      priority: this.priority,
      tags: [...this.tags]
    };
  }

  static fromJSON(data: Todo): TodoModel {
    const todo = Object.create(TodoModel.prototype);
    Object.assign(todo, {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt)
    });
    return todo;
  }
}
```

### 服务层

```typescript
// src/services/TodoService.ts
import { TodoModel } from '../models/Todo';
import { Todo, CreateTodoRequest, UpdateTodoRequest, TodoFilter, TodoStats, Priority } from '../types';
import { StorageService } from '../utils/storage';

export class TodoService {
  private todos: TodoModel[] = [];
  private storage: StorageService<Todo[]>;

  constructor() {
    this.storage = new StorageService('todos');
    this.loadTodos();
  }

  private loadTodos(): void {
    const savedTodos = this.storage.get();
    if (savedTodos) {
      this.todos = savedTodos.map(todo => TodoModel.fromJSON(todo));
    }
  }

  private saveTodos(): void {
    this.storage.set(this.todos.map(todo => todo.toJSON()));
  }

  create(data: CreateTodoRequest): TodoModel {
    const todo = new TodoModel(data);
    this.todos.push(todo);
    this.saveTodos();
    return todo;
  }

  getAll(): TodoModel[] {
    return [...this.todos];
  }

  getById(id: string): TodoModel | undefined {
    return this.todos.find(todo => todo.id === id);
  }

  update(id: string, data: UpdateTodoRequest): TodoModel | null {
    const todo = this.getById(id);
    if (!todo) return null;

    todo.update(data);
    this.saveTodos();
    return todo;
  }

  delete(id: string): boolean {
    const index = this.todos.findIndex(todo => todo.id === id);
    if (index === -1) return false;

    this.todos.splice(index, 1);
    this.saveTodos();
    return true;
  }

  toggle(id: string): TodoModel | null {
    const todo = this.getById(id);
    if (!todo) return null;

    todo.toggle();
    this.saveTodos();
    return todo;
  }

  filter(filter: TodoFilter): TodoModel[] {
    return this.todos.filter(todo => {
      if (filter.completed !== undefined && todo.completed !== filter.completed) {
        return false;
      }

      if (filter.priority && todo.priority !== filter.priority) {
        return false;
      }

      if (filter.tags && filter.tags.length > 0) {
        const hasAllTags = filter.tags.every(tag => todo.tags.includes(tag));
        if (!hasAllTags) return false;
      }

      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        const titleMatch = todo.title.toLowerCase().includes(searchLower);
        const descriptionMatch = todo.description?.toLowerCase().includes(searchLower) || false;
        if (!titleMatch && !descriptionMatch) return false;
      }

      return true;
    });
  }

  getStats(): TodoStats {
    const total = this.todos.length;
    const completed = this.todos.filter(todo => todo.completed).length;
    const pending = total - completed;

    const byPriority = this.todos.reduce((acc, todo) => {
      acc[todo.priority] = (acc[todo.priority] || 0) + 1;
      return acc;
    }, {} as Record<Priority, number>);

    // 确保所有优先级都有值
    Object.values(Priority).forEach(priority => {
      if (!(priority in byPriority)) {
        byPriority[priority] = 0;
      }
    });

    return {
      total,
      completed,
      pending,
      byPriority
    };
  }

  getAllTags(): string[] {
    const tagSet = new Set<string>();
    this.todos.forEach(todo => {
      todo.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }

  clearCompleted(): number {
    const completedCount = this.todos.filter(todo => todo.completed).length;
    this.todos = this.todos.filter(todo => !todo.completed);
    this.saveTodos();
    return completedCount;
  }
}
```

### 工具类

```typescript
// src/utils/storage.ts
export class StorageService<T> {
  constructor(private key: string) {}

  get(): T | null {
    try {
      const item = localStorage.getItem(this.key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error reading from localStorage:`, error);
      return null;
    }
  }

  set(value: T): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing to localStorage:`, error);
    }
  }

  remove(): void {
    try {
      localStorage.removeItem(this.key);
    } catch (error) {
      console.error(`Error removing from localStorage:`, error);
    }
  }

  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error(`Error clearing localStorage:`, error);
    }
  }
}

// 日期工具函数
export class DateUtils {
  static formatDate(date: Date): string {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  static formatDateTime(date: Date): string {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  static getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays}天前`;
    } else if (diffHours > 0) {
      return `${diffHours}小时前`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}分钟前`;
    } else {
      return '刚刚';
    }
  }
}

// 验证工具
export class ValidationUtils {
  static isValidTodoTitle(title: string): boolean {
    return title.trim().length > 0 && title.length <= 100;
  }

  static isValidTodoDescription(description: string): boolean {
    return description.length <= 500;
  }

  static isValidTag(tag: string): boolean {
    return /^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/.test(tag) && tag.length <= 20;
  }

  static sanitizeInput(input: string): string {
    return input.trim().replace(/[<>"'&]/g, '');
  }
}
```

## 项目二：API 客户端库

### 类型定义

```typescript
// src/types/api.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  timestamp: number;
  errors?: string[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  params?: Record<string, any>;
}

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  defaultHeaders?: Record<string, string>;
  interceptors?: {
    request?: RequestInterceptor[];
    response?: ResponseInterceptor[];
  };
}

export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
export type ResponseInterceptor = <T>(response: ApiResponse<T>) => ApiResponse<T> | Promise<ApiResponse<T>>;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
```

### HTTP 客户端

```typescript
// src/http/HttpClient.ts
import { ApiResponse, ApiError, RequestConfig, HttpMethod } from '../types/api';

export class HttpClient {
  private baseURL: string;
  private defaultConfig: RequestConfig;

  constructor(baseURL: string, defaultConfig: RequestConfig = {}) {
    this.baseURL = baseURL.replace(/\/$/, '');
    this.defaultConfig = {
      timeout: 10000,
      retries: 3,
      retryDelay: 1000,
      headers: {
        'Content-Type': 'application/json',
      },
      ...defaultConfig
    };
  }

  async request<T = any>(
    method: HttpMethod,
    url: string,
    data?: any,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const mergedConfig = this.mergeConfig(config);
    const fullUrl = this.buildUrl(url, mergedConfig.params);

    let attempt = 0;
    const maxAttempts = (mergedConfig.retries || 0) + 1;

    while (attempt < maxAttempts) {
      try {
        const response = await this.executeRequest<T>(method, fullUrl, data, mergedConfig);
        return response;
      } catch (error) {
        attempt++;
        
        if (attempt >= maxAttempts || !this.shouldRetry(error)) {
          throw error;
        }

        await this.delay(mergedConfig.retryDelay || 1000);
      }
    }

    throw new Error('Max retries exceeded');
  }

  private async executeRequest<T>(
    method: HttpMethod,
    url: string,
    data: any,
    config: RequestConfig
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const fetchConfig: RequestInit = {
        method,
        headers: config.headers,
        signal: controller.signal
      };

      if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
        fetchConfig.body = JSON.stringify(data);
      }

      const response = await fetch(url, fetchConfig);
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw await this.createApiError(response);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new ApiError('TIMEOUT', 'Request timeout');
      }
      
      throw error;
    }
  }

  private mergeConfig(config: RequestConfig): RequestConfig {
    return {
      ...this.defaultConfig,
      ...config,
      headers: {
        ...this.defaultConfig.headers,
        ...config.headers
      }
    };
  }

  private buildUrl(url: string, params?: Record<string, any>): string {
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    
    if (!params || Object.keys(params).length === 0) {
      return fullUrl;
    }

    const urlObj = new URL(fullUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        urlObj.searchParams.append(key, String(value));
      }
    });

    return urlObj.toString();
  }

  private async createApiError(response: Response): Promise<ApiError> {
    try {
      const errorData = await response.json();
      return new ApiError(
        errorData.code || `HTTP_${response.status}`,
        errorData.message || response.statusText,
        errorData.details
      );
    } catch {
      return new ApiError(
        `HTTP_${response.status}`,
        response.statusText
      );
    }
  }

  private shouldRetry(error: any): boolean {
    if (error instanceof ApiError) {
      // 不重试客户端错误
      return !error.code.startsWith('HTTP_4');
    }
    return true;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 便捷方法
  get<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url, undefined, config);
  }

  post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, data, config);
  }

  put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, data, config);
  }

  delete<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url, undefined, config);
  }

  patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', url, data, config);
  }
}

class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

### API 客户端

```typescript
// src/ApiClient.ts
import { HttpClient } from './http/HttpClient';
import {
  ApiClientConfig,
  ApiResponse,
  PaginatedResponse,
  RequestInterceptor,
  ResponseInterceptor
} from './types/api';

export class ApiClient {
  private httpClient: HttpClient;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  constructor(config: ApiClientConfig) {
    this.httpClient = new HttpClient(config.baseURL, {
      timeout: config.timeout,
      retries: config.retries,
      retryDelay: config.retryDelay,
      headers: config.defaultHeaders
    });

    if (config.interceptors) {
      this.requestInterceptors = config.interceptors.request || [];
      this.responseInterceptors = config.interceptors.response || [];
    }
  }

  // 拦截器管理
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  // 资源操作方法
  async get<T>(url: string, params?: Record<string, any>): Promise<T> {
    const response = await this.httpClient.get<T>(url, { params });
    return this.processResponse(response);
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.httpClient.post<T>(url, data);
    return this.processResponse(response);
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.httpClient.put<T>(url, data);
    return this.processResponse(response);
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.httpClient.delete<T>(url);
    return this.processResponse(response);
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.httpClient.patch<T>(url, data);
    return this.processResponse(response);
  }

  // 分页查询
  async getPaginated<T>(
    url: string,
    page: number = 1,
    limit: number = 10,
    params?: Record<string, any>
  ): Promise<PaginatedResponse<T>> {
    const response = await this.httpClient.get<T[]>(url, {
      params: { page, limit, ...params }
    });
    return response as PaginatedResponse<T>;
  }

  // 批量操作
  async batchGet<T>(urls: string[]): Promise<T[]> {
    const promises = urls.map(url => this.get<T>(url));
    return Promise.all(promises);
  }

  async batchPost<T>(requests: Array<{ url: string; data: any }>): Promise<T[]> {
    const promises = requests.map(req => this.post<T>(req.url, req.data));
    return Promise.all(promises);
  }

  // 文件上传
  async uploadFile<T>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    // 这里简化实现，实际项目中需要处理上传进度
    const response = await this.httpClient.post<T>(url, formData);
    return this.processResponse(response);
  }

  private async processResponse<T>(response: ApiResponse<T>): Promise<T> {
    // 应用响应拦截器
    let processedResponse = response;
    for (const interceptor of this.responseInterceptors) {
      processedResponse = await interceptor(processedResponse);
    }

    if (!processedResponse.success) {
      throw new Error(processedResponse.message || 'API request failed');
    }

    return processedResponse.data;
  }
}

// 创建具体的 API 服务
export class UserApiService {
  constructor(private apiClient: ApiClient) {}

  async getUsers(page?: number, limit?: number) {
    return this.apiClient.getPaginated<User>('/users', page, limit);
  }

  async getUser(id: number): Promise<User> {
    return this.apiClient.get<User>(`/users/${id}`);
  }

  async createUser(userData: CreateUserRequest): Promise<User> {
    return this.apiClient.post<User>('/users', userData);
  }

  async updateUser(id: number, userData: UpdateUserRequest): Promise<User> {
    return this.apiClient.put<User>(`/users/${id}`, userData);
  }

  async deleteUser(id: number): Promise<void> {
    return this.apiClient.delete<void>(`/users/${id}`);
  }

  async searchUsers(query: string): Promise<User[]> {
    return this.apiClient.get<User[]>('/users/search', { q: query });
  }
}

// 使用示例
interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

interface CreateUserRequest {
  name: string;
  email: string;
}

interface UpdateUserRequest {
  name?: string;
  email?: string;
}

// 创建 API 客户端实例
const apiClient = new ApiClient({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  defaultHeaders: {
    'Authorization': 'Bearer your-token-here'
  },
  interceptors: {
    request: [
      // 添加认证 token
      async (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers = {
            ...config.headers,
            'Authorization': `Bearer ${token}`
          };
        }
        return config;
      }
    ],
    response: [
      // 处理认证失败
      async (response) => {
        if (!response.success && response.message.includes('Unauthorized')) {
          // 重定向到登录页面
          window.location.href = '/login';
        }
        return response;
      }
    ]
  }
});

const userService = new UserApiService(apiClient);

// 使用服务
async function example() {
  try {
    const users = await userService.getUsers(1, 10);
    console.log('Users:', users.data);
    console.log('Pagination:', users.pagination);

    const newUser = await userService.createUser({
      name: 'John Doe',
      email: 'john@example.com'
    });
    console.log('Created user:', newUser);
  } catch (error) {
    console.error('API Error:', error);
  }
}
```

## 项目配置

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "allowJs": true,
    "checkJs": false,
    "outDir": "./dist",
    "rootDir": "./src",
    "removeComments": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@types/*": ["src/types/*"],
      "@utils/*": ["src/utils/*"],
      "@services/*": ["src/services/*"],
      "@models/*": ["src/models/*"]
    }
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

### package.json

```json
{
  "name": "typescript-projects",
  "version": "1.0.0",
  "description": "TypeScript实战项目集合",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "dev": "ts-node src/main.ts",
    "start": "node dist/main.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "format": "prettier --write src/**/*.ts",
    "type-check": "tsc --noEmit",
    "clean": "rimraf dist",
    "prebuild": "npm run clean"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/jest": "^29.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "jest": "^29.0.0",
    "prettier": "^3.0.0",
    "rimraf": "^5.0.0",
    "ts-jest": "^29.0.0",
    "ts-node": "^10.0.0",
    "typescript": "^5.0.0"
  },
  "dependencies": {
    "reflect-metadata": "^0.1.13"
  }
}
```

### ESLint 配置

```json
// .eslintrc.json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "@typescript-eslint/recommended-requiring-type-checking"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-inferrable-types": "off",
    "@typescript-eslint/prefer-const": "error",
    "@typescript-eslint/no-non-null-assertion": "warn"
  },
  "env": {
    "node": true,
    "browser": true,
    "es2020": true
  }
}
```

## 测试配置

### Jest 配置

```json
// jest.config.json
{
  "preset": "ts-jest",
  "testEnvironment": "node",
  "roots": ["<rootDir>/src"],
  "testMatch": [
    "**/__tests__/**/*.ts",
    "**/?(*.)+(spec|test).ts"
  ],
  "transform": {
    "^.+\.ts$": "ts-jest"
  },
  "collectCoverageFrom": [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/**/*.test.ts",
    "!src/**/*.spec.ts"
  ],
  "coverageDirectory": "coverage",
  "coverageReporters": ["text", "lcov", "html"]
}
```

### 测试示例

```typescript
// src/__tests__/TodoService.test.ts
import { TodoService } from '../services/TodoService';
import { Priority } from '../types';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('TodoService', () => {
  let todoService: TodoService;

  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
    todoService = new TodoService();
  });

  describe('create', () => {
    it('should create a new todo', () => {
      const todoData = {
        title: 'Test Todo',
        description: 'Test Description',
        priority: Priority.HIGH
      };

      const todo = todoService.create(todoData);

      expect(todo.title).toBe(todoData.title);
      expect(todo.description).toBe(todoData.description);
      expect(todo.priority).toBe(todoData.priority);
      expect(todo.completed).toBe(false);
      expect(todo.id).toBeDefined();
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should set default priority to MEDIUM', () => {
      const todo = todoService.create({ title: 'Test Todo' });
      expect(todo.priority).toBe(Priority.MEDIUM);
    });
  });

  describe('getAll', () => {
    it('should return all todos', () => {
      todoService.create({ title: 'Todo 1' });
      todoService.create({ title: 'Todo 2' });

      const todos = todoService.getAll();
      expect(todos).toHaveLength(2);
    });
  });

  describe('filter', () => {
    beforeEach(() => {
      todoService.create({ title: 'Completed Todo', priority: Priority.HIGH });
      todoService.create({ title: 'Pending Todo', priority: Priority.LOW });
      const todos = todoService.getAll();
      todoService.toggle(todos[0].id); // 完成第一个
    });

    it('should filter by completed status', () => {
      const completedTodos = todoService.filter({ completed: true });
      const pendingTodos = todoService.filter({ completed: false });

      expect(completedTodos).toHaveLength(1);
      expect(pendingTodos).toHaveLength(1);
      expect(completedTodos[0].completed).toBe(true);
      expect(pendingTodos[0].completed).toBe(false);
    });

    it('should filter by priority', () => {
      const highPriorityTodos = todoService.filter({ priority: Priority.HIGH });
      const lowPriorityTodos = todoService.filter({ priority: Priority.LOW });

      expect(highPriorityTodos).toHaveLength(1);
      expect(lowPriorityTodos).toHaveLength(1);
    });

    it('should filter by search term', () => {
      const searchResults = todoService.filter({ search: 'Completed' });
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].title).toContain('Completed');
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      todoService.create({ title: 'Todo 1', priority: Priority.HIGH });
      todoService.create({ title: 'Todo 2', priority: Priority.LOW });
      const todos = todoService.getAll();
      todoService.toggle(todos[0].id);

      const stats = todoService.getStats();

      expect(stats.total).toBe(2);
      expect(stats.completed).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.byPriority[Priority.HIGH]).toBe(1);
      expect(stats.byPriority[Priority.LOW]).toBe(1);
      expect(stats.byPriority[Priority.MEDIUM]).toBe(0);
    });
  });
});
```

## 总结

通过这些实战项目，我们学习了：

### 项目架构：
1. **分层架构**：类型定义、模型、服务、工具分离
2. **模块化设计**：清晰的模块边界和依赖关系
3. **类型安全**：全程类型检查和类型推导

### 开发实践：
1. **配置管理**：TypeScript、ESLint、Jest 配置
2. **代码质量**：静态检查、单元测试、代码覆盖率
3. **工程化**：构建脚本、开发工具链

### TypeScript 特性应用：
1. **接口设计**：API 响应、配置选项、业务模型
2. **泛型应用**：通用工具类、API 客户端
3. **高级类型**：条件类型、映射类型、工具类型
4. **装饰器使用**：元数据、验证、日志

这些项目展示了 TypeScript 在实际开发中的强大能力，帮助我们构建类型安全、可维护的应用程序。