# 前端插件

插件系统是前端工程化工具的核心扩展机制，不同的工具设计了不同的插件架构。理解各种插件的本质，有助于我们更好地使用和开发插件。本文将深入解析主流前端工具的插件机制。

## Vite 插件

### 插件的本质：函数

Vite 插件的本质是一个**返回插件配置对象的函数**。这种设计使得插件可以接收参数，更加灵活和可配置。

```javascript
// Vite 插件的基本结构
export default function myVitePlugin(options = {}) {
  return {
    name: 'my-vite-plugin', // 插件名称（必需）
    
    // 插件钩子
    configResolved(config) {
      // 解析 Vite 配置后调用
    },
    
    transformIndexHtml(html) {
      // 转换 index.html
      return html.replace(
        '<title>',
        `<title>${options.title || ''}`
      );
    },
    
    transform(code, id) {
      // 转换模块代码
      if (id.endsWith('.custom')) {
        return {
          code: transformedCode,
          map: null
        };
      }
    }
  };
}
```

### 完整的插件示例

```javascript
// vite-plugin-virtual-html.js
export default function virtualHtmlPlugin(options = {}) {
  const { pages = {} } = options;
  
  return {
    name: 'vite-plugin-virtual-html',
    
    // 配置解析完成后的钩子
    configResolved(resolvedConfig) {
      console.log('Vite config resolved:', resolvedConfig.mode);
    },
    
    // 配置开发服务器
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // 自定义服务器中间件
        if (req.url?.startsWith('/custom')) {
          res.end('Custom response');
          return;
        }
        next();
      });
    },
    
    // 解析模块 ID
    resolveId(id) {
      if (id.startsWith('virtual:')) {
        return id;
      }
    },
    
    // 加载虚拟模块
    load(id) {
      if (id.startsWith('virtual:page-')) {
        const pageName = id.replace('virtual:page-', '');
        return pages[pageName] || '';
      }
    },
    
    // 转换代码
    transform(code, id) {
      if (id.endsWith('.special.js')) {
        return {
          code: code.replace(/console\.log/g, 'console.info'),
          map: null
        };
      }
    },
    
    // 转换 HTML
    transformIndexHtml: {
      enforce: 'pre',
      transform(html, ctx) {
        return html.replace(
          '</head>',
          `<script>window.__MODE__='${options.mode}'</script></head>`
        );
      }
    },
    
    // 热更新
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.custom')) {
        server.ws.send({
          type: 'full-reload',
          path: '*'
        });
      }
    }
  };
}

// 使用插件
// vite.config.js
import { defineConfig } from 'vite';
import virtualHtml from './vite-plugin-virtual-html';

export default defineConfig({
  plugins: [
    virtualHtml({
      mode: 'production',
      pages: {
        home: '<div>Home Page</div>',
        about: '<div>About Page</div>'
      }
    })
  ]
});
```

### Vite 插件钩子顺序

```javascript
// 开发环境钩子执行顺序
export default function hooksOrderPlugin() {
  return {
    name: 'hooks-order',
    
    // 1. config - 修改 Vite 配置
    config(config, env) {
      console.log('1. config');
      return {
        // 返回要合并的配置
      };
    },
    
    // 2. configResolved - 配置解析完成
    configResolved(resolvedConfig) {
      console.log('2. configResolved');
    },
    
    // 3. configureServer - 配置开发服务器
    configureServer(server) {
      console.log('3. configureServer');
    },
    
    // 4. transformIndexHtml - 转换 HTML
    transformIndexHtml(html) {
      console.log('4. transformIndexHtml');
      return html;
    },
    
    // 5. resolveId - 解析模块 ID
    resolveId(source, importer) {
      console.log('5. resolveId:', source);
    },
    
    // 6. load - 加载模块
    load(id) {
      console.log('6. load:', id);
    },
    
    // 7. transform - 转换模块
    transform(code, id) {
      console.log('7. transform:', id);
    }
  };
}
```

### Vite 插件与 Rollup 插件的兼容性

Vite 插件扩展自 Rollup 插件接口，大多数 Rollup 插件可以直接作为 Vite 插件使用。

```javascript
// 同时兼容 Vite 和 Rollup 的插件
export default function universalPlugin(options = {}) {
  return {
    name: 'universal-plugin',
    
    // Rollup 通用钩子
    buildStart() {
      console.log('Build started');
    },
    
    resolveId(source) {
      if (source === 'virtual-module') {
        return source;
      }
    },
    
    load(id) {
      if (id === 'virtual-module') {
        return 'export default "virtual"';
      }
    },
    
    transform(code, id) {
      return code;
    },
    
    buildEnd() {
      console.log('Build ended');
    },
    
    // Vite 特有钩子
    configureServer(server) {
      // 仅在 Vite 中有效
    },
    
    handleHotUpdate(ctx) {
      // 仅在 Vite 中有效
    }
  };
}
```

## Webpack 插件

### 插件的本质：对象

