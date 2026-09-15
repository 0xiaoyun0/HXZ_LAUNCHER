<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue";
import {
  task,
  taskCount,
  taskDetailsOpen,
  logs,
  bytesLabel,
  invoke,
  perform
} from "../lib/launcher";
const query = ref(""),
  errorsOnly = ref(false),
  now = ref(Date.now());
let timer: ReturnType<typeof setInterval>;
onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now();
  }, 1000);
});
onUnmounted(() => clearInterval(timer));
const matches = (s: string) =>
  s.toLowerCase().includes((query.value || "").trim().toLowerCase());
const steps = computed(() => task.steps.filter(s => matches(s.phase)));
const lines = computed(() =>
  logs.filter(
    s =>
      matches(s) &&
      (!errorsOnly.value ||
        /error|exception|failed|失败|错误|超时|异常|取消/i.test(s))
  )
);
const seconds = (from: number, to = now.value) =>
  Math.max(0, Math.floor((to - from) / 1000));
const hint = computed(() => {
  const text = task.failure + " " + task.phase;
  if (/Java|JVM|版本过低|本机运行库/i.test(text))
    return "在设置中选择符合此游戏版本要求的 Java，再重试。";
  if (/账号|认证|登录|令牌/.test(text))
    return "在皮肤站账号中重新登录并选择角色，再启动游戏。";
  if (/下载|连接|超时|fetch|网络|校验/i.test(text))
    return "可在设置中切换下载来源后重试；已通过校验的文件会复用。";
  if (/权限|占用|EPERM|EACCES/i.test(text))
    return "关闭占用文件的游戏或程序，并检查游戏目录的写入权限。";
  return "安装可用相同实例名称重试；启动可直接重试。详细原因可搜索下方日志或导出给管理员。";
});
</script>
<template>
  <q-dialog v-model="taskDetailsOpen.value">
    <div class="task-details panel">
      <header class="task-detail-heading"
        ><div
          ><small>当前任务</small><h2>{{ task.phase }}</h2></div
        ><q-btn flat round icon="close" title="收起任务详情" v-close-popup
      /></header>
      <q-linear-progress
        :indeterminate="task.busy && !task.total"
        :value="task.total ? Math.min(1, task.completed / task.total) : 0"
        rounded
        size="6px"
      />
      <div class="task-metrics"
        ><strong>{{ taskCount || (task.failure ? "未完成" : "已结束") }}</strong
        ><span>当前阶段进度</span
        ><span v-if="task.busy"
          >{{ seconds(task.steps.at(-1)?.started || task.started) }} 秒</span
        ><span v-if="task.received"
          >已接收 {{ bytesLabel(task.received) }} ·
          {{
            bytesLabel(
              task.busy && seconds(task.sampleAt) < 2 ? task.speed : 0
            )
          }}/s</span
        ></div
      >
      <p v-if="task.busy" class="task-activity"
        >{{ seconds(task.updated) }} 秒前进度有变化<span v-if="task.lastLogAt">
          · {{ seconds(task.lastLogAt) }} 秒前收到日志</span
        ></p
      >
      <div v-if="task.failure" class="task-failure"
        ><strong>{{ task.failure }}</strong
        ><p>{{ hint }}</p></div
      >
      <q-input
        v-model="query"
        outlined
        dense
        clearable
        placeholder="搜索步骤、文件或日志"
        @clear="query = ''"
        ><template #prepend><q-icon name="search" /></template
      ></q-input>
      <div class="task-detail-body">
        <ol class="task-steps"
          ><li
            v-for="(step, i) in steps"
            :key="step.started + ':' + i"
            :class="step.status"
            ><q-icon
              :name="
                step.status === 'failed'
                  ? 'error_outline'
                  : step.status === 'cancelled'
                    ? 'stop_circle'
                    : step.status === 'done'
                      ? 'check_circle'
                      : 'hourglass_top'
              "
            /><div
              ><strong>{{ step.phase }}</strong
              ><small
                >{{ seconds(step.started, step.ended || now) }} 秒<span
                  v-if="step.total && step.unit !== 'bytes'"
                >
                  · {{ step.completed }} / {{ step.total }}
                  {{ step.unit }}</span
                ></small
              ></div
            ></li
          ></ol
        >
        <div class="task-inspector"
          ><h3
            >正在处理 <span v-if="task.detail">· {{ task.detail }}</span></h3
          ><ul
            v-if="task.busy && task.activeFiles.some(matches)"
            class="task-files"
            ><li v-for="file in task.activeFiles.filter(matches)" :key="file">{{
              file
            }}</li></ul
          ><p v-else class="subtle">{{
            task.busy
              ? "此步骤未提供文件进度，查看下方日志。"
              : "任务已结束，步骤与日志已保留。"
          }}</p
          ><div class="task-log-heading"
            ><h3>运行日志</h3
            ><q-checkbox v-model="errorsOnly" dense label="仅错误" /></div
          ><pre class="task-log-output">{{
            lines.join("\n") || "没有匹配的日志"
          }}</pre>
        </div>
      </div>
      <footer
        ><span class="subtle">保留最近 120 个步骤、1000 行日志</span
        ><q-btn
          flat
          icon="download"
          label="导出日志"
          @click="perform(() => invoke('logs.export'))" /><q-btn
          v-if="task.busy"
          outline
          label="取消任务"
          @click="perform(() => invoke('task.cancel'))"
      /></footer>
    </div>
  </q-dialog>
</template>
