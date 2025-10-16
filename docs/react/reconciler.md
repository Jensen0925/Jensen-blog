# React Reconciler

## 什么是 Reconciler

Reconciler（协调器）是 React 的核心模块，负责：

- 调度更新任务
- 协调虚拟 DOM 和真实 DOM
- 管理组件的生命周期
- 处理副作用（Effects）

简单来说，**Reconciler 决定了"什么需要改变"**，而 Renderer（渲染器）负责**"如何改变"**。

## Reconciler 的架构

React 的架构分为三层：

```
┌─────────────────────────────────────┐
│         Scheduler（调度器）          │
│    负责调度任务的优先级和执行顺序      │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│       Reconciler（协调器）           │
│    负责找出变化的组件，构建 Fiber 树   │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│         Renderer（渲染器）           │
│    负责将变化渲染到具体的平台          │
│  (React DOM、React Native、etc.)    │
└─────────────────────────────────────┘
```

## Reconciler 的工作流程

### 1. 触发更新

更新可以由多种方式触发：

```jsx
// 1. 调用 setState
class App extends React.Component {
  handleClick = () => {
    this.setState({ count: this.state.count + 1 });
  }
}

// 2. 调用 useState 的 setter
function App() {
  const [count, setCount] = useState(0);
  const handleClick = () => setCount(count + 1);
}

// 3. 调用 forceUpdate
this.forceUpdate();

// 4. 调用 ReactDOM.render
ReactDOM.render(<App />, document.getElementById('root'));
```

### 2. 创建更新对象

当触发更新时，React 会创建一个 Update 对象：

```javascript
type Update<State> = {
  // 更新的优先级
  lane: Lane,
  
  // 更新的类型：替换、更新、捕获
  tag: UpdateState | ReplaceState | ForceUpdate | CaptureUpdate,
  
  // 更新的 payload
  payload: any,
  
  // 更新的回调函数
  callback: (() => mixed) | null,
  
  // 指向下一个更新
  next: Update<State> | null,
};
```

### 3. 将更新加入队列

```javascript
// Update 会被加入到 Fiber 节点的 updateQueue 中
type UpdateQueue<State> = {
  // 基础状态
  baseState: State,
  
  // 第一个 Update
  firstBaseUpdate: Update<State> | null,
  
  // 最后一个 Update
  lastBaseUpdate: Update<State> | null,
  
  // 共享的 pending 队列（环形链表）
  shared: {
    pending: Update<State> | null,
  },
  
  // 副作用列表
  effects: Array<Update<State>> | null,
};
```

### 4. 调度更新

```javascript
function scheduleUpdateOnFiber(fiber, lane, eventTime) {
  // 1. 从当前 Fiber 向上遍历到 root
  const root = markUpdateLaneFromFiberToRoot(fiber, lane);
  
  // 2. 标记 root 有待处理的更新
  markRootUpdated(root, lane, eventTime);
  
  // 3. 调度更新
  if (lane === SyncLane) {
    // 同步更新
    performSyncWorkOnRoot(root);
  } else {
    // 异步更新
    ensureRootIsScheduled(root, eventTime);
  }
}
```

## Reconciler 的两个阶段

### Render 阶段（可中断）

Render 阶段的主要工作是**构建新的 Fiber 树**和**标记副作用**。

#### beginWork

`beginWork` 负责处理每个 Fiber 节点，创建子 Fiber：

```javascript
function beginWork(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes
): Fiber | null {
  // 1. 尝试复用
  if (current !== null) {
    const oldProps = current.memoizedProps;
    const newProps = workInProgress.pendingProps;
    
    if (
      oldProps !== newProps ||
      hasLegacyContextChanged()
    ) {
      // Props 或 context 发生变化
      didReceiveUpdate = true;
    } else if (!includesSomeLane(renderLanes, updateLanes)) {
      // 没有更新，可以复用
      didReceiveUpdate = false;
      return bailoutOnAlreadyFinishedWork(
        current,
        workInProgress,
        renderLanes
      );
    }
  }
  
  // 2. 根据 tag 类型处理
  switch (workInProgress.tag) {
    case FunctionComponent: {
      return updateFunctionComponent(
        current,
        workInProgress,
        Component,
        resolvedProps,
        renderLanes
      );
    }
    case ClassComponent: {
      return updateClassComponent(
        current,
        workInProgress,
        Component,
        resolvedProps,
        renderLanes
      );
    }
    case HostRoot:
      return updateHostRoot(current, workInProgress, renderLanes);
    case HostComponent:
      return updateHostComponent(current, workInProgress, renderLanes);
    // ... 其他类型
  }
}
```

