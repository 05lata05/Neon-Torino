"""The rules of art/ASSETS.md and docs/ART_PIPELINE.md that the art import script checks, in plain Python.

No `unreal` import: import_art.py uses it inside the editor and tests/test_art_contract.py tests it with plain Python.
What it does:
- reads the asset names of the contract (art/ASSETS.md);
- walks art/exports/ and art/textures/ and lists what to import and the names that break the contract;
- decides which texture set (material instance) goes on each material slot of a mesh;
- writes tiny one-colour PNGs used as default textures of the master material.
"""
import os
import re
import struct
import zlib

MAPS = ('BaseColor', 'Normal', 'ORM')  # texture maps of docs/ART_PIPELINE.md §3.6
TEXTURE_EXTENSIONS = ('.png', '.tga', '.exr', '.tif', '.tiff', '.jpg', '.jpeg')
IGNORED = ('.gitkeep', 'readme.md', '.ds_store', 'thumbs.db')
# CamelCase parts separated by underscores, no spaces: SM_GTT8000_Module1, SM_Lamp_Turin_A
PART = r'[A-Za-z0-9]+'
MESH_NAME = re.compile(r'^SM_{0}(?:_{0})*$'.format(PART))
SET_NAME = re.compile(r'^{0}(?:_{0})*$'.format(PART))
CONTRACT_NAME = re.compile(r'^(?:SM|M|T|MI)_{0}(?:_{0})*$'.format(PART))
LFS_POINTER = b'version https://git-lfs'


def contract_names(text):
    """Asset and material names written in backticks in art/ASSETS.md. A shorthand suffix right after a name on the
    same line ("`SM_Tree_Tilia_A`, `_B`") stands for that name with its last part replaced (SM_Tree_Tilia_B)."""
    names = set()
    for line in text.splitlines():
        last = None
        for token in re.findall(r'`([^`]+)`', line):
            if CONTRACT_NAME.match(token):
                names.add(token)
                last = token
            elif last and re.match(r'^_{0}$'.format(PART), token):
                names.add(last.rsplit('_', 1)[0] + token)
            else:
                last = None
    return names


def is_lfs_pointer(path):
    """True when the file is a Git LFS pointer (the real file was not downloaded: `git lfs pull`)."""
    with open(path, 'rb') as f:
        return f.read(len(LFS_POINTER)) == LFS_POINTER


def _files(root):
    for folder, dirs, files in os.walk(root):
        dirs.sort()
        for name in sorted(files):
            if name.lower() not in IGNORED:
                yield os.path.join(folder, name)


def set_of(name):
    """Texture set (and material instance) name of a mesh or material name: SM_Bench_Turin -> Bench_Turin,
    M_Plaster_Ochre -> Plaster_Ochre."""
    for prefix in ('SM_', 'MI_', 'M_'):
        if name.startswith(prefix):
            return name[len(prefix):]
    return name


def scan_exports(root, contract):
    """FBX files of art/exports/<Category>/SM_<Asset>.fbx.
    Returns (meshes, problems): meshes = [{'name', 'category', 'path'}]; problems = [(path, text, imported)].
    Badly formed names are not imported; well formed names missing from the contract are imported with a warning."""
    meshes, problems = [], []
    if not os.path.isdir(root):
        return meshes, problems
    for path in _files(root):
        rel = os.path.relpath(path, root).replace(os.sep, '/')
        stem, ext = os.path.splitext(os.path.basename(path))
        if ext.lower() != '.fbx':
            problems.append((rel, 'not an FBX file (export with the Neon Torino preset)', False))
            continue
        parts = rel.split('/')
        if len(parts) != 2:
            problems.append((rel, 'must be in art/exports/<Category>/, one folder deep', False))
            continue
        category = parts[0]
        if not SET_NAME.match(category):
            problems.append((rel, 'category folder "{}" must be CamelCase without spaces'.format(category), False))
            continue
        if not MESH_NAME.match(stem):
            problems.append((rel, '"{}" is not a mesh name SM_<Asset> (CamelCase, no spaces)'.format(stem), False))
            continue
        if is_lfs_pointer(path):
            problems.append((rel, 'only the Git LFS pointer is here: run `git lfs pull`', False))
            continue
        if stem not in contract:
            problems.append((rel, '{} is not in art/ASSETS.md: add its row in a pull request'.format(stem), True))
        meshes.append({'name': stem, 'category': category, 'path': path})
    names = [m['name'] for m in meshes]
    for name in sorted({n for n in names if names.count(n) > 1}):
        problems.append((name, 'the same mesh name is in more than one category; only the first (alphabetical) is imported', True))
        first = names.index(name)
        meshes = [m for i, m in enumerate(meshes) if m['name'] != name or i == first]
        names = [m['name'] for m in meshes]
    return meshes, problems


