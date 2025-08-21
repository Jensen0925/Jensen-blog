# 泛型编程

深入学习 TypeScript 泛型，掌握类型参数化编程，构建可重用和类型安全的代码。

## 泛型基础

### 什么是泛型

泛型允许我们在定义函数、接口或类的时候，不预先指定具体的类型，而在使用的时候再指定类型的一种特性。

```typescript
// 不使用泛型的问题
function identity(arg: any): any {
  return arg;
}

// 使用泛型解决
function identity<T>(arg: T): T {
  return arg;
}

// 使用方式
let output1 = identity<string>("myString"); // 明确指定类型
let output2 = identity("myString"); // 类型推断
let output3 = identity<number>(42);
```

### 泛型函数

```typescript
// 基础泛型函数
function swap<T, U>(tuple: [T, U]): [U, T] {
  return [tuple[1], tuple[0]];
}

let swapped = swap(["hello", 42]); // [number, string]

// 泛型函数类型
let myIdentity: <T>(arg: T) => T = identity;

// 使用调用签名的对象字面量定义泛型函数类型
let myIdentity2: { <T>(arg: T): T } = identity;

// 泛型接口
interface GenericIdentityFn {
  <T>(arg: T): T;
}

let myIdentity3: GenericIdentityFn = identity;

// 把泛型参数当作整个接口的一个参数
interface GenericIdentityFn2<T> {
  (arg: T): T;
}

let myIdentity4: GenericIdentityFn2<number> = identity;
```

### 泛型类

```typescript
// 泛型类
class GenericNumber<T> {
  zeroValue: T;
  add: (x: T, y: T) => T;
  
  constructor(zeroValue: T, addFn: (x: T, y: T) => T) {
    this.zeroValue = zeroValue;
    this.add = addFn;
  }
}

// 使用数字类型
let myGenericNumber = new GenericNumber<number>(0, function(x, y) {
  return x + y;
});

// 使用字符串类型
let stringNumeric = new GenericNumber<string>("", function(x, y) {
  return x + y;
});

console.log(stringNumeric.add(stringNumeric.zeroValue, "test"));
```

## 泛型约束

### 基础约束

```typescript
// 约束泛型必须包含某些属性
interface Lengthwise {
  length: number;
}

function loggingIdentity<T extends Lengthwise>(arg: T): T {
  console.log(arg.length); // 现在我们知道它有 length 属性
  return arg;
}

// loggingIdentity(3); // 错误，number 没有 length 属性
loggingIdentity({ length: 10, value: 3 }); // 正确
loggingIdentity("hello"); // 正确，字符串有 length 属性
loggingIdentity([1, 2, 3]); // 正确，数组有 length 属性
```

### 在泛型约束中使用类型参数

```typescript
// 使用 keyof 约束
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

let x = { a: 1, b: 2, c: 3, d: 4 };
getProperty(x, "a"); // 正确
// getProperty(x, "m"); // 错误：参数类型 '"m"' 不能赋给参数类型 'keyof { a: number; b: number; c: 3, d: 4 }'

// 多重约束
function copyFields<T extends U, U>(target: T, source: U): T {
  for (let id in source) {
    target[id] = (source as T)[id];
  }
  return target;
}
```

### 条件约束

```typescript
// 条件类型约束
type NonNullable<T> = T extends null | undefined ? never : T;

type A = NonNullable<string | null | undefined>; // string
type B = NonNullable<string[] | null>; // string[]

// 更复杂的条件约束
type Flatten<T> = T extends any[] ? T[number] : T;

type Str = Flatten<string[]>; // string
type Num = Flatten<number>; // number
```

## 高级泛型模式

### 映射类型

```typescript
// 基础映射类型
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

type Partial<T> = {
  [P in keyof T]?: T[P];
};

// 使用映射类型
interface Person {
  name: string;
  age: number;
}

type ReadonlyPerson = Readonly<Person>;
// {
//   readonly name: string;
//   readonly age: number;
// }

type PartialPerson = Partial<Person>;
// {
//   name?: string;
//   age?: number;
// }

// 自定义映射类型
type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};

type NullablePerson = Nullable<Person>;
// {
//   name: string | null;
//   age: number | null;
// }
```

