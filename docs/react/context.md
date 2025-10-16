# Context 深入解析

## 什么是 Context

Context 提供了一种在组件树中**传递数据**的方式，无需通过 props 逐层传递。它解决了"prop drilling"（属性钻取）问题。

```jsx
// 不使用 Context - 需要层层传递
function App() {
  const [theme, setTheme] = useState('dark');
  return <Layout theme={theme} />;
}

function Layout({ theme }) {
  return <Content theme={theme} />;
}

function Content({ theme }) {
  return <Button theme={theme} />;
}

function Button({ theme }) {
  return <button className={theme}>Click</button>;
}

// 使用 Context - 直接访问
const ThemeContext = createContext('light');

function App() {
  const [theme, setTheme] = useState('dark');
  return (
    <ThemeContext.Provider value={theme}>
      <Layout />
    </ThemeContext.Provider>
  );
}

function Button() {
  const theme = useContext(ThemeContext);
  return <button className={theme}>Click</button>;
}
```

## Context API

### 1. createContext

```jsx
const MyContext = createContext(defaultValue);

// defaultValue 只在没有匹配的 Provider 时使用
const ThemeContext = createContext('light');
const UserContext = createContext(null);
const ConfigContext = createContext({ locale: 'zh-CN' });
```

### 2. Context.Provider

```jsx
<MyContext.Provider value={/* 共享的值 */}>
  {children}
</MyContext.Provider>

// 示例
function App() {
  const [user, setUser] = useState(null);
  
  return (
    <UserContext.Provider value={{ user, setUser }}>
      <Dashboard />
    </UserContext.Provider>
  );
}
```

### 3. useContext Hook

```jsx
const value = useContext(MyContext);

// 示例
function UserProfile() {
  const { user, setUser } = useContext(UserContext);
  
  if (!user) {
    return <LoginForm onLogin={setUser} />;
  }
  
  return <div>Welcome, {user.name}</div>;
}
```

### 4. Context.Consumer（旧式 API）

```jsx
<MyContext.Consumer>
  {value => /* 基于 context 值渲染 */}
</MyContext.Consumer>

// 示例（不推荐，使用 useContext 代替）
<ThemeContext.Consumer>
  {theme => <Button theme={theme} />}
</ThemeContext.Consumer>
```

## Context 的实现原理

### createContext 的实现

```javascript
function createContext(defaultValue) {
  const context = {
    $$typeof: REACT_CONTEXT_TYPE,
    _currentValue: defaultValue,
    _currentValue2: defaultValue, // 用于并发模式
    _threadCount: 0,
    Provider: null,
    Consumer: null,
  };
  
  context.Provider = {
    $$typeof: REACT_PROVIDER_TYPE,
    _context: context,
  };
  
  context.Consumer = context;
  
  return context;
}
```

### Provider 的工作原理

```javascript
// 简化的 Provider 实现
function updateContextProvider(
  current,
  workInProgress,
  renderLanes
) {
  const providerType = workInProgress.type;
  const context = providerType._context;
  
  const newProps = workInProgress.pendingProps;
  const oldProps = current !== null ? current.memoizedProps : null;
  
  const newValue = newProps.value;
  
  // 将新值推入栈
  pushProvider(workInProgress, context, newValue);
  
  // 如果值发生变化，需要标记消费者需要更新
  if (oldProps !== null) {
    const oldValue = oldProps.value;
    
    if (Object.is(oldValue, newValue)) {
      // 值没变，可以跳过
      if (
        oldProps.children === newProps.children
      ) {
        return bailoutOnAlreadyFinishedWork(
          current,
          workInProgress,
          renderLanes
        );
      }
    } else {
      // 值变了，标记消费者需要更新
      propagateContextChange(
        workInProgress,
        context,
        renderLanes
      );
    }
  }
  
  // 处理子节点
  const newChildren = newProps.children;
  reconcileChildren(current, workInProgress, newChildren, renderLanes);
  return workInProgress.child;
}

// 传播 Context 变化
function propagateContextChange(
  workInProgress,
  context,
  renderLanes
) {
  let fiber = workInProgress.child;
  
  // 深度优先遍历子树
  while (fiber !== null) {
    let nextFiber;
    
    // 检查当前 fiber 是否消费了这个 context
    const list = fiber.dependencies;
    if (list !== null) {
      nextFiber = fiber.child;
      
      let dependency = list.firstContext;
      while (dependency !== null) {
        // 如果消费了这个 context，标记需要更新
        if (dependency.context === context) {
          // 标记更新
          fiber.lanes = mergeLanes(fiber.lanes, renderLanes);
          
          const alternate = fiber.alternate;
          if (alternate !== null) {
            alternate.lanes = mergeLanes(alternate.lanes, renderLanes);
          }
          
          // 向上标记所有祖先
          scheduleContextWorkOnParentPath(
            fiber.return,
            renderLanes,
            workInProgress
          );
          
          // 标记依赖列表
          list.lanes = mergeLanes(list.lanes, renderLanes);
          
          break;
        }
        dependency = dependency.next;
      }
    }
    
    // 继续遍历
    fiber = nextFiber;
  }
}
```

