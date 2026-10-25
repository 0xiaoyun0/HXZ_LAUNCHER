// Additive, opt-in draft expansion. Never replace the author's live opening.
export const story081Items=[
 {id:'linking-paired-index',title:'双页索引片',description:'记录着 0479 与 0480 的档案索引。编号之间的细线，标记了一处尚待追查的断层。'},
 {id:'linking-whitebranch-receipt',title:'白枝借阅回执',description:'档案馆签发的借阅回执。纸面泛着一圈暖光，印章下留有两个字：白枝。'},
 {id:'linking-observer-seal',title:'观察者印记',description:'你的第一份观察札记已收入档案。印记中央是一只未闭合的眼，提醒持有者继续寻找答案。'},
 {id:'linking-audio-key',title:'回声索引片',description:'白枝借阅回执背面的纹路已被重新辨认。它为档案馆音频终端标出一条可用的检索路径。'},
 {id:'linking-lamp-signal',title:'归途灯标',description:'一枚能记录行进方向的小灯标。它指向档案馆东侧的第七道门，也为归来的人留下一点光。'}
];
export const story081Expansions={story:{archives:5,tasks:9,items:5},music:{archives:1,tasks:1,items:1},signal:{archives:1,tasks:1,items:1}};
export function expandArchiveSignal081(source){
 const c=structuredClone(source);
 if(!c.archives?.some(a=>a.id==='snow-ash-resonance')||!['snow-ash-restore-audio','snow-ash-field-note'].every(id=>c.tasks?.some(t=>t.id===id)))throw Object.assign(Error('请先加入回声归档和观察札记任务，再追加归途灯标'),{status:400});
 if(c.archives.some(a=>a.id==='snow-ash-return-signal')||c.tasks.some(t=>t.id==='snow-ash-light-signal'))throw Object.assign(Error('草稿已包含归途灯标，请直接编辑现有内容；不会覆盖或重复导入'),{status:409});
 const requires=['snow-ash-restore-audio','snow-ash-field-note'];
 c.archives.push({id:'snow-ash-return-signal',title:'归途灯标 · 第七道门',en:'A SIGNAL TO RETURN',category:'馆内记录',department:'档案馆东廊',date:'观察札记归档之后',lead:'探索者、档案馆记录员',summary:'同样的三次轻响，出现在一段录音和一扇尚未开启的门后。',requires,notes:['回声来自哪一段记录、门后由谁留下信号，均尚未得到证实。下一次调查应从东廊第七道门开始。','完成本记录可在启动器外观中选用档案灯标；不会自动替换当前主题或标志。'],body:'你的观察札记送回时，页边多了一道细细的铅笔线。记录员没有在推测旁写下答案，只圈出了你记住的那段停顿。\n\n音频终端再次播放回声。风声之后，传来三次间隔相等的轻响。你原先以为它们属于门闩；这一次，第三声结束时，档案馆东侧也传来一声回应。\n\n你们沿着书架之间的窄道走过去。地面一条被灰尘遮住的导向线，在清理后露出旧编号：东廊，七。线路并未通向借阅室，而是止在一扇没有门牌的窄门前。\n\n记录员把音频终端带来的索引片贴近墙面。门缝里的指示灯短暂亮起，一张折叠过的纸从旁边的槽口滑出。纸上只有半幅路线，最末端画着一盏灯，背面写着：\n\n“先留下归途，再向前走。”\n\n门没有打开。轻响也没有再次出现。你把可确认的内容记在札记末尾：声音出现了对应，东廊存在未编入目录的路线，第七道门仍然关闭。至于门后的人是谁，现有记录还不足以回答。\n\n记录员取出一枚便携灯标，交给你固定在岔路口。灯的轮廓在控制台一角留下同样的标记。它不会替你决定下一步，只在离开时记住你从哪里来。\n\n新线索已登记：东廊第七道门。等下一份记录抵达，就从这里继续。'});
 c.tasks.push({id:'snow-ash-light-signal',title:'留下归途的光',description:'完成回声归档，并让观察札记通过审核，再阅读「归途灯标 · 第七道门」。获得可在外观中选用的档案灯标。',type:'read',archiveId:'snow-ash-return-signal',requires:[...requires],effect:'archive-signal',reward:{item:'linking-lamp-signal',quantity:1}});
 return c;
}
export function expandMusicArchive081(source){
 const c=structuredClone(source);
 if(!c.archives?.some(a=>a.id==='snow-ash-whitebranch')||!c.tasks?.some(t=>t.id==='snow-ash-read-whitebranch'))throw Object.assign(Error('请先加入白枝门槛档案与对应的阅读任务，再追加回声归档'),{status:400});
 if(c.archives.some(a=>a.id==='snow-ash-resonance')||c.tasks.some(t=>t.id==='snow-ash-restore-audio'))throw Object.assign(Error('草稿已包含回声归档，请直接编辑现有内容；不会覆盖或重复导入'),{status:409});
 c.archives.push({id:'snow-ash-resonance',title:'回声归档 · 重新接通',en:'ECHOES RETURNED',category:'馆内记录',department:'音频档案室',date:'白枝借阅之后',lead:'档案馆记录员',summary:'借阅回执背面，有一行曾被噪声覆盖的索引。',requires:['snow-ash-read-whitebranch'],notes:['音频档案界面将在读完本记录后开放。原有歌曲、播放队列与一起听仍然保留；在线音乐的账号授权不受影响。'],body:'你把白枝借阅回执放回归还槽，面板没有立刻收走它。纸面背后的细线在灯下显现，与一旁熄灭已久的音频终端接成同一段纹路。\n\n“归还的并不只有影像。”记录员调低了指示灯，示意你听。\n\n很轻的底噪里，先响起一阵风。接着是靴底踩过积雪的声音，纸包展开的窸窣声，以及门闩被缓慢拨开的轻响。它们没有填补影像中失去的部分，只把那些确实发生过的片刻重新放回了原处。\n\n记录员把最后一条索引归位。层叠的透明唱片匣逐一亮起，一枚新的索引片停在你面前。\n\n“听见了什么，就记下什么。听不清的，不必替它回答。”\n\n终端显示：回声已归档，音频检索通道恢复。\n\n今后，你可以从音乐栏目继续使用这台终端。旧有的歌单仍在，新的排列已经准备好。'});
 c.tasks.push({id:'snow-ash-restore-audio',title:'让回声归位',description:'在白枝借阅之后，阅读「回声归档 · 重新接通」。完成后音乐栏目会开放档案馆样式。',type:'read',archiveId:'snow-ash-resonance',requires:['snow-ash-read-whitebranch'],effect:'music-archive',reward:{item:'linking-audio-key',quantity:1}});
 return c;
}
export function expandStory081(source){
 const c=structuredClone(source),old=c.archives||[];
 const snow=old.find(a=>a.title.includes('0479')&&a.title.includes('雾间雪'));
 const miko=old.find(a=>a.title.includes('0480')&&a.title.includes('雾间见子'));
 if(!snow||!miko)throw Object.assign(Error('请在含有 0479 雾间雪与 0480 雾间见子记录的原章节中使用此拓展'),{status:400});
 const reward=item=>({item,quantity:1});
 const archives=[
  {id:'snow-ash-silver-gate',title:'断层影像 01 · 银门雪夜',en:'SNOW AT THE SILVER GATE',category:'断层影像',department:'来源待考',date:'时间戳缺失',lead:'芸伊',summary:'两页索引之间，出现了一段不属于实验室的风雪。',requires:['snow-ash-index'],notes:['影像中的人名与实验编号不存在已确认的对应关系。不要把缺失的部分补写成结论。'],body:'索引校对完成。控制面板的蜂鸣声突然停下，一段没有编号的影像从两份实验记录之间浮现。记录来源、年代与实验室的关系均无法确认。\n\n银色拱门下，一个赤着脚的孩子坐在雪中。门内有三道人影，其中一道向她伸出手。她往后退，霜便沿门柱爬升。\n\n她记不起来路，也说不出自己的年纪。她能确认的只有名字——芸伊。\n\n远处出现一盏提灯。提灯的人穿着灰大衣，在十步之外停下。他把灯放在雪上，又把短刀连鞘丢远，举起空着的双手。\n\n“我停在这里。”\n\n影像在这句话之后短暂失真。面板没有给出人物身份鉴定，只留下了灯与雪的颜色。'},
  {id:'snow-ash-ten-steps',title:'断层影像 02 · 十步之外',en:'TEN PACES',category:'断层影像',department:'来源待考',date:'与前段连续',lead:'赞恩·维尔',summary:'递来的大衣与面包，先停在她能够自己拿到的地方。',requires:['snow-ash-read-gate'],notes:['损坏的部分仍然缺失。记录员应保留空白，不以推测替代证据。'],body:'灰衣人把油纸包和大衣推到芸伊伸手可及的地方，随后退回原处。\n\n“面包和衣服都放这里。我不过去，你自己拿。”\n\n她等待很久，才把冻硬的黑面包和衣服收进怀里。他没有催促，也没有索取交换条件。他告诉她，自己叫赞恩·维尔。\n\n追问记忆让芸伊感到疼痛。她想离开，却在雪地里失去平衡。赞恩赶上前，护住她的额头，扶住她的肩膀。霜冻封住了他的手套和半截小臂，他仍等到她站稳才退开。\n\n“只有名字。别的都不知道。”\n\n赞恩听见后停止追问。\n\n观察附注：记录能证明他采取了哪些行动，不能据此推断他知道银门的全部秘密。回到最初的相遇，他主动停下的位置，是距离芸伊十步之外。'},
  {id:'snow-ash-whitebranch',title:'断层影像 03 · 白枝门槛',en:'A LAMP AT WHITEBRANCH',category:'断层影像',department:'白枝孤儿院',date:'同一雪夜',lead:'芸伊、赞恩',summary:'门内有灯。是否跨过门槛，仍由她自己决定。',requires:['snow-ash-distance'],notes:['借阅完成后，控制面板将签发回执。原始影像仍由档案馆保管。'],body:'赞恩提到一处叫白枝孤儿院的地方。那里有人留灯，也有人等着晚归的人。\n\n芸伊不愿立刻把手交给他。赞恩没有替她作决定。他说明该怎样示意停下，也确实在她需要时停住。大衣、面包和被准确叫出的名字，成为她眼下能够确认的几件事。\n\n影像最后停在一扇门前。屋内的暖光落到磨亮的木门槛上。芸伊自己抬起脚，跨了过去。\n\n读取结束。\n\n控制面板重新亮起，0479 与 0480 的记录仍在原处。这段雪夜没有替实验记录回答任何问题，却留下另一种观察方法：先记下发生过的事，再承认那些仍然未知的事。\n\n档案馆为本次阅读生成一张“白枝借阅回执”。下一条线索出现之前，请把它和你的观察札记一同保存。'}
 ];
 const tasks=[
  {id:'snow-ash-read-0479',title:'复核第一份实验记录',description:'阅读原档案「实验模拟编号0479-雾间雪」。原有已读记录继续有效。',type:'read',archiveId:snow.id,requires:[]},
  {id:'snow-ash-read-0480',title:'复核第二份实验记录',description:'阅读原档案「实验模拟编号0480-雾间见子」，比较两份记录。',type:'read',archiveId:miko.id,requires:['snow-ash-read-0479']},
  {id:'snow-ash-index',title:'校对残缺索引',description:'按先后次序输入两份实验记录的四位编号，用半角短横线连接，例如 0000-0001。',type:'code',answer:'0479-0480',requires:['snow-ash-read-0480'],reward:reward('linking-paired-index')},
  {id:'snow-ash-read-gate',title:'读取银门影像',description:'阅读「断层影像 01 · 银门雪夜」，辨认记录中能够确认的事实。',type:'read',archiveId:'snow-ash-silver-gate',requires:['snow-ash-index']},
  {id:'snow-ash-distance',title:'记住那段距离',description:'阅读「十步之外」，输入赞恩最初主动停下时与芸伊的距离，使用中文。',type:'code',answer:'十步',requires:['snow-ash-read-gate']},
  {id:'snow-ash-read-whitebranch',title:'把选择留在门前',description:'读完「白枝门槛」。',type:'read',archiveId:'snow-ash-whitebranch',requires:['snow-ash-distance'],reward:reward('linking-whitebranch-receipt')},
  {id:'snow-ash-field-note',title:'提交观察札记',description:'从实验记录或雪夜影像中写下两条能确认的事实，以及一个尚无答案的问题。无需猜中隐藏设定，管理员按是否区分事实与推测审核。',type:'manual',requires:['snow-ash-read-whitebranch'],reward:reward('linking-observer-seal')}
 ];
 const present=new Set([...c.archives,...(c.tasks||[])].map(v=>v.id));
 if([...archives,...tasks].some(v=>present.has(v.id)))throw Object.assign(Error('章节已包含此拓展的标识，请直接编辑现有草稿；不会覆盖或重复导入'),{status:409});
 c.archives.push(...archives);c.tasks=[...(c.tasks||[]),...tasks];
 return expandArchiveSignal081(expandMusicArchive081(c));
}
