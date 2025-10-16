# 自定义 Hooks 最佳实践

## 什么是自定义 Hooks

自定义 Hooks 是一个以 "use" 开头的 JavaScript 函数，可以调用其他 Hooks。它让你能够在不同组件之间**复用状态逻辑**。

```jsx
// 自定义 Hook
function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  
  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return size;
}

// 使用
function Component() {
  const { width, height } = useWindowSize();
  return <div>窗口大小：{width} x {height}</div>;
}
```

## Hook 设计原则

### 1. 命名以 "use" 开头

```jsx
// ✅ 好
function useAuth() { /* ... */ }
function useLocalStorage() { /* ... */ }
function useDebounce() { /* ... */ }

// ❌ 不好
function getAuth() { /* ... */ }
function localStorage() { /* ... */ }
function debounce() { /* ... */ }
```

### 2. 只在顶层调用 Hooks

```jsx
// ✅ 好
function useUser(userId) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // ...
  }, [userId]);
  
  return { user, loading };
}

// ❌ 不好
function useUser(userId) {
  if (userId) {
    const [user, setUser] = useState(null); // 错误！条件调用
  }
  return user;
}
```

### 3. 单一职责原则

```jsx
// ✅ 好：每个 Hook 只做一件事
function useAuth() {
  // 只处理认证
}

function useUser(userId) {
  // 只获取用户数据
}

// ❌ 不好：一个 Hook 做太多事
function useEverything() {
  // 认证、数据获取、主题、路由...
}
```

## 常用自定义 Hooks

### 1. useLocalStorage

```jsx
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
  
  // 保存到 localStorage
  const setValue = useCallback((value) => {
    try {
      // 支持函数式更新
      const valueToStore = value instanceof Function
        ? value(storedValue)
        : value;
      
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  }, [key, storedValue]);
  
  return [storedValue, setValue];
}

// 使用
function App() {
  const [name, setName] = useLocalStorage('name', 'Guest');
  
  return (
    <div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <p>你好，{name}!</p>
    </div>
  );
}
```

### 2. useDebounce

```jsx
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

// 使用：搜索框
function SearchBox() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  useEffect(() => {
    if (debouncedSearchTerm) {
      // 执行搜索
      searchAPI(debouncedSearchTerm).then(setResults);
    }
  }, [debouncedSearchTerm]);
  
  return (
    <input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="搜索..."
    />
  );
}
```

### 3. useThrottle

```jsx
function useThrottle(value, delay) {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRan = useRef(Date.now());
  
  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= delay) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, delay - (Date.now() - lastRan.current));
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return throttledValue;
}

// 使用：滚动事件
function ScrollComponent() {
  const [scrollY, setScrollY] = useState(0);
  const throttledScrollY = useThrottle(scrollY, 100);
  
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return <div>滚动位置：{throttledScrollY}</div>;
}
```

### 4. usePrevious

```jsx
function usePrevious(value) {
  const ref = useRef();
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref.current;
}

// 使用：比较前后值
function Counter() {
  const [count, setCount] = useState(0);
  const prevCount = usePrevious(count);
  
  return (
    <div>
      <p>当前：{count}</p>
      <p>之前：{prevCount}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}
```

### 5. useToggle

```jsx
function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);
  
  const toggle = useCallback(() => {
    setValue(v => !v);
  }, []);
  
  return [value, toggle];
}

// 使用
function Modal() {
  const [isOpen, toggleOpen] = useToggle();
  
  return (
    <>
      <button onClick={toggleOpen}>打开模态框</button>
      {isOpen && (
        <div className="modal">
          <button onClick={toggleOpen}>关闭</button>
        </div>
      )}
    </>
  );
}
```

### 6. useAsync

```jsx
function useAsync(asyncFunction, immediate = true) {
  const [status, setStatus] = useState('idle');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  
  const execute = useCallback(async (...params) => {
    setStatus('pending');
    setData(null);
    setError(null);
    
    try {
      const response = await asyncFunction(...params);
      setData(response);
      setStatus('success');
      return response;
    } catch (error) {
      setError(error);
      setStatus('error');
      throw error;
    }
  }, [asyncFunction]);
  
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);
  
  return { execute, status, data, error };
}

// 使用
function UserProfile({ userId }) {
  const { data: user, status, error } = useAsync(
    () => fetchUser(userId),
    true
  );
  
  if (status === 'pending') return <Loading />;
  if (status === 'error') return <Error error={error} />;
  if (status === 'success') return <div>{user.name}</div>;
  
  return null;
}
```

### 7. useIntersectionObserver

