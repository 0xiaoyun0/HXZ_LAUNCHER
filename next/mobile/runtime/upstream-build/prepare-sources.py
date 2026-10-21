"""Verify locked foundation source archives and unpack local build inputs."""
import hashlib
import json
import pathlib
import tarfile

ROOT = pathlib.Path(__file__).resolve().parents[3]
CACHE = ROOT / '.runtime/hxz-runtime-upstream'
LOCK = json.loads((ROOT / 'mobile/runtime/dependencies.lock.json').read_text(encoding='utf8'))
SOURCES = {
    'lwjgl333-source': ('lwjgl-src-3.3.3', ''),
    'lwjgl341-source': ('lwjgl-src-3.4.1', ''),
    'libffi-3.4.6': ('libffi-3.4.6', ''),
    'libffi-3.5.2': ('libffi-3.5.2', ''),
    'openal-source': ('openal-soft-1.24.3', ''),
    'libsync-source': ('aosp-libsync', 'libsync/'),
    'mesa-publisher-patches': ('mesa-build-fix', ''),
}
for artifact in LOCK['artifacts']:
    if artifact['id'] not in SOURCES:
        continue
    source = ROOT / artifact['file']
    if hashlib.sha256(source.read_bytes()).hexdigest() != artifact['sha256']:
        raise RuntimeError(f'{source}: SHA256 mismatch')
    folder, prefix = SOURCES[artifact['id']]
    destination = CACHE / 'sources' / folder
    marker = destination / '.hxz-source.sha256'
    if marker.exists() and marker.read_text().strip() == artifact['sha256']:
        continue
    with tarfile.open(source, 'r|*') as archive:
        for member in archive:
            relative = '/'.join(member.name.split('/')[1:])
            if member.isfile() and relative.startswith(prefix):
                relative = relative[len(prefix):]
                path = destination / relative
                if not path.resolve().is_relative_to(destination.resolve()):
                    raise RuntimeError('Unsafe upstream path')
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(archive.extractfile(member).read())
    marker.write_text(artifact['sha256'] + '\n')
    print('Prepared', artifact['id'])
