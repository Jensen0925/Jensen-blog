# React 设计模式

## 概述

设计模式是在特定场景下解决常见问题的可复用解决方案。本文介绍 React 中常用的设计模式及其最佳实践。

## 组件组合模式

### 1. 组合 vs 继承

React 推荐使用**组合**而非继承来实现组件复用。

```jsx
// ❌ 避免：继承
class Dialog extends React.Component {
  render() {
    return <div className="dialog">{/* ... */}</div>;
  }
}

class WelcomeDialog extends Dialog {
  render() {
    return (
      <div className="dialog welcome">
        {/* 难以复用和扩展 */}
      </div>
    );
  }
}

// ✅ 推荐：组合
function Dialog({ title, children }) {
  return (
    <div className="dialog">
      <h1>{title}</h1>
      <div className="content">{children}</div>
    </div>
  );
}

function WelcomeDialog() {
  return (
    <Dialog title="欢迎">
      <p>感谢访问我们的网站！</p>
    </Dialog>
  );
}
```

### 2. 包含（Containment）

使用 `children` prop 传递子组件：

```jsx
function FancyBorder({ color, children }) {
  return (
    <div className={`fancy-border fancy-border-${color}`}>
      {children}
    </div>
  );
}

function WelcomeDialog() {
  return (
    <FancyBorder color="blue">
      <h1>欢迎</h1>
      <p>感谢访问！</p>
    </FancyBorder>
  );
}
```

### 3. 特殊化（Specialization）

```jsx
// 通用对话框组件
function Dialog({ title, message }) {
  return (
    <div className="dialog">
      <h1>{title}</h1>
      <p>{message}</p>
    </div>
  );
}

// 特殊化：欢迎对话框
function WelcomeDialog() {
  return (
    <Dialog
      title="欢迎"
      message="感谢访问我们的网站！"
    />
  );
}
```

### 4. 插槽（Slots）

使用多个 props 传递不同部分的内容：

```jsx
function SplitPane({ left, right }) {
  return (
    <div className="split-pane">
      <div className="split-pane-left">
        {left}
      </div>
      <div className="split-pane-right">
        {right}
      </div>
    </div>
  );
}

function App() {
  return (
    <SplitPane
      left={<Contacts />}
      right={<Chat />}
    />
  );
}
```

## 高阶组件（HOC）

### 基本概念

高阶组件是一个**接收组件并返回新组件的函数**。

```jsx
// 基本结构
function withExample(WrappedComponent) {
  return function EnhancedComponent(props) {
    return <WrappedComponent {...props} />;
  };
}
```

### 1. 注入 Props

```jsx
// 注入用户信息
function withUser(Component) {
  return function WithUserComponent(props) {
    const user = useUser(); // 假设有这个 Hook
    
    return <Component {...props} user={user} />;
  };
}

// 使用
function UserProfile({ user }) {
  return <div>{user.name}</div>;
}

export default withUser(UserProfile);
```

### 2. 条件渲染

```jsx
// 需要认证才能访问
function withAuth(Component) {
  return function WithAuthComponent(props) {
    const { user, loading } = useAuth();
    
    if (loading) {
      return <LoadingSpinner />;
    }
    
    if (!user) {
      return <Navigate to="/login" />;
    }
    
    return <Component {...props} user={user} />;
  };
}

// 使用
const ProtectedDashboard = withAuth(Dashboard);
```

### 3. 生命周期劫持

```jsx
// 记录组件挂载和卸载
function withLifecycleLogging(Component) {
  return function WithLoggingComponent(props) {
    useEffect(() => {
      console.log(`${Component.name} 挂载`);
      
      return () => {
        console.log(`${Component.name} 卸载`);
      };
    }, []);
    
    return <Component {...props} />;
  };
}
```

### 4. 组合多个 HOC

```jsx
// 使用 compose 组合多个 HOC
function compose(...fns) {
  return fns.reduce((a, b) => (...args) => a(b(...args)));
}

const enhance = compose(
  withAuth,
  withUser,
  withLogging
);

const EnhancedComponent = enhance(MyComponent);
```

### HOC 最佳实践

```jsx
// ✅ 好的 HOC 实现
function withData(Component) {
  return function WithDataComponent(props) {
    const [data, setData] = useState(null);
    
    useEffect(() => {
      fetchData().then(setData);
    }, []);
    
    // 1. 传递所有 props
    // 2. 传递 ref
    return <Component {...props} data={data} />;
  };
}

// 给 HOC 设置 displayName，便于调试
withData.displayName = `withData(${Component.displayName || Component.name})`;

// ❌ 常见错误
function withData(Component) {
  // 不要在 render 中创建 HOC
  class Enhance extends React.Component {
    render() {
      const EnhancedComponent = withLogging(Component); // 错误！
      return <EnhancedComponent {...this.props} />;
    }
  }
  return Enhance;
}
```

