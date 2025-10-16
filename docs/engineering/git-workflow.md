# Git 工作流与代码规范

## Git 工作流模式

### 1. Git Flow

经典的分支管理模型，适合有明确发布周期的项目。

```
main (生产)
  ↓
develop (开发)
  ↓
feature/* (功能)
hotfix/* (紧急修复)
release/* (发布)
```

**分支说明**：
- `main`: 生产环境代码
- `develop`: 开发环境代码
- `feature/*`: 功能分支
- `release/*`: 发布分支
- `hotfix/*`: 紧急修复分支

**工作流程**：

```bash
# 1. 从 develop 创建功能分支
git checkout -b feature/user-auth develop

# 2. 开发功能
git add .
git commit -m "feat: add user authentication"

# 3. 合并回 develop
git checkout develop
git merge --no-ff feature/user-auth
git branch -d feature/user-auth

# 4. 创建发布分支
git checkout -b release/1.0.0 develop

# 5. 发布后合并到 main 和 develop
git checkout main
git merge --no-ff release/1.0.0
git tag -a v1.0.0 -m "Release version 1.0.0"

git checkout develop
git merge --no-ff release/1.0.0
git branch -d release/1.0.0

# 6. 紧急修复
git checkout -b hotfix/security-fix main
# 修复后合并到 main 和 develop
git checkout main
git merge --no-ff hotfix/security-fix
git tag -a v1.0.1 -m "Hotfix security issue"

git checkout develop
git merge --no-ff hotfix/security-fix
git branch -d hotfix/security-fix
```

### 2. GitHub Flow

简化的工作流，适合持续部署的项目。

```
main (生产)
  ↓
feature-branch (功能分支)
  ↓
Pull Request → Code Review → Merge
```

**工作流程**：

```bash
# 1. 从 main 创建功能分支
git checkout -b feature/add-login main

# 2. 开发和提交
git add .
git commit -m "feat: add login page"
git push origin feature/add-login

# 3. 创建 Pull Request
# 在 GitHub 上创建 PR

# 4. 代码审查通过后合并
# 合并后自动部署
```

### 3. Trunk-Based Development

主干开发，适合高频部署的团队。

```
main (主干)
  ↓
短期分支（1-2天）→ 合并到 main
```

**特点**：
- 分支生命周期短（1-2天）
- 频繁合并到主干
- 使用 Feature Flag 控制功能
- 持续集成和部署

## Commit 规范

### Conventional Commits

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型**：
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档变更
- `style`: 代码格式（不影响代码运行）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `build`: 构建系统或外部依赖
- `ci`: CI 配置
- `chore`: 其他修改
- `revert`: 回退

**示例**：

```bash
# 新功能
git commit -m "feat(auth): add user login"

# 修复 bug
git commit -m "fix(api): handle null response"

# 文档
git commit -m "docs(readme): update installation guide"

# 重构
git commit -m "refactor(utils): simplify date formatting"

# 性能优化
git commit -m "perf(list): optimize rendering with virtual scroll"

# Breaking Change
git commit -m "feat(api): change response format

BREAKING CHANGE: API response structure has changed"
```

### Commitlint 配置

```bash
# 安装
pnpm add -D @commitlint/cli @commitlint/config-conventional
```

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert'
      ]
    ],
    'subject-case': [0], // 允许任意大小写
    'subject-max-length': [2, 'always', 100]
  }
}
```

```bash
# .husky/commit-msg
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx --no -- commitlint --edit $1
```

### Commitizen

交互式生成符合规范的 commit message。

```bash
# 安装
pnpm add -D commitizen cz-conventional-changelog

