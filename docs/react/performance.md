# React 性能优化完全指南

## 概述

性能优化是 React 应用开发的重要环节。本文将深入讲解 React 性能优化的各个方面，从原理到实践，帮助你构建高性能的 React 应用。

## 性能问题的根源

### React 的渲染流程

```
触发更新 → Render 阶段 → Commit 阶段 → 浏览器渲染
```

性能问题通常出现在：
1. **不必要的重新渲染**：组件没有变化，但仍然重新渲染
2. **昂贵的计算**：每次渲染都执行复杂计算
3. **大列表渲染**：渲染成千上万个列表项
4. **频繁的 DOM 操作**：过多的 DOM 更新

## React.memo - 避免不必要的渲染

### 基本用法

```jsx
// 未优化的组件
function UserCard({ user }) {
  console.log('UserCard 渲染');
  return (
    <div>
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  );
}

// 使用 React.memo 优化
const UserCard = React.memo(function UserCard({ user }) {
  console.log('UserCard 渲染');
  return (
    <div>
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  );
});

// 父组件
function UserList() {
  const [count, setCount] = useState(0);
  const user = { name: 'Alice', email: 'alice@example.com' };
  
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        点击次数: {count}
      </button>
      {/* 使用 memo 后，user 没变化时不会重新渲染 */}
      <UserCard user={user} />
    </div>
  );
}
```

### React.memo 的原理

```javascript
function memo(Component, arePropsEqual) {
  return function MemoComponent(props) {
    // 获取上一次的 props
    const prevProps = usePrevious(props);
    
    // 比较 props 是否相等
    if (prevProps && arePropsEqual 
      ? arePropsEqual(prevProps, props)
      : shallowEqual(prevProps, props)
    ) {
      // Props 相等，复用上次的结果
      return prevRenderedElement;
    }
    
    // Props 不等，重新渲染
    const nextElement = Component(props);
    prevRenderedElement = nextElement;
    return nextElement;
  };
}

// 浅比较
function shallowEqual(objA, objB) {
  if (Object.is(objA, objB)) return true;
  
  if (
    typeof objA !== 'object' || objA === null ||
    typeof objB !== 'object' || objB === null
  ) {
    return false;
  }
  
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  
  if (keysA.length !== keysB.length) return false;
  
  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (
      !Object.prototype.hasOwnProperty.call(objB, key) ||
      !Object.is(objA[key], objB[key])
    ) {
      return false;
    }
  }
  
  return true;
}
```

### 自定义比较函数

```jsx
const UserCard = React.memo(
  function UserCard({ user, onEdit }) {
    return (
      <div>
        <h3>{user.name}</h3>
        <button onClick={onEdit}>编辑</button>
      </div>
    );
  },
  // 自定义比较：只比较 user.id
  (prevProps, nextProps) => {
    return prevProps.user.id === nextProps.user.id;
  }
);
```

### 常见陷阱

```jsx
function Parent() {
  const [count, setCount] = useState(0);
  
  // ❌ 错误：每次都创建新对象
  return <Child user={{ name: 'Alice' }} />;
  
  // ❌ 错误：每次都创建新函数
  return <Child onClick={() => console.log('click')} />;
  
  // ❌ 错误：每次都创建新数组
  return <Child items={[1, 2, 3]} />;
}

const Child = React.memo(function Child(props) {
  // 因为 props 总是新的，memo 失效
  return <div>{/* ... */}</div>;
});

// ✅ 正确：提取到组件外部
const user = { name: 'Alice' };
const items = [1, 2, 3];

function Parent() {
  const [count, setCount] = useState(0);
  
  // 使用 useCallback 缓存函数
  const handleClick = useCallback(() => {
    console.log('click');
  }, []);
  
  return (
    <Child 
      user={user} 
      items={items} 
      onClick={handleClick}
    />
  );
}
```

## useMemo - 缓存计算结果

### 基本用法

