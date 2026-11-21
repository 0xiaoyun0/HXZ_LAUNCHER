// Runs inside the installed WebView. Range measures each rendered line, including wrapped labels.
export function scan(rootSelector) {
  const root = document.querySelector(rootSelector || '[role="dialog"][data-state="open"]') || document.querySelector('.launcher-frame');
  if (!root) throw new Error('缺少要检查的窗口');
  const panels = '.desk-card,.desktop-panel,.preference-section,.default-server-card,.direct-game-card,.catalog-panel,.forum-page,.forum-detail,.forum-compose,.content-card,.shop-product,.blueprint-card,.play-calendar,.pt-toolbar,.check-list,.lobby-block,.lobby-secondary,.lobby-banner,.chat-main,.people-panel,.empty-board,.launcher-updates,.playtime-summary,.instance-lines,.inventory-ui,.player-now,.setting-group,.activity-card';
  const fields = 'textarea,select,input:not([type]),input:is([type=text],[type=search],[type=password],[type=email],[type=url],[type=number])';
  const controls = '.small-action,.launch-primary,.button,.hub-button,.select,.settings-rail>a,.launcher-bar nav>a,.social-sections>a,.choice-option>span,.pt-tabs>button,.segmented>button,.menu-item,.workspace-choice,.design-choice,.wallpaper-modes button,.board-size-toggle,#linking-host button,.activity-card button';
  const dividedRows = '.setting-line,.memory-setting,.check-row,.board-card-heading,.preference-section>h2,.desktop-panel>h2,.module-setting,.instance-line,.dialog-sections>footer';
  const cache = new Map(), minima = new Map(), failures = new Map(), owners = new Set();
  const ignored = 'svg,script,style,option,[hidden],[aria-hidden=true]';
  function info(el) {
    if (cache.has(el)) return cache.get(el);
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    const edge = ['Left','Right','Top','Bottom'].map(side => parseFloat(s['border'+side+'Width']) || 0);
    let rule, measuredSides;
    if (el.matches('[role=dialog]')) rule = [16,12];
    else if (el.matches(controls)) rule = [8,4];
    else if (el.matches(panels) && edge.every(Boolean)) rule = [14,10];
    else if (el.matches('.inline-error,.issue-help,.empty-line,.desk-empty,[role=alert]') && edge.every(Boolean)) rule = [10,6];
    else if (el.matches(dividedRows) && (edge[2] || edge[3])) {
      rule = [0,6];
      measuredSides = [false,false,edge[2]>0,edge[3]>0];
    }
    const value = {s,r,edge,rule,measuredSides};
    cache.set(el,value);
    return value;
  }
  function measure(el, rect, rule, kind) {
    const {r,edge,measuredSides} = info(el);
    const key = kind || String(el.classList[0] || el.tagName.toLowerCase());
    owners.add(el);
    const gaps = [rect.left-r.left-edge[0],r.right-edge[1]-rect.right,rect.top-r.top-edge[2],r.bottom-edge[3]-rect.bottom];
    for (const [i,gap] of gaps.entries()) {
      if (measuredSides && !measuredSides[i]) continue;
      const name = key+' '+['左','右','上','下'][i], limit = rule[i < 2 ? 0 : 1];
      const actual = Math.round(gap*10)/10;
      minima.set(name,Math.min(minima.get(name) ?? Infinity,actual));
      if (gap+0.65 < limit && (!failures.has(name) || gap < failures.get(name).gap)) failures.set(name,{gap:actual,limit});
    }
  }
  // Ellipses and independently scrolling lists only paint the visible portion of a line.
  function clip(rect, el) {
    const {r,s} = info(el);
    if (s.overflowX !== 'visible' && el.clientWidth) {
      const left = r.left+el.clientLeft, right = left+el.clientWidth;
      const ellipsis = s.textOverflow === 'ellipsis';
      rect.left = Math.max(rect.left,left+(ellipsis ? parseFloat(s.paddingLeft) : 0));
      rect.right = Math.min(rect.right,right-(ellipsis ? parseFloat(s.paddingRight) : 0));
    }
    if (s.overflowY !== 'visible' && el.clientHeight) {
      rect.top = Math.max(rect.top,r.top+el.clientTop);
      rect.bottom = Math.min(rect.bottom,r.top+el.clientTop+el.clientHeight);
    }
  }
  const tree = document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  while (tree.nextNode()) {
    const node = tree.currentNode, parent = node.parentElement, value = node.textContent.trim();
    if (!value || !parent || parent.closest(ignored) || info(parent).s.visibility !== 'visible') continue;
    let box = parent;
    while (box && info(box).s.display === 'contents') box = box.parentElement;
    if (!box?.checkVisibility()) continue;
    const range = document.createRange(), start = node.textContent.indexOf(value);
    range.setStart(node,start);
    range.setEnd(node,start+value.length);
    for (const line of range.getClientRects()) {
      const rect = {left:line.left,right:line.right,top:line.top,bottom:line.bottom};
      for (let el=parent; el; el=el.parentElement) {
        if (rect.right <= rect.left || rect.bottom <= rect.top) break;
        const {rule} = info(el);
        if (rule) measure(el,rect,rule);
        if (el === root) break;
        clip(rect,el);
      }
    }
  }
  // Native editors paint text inside the content box. Include borderless editors inside search controls.
  for (const field of root.querySelectorAll(fields)) {
    if (field.closest(ignored)) continue;
    const {r,s,edge} = info(field);
    if (!r.width || !r.height || s.visibility !== 'visible' || !field.checkVisibility()) continue;
    const owner = edge.every(Boolean) ? field : field.closest('.instance-toolbar label,.search-box,.search-field,.search-input');
    if (!owner) continue;
    measure(owner,{
      left:r.left+edge[0]+parseFloat(s.paddingLeft),right:r.right-edge[1]-parseFloat(s.paddingRight),
      top:r.top+edge[2]+parseFloat(s.paddingTop),bottom:r.bottom-edge[3]-parseFloat(s.paddingBottom)
    },[10,4],(owner.classList[0] || field.type || field.tagName.toLowerCase())+' 输入区');
  }
  const issues = [...failures].map(([key,{gap,limit}])=>key+'侧留白 '+gap+' px，要求 '+limit+' px');
  return {inspected:owners.size,issues,minima:Object.fromEntries(minima)};
}