# 初始化
pnpm exec commitizen init cz-conventional-changelog --pnpm --save-dev
```

```json
// package.json
{
  "scripts": {
    "commit": "cz"
  },
  "config": {
    "commitizen": {
      "path": "cz-conventional-changelog"
    }
  }
}
```

```bash
# 使用
pnpm commit
```

## 分支命名规范

### 命名格式

```
<type>/<description>
```

**示例**：
```
feature/user-authentication
bugfix/fix-login-error
hotfix/security-patch
refactor/optimize-api
docs/update-readme
test/add-unit-tests
```

### 规则

1. 使用小写字母
2. 使用连字符（-）分隔单词
3. 简洁明了，描述分支目的
4. 避免使用个人姓名

## Pull Request 规范

### PR 标题

```
<type>(<scope>): <description>
```

### PR 描述模板

```markdown
## 变更类型
- [ ] 新功能（feature）
- [ ] Bug 修复（bugfix）
- [ ] 重构（refactor）
- [ ] 文档（docs）
- [ ] 其他

## 变更描述
<!-- 简要描述本次变更 -->

## 相关 Issue
<!-- 关联的 Issue，例如：Closes #123 -->

## 测试
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 手动测试通过

## 截图（如适用）
<!-- 添加相关截图 -->

## 检查清单
- [ ] 代码遵循项目规范
- [ ] 已添加/更新测试
- [ ] 已更新文档
- [ ] CI/CD 通过
```

### PR 模板配置

```markdown
<!-- .github/pull_request_template.md -->
## 📝 变更描述

## 🔗 相关 Issue
Closes #

## ✅ 测试
- [ ] 单元测试
- [ ] 集成测试
- [ ] 手动测试

## 📸 截图

## ✨ 检查清单
- [ ] 代码规范
- [ ] 测试覆盖
- [ ] 文档更新
- [ ] CI 通过
```

## 代码审查（Code Review）

### 审查要点

**1. 代码质量**
```javascript
// ❌ 不好
function calc(a, b) {
  return a + b * 2
}

// ✅ 好
/**
 * 计算价格：基础价格 + 附加费用 * 2
 */
function calculateTotalPrice(basePrice: number, additionalFee: number): number {
  return basePrice + additionalFee * 2
}
```

**2. 性能**
```javascript
// ❌ 不好：每次渲染都创建新函数
function Component() {
  return <button onClick={() => console.log('click')}>Click</button>
}

// ✅ 好：使用 useCallback
function Component() {
  const handleClick = useCallback(() => {
    console.log('click')
  }, [])
  
  return <button onClick={handleClick}>Click</button>
}
```

**3. 安全**
```javascript
// ❌ 不好：XSS 风险
function Component({ html }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}

// ✅ 好：使用安全的方式
function Component({ text }) {
  return <div>{text}</div>
}
```

**4. 测试**
```javascript
// ✅ 确保有测试覆盖
describe('calculateTotalPrice', () => {
  it('should calculate correct total price', () => {
    expect(calculateTotalPrice(100, 20)).toBe(140)
  })
  
  it('should handle zero values', () => {
    expect(calculateTotalPrice(0, 0)).toBe(0)
  })
})
```

### 审查流程

1. **自动化检查**
   - ESLint / Prettier
   - 单元测试
   - 集成测试
   - 类型检查

2. **人工审查**
   - 代码逻辑
   - 设计模式
   - 性能考虑
   - 安全隐患

3. **反馈**
   - 建设性意见
   - 具体建议
   - 示例代码

## Git Hooks

### Husky 配置

```bash
# 安装
pnpm add -D husky

# 初始化
pnpm exec husky install

# 添加到 package.json
npm pkg set scripts.prepare="husky install"
```

### Pre-commit Hook

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# 运行 lint-staged
pnpm lint-staged
```

```json
// package.json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

### Commit-msg Hook

```bash
# .husky/commit-msg
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# 检查 commit message 格式
npx --no -- commitlint --edit $1
```

### Pre-push Hook

```bash
# .husky/pre-push
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# 运行测试
pnpm test

# 运行类型检查
pnpm type-check
```

## 代码规范工具

### ESLint

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    'react/react-in-jsx-scope': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn'
  }
}
```

### Prettier

```javascript
// .prettierrc.js
module.exports = {
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 100,
  arrowParens: 'avoid'
}
```