Webpack 插件的本质是一个**包含 `apply` 方法的对象**（通常是类的实例）。`apply` 方法接收 `compiler` 对象作为参数，通过 Tapable 钩子系统来介入 Webpack 的编译过程。

```javascript
// Webpack 插件的基本结构
class MyWebpackPlugin {
  constructor(options = {}) {
    this.options = options;
  }
  
  // apply 方法是必需的
  apply(compiler) {
    const pluginName = 'MyWebpackPlugin';
    
    // 通过 compiler.hooks 访问各种钩子
    compiler.hooks.emit.tapAsync(
      pluginName,
      (compilation, callback) => {
        console.log('Webpack 构建过程已开始！');
        
        // 处理编译资源
        compilation.assets['custom-file.txt'] = {
          source: () => 'Custom content',
          size: () => 14
        };
        
        callback();
      }
    );
  }
}

module.exports = MyWebpackPlugin;
```

### Tapable 钩子系统

Webpack 使用 Tapable 库来实现钩子系统，有三种注册方式：

```javascript
class ComprehensiveWebpackPlugin {
  apply(compiler) {
    const pluginName = 'ComprehensiveWebpackPlugin';
    
    // 1. 同步钩子 - tap
    compiler.hooks.compile.tap(pluginName, (params) => {
      console.log('开始编译...');
    });
    
    // 2. 异步钩子 - tapAsync（回调风格）
    compiler.hooks.emit.tapAsync(
      pluginName,
      (compilation, callback) => {
        setTimeout(() => {
          console.log('异步处理完成（回调风格）');
          callback();
        }, 1000);
      }
    );
    
    // 3. 异步钩子 - tapPromise（Promise 风格）
    compiler.hooks.afterEmit.tapPromise(
      pluginName,
      (compilation) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            console.log('异步处理完成（Promise 风格）');
            resolve();
          }, 1000);
        });
      }
    );
  }
}
```

### 完整的 Webpack 插件示例

```javascript
// FileListPlugin.js - 生成文件列表的插件
class FileListPlugin {
  constructor(options = {}) {
    this.options = {
      filename: 'filelist.md',
      ...options
    };
  }
  
  apply(compiler) {
    const pluginName = FileListPlugin.name;
    
    // 使用 webpack 模块
    const { webpack } = compiler;
    const { Compilation } = webpack;
    const { RawSource } = webpack.sources;
    
    // 在 compilation 钩子中注册
    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
      // 在处理资源的额外步骤中添加钩子
      compilation.hooks.processAssets.tap(
        {
          name: pluginName,
          stage: Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE,
        },
        (assets) => {
          // 获取所有文件列表
          const fileList = Object.keys(assets)
            .map(filename => `- ${filename}`)
            .join('\n');
          
          // 创建文件内容
          const content = `# 构建文件列表\n\n生成时间: ${new Date().toLocaleString()}\n\n${fileList}`;
          
          // 添加新的资源文件
          compilation.emitAsset(
            this.options.filename,
            new RawSource(content)
          );
        }
      );
    });
    
    // 编译完成后的钩子
    compiler.hooks.done.tap(pluginName, (stats) => {
      console.log('构建完成！');
      console.log(`生成了 ${Object.keys(stats.compilation.assets).length} 个文件`);
    });
  }
}

module.exports = FileListPlugin;

// 使用插件
// webpack.config.js
const FileListPlugin = require('./FileListPlugin');

