# 错误处理与边界

## 什么是 Error Boundaries

Error Boundaries（错误边界）是 React 组件，用于**捕获子组件树中的 JavaScript 错误**，记录这些错误，并显示一个备用 UI，而不会导致整个组件树崩溃。

```jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error) {
    // 更新 state，下次渲染将显示备用 UI
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    // 记录错误信息
    console.error('捕获到错误：', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <h1>出错了！</h1>;
    }
    
    return this.props.children;
  }
}

// 使用
<ErrorBoundary>
  <MyWidget />
</ErrorBoundary>
```

## Error Boundaries 的工作原理

### 生命周期方法

#### 1. getDerivedStateFromError

```jsx
static getDerivedStateFromError(error) {
  // 在渲染阶段调用
  // 用于更新 state，显示备用 UI
  // 不应该有副作用
  
  return { hasError: true, error };
}
```

#### 2. componentDidCatch

```jsx
componentDidCatch(error, errorInfo) {
  // 在提交阶段调用
  // 可以执行副作用，如记录错误
  
  // error: 被抛出的错误
  // errorInfo: 包含 componentStack 的对象
  
  logErrorToService(error, errorInfo);
}
```

### 两个阶段的区别

```jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  // Render 阶段：更新状态
  static getDerivedStateFromError(error) {
    console.log('getDerivedStateFromError - Render 阶段');
    return { hasError: true, error };
  }
  
  // Commit 阶段：副作用
  componentDidCatch(error, errorInfo) {
    console.log('componentDidCatch - Commit 阶段');
    
    // 可以在这里：
    // - 记录错误日志
    // - 发送错误报告
    // - 更新错误统计
    
    this.reportError(error, errorInfo);
  }
  
  reportError = (error, errorInfo) => {
    fetch('/api/log-error', {
      method: 'POST',
      body: JSON.stringify({
        error: error.toString(),
        componentStack: errorInfo.componentStack
      })
    });
  };
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

## Error Boundaries 能捕获什么

### ✅ 可以捕获

```jsx
class MyComponent extends React.Component {
  render() {
    // 1. 渲染阶段的错误
    if (this.props.data === null) {
      throw new Error('数据为空');
    }
    
    return <div>{this.props.data.value}</div>;
  }
  
  componentDidMount() {
    // 2. 生命周期方法中的错误
    throw new Error('挂载失败');
  }
  
  handleClick = () => {
    // 3. 构造函数中的错误（通过 setState 触发）
    this.setState(() => {
      throw new Error('状态更新失败');
    });
  };
}
```

### ❌ 不能捕获

```jsx
class MyComponent extends React.Component {
  componentDidMount() {
    // 1. 事件处理器中的错误
    // 需要使用 try-catch
    document.getElementById('btn').addEventListener('click', () => {
      throw new Error('点击错误'); // 不会被捕获
    });
    
    // 2. 异步错误
    setTimeout(() => {
      throw new Error('异步错误'); // 不会被捕获
    }, 1000);
    
    // 3. Promise 错误
    fetch('/api/data')
      .then(res => {
        throw new Error('Promise 错误'); // 不会被捕获
      });
  }
  
  handleClick = () => {
    // 4. 事件处理器中的同步错误
    throw new Error('事件错误'); // 不会被捕获
  };
  
  render() {
    return <button onClick={this.handleClick}>点击</button>;
  }
}

// 5. Error Boundary 自身的错误
// 6. 服务端渲染的错误
```

## 实现完整的 Error Boundary

### 基础实现

```jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });
    
    // 记录到错误监控服务
    this.logError(error, errorInfo);
  }
  
  logError = (error, errorInfo) => {
    // 发送到 Sentry、LogRocket 等
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        extra: errorInfo
      });
    }
  };
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>出错了</h2>
          <details>
            <summary>查看详情</summary>
            <p>{this.state.error && this.state.error.toString()}</p>
            <pre>{this.state.errorInfo?.componentStack}</pre>
          </details>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

### 增强版实现

```jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventHandlerError: null
    };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    const { onError } = this.props;
    
    this.setState({
      error,
      errorInfo
    });
    
    // 调用父组件的错误处理函数
    if (onError) {
      onError(error, errorInfo);
    }
    
    // 记录错误
    this.logError(error, errorInfo);
  }
  
  logError = (error, errorInfo) => {
    const errorData = {
      message: error.toString(),
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    // 发送到错误监控服务
    fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData)
    });
  };
  
  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      eventHandlerError: null
    });
    
    // 调用父组件的重置函数
    if (this.props.onReset) {
      this.props.onReset();
    }
  };
  
  render() {
    const { hasError, error, errorInfo } = this.state;
    const { fallback, fallbackComponent: FallbackComponent } = this.props;
    
    if (hasError) {
      // 自定义 fallback 组件
      if (FallbackComponent) {
        return (
          <FallbackComponent
            error={error}
            errorInfo={errorInfo}
            resetError={this.resetError}
          />
        );
      }
      
      // 自定义 fallback 渲染函数
      if (fallback) {
        return fallback({ error, errorInfo, resetError: this.resetError });
      }
      
      // 默认 fallback UI
      return (
        <div className="error-boundary">
          <h2>出错了</h2>
          <button onClick={this.resetError}>重试</button>
          {process.env.NODE_ENV === 'development' && (
            <details>
              <summary>错误详情</summary>
              <p>{error && error.toString()}</p>
              <pre>{errorInfo?.componentStack}</pre>
            </details>
          )}
        </div>
      );
    }
    
    return this.props.children;
  }
}

// 使用
<ErrorBoundary
  fallbackComponent={ErrorFallback}
  onError={(error, errorInfo) => {
    console.log('错误：', error);
  }}
  onReset={() => {
    // 重置应用状态
  }}
>
  <App />
</ErrorBoundary>
```

## 使用 react-error-boundary 库

### 安装和基本使用

```bash
npm install react-error-boundary
```

```jsx
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert">
      <p>出错了：</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>重试</button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        // 记录错误
        logError(error, errorInfo);
      }}
      onReset={() => {
        // 重置状态
      }}
    >
      <MyWidget />
    </ErrorBoundary>
  );
}
```

### 使用 Hook

```jsx
import { useErrorHandler } from 'react-error-boundary';

function MyComponent() {
  const handleError = useErrorHandler();
  
  const handleClick = async () => {
    try {
      await fetchData();
    } catch (error) {
      // 将错误传递给最近的 Error Boundary
      handleError(error);
    }
  };
  
  return <button onClick={handleClick}>获取数据</button>;
}
```

## 错误处理策略

### 1. 分层错误边界

```jsx
function App() {
  return (
    // 应用级错误边界
    <ErrorBoundary
      fallback={<FullPageError />}
      onError={logError}
    >
      <Layout>
        {/* 路由级错误边界 */}
        <ErrorBoundary fallback={<PageError />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/dashboard"
              element={
                // 功能级错误边界
                <ErrorBoundary fallback={<WidgetError />}>
                  <Dashboard />
                </ErrorBoundary>
              }
            />
          </Routes>
        </ErrorBoundary>
      </Layout>
    </ErrorBoundary>
  );
}
```

### 2. 关键路径保护

```jsx
function Dashboard() {
  return (
    <div>
      {/* 关键组件 - 错误时显示占位符 */}
      <ErrorBoundary fallback={<div>无法加载图表</div>}>
        <Chart />
      </ErrorBoundary>
      
      {/* 次要组件 - 错误时隐藏 */}
      <ErrorBoundary fallback={null}>
        <Recommendations />
      </ErrorBoundary>
      
      {/* 关键组件 - 错误时整个页面不可用 */}
      <DataTable />
    </div>
  );
}
```

### 3. 重试机制

```jsx
class RetryErrorBoundary extends React.Component {
  state = {
    hasError: false,
    retryCount: 0
  };
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error(error, errorInfo);
  }
  
  handleRetry = () => {
    this.setState(state => ({
      hasError: false,
      retryCount: state.retryCount + 1
    }));
  };
  
  render() {
    const { hasError, retryCount } = this.state;
    const { maxRetries = 3 } = this.props;
    
    if (hasError) {
      if (retryCount >= maxRetries) {
        return <div>重试次数过多，请刷新页面</div>;
      }
      
      return (
        <div>
          <p>加载失败</p>
          <button onClick={this.handleRetry}>
            重试 ({retryCount + 1}/{maxRetries})
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

### 4. 自动恢复

```jsx
class AutoRecoveryErrorBoundary extends React.Component {
  state = { hasError: false };
  timeoutId = null;
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error(error, errorInfo);
    
    // 5 秒后自动重试
    this.timeoutId = setTimeout(() => {
      this.setState({ hasError: false });
    }, 5000);
  }
  
  componentWillUnmount() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }
  
  render() {
    if (this.state.hasError) {
      return <div>出错了，5 秒后自动重试...</div>;
    }
    return this.props.children;
  }
}
```

## 处理异步错误

### 1. 事件处理器错误

```jsx
function MyComponent() {
  const handleError = useErrorHandler();
  
  const handleClick = () => {
    try {
      // 可能出错的代码
      riskyOperation();
    } catch (error) {
      handleError(error);
    }
  };
  
  return <button onClick={handleClick}>点击</button>;
}
```

### 2. useEffect 中的错误

```jsx
function MyComponent() {
  const handleError = useErrorHandler();
  
  useEffect(() => {
    fetchData()
      .catch(error => {
        handleError(error);
      });
  }, [handleError]);
  
  return <div>Loading...</div>;
}
```

### 3. 自定义 Hook 处理异步错误

```jsx
function useAsyncError() {
  const [, setError] = useState();
  
  return useCallback(
    error => {
      setError(() => {
        throw error;
      });
    },
    []
  );
}

