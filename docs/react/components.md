# React 组件开发

## 组件的类型

### 函数组件

函数组件是最简单的 React 组件形式，它是一个接收 props 并返回 React 元素的 JavaScript 函数：

```jsx
function Welcome(props) {
  return <h1>Hello, {props.name}</h1>;
}
```

### 类组件

类组件是使用 ES6 类语法定义的组件：

```jsx
import React, { Component } from 'react';

class Welcome extends Component {
  render() {
    return <h1>Hello, {this.props.name}</h1>;
  }
}
```

## 组件的生命周期

### 挂载阶段

- **constructor()** - 初始化状态和绑定方法
- **static getDerivedStateFromProps()** - 在渲染前更新 state
- **render()** - 渲染组件
- **componentDidMount()** - 组件挂载后执行，适合进行网络请求、添加订阅等

### 更新阶段

- **static getDerivedStateFromProps()** - 在渲染前更新 state
- **shouldComponentUpdate()** - 决定组件是否需要更新
- **render()** - 重新渲染组件
- **getSnapshotBeforeUpdate()** - 在更新前获取 DOM 信息
- **componentDidUpdate()** - 组件更新后执行

### 卸载阶段

- **componentWillUnmount()** - 组件卸载前执行，适合清理订阅、定时器等

### 错误处理

- **static getDerivedStateFromError()** - 在子组件抛出错误后更新 state
- **componentDidCatch()** - 捕获子组件的错误

## 组件通信

### 父组件向子组件传递数据

通过 props 向子组件传递数据：

```jsx
// 父组件
function Parent() {
  const data = 'Hello from parent';
  return <Child message={data} />;
}

// 子组件
function Child(props) {
  return <p>{props.message}</p>;
}
```

### 子组件向父组件传递数据

通过回调函数向父组件传递数据：

```jsx
// 父组件
function Parent() {
  const handleChildData = (data) => {
    console.log('Data from child:', data);
  };
  
  return <Child onDataSend={handleChildData} />;
}

// 子组件
function Child(props) {
  const sendData = () => {
    const data = 'Hello from child';
    props.onDataSend(data);
  };
  
  return <button onClick={sendData}>Send Data to Parent</button>;
}
```

### 兄弟组件通信

通过共同的父组件进行通信：

```jsx
function Parent() {
  const [data, setData] = useState('');
  
  const handleDataFromA = (data) => {
    setData(data);
  };
  
  return (
    <div>
      <ChildA onDataSend={handleDataFromA} />
      <ChildB receivedData={data} />
    </div>
  );
}

function ChildA(props) {
  const sendData = () => {
    props.onDataSend('Hello from ChildA');
  };
  
  return <button onClick={sendData}>Send Data</button>;
}

function ChildB(props) {
  return <p>Data from ChildA: {props.receivedData}</p>;
}
```

## 组件复用

### 高阶组件 (HOC)

高阶组件是一个函数，接收一个组件并返回一个新组件：

```jsx
function withLogger(WrappedComponent) {
  return function WithLogger(props) {
    useEffect(() => {
      console.log('Component rendered:', WrappedComponent.name);
      return () => {
        console.log('Component will unmount:', WrappedComponent.name);
      };
    }, []);
    
    return <WrappedComponent {...props} />;
  };
}

function MyComponent(props) {
  return <div>Hello, {props.name}</div>;
}

const EnhancedComponent = withLogger(MyComponent);
```

### Render Props

Render Props 是一种通过函数 prop 共享代码的技术：

```jsx
function MouseTracker(props) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  const handleMouseMove = (event) => {
    setPosition({
      x: event.clientX,
      y: event.clientY
    });
  };
  
  return (
    <div onMouseMove={handleMouseMove}>
      {props.render(position)}
    </div>
  );
}

function App() {
  return (
    <MouseTracker
      render={position => (
        <p>Mouse position: {position.x}, {position.y}</p>
      )}
    />
  );
}
```

### 自定义 Hooks

自定义 Hooks 是一种在组件之间复用状态逻辑的方式：

```jsx
function useMousePosition() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouseMove = (event) => {
      setPosition({
        x: event.clientX,
        y: event.clientY
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
  
  return position;
}

function MouseTracker() {
  const position = useMousePosition();
  
  return (
    <p>Mouse position: {position.x}, {position.y}</p>
  );
}
```

## 组件性能优化

### React.memo

`React.memo` 是一个高阶组件，用于优化函数组件的性能：