module.exports = {
  // ...
  plugins: [
    new FileListPlugin({
      filename: 'assets-list.md'
    })
  ]
};
```

### Webpack 主要钩子

```javascript
class WebpackHooksExamplePlugin {
  apply(compiler) {
    // Compiler 钩子
    
    // 1. environment - 准备环境（同步）
    compiler.hooks.environment.tap('Plugin', () => {
      console.log('1. environment');
    });
    
    // 2. afterEnvironment - 环境准备完成（同步）
    compiler.hooks.afterEnvironment.tap('Plugin', () => {
      console.log('2. afterEnvironment');
    });
    
    // 3. entryOption - 处理 entry 配置（同步）
    compiler.hooks.entryOption.tap('Plugin', (context, entry) => {
      console.log('3. entryOption');
    });
    
    // 4. afterPlugins - 插件初始化完成（同步）
    compiler.hooks.afterPlugins.tap('Plugin', (compiler) => {
      console.log('4. afterPlugins');
    });
    
    // 5. afterResolvers - resolvers 设置完成（同步）
    compiler.hooks.afterResolvers.tap('Plugin', (compiler) => {
      console.log('5. afterResolvers');
    });
    
    // 6. beforeRun - 开始构建前（异步）
    compiler.hooks.beforeRun.tapAsync('Plugin', (compiler, callback) => {
      console.log('6. beforeRun');
      callback();
    });
    
    // 7. run - 开始编译（异步）
    compiler.hooks.run.tapAsync('Plugin', (compiler, callback) => {
      console.log('7. run');
      callback();
    });
    
    // 8. beforeCompile - 编译参数准备完成（异步）
    compiler.hooks.beforeCompile.tapAsync('Plugin', (params, callback) => {
      console.log('8. beforeCompile');
      callback();
    });
    
    // 9. compile - 开始创建 compilation（同步）
    compiler.hooks.compile.tap('Plugin', (params) => {
      console.log('9. compile');
    });
    
    // 10. thisCompilation - 初始化 compilation（同步）
    compiler.hooks.thisCompilation.tap('Plugin', (compilation, params) => {
      console.log('10. thisCompilation');
      
      // Compilation 钩子
      compilation.hooks.buildModule.tap('Plugin', (module) => {
        console.log('  - buildModule');
      });
      
      compilation.hooks.seal.tap('Plugin', () => {
        console.log('  - seal（封闭编译）');
      });
      
      compilation.hooks.optimize.tap('Plugin', () => {
        console.log('  - optimize');
      });
    });
    
    // 11. make - 完成编译（异步）
    compiler.hooks.make.tapAsync('Plugin', (compilation, callback) => {
      console.log('11. make');
      callback();
    });
    
    // 12. afterCompile - 编译完成（异步）
    compiler.hooks.afterCompile.tapAsync('Plugin', (compilation, callback) => {
      console.log('12. afterCompile');
      callback();
    });
    
    // 13. emit - 输出资源到目录前（异步）
    compiler.hooks.emit.tapAsync('Plugin', (compilation, callback) => {
      console.log('13. emit');
      callback();
    });
    
    // 14. afterEmit - 输出资源到目录后（异步）
    compiler.hooks.afterEmit.tapAsync('Plugin', (compilation, callback) => {
      console.log('14. afterEmit');
      callback();
    });
    
    // 15. done - 完成编译（同步）
    compiler.hooks.done.tap('Plugin', (stats) => {
      console.log('15. done');
    });
    
    // 16. failed - 编译失败（同步）
    compiler.hooks.failed.tap('Plugin', (error) => {
      console.log('16. failed');
    });
  }
}
```

### 修改输出文件的插件

```javascript
// BannerPlugin - 为文件添加头部注释
class CustomBannerPlugin {
  constructor(options = {}) {
    this.banner = options.banner || '/*! Custom Banner */';
    this.test = options.test || /\.js$/;
  }
  
  apply(compiler) {
    const pluginName = CustomBannerPlugin.name;
    
    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: pluginName,
          stage: compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        (assets) => {
          // 遍历所有资源
          for (const assetName in assets) {
            if (this.test.test(assetName)) {
              const asset = assets[assetName];
              const source = asset.source();
              
              // 添加 banner
              const newSource = this.banner + '\n' + source;
              
              // 更新资源
              compilation.updateAsset(
                assetName,
                new compiler.webpack.sources.RawSource(newSource)
              );
            }
          }
        }
      );
    });
  }
}

module.exports = CustomBannerPlugin;
```

## Rollup 插件

### 插件的本质：对象

Rollup 插件的本质是一个**包含特定钩子函数的对象**。与 Webpack 不同，Rollup 插件直接导出对象，而不需要类或 apply 方法。

```javascript
// Rollup 插件的基本结构
export default function myRollupPlugin(options = {}) {
  return {
    name: 'my-rollup-plugin', // 插件名称（必需）
    
    // 构建钩子
    buildStart(options) {
      console.log('开始构建...');
    },
    
    resolveId(source, importer) {
      // 解析模块 ID
      if (source === 'virtual-module') {
        return source;
      }
      return null;
    },
    
    load(id) {
      // 加载模块
      if (id === 'virtual-module') {
        return 'export default "virtual content"';
      }
      return null;
    },
    
    transform(code, id) {
      // 转换代码
      if (id.endsWith('.custom')) {
        return {
          code: transformedCode,
          map: null
        };
      }
      return null;
    },
    
    buildEnd(error) {
      console.log('构建结束');
    }
  };
}
```

### 完整的 Rollup 插件示例

```javascript
// rollup-plugin-json-enhanced.js
import { createFilter } from '@rollup/pluginutils';

export default function jsonEnhanced(options = {}) {
  const filter = createFilter(
    options.include || '**/*.json',
    options.exclude
  );
  
  const { indent = '  ' } = options;
  
  return {
    name: 'json-enhanced',
    
    // 转换 JSON 文件
    transform(code, id) {
      if (!filter(id)) return null;
      if (!id.endsWith('.json')) return null;
      
      try {
        const parsed = JSON.parse(code);
        
        // 为每个 JSON 对象添加元数据
        const enhanced = {
          _meta: {
            filename: id.split('/').pop(),
            loaded: new Date().toISOString()
          },
          data: parsed
        };
        
        return {
          code: `export default ${JSON.stringify(enhanced, null, indent)}`,
          map: { mappings: '' }
        };
      } catch (err) {
        const message = '无法解析 JSON 文件';
        this.error(message, err.idx);
        return null;
      }
    }
  };
}

// 使用插件
// rollup.config.js
import jsonEnhanced from './rollup-plugin-json-enhanced';

