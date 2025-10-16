# React 事件系统原理

## 概述

React 实现了一套自己的事件系统，称为**合成事件（SyntheticEvent）**。它不是简单地将事件处理函数绑定到 DOM 元素上，而是通过事件委托在根节点上统一处理所有事件。

## 为什么需要合成事件系统

### 浏览器兼容性

```javascript
// 原生事件的浏览器差异
if (e.stopPropagation) {
  e.stopPropagation(); // 标准浏览器
} else {
  e.cancelBubble = true; // IE
}

// React 合成事件统一接口
e.stopPropagation(); // 所有浏览器都一样
```

### 性能优化

```jsx
// 原生方式：每个元素都绑定事件
<ul>
  <li onClick={handler1}>Item 1</li>
  <li onClick={handler2}>Item 2</li>
  <li onClick={handler3}>Item 3</li>
  {/* 100 个 li = 100 个事件监听器 */}
</ul>

// React 方式：只在根节点绑定一次
// 所有点击事件都通过事件委托处理
```

### 跨平台支持

React 的事件系统是抽象层，可以适配不同平台：
- React DOM：浏览器事件
- React Native：原生移动事件
- React ART：Canvas 事件

## 合成事件的架构

### 事件委托

React 17 之前，所有事件委托到 `document`：

```javascript
// React 16 及之前
document.addEventListener('click', dispatchEvent);
document.addEventListener('change', dispatchEvent);
// ...
```

React 17 之后，事件委托到 React 根节点：

```javascript
// React 17+
const rootNode = document.getElementById('root');
rootNode.addEventListener('click', dispatchEvent);
rootNode.addEventListener('change', dispatchEvent);
```

### 为什么改变委托位置？

```jsx
// React 17+ 支持多个 React 应用共存
<div id="app1"></div>
<div id="app2"></div>

ReactDOM.render(<App1 />, document.getElementById('app1'));
ReactDOM.render(<App2 />, document.getElementById('app2'));

// 每个应用的事件互不干扰
```

## 事件注册流程

### 1. 事件插件系统

React 使用插件系统来处理不同类型的事件：

```javascript
// 事件插件
const SimpleEventPlugin = {
  // 事件名称映射
  eventTypes: {
    click: {
      phasedRegistrationNames: {
        bubbled: 'onClick',
        captured: 'onClickCapture',
      },
      dependencies: ['click'],
    },
    // ...其他事件
  },
  
  // 提取事件
  extractEvents(
    topLevelType,
    targetInst,
    nativeEvent,
    nativeEventTarget
  ) {
    const dispatchConfig = eventTypes[topLevelType];
    if (!dispatchConfig) return null;
    
    // 创建合成事件
    const event = SyntheticEvent.getPooled(
      dispatchConfig,
      targetInst,
      nativeEvent,
      nativeEventTarget
    );
    
    return event;
  },
};
```

### 2. 注册事件监听

```javascript
// 简化的事件注册流程
function listenToAllSupportedEvents(rootContainerElement) {
  // 注册所有支持的事件
  allNativeEvents.forEach(domEventName => {
    // 捕获阶段
    registerTwoPhaseEvent(
      domEventName + 'Capture',
      [domEventName],
      true // useCapture
    );
    
    // 冒泡阶段
    registerTwoPhaseEvent(
      domEventName,
      [domEventName],
      false
    );
  });
}

function registerTwoPhaseEvent(
  registrationName,
  dependencies,
  useCapture
) {
  dependencies.forEach(dependency => {
    addTrappedEventListener(
      rootContainerElement,
      dependency,
      useCapture
    );
  });
}

function addTrappedEventListener(
  targetContainer,
  domEventName,
  isCapturePhaseListener
) {
  const listener = createEventListenerWrapperWithPriority(
    targetContainer,
    domEventName,
    eventSystemFlags
  );
  
  targetContainer.addEventListener(
    domEventName,
    listener,
    isCapturePhaseListener
  );
}
```

## 合成事件对象