```jsx
function ExpensiveComponent({ items, filter }) {
  // ❌ 不好：每次渲染都会执行
  const filteredItems = items.filter(item => 
    item.category === filter
  );
  
  // ✅ 好：只在 items 或 filter 变化时才重新计算
  const filteredItems = useMemo(() => {
    console.log('计算过滤结果');
    return items.filter(item => item.category === filter);
  }, [items, filter]);
  
  return (
    <ul>
      {filteredItems.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

### 何时使用 useMemo

```jsx
// ✅ 适合使用 useMemo 的场景：

// 1. 昂贵的计算
function DataAnalysis({ data }) {
  const analysis = useMemo(() => {
    // 复杂的数据分析
    return performComplexAnalysis(data);
  }, [data]);
  
  return <Chart data={analysis} />;
}

// 2. 防止子组件重新渲染
function Parent() {
  const [count, setCount] = useState(0);
  
  // 缓存对象，避免 Child 重新渲染
  const config = useMemo(() => ({
    color: 'blue',
    size: 'large'
  }), []);
  
  return <Child config={config} />;
}

// 3. 作为其他 Hook 的依赖
function useFilteredData(items, filter) {
  const filteredItems = useMemo(
    () => items.filter(item => item.category === filter),
    [items, filter]
  );
  
  useEffect(() => {
    // filteredItems 稳定，不会导致 effect 频繁执行
    saveToLocalStorage(filteredItems);
  }, [filteredItems]);
  
  return filteredItems;
}

// ❌ 不适合使用 useMemo 的场景：

// 1. 简单的计算
function Component({ a, b }) {
  // 不需要 memo，计算很简单
  const sum = a + b;
  return <div>{sum}</div>;
}

// 2. 原始值
function Component({ name }) {
  // 不需要 memo，字符串本身就是值
  const uppercaseName = useMemo(() => name.toUpperCase(), [name]);
  return <div>{uppercaseName}</div>;
}
```

### useMemo 的实现原理

```javascript
function useMemo(create, deps) {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const prevState = hook.memoizedState;
  
  if (prevState !== null) {
    if (nextDeps !== null) {
      const prevDeps = prevState[1];
      // 比较依赖是否变化
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        // 依赖未变化，返回缓存的值
        return prevState[0];
      }
    }
  }
  
  // 依赖变化，重新计算
  const nextValue = create();
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}

function areHookInputsEqual(nextDeps, prevDeps) {
  if (prevDeps === null) return false;
  
  for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    if (Object.is(nextDeps[i], prevDeps[i])) {
      continue;
    }
    return false;
  }
  return true;
}
```

## useCallback - 缓存函数

### 基本用法

```jsx
function TodoList({ todos }) {
  const [filter, setFilter] = useState('all');
  
  // ❌ 不好：每次渲染都创建新函数
  const handleToggle = (id) => {
    toggleTodo(id);
  };
  
  // ✅ 好：缓存函数
  const handleToggle = useCallback((id) => {
    toggleTodo(id);
  }, []);
  
  return (
    <div>
      {todos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={handleToggle}
        />
      ))}
    </div>
  );
}

const TodoItem = React.memo(function TodoItem({ todo, onToggle }) {
  return (
    <div onClick={() => onToggle(todo.id)}>
      {todo.text}
    </div>
  );
});
```

### useCallback vs useMemo

```jsx
// useCallback
const handleClick = useCallback(() => {
  doSomething(a, b);
}, [a, b]);

// 等价于
const handleClick = useMemo(() => {
  return () => doSomething(a, b);
}, [a, b]);

// useCallback 就是返回函数的 useMemo 的语法糖
```

### 实际应用场景

```jsx
function SearchBox() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  
  // 防抖搜索
  const debouncedSearch = useCallback(
    debounce((searchTerm) => {
      fetchResults(searchTerm).then(setResults);
    }, 300),
    [] // 只创建一次
  );
  
  const handleChange = useCallback((e) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  }, [debouncedSearch]);
  
  return (
    <div>
      <input value={query} onChange={handleChange} />
      <ResultList results={results} />
    </div>
  );
}

