# React 19 新特性详解

React 19 是 React 库的一个重要更新，引入了许多新特性和改进，旨在提升开发体验和应用性能。本文将详细介绍 React 19 中的主要更新内容。

## React 19 主要更新概览

React 19 带来了许多令人兴奋的新功能和改进，包括：

1. **Actions 和 Transitions 的改进**
2. **新的 Hooks：useOptimistic、useFormStatus、useFormState**
3. **文档 API 的改进**
4. **服务器组件的增强**
5. **错误处理的改进**
6. **性能优化**

## Actions 和 Transitions 改进

React 19 对 Actions 和 Transitions 进行了重要改进，使得异步操作和状态更新更加简单和直观。

### Actions 简化异步操作

在 React 19 中，你可以直接将异步函数传递给事件处理器：

```jsx
// React 19 中的新方式
async function updateName(newName) {
  // 直接处理异步操作
  const result = await fetch('/api/update-name', {
    method: 'POST',
    body: JSON.stringify({ name: newName })
  });
  
  if (!result.ok) {
    throw new Error('Failed to update name');
  }
  
  return result.json();
}

function MyComponent() {
  const [name, setName] = useState('');
  
  return (
    <form action={updateName}>
      <input 
        name="name" 
        value={name} 
        onChange={(e) => setName(e.target.value)} 
      />
      <button type="submit">Update Name</button>
    </form>
  );
}
```

### Transitions 的改进

React 19 简化了 Transitions 的使用方式：

```jsx
import { useTransition } from 'react';

function SearchComponent() {
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  
  const updateQuery = (newQuery) => {
    setQuery(newQuery);
    startTransition(async () => {
      const data = await searchAPI(newQuery);
      setResults(data);
    });
  };
  
  return (
    <div>
      <input 
        value={query}
        onChange={(e) => updateQuery(e.target.value)}
        className={isPending ? 'loading' : ''}
      />
      {isPending ? <div>Loading...</div> : <SearchResults results={results} />}
    </div>
  );
}
```

## 新的 Hooks

React 19 引入了几个新的 Hooks，以解决常见的开发场景。

### useOptimistic Hook

`useOptimistic` Hook 允许你在等待服务器响应时显示乐观的更新：

```jsx
import { useOptimistic, useState } from 'react';

function LikeButton({ likes, id }) {
  const [optimisticLikes, setOptimisticLikes] = useOptimistic(
    likes,
    (currentLikes, newLikes) => newLikes
  );
  
  const [isLiked, setIsLiked] = useState(false);
  
  async function handleLike() {
    const newState = !isLiked;
    const newLikes = newState ? optimisticLikes + 1 : optimisticLikes - 1;
    
    // 显示乐观更新
    setOptimisticLikes(newLikes);
    setIsLiked(newState);
    
    // 发送到服务器
    await fetch(`/api/like/${id}`, {
      method: 'POST',
      body: JSON.stringify({ liked: newState })
    });
  }
  
  return (
    <button onClick={handleLike}>
      ❤️ {optimisticLikes} {isLiked ? 'Liked' : 'Like'}
    </button>
  );
}
```

### useFormStatus Hook

`useFormStatus` Hook 提供了表单提交状态的信息：

```jsx
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending, data, method, action } = useFormStatus();
  
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Submitting...' : 'Submit'}
    </button>
  );
}

function MyForm() {
  async function handleSubmit(formData) {
    // 处理表单提交
    await submitForm(formData);
  }
  
  return (
    <form action={handleSubmit}>
      <input type="text" name="username" />
      <SubmitButton />
    </form>
  );
}
```

### useFormState Hook

`useFormState` Hook 简化了表单状态管理：

```jsx
import { useFormState } from 'react-dom';

async function login(prevState, formData) {
  const response = await fetch('/api/login', {
    method: 'POST',
    body: formData,
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    return { error: data.error };
  }
  
  return { success: true };
}

function LoginForm() {
  const [state, formAction] = useFormState(login, { error: null });
  
  return (
    <form action={formAction}>
      <div>
        <input type="text" name="username" placeholder="Username" />
      </div>
      <div>
        <input type="password" name="password" placeholder="Password" />
      </div>
      {state.error && <p>Error: {state.error}</p>}
      <button type="submit">Login</button>
    </form>
  );
}
```

## 文档 API 改进

React 19 对文档操作 API 进行了改进，使其更安全和直观。

### 改进的 ref API

React 19 引入了更简洁的 ref 用法：

```jsx
import { useRef } from 'react';

function MyComponent() {
  // React 19 中更简洁的 ref 用法
  const inputRef = useRef();
  
  const focusInput = () => {
    inputRef.current?.focus();
  };
  
  return (
    <div>
      <input ref={inputRef} />
      <button onClick={focusInput}>Focus Input</button>
    </div>
  );
}
```

## 服务器组件增强

React 19 进一步增强了服务器组件的功能。

### 服务器 Action

服务器 Action 允许你直接在服务器上定义可调用的函数：

```jsx
// server/actions.js
export async function createUser(formData) {
  'use server';
  
  const name = formData.get('name');
  const email = formData.get('email');
  
  // 直接在服务器上执行数据库操作
  const user = await db.user.create({
    data: { name, email }
  });
  
  return { success: true, user };
}

// client/MyForm.jsx
import { createUser } from '../server/actions';

function UserForm() {
  return (
    <form action={createUser}>
      <input name="name" placeholder="Name" />
      <input name="email" placeholder="Email" />
      <button type="submit">Create User</button>
    </form>
  );
}
```

## 错误处理改进

React 19 改进了错误处理机制，提供了更好的错误恢复能力。

### 改进的 Error Boundaries

```jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    console.log('Error caught:', error, errorInfo);
    // 发送错误报告到服务器
    logErrorToService(error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    
    return this.props.children;
  }
}
```

## 性能优化

React 19 在性能方面也进行了多项优化：

### 自动批处理增强

React 19 扩展了自动批处理的功能，包括在更多场景下的批处理：

```jsx
function MyComponent() {
  const [count, setCount] = useState(0);
  const [flag, setFlag] = useState(false);
  
  const handleClick = async () => {
    // React 19 会自动批处理这些更新
    setCount(c => c + 1);
    setFlag(f => !f);
    
    // 即使在异步操作后也会批处理
    await fetch('/api/data');
    setCount(c => c + 1);
    setFlag(f => !f);
  };
  
  return (
    <div>
      <p>Count: {count}</p>
      <p>Flag: {String(flag)}</p>
      <button onClick={handleClick}>Update</button>
    </div>
  );
}
```

## 与其他版本的对比

| 特性 | React 18 | React 19 |
|------|----------|----------|
| Actions | 需要手动处理 | 原生支持 |
| useFormStatus | 不可用 | 可用 |
| useFormState | 不可用 | 可用 |
| useOptimistic | 不可用 | 可用 |
| 服务器组件 | 实验性 | 稳定 |
| 自动批处理 | 有限支持 | 扩展支持 |

## 升级到 React 19

升级到 React 19 通常很简单，大多数现有代码无需更改即可工作。但需要注意以下几点：

1. 检查废弃的 API 使用情况
2. 更新相关依赖项
3. 测试新的功能和改进

## 总结

React 19 带来了许多令人兴奋的新功能和改进，包括 Actions、新的 Hooks、服务器组件增强等。这些更新旨在简化开发流程，提高应用性能，并提供更好的用户体验。通过采用这些新特性，开发者可以构建更现代、更高效的 React 应用。