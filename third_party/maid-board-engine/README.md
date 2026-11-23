# 车万女仆棋类引擎适配

来源：[TouhouLittleMaid](https://github.com/TartaricAcid/TouhouLittleMaid)，固定提交 `8a3ac5e9eacf0c6d63adf8832949f3ce81484fe6` 的 `api/game`。

- 五子棋：anlingyi / xechat-idea，Apache-2.0。
- 中国象棋：Morning Yellow / XQWLight，GPL-2.0-or-later。
- 国际象棋：Morning Yellow / Mobile Chess (xqbase/chess)，GPL-2.0-or-later。
- 模组适配部分：TouhouLittleMaid，MIT。
- TeaVM 编译运行库：Apache-2.0；组合生成引擎及 HXZ 协议入口按 GPL-3.0-or-later 分发。

保留原始算法、评估表与搜索实现。仅删除 Minecraft NBT 序列化、模组调试日志及无关的 GomokuCodec；HXZ 增加纯数据转换入口。没有搬运游戏贴图、音效或人物资产。

0.8.6 适配补丁：三种搜索在每个完整搜索深度结束后，通过可选 `onIteration` 回调上报候选。回调不改变走法排序、评估、剪枝或搜索结果。桥接层把候选写入独立进程的 JSON 输出；服务端在思考预算到达时使用最近一个通过棋规校验的完整深度结果，并结束进程。国际象棋/中国象棋不再为备用走法重复初始化整次搜索；五子棋保留廉价的上游战术预判，随后只运行一次上游迭代加深。五档深度目标保留，预算随档位递增。

构建需要 JDK 17+、Maven：`mvn -B -ntp package`。TeaVM 将上游 Java 编译为 Node.js 可执行模块，服务端运行不再要求安装 Java。生成文件在 target/javascript/engine.cjs。发布同时携带本目录中的源码、构建配置及许可证；target 不属于源码。

引擎在独立进程中经 JSON 协议调用，只接收棋局和搜索预算并返回落子，不接触数据库、积分或账号。社区服务校验落子后再保存，玩家客户端不负责最终判定。
