import {communityImage} from '../community/image-upload.mjs';

const labels = {'lobby.host': '联机开房', 'music.netease': '网易云登录'};
const when = time => new Date(time).toLocaleString('zh-CN', {hour12: false});
const description = item => item.kind === 'voucher' ? (labels[item.permission] || item.permission) + ' · ' + item.duration + (item.unit === 'months' ? ' 个月' : ' 天') : item.kind === 'material' ? item.commission ? '材料 · 可用于委托' : '材料' : '纪念收藏';

/** Shared, text-only DOM renderer used by Electron, Android and the admin console. */
export function mountInventory(root, {request, management = false, canManage = false, dialogHost = () => {}}) {
  let alive = true, generation = 0, data, query = '', tab = 'items'; const dialogs = new Set();
  const el = (tag, value = '', cls = '') => {const node = document.createElement(tag); node.textContent = value; node.className = cls; return node;};
  const report = error => {if (!alive) return; const host = [...dialogs].at(-1) || root; let node = host.querySelector('.inventory-error'); if (!node) {node = el('p', '', 'inventory-error'); node.setAttribute('role', 'alert'); host.prepend(node);} node.textContent = error.message || String(error);};
  const button = (label, run, primary = false) => {const node = el('button', label, primary ? 'inventory-primary' : ''); node.type = 'button'; node.onclick = async () => {if (node.disabled) return; node.disabled = true; try {await run();} catch (e) {report(e);} finally {node.disabled = false;}}; return node;};
  const field = (parent, label, value = '', type = 'text') => {const wrapper = el('label', label), node = el(type === 'textarea' ? 'textarea' : 'input'); if (type !== 'textarea') node.type = type; node.value = value; wrapper.append(node); parent.append(wrapper); return node;};
  function modal(title) {
    const node = el('dialog', '', 'inventory-dialog inventory-ui'), head = el('header'), contents = el('div', '', 'inventory-form');
    const close = () => {node.close(); node.remove(); dialogs.delete(node); dialogHost(dialogs.size ? () => [...dialogs].at(-1)?.inventoryClose?.() : null);};
    node.inventoryClose = close;
    head.append(el('h2', title), button('关闭', close)); node.append(head, contents); document.body.append(node); dialogs.add(node); node.addEventListener('cancel', e => {e.preventDefault(); close();}); dialogHost(close); node.showModal(); return {node, contents, close};
  }
  function choice(parent, title, values, initial) {
    const wrapper = el('label', title), state = {value: initial ?? values[0]?.[0] ?? ''};
    const selected = () => values.find(row => row[0] === state.value)?.[1] || '请选择';
    const trigger = button(selected(), () => {const dialog = modal(title); for (const [value, label] of values) {const option = button(label, () => {state.value = value; trigger.textContent = selected(); dialog.close(); state.onchange?.(value);}); option.setAttribute('aria-pressed', String(state.value === value)); dialog.contents.append(option);}});
    trigger.classList.add('inventory-select'); trigger.setAttribute('aria-haspopup', 'dialog'); wrapper.append(trigger); parent.append(wrapper); return state;
  }
  function picture(parent, item) {
    const art = el('div', '', 'inventory-art'); parent.append(art);
    if (item.image) {const image = el('img'); image.alt = item.title; image.loading = 'lazy'; request(item.image + '/data').then(value => {if (alive && art.isConnected) {image.src = value.image; art.append(image);}}).catch(() => art.append(el('span', '图片未载入')));}
    else {const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 32 32'); svg.setAttribute('aria-hidden', 'true'); const path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', item.kind === 'voucher' ? 'M5 7h22v6a3 3 0 0 0 0 6v6H5v-6a3 3 0 0 0 0-6V7Zm16 3v3m0 6v3' : 'm16 4 11 6v13l-11 6-11-6V10l11-6Zm-11 6 11 6 11-6M16 16v13M11 7l11 6'); path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor'); path.setAttribute('stroke-width', '1.5'); path.setAttribute('stroke-linejoin', 'round'); svg.append(path); art.append(svg);}
  }
  async function load() {
    const stamp = ++generation;
    try {const value = await request(management ? '/api/admin/inventory' : '/api/inventory'); if (!alive || stamp !== generation) return; data = value; draw();} catch (e) {report(e);}
  }
  function viewItem(item) {
    const dialog = modal(item.title); picture(dialog.contents, item); dialog.contents.append(el('p', item.description), el('small', description(item)));
    if (item.kind === 'voucher') {
      const grant = data.grants?.find(row => row.permission === item.permission);
      dialog.contents.append(el('p', grant ? '当前有效至 ' + when(grant.expires) + '。使用后将顺延有效期。' : '确认使用后开始计时，使用操作不能撤销。', 'inventory-note'));
      const requestId = crypto.randomUUID(); dialog.contents.append(button('确认使用一张', async () => {const result = await request('/api/inventory/use', 'POST', {batch: item.batches[0].id, requestId}); dialog.close(); await load(); const done = modal('凭证已生效'); done.contents.append(el('p', '有效至 ' + when(result.expires)), button('完成', done.close, true));}, true));
    } else dialog.contents.append(el('p', item.commission ? '发布委托时可选择此物品作为奖励。委托通过后交付给接取人。' : '该物品保留在背包中，不会自动消耗。', 'inventory-note'));
  }
  function edit(item = {}) {
    const dialog = modal(item.id ? '编辑道具' : '新建道具'), form = dialog.contents;
    const title = field(form, '道具名称', item.title || ''), desc = field(form, '说明', item.description || '', 'textarea'); title.maxLength = 100; desc.maxLength = 4000;
    const kind = choice(form, '类型', [['material', '材料'], ['collectible', '收藏品'], ['voucher', '权限凭证']], item.kind || 'material');
    const access = el('div', '', 'inventory-form'); form.append(access);
    const permission = choice(access, '授予权限', Object.entries(data.permissions), item.permission || 'lobby.host');
    const duration = field(access, '有效时长', item.duration || 3, 'number'), unit = choice(access, '计时单位', [['days', '天（24 小时）'], ['months', '自然月']], item.unit || 'days'); duration.min = 1; duration.max = 366;
    const material = el('div'); form.append(material); const usable = choice(material, '可作为委托奖励', [[true, '允许'], [false, '不允许']], !!item.commission);
    const visibility = () => {access.hidden = kind.value !== 'voucher'; material.hidden = kind.value !== 'material';}; kind.onchange = visibility; visibility();
    const enabled = choice(form, '发放状态', [[true, '开放发放'], [false, '停止新发放']], item.enabled !== 0);
    let image = item.image || ''; const picker = field(form, '道具图片', '', 'file'); picker.accept = 'image/png,image/jpeg,image/webp';
    const preview = el('div'); form.append(preview); if (image) picture(preview, item);
    picker.onchange = async () => {if (!picker.files?.[0]) return; picker.disabled = true; try {const encoded = await communityImage(picker.files[0]), result = await request('/api/media/upload', 'POST', {scope: 'inventory', image: encoded}); image = result.url; preview.replaceChildren(); picture(preview, {...item, image});} catch (e) {report(e);} finally {picker.disabled = false; picker.value = '';}};
    form.append(button('移除图片', () => {image = ''; preview.replaceChildren();}), el('p', '修改只影响以后发放的道具，已获得凭证的权限和时长保持不变。', 'inventory-note'), button('保存道具', async () => {if (picker.disabled) throw Error('请等待图片上传完成'); await request('/api/admin/inventory/items', 'POST', {id: item.id, updated: item.updated, title: title.value, description: desc.value, kind: kind.value, permission: permission.value, unit: unit.value, duration: Number(duration.value), commission: usable.value, enabled: enabled.value, image}); dialog.close(); await load();}, true));
  }
  function distribute(code = false) {
    const available = data.items.filter(item => item.enabled); if (!available.length) throw Error('请先创建并启用道具');
    const dialog = modal(code ? '创建道具兑换码' : '邮寄道具'), form = dialog.contents;
    const item = choice(form, '道具', available.map(row => [row.id, row.title])), quantity = field(form, '每人数量', 1, 'number'); quantity.min = 1; quantity.max = 99999;
    const requestId = crypto.randomUUID();
    if (code) {
      const codeField = field(form, '自定义兑换码'), start = field(form, '开始时间（本机时区）', '', 'datetime-local'), end = field(form, '结束时间（不填则长期）', '', 'datetime-local'), maximum = field(form, '总领取次数（0 为不限）', 0, 'number');
      codeField.maxLength = 64; maximum.min = 0;
      form.append(el('p', '每个成员只能领取一次，领取的凭证仍受背包三张上限限制。', 'inventory-note'), button('创建兑换码', async () => {await request('/api/admin/inventory/codes', 'POST', {item: item.value, quantity: Number(quantity.value), code: codeField.value, starts: start.value ? new Date(start.value).getTime() : 0, expires: end.value ? new Date(end.value).getTime() : 0, maxUses: Number(maximum.value)}); dialog.close(); tab = 'codes'; await load();}, true));
    } else {
      const title = field(form, '邮件标题', '来自幻想镇的礼物'), search = field(form, '查找收件人'), list = el('div', '', 'inventory-members'), selected = new Set(); form.append(list);
      const drawMembers = () => {list.replaceChildren(); for (const member of data.members.filter(row => (row.name + row.uid).toLowerCase().includes(search.value.toLowerCase()))) {const label = el('label', '', 'inventory-member'), input = el('input'); input.type = 'checkbox'; input.checked = selected.has(member.uid); input.onchange = () => input.checked ? selected.add(member.uid) : selected.delete(member.uid); label.append(input, el('span', member.name)); list.append(label);}}; search.oninput = drawMembers; drawMembers();
      form.append(button('选择当前列表全部成员', () => {for (const member of data.members.filter(row => (row.name + row.uid).toLowerCase().includes(search.value.toLowerCase()))) selected.add(member.uid); drawMembers();}), el('p', '物品作为附件邮寄，成员在账号背包中领取；背包满时邮件会保留。', 'inventory-note'), button('确认邮寄', async () => {await request('/api/admin/inventory/mail', 'POST', {item: item.value, quantity: Number(quantity.value), title: title.value, recipients: [...selected], requestId}); dialog.close(); await load();}, true));
    }
  }
  function redeem() {const dialog = modal('兑换道具'), code = field(dialog.contents, '道具兑换码'); code.maxLength = 64; dialog.contents.append(button('领取', async () => {await request('/api/inventory/redeem', 'POST', {code: code.value}); dialog.close(); await load();}, true));}
  function draw() {
    root.replaceChildren(); const head = el('header', '', 'inventory-header'), actions = el('div', '', 'inventory-actions'); head.append(el('h2', management ? '物品与凭证管理' : '我的背包'), actions); root.append(head);
    if (management) actions.append(button('新建道具', () => edit(), true), button('邮寄道具', () => distribute()), button('创建兑换码', () => distribute(true)));
    else actions.append(button('兑换道具', redeem, true));
    actions.append(button('刷新', load)); if (canManage && !management) actions.append(button('管理物品', () => {management = true; tab = 'items'; return load();})); if (canManage && management) actions.append(button('返回背包', () => {management = false; tab = 'items'; return load();}));
    const tabs = el('nav', '', 'inventory-tabs'); const entries = management ? [['items', '道具定义'], ['codes', '兑换码']] : [['items', '持有物品'], ['mail', '待领取' + (data.mail.length ? ' · ' + data.mail.length : '')], ['grants', '当前权益']];
    for (const [key, label] of entries) {const control = button(label, () => {tab = key; draw();}); control.setAttribute('aria-pressed', String(tab === key)); tabs.append(control);} root.append(tabs);
    if (tab === 'items') {
      const search = field(root, '查找物品', query); search.placeholder = '名称或权限'; const grid = el('div', '', 'inventory-grid'); root.append(grid);
      const drawItems = () => {grid.replaceChildren(); for (const item of data.items.filter(row => (row.title + row.description + description(row)).toLowerCase().includes(query.toLowerCase()))) {const card = el('article', '', 'inventory-card'); picture(card, item); card.append(el('h3', item.title), el('small', description(item)), el('p', item.description)); const footer = el('footer'); footer.append(el('strong', management ? item.enabled ? '开放' : '已停用' : '× ' + item.quantity), button(management ? '编辑' : item.kind === 'voucher' ? '使用' : '查看', () => management ? edit(item) : viewItem(item), !management && item.kind === 'voucher')); card.append(footer); grid.append(card);} if (!grid.children.length) grid.append(el('p', query ? '没有匹配的物品' : '背包空空的，去商城兑换或领取管理员的礼物。', 'inventory-empty'));}; search.oninput = () => {query = search.value; drawItems();}; drawItems();
    } else if (tab === 'mail') {
      const grid = el('div', '', 'inventory-grid'); root.append(grid); for (const message of data.mail) {const card = el('article', '', 'inventory-card'); picture(card, message.snapshot); card.append(el('h3', message.title), el('p', message.snapshot.title + ' × ' + message.quantity), el('small', when(message.created)), button('领取附件', async () => {await request('/api/inventory/claim', 'POST', {id: message.id}); await load();}, true)); grid.append(card);} if (!data.mail.length) grid.append(el('p', '所有附件都已领取。', 'inventory-empty'));
    } else if (tab === 'grants') {
      root.append(el('p', '这里显示使用凭证获得的限时权益；管理员直接授予的长期权限不受凭证到期影响。', 'inventory-note'));
      for (const grant of data.grants) {const card = el('article', '', 'inventory-card'); card.append(el('h3', data.permissions[grant.permission]), el('p', '有效至 ' + when(grant.expires))); root.append(card);} if (!data.grants.length) root.append(el('p', '没有正在使用的限时凭证。', 'inventory-empty'));
    } else {
      const list = el('div', '', 'inventory-grid'); root.append(list); for (const code of data.codes) {const card = el('article', '', 'inventory-card'); card.append(el('h3', code.label), el('p', (data.items.find(item => item.id === code.item)?.title || code.item) + ' × ' + code.quantity), el('small', '已领取 ' + code.claimed + ' / ' + (code.max_uses || '不限量')), el('small', code.expires ? '截止 ' + when(code.expires) : '长期有效'), button(code.enabled ? '停用兑换码' : '启用兑换码', async () => {await request('/api/admin/inventory/codes', 'POST', {id: code.id, enabled: !code.enabled}); await load();})); list.append(card);} if (!data.codes.length) list.append(el('p', '还没有道具兑换码。', 'inventory-empty'));
    }
  }
  root.classList.add('inventory-ui'); root.append(el('p', '正在整理背包…', 'inventory-empty')); void load();
  return () => {alive = false; generation++; for (const dialog of dialogs) dialog.remove(); dialogs.clear(); dialogHost(null); root.replaceChildren();};
}