#### 处理函数组件

```javascript
function updateFunctionComponent(
  current,
  workInProgress,
  Component,
  nextProps,
  renderLanes
) {
  // 1. 准备上下文
  prepareToReadContext(workInProgress, renderLanes);
  
  // 2. 执行函数组件，获取子元素
  let nextChildren;
  if (__DEV__) {
    nextChildren = renderWithHooks(
      current,
      workInProgress,
      Component,
      nextProps,
      context,
      renderLanes
    );
  }
  
  // 3. 协调子元素
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  
  // 4. 返回子 Fiber
  return workInProgress.child;
}
```

#### 处理类组件

```javascript
function updateClassComponent(
  current,
  workInProgress,
  Component,
  nextProps,
  renderLanes
) {
  // 1. 实例化或获取实例
  const instance = workInProgress.stateNode;
  let shouldUpdate;
  
  if (instance === null) {
    // 首次渲染，构造实例
    constructClassInstance(workInProgress, Component, nextProps);
    mountClassInstance(workInProgress, Component, nextProps, renderLanes);
    shouldUpdate = true;
  } else if (current === null) {
    // 在挂起时重用了实例
    shouldUpdate = resumeMountClassInstance(
      workInProgress,
      Component,
      nextProps,
      renderLanes
    );
  } else {
    // 更新
    shouldUpdate = updateClassInstance(
      current,
      workInProgress,
      Component,
      nextProps,
      renderLanes
    );
  }
  
  // 2. 调用 render 方法
  const nextUnitOfWork = finishClassComponent(
    current,
    workInProgress,
    Component,
    shouldUpdate,
    hasContext,
    renderLanes
  );
  
  return nextUnitOfWork;
}
```

#### completeWork

`completeWork` 负责完成 Fiber 节点的处理，创建或更新 DOM：

```javascript
function completeWork(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes
): Fiber | null {
  const newProps = workInProgress.pendingProps;
  
  switch (workInProgress.tag) {
    case HostComponent: {
      // DOM 节点
      const type = workInProgress.type;
      
      if (current !== null && workInProgress.stateNode != null) {
        // 更新
        updateHostComponent(
          current,
          workInProgress,
          type,
          newProps,
          rootContainerInstance
        );
      } else {
        // 创建
        const instance = createInstance(
          type,
          newProps,
          rootContainerInstance,
          currentHostContext,
          workInProgress
        );
        
        // 将子节点添加到实例
        appendAllChildren(instance, workInProgress);
        
        // 保存实例
        workInProgress.stateNode = instance;
        
        // 设置属性
        if (
          finalizeInitialChildren(
            instance,
            type,
            newProps,
            rootContainerInstance,
            currentHostContext
          )
        ) {
          markUpdate(workInProgress);
        }
      }
      break;
    }
    case FunctionComponent:
    case ClassComponent:
      // 处理 context
      popContext(workInProgress);
      break;
    // ... 其他类型
  }
  
  return null;
}
```

### Commit 阶段（不可中断）

Commit 阶段的主要工作是**将变化应用到 DOM**和**执行副作用**。

Commit 阶段分为三个子阶段：

#### 1. Before Mutation（DOM 变更前）

执行 DOM 操作之前的准备工作：

```javascript
function commitBeforeMutationEffects(root, firstChild) {
  let fiber = firstChild;
  
  while (fiber !== null) {
    if (fiber.flags & Snapshot) {
      // 执行 getSnapshotBeforeUpdate
      commitBeforeMutationEffectOnFiber(fiber);
    }
    
    // 遍历子树
    if (fiber.child !== null) {
      fiber = fiber.child;
    } else {
      // 遍历兄弟节点
      while (fiber !== null) {
        if (fiber === firstChild) {
          return;
        }
        if (fiber.sibling !== null) {
          fiber = fiber.sibling;
          break;
        }
        fiber = fiber.return;
      }
    }
  }
}
```

