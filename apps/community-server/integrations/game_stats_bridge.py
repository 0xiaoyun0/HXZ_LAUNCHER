"""HXZ 0.7: read-only Minecraft statistics collector; Python 3.9+, no dependencies."""
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.request
import uuid


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise urllib.error.HTTPError(req.full_url, code, '请使用最终社区地址', headers, fp)


def changed_records(world, mapping, cache):
    """Stream changed files; never hold the whole world's statistics in memory."""
    for name in ('stats', 'advancements'):
        folder = world / name
        if not folder.is_dir():
            continue
        for source in folder.glob('*.json'):
            try:
                stat = source.stat()
                stamp = (stat.st_mtime_ns, stat.st_size)
                if stat.st_size > 8 * 1024 * 1024 or cache.get(str(source)) == stamp:
                    continue
                identifier = uuid.UUID(mapping.get(source.stem, source.stem)).hex
                value = json.loads(source.read_text(encoding='utf-8'))
                metrics = {}
                if name == 'stats':
                    for category, entries in value.get('stats', {}).items():
                        for key, number in entries.items():
                            if re.fullmatch(r'[a-z0-9_:./-]{1,160}', category+'/'+key) and type(number) is int and 0 <= number <= 2**53-1:
                                metrics[category+'/'+key] = number
                else:
                    for key, entry in value.items():
                        if re.fullmatch(r'[a-z0-9_:./-]{1,160}', 'advancement:'+key) and isinstance(entry, dict) and entry.get('done') is True:
                            metrics['advancement:'+key] = 1
                entries = list(metrics.items())
                for offset in range(0, max(1, len(entries)), 500):
                    record = {'uid': identifier, 'stats': dict(entries[offset:offset+500])}
                    completed = (str(source), stamp) if offset+500 >= len(entries) else None
                    yield record, completed
            except (ValueError, OSError, AttributeError, TypeError):
                continue


def main():
    config_file = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'game-stats.json')
    config = json.loads(config_file.read_text(encoding='utf-8'))
    base = config['community'].rstrip('/')
    if not base.startswith('https://') and not base.startswith('http://127.0.0.1:'):
        raise ValueError('社区地址须使用 HTTPS')
    world = pathlib.Path(config['world']).resolve(strict=True)
    if config['server'] not in ('survival', 'mod-1', 'mod-2'):
        raise ValueError('服务器标识无效')
    opener = urllib.request.build_opener(NoRedirect())
    cache = {}

    def send(batch, completed):
        body = json.dumps({'id': uuid.uuid4().hex, 'observed': int(time.time()*1000),
                           'players': batch}, separators=(',', ':')).encode()
        request = urllib.request.Request(base+'/api/game-stats/report', data=body,
            headers={'Content-Type': 'application/json',
                     'Authorization': 'Bearer '+config['token'],
                     'X-HXZ-Server': config['server']}, method='POST')
        with opener.open(request, timeout=20) as response:
            if response.status != 200:
                raise ValueError('统计未被接收')
        for key, stamp in completed:
            if len(cache) >= 20000:
                cache.pop(next(iter(cache)))
            cache[key] = stamp
        time.sleep(.55)

    print('只读统计同步已启动；仅传输变动文件，失败后下轮继续。', flush=True)
    while True:
        try:
            batch, completed, size, count = [], [], 0, 0
            for record, marker in changed_records(world, config.get('uuid_map', {}), cache):
                length = len(json.dumps(record).encode())
                if batch and (size+length > 700000 or len(batch) >= 90):
                    send(batch, completed)
                    batch, completed, size = [], [], 0
                batch.append(record)
                size += length
                count += len(record['stats'])
                if marker:
                    completed.append(marker)
            if batch:
                send(batch, completed)
            print('本轮同步统计项：'+str(count), flush=True)
        except (OSError, ValueError) as error:
            print('本轮未完成，下轮重试：'+type(error).__name__, flush=True)
        time.sleep(max(30, min(3600, int(config.get('interval', 60)))))


if __name__ == '__main__':
    main()