// 自定义 debounce Hook
function useDebounce(callback, delay) {
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  });
  
  return useMemo(() => {
    return debounce((...args) => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]);
}
```

## 列表优化

### 虚拟列表（React Window）

```jsx
import { FixedSizeList } from 'react-window';

function VirtualList({ items }) {
  // 渲染单个列表项
  const Row = ({ index, style }) => (
    <div style={style}>
      {items[index].name}
    </div>
  );
  
  return (
    <FixedSizeList
      height={600}        // 列表高度
      itemCount={items.length}  // 总项数
      itemSize={50}       // 每项高度
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}

// 处理 10000 项，只渲染可见的部分
function App() {
  const items = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`
  }));
  
  return <VirtualList items={items} />;
}
```

### 动态高度虚拟列表

```jsx
import { VariableSizeList } from 'react-window';

function DynamicVirtualList({ items }) {
  const listRef = useRef();
  const rowHeights = useRef({});
  
  // 获取行高
  const getItemSize = (index) => {
    return rowHeights.current[index] || 50;
  };
  
  // 设置行高
  const setRowHeight = (index, size) => {
    listRef.current.resetAfterIndex(index);
    rowHeights.current[index] = size;
  };
  
  const Row = ({ index, style }) => {
    const rowRef = useRef();
    
    useEffect(() => {
      if (rowRef.current) {
        setRowHeight(index, rowRef.current.clientHeight);
      }
    }, [index]);
    
    return (
      <div ref={rowRef} style={style}>
        <div style={{ padding: 10 }}>
          {items[index].content}
        </div>
      </div>
    );
  };
  
  return (
    <VariableSizeList
      ref={listRef}
      height={600}
      itemCount={items.length}
      itemSize={getItemSize}
      width="100%"
    >
      {Row}
    </VariableSizeList>
  );
}
```

### 分页和无限滚动

```jsx
function InfiniteScrollList() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    const newItems = await fetchItems(page);
    
    setItems(prev => [...prev, ...newItems]);
    setPage(p => p + 1);
    setHasMore(newItems.length > 0);
    setLoading(false);
  }, [page, loading, hasMore]);
  
  // 使用 Intersection Observer
  const observerTarget = useRef(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 1 }
    );
    
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    
    return () => observer.disconnect();
  }, [loadMore]);
  
  return (
    <div>
      {items.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
      {hasMore && (
        <div ref={observerTarget}>
          {loading ? '加载中...' : '加载更多'}
        </div>
      )}
    </div>
  );
}
```

## 代码分割和懒加载

### React.lazy 和 Suspense

```jsx
import { lazy, Suspense } from 'react';

// 懒加载组件
const HeavyComponent = lazy(() => import('./HeavyComponent'));
const Dashboard = lazy(() => import('./Dashboard'));
const Profile = lazy(() => import('./Profile'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Suspense>
  );
}

// 预加载
function Navigation() {
  const handleMouseEnter = () => {
    // 鼠标悬停时预加载
    import('./Dashboard');
  };
  
  return (
    <nav>
      <Link 
        to="/dashboard" 
        onMouseEnter={handleMouseEnter}
      >
        Dashboard
      </Link>
    </nav>
  );
}
```

### 路由级别的代码分割

```jsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// 按路由分割
const routes = [
  {
    path: '/',
    component: lazy(() => import('./pages/Home')),
  },
  {
    path: '/about',
    component: lazy(() => import('./pages/About')),
  },
  {
    path: '/products',
    component: lazy(() => import('./pages/Products')),
  },
];

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {routes.map(({ path, component: Component }) => (
            <Route 
              key={path} 
              path={path} 
              element={<Component />} 
            />
          ))}
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

### 组件级别的代码分割

```jsx
function ProductDetails({ productId }) {
  const [showReviews, setShowReviews] = useState(false);
  
  // 只在需要时才加载 Reviews 组件
  const Reviews = lazy(() => import('./Reviews'));
  
  return (
    <div>
      <ProductInfo id={productId} />
      
      <button onClick={() => setShowReviews(true)}>
        查看评论
      </button>
      
      {showReviews && (
        <Suspense fallback={<Spinner />}>
          <Reviews productId={productId} />
        </Suspense>
      )}
    </div>
  );
}
```

## 状态管理优化

### 状态分割

```jsx
// ❌ 不好：所有状态在一起
function App() {
  const [state, setState] = useState({
    user: null,
    posts: [],
    comments: [],
    ui: { loading: false, modal: false }
  });
  
  // 任何状态变化都会导致整个组件重新渲染
}

// ✅ 好：分割状态
function App() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // 每个状态独立变化
}
```

### 状态下放

```jsx
// ❌ 不好：状态在顶层
function App() {
  const [selectedId, setSelectedId] = useState(null);
  
  return (
    <div>
      <Sidebar />
      <MainContent selectedId={selectedId} />
      {/* 修改 selectedId 会导致 Sidebar 也重新渲染 */}
    </div>
  );
}

// ✅ 好：状态下放到使用它的组件
function App() {
  return (
    <div>
      <Sidebar />
      <MainContent />
    </div>
  );
}

function MainContent() {
  const [selectedId, setSelectedId] = useState(null);
  // 状态只影响 MainContent
  
  return <div>{/* ... */}</div>;
}
```

### 使用 Context 的性能陷阱

```jsx
// ❌ 不好：Context 变化导致所有消费者重新渲染
const AppContext = createContext();

function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  
  return (
    <AppContext.Provider value={{ user, setUser, theme, setTheme }}>
      <Component />
    </AppContext.Provider>
  );
}