#### 2. Mutation（DOM 变更）

执行 DOM 操作：

```javascript
function commitMutationEffects(root, firstChild) {
  let fiber = firstChild;
  
  while (fiber !== null) {
    const flags = fiber.flags;
    
    // 处理 ContentReset
    if (flags & ContentReset) {
      commitResetTextContent(fiber);
    }
    
    // 处理 Ref
    if (flags & Ref) {
      const current = fiber.alternate;
      if (current !== null) {
        commitDetachRef(current);
      }
    }
    
    // 处理 Placement、Update、Deletion
    const primaryFlags = flags & (Placement | Update | Deletion);
    switch (primaryFlags) {
      case Placement: {
        commitPlacement(fiber);
        // 清除 Placement 标记
        fiber.flags &= ~Placement;
        break;
      }
      case Update: {
        const current = fiber.alternate;
        commitWork(current, fiber);
        break;
      }
      case Deletion: {
        commitDeletion(root, fiber);
        break;
      }
    }
    
    fiber = fiber.sibling;
  }
}
```

#### 3. Layout（DOM 变更后）

执行 DOM 操作之后的工作：

```javascript
function commitLayoutEffects(root, committedLanes) {
  let fiber = root.current.child;
  
  while (fiber !== null) {
    const flags = fiber.flags;
    
    if (flags & (Update | Callback)) {
      // 执行生命周期方法
      switch (fiber.tag) {
        case FunctionComponent: {
          // 执行 useLayoutEffect
          commitHookEffectListMount(HookLayout, fiber);
          break;
        }
        case ClassComponent: {
          const instance = fiber.stateNode;
          if (flags & Update) {
            if (fiber.alternate === null) {
              // 首次渲染
              instance.componentDidMount();
            } else {
              // 更新
              const prevProps = fiber.alternate.memoizedProps;
              const prevState = fiber.alternate.memoizedState;
              instance.componentDidUpdate(
                prevProps,
                prevState,
                instance.__reactInternalSnapshotBeforeUpdate
              );
            }
          }
          break;
        }
        case HostRoot: {
          // 执行 render 的回调
          const updateQueue = fiber.updateQueue;
          if (updateQueue !== null) {
            commitUpdateQueue(fiber, updateQueue, instance);
          }
          break;
        }
      }
    }
    
    // 处理 Ref
    if (flags & Ref) {
      commitAttachRef(fiber);
    }
    
    fiber = fiber.sibling;
  }
}
```

## 副作用的处理

### 副作用标记

React 使用二进制标记来表示不同的副作用：

```javascript
// 副作用标记
const NoFlags = 0b000000000000000;
const PerformedWork = 0b000000000000001;
const Placement = 0b000000000000010;
const Update = 0b000000000000100;
const Deletion = 0b000000000001000;
const ChildDeletion = 0b000000000010000;
const ContentReset = 0b000000000100000;
const Callback = 0b000000001000000;
const Ref = 0b000000010000000;
const Snapshot = 0b000000100000000;
const Passive = 0b000001000000000;
const Hydrating = 0b000010000000000;
const HydratingAndUpdate = 0b000010000000100;

// 组合使用
fiber.flags |= Update | Callback;

// 检查是否有某个副作用
if (fiber.flags & Update) {
  // 有更新副作用
}
```

### 副作用链表

在 Render 阶段，React 会将有副作用的 Fiber 收集到一个链表中：