### SyntheticEvent 的结构

```javascript
class SyntheticEvent {
  constructor(
    dispatchConfig,
    targetInst,
    nativeEvent,
    nativeEventTarget
  ) {
    this.dispatchConfig = dispatchConfig;
    this._targetInst = targetInst;
    this.nativeEvent = nativeEvent;
    this.target = nativeEventTarget;
    this.currentTarget = null;
    
    // 从原生事件复制属性
    const Interface = this.constructor.Interface;
    for (const propName in Interface) {
      const normalize = Interface[propName];
      if (normalize) {
        this[propName] = normalize(nativeEvent);
      } else {
        this[propName] = nativeEvent[propName];
      }
    }
    
    // 默认未阻止
    this.isDefaultPrevented = () => false;
    this.isPropagationStopped = () => false;
  }
  
  preventDefault() {
    this.isDefaultPrevented = () => true;
    
    const event = this.nativeEvent;
    if (event.preventDefault) {
      event.preventDefault();
    } else {
      event.returnValue = false;
    }
  }
  
  stopPropagation() {
    this.isPropagationStopped = () => true;
    
    const event = this.nativeEvent;
    if (event.stopPropagation) {
      event.stopPropagation();
    } else {
      event.cancelBubble = true;
    }
  }
}

// 不同类型事件的接口
SyntheticEvent.Interface = {
  type: null,
  target: null,
  currentTarget: null,
  eventPhase: null,
  bubbles: null,
  cancelable: null,
  timeStamp: (event) => event.timeStamp || Date.now(),
  // ...
};

// 鼠标事件
class SyntheticMouseEvent extends SyntheticEvent {}
SyntheticMouseEvent.Interface = {
  ...SyntheticEvent.Interface,
  screenX: null,
  screenY: null,
  clientX: null,
  clientY: null,
  pageX: null,
  pageY: null,
  // ...
};

// 键盘事件
class SyntheticKeyboardEvent extends SyntheticEvent {}
SyntheticKeyboardEvent.Interface = {
  ...SyntheticEvent.Interface,
  key: null,
  code: null,
  location: null,
  ctrlKey: null,
  shiftKey: null,
  altKey: null,
  metaKey: null,
  // ...
};
```

### 事件池（React 16 及之前）

```javascript
// React 16 的事件池机制（已在 React 17 移除）
const EVENT_POOL_SIZE = 10;

class SyntheticEvent {
  static getPooled(/* ... */) {
    const EventConstructor = this;
    
    // 从池中获取
    if (EventConstructor.eventPool.length) {
      const instance = EventConstructor.eventPool.pop();
      EventConstructor.call(instance, /* ... */);
      return instance;
    }
    
    // 池中没有，创建新的
    return new EventConstructor(/* ... */);
  }
  
  destructor() {
    // 清空所有属性
    const EventConstructor = this.constructor;
    for (const propName in EventConstructor.Interface) {
      this[propName] = null;
    }
    
    // 放回池中
    if (EventConstructor.eventPool.length < EVENT_POOL_SIZE) {
      EventConstructor.eventPool.push(this);
    }
  }
}

// 使用示例（React 16）
function handleClick(e) {
  console.log(e.type); // 'click'
  
  setTimeout(() => {
    console.log(e.type); // null（事件已被回收）
  }, 0);
  
  // 如果需要异步访问，必须调用 persist
  e.persist();
  setTimeout(() => {
    console.log(e.type); // 'click'（事件未被回收）
  }, 0);
}
```

React 17 移除了事件池，因为：
- 现代浏览器性能足够好
- 事件池带来的性能提升不明显
- 容易造成 bug（忘记 persist）

## 事件分发流程

### 1. 原生事件触发

```javascript
// 用户点击 button
<div id="root">
  <div id="parent">
    <button id="child">Click me</button>
  </div>
</div>

// 原生事件流：
// 1. 捕获：document → root → parent → button
// 2. 冒泡：button → parent → root → document
```

### 2. 收集事件处理函数

