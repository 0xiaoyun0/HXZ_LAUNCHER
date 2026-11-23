"""Prepare pinned Mesa plus OSMesa C frontend sources, without launcher code."""
import hashlib
import pathlib
import shutil
import tarfile

ROOT = pathlib.Path(__file__).resolve().parents[3]
CACHE = ROOT / '.runtime/hxz-runtime-upstream'
SOURCE = CACHE / 'sources/mesa-25.3.4'
OVERLAY = CACHE / 'downloads/mesa24.3.4-osmesa'


def verify(name, expected):
    archive = CACHE / 'downloads' / name
    actual = hashlib.sha256(archive.read_bytes()).hexdigest()
    if actual != expected:
        raise RuntimeError(f'{name}: SHA256 mismatch')
    return archive


mesa = verify('mesa25.3.4-source.tar.xz', '3a0fc6ec070b45ae25dc2ccb5e52fae1d89141f7c39c4a91fe4eaa80dfff9deb')
lock = __import__('json').loads((ROOT / 'mobile/runtime/dependencies.lock.json').read_text(encoding='utf8'))
for artifact in lock['artifacts']:
    if artifact['id'].startswith('mesa24-osmesa-file-'):
        if hashlib.sha256((ROOT / artifact['file']).read_bytes()).hexdigest() != artifact['sha256']:
            raise RuntimeError('Official OSMesa source SHA256 mismatch')
# Restore original files which an earlier full-overlay experiment replaced.
# Only the OSMesa C frontend/target/header are imported from official Mesa 24.3.4;
# all other renderer code and Meson build definitions remain Mesa 25.3.4.
restore = {p.relative_to(OVERLAY).as_posix() for p in OVERLAY.rglob('*') if p.is_file()}
restore.update(['meson.build', 'meson.options', 'include/meson.build', 'src/gallium/meson.build',
                'src/gallium/auxiliary/target-helpers/inline_sw_helper.h', 'src/util/os_misc.c',
                'src/util/perf/cpu_trace.h'])
fresh = not SOURCE.exists()
links = []
with tarfile.open(mesa, 'r|xz') as archive:
    for member in archive:
        relative = '/'.join(member.name.split('/')[1:])
        if member.isfile() and (fresh or relative in restore):
            target = SOURCE / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(archive.extractfile(member).read())
        elif member.issym():
            links.append((relative, member.linkname))

for relative, linkname in links:
    target = SOURCE / relative
    referent = (target.parent / linkname).resolve()
    if not referent.is_relative_to(SOURCE.resolve()):
        raise RuntimeError(f'Unsafe upstream symlink: {relative}')
    if referent.is_file():
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(referent, target)

for relative in ['include/GL/osmesa.h', 'src/gallium/frontends/osmesa', 'src/gallium/targets/osmesa']:
    source = OVERLAY / relative
    target = SOURCE / relative
    if source.is_dir():
        shutil.copytree(source, target, dirs_exist_ok=True)
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)

def edit(relative, before, after):
    target = SOURCE / relative
    text = target.read_text(encoding='utf8')
    if before not in text:
        raise RuntimeError(f'{relative}: upstream anchor changed')
    target.write_text(text.replace(before, after, 1), encoding='utf8')

edit('meson.build', 'cc = meson.get_compiler(\'c\')',
     "with_osmesa = get_option('osmesa')\nosmesa_lib_name = 'OSMesa'\n\ncc = meson.get_compiler('c')")
options = SOURCE / 'meson.options'
options.write_text(options.read_text(encoding='utf8') +
                   "\noption('osmesa', type : 'boolean', value : false, description : 'Build restored OSMesa C frontend')\n",
                   encoding='utf8')
edit('meson.build', "prog_flex = [prog_flex, '--wincompat']",
     "prog_flex = [prog_flex] # Android target requires POSIX unistd.h, even on a Windows build host")
edit('meson.build', 'with_gallium_kmsro = system_has_kms_drm and [',
     'with_gallium_kmsro = not with_osmesa and system_has_kms_drm and [')
edit('include/meson.build', 'if with_dri\n',
     "if with_osmesa\n  install_headers('GL/osmesa.h', subdir : 'GL')\nendif\n\nif with_dri\n")
edit('src/gallium/meson.build', "if with_platform_haiku\n  subdir('frontends/hgl')",
     "if with_osmesa\n  subdir('frontends/osmesa')\n  subdir('targets/osmesa')\nendif\n\nif with_platform_haiku\n  subdir('frontends/hgl')")
edit('src/gallium/auxiliary/target-helpers/inline_sw_helper.h', '#ifdef GALLIUM_SOFTPIPE\n',
     '#ifdef GALLIUM_ZINK\n#include "zink/zink_public.h"\n#endif\n\n#ifdef GALLIUM_SOFTPIPE\n')
for relative in ['src/gallium/frontends/osmesa/meson.build', 'src/gallium/targets/osmesa/meson.build']:
    target = SOURCE / relative
    target.write_text(target.read_text(encoding='utf8').replace('inc_mapi, ', ''), encoding='utf8')
edit('src/gallium/frontends/osmesa/osmesa.c',
     'screen->get_param(screen, PIPE_CAP_MAX_TEXTURE_2D_SIZE)', 'screen->caps.max_texture_2d_size')
edit('src/gallium/frontends/osmesa/osmesa.c',
     'return _glapi_get_proc_address(funcName);', 'return _mesa_glapi_get_proc_address(funcName);')
edit('src/gallium/frontends/osmesa/osmesa.c', '"glapi/glapi.h"', '"glapi/glapi/glapi.h"')
edit('src/util/os_misc.c', '#  include <cutils/properties.h>',
     '#  include <cutils/properties.h>\n#  include <sys/system_properties.h>')
edit('src/util/os_misc.c', 'property_get(full_key, os_android_option_value, NULL)',
     '__system_property_get(full_key, os_android_option_value)')
trace = SOURCE / 'src/util/perf/cpu_trace.h'
trace.write_text(trace.read_text(encoding='utf8').replace(
    '#elif DETECT_OS_ANDROID && !defined(__cplusplus)',
    '#elif 0 /* HXZ standalone NDK build omits optional private libcutils CPU tracing */'),
    encoding='utf8')
edit('src/gallium/targets/osmesa/meson.build',
     'if with_shared_glapi\n  osmesa_link_with += libglapi\nendif\n', '')
edit('src/gallium/targets/osmesa/meson.build', 'libglapi_static', 'libglapi')
edit('src/gallium/targets/osmesa/meson.build',
     'driver_swrast, idep_mesautil,', 'driver_swrast, idep_mesautil, idep_xmlconfig, driver_zink,')
edit('src/gallium/targets/osmesa/meson.build',
     "soversion : host_machine.system() == 'windows' ? '' : '8',", "soversion : '',")
legacy_notice = SOURCE / 'LICENSE.osmesa-overlay'
if legacy_notice.exists():
    legacy_notice.unlink()
print('Prepared official Mesa 25.3.4 + official Mesa 24.3.4 OSMesa C frontend; no launcher bridge')
