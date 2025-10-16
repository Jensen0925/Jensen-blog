# Vue 3 编译器原理

Vue 3 的编译器负责将模板转换为渲染函数。相比 Vue 2，Vue 3 的编译器进行了完全重写，引入了更多优化策略。本文将深入解析 Vue 3 编译器的工作原理。

## 编译流程概览

```
模板字符串
    ↓
[1] 解析 (Parse)
    ↓
   AST
    ↓
[2] 转换 (Transform)
    ↓
JavaScript AST
    ↓
[3] 生成 (Generate)
    ↓
渲染函数代码
```

## 1. 解析阶段 (Parse)

将模板字符串解析为 AST（抽象语法树）。

### 示例

```vue
<template>
  <div id="app">
    <h1>{{ title }}</h1>
    <button @click="increment">Count: {{ count }}</button>
  </div>
</template>
```

### 生成的 AST

```javascript
{
  type: 'Element',
  tag: 'div',
  props: [
    { type: 'Attribute', name: 'id', value: { content: 'app' } }
  ],
  children: [
    {
      type: 'Element',
      tag: 'h1',
      children: [
        { type: 'Interpolation', content: { content: 'title' } }
      ]
    },
    {
      type: 'Element',
      tag: 'button',
      props: [
        { type: 'Directive', name: 'on', arg: 'click', exp: { content: 'increment' } }
      ],
      children: [
        { type: 'Text', content: 'Count: ' },
        { type: 'Interpolation', content: { content: 'count' } }
      ]
    }
  ]
}
```

### 解析器实现

```typescript
// 简化的解析器
function parse(template: string) {
  const context = createParserContext(template)
  return parseChildren(context, [])
}

function parseChildren(context, ancestors) {
  const nodes = []
  
  while (!isEnd(context, ancestors)) {
    let node
    
    if (context.source.startsWith('{{')) {
      // 解析插值
      node = parseInterpolation(context)
    } else if (context.source[0] === '<') {
      if (/[a-z]/i.test(context.source[1])) {
        // 解析元素
        node = parseElement(context, ancestors)
      }
    }
    
    if (!node) {
      // 解析文本
      node = parseText(context)
    }
    
    nodes.push(node)
  }
  
  return nodes
}

// 解析元素
function parseElement(context, ancestors) {
  // 解析开始标签
  const element = parseTag(context, TagType.Start)
  
  // 自闭合标签
  if (element.isSelfClosing || isVoidTag(element.tag)) {
    return element
  }
  
  // 递归解析子节点
  ancestors.push(element)
  element.children = parseChildren(context, ancestors)
  ancestors.pop()
  
  // 解析结束标签
  if (startsWithEndTagOpen(context.source, element.tag)) {
    parseTag(context, TagType.End)
  }
  
  return element
}

// 解析插值
function parseInterpolation(context) {
  const [open, close] = ['{{', '}}']
  const closeIndex = context.source.indexOf(close, open.length)
  
  advanceBy(context, open.length)
  const rawContentLength = closeIndex - open.length
  const rawContent = context.source.slice(0, rawContentLength)
  const content = parseTextData(context, rawContentLength)
  advanceBy(context, close.length)
  
  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content,
      isStatic: false
    }
  }
}
```

## 2. 转换阶段 (Transform)

对 AST 进行转换和优化，添加编译时信息。

### 静态提升 (Static Hoisting)

```vue
<template>
  <div>
    <p>Static text</p>
    <p>{{ dynamic }}</p>
  </div>
</template>
```

```javascript
// 转换后
const _hoisted_1 = /*#__PURE__*/ _createElementVNode("p", null, "Static text", -1)

export function render(_ctx) {
  return (_openBlock(), _createElementBlock("div", null, [
    _hoisted_1,  // 静态节点被提升
    _createElementVNode("p", null, _toDisplayString(_ctx.dynamic), 1)
  ]))
}
```

### 补丁标记 (PatchFlags)

```typescript
export const enum PatchFlags {
  TEXT = 1,               // 动态文本内容
  CLASS = 1 << 1,         // 动态 class
  STYLE = 1 << 2,         // 动态 style
  PROPS = 1 << 3,         // 动态属性（非 class/style）
  FULL_PROPS = 1 << 4,    // 有动态 key 的属性
  HYDRATE_EVENTS = 1 << 5, // 有事件监听器
  STABLE_FRAGMENT = 1 << 6, // children 顺序不会改变的 fragment
  KEYED_FRAGMENT = 1 << 7,  // 有 key 的 fragment
  UNKEYED_FRAGMENT = 1 << 8, // 无 key 的 fragment
  NEED_PATCH = 1 << 9,      // 需要 patch
  DYNAMIC_SLOTS = 1 << 10,   // 动态 slots
  HOISTED = -1,             // 静态节点
  BAIL = -2                 // 跳过优化
}
```