### useContext 的实现

```javascript
function useContext(context) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useContext(context);
}

// 读取 context
function readContext(context) {
  const value = context._currentValue;
  
  // 记录依赖
  const contextItem = {
    context: context,
    next: null,
  };
  
  if (lastContextDependency === null) {
    // 第一个依赖
    lastContextDependency = contextItem;
    currentlyRenderingFiber.dependencies = {
      lanes: NoLanes,
      firstContext: contextItem,
    };
  } else {
    // 添加到依赖链表
    lastContextDependency = lastContextDependency.next = contextItem;
  }
  
  return value;
}
```

## Context 的性能问题

### 问题：Context 值变化会导致所有消费者重新渲染

```jsx
const AppContext = createContext();

function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  
  // ❌ 问题：任何状态变化都会导致所有消费者重新渲染
  const value = { user, setUser, theme, setTheme };
  
  return (
    <AppContext.Provider value={value}>
      <Header />
      <Content />
      <Footer />
    </AppContext.Provider>
  );
}

function Header() {
  // 只使用 theme，但 user 变化时也会重新渲染
  const { theme } = useContext(AppContext);
  return <header className={theme}>Header</header>;
}
```

## 性能优化方案

### 1. 分割 Context

```jsx
// ✅ 方案 1：按功能分割 Context
const UserContext = createContext();
const ThemeContext = createContext();

function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  
  return (
    <UserContext.Provider value={{ user, setUser }}>
      <ThemeContext.Provider value={{ theme, setTheme }}>
        <Header />
        <Content />
        <Footer />
      </ThemeContext.Provider>
    </UserContext.Provider>
  );
}

function Header() {
  // 只订阅 theme，user 变化不会影响
  const { theme } = useContext(ThemeContext);
  return <header className={theme}>Header</header>;
}
```

### 2. 使用 useMemo 缓存 value

```jsx
function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  
  // ✅ 缓存 context value
  const userValue = useMemo(
    () => ({ user, setUser }),
    [user]
  );
  
  const themeValue = useMemo(
    () => ({ theme, setTheme }),
    [theme]
  );
  
  return (
    <UserContext.Provider value={userValue}>
      <ThemeContext.Provider value={themeValue}>
        <App />
      </ThemeContext.Provider>
    </UserContext.Provider>
  );
}
```

### 3. 拆分 Provider

```jsx
// ✅ 方案 3：将 Provider 提取为独立组件
function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  
  const value = useMemo(
    () => ({ user, setUser }),
    [user]
  );
  
  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  
  const value = useMemo(
    () => ({ theme, setTheme }),
    [theme]
  );
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

function App() {
  return (
    <UserProvider>
      <ThemeProvider>
        <Layout />
      </ThemeProvider>
    </UserProvider>
  );
}
```

### 4. 使用 React.memo 阻止不必要的渲染

```jsx
const Header = React.memo(function Header() {
  const { theme } = useContext(ThemeContext);
  return <header className={theme}>Header</header>;
});

const Content = React.memo(function Content() {
  const { user } = useContext(UserContext);
  return <main>{user?.name}</main>;
});
```

### 5. 组件组合优化

```jsx
// ✅ 使用 children 避免重新渲染
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function App() {
  return (
    <ThemeProvider>
      {/* ExpensiveTree 不会因为 theme 变化而重新渲染 */}
      <ExpensiveTree />
    </ThemeProvider>
  );
}
```

### 6. 使用 Context Selector（第三方库）

```jsx
import { createContext, useContextSelector } from 'use-context-selector';

const AppContext = createContext();

function App() {
  const [state, setState] = useState({
    user: null,
    theme: 'light',
    locale: 'zh-CN'
  });
  
  return (
    <AppContext.Provider value={[state, setState]}>
      <Header />
    </AppContext.Provider>
  );
}

function Header() {
  // 只订阅 theme，其他属性变化不会触发重新渲染
  const theme = useContextSelector(
    AppContext,
    ([state]) => state.theme
  );
  
  return <header className={theme}>Header</header>;
}
```