export default {
  input: 'src/main.js',
  output: {
    file: 'dist/bundle.js',
    format: 'es'
  },
  plugins: [
    jsonEnhanced({
      indent: '  '
    })
  ]
};
```

### Rollup 插件钩子

```javascript
// 展示所有主要钩子的插件
export default function hooksPlugin() {
  return {
    name: 'hooks-plugin',
    
    // ===== 构建钩子（Build Hooks）=====
    
    // 1. options - 替换或操作传给 rollup 的选项对象
    options(inputOptions) {
      console.log('1. options');
      return inputOptions;
    },
    
    // 2. buildStart - 每次开始构建时调用
    buildStart(options) {
      console.log('2. buildStart');
    },
    
    // 3. resolveId - 解析模块 ID
    resolveId(source, importer, options) {
      console.log('3. resolveId:', source);
      return null; // 返回 null 让其他插件处理
    },
    
    // 4. load - 加载模块
    load(id) {
      console.log('4. load:', id);
      return null;
    },
    
    // 5. transform - 转换单个模块
    transform(code, id) {
      console.log('5. transform:', id);
      return null;
    },
    
    // 6. moduleParsed - 模块解析完成
    moduleParsed(moduleInfo) {
      console.log('6. moduleParsed:', moduleInfo.id);
    },
    
    // 7. buildEnd - 构建阶段结束
    buildEnd(error) {
      console.log('7. buildEnd');
    },
    
    // ===== 输出生成钩子（Output Generation Hooks）=====
    
    // 8. outputOptions - 替换或操作输出选项
    outputOptions(outputOptions) {
      console.log('8. outputOptions');
      return outputOptions;
    },
    
    // 9. renderStart - 开始生成输出
    renderStart(outputOptions, inputOptions) {
      console.log('9. renderStart');
    },
    
    // 10. banner/footer/intro/outro - 添加代码到 bundle
    banner() {
      console.log('10. banner');
      return '/* My Banner */';
    },
    
    // 11. renderChunk - 转换单个 chunk
    renderChunk(code, chunk, options) {
      console.log('11. renderChunk:', chunk.fileName);
      return null;
    },
    
    // 12. augmentChunkHash - 增强 chunk 的 hash
    augmentChunkHash(chunkInfo) {
      console.log('12. augmentChunkHash');
      return '';
    },
    
    // 13. generateBundle - 生成 bundle 后，写入前
    generateBundle(options, bundle, isWrite) {
      console.log('13. generateBundle');
    },
    
    // 14. writeBundle - bundle 写入磁盘后
    writeBundle(options, bundle) {
      console.log('14. writeBundle');
    },
    
    // 15. renderError - 渲染错误时
    renderError(error) {
      console.log('15. renderError');
    },
    
    // 16. closeBundle - 关闭 bundle
    closeBundle() {
      console.log('16. closeBundle');
    }
  };
}
```

### 虚拟模块插件

```javascript
// rollup-plugin-virtual.js
export default function virtual(modules) {
  const resolvedIds = new Map();
  
  // 规范化模块 ID
  Object.keys(modules).forEach(id => {
    resolvedIds.set(id, modules[id]);
  });
  
  return {
    name: 'virtual',
    
    resolveId(id, importer) {
      if (resolvedIds.has(id)) {
        return id;
      }
    },
    
    load(id) {
      if (resolvedIds.has(id)) {
        return resolvedIds.get(id);
      }
    }
  };
}

// 使用
import virtual from './rollup-plugin-virtual';

export default {
  plugins: [
    virtual({
      'my-virtual-module': 'export default { version: "1.0.0" }',
      'config': `
        export const API_URL = "${process.env.API_URL}";
        export const DEBUG = ${process.env.NODE_ENV === 'development'};
      `
    })
  ]
};

// 在代码中使用虚拟模块
import config from 'my-virtual-module';
console.log(config.version); // 1.0.0
```

## Babel 插件

### 插件的本质：函数返回对象

Babel 插件是一个**返回包含 visitor 对象的函数**。visitor 对象包含各种 AST 节点类型的访问方法，用于转换抽象语法树（AST）。

```javascript
// Babel 插件的基本结构
module.exports = function(babel) {
  const { types: t } = babel;
  
  return {
    name: 'my-babel-plugin',
    visitor: {
      // 访问标识符节点
      Identifier(path) {
        console.log('Found identifier:', path.node.name);
      },
      
      // 访问函数声明节点
      FunctionDeclaration(path) {
        console.log('Found function:', path.node.id.name);
      }
    }
  };
};
```

### 完整的 Babel 插件示例

```javascript
// babel-plugin-transform-remove-console.js
module.exports = function({ types: t }) {
  return {
    name: 'transform-remove-console',
    visitor: {
      // 访问调用表达式
      CallExpression(path, state) {
        const { callee } = path.node;
        
        // 检查是否是 console 调用
        if (t.isMemberExpression(callee)) {
          const { object, property } = callee;
          
          // console.* 方法
          if (
            t.isIdentifier(object, { name: 'console' }) &&
            t.isIdentifier(property)
          ) {
            // 获取插件选项
            const { exclude = [] } = state.opts;
            const methodName = property.name;
            
            // 检查是否在排除列表中
            if (!exclude.includes(methodName)) {
              // 移除 console 语句
              path.remove();
            }
          }
        }
      }
    }
  };
};