### 条件类型

```typescript
// 条件类型基础
type TypeName<T> = T extends string
  ? "string"
  : T extends number
  ? "number"
  : T extends boolean
  ? "boolean"
  : T extends undefined
  ? "undefined"
  : T extends Function
  ? "function"
  : "object";

type T0 = TypeName<string>; // "string"
type T1 = TypeName<"a">; // "string"
type T2 = TypeName<true>; // "boolean"
type T3 = TypeName<() => void>; // "function"
type T4 = TypeName<string[]>; // "object"

// 分布式条件类型
type Diff<T, U> = T extends U ? never : T;
type Filter<T, U> = T extends U ? T : never;

type T5 = Diff<"a" | "b" | "c" | "d", "a" | "c" | "f">; // "b" | "d"
type T6 = Filter<"a" | "b" | "c" | "d", "a" | "c" | "f">; // "a" | "c"
```

### infer 关键字

```typescript
// 使用 infer 推断类型
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;

type T7 = ReturnType<() => string>; // string
type T8 = ReturnType<(s: string) => void>; // void

// 推断数组元素类型
type Flatten2<T> = T extends (infer U)[] ? U : T;

type T9 = Flatten2<string[]>; // string
type T10 = Flatten2<number>; // number

// 推断函数参数类型
type Parameters<T extends (...args: any) => any> = T extends (
  ...args: infer P
) => any
  ? P
  : never;

type T11 = Parameters<(a: string, b: number) => void>; // [string, number]

// 推断构造函数参数类型
type ConstructorParameters<T extends new (...args: any) => any> = T extends new (
  ...args: infer P
) => any
  ? P
  : never;

class MyClass {
  constructor(a: string, b: number) {}
}

type T12 = ConstructorParameters<typeof MyClass>; // [string, number]
```

## 实用泛型工具

### 内置工具类型

```typescript
// Partial<T> - 将所有属性变为可选
interface User {
  id: number;
  name: string;
  email: string;
}

type PartialUser = Partial<User>;
// {
//   id?: number;
//   name?: string;
//   email?: string;
// }

// Required<T> - 将所有属性变为必需
type RequiredUser = Required<PartialUser>;
// {
//   id: number;
//   name: string;
//   email: string;
// }

// Pick<T, K> - 选择指定属性
type UserSummary = Pick<User, 'id' | 'name'>;
// {
//   id: number;
//   name: string;
// }

// Omit<T, K> - 排除指定属性
type UserWithoutId = Omit<User, 'id'>;
// {
//   name: string;
//   email: string;
// }

// Record<K, T> - 创建键值对类型
type UserRoles = Record<'admin' | 'user' | 'guest', boolean>;
// {
//   admin: boolean;
//   user: boolean;
//   guest: boolean;
// }

// Exclude<T, U> - 从联合类型中排除
type T13 = Exclude<'a' | 'b' | 'c', 'a'>; // 'b' | 'c'

// Extract<T, U> - 从联合类型中提取
type T14 = Extract<'a' | 'b' | 'c', 'a' | 'f'>; // 'a'

// NonNullable<T> - 排除 null 和 undefined
type T15 = NonNullable<string | number | undefined>; // string | number
```

### 自定义工具类型

```typescript
// 深度只读
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

interface NestedObject {
  a: {
    b: {
      c: string;
    };
  };
}

type DeepReadonlyNested = DeepReadonly<NestedObject>;
// {
//   readonly a: {
//     readonly b: {
//       readonly c: string;
//     };
//   };
// }

// 可选链类型
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type OptionalEmailUser = Optional<User, 'email'>;
// {
//   id: number;
//   name: string;
//   email?: string;
// }

// 函数重载类型
type Overload = {
  (x: string): string;
  (x: number): number;
  (x: boolean): boolean;
};

// 获取对象值类型
type ValueOf<T> = T[keyof T];

type UserValues = ValueOf<User>; // string | number

// 获取函数名
type FunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];

type NonFunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];

interface Part {
  id: number;
  name: string;
  subparts: Part[];
  updatePart(newName: string): void;
}

type T16 = FunctionPropertyNames<Part>; // "updatePart"
type T17 = NonFunctionPropertyNames<Part>; // "id" | "name" | "subparts"
```

