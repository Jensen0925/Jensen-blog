# Suspense 和异步渲染

## 什么是 Suspense

Suspense 是 React 提供的一个组件，用于**优雅地处理异步操作**，让你可以"等待"某些代码加载完成，并在等待时显示一个 loading 状态。

```jsx
<Suspense fallback={<Loading />}>
  <AsyncComponent />
</Suspense>
```

## Suspense 的使用场景

### 1. 代码分割（Code Splitting）

```jsx
import { lazy, Suspense } from 'react';

// 懒加载组件
const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### 2. 数据获取（Data Fetching）

```jsx
// 使用支持 Suspense 的数据获取库（如 Relay、SWR）
function ProfilePage({ userId }) {
  return (
    <Suspense fallback={<Spinner />}>
      <ProfileDetails userId={userId} />
      <ProfileTimeline userId={userId} />
    </Suspense>
  );
}

function ProfileDetails({ userId }) {
  // 读取数据时，如果数据未准备好，会"抛出" Promise
  const user = resource.user.read(userId);
  
  return <div>{user.name}</div>;
}
```

### 3. 资源加载（Images、Fonts等）

```jsx
// React 未来可能支持
<Suspense fallback={<ImagePlaceholder />}>
  <Image src="large-image.jpg" />
</Suspense>
```

## Suspense 的工作原理

### 基本机制

Suspense 通过**捕获 Promise** 来工作：

```javascript
// 简化的 Suspense 实现
class Suspense extends React.Component {
  state = { isLoading: false };
  
  componentDidCatch(error) {
    // 如果 "error" 是一个 Promise
    if (error instanceof Promise) {
      this.setState({ isLoading: true });
      
      error.then(() => {
        // Promise resolve 后，重新渲染
        this.setState({ isLoading: false });
      });
    } else {
      // 真正的错误，向上传播
      throw error;
    }
  }
  
  render() {
    if (this.state.isLoading) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
```

### Suspense-enabled 资源

要支持 Suspense，资源需要**抛出 Promise**：

```javascript
// 创建支持 Suspense 的资源
function createResource(promise) {
  let status = 'pending';
  let result;
  
  const suspender = promise.then(
    data => {
      status = 'success';
      result = data;
    },
    error => {
      status = 'error';
      result = error;
    }
  );
  
  return {
    read() {
      if (status === 'pending') {
        // 抛出 Promise，触发 Suspense
        throw suspender;
      } else if (status === 'error') {
        // 抛出错误，触发 Error Boundary
        throw result;
      } else if (status === 'success') {
        // 返回数据
        return result;
      }
    }
  };
}

// 使用
const userResource = createResource(fetchUser(userId));

function UserProfile() {
  // 如果数据未准备好，会抛出 Promise
  const user = userResource.read();
  
  return <div>{user.name}</div>;
}
```

## React.lazy 的实现

### 基本用法

```jsx
import { lazy, Suspense } from 'react';

// lazy 接受一个返回 Promise 的函数
const OtherComponent = lazy(() => import('./OtherComponent'));

function MyComponent() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OtherComponent />
    </Suspense>
  );
}
```

### lazy 的实现原理

```javascript
// 简化的 lazy 实现
function lazy(ctor) {
  let Component = null;
  let status = 'pending';
  let result;
  
  const payload = {
    _status: status,
    _result: result,
  };
  
  const lazyType = {
    $$typeof: REACT_LAZY_TYPE,
    _payload: payload,
    _init: (payload) => {
      if (payload._status === 'pending') {
        const ctor = payload._result;
        const thenable = ctor();
        
        // 设置 Promise 的回调
        thenable.then(
          moduleObject => {
            payload._status = 'resolved';
            payload._result = moduleObject.default;
          },
          error => {
            payload._status = 'rejected';
            payload._result = error;
          }
        );
        
        payload._result = thenable;
        payload._status = 'pending';
      }
      
      if (payload._status === 'resolved') {
        return payload._result;
      } else {
        // 抛出 Promise 或错误
        throw payload._result;
      }
    },
  };
  
  return lazyType;
}