// .babelrc
{
  "plugins": [
    ["./babel-plugin-transform-remove-console", {
      "exclude": ["error", "warn"]
    }]
  ]
}
```

### AST 转换示例

```javascript
// babel-plugin-auto-import.js
// 自动导入常用函数
module.exports = function({ types: t }) {
  return {
    name: 'auto-import',
    visitor: {
      Program: {
        enter(path, state) {
          const { imports = {} } = state.opts;
          
          // 记录需要导入的标识符
          const usedImports = new Set();
          
          // 遍历程序中的所有标识符
          path.traverse({
            Identifier(idPath) {
              const name = idPath.node.name;
              
              // 检查是否是我们要自动导入的
              if (imports[name] && !idPath.scope.hasBinding(name)) {
                usedImports.add(name);
              }
            }
          });
          
          // 在顶部添加 import 语句
          usedImports.forEach(name => {
            const importDeclaration = t.importDeclaration(
              [t.importSpecifier(t.identifier(name), t.identifier(name))],
              t.stringLiteral(imports[name])
            );
            
            path.unshiftContainer('body', importDeclaration);
          });
        }
      }
    }
  };
};

// 使用
// .babelrc
{
  "plugins": [
    ["./babel-plugin-auto-import", {
      "imports": {
        "useState": "react",
        "useEffect": "react",
        "ref": "vue",
        "reactive": "vue"
      }
    }]
  ]
}

// 源代码
const [count, setCount] = useState(0);

// 转换后自动添加 import
import { useState } from 'react';
const [count, setCount] = useState(0);
```

### 代码优化插件

```javascript
// babel-plugin-optimize-literals.js
// 优化字面量
module.exports = function({ types: t }) {
  return {
    name: 'optimize-literals',
    visitor: {
      // 合并字符串连接
      BinaryExpression(path) {
        const { left, right, operator } = path.node;
        
        // 如果是字符串相加
        if (
          operator === '+' &&
          t.isStringLiteral(left) &&
          t.isStringLiteral(right)
        ) {
          // 合并字符串
          path.replaceWith(
            t.stringLiteral(left.value + right.value)
          );
        }
      },
      
      // 计算常量表达式
      BinaryExpression(path) {
        const { left, right, operator } = path.node;
        
        // 如果两边都是数字字面量
        if (
          t.isNumericLiteral(left) &&
          t.isNumericLiteral(right)
        ) {
          let result;
          
          switch (operator) {
            case '+':
              result = left.value + right.value;
              break;
            case '-':
              result = left.value - right.value;
              break;
            case '*':
              result = left.value * right.value;
              break;
            case '/':
              result = left.value / right.value;
              break;
            default:
              return;
          }
          
          // 替换为计算结果
          path.replaceWith(t.numericLiteral(result));
        }
      },
      
      // 简化布尔表达式
      UnaryExpression(path) {
        const { operator, argument } = path.node;
        
        if (operator === '!' && t.isBooleanLiteral(argument)) {
          path.replaceWith(t.booleanLiteral(!argument.value));
        }
      }
    }
  };
};

// 转换示例
// 输入
const str = 'Hello' + ' ' + 'World';
const num = 10 + 20 * 2;
const bool = !!true;