// 使用
function MyComponent() {
  const throwError = useAsyncError();
  
  useEffect(() => {
    fetchData().catch(throwError);
  }, [throwError]);
  
  return <div>Loading...</div>;
}
```

## 错误监控和上报

### 集成 Sentry

```jsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'your-sentry-dsn',
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
});

// 使用 Sentry 的 ErrorBoundary
function App() {
  return (
    <Sentry.ErrorBoundary
      fallback={ErrorFallback}
      showDialog
    >
      <MyWidget />
    </Sentry.ErrorBoundary>
  );
}
```

### 自定义错误上报

```jsx
class ErrorReporter {
  static report(error, errorInfo, context = {}) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      context,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: getCurrentUserId(),
      sessionId: getSessionId()
    };
    
    // 发送到服务器
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData)
    });
    
    // 本地存储（离线时）
    if (!navigator.onLine) {
      const errors = JSON.parse(
        localStorage.getItem('offlineErrors') || '[]'
      );
      errors.push(errorData);
      localStorage.setItem('offlineErrors', JSON.stringify(errors));
    }
  }
  
  static reportSyncErrors() {
    const errors = JSON.parse(
      localStorage.getItem('offlineErrors') || '[]'
    );
    
    if (errors.length > 0) {
      fetch('/api/errors/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errors)
      }).then(() => {
        localStorage.removeItem('offlineErrors');
      });
    }
  }
}

// 监听在线状态
window.addEventListener('online', () => {
  ErrorReporter.reportSyncErrors();
});
```

## 开发环境 vs 生产环境

### 区分环境的错误显示

```jsx
class ErrorBoundary extends React.Component {
  render() {
    if (this.state.hasError) {
      // 开发环境：显示详细错误
      if (process.env.NODE_ENV === 'development') {
        return (
          <div>
            <h2>开发环境错误</h2>
            <details open>
              <summary>错误详情</summary>
              <pre>{this.state.error?.toString()}</pre>
              <pre>{this.state.errorInfo?.componentStack}</pre>
            </details>
          </div>
        );
      }
      
      // 生产环境：显示友好提示
      return (
        <div>
          <h2>出错了</h2>
          <p>我们已经收到错误报告，将尽快修复。</p>
          <button onClick={this.resetError}>返回首页</button>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

## 最佳实践

### 1. 错误边界粒度

```jsx
// ✅ 好：合适的粒度
function App() {
  return (
    <ErrorBoundary>
      <Layout>
        <ErrorBoundary>
          <Sidebar />
        </ErrorBoundary>
        <ErrorBoundary>
          <Main />
        </ErrorBoundary>
      </Layout>
    </ErrorBoundary>
  );
}

// ❌ 不好：粒度太细
function App() {
  return (
    <ErrorBoundary>
      <ErrorBoundary>
        <ErrorBoundary>
          <button>Click</button>
        </ErrorBoundary>
      </ErrorBoundary>
    </ErrorBoundary>
  );
}
```

### 2. 提供有意义的错误信息

```jsx
// ❌ 不好
throw new Error('错误');

// ✅ 好
throw new Error(`无法加载用户数据：用户 ID ${userId} 不存在`);
```

### 3. 记录上下文信息

```jsx
componentDidCatch(error, errorInfo) {
  logError({
    error,
    errorInfo,
    context: {
      userId: this.props.userId,
      page: this.props.location.pathname,
      action: this.state.lastAction
    }
  });
}
```

### 4. 优雅降级

```jsx
<ErrorBoundary
  fallback={
    <div className="widget-error">
      <p>此功能暂时不可用</p>
      <p>您可以继续使用其他功能</p>
    </div>
  }
>
  <OptionalWidget />
</ErrorBoundary>
```

## 总结

错误处理的核心要点：

1. **Error Boundaries**
   - 只能捕获子组件的渲染错误
   - 不能捕获事件处理器、异步错误
   - 使用类组件实现

2. **两个生命周期**
   - `getDerivedStateFromError`：更新状态
   - `componentDidCatch`：记录错误

3. **错误处理策略**
   - 分层错误边界
   - 关键路径保护
   - 重试机制
   - 自动恢复

4. **最佳实践**
   - 合适的错误边界粒度
   - 提供有意义的错误信息
   - 记录上下文信息
   - 优雅降级

良好的错误处理有助于：
- 提高应用的稳定性
- 改善用户体验
- 快速定位和修复问题
- 收集错误数据用于改进

## 相关阅读

- [Suspense 和异步渲染](/react/suspense)
- [React 生命周期](/react/components#生命周期)
- [自定义 Hooks](/react/custom-hooks)