// ✅ 好：分割 Context
const UserContext = createContext();
const ThemeContext = createContext();

function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  
  const userValue = useMemo(() => ({ user, setUser }), [user]);
  const themeValue = useMemo(() => ({ theme, setTheme }), [theme]);
  
  return (
    <UserContext.Provider value={userValue}>
      <ThemeContext.Provider value={themeValue}>
        <Component />
      </ThemeContext.Provider>
    </UserContext.Provider>
  );
}

// 或者使用状态管理库（Zustand、Jotai）
import create from 'zustand';

const useUserStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));

const useThemeStore = create((set) => ({
  theme: 'light',
  setTheme: (theme) => set({ theme }),
}));
```

## 渲染优化模式

### 组件组合

```jsx
// ❌ 不好：ExpensiveTree 会随 count 变化而重新渲染
function App() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
      <ExpensiveTree />
    </div>
  );
}

// ✅ 好：使用组合，ExpensiveTree 不会重新渲染
function App() {
  return (
    <ColorPicker>
      <ExpensiveTree />
    </ColorPicker>
  );
}

function ColorPicker({ children }) {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
      {children}
    </div>
  );
}
```

### 提取为独立组件

```jsx
// ❌ 不好
function Parent() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        {count}
      </button>
      <ExpensiveComponent />
    </div>
  );
}

// ✅ 好
function Parent() {
  return (
    <div>
      <Counter />
      <ExpensiveComponent />
    </div>
  );
}

function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <button onClick={() => setCount(c => c + 1)}>
      {count}
    </button>
  );
}
```

## 性能分析工具

### React DevTools Profiler

```jsx
import { Profiler } from 'react';

