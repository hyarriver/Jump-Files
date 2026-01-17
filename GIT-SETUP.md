# Git 仓库设置指南

## ✅ 已完成

- ✅ Git 仓库已初始化
- ✅ 所有文件已添加到暂存区
- ✅ 初始提交已创建（73 个文件，14971 行代码）

## 下一步：连接到 GitHub

### 1. 在 GitHub 上创建仓库

1. 访问 [GitHub](https://github.com) 并登录
2. 点击右上角的 **+** → **New repository**
3. 填写仓库信息：
   - **Repository name**: `jump-files`（或你喜欢的名称）
   - **Description**: `安全文件分享平台 - 部署到 Cloudflare Pages`
   - **Visibility**: 选择 Public 或 Private
   - ⚠️ **不要**勾选 "Initialize this repository with a README"（我们已经有了）
4. 点击 **Create repository**

### 2. 连接本地仓库到 GitHub

在终端中运行以下命令（将 `YOUR_USERNAME` 替换为你的 GitHub 用户名）：

```bash
# 添加远程仓库
git remote add origin https://github.com/YOUR_USERNAME/jump-files.git

# 或者使用 SSH（如果你配置了 SSH 密钥）
# git remote add origin git@github.com:YOUR_USERNAME/jump-files.git

# 重命名分支为 main（如果 GitHub 使用 main 分支）
git branch -M main

# 推送代码到 GitHub
git push -u origin main
```

### 3. 验证推送

1. 刷新 GitHub 仓库页面
2. 确认所有文件都已显示
3. 检查 `.github/workflows/deploy-cloudflare.yml` 是否存在

## 配置 GitHub Secrets（用于自动部署）

在推送代码后，需要配置 GitHub Secrets 以启用自动部署：

1. 进入 GitHub 仓库 → **Settings** → **Secrets and variables** → **Actions**
2. 点击 **New repository secret**
3. 添加以下 Secrets：

### CLOUDFLARE_API_TOKEN
- **Name**: `CLOUDFLARE_API_TOKEN`
- **Value**: 你的 Cloudflare API Token
  - 在 [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens) 创建
  - 需要 **Cloudflare Pages** 和 **Workers** 的编辑权限

### CLOUDFLARE_ACCOUNT_ID
- **Name**: `CLOUDFLARE_ACCOUNT_ID`
- **Value**: 你的 Cloudflare Account ID
  - 在 Cloudflare Dashboard 右侧边栏可以找到

## 后续步骤

配置好 GitHub Secrets 后：

1. **在 Cloudflare 中设置 R2 存储桶**
   - 创建 R2 存储桶（名称：`jump-files`）
   - 在 Cloudflare Pages 项目中配置 R2 绑定（变量名：`R2_STORAGE`）

2. **配置数据库**
   - 使用 Cloudflare D1 或外部数据库服务
   - 在 Cloudflare Pages 中配置数据库连接

3. **推送代码触发自动部署**
   ```bash
   git add .
   git commit -m "更新配置"
   git push origin main
   ```

4. **查看部署状态**
   - 在 GitHub 仓库的 **Actions** 标签查看部署进度
   - 在 Cloudflare Dashboard 查看部署日志

## 常用 Git 命令

```bash
# 查看状态
git status

# 添加所有更改
git add .

# 提交更改
git commit -m "提交信息"

# 推送到 GitHub
git push origin main

# 查看提交历史
git log

# 查看远程仓库
git remote -v
```

## 故障排除

### 推送失败：认证问题

如果推送时要求输入用户名和密码：

1. **使用 Personal Access Token**（推荐）
   - 在 GitHub Settings → Developer settings → Personal access tokens 创建
   - 使用 token 作为密码

2. **或配置 SSH 密钥**
   - 生成 SSH 密钥：`ssh-keygen -t ed25519 -C "your_email@example.com"`
   - 将公钥添加到 GitHub Settings → SSH and GPG keys

### 分支名称不匹配

如果 GitHub 使用 `main` 而本地使用 `master`：

```bash
# 重命名本地分支
git branch -M main

# 推送并设置上游
git push -u origin main
```

## 参考文档

- [GitHub 文档](https://docs.github.com/)
- [Git 官方文档](https://git-scm.com/doc)
- `DEPLOYMENT-AUTO.md` - Cloudflare Pages 自动部署指南