## 泛型在实际项目中的应用

### API 响应类型

```typescript
// 通用 API 响应类型
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: number;
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 使用示例
interface User {
  id: number;
  name: string;
  email: string;
}

type UserResponse = ApiResponse<User>;
type UsersResponse = PaginatedResponse<User>;

// API 客户端
class ApiClient {
  async get<T>(url: string): Promise<ApiResponse<T>> {
    const response = await fetch(url);
    return response.json();
  }
  
  async post<T, U>(url: string, data: T): Promise<ApiResponse<U>> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }
}

// 使用
const client = new ApiClient();
const userResponse = await client.get<User>('/api/users/1');
const createUserResponse = await client.post<Omit<User, 'id'>, User>('/api/users', {
  name: 'John',
  email: 'john@example.com'
});
```

### 状态管理

```typescript
// 通用状态管理
interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

type Action<T> =
  | { type: 'LOADING' }
  | { type: 'SUCCESS'; payload: T }
  | { type: 'ERROR'; payload: string }
  | { type: 'RESET' };

function createReducer<T>() {
  return function reducer(state: State<T>, action: Action<T>): State<T> {
    switch (action.type) {
      case 'LOADING':
        return { ...state, loading: true, error: null };
      case 'SUCCESS':
        return { data: action.payload, loading: false, error: null };
      case 'ERROR':
        return { ...state, loading: false, error: action.payload };
      case 'RESET':
        return { data: null, loading: false, error: null };
      default:
        return state;
    }
  };
}

// 使用
const userReducer = createReducer<User>();
const usersReducer = createReducer<User[]>();

// Hook 封装
function useAsyncState<T>(initialState: State<T> = { data: null, loading: false, error: null }) {
  const [state, dispatch] = React.useReducer(createReducer<T>(), initialState);
  
  const execute = React.useCallback(async (asyncFunction: () => Promise<T>) => {
    dispatch({ type: 'LOADING' });
    try {
      const result = await asyncFunction();
      dispatch({ type: 'SUCCESS', payload: result });
    } catch (error) {
      dispatch({ type: 'ERROR', payload: error.message });
    }
  }, []);
  
  const reset = React.useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);
  
  return { ...state, execute, reset };
}
```

### 数据验证

```typescript
// 通用验证器
type ValidationResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  errors: string[];
};

type Validator<T> = (value: unknown) => ValidationResult<T>;

// 基础验证器
const stringValidator: Validator<string> = (value): ValidationResult<string> => {
  if (typeof value === 'string') {
    return { success: true, data: value };
  }
  return { success: false, errors: ['Expected string'] };
};

const numberValidator: Validator<number> = (value): ValidationResult<number> => {
  if (typeof value === 'number' && !isNaN(value)) {
    return { success: true, data: value };
  }
  return { success: false, errors: ['Expected number'] };
};

// 对象验证器
type ObjectValidator<T> = {
  [K in keyof T]: Validator<T[K]>;
};

function objectValidator<T>(validators: ObjectValidator<T>): Validator<T> {
  return (value): ValidationResult<T> => {
    if (typeof value !== 'object' || value === null) {
      return { success: false, errors: ['Expected object'] };
    }
    
    const obj = value as Record<string, unknown>;
    const result = {} as T;
    const errors: string[] = [];
    
    for (const key in validators) {
      const validator = validators[key];
      const fieldResult = validator(obj[key]);
      
      if (fieldResult.success) {
        result[key] = fieldResult.data;
      } else {
        errors.push(...fieldResult.errors.map(err => `${key}: ${err}`));
      }
    }
    
    if (errors.length > 0) {
      return { success: false, errors };
    }
    
    return { success: true, data: result };
  };
}

// 使用示例
interface CreateUserRequest {
  name: string;
  email: string;
  age: number;
}

const createUserValidator = objectValidator<CreateUserRequest>({
  name: stringValidator,
  email: stringValidator, // 可以进一步扩展为邮箱验证器
  age: numberValidator
});

// 验证数据
const validationResult = createUserValidator({
  name: 'John',
  email: 'john@example.com',
  age: 30
});

if (validationResult.success) {
  console.log('Valid data:', validationResult.data);
} else {
  console.log('Validation errors:', validationResult.errors);
}
```