// React 渲染 lazy 组件时
function mountLazyComponent(current, workInProgress, elementType) {
  const lazyComponent = elementType;
  const payload = lazyComponent._payload;
  const init = lazyComponent._init;
  
  // 调用 init，可能抛出 Promise
  let Component = init(payload);
  
  // 渲染真正的组件
  workInProgress.type = Component;
  return reconcileChildren(current, workInProgress, Component);
}
```

## 嵌套 Suspense

### 瀑布式加载问题

```jsx
// ❌ 问题：瀑布式加载
function App() {
  return (
    <Suspense fallback={<Loading />}>
      <ProfilePage />
    </Suspense>
  );
}

function ProfilePage() {
  return (
    <>
      <Suspense fallback={<Spinner />}>
        <ProfileDetails /> {/* 等待数据 1 */}
      </Suspense>
      <Suspense fallback={<Spinner />}>
        <ProfileTimeline /> {/* 等待数据 2，但要等数据 1 加载完 */}
      </Suspense>
    </>
  );
}

// 时间线：
// 0s: 开始加载 ProfileDetails
// 2s: ProfileDetails 完成，开始加载 ProfileTimeline
// 4s: ProfileTimeline 完成
// 总计：4秒
```

### 并行加载

```jsx
// ✅ 解决方案：提前开始加载
function App() {
  return (
    <Suspense fallback={<Loading />}>
      <ProfilePage />
    </Suspense>
  );
}

function ProfilePage() {
  // 提前创建资源，并行加载
  const detailsResource = useMemo(() => fetchProfileDetails(), []);
  const timelineResource = useMemo(() => fetchProfileTimeline(), []);
  
  return (
    <>
      <Suspense fallback={<Spinner />}>
        <ProfileDetails resource={detailsResource} />
      </Suspense>
      <Suspense fallback={<Spinner />}>
        <ProfileTimeline resource={timelineResource} />
      </Suspense>
    </>
  );
}

// 时间线：
// 0s: 同时开始加载 ProfileDetails 和 ProfileTimeline
// 2s: 两者都完成
// 总计：2秒
```

### SuspenseList（实验性）

```jsx
import { SuspenseList } from 'react';

// 控制多个 Suspense 的显示顺序
function App() {
  return (
    <SuspenseList revealOrder="forwards">
      <Suspense fallback={<Spinner />}>
        <ProfileDetails />
      </Suspense>
      <Suspense fallback={<Spinner />}>
        <ProfileTimeline />
      </Suspense>
      <Suspense fallback={<Spinner />}>
        <ProfileTrivia />
      </Suspense>
    </SuspenseList>
  );
}

// revealOrder 选项：
// - forwards：按顺序显示
// - backwards：反向显示
// - together：一起显示
```

## Suspense 与 Error Boundaries

### 配合使用

```jsx
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

function App() {
  return (
    <ErrorBoundary
      fallback={<ErrorFallback />}
      onError={(error, errorInfo) => {
        logErrorToService(error, errorInfo);
      }}
    >
      <Suspense fallback={<Loading />}>
        <AsyncComponent />
      </Suspense>
    </ErrorBoundary>
  );
}

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div>
      <h2>出错了！</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>重试</button>
    </div>
  );
}
```

### 封装通用组件

```jsx
function AsyncBoundary({ children, errorFallback, loadingFallback }) {
  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={loadingFallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

// 使用
<AsyncBoundary
  errorFallback={<ErrorMessage />}
  loadingFallback={<Spinner />}
>
  <UserProfile userId={userId} />
</AsyncBoundary>
```

## 数据获取模式

### 传统模式：Fetch-on-Render

```jsx
// ❌ 传统方式：渲染后获取（瀑布式）
function ProfilePage() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetchUser().then(setUser);
  }, []);
  
  if (!user) return <Spinner />;
  
  return (
    <>
      <ProfileDetails user={user} />
      <ProfileTimeline userId={user.id} />
    </>
  );
}

function ProfileTimeline({ userId }) {
  const [posts, setPosts] = useState([]);
  
  useEffect(() => {
    fetchPosts(userId).then(setPosts);
  }, [userId]);
  
  if (posts.length === 0) return <Spinner />;
  
  return <div>{/* ... */}</div>;
}

// 时间线：
// 0s: 开始获取 user
// 2s: user 完成，开始获取 posts
// 4s: posts 完成
```

### Suspense 模式：Render-as-You-Fetch

```jsx
// ✅ Suspense 方式：尽早获取（并行）
function fetchProfileData() {
  return {
    user: createResource(fetchUser()),
    posts: createResource(fetchPosts()),
  };
}

