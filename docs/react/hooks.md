# React Hooks 使用

## 什么是 Hooks？

Hooks 是 React 16.8 引入的新特性，它允许你在不编写 class 的情况下使用 state 以及其他的 React 特性。Hooks 使得函数组件可以拥有状态和生命周期功能。

## 为什么使用 Hooks？

- **更简洁的代码**：Hooks 让你在不使用 class 的情况下使用 React 的特性。
- **更容易复用状态逻辑**：Hooks 允许你在不改变组件层次结构的情况下复用状态逻辑。
- **更好的关注点分离**：Hooks 让你根据相关的部分（例如设置订阅或获取数据）将一个组件分割成更小的函数。

## 基础 Hooks

### useState

`useState` 是最基本的 Hook，它让你在函数组件中添加状态：

```jsx
import React, { useState } from 'react';

function Counter() {
  // 声明一个新的状态变量，我们将其称为 "count"
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}
```

#### 使用多个状态变量

::: code-group

```jsx [多个 useState]
function UserForm() {
  const [name, setName] = useState('');
  const [age, setAge] = useState(0);
  const [email, setEmail] = useState('');

  return (
    <form>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Name"
      />
      <input
        type="number"
        value={age}
        onChange={e => setAge(Number(e.target.value))}
        placeholder="Age"
      />
      <input
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email"
      />
    </form>
  );
}
```

```jsx [使用对象状态]
function UserForm() {
  const [user, setUser] = useState({
    name: '',
    age: 0,
    email: ''
  });

  const updateUser = (field, value) => {
    setUser(prevUser => ({
      ...prevUser,
      [field]: value
    }));
  };

  return (
    <form>
      <input
        value={user.name}
        onChange={e => updateUser('name', e.target.value)}
        placeholder="Name"
      />
      <input
        type="number"
        value={user.age}
        onChange={e => updateUser('age', Number(e.target.value))}
        placeholder="Age"
      />
      <input
        value={user.email}
        onChange={e => updateUser('email', e.target.value)}
        placeholder="Email"
      />
    </form>
  );
}
```

:::

#### 使用函数式更新

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  function increment() {
    // 使用函数式更新，确保使用最新的状态值
    setCount(prevCount => prevCount + 1);
  }

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>
      <button onClick={() => {
        // 连续调用三次，但只会更新一次
        setCount(count + 1);
        setCount(count + 1);
        setCount(count + 1);
      }}>
        Increment (Wrong Way)
      </button>
      <button onClick={() => {
        // 连续调用三次，会更新三次
        setCount(prevCount => prevCount + 1);
        setCount(prevCount => prevCount + 1);
        setCount(prevCount => prevCount + 1);
      }}>
        Increment 3 Times
      </button>
    </div>
  );
}
```

### useEffect

`useEffect` 允许你在函数组件中执行副作用操作，如数据获取、订阅或手动更改 DOM：

```jsx
import React, { useState, useEffect } from 'react';

function Example() {
  const [count, setCount] = useState(0);

  // 类似于 componentDidMount 和 componentDidUpdate
  useEffect(() => {
    // 更新文档标题
    document.title = `You clicked ${count} times`;
  });

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}
```

#### 依赖数组

::: code-group

```jsx [有依赖]
function Example() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');

  // 只有当 count 改变时才会执行
  useEffect(() => {
    document.title = `You clicked ${count} times`;
  }, [count]); // 只有当 count 改变时才会重新执行

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Name"
      />
    </div>
  );
}
```

```jsx [空依赖数组]
function Example() {
  const [count, setCount] = useState(0);

  // 只在组件挂载和卸载时执行
  useEffect(() => {
    console.log('Component mounted');
    
    // 清理函数
    return () => {
      console.log('Component will unmount');
    };
  }, []); // 空依赖数组表示只在挂载和卸载时执行

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}
```

:::

#### 清理副作用

```jsx
function Timer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setSeconds(prevSeconds => prevSeconds + 1);
    }, 1000);

    // 返回一个清理函数，在组件卸载或者依赖项变化时执行
    return () => {
      clearInterval(intervalId);
    };
  }, []); // 空依赖数组表示只在挂载和卸载时执行

  return <p>Seconds: {seconds}</p>;
}
```

### useContext

`useContext` 接收一个 context 对象（从 `React.createContext` 返回的值）并返回该 context 的当前值：

```jsx
import React, { createContext, useContext, useState } from 'react';

// 创建一个 Context
const ThemeContext = createContext('light');

function App() {
  const [theme, setTheme] = useState('light');

  return (
    <ThemeContext.Provider value={theme}>
      <div>
        <ThemedButton onClick={() => {
          setTheme(theme === 'light' ? 'dark' : 'light');
        }}>
          Toggle Theme
        </ThemedButton>
        <ThemedText />
      </div>
    </ThemeContext.Provider>
  );
}

function ThemedButton({ onClick, children }) {
  const theme = useContext(ThemeContext);
  return (
    <button
      onClick={onClick}
      style={{
        background: theme === 'light' ? '#fff' : '#333',
        color: theme === 'light' ? '#333' : '#fff',
      }}
    >
      {children}
    </button>
  );
}

