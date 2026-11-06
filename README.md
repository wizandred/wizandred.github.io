# wizandred.github.io

个人主页与笔记站。纯静态文件，无需构建、安装依赖或运行测试。

## 目录

```text
index.html          首页结构
assets/             样式、交互脚本、公式字体和本地渲染库
notes/
  index.js          笔记目录：新增笔记时在这里加一条记录
  theory/           理论类 Markdown 笔记
  math/             数学类 Markdown 笔记
.nojekyll           直接发布静态文件
```

原站的粒子背景渲染和实时鼠标交互完整保留。访客界面只提供阅读与导航；终端、ASCII 标识、启动动画、Android 阅读兼容及外联仓库功能均保留。

## 新增笔记

1. 把文件放入 `notes/` 下的分类文件夹，例如 `notes/multimodal/new-note.md`。
2. 在 `notes/index.js` 的 `window.NOTES_DATA` 数组中增加一条：

```js
{
  title: '新的多模态笔记',
  file: 'notes/multimodal/new-note.md',
  date: '2026-11-06'
}
```

如果已有上一条记录，记得在两条记录之间加逗号。分类默认从文件夹推导；也可填写 `category`、`tag`、`id`。`date` 可省略。Markdown 文件直接写正文，不需要复制到 JavaScript 或执行脚本。

静态网页不能自动列出文件夹，因此新增文件后需要在 `notes/index.js` 登记一次；修改已有 Markdown 正文则不需要改目录。

- Markdown：在本站阅读区浏览，支持公式、代码高亮、纯文本阅读、相对图片与跨笔记链接。
- 独立 HTML：同样在目录登记 `file: 'notes/code/demo.html'`，点击后打开该 HTML 页面。
- 分类支持多层目录与中文名称。
- 每篇 Markdown 的固定链接例如：`https://wizandred.github.io/#/notes/multimodal/new-note.md`。
- 原来的 `#note-1`、`#note-2` 继续有效。

## 首页设置与外联仓库

编辑 `assets/js/config.js` 可修改默认 ASCII 艺术字、配色、加载动画及仓库入口。网页不提供编辑按钮。

加载动画每个标签页会话默认播放一次；顶部 `↻` 或终端 `reboot` 可重播。

仓库入口会自动同步你的公开自有仓库，也可以在配置的 `repositories` 数组中手动添加：

```js
{repo: 'xxx', label: '项目名称'}
```

支持其他账号的 `owner/repo` 和 `pagesUrl` 自定义域名。网页与终端使用同一份仓库状态；终端支持 `repos`、`repo xxx`、`go xxx`。Pages 已启用时优先进入 Pages；未启用时进入源码。部署到同域主页后，会进一步检查项目 Pages 的 404。网络无法确认的新仓库保留源码入口，不影响笔记阅读。

## 发布到 GitHub Pages

仓库设置：**Settings → Pages → Source: Deploy from a branch → Branch: main → Folder: /(root)**。

不需要自定义 GitHub Actions 工作流。之后提交并 push 到 `main`，GitHub Pages 会发布静态文件。

```sh
git add .
git commit -m "Update homepage"
git push origin main
```

当前目录已绑定 `origin`。账号认证和最终 push 由你自己完成。

## 本地预览

为了让浏览器读取 `notes/` 下的文件，请通过 HTTP 访问，不要直接双击 HTML。可在此目录运行：

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

再访问 `http://127.0.0.1:8765/`。这只是可选的本地预览服务，不是构建步骤。

本地依赖的许可证在 `assets/vendor/licenses/`，请随源码保留。