```javascript
function dispatchEventsForPlugins(
  domEventName,
  eventSystemFlags,
  nativeEvent,
  targetInst,
  targetContainer
) {
  // 1. 获取事件目标对应的 Fiber 节点
  const nativeEventTarget = getEventTarget(nativeEvent);
  const targetFiber = getClosestInstanceFromNode(nativeEventTarget);
  
  // 2. 收集从目标到根的所有事件处理函数
  const dispatchQueue = [];
  
  // 提取事件（创建合成事件）
  extractEvents(
    dispatchQueue,
    domEventName,
    targetInst,
    nativeEvent,
    nativeEventTarget,
    eventSystemFlags,
    targetContainer
  );
  
  // 3. 执行事件处理函数
  processDispatchQueue(dispatchQueue, eventSystemFlags);
}

function extractEvents(
  dispatchQueue,
  domEventName,
  targetInst,
  nativeEvent,
  nativeEventTarget,
  eventSystemFlags,
  targetContainer
) {
  // 创建合成事件
  const syntheticEvent = createSyntheticEvent(
    domEventName,
    nativeEvent,
    nativeEventTarget
  );
  
  // 收集事件处理函数
  const listeners = accumulateSinglePhaseListeners(
    targetInst,
    domEventName,
    nativeEvent.type,
    inCapturePhase
  );
  
  if (listeners.length > 0) {
    dispatchQueue.push({
      event: syntheticEvent,
      listeners: listeners,
    });
  }
}
```

### 3. 收集两个阶段的监听器

```javascript
function accumulateSinglePhaseListeners(
  targetFiber,
  reactName,
  nativeEventType,
  inCapturePhase
) {
  const captureName = reactName + 'Capture';
  const reactEventName = inCapturePhase ? captureName : reactName;
  
  const listeners = [];
  let instance = targetFiber;
  
  // 从目标节点向上遍历到根节点
  while (instance !== null) {
    const { stateNode, tag } = instance;
    
    // 只处理 DOM 节点
    if (tag === HostComponent && stateNode !== null) {
      const listener = getListener(instance, reactEventName);
      
      if (listener != null) {
        listeners.push({
          instance,
          listener,
          currentTarget: stateNode,
        });
      }
    }
    
    instance = instance.return;
  }
  
  // 如果是捕获阶段，需要反转数组（从根到目标）
  if (inCapturePhase) {
    return listeners.reverse();
  }
  
  return listeners;
}

// 示例：
// <div onClick={divClick} onClickCapture={divClickCapture}>
//   <button onClick={btnClick} onClickCapture={btnClickCapture}>
//     Click
//   </button>
// </div>

// 点击 button 时收集到的监听器：
// 捕获阶段：[divClickCapture, btnClickCapture]
// 冒泡阶段：[btnClick, divClick]
```

### 4. 执行事件处理函数

```javascript
function processDispatchQueue(
  dispatchQueue,
  eventSystemFlags
) {
  const inCapturePhase = (eventSystemFlags & IS_CAPTURE_PHASE) !== 0;
  
  for (let i = 0; i < dispatchQueue.length; i++) {
    const { event, listeners } = dispatchQueue[i];
    
    processDispatchQueueItemsInOrder(
      event,
      listeners,
      inCapturePhase
    );
  }
}

function processDispatchQueueItemsInOrder(
  event,
  dispatchListeners,
  inCapturePhase
) {
  if (inCapturePhase) {
    // 捕获阶段：从根到目标
    for (let i = dispatchListeners.length - 1; i >= 0; i--) {
      const { listener, currentTarget } = dispatchListeners[i];
      
      if (event.isPropagationStopped()) {
        return;
      }
      
      executeDispatch(event, listener, currentTarget);
    }
  } else {
    // 冒泡阶段：从目标到根
    for (let i = 0; i < dispatchListeners.length; i++) {
      const { listener, currentTarget } = dispatchListeners[i];
      
      if (event.isPropagationStopped()) {
        return;
      }
      
      executeDispatch(event, listener, currentTarget);
    }
  }
}

function executeDispatch(event, listener, currentTarget) {
  event.currentTarget = currentTarget;
  
  try {
    listener(event);
  } catch (error) {
    // 错误处理
    reportGlobalError(error);
  }
  
  event.currentTarget = null;
}
```