## Render Props

### 基本概念

Render Prop 是一个**值为函数的 prop**，用于告诉组件渲染什么内容。

```jsx
// 基本结构
<DataProvider render={data => (
  <h1>Hello {data.target}</h1>
)}/>
```

### 1. 鼠标跟踪器示例

```jsx
class MouseTracker extends React.Component {
  state = { x: 0, y: 0 };
  
  handleMouseMove = (event) => {
    this.setState({
      x: event.clientX,
      y: event.clientY
    });
  };
  
  render() {
    return (
      <div onMouseMove={this.handleMouseMove}>
        {this.props.render(this.state)}
      </div>
    );
  }
}

// 使用
<MouseTracker render={({ x, y }) => (
  <h1>鼠标位置：({x}, {y})</h1>
)}/>
```

### 2. 使用 children 作为函数

```jsx
function DataProvider({ children }) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetchData().then(setData);
  }, []);
  
  return children(data);
}

// 使用
<DataProvider>
  {data => (
    data ? <div>{data.name}</div> : <Loading />
  )}
</DataProvider>
```

### 3. 实际应用：列表虚拟化

```jsx
function VirtualList({ items, itemHeight, height, children }) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.ceil((scrollTop + height) / itemHeight);
  
  const visibleItems = items.slice(startIndex, endIndex);
  
  return (
    <div
      style={{ height, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.target.scrollTop)}
    >
      <div style={{ height: items.length * itemHeight }}>
        <div style={{ transform: `translateY(${startIndex * itemHeight}px)` }}>
          {visibleItems.map((item, index) => (
            children({ item, index: startIndex + index })
          ))}
        </div>
      </div>
    </div>
  );
}

// 使用
<VirtualList
  items={bigList}
  itemHeight={50}
  height={600}
>
  {({ item, index }) => (
    <div key={index}>{item.name}</div>
  )}
</VirtualList>
```

## 复合组件模式（Compound Components）

### 基本概念

复合组件通过**隐式共享状态**来协同工作。

```jsx
// 经典例子：select 和 option
<select>
  <option value="1">选项 1</option>
  <option value="2">选项 2</option>
</select>
```

### 1. 使用 Context 实现

```jsx
const TabsContext = createContext();

function Tabs({ children, defaultValue }) {
  const [activeTab, setActiveTab] = useState(defaultValue);
  
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

function TabList({ children }) {
  return <div className="tab-list">{children}</div>;
}

function Tab({ value, children }) {
  const { activeTab, setActiveTab } = useContext(TabsContext);
  
  return (
    <button
      className={activeTab === value ? 'active' : ''}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
}

function TabPanels({ children }) {
  return <div className="tab-panels">{children}</div>;
}

function TabPanel({ value, children }) {
  const { activeTab } = useContext(TabsContext);
  
  if (value !== activeTab) return null;
  
  return <div className="tab-panel">{children}</div>;
}

// 组合使用
Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panels = TabPanels;
Tabs.Panel = TabPanel;

// 使用
<Tabs defaultValue="tab1">
  <Tabs.List>
    <Tabs.Tab value="tab1">标签 1</Tabs.Tab>
    <Tabs.Tab value="tab2">标签 2</Tabs.Tab>
  </Tabs.List>
  
  <Tabs.Panels>
    <Tabs.Panel value="tab1">内容 1</Tabs.Panel>
    <Tabs.Panel value="tab2">内容 2</Tabs.Panel>
  </Tabs.Panels>
</Tabs>
```

### 2. 实际应用：下拉菜单

```jsx
const DropdownContext = createContext();

function Dropdown({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const value = useMemo(
    () => ({ isOpen, setIsOpen }),
    [isOpen]
  );
  
  return (
    <DropdownContext.Provider value={value}>
      <div className="dropdown">{children}</div>
    </DropdownContext.Provider>
  );
}

function DropdownTrigger({ children }) {
  const { isOpen, setIsOpen } = useContext(DropdownContext);
  
  return (
    <button onClick={() => setIsOpen(!isOpen)}>
      {children}
    </button>
  );
}

function DropdownMenu({ children }) {
  const { isOpen } = useContext(DropdownContext);
  
  if (!isOpen) return null;
  
  return <div className="dropdown-menu">{children}</div>;
}

function DropdownItem({ children, onSelect }) {
  const { setIsOpen } = useContext(DropdownContext);
  
  return (
    <div
      className="dropdown-item"
      onClick={() => {
        onSelect?.();
        setIsOpen(false);
      }}
    >
      {children}
    </div>
  );
}

// 组合
Dropdown.Trigger = DropdownTrigger;
Dropdown.Menu = DropdownMenu;
Dropdown.Item = DropdownItem;

// 使用
<Dropdown>
  <Dropdown.Trigger>选择操作</Dropdown.Trigger>
  <Dropdown.Menu>
    <Dropdown.Item onSelect={() => console.log('编辑')}>
      编辑
    </Dropdown.Item>
    <Dropdown.Item onSelect={() => console.log('删除')}>
      删除
    </Dropdown.Item>
  </Dropdown.Menu>
</Dropdown>
```