// 输出
const str = 'Hello World';
const num = 50;
const bool = true;
```

## ESLint 插件

### 插件的本质：对象

ESLint 插件是一个**导出规则集合的对象**。每个规则本身也是一个对象，包含 `create` 方法返回 AST 访问器。

```javascript
// ESLint 插件的基本结构
module.exports = {
  rules: {
    'my-rule': {
      meta: {
        type: 'suggestion',
        docs: {
          description: '规则描述',
          category: 'Best Practices',
          recommended: false
        },
        fixable: 'code',
        schema: [] // 选项 schema
      },
      create(context) {
        return {
          // AST 节点访问器
          Identifier(node) {
            // 检查逻辑
          }
        };
      }
    }
  }
};
```

### 完整的 ESLint 插件示例

```javascript
// eslint-plugin-custom.js
module.exports = {
  rules: {
    // 禁止使用 var
    'no-var': {
      meta: {
        type: 'suggestion',
        docs: {
          description: '禁止使用 var，应使用 let 或 const',
          category: 'Best Practices',
          recommended: true
        },
        fixable: 'code',
        schema: [],
        messages: {
          noVar: '不要使用 var，请使用 let 或 const'
        }
      },
      create(context) {
        return {
          VariableDeclaration(node) {
            if (node.kind === 'var') {
              context.report({
                node,
                messageId: 'noVar',
                fix(fixer) {
                  // 尝试修复：将 var 替换为 let
                  const sourceCode = context.getSourceCode();
                  const varToken = sourceCode.getFirstToken(node);
                  return fixer.replaceText(varToken, 'let');
                }
              });
            }
          }
        };
      }
    },
    
    // 要求函数名使用驼峰命名
    'camelcase-function-name': {
      meta: {
        type: 'suggestion',
        docs: {
          description: '函数名必须使用驼峰命名',
          category: 'Stylistic Issues'
        },
        schema: []
      },
      create(context) {
        // 检查是否是驼峰命名
        function isCamelCase(name) {
          return /^[a-z][a-zA-Z0-9]*$/.test(name);
        }
        
        return {
          FunctionDeclaration(node) {
            if (node.id && !isCamelCase(node.id.name)) {
              context.report({
                node: node.id,
                message: '函数名 "{{name}}" 不是驼峰命名',
                data: {
                  name: node.id.name
                }
              });
            }
          },
          
          VariableDeclarator(node) {
            if (
              node.init &&
              (node.init.type === 'FunctionExpression' ||
               node.init.type === 'ArrowFunctionExpression') &&
              node.id.type === 'Identifier' &&
              !isCamelCase(node.id.name)
            ) {
              context.report({
                node: node.id,
                message: '函数名 "{{name}}" 不是驼峰命名',
                data: {
                  name: node.id.name
                }
              });
            }
          }
        };
      }
    },
    
    // 禁止使用特定的 API
    'no-restricted-apis': {
      meta: {
        type: 'problem',
        docs: {
          description: '禁止使用特定的 API',
          category: 'Best Practices'
        },
        schema: [
          {
            type: 'object',
            properties: {
              apis: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    object: { type: 'string' },
                    property: { type: 'string' },
                    message: { type: 'string' }
                  },
                  required: ['object', 'property']
                }
              }
            }
          }
        ]
      },
      create(context) {
        const options = context.options[0] || {};
        const restrictedApis = options.apis || [];
        
        return {
          MemberExpression(node) {
            if (
              node.object.type === 'Identifier' &&
              node.property.type === 'Identifier'
            ) {
              const objectName = node.object.name;
              const propertyName = node.property.name;
              
              // 检查是否是受限 API
              const restricted = restrictedApis.find(
                api => api.object === objectName && api.property === propertyName
              );
              
              if (restricted) {
                context.report({
                  node,
                  message: restricted.message || 
                    `不允许使用 ${objectName}.${propertyName}`
                });
              }
            }
          }
        };
      }
    }
  },
  
  // 配置集
  configs: {
    recommended: {
      rules: {
        'custom/no-var': 'error',
        'custom/camelcase-function-name': 'warn'
      }
    }
  }
};

// 使用插件
// .eslintrc.js
module.exports = {
  plugins: ['custom'],
  rules: {
    'custom/no-var': 'error',
    'custom/camelcase-function-name': 'warn',
    'custom/no-restricted-apis': ['error', {
      apis: [
        {
          object: 'localStorage',
          property: 'setItem',
          message: '请使用封装的 storage 工具'
        },
        {
          object: 'document',
          property: 'write',
          message: 'document.write 已过时'
        }
      ]
    }]
  },
  // 或使用预设配置
  extends: ['plugin:custom/recommended']
};
```

## PostCSS 插件

### 插件的本质：函数返回对象

PostCSS 插件是一个**返回包含处理函数的对象**。插件通过遍历 CSS AST 来转换样式。

```javascript
// PostCSS 插件的基本结构
module.exports = (opts = {}) => {
  return {
    postcssPlugin: 'my-postcss-plugin',
    
    // 钩子函数
    Once(root, { result }) {
      // 处理整个 CSS 文件一次
    },
    
    Rule(rule) {
      // 处理每个规则
    },
    
    Declaration(decl) {
      // 处理每个声明
    }
  };
};

module.exports.postcss = true;
```

### 完整的 PostCSS 插件示例

```javascript
// postcss-plugin-px-to-rem.js
const postcss = require('postcss');

module.exports = (opts = {}) => {
  // 默认选项
  const options = {
    rootValue: 16,
    unitPrecision: 5,
    selectorBlackList: [],
    propBlackList: [],
    replace: true,
    mediaQuery: false,
    minPixelValue: 0,
    ...opts
  };
  
  // px 转 rem
  function pxToRem(value) {
    const pixels = parseFloat(value);
    
    if (pixels < options.minPixelValue) {
      return value;
    }
    
    const rem = pixels / options.rootValue;
    return rem.toFixed(options.unitPrecision) + 'rem';
  }
  
  return {
    postcssPlugin: 'postcss-px-to-rem',
    
    Declaration(decl) {
      // 检查属性是否在黑名单中
      if (options.propBlackList.includes(decl.prop)) {
        return;
      }
      
      // 检查选择器是否在黑名单中
      const rule = decl.parent;
      if (rule && rule.selector) {
        const isBlacklisted = options.selectorBlackList.some(blacklist => {
          if (typeof blacklist === 'string') {
            return rule.selector.includes(blacklist);
          }
          return blacklist.test(rule.selector);
        });
        
        if (isBlacklisted) {
          return;
        }
      }
      
      // 转换 px 值
      const value = decl.value;
      
      if (value.includes('px')) {
        const newValue = value.replace(
          /(\d+(\.\d+)?)px/g,
          (match, num) => pxToRem(match)
        );
        
        if (options.replace) {
          decl.value = newValue;
        } else {
          decl.cloneAfter({ value: newValue });
        }
      }
    },
    
    AtRule(atRule) {
      // 处理媒体查询
      if (options.mediaQuery && atRule.name === 'media') {
        if (atRule.params.includes('px')) {
          atRule.params = atRule.params.replace(
            /(\d+(\.\d+)?)px/g,
            (match) => pxToRem(match)
          );
        }
      }
    }
  };
};

