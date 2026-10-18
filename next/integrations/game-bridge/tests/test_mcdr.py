import importlib.util
import json
import pathlib
import tempfile
import unittest
import uuid
from unittest.mock import patch

SOURCE = pathlib.Path(__file__).resolve().parents[1] / 'mcdr/hxz_community_bridge/__init__.py'
spec = importlib.util.spec_from_file_location('hxz_mcdr_test', SOURCE)
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)


class FakeServer:
    def __init__(self, root):
        self.root, self.commands = root, []

    def get_data_folder(self):
        return str(self.root / 'config')

    def is_server_startup(self):
        return True

    def execute(self, command):
        self.commands.append(command)


class BridgeTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix='hxz-mcdr-080-')
        self.addCleanup(self.directory.cleanup)
        self.root = pathlib.Path(self.directory.name)
        (self.root / 'world/stats').mkdir(parents=True)
        (self.root / 'config').mkdir()
        self.server = FakeServer(self.root)
        self.config = {**bridge.DEFAULT, 'enabled': True, 'token': 'a'*64,
                       'server_directory': str(self.root), 'chat': True, 'whitelist': True}
        self.runtime = bridge.Runtime(self.server, self.config)

    def action(self, kind, **values):
        return dict(id=uuid.uuid4().hex, kind=kind, expires=9999999999999,
                    value=dict(uid='a'*32, name='alice', **values))

    def test_chat_is_literal_at_most_once_and_commands_are_rejected(self):
        self.runtime.chat_allowed = True
        action = self.action('chat', body='你好\n/op eve')
        self.runtime.apply(action)
        self.runtime.apply(action)
        self.assertEqual(len(self.server.commands), 1)
        self.assertEqual(json.loads(self.server.commands[0][11:])['text'], '[社区] alice：你好\n/op eve')
        restarted = bridge.Runtime(self.server, self.config)
        restarted.chat_allowed = True
        restarted.apply(action)
        self.assertEqual(len(self.server.commands), 1)
        with self.assertRaises(ValueError):
            self.runtime.apply(self.action('console', command='op eve'))

    def test_whitelist_keeps_existing_players_and_identity_is_explicit(self):
        self.runtime.whitelist_allowed = True
        original = dict(uuid=str(uuid.UUID('b'*32)), name='bob')
        (self.root / 'whitelist.json').write_text(json.dumps([original]))
        action = self.action('whitelist')
        self.runtime.apply(action)
        result = json.loads((self.root / 'whitelist.json').read_text())
        self.assertEqual(result[0], original)
        self.assertEqual(result[1]['uuid'], str(uuid.UUID('a'*32)))
        self.assertEqual(self.server.commands, ['whitelist reload'])
        self.runtime.apply(action)
        self.assertEqual(len(json.loads((self.root / 'whitelist.json').read_text())), 2)

    def test_whitelist_needs_community_permission_as_well_as_local_permission(self):
        with self.assertRaises(ValueError):
            self.runtime.apply(self.action('whitelist'))
        self.assertFalse((self.root / 'whitelist.json').exists())
        self.assertEqual(self.server.commands, [])

    def test_slow_stream_does_not_hold_the_worker_indefinitely(self):
        clock = [0]
        class Response:
            status = 200
            def __enter__(self): return self
            def __exit__(self, *args): return False
            def read(self, size):
                clock[0] += 30
                return b'{}'
            def read1(self, size):
                clock[0] += 3
                return b' '
        class Opener:
            def open(self, *args, **kwargs): return Response()
        self.runtime.opener = Opener()
        with patch.object(bridge.time, 'monotonic', lambda: clock[0]):
            with self.assertRaises(TimeoutError):
                self.runtime.send('/api/game-bridge/poll', {})
        self.assertLessEqual(clock[0], 12)

    def test_stats_only_reads_saved_world_data(self):
        file = self.root / 'world/stats' / ('a'*32 + '.json')
        file.write_text(json.dumps({'stats': {'minecraft:custom': {'minecraft:play_time': 123}}}))
        sent = []
        self.runtime.send = lambda p, body: sent.append((p, body))
        self.runtime.statistics()
        self.assertEqual(sent[0][1]['players'][0]['stats']['minecraft:custom/minecraft:play_time'], 123)
        self.runtime.statistics()
        self.assertEqual(len(sent), 1)
        self.assertEqual(json.loads(file.read_text())['stats']['minecraft:custom']['minecraft:play_time'], 123)

    def test_network_configuration_never_accepts_cleartext_remote_credentials(self):
        with self.assertRaises(ValueError):
            bridge.Runtime(self.server, {**self.config, 'community': 'http://example.com'})
        with self.assertRaises(ValueError):
            bridge.Runtime(self.server, {**self.config, 'community': 'https://user:password@example.com'})


if __name__ == '__main__':
    unittest.main()