## 高级用法

### 1. 动态 Context

```jsx
// 创建多个 Context 实例
function createThemeContext(defaultTheme) {
  const ThemeContext = createContext(defaultTheme);
  
  function ThemeProvider({ theme, children }) {
    return (
      <ThemeContext.Provider value={theme}>
        {children}
      </ThemeContext.Provider>
    );
  }
  
  function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
      throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
  }
  
  return { ThemeProvider, useTheme };
}

// 使用
const { ThemeProvider: LightThemeProvider, useTheme: useLightTheme } = 
  createThemeContext('light');

const { ThemeProvider: DarkThemeProvider, useTheme: useDarkTheme } = 
  createThemeContext('dark');
```

### 2. Context 与 Reducer 结合

```jsx
const StateContext = createContext();
const DispatchContext = createContext();

function reducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}

function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, {
    user: null,
    theme: 'light'
  });
  
  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
}

// 自定义 Hooks
function useAppState() {
  const context = useContext(StateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within AppProvider');
  }
  return context;
}

function useAppDispatch() {
  const context = useContext(DispatchContext);
  if (context === undefined) {
    throw new Error('useAppDispatch must be used within AppProvider');
  }
  return context;
}

// 使用
function UserProfile() {
  const { user } = useAppState();
  const dispatch = useAppDispatch();
  
  const handleLogout = () => {
    dispatch({ type: 'SET_USER', payload: null });
  };
  
  return <div>{user?.name}</div>;
}
```

### 3. 嵌套 Provider

```jsx
// 支持嵌套的 Theme Provider
function ThemeProvider({ theme, children }) {
  const parentTheme = useContext(ThemeContext);
  
  // 合并父级主题和当前主题
  const mergedTheme = useMemo(
    () => ({ ...parentTheme, ...theme }),
    [parentTheme, theme]
  );
  
  return (
    <ThemeContext.Provider value={mergedTheme}>
      {children}
    </ThemeContext.Provider>
  );
}

// 使用
<ThemeProvider theme={{ primary: 'blue' }}>
  <Header />
  <ThemeProvider theme={{ secondary: 'red' }}>
    <Content />
  </ThemeProvider>
</ThemeProvider>
```

### 4. Context 与 Portal

```jsx
function Modal({ children }) {
  const theme = useContext(ThemeContext);
  
  // Portal 可以访问 Context
  return ReactDOM.createPortal(
    <div className={`modal ${theme}`}>
      {children}
    </div>,
    document.body
  );
}
```

## 实际应用场景

### 1. 主题切换

```jsx
const ThemeContext = createContext();

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });
  
  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      return newTheme;
    });
  }, []);
  
  const value = useMemo(
    () => ({ theme, toggleTheme }),
    [theme, toggleTheme]
  );
  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

// 使用
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button onClick={toggleTheme}>
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}
```

### 2. 国际化（i18n）

```jsx
const I18nContext = createContext();

const translations = {
  'zh-CN': {
    welcome: '欢迎',
    login: '登录',
  },
  'en-US': {
    welcome: 'Welcome',
    login: 'Login',
  }
};

function I18nProvider({ children }) {
  const [locale, setLocale] = useState('zh-CN');
  
  const t = useCallback((key) => {
    return translations[locale][key] || key;
  }, [locale]);
  
  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, t]
  );
  
  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}

// 使用
function LoginButton() {
  const { t } = useI18n();
  return <button>{t('login')}</button>;
}
```

### 3. 用户认证

```jsx
const AuthContext = createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // 检查用户是否已登录
    checkAuth().then(user => {
      setUser(user);
      setLoading(false);
    });
  }, []);
  
  const login = useCallback(async (credentials) => {
    const user = await loginAPI(credentials);
    setUser(user);
    localStorage.setItem('token', user.token);
  }, []);
  
  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('token');
  }, []);
  
  const value = useMemo(
    () => ({ user, login, logout, loading }),
    [user, login, logout, loading]
  );
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Protected Route
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" />;
  
  return children;
}
```

### 4. 表单状态管理