module.exports.postcss = true;

// 使用插件
// postcss.config.js
module.exports = {
  plugins: [
    require('./postcss-plugin-px-to-rem')({
      rootValue: 16,
      unitPrecision: 5,
      selectorBlackList: ['.ignore', /^\.el-/],
      propBlackList: ['border', 'border-width'],
      minPixelValue: 2
    })
  ]
};

// 转换示例
// 输入
.box {
  width: 320px;
  height: 200px;
  border: 1px solid #000; /* 不会转换 */
  font-size: 14px;
}

// 输出
.box {
  width: 20rem;
  height: 12.5rem;
  border: 1px solid #000;
  font-size: 0.875rem;
}
```

### CSS 属性添加前缀插件

```javascript
// postcss-plugin-vendor-prefix.js
module.exports = (opts = {}) => {
  const prefixes = opts.prefixes || ['-webkit-', '-moz-', '-ms-', '-o-'];
  const properties = opts.properties || [];
  
  return {
    postcssPlugin: 'postcss-vendor-prefix',
    
    Declaration(decl) {
      // 检查是否需要添加前缀
      if (properties.includes(decl.prop)) {
        const rule = decl.parent;
        
        // 添加各种浏览器前缀
        prefixes.forEach(prefix => {
          rule.insertBefore(decl, {
            prop: prefix + decl.prop,
            value: decl.value
          });
        });
      }
    }
  };
};

module.exports.postcss = true;

// 使用
// postcss.config.js
module.exports = {
  plugins: [
    require('./postcss-plugin-vendor-prefix')({
      prefixes: ['-webkit-', '-moz-'],
      properties: ['transform', 'transition', 'animation']
    })
  ]
};

// 转换示例
// 输入
.box {
  transform: rotate(45deg);
}

// 输出
.box {
  -webkit-transform: rotate(45deg);
  -moz-transform: rotate(45deg);
  transform: rotate(45deg);
}
```

## 插件设计模式对比

### 架构对比表

| 工具        | 本质                 | 特点                              | 使用方式                           | 钩子系统         |
| ----------- | -------------------- | --------------------------------- | ---------------------------------- | ---------------- |
| **Vite**    | 函数返回对象         | 基于 Rollup，扩展了开发服务器钩子 | `plugins: [myPlugin(options)]`     | 声明式钩子对象   |
| **Webpack** | 类实例（apply 方法） | 基于 Tapable，钩子多而复杂        | `plugins: [new MyPlugin(options)]` | Tapable 事件系统 |
| **Rollup**  | 函数返回对象         | 简洁，专注构建                    | `plugins: [myPlugin(options)]`     | 声明式钩子对象   |
| **Babel**   | 函数返回 visitor     | AST 转换，visitor 模式            | `plugins: [myPlugin]`              | Visitor 模式     |
| **ESLint**  | 规则对象集合         | 静态分析，每个规则独立            | `plugins: ['my-plugin']`           | 规则 create 函数 |
| **PostCSS** | 函数返回对象         | CSS AST 转换                      | `plugins: [myPlugin(options)]`     | 声明式钩子对象   |

### 为什么设计不同？

#### 1. Webpack 使用类和 Tapable

```javascript
// Webpack 的复杂性需要强大的事件系统
class MyPlugin {
  apply(compiler) {
    // Tapable 提供了多种钩子类型
    compiler.hooks.emit.tapAsync(/*...*/);      // 异步回调
    compiler.hooks.make.tapPromise(/*...*/);     // Promise
    compiler.hooks.compile.tap(/*...*/);         // 同步
  }
}
```

**原因**：
- Webpack 处理的场景极其复杂（模块、资源、优化等）
- 需要强大的钩子系统来协调插件间的执行顺序
- Tapable 提供了完整的事件流控制

#### 2. Vite/Rollup 使用函数返回对象

```javascript
// 简洁且易于理解
export default function myPlugin(options) {
  return {
    name: 'my-plugin',
    transform(code, id) {
      // 直接返回转换结果
      return { code, map };
    }
  };
}
```

**原因**：
- 更简单直观的 API
- 函数可以接收选项参数，闭包保存状态
- 专注于模块转换，场景相对简单

#### 3. Babel 使用 Visitor 模式

```javascript
// 精确控制 AST 节点访问
module.exports = function({ types: t }) {
  return {
    visitor: {
      Identifier(path) {
        // 只处理标识符节点
      },
      FunctionDeclaration(path) {
        // 只处理函数声明节点
      }
    }
  };
}
```

**原因**：
- AST 转换天然适合 Visitor 模式
- 可以精确指定要处理的节点类型
- 代码结构清晰，易于维护

## 开发插件的最佳实践

### 1. 命名规范

```javascript
// Vite/Rollup 插件
// 格式：vite-plugin-<name> 或 rollup-plugin-<name>
export default function vitePluginMyFeature() {
  return {
    name: 'vite-plugin-my-feature', // 必须有 name
    // ...
  };
}