## 控制反转（Control Props）

### 受控组件 vs 非受控组件

```jsx
// 非受控组件（组件自己管理状态）
function UncontrolledInput() {
  const [value, setValue] = useState('');
  
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}

// 受控组件（父组件控制状态）
function ControlledInput({ value, onChange }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
```

### 同时支持受控和非受控

```jsx
function Input({ value: controlledValue, onChange, defaultValue = '' }) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  
  // 判断是受控还是非受控
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;
  
  const handleChange = (e) => {
    const newValue = e.target.value;
    
    if (!isControlled) {
      setInternalValue(newValue);
    }
    
    onChange?.(newValue);
  };
  
  return <input value={value} onChange={handleChange} />;
}

// 受控使用
<Input value={value} onChange={setValue} />

// 非受控使用
<Input defaultValue="初始值" onChange={handleChange} />
```

## 状态提升（Lifting State Up）

### 基本概念

当多个组件需要共享状态时，将状态**提升到最近的共同父组件**。

```jsx
function TemperatureInput({ temperature, onTemperatureChange, scale }) {
  return (
    <fieldset>
      <legend>输入{scale === 'c' ? '摄氏' : '华氏'}温度：</legend>
      <input
        value={temperature}
        onChange={(e) => onTemperatureChange(e.target.value)}
      />
    </fieldset>
  );
}

function Calculator() {
  const [temperature, setTemperature] = useState('');
  const [scale, setScale] = useState('c');
  
  const celsius = scale === 'f'
    ? tryConvert(temperature, toCelsius)
    : temperature;
    
  const fahrenheit = scale === 'c'
    ? tryConvert(temperature, toFahrenheit)
    : temperature;
  
  return (
    <div>
      <TemperatureInput
        scale="c"
        temperature={celsius}
        onTemperatureChange={(temp) => {
          setTemperature(temp);
          setScale('c');
        }}
      />
      <TemperatureInput
        scale="f"
        temperature={fahrenheit}
        onTemperatureChange={(temp) => {
          setTemperature(temp);
          setScale('f');
        }}
      />
      <BoilingVerdict celsius={parseFloat(celsius)} />
    </div>
  );
}
```

## 容器组件 vs 展示组件

### 展示组件（Presentational Component）

```jsx
// 只负责 UI 展示，无状态逻辑
function UserCard({ user, onEdit, onDelete }) {
  return (
    <div className="user-card">
      <img src={user.avatar} alt={user.name} />
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      <button onClick={() => onEdit(user)}>编辑</button>
      <button onClick={() => onDelete(user.id)}>删除</button>
    </div>
  );
}
```

### 容器组件（Container Component）

```jsx
// 负责数据获取和状态管理
function UserCardContainer({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchUser(userId).then(user => {
      setUser(user);
      setLoading(false);
    });
  }, [userId]);
  
  const handleEdit = (user) => {
    // 编辑逻辑
  };
  
  const handleDelete = (id) => {
    // 删除逻辑
  };
  
  if (loading) return <Loading />;
  
  return (
    <UserCard
      user={user}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );
}
```

### 使用自定义 Hook 替代容器组件

```jsx
// 现代做法：使用自定义 Hook
function useUser(userId) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchUser(userId).then(user => {
      setUser(user);
      setLoading(false);
    });
  }, [userId]);
  
  const handleEdit = useCallback((user) => {
    // 编辑逻辑
  }, []);
  
  const handleDelete = useCallback((id) => {
    // 删除逻辑
  }, []);
  
  return { user, loading, handleEdit, handleDelete };
}

// 组件变得更简洁
function UserCardWithHook({ userId }) {
  const { user, loading, handleEdit, handleDelete } = useUser(userId);
  
  if (loading) return <Loading />;
  
  return (
    <UserCard
      user={user}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );
}
```

## Provider 模式

### 基本结构

```jsx
// 1. 创建 Context
const ThemeContext = createContext();

// 2. 创建 Provider 组件
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  
  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);
  
  const value = useMemo(
    () => ({ theme, toggleTheme }),
    [theme, toggleTheme]
  );
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// 3. 创建自定义 Hook
function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

// 4. 使用
function App() {
  return (
    <ThemeProvider>
      <Header />
      <Content />
    </ThemeProvider>
  );
}

function Header() {
  const { theme, toggleTheme } = useTheme();
  return (
    <header className={theme}>
      <button onClick={toggleTheme}>切换主题</button>
    </header>
  );
}
```

