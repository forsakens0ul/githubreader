# GitHub Reader (`githubreader`)

> 把任意公开 GitHub 文本仓库变成一本真正能翻页的专业电子书。
> 深度融合 [Coreader](https://github.com/forsakens0ul/coreader) 专业阅读器引擎，针对《托卡马克之冠》(`i12cu2/Crown_of_Tokamak`) 做好首发体验，并通用支持任意 Markdown / TXT 仓库。

![GitHub Reader](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Vite](https://img.shields.io/badge/Vite-5-646cff) ![TailwindCSS](https://img.shields.io/badge/Tailwind-3-38bdf8) ![IndexedDB](https://img.shields.io/badge/Storage-IndexedDB_Dexie-green) ![File_System_Access_API](https://img.shields.io/badge/Local_Storage-FileSystemAccess-orange)

---

## 🌟 核心设计与特性

1. **智能仓库与章节解析**
   - 自动识别仓库目录树与默认分支（避免假定 `main`）。
   - **《托卡马克之冠》专属编排**：识别 `2020` ~ `2025` 年份目录、`未知时间`、`聊天记录`，将数千篇回答智能分卷，清洗标题并提取发布日期。
   - **排除干扰文件**：自动排除 `.py` 脚本及冗余超大汇总文本（如 `merged_all.txt`），避免内存占用与重复阅读。
   - **序言提取**：自动读取 `Readme.md` 作为书籍简介与前言。

2. **Coreader 专业排版引擎与双模式**
   - **智能分页模式 (Paginated)**：段落级智能分页，汉字首行缩进（2em）与两端对齐，避免生硬折断。
   - **字符偏移锚定 (Char-Offset Stability)**：即使在阅读中调整字号、切换全屏或改变窗口大小，阅读位置依据字符偏移精确恢复，绝不跳回书头。
   - **连续滚动模式 (Scroll)**：适合手机或快速刷读，平滑滚动并自动保存进度。
   - **分卷记忆与目录跳转**：默认折叠全部年份，只自动展开当前正在阅读的年份/篇目，点开目录抽屉自动滚动高亮当前章节。

3. **阅读批注、朗读与辅助**
   - **划线与高亮 (Highlights & Notes)**：文本选区后一键划线（多色可选）、复制原文、添加读者笔记批注。
   - **语音朗读 (Web Speech TTS)**：内置语音合成引擎，支持后台连续朗读、语速调节、音高与声音选择。
   - **全文搜索 (MiniSearch)**：多卷全文关键词索引，高亮上下文并一键定位。

4. **存储与本地文件系统绑定**
   - **IndexedDB 浏览器存储**：离线可读，缓存自动管理。
   - **自定义本地存储路径 (W3C File System Access API)**：可在设置中绑定电脑上的任意物理文件夹（如 `D:\Books\GitReader`），一键将已缓存的书籍、分卷、章节导出为真实的 `.txt` / `.md` 文件树同步到本地硬盘。
   - **一键 JSON 数据备份与还原**：方便多端迁移阅读记录、书签与批注。

---

## 🚀 本地启动与运行

在项目根目录运行以下命令：

```bash
# 1. 启动本地开发服务器
npm run dev

# 2. 生产构建打包
npm run build

# 3. 预览生产构建
npm run preview
```

启动后在浏览器打开输出的本地链接（通常为 `http://localhost:5173/`）。

---

## 📖 使用体验步骤

1. 打开应用，首屏即为**我的书架**。
2. 点击页面中央的**「一键导入」**《托卡马克之冠》知乎回答合集（或粘贴任意公开 GitHub 仓库地址，如 `owner/repo`）。
3. 导入成功后，即刻进入阅读器：
   - 桌面端：支持 `←` `→` 方向键翻页，`PageUp` `PageDown` 或 `空格键`。
   - 触屏端：轻扫左/右翻页，轻触屏幕正中央唤出/隐藏顶部工具栏与底部进度条。
   - 点击左上角**「目录」**：可展开折叠年份，并在目录内即时搜索特定篇目。
   - 点击右上角**「搜索」**：可检索已索引章节内容。
   - 点击右上角**「设置」**：可实时调整字号、字体、行距与配色。
   - 点击左上角返回箭头：随时返回书架，书架卡片会精确显示当前阅读百分比与上次阅读时间。

---

## ☁️ 部署到 Vercel 或 Cloudflare Pages

本项目为标准的纯静态单页前端（SPA），零服务端运行时，可无缝部署到各大免费静态托管平台：

### 部署到 Vercel
1. 将当前项目 push 到你的 GitHub 仓库。
2. 登录 [Vercel](https://vercel.com/)，选择 **Add New Project**。
3. 导入该仓库，Build Command 保持 `npm run build`，Output Directory 保持 `dist`，点击 **Deploy**。

### 部署到 Cloudflare Pages
1. 在 Cloudflare Dashboard 进入 **Workers & Pages** -> **Create application** -> **Pages**。
2. 关联 GitHub 仓库，构建设置为：
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Output directory: `dist`
3. 点击 **Save and Deploy** 即可获得全球 CDN 极速分发的阅读器。
