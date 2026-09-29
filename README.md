# 长夜收割者 · Nocturne Survivors

<p align="center">
  <strong>在线即玩（无需安装）：<a href="https://cangyuyi.github.io/midnight-survivors/">https://cangyuyi.github.io/midnight-survivors/</a></strong>
</p>

<p align="center">
  <img alt="CI" src="https://github.com/cangyuyi/midnight-survivors/actions/workflows/ci.yml/badge.svg">
  <img alt="Deploy GitHub Pages" src="https://github.com/cangyuyi/midnight-survivors/actions/workflows/pages.yml/badge.svg">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=ffd028">
  <img alt="React" src="https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=ffffff">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript&logoColor=ffffff">
</p>

> 一款**零外部美术与音频资源、数据驱动**的浏览器幸存者类 Roguelite。武器系统全自动开火，你只负责走位、闪避与构筑：在 12 分钟的夜班中活到天亮，或者成为夜潮的一部分。

游戏完全运行在浏览器内、不依赖后端服务：所有画面由 Canvas 程序化绘制，所有音效由 Web Audio 实时合成。

## 玩法特性

- **构筑深度**：9 种自动武器（追踪、扇形近战、环绕、链式闪电、范围爆发、回旋、灼烧持续伤害等）与 12 种被动强化；武器最高 7 级、被动最高 5 级。
- **多角色多难度**：4 位初始属性与天赋各异的角色、5 档难度；最高难度在 12 分钟后进入每 180 秒一轮的无限循环。
- **节奏编排**：8 段随时间演进的敌潮曲线，叠加 16 幕脚本化事件（虫群、定向墙、精英、Boss「黎明吞噬者」）。
- **局内成长**：经验升级三选一、稀有度权重（受「运气」影响）、有限重掷、宝箱与局外金币结算。
- **体验兜底**：低特效模式、音量调节、暂停与本地进度保存。

## 技术架构

### 确定性固定步长模拟

- 逻辑以 **60 Hz 固定步长**推进，渲染与逻辑解耦；采用累加器（accumulator）消费真实帧时间，并对渲染帧做插值（alpha）。
- 单帧最多追赶 3 个步长、钳制最大帧间隔（0.05s），避免掉帧后进入「死亡螺旋」。
- 随机数为可注入种子的 **xorshift32** PRNG，同种子可复现整局流程，为数值回归测试提供确定性基础。

### 数据导向的定长对象池（SoA + TypedArray）

- 敌人、弹丸、敌弹、掉落、粒子、攻击特效、飘字全部使用**定长 TypedArray（Float32Array / Uint8Array）以 Structure-of-Arrays 布局**，通过整数索引配合 free-list / 环形游标复用。
- 容量上限固定（敌人 2600、玩家弹丸 768、敌弹 256、掉落 1800 等），稳态运行**零堆分配**，从根本上消除 GC 触发的帧时间抖动。

### 空间哈希网格

- 以固定尺寸格子与整数键（`cy*65536+cx`）组织实体，桶本身同样做对象池复用。
- 群体分离（boids separation）、弹丸扫掠碰撞、近战与范围武器命中都走**半径邻域查询**，把朴素 O(n²) 的两两检测降为按邻格的近似线性规模。

### 模拟层与 React/DOM 解耦

- 核心 `World` 是**纯 TypeScript 模拟，不依赖 React 与 DOM**，外部输入以普通 `InputState` 传入，因此可在 Node 中无头运行。
- `GameHost` 作为边界：用 `requestAnimationFrame` 驱动 `world.tick`，Canvas 渲染独立于 UI；React 仅订阅**约 15 Hz 节流快照**来绘制 HUD 与菜单，高频模拟和渲染不经过 React 重渲染。
- 战斗事件通过带单调序号的队列输出，单向驱动音效与镜头震动，保持模拟与表现解耦。

### 全程序化资源（零素材 / 零 CDN）

- 精灵由 Canvas 程序化绘制，音效用 Web Audio 振荡器与包络实时合成；**不含任何图片/音频文件，也不依赖运行时第三方 CDN**，部署产物仅 JS + CSS，首屏体积极小且可离线缓存。

### 数据驱动的内容与平衡

- 武器、被动、角色、难度、敌潮与脚本事件全部集中在 `content.ts`，数值即数据；难度系数与随时间成长曲线在**实体生成的那一刻冻结**，后续帧不再重算，避免长局中出现数值漂移。