```jsx
const MemoizedComponent = React.memo(function MyComponent(props) {
  // 只有当 props 改变时才会重新渲染
  return <div>{props.name}</div>;
});
```

### shouldComponentUpdate

在类组件中，可以使用 `shouldComponentUpdate` 方法优化性能：

```jsx
class MyComponent extends React.Component {
  shouldComponentUpdate(nextProps, nextState) {
    // 只有当 props 或 state 改变时才重新渲染
    return (
      nextProps.name !== this.props.name ||
      nextState.count !== this.state.count
    );
  }
  
  render() {
    return <div>{this.props.name}</div>;
  }
}
```

### PureComponent

`React.PureComponent` 自动实现了 `shouldComponentUpdate` 方法，进行浅比较：

```jsx
class MyComponent extends React.PureComponent {
  render() {
    return <div>{this.props.name}</div>;
  }
}
```

### useMemo 和 useCallback

使用 `useMemo` 和 `useCallback` 避免不必要的计算和渲染：

```jsx
function MyComponent({ data, onItemClick }) {
  // 只有当 data 改变时才重新计算
  const processedData = useMemo(() => {
    return data.map(item => item.toUpperCase());
  }, [data]);
  
  // 只有当 onItemClick 改变时才创建新的回调函数
  const handleClick = useCallback((item) => {
    console.log('Item clicked:', item);
    onItemClick(item);
  }, [onItemClick]);
  
  return (
    <ul>
      {processedData.map(item => (
        <li key={item} onClick={() => handleClick(item)}>
          {item}
        </li>
      ))}
    </ul>
  );
}
```

## 组件样式

### 内联样式

```jsx
function MyComponent() {
  const style = {
    color: 'blue',
    fontSize: '16px',
    fontWeight: 'bold'
  };
  
  return <div style={style}>Styled Component</div>;
}
```

### CSS 类

```jsx
import './MyComponent.css';

function MyComponent() {
  return <div className="my-component">Styled Component</div>;
}
```

### CSS Modules

```jsx
import styles from './MyComponent.module.css';

function MyComponent() {
  return <div className={styles.container}>Styled Component</div>;
}
```

### Styled Components

```jsx
import styled from 'styled-components';

const Container = styled.div`
  color: blue;
  font-size: 16px;
  font-weight: bold;
`;

function MyComponent() {
  return <Container>Styled Component</Container>;
}
```

## 错误处理

### 错误边界

错误边界是一种 React 组件，可以捕获子组件树中的 JavaScript 错误：

```jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // 更新 state，下次渲染时显示备用 UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // 可以将错误日志上报给服务器
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // 渲染备用 UI
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

### try/catch

对于事件处理器中的错误，可以使用 try/catch：

```jsx
function MyComponent() {
  const handleClick = () => {
    try {
      // 可能会抛出错误的代码
      throw new Error('Something went wrong');
    } catch (error) {
      console.error('Error in click handler:', error);
    }
  };
  
  return <button onClick={handleClick}>Click Me</button>;
}
```

## 组件测试

### Jest 和 React Testing Library

```jsx
// Button.jsx
function Button({ onClick, children }) {
  return <button onClick={onClick}>{children}</button>;
}

// Button.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

test('renders button with correct text', () => {
  render(<Button>Click Me</Button>);
  const buttonElement = screen.getByText(/click me/i);
  expect(buttonElement).toBeInTheDocument();
});

test('calls onClick when clicked', () => {
  const handleClick = jest.fn();
  render(<Button onClick={handleClick}>Click Me</Button>);
  const buttonElement = screen.getByText(/click me/i);
  fireEvent.click(buttonElement);
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

## 最佳实践

1. **保持组件小而专注**：每个组件应该只做一件事。
2. **使用函数组件和 Hooks**：在大多数情况下，使用函数组件和 Hooks 比类组件更简洁。
3. **提取重复逻辑**：使用自定义 Hooks、高阶组件或 Render Props 提取重复逻辑。
4. **使用 PropTypes 或 TypeScript**：为组件添加类型检查。
5. **避免过度优化**：只在性能确实存在问题时才进行优化。
6. **使用不可变数据**：不要直接修改 props 或 state。
7. **使用 key 属性**：在渲染列表时，为每个元素提供唯一的 key。
8. **避免内联函数**：在渲染方法中避免创建内联函数，使用 useCallback 缓存函数。
9. **使用 Fragment**：避免添加不必要的 DOM 节点。
10. **编写测试**：为组件编写单元测试和集成测试。