```jsx
const FormContext = createContext();

function FormProvider({ initialValues, onSubmit, children }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  
  const handleChange = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    // 清除该字段的错误
    setErrors(prev => ({ ...prev, [name]: undefined }));
  }, []);
  
  const handleBlur = useCallback((name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);
  
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    
    // 验证
    const newErrors = validate(values);
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      onSubmit(values);
    }
  }, [values, onSubmit]);
  
  const value = useMemo(
    () => ({
      values,
      errors,
      touched,
      handleChange,
      handleBlur,
      handleSubmit
    }),
    [values, errors, touched, handleChange, handleBlur, handleSubmit]
  );
  
  return (
    <FormContext.Provider value={value}>
      <form onSubmit={handleSubmit}>
        {children}
      </form>
    </FormContext.Provider>
  );
}

function useFormContext() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within FormProvider');
  }
  return context;
}

// Field 组件
function Field({ name, label, type = 'text' }) {
  const { values, errors, touched, handleChange, handleBlur } = 
    useFormContext();
  
  return (
    <div>
      <label>{label}</label>
      <input
        type={type}
        value={values[name] || ''}
        onChange={(e) => handleChange(name, e.target.value)}
        onBlur={() => handleBlur(name)}
      />
      {touched[name] && errors[name] && (
        <span className="error">{errors[name]}</span>
      )}
    </div>
  );
}

// 使用
<FormProvider
  initialValues={{ email: '', password: '' }}
  onSubmit={handleLogin}
>
  <Field name="email" label="邮箱" type="email" />
  <Field name="password" label="密码" type="password" />
  <button type="submit">登录</button>
</FormProvider>
```

## Context vs 状态管理库

### 何时使用 Context

✅ 适合使用 Context 的场景：
- 主题、语言等全局配置
- 用户认证信息
- 不频繁变化的数据
- 中小型应用

❌ 不适合使用 Context 的场景：
- 频繁变化的数据
- 需要复杂的状态逻辑
- 需要中间件、DevTools
- 大型应用的全局状态

### Context vs Redux

```jsx
// Context 实现
const AppContext = createContext();

function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Redux 实现
import { Provider } from 'react-redux';
import { createStore } from 'redux';

const store = createStore(reducer);

function App() {
  return (
    <Provider store={store}>
      <Component />
    </Provider>
  );
}
```

### Context vs Zustand

```jsx
// Context
const StoreContext = createContext();

function StoreProvider({ children }) {
  const [bears, setBears] = useState(0);
  const value = useMemo(
    () => ({ bears, setBears }),
    [bears]
  );
  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

// Zustand（更简单）
import create from 'zustand';

const useStore = create((set) => ({
  bears: 0,
  increasePopulation: () => set((state) => ({ bears: state.bears + 1 })),
}));

// 使用更简单，且性能更好
function BearCounter() {
  const bears = useStore((state) => state.bears);
  return <div>{bears}</div>;
}
```

## 最佳实践

### 1. 提供默认值和类型检查

```typescript
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

### 2. 避免在 Context 中存储所有状态

```jsx
// ❌ 不好：所有状态都放在 Context
const AppContext = createContext();

function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [ui, setUI] = useState({});
  // ...更多状态
}

// ✅ 好：只在 Context 中存储真正需要共享的状态
const UserContext = createContext();
const ThemeContext = createContext();

// 局部状态留在组件内部
function PostList() {
  const [posts, setPosts] = useState([]);
  // posts 只在这里使用，不需要 Context
}
```

### 3. 使用自定义 Hook 封装 Context

```jsx
// ✅ 好的模式
const ThemeContext = createContext(undefined);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  
  const value = useMemo(
    () => ({ theme, setTheme }),
    [theme]
  );
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

// 使用时只需导入 Hook
import { useTheme } from './ThemeContext';

function Component() {
  const { theme } = useTheme();
  return <div className={theme}>Content</div>;
}
```

## 总结

Context 的核心要点：

1. **基本概念**
   - 解决 prop drilling 问题
   - 通过 Provider 提供值
   - 通过 useContext 消费值

2. **工作原理**
   - Provider 推入值栈
   - Consumer 读取栈顶值
   - 值变化时传播更新

3. **性能优化**
   - 分割 Context
   - 缓存 value
   - 使用 memo
   - 组件组合

4. **最佳实践**
   - 自定义 Hook 封装
   - 类型检查
   - 合理的粒度
   - 只存储真正需要共享的状态

Context 适合：
- 全局配置（主题、语言）
- 用户信息
- 不频繁变化的数据

不适合：
- 频繁变化的状态
- 复杂的状态逻辑
- 需要高性能优化的场景

## 相关阅读

- [状态管理原理](/react/state-management)
- [性能优化完全指南](/react/performance)
- [自定义 Hooks 最佳实践](/react/custom-hooks)
- [React 设计模式](/react/patterns)