function ThemedText() {
  const theme = useContext(ThemeContext);
  return (
    <p style={{ color: theme === 'light' ? '#333' : '#fff' }}>
      Current theme: {theme}
    </p>
  );
}
```

## 额外的 Hooks

### useReducer

`useReducer` 是 `useState` 的替代方案，适用于复杂的状态逻辑：

```jsx
import React, { useReducer } from 'react';

// 定义 reducer 函数
function reducer(state, action) {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 };
    case 'decrement':
      return { count: state.count - 1 };
    default:
      throw new Error();
  }
}

function Counter() {
  // 使用 useReducer
  const [state, dispatch] = useReducer(reducer, { count: 0 });

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => dispatch({ type: 'increment' })}>
        Increment
      </button>
      <button onClick={() => dispatch({ type: 'decrement' })}>
        Decrement
      </button>
    </div>
  );
}
```

### useCallback

`useCallback` 返回一个记忆化的回调函数，只有当依赖项改变时才会更新：

```jsx
import React, { useState, useCallback } from 'react';

function ParentComponent() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState('');

  // 只有当 count 改变时才会创建新的回调函数
  const incrementCount = useCallback(() => {
    setCount(prevCount => prevCount + 1);
  }, []);

  return (
    <div>
      <p>Count: {count}</p>
      <ChildComponent onIncrement={incrementCount} />
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Type something..."
      />
    </div>
  );
}

// 使用 React.memo 优化子组件
const ChildComponent = React.memo(function ChildComponent({ onIncrement }) {
  console.log('ChildComponent rendered');
  return <button onClick={onIncrement}>Increment</button>;
});
```

### useMemo

`useMemo` 返回一个记忆化的值，只有当依赖项改变时才重新计算：

```jsx
import React, { useState, useMemo } from 'react';

function ExpensiveCalculation({ list, filter }) {
  // 只有当 list 或 filter 改变时才重新计算
  const filteredList = useMemo(() => {
    console.log('Filtering list...');
    return list.filter(item => item.includes(filter));
  }, [list, filter]);

  return (
    <ul>
      {filteredList.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

function App() {
  const [list] = useState(['apple', 'banana', 'cherry', 'date', 'elderberry']);
  const [filter, setFilter] = useState('');
  const [count, setCount] = useState(0);

  return (
    <div>
      <input
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder="Filter list..."
      />
      <ExpensiveCalculation list={list} filter={filter} />
      <div>
        <p>Count: {count}</p>
        <button onClick={() => setCount(count + 1)}>
          Increment
        </button>
      </div>
    </div>
  );
}
```

### useRef

`useRef` 返回一个可变的 ref 对象，其 `.current` 属性被初始化为传入的参数：

```jsx
import React, { useRef, useEffect } from 'react';

function TextInputWithFocusButton() {
  // 创建一个 ref
  const inputRef = useRef(null);

  // 点击按钮时，使输入框获得焦点
  const focusInput = () => {
    inputRef.current.focus();
  };

  return (
    <div>
      <input ref={inputRef} type="text" />
      <button onClick={focusInput}>Focus Input</button>
    </div>
  );
}
```

#### 使用 useRef 保存上一个值

```jsx
import React, { useState, useEffect, useRef } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  const prevCountRef = useRef();

  useEffect(() => {
    // 在每次渲染后更新 ref
    prevCountRef.current = count;
  });

  const prevCount = prevCountRef.current;

  return (
    <div>
      <p>Current: {count}, Previous: {prevCount}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}
```

### useLayoutEffect

`useLayoutEffect` 与 `useEffect` 类似，但它会在所有 DOM 变更之后同步调用：

```jsx
import React, { useState, useLayoutEffect, useRef } from 'react';

function Tooltip() {
  const [tooltipHeight, setTooltipHeight] = useState(0);
  const tooltipRef = useRef(null);

  useLayoutEffect(() => {
    // 在 DOM 更新后立即测量高度
    const height = tooltipRef.current.offsetHeight;
    setTooltipHeight(height);
  }, []);

  return (
    <div>
      <div
        ref={tooltipRef}
        style={{
          position: 'absolute',
          top: `-${tooltipHeight}px`,
        }}
      >
        This is a tooltip
      </div>
      <button>Hover me</button>
    </div>
  );
}
```

### useImperativeHandle

`useImperativeHandle` 自定义使用 ref 时公开给父组件的实例值：

```jsx
import React, { useRef, useImperativeHandle, forwardRef } from 'react';

// 使用 forwardRef 转发 ref
const FancyInput = forwardRef((props, ref) => {
  const inputRef = useRef(null);

  // 自定义暴露给父组件的实例值
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current.focus();
    },
    blur: () => {
      inputRef.current.blur();
    },
    // 只暴露我们想要暴露的方法
  }));

  return <input ref={inputRef} {...props} />;
});

