// Original LINKING onboarding. All narrative content is editable in the admin console.
export const initialChapter = {
  id: 'first-signal', title: '第一章 · 接入信号', subtitle: '每一段被记录的经历，都可以成为新的起点。',
  order: 0, opensAt: '', closesAt: '', locale: 'zh-CN',
  archives: [
    {id:'welcome',title:'致新来的探索者',en:'FIRST CONTACT',category:'接入记录',department:'幻想镇档案馆',date:'初始记录',lead:'档案管理员',summary:'档案馆已准备好接收你的第一条记录。',body:'欢迎来到 LINKING。\n\n这里是一座持续开放的档案馆。你可以浏览档案、完成任务，并随着管理员发布新章节继续探索。已读记录与任务进度保存在社区账号中。\n\n先读完这份接入说明，然后打开「任务与进度」。完成接入任务后，下一份档案会向你开放。',notes:['通过界面上的方向按钮或拖动阵列切换档案。','不支持三维显示的设备可以使用阅读模式，进度相同。'],requires:[]},
    {id:'signal',title:'未署名的信号',en:'AN UNSIGNED SIGNAL',category:'接入记录',department:'信号观测室',date:'观测记录 001',lead:'值班观察员',summary:'一次普通的巡检，留下了一段简短的留言。',body:'巡检记录：所有链路正常。\n\n屏幕上的文字只有一句：「当你不知道从何开始，就记住相遇的地方。」\n\n边缘还有一行铅笔小字：验证口令是「幻想镇」。这只是档案馆的接入练习；之后的章节，将由社区一起书写。',notes:['请在任务「回应信号」中输入找到的口令。'],requires:['orientation']},
    {id:'open-ended',title:'尚未写下的故事',en:'AN OPEN HORIZON',category:'探索手记',department:'共同创作室',date:'持续开放',lead:'每一位探索者',summary:'档案已经连接，下一段故事留给你。',body:'接入验证完成。\n\n档案馆不按固定月份清空进度。每个章节独立保存，管理员可以继续添加档案、安排开放日期，或者发布需要人工确认的探索任务。\n\n你可以提交一段自己的探索手记。管理员审核通过后，这次接入流程便告完成。',notes:['请勿在任务提交中填写密码、令牌或其他私人凭据。'],requires:['reply-signal']}
  ],
  tasks: [
    {id:'orientation',title:'完成接入',description:'阅读「致新来的探索者」。',type:'read',archiveId:'welcome',requires:[]},
    {id:'reply-signal',title:'回应信号',description:'阅读「未署名的信号」，输入其中的验证口令。',type:'code',answer:'幻想镇',requires:['orientation']},
    {id:'field-note',title:'留下一段探索手记',description:'写下你希望在幻想镇探索的地方。提交后由管理员确认。',type:'manual',requires:['reply-signal']}
  ]
};