```javascript
// 收集副作用
function completeUnitOfWork(unitOfWork) {
  let completedWork = unitOfWork;
  
  do {
    const current = completedWork.alternate;
    const returnFiber = completedWork.return;
    
    // 完成当前节点的工作
    completeWork(current, completedWork, subtreeRenderLanes);
    
    // 收集副作用
    if (
      returnFiber !== null &&
      (returnFiber.flags & Incomplete) === NoFlags
    ) {
      // 将子节点的副作用链附加到父节点
      if (returnFiber.firstEffect === null) {
        returnFiber.firstEffect = completedWork.firstEffect;
      }
      if (completedWork.lastEffect !== null) {
        if (returnFiber.lastEffect !== null) {
          returnFiber.lastEffect.nextEffect = completedWork.firstEffect;
        }
        returnFiber.lastEffect = completedWork.lastEffect;
      }
      
      // 如果当前节点有副作用，添加到链表
      const flags = completedWork.flags;
      if (flags > PerformedWork) {
        if (returnFiber.lastEffect !== null) {
          returnFiber.lastEffect.nextEffect = completedWork;
        } else {
          returnFiber.firstEffect = completedWork;
        }
        returnFiber.lastEffect = completedWork;
      }
    }
    
    // 继续处理兄弟节点
    const siblingFiber = completedWork.sibling;
    if (siblingFiber !== null) {
      return siblingFiber;
    }
    
    // 返回父节点
    completedWork = returnFiber;
  } while (completedWork !== null);
}
```

## Hooks 的实现

Reconciler 负责管理 Hooks 的状态：

### Hook 的数据结构

```javascript
type Hook = {
  // 当前状态
  memoizedState: any,
  
  // 基础状态（用于计算派生状态）
  baseState: any,
  
  // 基础更新队列
  baseQueue: Update<any, any> | null,
  
  // 待处理的更新队列
  queue: UpdateQueue<any, any> | null,
  
  // 指向下一个 Hook
  next: Hook | null,
};
```

### useState 的实现

```javascript
function useState(initialState) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useState(initialState);
}

// 挂载时
function mountState(initialState) {
  // 创建 Hook 对象
  const hook = mountWorkInProgressHook();
  
  // 处理初始状态
  if (typeof initialState === 'function') {
    initialState = initialState();
  }
  hook.memoizedState = hook.baseState = initialState;
  
  // 创建更新队列
  const queue = (hook.queue = {
    pending: null,
    dispatch: null,
    lastRenderedReducer: basicStateReducer,
    lastRenderedState: initialState,
  });
  
  // 创建 dispatch 函数
  const dispatch = (queue.dispatch = dispatchAction.bind(
    null,
    currentlyRenderingFiber,
    queue
  ));
  
  return [hook.memoizedState, dispatch];
}

// 更新时
function updateState(initialState) {
  return updateReducer(basicStateReducer, initialState);
}

// 派发更新
function dispatchAction(fiber, queue, action) {
  // 1. 创建 update 对象
  const update = {
    lane,
    action,
    eagerReducer: null,
    eagerState: null,
    next: null,
  };
  
  // 2. 将 update 加入队列
  const pending = queue.pending;
  if (pending === null) {
    update.next = update;
  } else {
    update.next = pending.next;
    pending.next = update;
  }
  queue.pending = update;
  
  // 3. 调度更新
  scheduleUpdateOnFiber(fiber, lane, eventTime);
}
```

### useEffect 的实现

```javascript
function useEffect(create, deps) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useEffect(create, deps);
}

// 挂载时
function mountEffect(create, deps) {
  return mountEffectImpl(
    PassiveEffect | PassiveStaticEffect,
    HookPassive,
    create,
    deps
  );
}

function mountEffectImpl(fiberFlags, hookFlags, create, deps) {
  // 创建 Hook
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  
  // 标记副作用
  currentlyRenderingFiber.flags |= fiberFlags;
  
  // 创建 Effect 对象
  hook.memoizedState = pushEffect(
    HookHasEffect | hookFlags,
    create,
    undefined,
    nextDeps
  );
}

// 更新时
function updateEffect(create, deps) {
  return updateEffectImpl(PassiveEffect, HookPassive, create, deps);
}

function updateEffectImpl(fiberFlags, hookFlags, create, deps) {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  let destroy = undefined;
  
  if (currentHook !== null) {
    const prevEffect = currentHook.memoizedState;
    destroy = prevEffect.destroy;
    
    if (nextDeps !== null) {
      const prevDeps = prevEffect.deps;
      // 比较依赖
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        // 依赖未变化，不需要执行
        pushEffect(hookFlags, create, destroy, nextDeps);
        return;
      }
    }
  }
  
  // 依赖变化，需要执行
  currentlyRenderingFiber.flags |= fiberFlags;
  hook.memoizedState = pushEffect(
    HookHasEffect | hookFlags,
    create,
    destroy,
    nextDeps
  );
}
```

