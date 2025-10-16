# 服务端渲染（SSR）

## 什么是 SSR

SSR（Server-Side Rendering，服务端渲染）是指在**服务器端**将 React 组件渲染成 HTML 字符串，然后发送给浏览器。

```
传统 CSR（客户端渲染）：
浏览器 → 下载 JS → 执行 JS → 渲染 HTML → 可交互

SSR（服务端渲染）：
服务器 → 渲染 HTML → 发送给浏览器 → 显示内容 → 下载 JS → Hydrate → 可交互
```

## 为什么需要 SSR

### 1. 更好的 SEO

```html
<!-- CSR: 搜索引擎看到的 -->
<div id="root"></div>
<script src="bundle.js"></script>

<!-- SSR: 搜索引擎看到的 -->
<div id="root">
  <h1>Welcome to My Site</h1>
  <p>This is the content...</p>
</div>
<script src="bundle.js"></script>
```

### 2. 更快的首屏加载

```
CSR 首屏时间 = 下载 HTML + 下载 JS + 执行 JS + 渲染
SSR 首屏时间 = 下载 HTML（已包含内容）
```

### 3. 更好的用户体验

- 用户可以立即看到内容
- 适合弱网环境
- 适合低端设备

## React SSR 基础 API

### 1. renderToString

```javascript
import { renderToString } from 'react-dom/server';

const html = renderToString(<App />);

// 返回 HTML 字符串
// "<div>...</div>"
```

### 2. renderToStaticMarkup

```javascript
import { renderToStaticMarkup } from 'react-dom/server';

const html = renderToStaticMarkup(<App />);

// 不包含 React 的 data 属性，适合纯静态页面
```

### 3. renderToPipeableStream (React 18+)

```javascript
import { renderToPipeableStream } from 'react-dom/server';

const { pipe } = renderToPipeableStream(<App />, {
  onShellReady() {
    response.setHeader('Content-Type', 'text/html');
    pipe(response);
  }
});
```

### 4. hydrateRoot (客户端)

```javascript
import { hydrateRoot } from 'react-dom/client';

// 在客户端"激活"服务端渲染的 HTML
hydrateRoot(document.getElementById('root'), <App />);
```

## 基础 SSR 实现

### 服务端代码

```javascript
// server.js
import express from 'express';
import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './App';

const app = express();

// 静态资源
app.use(express.static('public'));

app.get('*', (req, res) => {
  // 渲染 React 组件为 HTML
  const html = renderToString(<App />);
  
  // 发送完整的 HTML
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>SSR App</title>
        <link rel="stylesheet" href="/styles.css">
      </head>
      <body>
        <div id="root">${html}</div>
        <script src="/bundle.js"></script>
      </body>
    </html>
  `);
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### 客户端代码

```javascript
// client.js
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import App from './App';

// Hydrate 而不是 render
hydrateRoot(document.getElementById('root'), <App />);
```

### 组件代码

```jsx
// App.jsx
function App() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <h1>Hello SSR!</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>
        Increment
      </button>
    </div>
  );
}

export default App;
```

## 数据获取

### 1. 在服务端获取数据

```javascript
// server.js
app.get('*', async (req, res) => {
  // 获取数据
  const data = await fetchData();
  
  // 渲染组件
  const html = renderToString(<App data={data} />);
  
  // 将数据注入到页面中
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>SSR App</title>
      </head>
      <body>
        <div id="root">${html}</div>
        <script>
          window.__INITIAL_DATA__ = ${JSON.stringify(data)};
        </script>
        <script src="/bundle.js"></script>
      </body>
    </html>
  `);
});
```

### 2. 客户端使用预取数据

```jsx
// client.js
const initialData = window.__INITIAL_DATA__;

hydrateRoot(
  document.getElementById('root'),
  <App data={initialData} />
);

// 删除全局变量
delete window.__INITIAL_DATA__;
```

### 3. 使用 getServerSideProps 模式

```javascript
// 定义页面组件的数据获取方法
App.getServerSideProps = async (context) => {
  const data = await fetchData(context.params.id);
  return { props: { data } };
};