### 事件系统

```typescript
// 类型安全的事件系统
type EventMap = Record<string, any>;

class TypedEventEmitter<T extends EventMap> {
  private listeners: {
    [K in keyof T]?: Array<(payload: T[K]) => void>;
  } = {};
  
  on<K extends keyof T>(event: K, listener: (payload: T[K]) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(listener);
  }
  
  off<K extends keyof T>(event: K, listener: (payload: T[K]) => void): void {
    const eventListeners = this.listeners[event];
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }
  
  emit<K extends keyof T>(event: K, payload: T[K]): void {
    const eventListeners = this.listeners[event];
    if (eventListeners) {
      eventListeners.forEach(listener => listener(payload));
    }
  }
  
  once<K extends keyof T>(event: K, listener: (payload: T[K]) => void): void {
    const onceListener = (payload: T[K]) => {
      listener(payload);
      this.off(event, onceListener);
    };
    this.on(event, onceListener);
  }
}

// 定义事件类型
interface AppEvents {
  'user:login': { userId: number; timestamp: Date };
  'user:logout': { userId: number };
  'data:update': { type: string; data: any };
  'error': { message: string; code: number };
}

// 使用
const eventEmitter = new TypedEventEmitter<AppEvents>();

// 类型安全的事件监听
eventEmitter.on('user:login', (payload) => {
  console.log(`User ${payload.userId} logged in at ${payload.timestamp}`);
});

eventEmitter.on('error', (payload) => {
  console.error(`Error ${payload.code}: ${payload.message}`);
});

// 类型安全的事件发射
eventEmitter.emit('user:login', {
  userId: 123,
  timestamp: new Date()
});

// eventEmitter.emit('user:login', { userId: '123' }); // 类型错误
```

## 泛型最佳实践

### 命名约定

```typescript
// 好的泛型命名
interface Repository<TEntity, TKey> {
  findById(id: TKey): Promise<TEntity | null>;
  save(entity: TEntity): Promise<TEntity>;
}

interface ApiClient<TRequest, TResponse> {
  request(data: TRequest): Promise<TResponse>;
}

// 避免过于简单的命名
// 不好：function process<T, U, V>(a: T, b: U): V
// 好：function transform<TInput, TOutput, TContext>(input: TInput, context: TContext): TOutput
```

### 约束使用

```typescript
// 合理使用约束
interface Serializable {
  serialize(): string;
}

function saveToStorage<T extends Serializable>(item: T): void {
  localStorage.setItem('data', item.serialize());
}

// 避免过度约束
// 不好：function process<T extends string | number | boolean>(value: T): T
// 好：function process<T>(value: T): T
```

### 默认类型参数

```typescript
// 使用默认类型参数简化使用
interface ApiResponse<T = any> {
  data: T;
  status: number;
  message: string;
}

// 可以不指定类型参数
const response: ApiResponse = { data: {}, status: 200, message: 'OK' };

// 也可以指定具体类型
const userResponse: ApiResponse<User> = {
  data: { id: 1, name: 'John', email: 'john@example.com' },
  status: 200,
  message: 'OK'
};
```

## 总结

泛型是 TypeScript 中最强大的特性之一：

### 核心概念：
1. **类型参数化**：在定义时不指定具体类型
2. **类型安全**：保持编译时类型检查
3. **代码复用**：一套代码适用多种类型
4. **类型推断**：自动推断类型参数

### 高级特性：
1. **泛型约束**：限制类型参数范围
2. **条件类型**：根据条件选择类型
3. **映射类型**：基于现有类型创建新类型
4. **infer 关键字**：在条件类型中推断类型

### 实际应用：
1. **API 封装**：类型安全的网络请求
2. **状态管理**：通用的状态处理逻辑
3. **数据验证**：类型安全的验证器
4. **事件系统**：类型安全的事件处理

### 最佳实践：
1. 合理命名泛型参数
2. 适当使用约束
3. 利用默认类型参数
4. 避免过度泛型化
5. 优先使用类型推断