## 优先级和调度

### Lane 模型

React 18 使用 Lane 模型来表示优先级：

```javascript
// Lane 是一个 31 位的二进制数
type Lane = number;
type Lanes = number;

const NoLane = 0b0000000000000000000000000000000;
const SyncLane = 0b0000000000000000000000000000001;
const InputContinuousLane = 0b0000000000000000000000000000100;
const DefaultLane = 0b0000000000000000000000000010000;
const TransitionLane1 = 0b0000000000000000000000010000000;
const IdleLane = 0b0100000000000000000000000000000;

// Lane 操作
function mergeLanes(a: Lanes, b: Lanes): Lanes {
  return a | b;
}

function includesSomeLane(a: Lanes, b: Lanes): boolean {
  return (a & b) !== NoLanes;
}

function removeLanes(set: Lanes, subset: Lanes): Lanes {
  return set & ~subset;
}
```

### 批量更新

```javascript
// 批量更新上下文
let executionContext = NoContext;
const BatchedContext = 0b0001;

function batchedUpdates(fn, a) {
  const prevExecutionContext = executionContext;
  executionContext |= BatchedContext;
  
  try {
    return fn(a);
  } finally {
    executionContext = prevExecutionContext;
    
    // 如果不在其他上下文中，刷新同步工作
    if (executionContext === NoContext) {
      flushSyncCallbackQueue();
    }
  }
}
```

## 错误处理

### Error Boundaries

```javascript
function handleError(root, thrownValue) {
  // 寻找最近的错误边界
  let workInProgress = returnFiber;
  
  do {
    switch (workInProgress.tag) {
      case ClassComponent: {
        const instance = workInProgress.stateNode;
        const ctor = workInProgress.type;
        const errorInfo = createCapturedValue(thrownValue, sourceFiber);
        
        if (
          typeof ctor.getDerivedStateFromError === 'function' ||
          (typeof instance.componentDidCatch === 'function')
        ) {
          // 找到错误边界
          const update = createClassErrorUpdate(
            workInProgress,
            errorInfo,
            lane
          );
          
          enqueueUpdate(workInProgress, update);
          scheduleUpdateOnFiber(workInProgress, lane, eventTime);
          return;
        }
        break;
      }
    }
    
    workInProgress = workInProgress.return;
  } while (workInProgress !== null);
  
  // 没有找到错误边界，抛出到根节点
  throw thrownValue;
}
```

## 性能优化

### 1. bailout 机制

当组件的 props 和 state 都没有变化时，可以跳过更新：

```javascript
function bailoutOnAlreadyFinishedWork(
  current,
  workInProgress,
  renderLanes
) {
  // 检查子树是否有更新
  if (!includesSomeLane(renderLanes, workInProgress.childLanes)) {
    // 子树没有更新，完全跳过
    return null;
  } else {
    // 子树有更新，克隆子节点
    cloneChildFibers(current, workInProgress);
    return workInProgress.child;
  }
}
```

### 2. 优化列表渲染

```javascript
// 复用 Fiber 节点
function useFiber(fiber, pendingProps) {
  const clone = createWorkInProgress(fiber, pendingProps);
  clone.index = 0;
  clone.sibling = null;
  return clone;
}
```

## 总结

React Reconciler 是 React 的核心，它：

1. **协调虚拟 DOM 和真实 DOM**
   - 构建 Fiber 树
   - 标记副作用
   - 应用变更

2. **管理组件生命周期**
   - 挂载、更新、卸载
   - 执行生命周期方法

3. **处理副作用**
   - 收集副作用
   - 按阶段执行

4. **实现 Hooks**
   - 管理 Hook 状态
   - 处理更新队列

5. **优化性能**
   - bailout 机制
   - 复用 Fiber 节点
   - 批量更新

理解 Reconciler 有助于：
- 深入理解 React 的工作原理
- 优化应用性能
- 更好地使用 React 特性
- 调试复杂问题

## 相关阅读

- [React Fiber 原理](/react/fiber)
- [React Scheduler](/react/scheduler)
- [React Diff 算法](/react/diff-algorithm)
- [React Hooks](/react/hooks)