// Webpack 插件
// 格式：<name>-webpack-plugin
class MyFeatureWebpackPlugin {
  // ...
}

// Babel 插件
// 格式：babel-plugin-<name>
module.exports = function babelPluginMyFeature() {
  // ...
};

// ESLint 插件
// 格式：eslint-plugin-<name>
module.exports = {
  rules: {
    'my-rule': { /* ... */ }
  }
};
```

### 2. 错误处理

```javascript
// Vite/Rollup 插件
export default function myPlugin() {
  return {
    name: 'my-plugin',
    transform(code, id) {
      try {
        // 转换逻辑
        return { code, map };
      } catch (err) {
        // 使用 this.error 报告错误
        this.error({
          message: '转换失败',
          id,
          cause: err
        });
      }
    }
  };
}

// Webpack 插件
class MyPlugin {
  apply(compiler) {
    compiler.hooks.emit.tapAsync('MyPlugin', (compilation, callback) => {
      try {
        // 处理逻辑
        callback();
      } catch (err) {
        // 传递错误给 callback
        callback(err);
      }
    });
  }
}
```

### 3. 性能优化

```javascript
// 缓存处理结果
export default function cachedPlugin() {
  const cache = new Map();
  
  return {
    name: 'cached-plugin',
    transform(code, id) {
      // 检查缓存
      if (cache.has(id)) {
        return cache.get(id);
      }
      
      // 处理并缓存
      const result = expensiveTransform(code);
      cache.set(id, result);
      return result;
    },
    
    // 清理缓存
    buildEnd() {
      cache.clear();
    }
  };
}
```

### 4. 支持选项配置

```javascript
// 使用 TypeScript 定义选项类型
interface PluginOptions {
  include?: string | RegExp | Array<string | RegExp>;
  exclude?: string | RegExp | Array<string | RegExp>;
  customOption?: boolean;
}

export default function myPlugin(options: PluginOptions = {}) {
  // 合并默认选项
  const opts = {
    include: /\.(js|ts)$/,
    exclude: /node_modules/,
    customOption: false,
    ...options
  };
  
  // 创建过滤器
  const filter = createFilter(opts.include, opts.exclude);
  
  return {
    name: 'my-plugin',
    transform(code, id) {
      if (!filter(id)) return null;
      // 转换逻辑
    }
  };
}
```

### 5. 测试插件

```javascript
// 使用 Vitest 测试 Vite 插件
import { describe, it, expect } from 'vitest';
import { build } from 'vite';
import myPlugin from './my-plugin';

describe('myPlugin', () => {
  it('should transform code correctly', async () => {
    const result = await build({
      plugins: [myPlugin()],
      build: {
        write: false,
        rollupOptions: {
          input: 'test/fixtures/input.js'
        }
      }
    });
    
    expect(result.output[0].code).toContain('expected content');
  });
});

// 使用 Jest 测试 Webpack 插件
const webpack = require('webpack');
const MyPlugin = require('./my-plugin');

describe('MyPlugin', () => {
  it('should add custom file', (done) => {
    webpack({
      entry: './test/fixtures/entry.js',
      plugins: [new MyPlugin()],
      output: { path: '/tmp' }
    }, (err, stats) => {
      expect(stats.compilation.assets['custom-file.txt']).toBeDefined();
      done();
    });
  });
});
```

## 总结

前端插件虽然形式各异，但核心思想是一致的：**通过钩子（hooks）介入工具的处理流程**。理解不同工具插件的本质，可以帮助我们：

1. **更好地使用插件** - 知道插件的工作原理，能够更好地配置和调试
2. **开发自己的插件** - 根据需求扩展工具功能
3. **优化构建流程** - 选择合适的插件，避免性能问题
4. **理解工具设计** - 学习优秀的架构设计模式

### 选择插件架构的考虑因素

- **简单场景**：函数返回对象（Vite/Rollup 模式）
- **复杂场景**：类 + 事件系统（Webpack 模式）
- **AST 转换**：Visitor 模式（Babel 模式）
- **规则检查**：规则对象（ESLint 模式）

理解这些设计背后的原因，能让我们在开发工具和插件时做出更好的架构选择。