## 观察者模式（Observer Pattern）

### 事件发射器

```jsx
class EventEmitter {
  constructor() {
    this.events = {};
  }
  
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    
    // 返回取消订阅的函数
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    };
  }
  
  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data));
    }
  }
}

// 创建全局事件总线
export const eventBus = new EventEmitter();

// 使用
function ComponentA() {
  const handleClick = () => {
    eventBus.emit('user-logged-in', { userId: 123 });
  };
  
  return <button onClick={handleClick}>登录</button>;
}

function ComponentB() {
  useEffect(() => {
    const unsubscribe = eventBus.on('user-logged-in', (data) => {
      console.log('用户登录:', data.userId);
    });
    
    return unsubscribe;
  }, []);
  
  return <div>Component B</div>;
}
```

## 策略模式（Strategy Pattern）

### 动态选择渲染策略

```jsx
// 定义不同的策略
const strategies = {
  list: (items) => (
    <ul>
      {items.map(item => <li key={item.id}>{item.name}</li>)}
    </ul>
  ),
  
  grid: (items) => (
    <div className="grid">
      {items.map(item => (
        <div key={item.id} className="grid-item">{item.name}</div>
      ))}
    </div>
  ),
  
  table: (items) => (
    <table>
      <tbody>
        {items.map(item => (
          <tr key={item.id}>
            <td>{item.name}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
};

function DataDisplay({ items, viewType }) {
  const renderStrategy = strategies[viewType];
  
  return (
    <div>
      {renderStrategy(items)}
    </div>
  );
}

// 使用
<DataDisplay items={items} viewType="grid" />
```

## 工厂模式（Factory Pattern）

### 组件工厂

```jsx
// 根据类型创建不同的组件
function createFormField(type) {
  const components = {
    text: (props) => <input type="text" {...props} />,
    number: (props) => <input type="number" {...props} />,
    select: (props) => (
      <select {...props}>
        {props.options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    ),
    checkbox: (props) => <input type="checkbox" {...props} />,
  };
  
  return components[type] || components.text;
}

function DynamicForm({ fields }) {
  return (
    <form>
      {fields.map(field => {
        const FieldComponent = createFormField(field.type);
        return (
          <div key={field.name}>
            <label>{field.label}</label>
            <FieldComponent {...field} />
          </div>
        );
      })}
    </form>
  );
}

// 使用
<DynamicForm
  fields={[
    { name: 'name', type: 'text', label: '姓名' },
    { name: 'age', type: 'number', label: '年龄' },
    { name: 'gender', type: 'select', label: '性别', options: [...] }
  ]}
/>
```

## 最佳实践总结

### 1. 选择合适的模式

| 场景           | 推荐模式           |
| -------------- | ------------------ |
| 跨组件共享状态 | Context / Provider |
| 逻辑复用       | 自定义 Hooks       |
| 组件增强       | HOC                |
| 灵活的渲染控制 | Render Props       |
| 相关组件协作   | 复合组件           |
| UI 和逻辑分离  | 容器/展示组件      |

### 2. 模式组合

```jsx
// 组合多种模式
function EnhancedComponent() {
  // 自定义 Hook（逻辑复用）
  const { data, loading } = useData();
  
  // Context（状态共享）
  const theme = useTheme();
  
  // 复合组件（组件协作）
  return (
    <Card>
      <Card.Header>标题</Card.Header>
      <Card.Body>
        {loading ? <Loading /> : <Content data={data} />}
      </Card.Body>
    </Card>
  );
}
```

### 3. 避免过度设计

```jsx
// ❌ 过度设计
<SuperComplexAbstractFactory
  strategy={new RenderStrategy()}
  decorator={new HOCDecorator()}
  observer={new StateObserver()}
>
  <SimpleButton>点击</SimpleButton>
</SuperComplexAbstractFactory>

// ✅ 简单实用
<button onClick={handleClick}>点击</button>
```

## 总结

React 设计模式的核心原则：

1. **组合优于继承**
   - 使用 children 和 props
   - 灵活且可扩展

2. **逻辑复用**
   - 自定义 Hooks（首选）
   - HOC（遗留代码）
   - Render Props（特殊场景）

3. **关注点分离**
   - 容器/展示组件
   - 逻辑和 UI 分离

4. **状态管理**
   - Context + Provider
   - 状态提升
   - 控制反转

5. **灵活性**
   - 复合组件
   - 策略模式
   - 工厂模式

选择模式时考虑：
- 代码可读性
- 维护成本
- 团队习惯
- 具体场景

记住：**最简单能解决问题的方案就是最好的方案**。

## 相关阅读

- [自定义 Hooks 最佳实践](/react/custom-hooks)
- [Context 深入解析](/react/context)
- [组件开发](/react/components)
- [性能优化完全指南](/react/performance)

