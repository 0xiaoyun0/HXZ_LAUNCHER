"""Server-only MCDR adapter. Network and file scans run in one bounded worker."""
import json
import os
import pathlib
import queue
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

DEFAULT = dict(enabled=False, community='https://qqbot.hxzmc.top', server='survival',
               token='', server_directory='server', world='world', game_version='26.2',
               chat=False, whitelist=False, interval=5)
runtime = None


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise urllib.error.HTTPError(req.full_url, code, 'Redirect refused', headers, fp)


def atomic_json(file, data):
    temp = file.with_name(file.name + '.hxz-tmp')
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    os.replace(temp, file)


def read_json(file, limit=8 * 1024 * 1024):
    if file.stat().st_size > limit:
        raise ValueError('File size limit')
    return json.loads(file.read_text(encoding='utf-8'))


class Runtime:
    def __init__(self, server, config):
        self.server, self.config = server, config
        base = config['community'].rstrip('/')
        address = urllib.parse.urlsplit(base)
        if address.username or address.password or address.query or address.fragment or not (
                address.scheme == 'https' or address.scheme == 'http' and address.hostname in ('127.0.0.1', 'localhost', '::1')):
            raise ValueError('Community must use HTTPS')
        if config['server'] not in ('survival', 'mod-1', 'mod-2') or not re.fullmatch(r'[a-fA-F0-9]{64}', config['token']):
            raise ValueError('Invalid bridge configuration')
        self.base = base
        self.root = pathlib.Path(config['server_directory']).resolve(strict=True)
        self.world = (self.root / config['world']).resolve(strict=True)
        if self.root not in self.world.parents:
            raise ValueError('World must be inside the configured game server directory')
        self.data = pathlib.Path(server.get_data_folder())
        self.receipts_file = self.data / 'receipts.json'
        self.receipts = read_json(self.receipts_file, 1024 * 1024) if self.receipts_file.exists() else []
        self.receipts = self.receipts[-4096:]
        self.queue = queue.Queue(maxsize=128)
        self.stop = threading.Event()
        self.lock = threading.Lock()
        self.players = set()
        self.chat_allowed = False
        self.whitelist_allowed = False
        self.running = server.is_server_startup()
        self.max_players = 20
        self.version = str(config['game_version'])
        self.cache = {}
        self.stat_iterator = None
        self.stat_pending = None
        self.identities = {}
        self.identity_stamp = None
        self.opener = urllib.request.build_opener(NoRedirect())
        self.thread = threading.Thread(target=self.loop, name='HXZ community bridge', daemon=True)

    def send(self, endpoint, body):
        deadline = time.monotonic() + 8
        request = urllib.request.Request(self.base + endpoint, data=json.dumps(body, separators=(',', ':')).encode(),
            headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + self.config['token'],
                     'X-HXZ-Server': self.config['server']}, method='POST')
        with self.opener.open(request, timeout=8) as response:
            if response.status != 200:
                raise ValueError('Invalid bridge response')
            value = bytearray()
            # read1 returns after a single buffered/socket read, so trickled data
            # cannot reset the whole-body budget indefinitely. A currently blocked
            # read still has the socket's 8-second timeout.
            while True:
                if self.stop.is_set() or time.monotonic() >= deadline:
                    raise TimeoutError('Bridge response deadline')
                chunk = response.read1(min(16384, 262145 - len(value)))
                if not chunk:
                    break
                value.extend(chunk)
                if len(value) > 262144:
                    raise ValueError('Invalid bridge response')
            return json.loads(value)

    def refresh_identities(self):
        file = self.root / 'usercache.json'
        if not file.exists():
            return
        stamp = (file.stat().st_mtime_ns, file.stat().st_size)
        if stamp != self.identity_stamp:
            identities = {}
            for record in read_json(file):
                if re.fullmatch(r'\w{1,16}', record.get('name', '')):
                    identities[record['name']] = uuid.UUID(record['uuid']).hex
            with self.lock:
                self.identities = identities
            self.identity_stamp = stamp

    def remember(self, identifier):
        if identifier not in self.receipts:
            self.receipts.append(identifier)
            self.receipts = self.receipts[-4096:]
            atomic_json(self.receipts_file, self.receipts)

    def apply(self, action):
        identifier = action['id']
        if identifier in self.receipts:
            return
        if action['expires'] < time.time() * 1000:
            raise ValueError('Action expired')
        value = action['value']
        player = value['name']
        identity = uuid.UUID(value['uid'])
        if not re.fullmatch(r'\w{1,16}', player):
            raise ValueError('Invalid player')
        if action['kind'] == 'chat' and self.config['chat'] and self.chat_allowed:
            message = value['body']
            if not isinstance(message, str) or not 0 < len(message) <= 500:
                raise ValueError('Invalid message')
            self.remember(identifier)
            # JSON literal, never interpolate a game command supplied by a community user.
            self.server.execute('tellraw @a ' + json.dumps({'text': '[社区] ' + player + '：' + message}, ensure_ascii=True))
        elif action['kind'] == 'whitelist' and self.config['whitelist'] and self.whitelist_allowed:
            file = self.root / 'whitelist.json'
            prior = file.read_bytes() if file.exists() else b'[]'
            if len(prior) > 4 * 1024 * 1024:
                raise ValueError('Whitelist too large')
            items = json.loads(prior)
            if not isinstance(items, list):
                raise ValueError('Invalid whitelist')
            if not any(uuid.UUID(item['uuid']) == identity for item in items):
                items.append(dict(uuid=str(identity), name=player))
                # Refuse to overwrite another process's concurrent update.
                if (file.read_bytes() if file.exists() else b'[]') != prior:
                    raise ValueError('Whitelist changed; retry review')
                backup = self.data / ('whitelist-before-' + str(int(time.time())) + '.json')
                backup.write_bytes(prior)
                old = sorted(self.data.glob('whitelist-before-*.json'))
                for stale in old[:-10]:
                    stale.unlink()
                atomic_json(file, items)
            self.server.execute('whitelist reload')
            self.remember(identifier)
        else:
            raise ValueError('Action disabled or unsupported')

    def statistic_batches(self):
        for category in ('stats', 'advancements'):
            folder = self.world / category
            if not folder.is_dir():
                continue
            for file in folder.glob('*.json'):
                if self.stop.is_set():
                    return
                try:
                    stamp = (file.stat().st_mtime_ns, file.stat().st_size)
                    if self.cache.get(str(file)) == stamp:
                        yield None
                        continue
                    identity = uuid.UUID(file.stem).hex
                    data = read_json(file)
                    metrics = {}
                    if category == 'stats':
                        for kind, values in data.get('stats', {}).items():
                            for key, number in values.items():
                                metric = kind + '/' + key
                                if re.fullmatch(r'[a-z0-9_:./-]{1,160}', metric) and type(number) is int and 0 <= number <= 2**53 - 1:
                                    metrics[metric] = number
                    else:
                        for key, value in data.items():
                            if isinstance(value, dict) and value.get('done') is True and re.fullmatch(r'[a-z0-9_:./-]{1,160}', 'advancement:' + key):
                                metrics['advancement:' + key] = 1
                    entries = list(metrics.items())
                    for offset in range(0, len(entries), 500):
                        yield dict(id=uuid.uuid4().hex, observed=int(time.time() * 1000),
                            players=[dict(uid=identity, stats=dict(entries[offset:offset + 500]))])
                    if len(self.cache) >= 20000:
                        self.cache.pop(next(iter(self.cache)))
                    self.cache[str(file)] = stamp
                    yield None
                except (OSError, ValueError, TypeError, AttributeError):
                    continue

    def statistics(self):
        # Bound both filesystem work and HTTP calls so large worlds cannot starve heartbeats.
        if self.stat_iterator is None:
            self.stat_iterator = self.statistic_batches()
        deadline = time.monotonic() + .02
        requests = 0
        try:
            while requests < 2:
                if self.stat_pending is None:
                    self.stat_pending = next(self.stat_iterator)
                if self.stat_pending is not None:
                    self.send('/api/game-stats/report', self.stat_pending)
                    self.stat_pending = None
                    requests += 1
                if time.monotonic() >= deadline:
                    return False
        except StopIteration:
            self.stat_iterator = None
            return True
        return False

    def loop(self):
        last_stats, last_warning, pending = 0, 0, None
        while not self.stop.is_set():
            try:
                if not self.running:
                    self.stop.wait(5)
                    continue
                self.refresh_identities()
                # /list also restores the player list after hot-loading the plugin.
                self.server.execute('list')
                with self.lock:
                    players = [dict(name=p, uid=self.identities[p]) for p in self.players if p in self.identities]
                    online = len(self.players)
                caps = ['status', 'statistics'] + (['chat'] if self.config['chat'] else []) + (['whitelist'] if self.config['whitelist'] else [])
                response = self.send('/api/game-bridge/poll', dict(status=dict(version=self.version, loader='mcdr',
                    online=online, max=self.max_players, players=players[:1000], capabilities=caps)))
                self.chat_allowed = bool(response.get('access', {}).get('chat'))
                self.whitelist_allowed = bool(response.get('access', {}).get('whitelist'))
                for action in response.get('actions', [])[:4]:
                    try:
                        self.apply(action)
                        result, note = 'done', ''
                    except (OSError, ValueError, KeyError, TypeError) as error:
                        result, note = 'failed', '游戏服处理失败：' + type(error).__name__
                    self.send('/api/game-bridge/ack', dict(id=action['id'], status=result, note=note))
                for _ in range(4):
                    if pending is None:
                        try:
                            pending = self.queue.get_nowait()
                        except queue.Empty:
                            break
                    self.send('/api/game-bridge/chat', pending)
                    pending = None
                if self.stat_iterator is not None or time.time() - last_stats > 60:
                    if self.statistics():
                        last_stats = time.time()
            except (OSError, ValueError, KeyError, TypeError) as error:
                if time.time() - last_warning > 60:
                    self.server.logger.warning('社区同步暂不可用，将后台重试；游戏继续运行。' + type(error).__name__)
                    last_warning = time.time()
            self.stop.wait(max(5, min(60, int(self.config['interval']))))