```jsx
function useIntersectionObserver(
  elementRef,
  options = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      options
    );
    
    observer.observe(element);
    
    return () => {
      observer.disconnect();
    };
  }, [elementRef, options]);
  
  return isIntersecting;
}

// 使用：懒加载图片
function LazyImage({ src, alt }) {
  const imageRef = useRef();
  const isVisible = useIntersectionObserver(imageRef, {
    threshold: 0.1
  });
  
  return (
    <div ref={imageRef}>
      {isVisible ? (
        <img src={src} alt={alt} />
      ) : (
        <div className="placeholder">Loading...</div>
      )}
    </div>
  );
}
```

### 8. useEventListener

```jsx
function useEventListener(eventName, handler, element = window) {
  const savedHandler = useRef();
  
  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);
  
  useEffect(() => {
    const isSupported = element && element.addEventListener;
    if (!isSupported) return;
    
    const eventListener = (event) => savedHandler.current(event);
    element.addEventListener(eventName, eventListener);
    
    return () => {
      element.removeEventListener(eventName, eventListener);
    };
  }, [eventName, element]);
}

// 使用
function App() {
  const handleResize = useCallback(() => {
    console.log('窗口大小改变');
  }, []);
  
  useEventListener('resize', handleResize);
  
  const handleClick = useCallback(() => {
    console.log('点击了');
  }, []);
  
  useEventListener('click', handleClick, document.body);
  
  return <div>App</div>;
}
```

### 9. useInterval

```jsx
function useInterval(callback, delay) {
  const savedCallback = useRef();
  
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  
  useEffect(() => {
    if (delay === null) return;
    
    const id = setInterval(() => {
      savedCallback.current();
    }, delay);
    
    return () => clearInterval(id);
  }, [delay]);
}

// 使用：倒计时
function Countdown({ initialSeconds }) {
  const [seconds, setSeconds] = useState(initialSeconds);
  
  useInterval(() => {
    if (seconds > 0) {
      setSeconds(seconds - 1);
    }
  }, 1000);
  
  return <div>剩余：{seconds} 秒</div>;
}
```

### 10. useOnClickOutside

```jsx
function useOnClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler(event);
    };
    
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

// 使用：关闭下拉菜单
function Dropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef();
  
  useOnClickOutside(dropdownRef, () => setIsOpen(false));
  
  return (
    <div ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)}>
        Toggle
      </button>
      {isOpen && (
        <div className="menu">
          <div>选项 1</div>
          <div>选项 2</div>
        </div>
      )}
    </div>
  );
}
```

## 进阶 Hooks 模式

### 1. Hook 组合

```jsx
// 组合多个 Hook
function useUser(userId) {
  const { data, error, status } = useAsync(
    () => fetchUser(userId)
  );
  
  const cachedUser = useLocalStorage(`user-${userId}`, null);
  
  useEffect(() => {
    if (data) {
      cachedUser[1](data); // 缓存用户数据
    }
  }, [data]);
  
  return {
    user: data || cachedUser[0],
    error,
    loading: status === 'pending'
  };
}
```

### 2. 工厂模式

```jsx
// 创建可配置的 Hook
function createUseAsync(defaultConfig = {}) {
  return function useAsync(asyncFunction, config = {}) {
    const mergedConfig = { ...defaultConfig, ...config };
    // 实现...
  };
}

// 使用
const useApiCall = createUseAsync({
  headers: { 'Content-Type': 'application/json' },
  onError: (error) => console.error(error)
});

function Component() {
  const { data } = useApiCall(fetchData);
}
```

### 3. 状态机模式

```jsx
function useFetch(url) {
  const [state, setState] = useState({
    status: 'idle',
    data: null,
    error: null
  });
  
  useEffect(() => {
    if (!url) return;
    
    setState({ status: 'loading', data: null, error: null });
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setState({ status: 'success', data, error: null });
      })
      .catch(error => {
        setState({ status: 'error', data: null, error });
      });
  }, [url]);
  
  return state;
}
```

### 4. 发布订阅模式

```jsx
function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();
  
  return {
    getState: () => state,
    setState: (newState) => {
      state = typeof newState === 'function'
        ? newState(state)
        : newState;
      listeners.forEach(listener => listener(state));
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

const store = createStore({ count: 0 });

function useStore(selector = (state) => state) {
  const [state, setState] = useState(() => selector(store.getState()));
  
  useEffect(() => {
    return store.subscribe((newState) => {
      setState(selector(newState));
    });
  }, [selector]);
  
  return [state, store.setState];
}

// 使用
function Counter() {
  const [count, setCount] = useStore(state => state.count);
  
  return (
    <button onClick={() => setCount({ count: count + 1 })}>
      {count}
    </button>
  );
}
```

## 性能优化

### 1. 使用 useCallback 缓存函数

