# React 入门指南

## 什么是 React？

React 是一个用于构建用户界面的 JavaScript 库，由 Facebook 开发并维护。它允许开发者创建大型的 Web 应用，这些应用可以在不重新加载页面的情况下更新和渲染数据。

## 为什么选择 React？

- **组件化开发**：React 使用组件化的开发方式，使代码更加模块化和可复用。
- **虚拟 DOM**：React 使用虚拟 DOM 来提高性能，只更新需要更新的部分。
- **单向数据流**：React 采用单向数据流，使应用的状态管理更加可预测。
- **大型社区**：React 拥有庞大的社区支持和丰富的生态系统。

## 环境搭建

### 使用 Create React App

最简单的方式是使用官方脚手架工具 Create React App：

```bash
# 使用 npm
npm create react-app my-app

# 使用 yarn
yarn create react-app my-app

# 使用 pnpm
pnpm create react-app my-app

# 进入项目目录
cd my-app

# 启动开发服务器
npm start
```

### 使用 Vite

Vite 是一个更快的构建工具，也可以用来创建 React 项目：

```bash
# 使用 npm
npm create vite@latest my-app -- --template react

# 使用 yarn
yarn create vite my-app --template react

# 使用 pnpm
pnpm create vite my-app --template react

# 进入项目目录
cd my-app

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 第一个 React 组件

创建一个简单的 React 组件：

```jsx
// App.jsx
import React from 'react';

function App() {
  return (
    <div className="app">
      <h1>Hello, React!</h1>
      <p>Welcome to my first React application.</p>
    </div>
  );
}

export default App;
```

## JSX 语法

JSX 是 JavaScript 的语法扩展，允许在 JavaScript 中编写类似 HTML 的代码：

```jsx
// 基本 JSX 语法
const element = <h1>Hello, world!</h1>;

// 在 JSX 中使用 JavaScript 表达式
const name = 'React';
const element = <h1>Hello, {name}!</h1>;

// JSX 中的属性
const element = <img src={user.avatarUrl} alt="User Avatar" />;

// JSX 中的子元素
const element = (
  <div>
    <h1>Hello!</h1>
    <p>Welcome to React.</p>
  </div>
);
```

## 组件和 Props

React 组件可以接收参数，这些参数称为 Props：

```jsx
// 函数组件
function Welcome(props) {
  return <h1>Hello, {props.name}!</h1>;
}

// 使用组件
function App() {
  return (
    <div>
      <Welcome name="Alice" />
      <Welcome name="Bob" />
      <Welcome name="Charlie" />
    </div>
  );
}
```

## 状态和生命周期

使用类组件管理状态：

```jsx
import React, { Component } from 'react';

class Clock extends Component {
  constructor(props) {
    super(props);
    this.state = { date: new Date() };
  }

  componentDidMount() {
    this.timerID = setInterval(() => this.tick(), 1000);
  }

  componentWillUnmount() {
    clearInterval(this.timerID);
  }

  tick() {
    this.setState({ date: new Date() });
  }

  render() {
    return (
      <div>
        <h1>Hello, world!</h1>
        <h2>It is {this.state.date.toLocaleTimeString()}.</h2>
      </div>
    );
  }
}
```

## 使用 Hooks

Hooks 是 React 16.8 引入的新特性，允许在函数组件中使用状态和其他 React 特性：

```jsx
import React, { useState, useEffect } from 'react';

function Clock() {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const timerID = setInterval(() => tick(), 1000);
    return () => clearInterval(timerID); // 清理函数
  }, []); // 空依赖数组表示只在组件挂载和卸载时执行

  function tick() {
    setDate(new Date());
  }

  return (
    <div>
      <h1>Hello, world!</h1>
      <h2>It is {date.toLocaleTimeString()}.</h2>
    </div>
  );
}
```

## 事件处理

React 中的事件处理与 DOM 元素的事件处理类似：

```jsx
import React, { useState } from 'react';

function Toggle() {
  const [isToggleOn, setIsToggleOn] = useState(true);

  const handleClick = () => {
    setIsToggleOn(!isToggleOn);
  };

  return (
    <button onClick={handleClick}>
      {isToggleOn ? 'ON' : 'OFF'}
    </button>
  );
}
```

## 条件渲染

在 React 中可以根据条件渲染不同的组件：

```jsx
function UserGreeting(props) {
  return <h1>Welcome back!</h1>;
}

function GuestGreeting(props) {
  return <h1>Please sign up.</h1>;
}

function Greeting(props) {
  const isLoggedIn = props.isLoggedIn;
  if (isLoggedIn) {
    return <UserGreeting />;
  }
  return <GuestGreeting />;
}

// 使用三元运算符
function Greeting(props) {
  const isLoggedIn = props.isLoggedIn;
  return (
    <div>
      {isLoggedIn ? <UserGreeting /> : <GuestGreeting />}
    </div>
  );
}

// 使用逻辑与运算符
function Mailbox(props) {
  const unreadMessages = props.unreadMessages;
  return (
    <div>
      <h1>Hello!</h1>
      {unreadMessages.length > 0 &&
        <h2>You have {unreadMessages.length} unread messages.</h2>
      }
    </div>
  );
}
```

## 列表和 Keys

使用 `map()` 函数渲染列表：

```jsx
function NumberList(props) {
  const numbers = props.numbers;
  const listItems = numbers.map((number) =>
    <li key={number.toString()}>
      {number}
    </li>
  );
  return <ul>{listItems}</ul>;
}

const numbers = [1, 2, 3, 4, 5];
function App() {
  return <NumberList numbers={numbers} />;
}
```

## 表单处理

在 React 中处理表单：

```jsx
import React, { useState } from 'react';

function NameForm() {
  const [name, setName] = useState('');

  const handleChange = (event) => {
    setName(event.target.value);
  };

  const handleSubmit = (event) => {
    alert('A name was submitted: ' + name);
    event.preventDefault();
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Name:
        <input type="text" value={name} onChange={handleChange} />
      </label>
      <button type="submit">Submit</button>
    </form>
  );
}
```

## 组合与继承

React 推荐使用组合而非继承来复用组件之间的代码：

```jsx
function FancyBorder(props) {
  return (
    <div className={'FancyBorder FancyBorder-' + props.color}>
      {props.children}
    </div>
  );
}

function WelcomeDialog() {
  return (
    <FancyBorder color="blue">
      <h1 className="Dialog-title">Welcome</h1>
      <p className="Dialog-message">Thank you for visiting our spacecraft!</p>
    </FancyBorder>
  );
}
```

## 下一步学习

- React Router - 用于处理 React 应用中的路由
- Redux 或 Context API - 用于状态管理
- Styled Components 或 CSS Modules - 用于样式管理
- React Testing Library - 用于测试 React 组件