function Parent() {
  const fancyInputRef = useRef(null);

  const handleClick = () => {
    fancyInputRef.current.focus();
  };

  return (
    <div>
      <FancyInput ref={fancyInputRef} />
      <button onClick={handleClick}>Focus Input</button>
    </div>
  );
}
```

### useDebugValue

`useDebugValue` 可用于在 React 开发者工具中显示自定义 hook 的标签：

```jsx
import React, { useState, useEffect, useDebugValue } from 'react';

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 在 React 开发者工具中显示标签
  useDebugValue(isOnline ? 'Online' : 'Offline');

  return isOnline;
}

function StatusIndicator() {
  const isOnline = useOnlineStatus();

  return (
    <div>
      <p>You are {isOnline ? 'online' : 'offline'}</p>
    </div>
  );
}
```

## 自定义 Hooks

自定义 Hooks 是一种复用状态逻辑的方式，它不复用状态本身：

```jsx
import { useState, useEffect } from 'react';

// 自定义 Hook 用于获取窗口尺寸
function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return windowSize;
}

// 使用自定义 Hook
function WindowSizeDisplay() {
  const { width, height } = useWindowSize();

  return (
    <div>
      <p>Window width: {width}px</p>
      <p>Window height: {height}px</p>
    </div>
  );
}
```

### 更多自定义 Hooks 示例

#### useFetch - 用于数据获取

```jsx
import { useState, useEffect } from 'react';

function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;

    setLoading(true);

    fetch(url, { signal })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (!signal.aborted) {
          setData(data);
          setError(null);
          setLoading(false);
        }
      })
      .catch(error => {
        if (!signal.aborted) {
          setError(error.message);
          setData(null);
          setLoading(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [url]);

  return { data, loading, error };
}

// 使用 useFetch
function UserList() {
  const { data, loading, error } = useFetch('https://jsonplaceholder.typicode.com/users');

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <ul>
      {data && data.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

#### useLocalStorage - 用于本地存储

```jsx
import { useState, useEffect } from 'react';

function useLocalStorage(key, initialValue) {
  // 获取初始值
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  // 更新本地存储
  const setValue = value => {
    try {
      // 允许值是一个函数
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

// 使用 useLocalStorage
function App() {
  const [name, setName] = useLocalStorage('name', '');

  return (
    <div>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Enter your name"
      />
      <p>Hello, {name || 'Guest'}!</p>
    </div>
  );
}
```

## Hooks 规则

使用 Hooks 需要遵循两条规则：

1. **只在最顶层使用 Hooks**：不要在循环、条件或嵌套函数中调用 Hooks。
2. **只在 React 函数中调用 Hooks**：不要在普通的 JavaScript 函数中调用 Hooks。

## 常见问题和解决方案

### 依赖项问题

```jsx
// 错误：缺少依赖项
useEffect(() => {
  document.title = `Hello, ${name}`;
}, []); // 应该包含 name 作为依赖项

// 正确：包含所有依赖项
useEffect(() => {
  document.title = `Hello, ${name}`;
}, [name]);
```

### 过时的闭包问题

```jsx
// 错误：使用过时的状态
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCount(count + 1); // 使用的是初始的 count 值
    }, 1000);
    return () => clearInterval(id);
  }, []); // 依赖项为空，但使用了 count

  return <h1>{count}</h1>;
}

// 正确：使用函数式更新
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCount(prevCount => prevCount + 1); // 使用函数式更新
    }, 1000);
    return () => clearInterval(id);
  }, []); // 现在依赖项为空是合理的

  return <h1>{count}</h1>;
}
```

### 条件渲染中的 Hooks

```jsx
// 错误：条件渲染中使用 Hooks
function Example(props) {
  if (props.condition) {
    const [count, setCount] = useState(0); // 这违反了 Hooks 规则
  }
  // ...
}

// 正确：将条件放在 Hook 内部
function Example(props) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (props.condition) {
      // 条件逻辑放在 Hook 内部
    }
  }, [props.condition]);
  // ...
}
```

## 性能优化

### 避免不必要的重新渲染

```jsx
// 使用 React.memo 避免不必要的重新渲染
const MemoizedComponent = React.memo(function MyComponent(props) {
  // 只有当 props 改变时才会重新渲染
  return <div>{props.name}</div>;
});

// 使用 useCallback 避免不必要的函数重新创建
function ParentComponent() {
  const [count, setCount] = useState(0);

  // 只有当依赖项改变时才会创建新的回调函数
  const handleClick = useCallback(() => {
    setCount(prevCount => prevCount + 1);
  }, []); // 空依赖数组表示回调函数不依赖任何值

  return (
    <div>
      <p>Count: {count}</p>
      <ChildComponent onClick={handleClick} />
    </div>
  );
}

// 使用 useMemo 避免不必要的计算
function ExpensiveComponent({ data }) {
  // 只有当 data 改变时才会重新计算
  const processedData = useMemo(() => {
    return data.map(item => expensiveOperation(item));
  }, [data]);

  return (
    <ul>
      {processedData.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

## 总结

React Hooks 提供了一种更简洁、更灵活的方式来管理组件状态和副作用。通过合理使用 Hooks，可以编写出更易于维护和测试的 React 组件。

记住 Hooks 的两条基本规则：只在最顶层使用 Hooks，只在 React 函数中调用 Hooks。遵循这些规则，你就能充分发挥 Hooks 的威力。