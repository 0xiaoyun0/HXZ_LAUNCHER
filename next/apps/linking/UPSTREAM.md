# LINKING 前端来源与本地适配

上游：https://github.com/LBEILC/RhineLabUI

固定提交：12cc5e4013acb9408f753ff71de6b8492299b7c8（2026-10-08）。Copyright (c) 2026 LBEILC。原创代码、模型、配乐按 MIT 使用，原文随应用保留在 public/licenses/RhineLabUI-MIT.txt。Three.js 与 Rolling Number 许可证同目录保留。MiSans 版权及许可见 public/fonts/NOTICE.txt 与 MiSans-license.pdf。

本地改动：

- 使用 LINKING / 幻想镇原创文字与档案馆标记，不使用上游的游戏设定及品牌。替换原 PV 打字采样为本地合成短音；不携带商业域名字体、原品牌字形图。
- 保留三维阵列、连续切换、档案解密、检索收藏、模型查看器及画质选项。渲染池与业务条目分离；每章档案数可变，章节持续添加。
- entry.ts、activity.ts、activity-ui.ts 和 manage.ts 接入社区鉴权、云端进度及管理员编辑；data.ts 从当前已发布章节生成展示数据，不读取静态故事。
- localization.ts 集中宿主交互文案。默认中文；内容文字由社区后台编辑。日期明确采用北京时间；不声称已经提供完整英语翻译。
- 使用本地 iframe 隔离样式与生命周期；宿主 packages/linking/host.ts 验证来源和接口路径，不向帧暴露登录令牌。关闭页面释放其 JS、WebGL 与音频上下文。
- 禁用独立 PWA/Service Worker；资源跟随启动器、APK 和社区后台打包。Three.js 版本固定为 0.183.2，编译目标 Chromium 108。
- 默认启用性能模式，保留动效；不支持 WebGL 2 时提供功能完整的阅读模式。管理员表单与任务进度均不依赖 WebGL。

只跟踪这个固定上游版本。升级 Three、模型、渲染器或时间轴之前，重新检查桌面与移动端，勿直接覆盖这些宿主适配。