def scan_textures(root, contract):
    """Texture sets of art/textures/<Set>/T_<Set>_<Map>.png.
    Returns (sets, problems): sets = {set name: {map: path}}; problems = [(path, text, imported)].
    A set without BaseColor gets no material instance."""
    sets, problems = {}, []
    if not os.path.isdir(root):
        return sets, problems
    for path in _files(root):
        rel = os.path.relpath(path, root).replace(os.sep, '/')
        stem, ext = os.path.splitext(os.path.basename(path))
        parts = rel.split('/')
        if ext.lower() not in TEXTURE_EXTENSIONS:
            problems.append((rel, 'not a texture file', False))
            continue
        if len(parts) != 2:
            problems.append((rel, 'must be in art/textures/<Asset>/, one folder deep', False))
            continue
        folder = set_of(parts[0])
        if not SET_NAME.match(folder):
            problems.append((rel, 'folder "{}" must be CamelCase without spaces'.format(parts[0]), False))
            continue
        match = re.match(r'^T_{}_({})$'.format(re.escape(folder), '|'.join(MAPS)), stem)
        if not match:
            problems.append((rel, 'must be named T_{}_<{}>'.format(folder, '|'.join(MAPS)), False))
            continue
        if is_lfs_pointer(path):
            problems.append((rel, 'only the Git LFS pointer is here: run `git lfs pull`', False))
            continue
        maps = sets.setdefault(folder, {})
        if match.group(1) in maps:
            problems.append((rel, 'two files for the same map; only the first is imported', False))
            continue
        maps[match.group(1)] = path
    for name in sorted(sets):
        if 'BaseColor' not in sets[name]:
            problems.append((name, 'texture set without T_{}_BaseColor: no material made'.format(name), True))
        elif 'SM_' + name not in contract and 'M_' + name not in contract:
            problems.append((name, 'texture set of neither SM_{0} nor M_{0} in art/ASSETS.md'.format(name), True))
    return sets, problems


def material_for_slot(slot_name, mesh_name, slot_count, sets):
    """Texture set to put on a material slot, or None. A slot named after a material with textures
    (M_Plaster_Ochre -> Plaster_Ochre) gets that set; the only slot of a mesh falls back to the mesh's own set
    (SM_Bench_Turin -> Bench_Turin)."""
    usable = {n for n, maps in sets.items() if 'BaseColor' in maps}
    own = set_of(slot_name)
    if own in usable:
        return own
    if slot_count == 1 and set_of(mesh_name) in usable:
        return set_of(mesh_name)
    return None


def solid_png(path, rgb, size=4):
    """Writes a size x size PNG of one colour (8-bit RGB)."""

    def chunk(kind, data):
        body = kind + data
        return struct.pack('>I', len(data)) + body + struct.pack('>I', zlib.crc32(body) & 0xFFFFFFFF)

    row = b'\x00' + bytes(rgb) * size  # filter byte 0, then the pixels
    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(row * size))
    png += chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)