## 技术栈

| 关注点 | 选型 |
| --- | --- |
| 语言 | TypeScript 5.8（严格模式） |
| UI 框架 | React 19 |
| 构建 | Vite 6（相对路径 base，适配项目子路径部署） |
| 渲染 / 音频 | Canvas 2D · Web Audio API |
| 包管理 | pnpm 10 |
| 静态检查 | ESLint 9（flat config）· `tsc -b` |
| 测试 | Node.js + `node:assert`，esbuild 打包核心逻辑无头运行 |
| CI/CD | GitHub Actions（测试 / 类型 / Lint / 构建 / 发布） |
| 托管 | GitHub Pages |

## 快速开始

环境要求：Node.js 22+、pnpm 10.12.1。

```bash
pnpm install
pnpm dev          # 开发服务器，默认 http://127.0.0.1:5173
```

生产构建（纯静态产物，输出至 `dist/`）：

```bash
pnpm test         # 数值回归
pnpm typecheck    # 类型检查
pnpm lint         # ESLint
pnpm build        # 构建到 dist/
```

## 操作说明

| 输入 | 操作 |
| --- | --- |
| WASD / 方向键 | 移动 |
| 按住鼠标并移动 | 朝光标方向移动（中心 26px 死区） |
| 鼠标点击 / 数字键 1–3 | 选择升级卡 |
| 空格 | 重掷当前升级提案 |
| Esc / P | 暂停 / 继续 |

武器自动攻击，无手动开火键。音频首次播放需在页面上发生一次用户交互后由浏览器放行。

## 测试与质量保障

测试不依赖浏览器：通过 esbuild 将 `world.ts` / `content.ts` 打包为 Node ESM，以**固定种子**实例化世界并做无头断言，覆盖：

- 4 位角色的初始武器即装备、即开火；
- 9 种武器的获取与升级（验证实际伤害与特效随等级增长）；
- 12 种被动的精确数值，以及范围属性对下一击的影响；
- 难度血量倍率与时间成长曲线在生成时冻结；
- 高难度 180 秒循环的事件编排与游标复位；
- 局末结算的一次性入账，以及重开后货币保留。

CI 在每次推送与 Pull Request 上运行 `test → typecheck → lint → build` 全流程。

## CI/CD 与在线部署

推送到 `main` 后，`pages.yml` 依次执行依赖安装、校验与构建，并通过 `configure-pages` / `upload-pages-artifact` / `deploy-pages` 发布到 GitHub Pages（Pages 来源已设为 **GitHub Actions**）。

线上地址：**https://cangyuyi.github.io/midnight-survivors/**

> 在访问较慢的网络下首次打开，可能需要等待脚本下载完成；加载后浏览器会缓存，后续打开更快。

## 项目结构

```text
src/
├── engine/
│   ├── random.ts    # xorshift32 确定性 PRNG
│   ├── grid.ts      # 空间哈希网格 + 桶对象池
│   ├── loop.ts      # 固定步长累加器循环
│   ├── input.ts     # 键鼠输入 → InputState
│   ├── sprites.ts   # Canvas 程序化精灵
│   ├── audio.ts     # Web Audio 合成
│   └── camera.ts
├── game/
│   ├── content.ts   # 武器/被动/角色/难度/敌潮/事件等全部数值
│   ├── world.ts     # 与 React/DOM 隔离的核心模拟（SoA 池 + 战斗系统）
│   ├── render.ts    # Canvas 渲染层
│   └── host.ts      # RAF 驱动、快照节流、事件 → 音效/震动边界
├── ui/
│   └── App.tsx      # 订阅快照的 HUD、菜单、升级、暂停与结算
└── main.tsx
tests/               # 无头确定性数值回归
.github/workflows/   # ci.yml（校验）/ pages.yml（构建与发布）
```

## 浏览器兼容性

面向近期版本的现代浏览器（Chrome / Edge / Firefox / Safari），依赖 Canvas 2D、Web Audio、`requestAnimationFrame` 与 `localStorage`。游戏以键鼠体验为核心，触屏设备可打开但未做专门适配。

## 许可

当前仓库**尚未指定开源许可证**；在许可证确定之前保留所有权利，请勿默认其可被再发布或商用。