// 服务端
app.get('*', async (req, res) => {
  const Component = matchRoute(req.path);
  
  let props = {};
  if (Component.getServerSideProps) {
    const result = await Component.getServerSideProps({
      req,
      res,
      params: req.params
    });
    props = result.props;
  }
  
  const html = renderToString(<Component {...props} />);
  // ...
});
```

## 路由处理

### 使用 React Router

```javascript
// server.js
import { StaticRouter } from 'react-router-dom/server';

app.get('*', (req, res) => {
  const html = renderToString(
    <StaticRouter location={req.url}>
      <App />
    </StaticRouter>
  );
  
  res.send(htmlTemplate(html));
});
```

```jsx
// App.jsx
import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/users/:id" element={<User />} />
    </Routes>
  );
}
```

```javascript
// client.js
import { BrowserRouter } from 'react-router-dom';

hydrateRoot(
  document.getElementById('root'),
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
```

## 状态管理

### 使用 Redux

```javascript
// server.js
import { Provider } from 'react-redux';
import { createStore } from 'redux';

app.get('*', async (req, res) => {
  // 创建新的 store
  const store = createStore(reducer);
  
  // 预填充状态
  await store.dispatch(fetchData());
  
  // 渲染
  const html = renderToString(
    <Provider store={store}>
      <App />
    </Provider>
  );
  
  // 获取最终状态
  const preloadedState = store.getState();
  
  res.send(`
    <!DOCTYPE html>
    <html>
      <body>
        <div id="root">${html}</div>
        <script>
          window.__PRELOADED_STATE__ = ${JSON.stringify(preloadedState)};
        </script>
        <script src="/bundle.js"></script>
      </body>
    </html>
  `);
});
```

```javascript
// client.js
import { Provider } from 'react-redux';
import { createStore } from 'redux';

// 使用预加载的状态创建 store
const preloadedState = window.__PRELOADED_STATE__;
delete window.__PRELOADED_STATE__;

const store = createStore(reducer, preloadedState);

hydrateRoot(
  document.getElementById('root'),
  <Provider store={store}>
    <App />
  </Provider>
);
```

## Streaming SSR (React 18+)

### 基本概念

Streaming SSR 允许你**逐步发送 HTML**，而不是等待所有内容渲染完成。

```javascript
import { renderToPipeableStream } from 'react-dom/server';

app.get('*', (req, res) => {
  const { pipe } = renderToPipeableStream(<App />, {
    // 外壳准备好时开始流式传输
    onShellReady() {
      res.setHeader('Content-Type', 'text/html');
      pipe(res);
    },
    
    // 所有内容准备好时
    onAllReady() {
      console.log('All ready');
    },
    
    // 错误处理
    onError(error) {
      console.error(error);
    }
  });
});
```

### 使用 Suspense

```jsx
import { Suspense } from 'react';

function App() {
  return (
    <html>
      <head>
        <title>Streaming SSR</title>
      </head>
      <body>
        <Header />
        
        {/* Comments 加载时显示 Spinner */}
        <Suspense fallback={<Spinner />}>
          <Comments />
        </Suspense>
        
        <Footer />
      </body>
    </html>
  );
}
```

流式传输过程：
1. 立即发送 Header
2. 发送 Spinner（fallback）
3. 发送 Footer
4. Comments 准备好后，发送实际内容并替换 Spinner

### Selective Hydration

```jsx
// 客户端
import { hydrateRoot } from 'react-dom/client';

hydrateRoot(document, <App />);

// React 会：
// 1. 优先 hydrate 用户正在交互的部分
// 2. 延迟 hydrate 其他部分
// 3. 提高首次交互响应速度
```

## SSR 的挑战和解决方案

### 1. 客户端特定 API

```jsx
// ❌ 错误：服务端没有 window
function Component() {
  const width = window.innerWidth; // 报错！
  return <div>{width}</div>;
}

// ✅ 解决方案 1：检查环境
function Component() {
  const [width, setWidth] = useState(0);
  
  useEffect(() => {
    setWidth(window.innerWidth);
  }, []);
  
  return <div>{width || 'unknown'}</div>;
}

// ✅ 解决方案 2：只在客户端渲染
function Component() {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  if (!isClient) return null;
  
  return <div>{window.innerWidth}</div>;
}

// ✅ 解决方案 3：动态导入
import dynamic from 'next/dynamic';

const ClientOnlyComponent = dynamic(
  () => import('./ClientOnlyComponent'),
  { ssr: false }
);
```

### 2. 样式闪烁（FOUC）

```javascript
// 使用 styled-components
import { ServerStyleSheet } from 'styled-components';

app.get('*', (req, res) => {
  const sheet = new ServerStyleSheet();
  
  try {
    const html = renderToString(
      sheet.collectStyles(<App />)
    );
    
    const styleTags = sheet.getStyleTags();
    
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          ${styleTags}
        </head>
        <body>
          <div id="root">${html}</div>
        </body>
      </html>
    `);
  } finally {
    sheet.seal();
  }
});
```

### 3. 数据不一致

```jsx
// ❌ 可能导致 hydration 警告
function Component() {
  return (
    <div>
      {new Date().toString()}
    </div>
  );
}

// ✅ 确保服务端和客户端渲染一致
function Component({ timestamp }) {
  return (
    <div>
      {new Date(timestamp).toString()}
    </div>
  );
}

// 在服务端传递 timestamp
const timestamp = Date.now();
const html = renderToString(<Component timestamp={timestamp} />);
```

### 4. 内存泄漏

```javascript
// ❌ 可能导致内存泄漏
let cache = {}; // 全局变量

app.get('*', async (req, res) => {
  cache[req.url] = await fetchData(req.url);
  // cache 永远不会被清理
});

// ✅ 使用 LRU 缓存
import LRU from 'lru-cache';

const cache = new LRU({
  max: 500,
  maxAge: 1000 * 60 * 5 // 5 分钟
});

app.get('*', async (req, res) => {
  let data = cache.get(req.url);
  
  if (!data) {
    data = await fetchData(req.url);
    cache.set(req.url, data);
  }
  
  // ...
});
```

## 性能优化

### 1. 缓存

```javascript
import NodeCache from 'node-cache';

const htmlCache = new NodeCache({ stdTTL: 600 }); // 10 分钟

app.get('*', async (req, res) => {
  const cacheKey = req.url;
  
  // 检查缓存
  let html = htmlCache.get(cacheKey);
  
  if (!html) {
    // 渲染并缓存
    html = renderToString(<App />);
    htmlCache.set(cacheKey, html);
  }
  
  res.send(htmlTemplate(html));
});
```

### 2. 组件级缓存

```javascript
// 缓存慢组件的渲染结果
const componentCache = new Map();

function CachedComponent({ id }) {
  const cacheKey = `component-${id}`;
  
  if (!componentCache.has(cacheKey)) {
    const rendered = renderToString(<ExpensiveComponent id={id} />);
    componentCache.set(cacheKey, rendered);
  }
  
  const html = componentCache.get(cacheKey);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
```

### 3. 代码分割

```jsx
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <div>
      <Header />
      <Suspense fallback={<Loading />}>
        <HeavyComponent />
      </Suspense>
    </div>
  );
}
```

## SSR 框架

### Next.js

```jsx
// pages/index.js
export default function Home({ data }) {
  return <div>{data.title}</div>;
}

// 服务端数据获取
export async function getServerSideProps(context) {
  const data = await fetchData();
  
  return {
    props: { data }
  };
}
```

### Remix

```jsx
// app/routes/index.tsx
import { useLoaderData } from '@remix-run/react';

export async function loader() {
  return json(await fetchData());
}

export default function Index() {
  const data = useLoaderData();
  return <div>{data.title}</div>;
}
```

## 实际应用场景

### 1. 电商网站

```javascript
// 产品详情页 SSR
app.get('/product/:id', async (req, res) => {
  const product = await fetchProduct(req.params.id);
  
  const html = renderToString(
    <ProductPage product={product} />
  );
  
  res.send(htmlTemplate(html, {
    title: product.name,
    description: product.description,
    image: product.image
  }));
});
```

### 2. 博客/新闻网站

```javascript
// 文章页 SSR + 缓存
app.get('/article/:slug', async (req, res) => {
  const cacheKey = `article-${req.params.slug}`;
  
  let cached = cache.get(cacheKey);
  
  if (!cached) {
    const article = await fetchArticle(req.params.slug);
    const html = renderToString(<ArticlePage article={article} />);
    
    cached = {
      html,
      meta: {
        title: article.title,
        description: article.excerpt
      }
    };
    
    cache.set(cacheKey, cached, 3600); // 1 小时
  }
  
  res.send(htmlTemplate(cached.html, cached.meta));
});
```

### 3. 社交媒体

```javascript
// 用户主页 SSR
app.get('/user/:username', async (req, res) => {
  const [user, posts] = await Promise.all([
    fetchUser(req.params.username),
    fetchUserPosts(req.params.username)
  ]);
  
  const html = renderToString(
    <UserProfile user={user} posts={posts} />
  );
  
  res.send(htmlTemplate(html));
});
```

## SSR vs SSG vs ISR

### SSR（Server-Side Rendering）
- 每次请求都在服务器渲染
- 适合：动态内容、个性化内容

### SSG（Static Site Generation）
- 构建时生成 HTML
- 适合：内容不常变化的页面

```javascript
// Next.js SSG
export async function getStaticProps() {
  const data = await fetchData();
  return { props: { data } };
}
```

### ISR（Incremental Static Regeneration）
- 静态生成 + 增量更新
- 适合：内容更新不频繁，但需要最新数据

```javascript
// Next.js ISR
export async function getStaticProps() {
  const data = await fetchData();
  
  return {
    props: { data },
    revalidate: 60 // 60 秒后重新生成
  };
}
```

## 最佳实践

### 1. 区分环境

```javascript
const isServer = typeof window === 'undefined';

function Component() {
  if (isServer) {
    // 服务端逻辑
  } else {
    // 客户端逻辑
  }
}
```

### 2. 避免副作用

```jsx
// ❌ 避免在服务端执行副作用
function Component() {
  // 这会在服务端执行
  localStorage.setItem('key', 'value');
  
  return <div>Content</div>;
}

// ✅ 只在客户端执行
function Component() {
  useEffect(() => {
    localStorage.setItem('key', 'value');
  }, []);
  
  return <div>Content</div>;
}
```

### 3. 性能监控

```javascript
import { performance } from 'perf_hooks';

app.get('*', async (req, res) => {
  const start = performance.now();
  
  const html = renderToString(<App />);
  
  const duration = performance.now() - start;
  console.log(`SSR took ${duration}ms`);
  
  res.send(htmlTemplate(html));
});
```

### 4. 错误处理

```javascript
app.get('*', async (req, res) => {
  try {
    const html = renderToString(<App />);
    res.send(htmlTemplate(html));
  } catch (error) {
    console.error('SSR Error:', error);
    
    // 降级到客户端渲染
    res.send(htmlTemplate('', {
      error: true
    }));
  }
});
```

## 总结

SSR 的核心要点：

1. **工作原理**
   - 服务端渲染 HTML
   - 客户端 Hydration
   - 提升首屏性能

2. **关键 API**
   - renderToString / renderToPipeableStream
   - hydrateRoot
   - Streaming SSR

3. **挑战**
   - 客户端特定 API
   - 样式处理
   - 数据一致性
   - 性能优化

4. **最佳实践**
   - 合理缓存
   - 错误处理
   - 性能监控
   - 使用框架

SSR 适合：
- SEO 要求高的网站
- 首屏性能要求高
- 内容密集型应用

不适合：
- 纯后台管理系统
- 实时性要求极高的应用
- 服务器资源有限

## 相关阅读

- [Suspense 和异步渲染](/react/suspense)
- [性能优化完全指南](/react/performance)
- [React 18 新特性](/react/react-18)
- [React 19 新特性](/react/react-19)

