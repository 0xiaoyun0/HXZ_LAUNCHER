# 关键回归

从 next 项目根目录运行，使用隔离的回环 HTTP 和 .runtime 临时文件，不连接真实社区或玩家实例。下载测试需要已经构建的 Java 辅助 JAR，以及 JAVA_HOME 指向 JDK 21。

- node scripts/tests/download-tail.mjs：Java 与 Node 持续低速尾文件换源和最终哈希。
- node scripts/tests/download-retry-budget.mjs：正常传输超过重试预算后仍可恢复中断。
- node scripts/tests/werewolf.mjs：私密角色、过期行动、完整结算及机器人练习规则。

测试使用缩短的故障窗口，不作为公网速度基准。