function App() {
  const onRenderCallback = (
    id,                 // 组件的 id
    phase,              // "mount" 或 "update"
    actualDuration,     // 本次更新花费的时间
    baseDuration,       // 不使用 memo 的情况下的渲染时间
    startTime,          // 开始渲染的时间
    commitTime,         // 提交更新的时间
    interactions        // 本次更新的 interactions
  ) => {
    console.log(`${id} (${phase}) 渲染耗时: ${actualDuration}ms`);
  };
  
  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <MyComponent />
    </Profiler>
  );
}
```

### 自定义性能监控 Hook

```jsx
function useRenderCount(componentName) {
  const renderCount = useRef(0);
  
  useEffect(() => {
    renderCount.current += 1;
    console.log(`${componentName} 渲染次数: ${renderCount.current}`);
  });
}

function useWhyDidYouUpdate(name, props) {
  const previousProps = useRef();
  
  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps = {};
      
      allKeys.forEach(key => {
        if (previousProps.current[key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current[key],
            to: props[key]
          };
        }
      });
      
      if (Object.keys(changedProps).length > 0) {
        console.log('[why-did-you-update]', name, changedProps);
      }
    }
    
    previousProps.current = props;
  });
}

// 使用
function MyComponent(props) {
  useRenderCount('MyComponent');
  useWhyDidYouUpdate('MyComponent', props);
  
  return <div>{/* ... */}</div>;
}
```

## 打包优化

### Bundle 分析

```bash
# 使用 webpack-bundle-analyzer
npm install --save-dev webpack-bundle-analyzer

# 或使用 rollup-plugin-visualizer (Vite)
npm install --save-dev rollup-plugin-visualizer
```

```javascript
// vite.config.js
import { visualizer } from 'rollup-plugin-visualizer';

export default {
  plugins: [
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    })
  ]
}
```

### Tree Shaking

```jsx
// ❌ 不好：导入整个库
import _ from 'lodash';
_.debounce(fn, 300);

// ✅ 好：只导入需要的部分
import debounce from 'lodash/debounce';
debounce(fn, 300);

// 或使用 ES modules 版本
import { debounce } from 'lodash-es';
```

## 性能优化检查清单

### 🎯 渲染优化
- [ ] 使用 React.memo 包裹纯组件
- [ ] 使用 useMemo 缓存昂贵的计算
- [ ] 使用 useCallback 缓存函数
- [ ] 避免在渲染中创建新对象/数组/函数
- [ ] 合理拆分组件，避免不必要的重新渲染
- [ ] 使用组合模式避免 prop drilling

### 📦 代码分割
- [ ] 使用 React.lazy 进行路由级别的代码分割
- [ ] 对大型组件进行懒加载
- [ ] 使用动态 import 按需加载
- [ ] 预加载关键路由

### 📋 列表优化
- [ ] 为列表项提供稳定的 key
- [ ] 对长列表使用虚拟滚动
- [ ] 实现分页或无限滚动
- [ ] 避免在列表项中进行昂贵的计算

### 🏪 状态管理
- [ ] 状态分割，避免单一巨大状态
- [ ] 状态下放到最近的使用处
- [ ] Context 按功能分割
- [ ] 使用状态管理库处理全局状态

### 📊 性能监控
- [ ] 使用 React DevTools Profiler
- [ ] 监控组件渲染次数
- [ ] 分析 bundle 大小
- [ ] 设置性能预算

### 🌐 网络优化
- [ ] 使用 CDN
- [ ] 启用 gzip/brotli 压缩
- [ ] 实现资源缓存策略
- [ ] 使用 HTTP/2
- [ ] 图片懒加载和优化

## 总结

性能优化是一个持续的过程，关键点：

1. **测量优先**：先测量，再优化，避免过早优化
2. **找到瓶颈**：使用 Profiler 找到真正的性能瓶颈
3. **合理使用**：不要滥用 memo/useMemo/useCallback
4. **权衡取舍**：优化是有成本的，要权衡收益

记住：**过早优化是万恶之源**。只有在确实存在性能问题时，才进行针对性优化。

## 相关阅读

- [React Fiber 原理](/react/fiber)
- [React Reconciler](/react/reconciler)
- [React Hooks](/react/hooks)
- [状态管理原理](/react/state-management)