// Compare actual neighbouring controls with the gap supplied by their container, at any zoom or width.
export function cardHeadingIssues() {
  const issues=[];
  for(const header of document.querySelectorAll('main [data-card-id] > header, main header.section-heading')) {
    const title=header.querySelector(':scope > h1, :scope > h2');
    if(!title||!header.getClientRects().length)continue;
    const group=header.querySelector(':scope > .heading-actions');
    const actions=[...(group||header).children].filter(el=>el!==title&&el.getBoundingClientRect().width>0);
    if(!actions.length)continue;
    const style=getComputedStyle(header),rect=header.getBoundingClientRect(),edge=rect.right-parseFloat(style.paddingRight)-parseFloat(style.borderRightWidth);
    const expected=parseFloat(getComputedStyle(group||header).columnGap)||0;
    const boxes=actions.map(el=>el.getBoundingClientRect());
    const lines=[];
    for(const box of boxes) {
      let line=lines.find(row=>row[0].top<box.bottom-1&&row[0].bottom>box.top+1);
      if(!line){line=[];lines.push(line);}
      line.push(box);
    }
    const label=title.textContent.trim();
    for(const line of lines){
      if(Math.abs(edge-line.at(-1).right)>2)issues.push(label+' 的操作没有对齐卡片右侧');
      for(let i=1;i<line.length;i++)if(Math.abs(line[i].left-line[i-1].right-expected)>2)issues.push(label+' 的操作之间出现了多余空白或重叠');
    }
    const h=title.getBoundingClientRect();
    for(const b of boxes)if(Math.min(h.right,b.right)-Math.max(h.left,b.left)>2&&Math.min(h.bottom,b.bottom)-Math.max(h.top,b.top)>2)issues.push(label+' 的标题与操作重叠');
  }
  return issues;
}