```jsx
function useCustomHook() {
  const [value, setValue] = useState(0);
  
  // ❌ 不好：每次都创建新函数
  const increment = () => setValue(v => v + 1);
  
  // ✅ 好：缓存函数
  const increment = useCallback(() => {
    setValue(v => v + 1);
  }, []);
  
  return { value, increment };
}
```

### 2. 使用 useMemo 缓存计算结果

```jsx
function useFilteredList(items, filter) {
  // 缓存过滤结果
  const filteredItems = useMemo(() => {
    return items.filter(item => item.category === filter);
  }, [items, filter]);
  
  return filteredItems;
}
```

### 3. 避免不必要的依赖

```jsx
// ❌ 不好
function useUser(userId) {
  const config = { timeout: 5000 };
  
  useEffect(() => {
    fetchUser(userId, config);
  }, [userId, config]); // config 每次都是新对象
}

// ✅ 好
function useUser(userId) {
  const config = useMemo(() => ({ timeout: 5000 }), []);
  
  useEffect(() => {
    fetchUser(userId, config);
  }, [userId, config]);
}

// 或者
function useUser(userId) {
  useEffect(() => {
    const config = { timeout: 5000 };
    fetchUser(userId, config);
  }, [userId]); // config 在 effect 内部
}
```

## 测试自定义 Hooks

### 使用 @testing-library/react-hooks

```jsx
import { renderHook, act } from '@testing-library/react-hooks';

test('useCounter 增加计数', () => {
  const { result } = renderHook(() => useCounter(0));
  
  act(() => {
    result.current.increment();
  });
  
  expect(result.current.count).toBe(1);
});

test('useAsync 处理成功', async () => {
  const asyncFn = jest.fn().mockResolvedValue('data');
  const { result, waitForNextUpdate } = renderHook(() =>
    useAsync(asyncFn)
  );
  
  expect(result.current.status).toBe('pending');
  
  await waitForNextUpdate();
  
  expect(result.current.status).toBe('success');
  expect(result.current.data).toBe('data');
});
```

## 常见错误和解决方案

### 1. 闭包陷阱

```jsx
// ❌ 问题：interval 中的 count 永远是 0
function Counter() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const id = setInterval(() => {
      setCount(count + 1); // 闭包捕获了初始的 count
    }, 1000);
    return () => clearInterval(id);
  }, []); // 空依赖数组
  
  return <div>{count}</div>;
}

// ✅ 解决方案 1：使用函数式更新
function Counter() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const id = setInterval(() => {
      setCount(c => c + 1); // 使用最新的值
    }, 1000);
    return () => clearInterval(id);
  }, []);
  
  return <div>{count}</div>;
}

// ✅ 解决方案 2：使用 useRef
function Counter() {
  const [count, setCount] = useState(0);
  const countRef = useRef(count);
  
  useEffect(() => {
    countRef.current = count;
  }, [count]);
  
  useEffect(() => {
    const id = setInterval(() => {
      setCount(countRef.current + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);
  
  return <div>{count}</div>;
}
```

### 2. 依赖项遗漏

```jsx
// ❌ 问题
function useSearch(query) {
  const [results, setResults] = useState([]);
  
  useEffect(() => {
    search(query).then(setResults);
  }, []); // 缺少 query 依赖
  
  return results;
}

// ✅ 解决方案
function useSearch(query) {
  const [results, setResults] = useState([]);
  
  useEffect(() => {
    search(query).then(setResults);
  }, [query]); // 添加依赖
  
  return results;
}
```

### 3. 内存泄漏

```jsx
// ❌ 问题：组件卸载后仍然更新状态
function useUser(userId) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetchUser(userId).then(setUser); // 如果组件卸载，仍会调用 setUser
  }, [userId]);
  
  return user;
}

// ✅ 解决方案：使用清理函数
function useUser(userId) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    let cancelled = false;
    
    fetchUser(userId).then(data => {
      if (!cancelled) {
        setUser(data);
      }
    });
    
    return () => {
      cancelled = true;
    };
  }, [userId]);
  
  return user;
}
```

## 总结

自定义 Hooks 的关键点：

1. **设计原则**
   - 命名以 "use" 开头
   - 遵循 Hooks 规则
   - 单一职责

2. **常用模式**
   - 数据获取
   - 事件监听
   - 状态管理
   - 工具函数

3. **性能优化**
   - 使用 useCallback
   - 使用 useMemo
   - 避免不必要的依赖

4. **注意事项**
   - 闭包陷阱
   - 依赖项管理
   - 内存泄漏

自定义 Hooks 让我们能够：
- 复用状态逻辑
- 组织代码更清晰
- 提高可测试性
- 提升开发效率

## 相关阅读

- [React Hooks 使用](/react/hooks)
- [性能优化完全指南](/react/performance)
- [状态管理原理](/react/state-management)