// 组件外部立即开始获取
const resource = fetchProfileData();

function ProfilePage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ProfileDetails resource={resource} />
      <ProfileTimeline resource={resource} />
    </Suspense>
  );
}

function ProfileDetails({ resource }) {
  const user = resource.user.read();
  return <div>{user.name}</div>;
}

function ProfileTimeline({ resource }) {
  const posts = resource.posts.read();
  return <div>{/* ... */}</div>;
}

// 时间线：
// 0s: 同时开始获取 user 和 posts
// 2s: 两者都完成
```

### 实际应用：带缓存的数据获取

```jsx
// 简单的缓存实现
const cache = new Map();

function createCachedResource(key, fetcher) {
  if (!cache.has(key)) {
    cache.set(key, createResource(fetcher()));
  }
  return cache.get(key);
}

// 自定义 Hook
function useSuspenseQuery(key, fetcher) {
  const resource = useMemo(
    () => createCachedResource(key, fetcher),
    [key]
  );
  
  return resource.read();
}

// 使用
function UserProfile({ userId }) {
  const user = useSuspenseQuery(
    `user-${userId}`,
    () => fetchUser(userId)
  );
  
  return <div>{user.name}</div>;
}

function App({ userId }) {
  return (
    <Suspense fallback={<Loading />}>
      <UserProfile userId={userId} />
    </Suspense>
  );
}
```

## Streaming SSR

### 传统 SSR 的问题

```javascript
// 传统 SSR
// 服务器端：
const html = renderToString(<App />);
res.send(`
  <!DOCTYPE html>
  <html>
    <body>
      <div id="root">${html}</div>
      <script src="bundle.js"></script>
    </body>
  </html>
`);

// 问题：
// 1. 必须等待所有数据加载完成
// 2. 必须等待整个 HTML 生成完成
// 3. 客户端必须等待所有 JS 加载完成
// 4. 必须等待整个应用 hydrate 完成
```

### Streaming SSR with Suspense

```javascript
import { renderToPipeableStream } from 'react-dom/server';

// 服务器端
app.get('/', (req, res) => {
  const { pipe } = renderToPipeableStream(
    <App />,
    {
      bootstrapScripts: ['/main.js'],
      onShellReady() {
        // 外壳准备好了，开始流式传输
        res.setHeader('Content-Type', 'text/html');
        pipe(res);
      },
      onAllReady() {
        // 所有内容准备好了
      },
      onError(error) {
        console.error(error);
      }
    }
  );
});

// App 组件
function App() {
  return (
    <html>
      <head>
        <title>My App</title>
      </head>
      <body>
        <Header />
        <Suspense fallback={<Spinner />}>
          <Comments />
        </Suspense>
        <Footer />
      </body>
    </html>
  );
}

// 流式传输过程：
// 1. 立即发送 Header
// 2. 发送 Spinner（Comments 的 fallback）
// 3. 发送 Footer
// 4. 当 Comments 准备好时，发送实际内容
```

### Selective Hydration

```jsx
// 客户端
import { hydrateRoot } from 'react-dom/client';

hydrateRoot(document, <App />);

