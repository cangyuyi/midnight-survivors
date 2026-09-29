# 长夜收割者 · Nocturne Survivors

一款零外部美术与音频资源的浏览器幸存者 Roguelite。武器自动开火，你负责移动；活到 12 分钟后的天亮，或者成为夜班的一部分。

> **在线试玩：** 部署完成后会在这里补上 GitHub Pages 地址。

## 特性

- 9 种自动武器、12 种被动、4 位角色、5 档难度。
- 8 段敌潮成长与 16 幕事件编排；狂暴难度会每 180 秒循环重演。
- 经验升级三选一、稀有度、宝箱奖励与局外金币结算。
- Canvas 程序化绘制与 Web Audio 合成音效；不依赖图片、音频或运行时 CDN。
- 固定步长模拟、定长 SoA 敌人池、空间网格、低特效选项与本地进度保存。

## 开始游戏

需要 Node.js 22 和 pnpm 10.12.1。

```bash
pnpm install
pnpm dev
```

开发服务器默认监听 `127.0.0.1:5173`。生产构建为纯静态内容：

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

构建输出位于 `dist/`。

## 操作

| 输入 | 操作 |
| --- | --- |
| WASD / 方向键 | 移动 |
| 按住鼠标并移动 | 朝光标方向移动（中心 26px 死区） |
| 鼠标点击升级卡 / 1–3 | 选择升级 |
| 空格 | 重掷升级提案 |
| Esc / P | 暂停 |

武器会自动攻击，没有手动攻击键。声音首次播放需要浏览器允许用户交互后启动 Web Audio。

## GitHub Pages 部署

仓库包含 GitHub Actions 工作流：推送到 `main` 后会自动运行测试、类型检查、Lint、构建并发布 `dist/`。在仓库 **Settings → Pages → Build and deployment** 将来源设为 **GitHub Actions**。部署成功后，地址会显示在 Pages 设置和 Actions 的 `github-pages` 环境中。

GitHub Pages 面向互联网发布网页内容。请勿把密钥、个人存档或其他敏感文件提交到仓库。公开仓库在 GitHub Free 上可使用 Pages；私有仓库是否可用取决于账号方案。具体访问策略与方案说明见 GitHub Pages 文档。

## 工程结构

```text
src/
├── engine/       # 随机数、输入、固定步长循环、空间网格、音频与程序化精灵
├── game/
│   ├── content.ts # 集中管理游戏数据与平衡曲线
│   ├── world.ts   # 与 React/DOM 隔离的游戏模拟
│   ├── render.ts  # Canvas 渲染
│   └── host.ts    # RAF、输入、音频和 React 快照边界
└── ui/            # React HUD、标题、升级、暂停与结算界面

tests/             # 战斗、升级及核心数值回归测试
.github/workflows/ # 持续集成与 Pages 发布
```

## 贡献与反馈

欢迎通过 GitHub Issues 提交可复现的问题。修改玩法、输入或渲染时，请运行全部检查，并尽量附上浏览器、分辨率、复现步骤和截图。

## 许可

当前仓库尚未指定开源许可证；在许可证确定之前，请不要假设代码可被再发布或商用。
