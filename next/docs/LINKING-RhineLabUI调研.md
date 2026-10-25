# LINKING · RhineLabUI 移植调研

调研日期：2026-10-11。上游基线：[LBEILC/RhineLabUI，提交 `12cc5e4013acb9408f753ff71de6b8492299b7c8`](https://github.com/LBEILC/RhineLabUI/commit/12cc5e4013acb9408f753ff71de6b8492299b7c8)，提交时间 2026-10-08。仅检查上游源码、上游资源声明及平台官方文档；未读取或复用此前 LINKING / Arcana 内容和实现。以下是静态调研结论，不是三端运行验收。

**结论：适合完整移植为长期活动的三维档案前端。** 现有实现已覆盖开场、循环阵列、解密阅读、检索收藏、独立模型查看和画质设置；长期内容维护需要解除固定档案数量，并补活动数据、宿主生命周期及权限接口。第三方品牌、采样和字体分别适用自身权利，不能因仓库标为 MIT 就统一视为可自由再分发。[上游说明](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/README.md#开源许可)

## 授权与资产

| 范围 | 核查结论 | 移植要求 |
| --- | --- | --- |
| 作者原创代码、建模脚本、GLB、Blender 工程、原创音乐及音效 | 作者明确纳入 MIT，包括非代码资源及随应用安装包分发；必须保留 Copyright (c) 2026 LBEILC 和许可证 | 记录上游提交，随发行保留 LICENSE、来源和修改说明。[LICENSE](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/LICENSE)、[授权范围](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/README.md#开源许可) |
| 明日方舟／莱茵生命名称、标志、设定、原作视觉设计及其在模型、界面、截图、示例文本中的呈现 | 上游明确排除，不具有代原权利人授权的能力；重新建模不消除这些排除项 | 完整技术移植可以保留可替换接口；面向持续发行的版本应落实相应权利依据或替换涉及的品牌、示例设定和图形。保留上游作者署名不能代替第三方授权。[排除条款](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/README.md#开源许可) |
| 音频 | 三轨 Ogg 和原创合成音效适用仓库许可；`src/typing-samples.ts`、`typing-preview.wav` 含原 PV 三个各 38ms 的短音，及其衍生片段明确不属原创配乐 MIT | 若采用可持续自行分发的资产集，替换这三段采样为原创合成反馈，保留原创音乐及源谱。[音频资源声明](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/public/audio/README.md) |
| MiSans | 随源许可允许用于应用等作品；要求软件明确署名，字体副本保留版权和协议，限制改编／二次开发及独立字体分发 | 保留 `NOTICE.txt` 与 `MiSans-license.pdf` 和应用内署名。当前源码已采用 `misans-webfont@4.3.1` 分包；分包工具的 Apache-2.0 不替代字体许可，不自行再转换或裁切字形。[字体 NOTICE](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/public/fonts/NOTICE.txt)、[随源字体许可原文](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/public/fonts/MiSans-license.pdf) |
| Novecento | Git 含固定短语轮廓图形和声明，不含字体；上游网站的年度、单域名 Webfont 许可不转授给派生应用 | 保留图形来源声明；不得从生产网站提取 WOFF2 随客户端分发。改文案可走普通文字回退或另行取得所需许可；MyFonts 将网页与移动应用嵌入区分为不同许可类别。[图形声明](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/public/assets/boot-lettering-notice.txt)、[上游接入记录](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/verification/BOOT-LETTERING.md)、[MyFonts 许可说明](https://www.myfonts.com/pages/faq#licensing) |
| Rolling Number / Three.js | 锁文件版本分别为 0.4.1 / 0.183.2，均 MIT | 保留各自版权与许可，包含上游对 rolling-number 的补丁步骤。[Rolling Number 许可](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/public/licenses/rolling-number.txt)、[依赖锁文件](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/package-lock.json) |

许可尚不能据此确认的部分包括第三方原作视觉元素的使用范围，以及字体分包加工本身是否获得额外许可。本报告记录源文件给出的授权，不把上游分发行为视为第三方授权证明。

## 实现与性能边界

- 原生 TypeScript + Three.js + DOM/SVG，Vite 锁定 7.3.6；构建环境与宿主运行时分开。Vite 的 Node 条件为 `^20.19.0 || >=22.12.0`；实际内容检查还使用 Node 的类型剥离参数，建议保持上游推荐的 Node 22.12+ / 24 构建。成品是静态网页，不要求运行 Node 后端。[package.json](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/package.json)、[锁文件](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/package-lock.json)
- 保真核心是时间轴、相机和材质连续性：档案抽取主要沿竖直方向，相机负责靠近和构图；阵列、正文解密、查看器分别由已有模块配合。直接移植这些模块能保留动态效果，重画静态页面无法代表完整交互。[DESIGN](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/DESIGN.md)
- 两个生产 GLB 合计 6,908,860 字节，约 6.59 MiB；上游当前 PWA 文档称全量离线资源约 34 MiB。README 对字体“四个完整 WOFF2”的描述早于当前分包实现，应以资源清单和实际产物为准。[模型目录](https://github.com/LBEILC/RhineLabUI/tree/12cc5e4013acb9408f753ff71de6b8492299b7c8/public/assets)、[PWA 文档](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/docs/PWA.md)、[字体 NOTICE](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/public/fonts/NOTICE.txt)
- 默认原始画质含 2048 阴影、32 次 AO、景深及透射；普通性能档仍保留 1024 阴影。超级性能模式进一步关闭后处理、弱化背景玻璃并限制三维像素至 921,600，同时保留动作计算，适合做低配起始策略，但必须由真实设备验证最终观感。[画质源码](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/src/render-quality.ts)、[超级性能记录](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/verification/SUPER-PERFORMANCE.md)
- 上游已包含共享实例缓冲、静止画面复用和深度通道复用；测试主要来自 RTX 5070 Ti Laptop、Edge 与 CEF/Chrome 146。不能据此承诺旧 Windows 或 Android 的帧率。共享深度依赖 Three.js 0.183.2 的 SSAOPass 扩展点，升级 Three 必须重跑视觉及回退路径；新增材质／光源输入须进入渲染缓存失效条件。[性能报告](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/verification/PERFORMANCE.md)

## 三端可行性

| 目标 | 判断 | 必要验证与适配 |
| --- | --- | --- |
| Electron 44 | 可作为完整三维体验的主要桌面目标；官方 44 系列使用 Chromium 152 | 验证真实 GPU、WebGL 上下文、安装包资源路径、离开页面停止音频与渲染；页面仅经受限宿主接口访问原生能力。[Electron 44](https://www.electronjs.org/blog/electron-44-0) |
| Electron 22 / Chromium 108 | 源码层面存在可行路径；Vite 7 默认最低 Chrome 107，108 满足该构建目标。需显式固定目标并验产物，不能引用最新版 Vite 文档的 Chrome 111 门槛来判断上游 | 建议 `build.target` / `cssTarget` 明确为 `chrome108`，检查运行时 API 和 CSS；真实 Electron 22 验证透射、阴影、AO、景深、字体、触摸板与导出。Electron 22 已于 2023-10-10 结束官方支持，长期维护应将其作为冻结兼容线，不承诺持续内核安全更新。[Vite 7](https://v7.vite.dev/guide/build)、[Electron 官方终止支持说明及后续延长日期](https://www.electronjs.org/blog/windows-7-to-8-1-deprecation-notice) |
| Android 10+ WebView | 有现成响应式、指针和双指交互基础；“Android 10+”不足以确定 Chromium 版本、WebGL 2 或性能 | 检查实际 WebView 包版本和 `webgl2` 能力；低配默认较低画质，验证竖屏正文、双指操作、软键盘、安全区、退后台及恢复。打包静态资源采用可靠同源加载；原生 Android 可用 WebViewAssetLoader，避免依赖 `file://` 下的 fetch。[WebView 更新机制](https://developer.chrome.com/docs/webview)、[版本 API](https://developer.android.com/develop/ui/views/layout/webapps/managing-webview)、[本地资源官方方案](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content)、[上游响应式记录](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/verification/RESPONSIVE.md) |

Three.js 自 r163 起不再支持 WebGL 1。无 WebGL 2 的设备无法运行这套三维渲染器，降低画质不会改变该门槛。应在创建场景前检测并提供可恢复的提示／纯文本活动入口。上游载入异常目前展示“重新连接”提示，不等同于完成了低能力设备回退。[Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html)、[上游启动错误分支](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/src/main.ts#L1531)

## 长期活动的数据与宿主接口

1. **内容适配。** `content/archives.json` 是页面与 TXT 导出的同一来源，纯文本显示；现有规则固定五类、各八条、`X-001` 至 `X-040`。长期活动建议加版本化活动清单、稳定活动／档案 ID、开放时间及状态，按稳定 ID 存收藏，避免重新编号造成错指。同步泛化内容校验、导出脚本、`fileLocation` 的 `lane * 32 + row` 映射及各列刻度；循环池和业务条目数应分开，空分类必须显式处理。[内容约束](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/content/README.md)、[数据映射](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/src/data.ts)、[循环逻辑](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/src/archive-loop.ts)
2. **应用生命周期。** `main.ts` 直接绑定 document/window、写全局 DOM 并运行 RAF，没有完整应用级卸载入口；场景和查看器已有 dispose，可复用。保真移植适合独立本地页面入口；若嵌入宿主路由，应提供 mount / pause / resume / dispose，清理 RAF、音频、手柄轮询、监听和 WebGL 资源，并隔离全局样式与 ID。[页面入口](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/src/main.ts)、[场景释放](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/src/scene.ts#L75)、[手柄实现](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/src/gamepad.ts)
3. **宿主身份与持久化。** 开场身份是展示状态机，`JOYCE MOORE`、权限标签和 `rhine-settings` / `rhine-saved` 都是本地演示语义；应通过受限接口注入当前活动和显示身份，真实开放条件由宿主／服务端判断。偏好及收藏按应用、用户和活动命名空间管理，避免不同活动互相污染。[上游入口与存储](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/src/main.ts)
4. **静态资源与更新。** 网页构建默认 `base: '/'`，`assetUrl` 已集中模型、音频等路径；迁到 `/linking/` 或客户端协议时统一设置 base。上游 PWA 在生产安全上下文注册、scope 等于 BASE_URL；宿主已有更新方案时关闭其注册，避免两个更新机制控制同一页面。不得复用上游托管项目专用的字体恢复流程。[Vite 配置](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/vite.config.ts)、[assetUrl](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/src/asset-url.ts)、[PWA 注册](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/src/pwa.ts)、[字体恢复限制](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/scripts/prepare-webfonts.mjs)
5. **平台动作。** TXT 导出、外链、退出、全屏和音频启动应经过宿主适配；Android 返回键需依次关闭查看器、弹窗、详情，再返回宿主。保留可点击后解锁音频、静音继续、减少动态效果及重试能力。[启动门](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/src/startup.ts)、[平台动作入口](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/src/main.ts)

## 维护与验收建议

上游近期仍有提交，但其维护范围明确聚焦网页，不能当成对三端客户端的长期兼容承诺。保留独立的上游版本记录和小范围宿主补丁，锁定依赖，按功能吸收后续更新。[维护范围声明](https://github.com/LBEILC/RhineLabUI/blob/12cc5e4013acb9408f753ff71de6b8492299b7c8/AGENTS.md#当前维护范围)

验收应覆盖三个实际运行环境中的开场／跳过、五列双向循环、快速切换、解密与正文、收藏检索导出、查看器旋转／拆解／返回、音频开关、横竖屏、离开后资源释放及再次进入。另以低端 Android 和旧 Windows GPU 验证性能模式、上下文丢失和资源加载失败。上游内容／循环／画质脚本提供回归基础，截图和真实运行仍必需；本次调研未执行这些设备测试，不将源码检查或手机尺寸模拟记为实机通过。