## 事件优先级

### 离散事件 vs 连续事件

React 18 引入了事件优先级的概念：

```javascript
// 离散事件（Discrete Events）- 高优先级
// 用户交互，需要立即响应
const discreteEvents = [
  'click',
  'keydown',
  'keyup',
  'input',
  'change',
  'submit',
  // ...
];

// 连续事件（Continuous Events）- 普通优先级
// 持续触发的事件
const continuousEvents = [
  'scroll',
  'mousemove',
  'touchmove',
  'wheel',
  // ...
];

function getEventPriority(domEventName) {
  switch (domEventName) {
    case 'click':
    case 'keydown':
    case 'keyup':
      return DiscreteEventPriority; // 高优先级
      
    case 'scroll':
    case 'mousemove':
      return ContinuousEventPriority; // 普通优先级
      
    default:
      return DefaultEventPriority;
  }
}
```

### 优先级的应用

```javascript
function dispatchDiscreteEvent(
  domEventName,
  eventSystemFlags,
  container,
  nativeEvent
) {
  // 获取之前的优先级
  const previousPriority = getCurrentUpdatePriority();
  
  try {
    // 设置为离散事件优先级（高优先级）
    setCurrentUpdatePriority(DiscreteEventPriority);
    
    // 分发事件
    dispatchEvent(
      domEventName,
      eventSystemFlags,
      container,
      nativeEvent
    );
  } finally {
    // 恢复之前的优先级
    setCurrentUpdatePriority(previousPriority);
  }
}

// 使用示例
function App() {
  const [text, setText] = useState('');
  
  // 离散事件（input），高优先级，立即更新
  const handleChange = (e) => {
    setText(e.target.value);
  };
  
  return <input value={text} onChange={handleChange} />;
}
```

## 特殊事件处理

### onChange 事件

React 的 `onChange` 不同于原生的 `onchange`：

```javascript
// 原生 onchange：失焦时触发
<input onchange="handleChange()" />

// React onChange：每次输入都触发
<input onChange={handleChange} />

// React 内部实现
function extractEvents(/* ... */) {
  if (domEventName === 'input' || domEventName === 'change') {
    // input 和 change 都映射到 onChange
    return createChangeEvent(/* ... */);
  }
}
```

### onScroll 事件

scroll 事件不冒泡，React 需要特殊处理：

```javascript
function registerSimpleEvents() {
  registerDirectEvent('scroll', 'onScroll');
  // scroll 直接在目标元素上监听，不使用委托
}
```

### 表单事件

```jsx
function Form() {
  const handleSubmit = (e) => {
    // 阻止默认提交行为
    e.preventDefault();
    
    // 获取表单数据
    const formData = new FormData(e.target);
    console.log(Object.fromEntries(formData));
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input name="username" />
      <button type="submit">提交</button>
    </form>
  );
}
```

## React 事件 vs 原生事件

### 主要区别

```jsx
function Component() {
  useEffect(() => {
    const button = document.getElementById('btn');
    
    // 原生事件：直接绑定
    button.addEventListener('click', (e) => {
      console.log('原生事件');
    });
  }, []);
  
  // React 合成事件
  const handleClick = (e) => {
    console.log('React 事件');
    // e 是 SyntheticEvent，不是原生 Event
  };
  
  return <button id="btn" onClick={handleClick}>Click</button>;
}

// 执行顺序（React 17+）：
// 1. 原生事件（捕获）
// 2. 原生事件（目标）
// 3. 原生事件（冒泡）
// 4. React 事件（捕获）
// 5. React 事件（冒泡）
```

### 阻止事件传播的影响