def on_load(server, prev_module):
    global runtime
    config = server.load_config_simple('config.json', DEFAULT, echo_in_console=False)
    if not config['enabled']:
        server.logger.info('游戏桥未启用；请填写 config/hxz_community_bridge/config.json。')
        return
    try:
        runtime = Runtime(server, config)
        runtime.thread.start()
    except (OSError, ValueError, KeyError, TypeError) as error:
        runtime = None
        server.logger.error('无法启用游戏桥，请检查配置：' + type(error).__name__)


def on_unload(server):
    global runtime
    if runtime:
        runtime.stop.set()
        runtime.thread.join(timeout=10)
        runtime = None


def on_server_startup(server):
    if runtime:
        runtime.running = True


def on_server_stop(server, return_code):
    if runtime:
        runtime.running = False
        with runtime.lock:
            runtime.players.clear()


def on_player_joined(server, player, info):
    if runtime:
        with runtime.lock:
            runtime.players.add(player)


def on_player_left(server, player):
    if runtime:
        with runtime.lock:
            runtime.players.discard(player)


def on_info(server, info):
    if not runtime or info.is_user:
        return
    version = re.fullmatch(r'Starting minecraft server version (\S+)', info.content, re.I)
    if version:
        runtime.version = version[1]
    listing = re.fullmatch(r'There are (\d+) of a max of (\d+) players online: ?(.*)', info.content)
    if listing:
        with runtime.lock:
            runtime.max_players = max(1, int(listing[2]))
            runtime.players = set(p.strip() for p in listing[3].split(',') if re.fullmatch(r'\w{1,16}', p.strip()))


def on_user_info(server, info):
    if not runtime or not runtime.config['chat'] or not runtime.chat_allowed or not info.is_player:
        return
    if not info.content.strip() or info.content.startswith(('/', '!!')):
        return
    with runtime.lock:
        identity = runtime.identities.get(info.player)
    if not identity:
        return  # Never derive a claimed player UUID from a name.
    try:
        runtime.queue.put_nowait(dict(id=uuid.uuid4().hex, uid=identity, name=info.player, body=info.content[:500]))
    except queue.Full:
        pass