### EditorConfig

```ini
# .editorconfig
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

## 版本号规范（Semantic Versioning）

### 格式

```
MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]

例如：1.2.3-alpha.1+20231001
```

**规则**：
- `MAJOR`: 不兼容的 API 变更
- `MINOR`: 向下兼容的新功能
- `PATCH`: 向下兼容的 bug 修复
- `PRERELEASE`: 预发布版本（alpha, beta, rc）
- `BUILD`: 构建元数据

### 版本升级规则

```bash
# Patch 版本（bug 修复）
1.0.0 → 1.0.1

# Minor 版本（新功能）
1.0.0 → 1.1.0

# Major 版本（破坏性变更）
1.0.0 → 2.0.0

# 预发布版本
1.0.0 → 1.1.0-alpha.1
1.1.0-alpha.1 → 1.1.0-beta.1
1.1.0-beta.1 → 1.1.0-rc.1
1.1.0-rc.1 → 1.1.0
```

## CHANGELOG 生成

### conventional-changelog

```bash
# 安装
pnpm add -D conventional-changelog-cli

# 生成 CHANGELOG
pnpm exec conventional-changelog -p angular -i CHANGELOG.md -s
```

```json
// package.json
{
  "scripts": {
    "changelog": "conventional-changelog -p angular -i CHANGELOG.md -s -r 0"
  }
}
```

### 示例 CHANGELOG

```markdown
# Changelog

## [1.1.0] - 2024-01-15

### Features
- feat(auth): add OAuth2 support (#123)
- feat(api): add pagination to user list (#124)

### Bug Fixes
- fix(login): resolve token expiration issue (#125)
- fix(ui): correct button alignment (#126)

### Performance
- perf(list): optimize rendering with virtual scroll (#127)

### Documentation
- docs(readme): update installation guide (#128)

## [1.0.0] - 2024-01-01

### Features
- feat: initial release
```

## 最佳实践

### 1. 保持 Commit 原子性

```bash
# ❌ 不好：一次提交多个不相关的修改
git commit -m "fix login bug and add new feature and update docs"

# ✅ 好：每次提交一个独立的修改
git commit -m "fix: resolve login token issue"
git commit -m "feat: add user profile page"
git commit -m "docs: update API documentation"
```

### 2. 频繁提交

```bash
# 小步快走，频繁提交
git commit -m "feat: add user model"
git commit -m "feat: add user service"
git commit -m "feat: add user controller"
git commit -m "test: add user tests"
```

### 3. 使用 Interactive Rebase

```bash
# 整理提交历史
git rebase -i HEAD~3

# 在编辑器中选择操作：
# pick：保留提交
# reword：修改提交信息
# squash：合并到上一个提交
# fixup：合并到上一个提交但丢弃提交信息
# drop：删除提交
```

### 4. 保护主分支

```yaml
# .github/branch-protection.yml
branches:
  - name: main
    protection:
      required_pull_request_reviews:
        required_approving_review_count: 2
      required_status_checks:
        strict: true
        contexts:
          - ci/test
          - ci/lint
      enforce_admins: true
      restrictions:
        users: []
        teams: []
```

## 总结

Git 工作流的核心要点：

1. **分支管理**
   - 选择合适的工作流
   - 清晰的分支命名
   - 及时删除过期分支

2. **Commit 规范**
   - 使用 Conventional Commits
   - 保持提交原子性
   - 编写清晰的提交信息

3. **代码审查**
   - 自动化检查 + 人工审查
   - 建设性反馈
   - 及时响应

4. **自动化**
   - Git Hooks
   - CI/CD
   - 代码规范工具

良好的 Git 工作流能够：
- 提高团队协作效率
- 保证代码质量
- 简化版本管理
- 便于问题追踪

## 相关阅读

- [Monorepo 架构](/engineering/monorepo)
- [持续集成与部署](/engineering/testing-and-deployment)
- [ESLint 工程实践](/engineering/eslint)