```jsx
function App() {
  useEffect(() => {
    document.addEventListener('click', () => {
      console.log('document 原生事件');
    });
  }, []);
  
  const handleDivClick = (e) => {
    console.log('div React 事件');
    e.stopPropagation(); // 只阻止 React 事件冒泡
  };
  
  const handleButtonClick = (e) => {
    console.log('button React 事件');
  };
  
  return (
    <div onClick={handleDivClick}>
      <button onClick={handleButtonClick}>Click</button>
    </div>
  );
}

// 点击 button 输出：
// 1. "button React 事件"
// 2. "document 原生事件"（原生事件不受影响）
// 3. "div React 事件" 不会输出（被 stopPropagation 阻止）
```

### 同时使用原生和合成事件

```jsx
function Component() {
  const buttonRef = useRef();
  
  useEffect(() => {
    const button = buttonRef.current;
    
    const nativeHandler = (e) => {
      console.log('原生事件');
      e.stopImmediatePropagation(); // 阻止同一元素的其他监听器
    };
    
    button.addEventListener('click', nativeHandler);
    
    return () => {
      button.removeEventListener('click', nativeHandler);
    };
  }, []);
  
  const handleClick = (e) => {
    console.log('React 事件'); // 不会执行
  };
  
  return <button ref={buttonRef} onClick={handleClick}>Click</button>;
}
```

## 最佳实践

### 1. 不要混用原生事件和 React 事件

```jsx
// ❌ 避免
function Bad() {
  const divRef = useRef();
  
  useEffect(() => {
    divRef.current.addEventListener('click', handler);
  }, []);
  
  return <div ref={divRef} onClick={handler}>Click</div>;
}

// ✅ 推荐：统一使用 React 事件
function Good() {
  return <div onClick={handler}>Click</div>;
}
```

### 2. 事件处理函数的性能优化

```jsx
// ❌ 避免：每次渲染都创建新函数
function Bad({ id }) {
  return (
    <button onClick={() => handleClick(id)}>
      Click
    </button>
  );
}

// ✅ 推荐：使用 useCallback
function Good({ id }) {
  const handleClick = useCallback(() => {
    doSomething(id);
  }, [id]);
  
  return <button onClick={handleClick}>Click</button>;
}

// 或者使用 data 属性
function Better({ id }) {
  const handleClick = (e) => {
    const id = e.currentTarget.dataset.id;
    doSomething(id);
  };
  
  return <button data-id={id} onClick={handleClick}>Click</button>;
}
```

### 3. 阻止默认行为

```jsx
function Form() {
  const handleSubmit = (e) => {
    // ✅ React 中必须显式调用
    e.preventDefault();
    
    // ❌ React 中 return false 不起作用
    // return false;
  };
  
  return <form onSubmit={handleSubmit}>{/* ... */}</form>;
}
```

### 4. 事件委托模式

```jsx
// ✅ 利用 React 的事件委托
function List({ items }) {
  const handleClick = (e) => {
    const id = e.currentTarget.dataset.id;
    handleItemClick(id);
  };
  
  return (
    <ul>
      {items.map(item => (
        <li key={item.id} data-id={item.id} onClick={handleClick}>
          {item.name}
        </li>
      ))}
    </ul>
  );
}
```

## 总结

React 事件系统的核心特点：

1. **合成事件**
   - 跨浏览器兼容
   - 统一的事件接口
   - 性能优化

2. **事件委托**
   - React 17 之前委托到 document
   - React 17+ 委托到根容器
   - 减少内存占用

3. **事件优先级**
   - 离散事件（高优先级）
   - 连续事件（普通优先级）
   - 支持并发特性

4. **事件池（已废弃）**
   - React 16 及之前使用
   - React 17+ 已移除

理解 React 事件系统有助于：
- 正确处理事件冒泡和捕获
- 避免原生事件和合成事件混用的问题
- 优化事件处理性能
- 理解 React 的优先级机制

## 相关阅读

- [React Fiber 原理](/react/fiber)
- [React Scheduler](/react/scheduler)
- [性能优化完全指南](/react/performance)