// React 会：
// 1. 优先 hydrate 用户正在交互的部分
// 2. 其他部分延迟 hydrate
// 3. 提高首次交互响应速度
```

## 实际应用示例

### 路由级 Suspense

```jsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const Home = lazy(() => import('./routes/Home'));
const About = lazy(() => import('./routes/About'));
const Dashboard = lazy(() => import('./routes/Dashboard'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

### 条件式 Suspense

```jsx
function ProductPage({ productId }) {
  const [showReviews, setShowReviews] = useState(false);
  
  return (
    <div>
      <ProductDetails productId={productId} />
      
      <button onClick={() => setShowReviews(true)}>
        显示评论
      </button>
      
      {showReviews && (
        <Suspense fallback={<ReviewsLoader />}>
          <Reviews productId={productId} />
        </Suspense>
      )}
    </div>
  );
}
```

### 图片懒加载

```jsx
function LazyImage({ src, alt }) {
  const [imageSrc, setImageSrc] = useState(null);
  
  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => setImageSrc(src);
  }, [src]);
  
  if (!imageSrc) {
    throw new Promise((resolve) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        setImageSrc(src);
        resolve();
      };
    });
  }
  
  return <img src={imageSrc} alt={alt} />;
}

// 使用
<Suspense fallback={<ImagePlaceholder />}>
  <LazyImage src="large-image.jpg" alt="Large" />
</Suspense>
```

## 最佳实践

### 1. 合理设置 fallback

```jsx
// ❌ 避免：fallback 太简单
<Suspense fallback={<div>...</div>}>
  <Component />
</Suspense>

// ✅ 推荐：提供有意义的 loading 状态
<Suspense fallback={<ComponentSkeleton />}>
  <Component />
</Suspense>

// 或使用 Skeleton Screen
function ComponentSkeleton() {
  return (
    <div className="skeleton">
      <div className="skeleton-header" />
      <div className="skeleton-content" />
    </div>
  );
}
```

### 2. 避免不必要的 Suspense

```jsx
// ❌ 避免：每个小组件都包裹 Suspense
function App() {
  return (
    <>
      <Suspense fallback={<Spinner />}>
        <Header />
      </Suspense>
      <Suspense fallback={<Spinner />}>
        <Content />
      </Suspense>
      <Suspense fallback={<Spinner />}>
        <Footer />
      </Suspense>
    </>
  );
}

// ✅ 推荐：在合适的粒度使用
function App() {
  return (
    <>
      <Header />
      <Suspense fallback={<ContentLoader />}>
        <Content />
      </Suspense>
      <Footer />
    </>
  );
}
```

### 3. 预加载

```jsx
// 预加载路由
const Dashboard = lazy(() => import('./Dashboard'));

function Navigation() {
  const prefetchDashboard = () => {
    // 鼠标悬停时预加载
    import('./Dashboard');
  };
  
  return (
    <nav>
      <Link to="/dashboard" onMouseEnter={prefetchDashboard}>
        Dashboard
      </Link>
    </nav>
  );
}
```

### 4. 处理错误

```jsx
function App() {
  return (
    <ErrorBoundary
      fallback={({ error, resetErrorBoundary }) => (
        <div>
          <h2>加载失败</h2>
          <details>{error.message}</details>
          <button onClick={resetErrorBoundary}>重试</button>
        </div>
      )}
    >
      <Suspense fallback={<Loading />}>
        <AsyncComponent />
      </Suspense>
    </ErrorBoundary>
  );
}
```

## 第三方库支持

### SWR

```jsx
import useSWR from 'swr';

function Profile({ userId }) {
  const { data, error } = useSWR(
    `/api/user/${userId}`,
    fetcher,
    { suspense: true } // 启用 Suspense
  );
  
  // 不需要检查 loading 状态
  // 由 Suspense 处理
  
  return <div>{data.name}</div>;
}

// 使用
<Suspense fallback={<Loading />}>
  <Profile userId={userId} />
</Suspense>
```

### React Query

```jsx
import { useQuery } from '@tanstack/react-query';

function Posts() {
  const { data } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
    suspense: true,
  });
  
  return <div>{data.map(/* ... */)}</div>;
}

// 使用
<Suspense fallback={<Loading />}>
  <Posts />
</Suspense>
```

## 总结

Suspense 的核心概念：

1. **异步组件**
   - 通过抛出 Promise 来"暂停"渲染
   - 显示 fallback 直到 Promise resolve
   - 支持代码分割和数据获取

2. **工作原理**
   - React.lazy 创建懒加载组件
   - Suspense 捕获 Promise
   - Promise resolve 后重新渲染

3. **最佳实践**
   - 合理设置 fallback
   - 避免瀑布式加载
   - 配合 Error Boundary 使用
   - 提前开始数据获取

4. **高级特性**
   - Streaming SSR
   - Selective Hydration
   - 并发渲染

理解 Suspense 有助于：
- 优化应用加载性能
- 改善用户体验
- 简化异步状态管理
- 实现更好的 SSR

## 相关阅读

- [React.lazy 和代码分割](/react/performance#代码分割和懒加载)
- [React 18 新特性](/react/react-18)
- [React 19 新特性](/react/react-19)
- [错误处理与边界](/react/error-boundaries)