```vue
<template>
  <div :class="{ active: isActive }">{{ msg }}</div>
</template>
```

```javascript
// 转换后，添加了 PatchFlag
_createElementVNode("div", {
  class: _normalizeClass({ active: _ctx.isActive })
}, _toDisplayString(_ctx.msg), 3 /* TEXT, CLASS */)
```

### 块树优化 (Block Tree)

```typescript
// Block 的概念
export interface Block extends VNode {
  dynamicChildren: VNode[] | null
}

// 创建 Block
function createBlock(type, props, children, patchFlag) {
  const block = createVNode(type, props, children, patchFlag)
  
  // 收集动态子节点
  block.dynamicChildren = currentBlock ? currentBlock.slice() : null
  closeBlock()
  
  return block
}
```

```vue
<template>
  <div>
    <p>Static</p>
    <p>{{ dynamic }}</p>
    <comp :value="value" />
  </div>
</template>
```

```javascript
// 生成的渲染函数
export function render(_ctx) {
  return (_openBlock(), _createElementBlock("div", null, [
    _hoisted_1,
    _createElementVNode("p", null, _toDisplayString(_ctx.dynamic), 1 /* TEXT */),
    _createVNode(_component_comp, { value: _ctx.value }, null, 8 /* PROPS */, ["value"])
  ]))
}

// 只有标记为动态的节点会被收集到 block.dynamicChildren
// block.dynamicChildren = [p 元素, comp 组件]
```

### Transform 插件

```typescript
// 转换插件系统
export interface TransformContext {
  root: RootNode
  parent: ParentNode | null
  childIndex: number
  currentNode: RootNode | TemplateChildNode | null
  helpers: Map<symbol, number>
  helperNames: Set<string>
  // ...
}

// 转换 v-if
export const transformIf: NodeTransform = (node, context) => {
  if (
    node.type === NodeTypes.ELEMENT &&
    (node.props.some(p => p.name === 'if') ||
     node.props.some(p => p.name === 'else-if') ||
     node.props.some(p => p.name === 'else'))
  ) {
    return () => {
      // 创建条件表达式
      const { consequent, alternate } = processIf(node, context)
      
      node.codegenNode = createConditionalExpression(
        node.props.find(p => p.name === 'if').exp,
        consequent,
        alternate
      )
    }
  }
}

// 转换 v-for
export const transformFor: NodeTransform = (node, context) => {
  if (node.type === NodeTypes.ELEMENT) {
    const dir = findDir(node, 'for')
    if (!dir) return
    
    const { source, value, key, index } = parseForExpression(dir.exp)
    
    return () => {
      node.codegenNode = createForLoopExpression(
        source,
        value,
        key,
        index,
        node
      )
    }
  }
}
```

## 3. 生成阶段 (Generate)

将 JavaScript AST 转换为渲染函数代码字符串。

### 代码生成

```typescript
// 简化的代码生成器
function generate(ast, options = {}) {
  const context = createCodegenContext(ast, options)
  const { push, indent, deindent, newline } = context
  
  // 生成函数前导码
  genFunctionPreamble(ast, context)
  
  const functionName = `render`
  const args = ['_ctx', '_cache']
  
  push(`function ${functionName}(${args.join(', ')}) {`)
  indent()
  
  push(`return `)
  
  // 生成渲染函数体
  if (ast.codegenNode) {
    genNode(ast.codegenNode, context)
  } else {
    push(`null`)
  }
  
  deindent()
  push(`}`)
  
  return {
    ast,
    code: context.code
  }
}

// 生成节点代码
function genNode(node, context) {
  switch (node.type) {
    case NodeTypes.ELEMENT:
    case NodeTypes.IF:
    case NodeTypes.FOR:
      genNode(node.codegenNode, context)
      break
    case NodeTypes.TEXT:
      genText(node, context)
      break
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context)
      break
    case NodeTypes.VNODE_CALL:
      genVNodeCall(node, context)
      break
    // ...
  }
}
```

### 生成示例

```vue
<template>
  <div v-if="show">
    <p>{{ msg }}</p>
  </div>
</template>
```

```javascript
// 生成的代码
import { createElementVNode as _createElementVNode, toDisplayString as _toDisplayString, openBlock as _openBlock, createElementBlock as _createElementBlock, createCommentVNode as _createCommentVNode } from "vue"

export function render(_ctx, _cache) {
  return (_ctx.show)
    ? (_openBlock(), _createElementBlock("div", { key: 0 }, [
        _createElementVNode("p", null, _toDisplayString(_ctx.msg), 1 /* TEXT */)
      ]))
    : _createCommentVNode("v-if", true)
}
```

## 编译优化

### 1. 缓存事件处理器

```vue
<template>
  <button @click="onClick">Click</button>
</template>
```

```javascript
// 优化前
render() {
  return h('button', {
    onClick: this.onClick  // 每次都创建新的引用
  })
}

// 优化后
render(_ctx, _cache) {
  return h('button', {
    onClick: _cache[0] || (_cache[0] = (...args) => (_ctx.onClick && _ctx.onClick(...args)))
  })
}
```

### 2. 字符串化静态内容

```vue
<template>
  <div>
    <p>Line 1</p>
    <p>Line 2</p>
    <p>Line 3</p>
    <p>Line 4</p>
    <p>Line 5</p>
  </div>
</template>
```

```javascript
// 优化：连续的静态节点会被字符串化
const _hoisted_1 = /*#__PURE__*/ _createStaticVNode(
  "<p>Line 1</p><p>Line 2</p><p>Line 3</p><p>Line 4</p><p>Line 5</p>",
  5
)

export function render(_ctx) {
  return (_openBlock(), _createElementBlock("div", null, [
    _hoisted_1
  ]))
}
```

### 3. 预字符串化

对于大块的静态内容，直接使用 innerHTML。

```vue
<template>
  <div v-html="staticHTML"></div>
</template>
```

## 编译器选项

```typescript
export interface CompilerOptions {
  // 编译模式
  mode?: 'module' | 'function'
  
  // 源映射
  sourceMap?: boolean
  
  // 文件名
  filename?: string
  
  // 优化选项
  hoistStatic?: boolean          // 静态提升
  cacheHandlers?: boolean        // 缓存事件处理器
  prefixIdentifiers?: boolean    // 前缀标识符
  
  // 自定义指令和组件
  isCustomElement?: (tag: string) => boolean
  isNativeTag?: (tag: string) => boolean
  
  // 转换插件
  nodeTransforms?: NodeTransform[]
  directiveTransforms?: Record<string, DirectiveTransform>
  
  // 运行时助手
  ssrCssVars?: string
  bindingMetadata?: BindingMetadata
  
  // 错误处理
  onError?: (error: CompilerError) => void
  onWarn?: (warning: CompilerError) => void
}
```

## SFC 编译

单文件组件 (SFC) 的编译过程：

```vue
<!-- App.vue -->
<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>

<template>
  <button @click="count++">{{ count }}</button>
</template>

<style scoped>
button { color: red; }
</style>
```

### 编译流程

```typescript
// 1. 解析 SFC
const { descriptor } = parse(source, { filename: 'App.vue' })

// descriptor = {
//   script: { content: "import { ref } from 'vue'\nconst count = ref(0)" },
//   template: { content: "<button @click=\"count++\">{{ count }}</button>" },
//   styles: [{ content: "button { color: red; }", scoped: true }]
// }

// 2. 编译 script
const scriptResult = compileScript(descriptor, { id })

// 3. 编译 template
const templateResult = compileTemplate({
  source: descriptor.template.content,
  compilerOptions: { bindingMetadata: scriptResult.bindings }
})

// 4. 编译 style
const stylesResult = descriptor.styles.map(style => 
  compileStyle({
    source: style.content,
    scoped: style.scoped,
    id
  })
)

// 5. 组装最终代码
const output = `
${scriptResult.content}
${templateResult.code}
${stylesResult.map(s => s.code).join('\n')}
export default { render, ...script }
`
```

## 总结

Vue 3 编译器的核心改进：

1. **静态提升** - 提升静态节点，减少创建开销
2. **补丁标记** - 标记动态内容，精确更新
3. **块树优化** - 只追踪动态节点，跳过静态内容
4. **缓存事件处理器** - 避免重复创建函数
5. **字符串化静态内容** - 大块静态内容直接使用 innerHTML

这些优化使 Vue 3 的渲染性能相比 Vue 2 有了显著提升：
- 更新性能提升 1.3-2 倍
- SSR 性能提升 2-3 倍
- 内存占用减少约 54%

