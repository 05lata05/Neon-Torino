"""Unreal Editor script: imports the art track's exports (art/) into /Game/Art/ with fixed settings.

1. checks the names in art/exports/ and art/textures/ against the contract art/ASSETS.md and docs/ART_PIPELINE.md
   (art_contract.py) and lists every name that breaks it in the Output Log;
2. imports every texture art/textures/<Set>/T_<Set>_<Map>.png into /Game/Art/Textures/<Set>/: BaseColor in sRGB,
   Normal as a normal map with the green channel flipped (Blender writes OpenGL normals, Unreal uses DirectX),
   ORM (R occlusion, G roughness, B metallic) as linear masks;
3. makes the master PBR material /Game/Art/Materials/M_ArtPBR (BaseColor, Normal and ORM texture parameters) and
   one instance MI_<Set> per texture set with a BaseColor;
4. imports every art/exports/<Category>/SM_<Asset>.fbx into /Game/Art/<Category>/: scale 1 (the Neon Torino FBX
   preset already writes centimetres through "FBX Units Scale"), axes converted to Unreal's, no materials or
   textures from the FBX, collision from the UCX_ meshes only (no automatic collision);
5. puts the instances on the mesh slots: a slot named after a material with textures (M_Plaster_Ochre ->
   MI_Plaster_Ochre), or the only slot of a mesh -> the mesh's own set (SM_Bench_Turin -> MI_Bench_Turin);
6. writes in the Output Log the size in metres and the number of UCX_ collision shapes of every mesh, to compare
   with art/ASSETS.md (milestone A0: the calibration arrow must be 1 x 1 x 2 m, front = +X, right = +Y).

Run it in the Unreal Editor (Tools > Execute Python Script... > this file) after `git lfs pull`. It can be run again
at any time: a file is imported again only when it changed (SHA-1 of the file and of the import settings in the
asset's metadata), so Git sees nothing to commit when the art did not change. Assets whose file was removed from
art/ are not deleted: the log lists them.

Written in the cloud without Unreal Engine: not tried in the editor yet (roadmap box "⇄ A0: try it with
SM_Calibration_Arrow"). The axis conversion in particular is to be confirmed by A0.
"""
import hashlib
import importlib
import json
import os
import shutil
import sys
import tempfile

import unreal

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.append(SCRIPT_DIR)
import art_contract  # noqa: E402 (needs SCRIPT_DIR on the path)

importlib.reload(art_contract)  # the editor keeps modules between runs: pick up changes to the file

ART = os.path.normpath(os.path.join(SCRIPT_DIR, '..', '..', 'art'))
DEST = '/Game/Art'
MATERIALS = DEST + '/Materials'
TEXTURES = DEST + '/Textures'
MASTER = 'M_ArtPBR'
TAG = 'NeonTorinoArtSha1'  # metadata on every imported asset: SHA-1 of its source file and of the settings below
VERSION_TAG = 'NeonTorinoArtMasterVersion'

# fixed import settings; changing them re-imports everything (they are part of the SHA-1)
MESH_SETTINGS = dict(scale=1.0, convert_scene=True, force_front_x_axis=False, convert_scene_unit=False,
                     combine_meshes=True, auto_generate_collision=False, one_convex_hull_per_ucx=True,
                     generate_lightmap_uvs=True, normal_import='import_normals_and_tangents', nanite=False)
TEXTURE_SETTINGS = {
    'BaseColor': dict(srgb=True, compression='TC_DEFAULT', flip_green=False),
    'Normal': dict(srgb=False, compression='TC_NORMALMAP', flip_green=True),
    'ORM': dict(srgb=False, compression='TC_MASKS', flip_green=False),
}
# default textures of the master: mid grey; flat normal; occlusion 1, roughness 0.8, metallic 0
DEFAULTS = {'BaseColor': (128, 128, 128), 'Normal': (128, 128, 255), 'ORM': (255, 204, 0)}
DEFAULT_SET = 'ArtDefault'
MAPS_ORDER = art_contract.MAPS

lib = unreal.EditorAssetLibrary
mel = unreal.MaterialEditingLibrary
tools = unreal.AssetToolsHelpers.get_asset_tools()


def file_sha1(path, settings):
    h = hashlib.sha1(json.dumps(settings, sort_keys=True).encode('utf-8'))
    with open(path, 'rb') as f:
        h.update(f.read())
    return h.hexdigest()


def is_current(asset_path, sha1):
    if not lib.does_asset_exist(asset_path):
        return False
    return lib.get_metadata_tag(lib.load_asset(asset_path), TAG) == sha1


def run_import(filename, destination, name, options=None):
    task = unreal.AssetImportTask()
    task.set_editor_property('filename', filename)
    task.set_editor_property('destination_path', destination)
    task.set_editor_property('destination_name', name)
    task.set_editor_property('automated', True)
    task.set_editor_property('replace_existing', True)
    task.set_editor_property('save', False)
    if options is not None:
        task.set_editor_property('options', options)
    tools.import_asset_tasks([task])
    path = destination + '/' + name
    return lib.load_asset(path) if lib.does_asset_exist(path) else None


# ---- textures and materials ----

def import_texture(path, set_name, map_name, settings=None):
    """Imports one texture with the settings of its map; returns the texture (None if the import failed)."""
    settings = settings or TEXTURE_SETTINGS[map_name]
    destination = TEXTURES + '/' + set_name
    name = 'T_{}_{}'.format(set_name, map_name)
    sha1 = file_sha1(path, settings)
    if is_current(destination + '/' + name, sha1):
        return lib.load_asset(destination + '/' + name), False
    texture = run_import(path, destination, name)
    if texture is None:
        unreal.log_error('Art: could not import ' + path)
        return None, False
    texture.set_editor_property('srgb', settings['srgb'])
    texture.set_editor_property('compression_settings', getattr(unreal.TextureCompressionSettings,
                                                                settings['compression']))
    texture.set_editor_property('flip_green_channel', settings['flip_green'])
    lib.set_metadata_tag(texture, TAG, sha1)
    lib.save_loaded_asset(texture, False)
    return texture, True


def default_textures():
    """The master's default textures, written as tiny PNGs and imported with the same settings as the art."""
    folder = tempfile.mkdtemp(prefix='neontorino_art_')
    result = {}
    for map_name, rgb in DEFAULTS.items():
        path = os.path.join(folder, 'T_{}_{}.png'.format(DEFAULT_SET, map_name))
        art_contract.solid_png(path, rgb)
        result[map_name], _ = import_texture(path, DEFAULT_SET, map_name)
    shutil.rmtree(folder, ignore_errors=True)
    if any(t is None for t in result.values()):
        raise RuntimeError('Could not import the default textures of ' + MASTER + ': check the Output Log')
    return result


SAMPLERS = {
    'BaseColor': 'SAMPLERTYPE_COLOR',
    'Normal': 'SAMPLERTYPE_NORMAL',
    'ORM': 'SAMPLERTYPE_MASKS',
}


def build_master(defaults):
    """M_ArtPBR: BaseColor -> base colour; Normal -> normal; ORM: R -> ambient occlusion, G -> roughness,
    B -> metallic. Rebuilt only when this function's layout version changes."""
    path = MATERIALS + '/' + MASTER
    version = '1'
    if lib.does_asset_exist(path):
        material = lib.load_asset(path)
        if lib.get_metadata_tag(material, VERSION_TAG) == version:
            return material, False
        mel.delete_all_material_expressions(material)
    else:
        material = tools.create_asset(MASTER, MATERIALS, unreal.Material, unreal.MaterialFactoryNew())
    nodes = {}
    for y, map_name in enumerate(MAPS_ORDER):
        node = mel.create_material_expression(material, unreal.MaterialExpressionTextureSampleParameter2D,
                                              -500, -300 + 300 * y)
        node.set_editor_property('parameter_name', map_name)
        node.set_editor_property('texture', defaults[map_name])
        node.set_editor_property('sampler_type', getattr(unreal.MaterialSamplerType, SAMPLERS[map_name]))
        nodes[map_name] = node
    mel.connect_material_property(nodes['BaseColor'], 'RGB', unreal.MaterialProperty.MP_BASE_COLOR)
    mel.connect_material_property(nodes['Normal'], 'RGB', unreal.MaterialProperty.MP_NORMAL)
    mel.connect_material_property(nodes['ORM'], 'R', unreal.MaterialProperty.MP_AMBIENT_OCCLUSION)
    mel.connect_material_property(nodes['ORM'], 'G', unreal.MaterialProperty.MP_ROUGHNESS)
    mel.connect_material_property(nodes['ORM'], 'B', unreal.MaterialProperty.MP_METALLIC)
    mel.recompile_material(material)
    lib.set_metadata_tag(material, VERSION_TAG, version)
    lib.save_loaded_asset(material, False)
    return material, True



def build_instance(set_name, textures, master, defaults):
    """MI_<Set> with the set's textures (the master's defaults for the missing maps). Saved only when it changes."""
    path = MATERIALS + '/MI_' + set_name
    if lib.does_asset_exist(path):
        mi = lib.load_asset(path)
        dirty = False
    else:
        mi = tools.create_asset('MI_' + set_name, MATERIALS, unreal.MaterialInstanceConstant,
                                unreal.MaterialInstanceConstantFactoryNew())
        dirty = True
    if mi.get_editor_property('parent') != master:
        mel.set_material_instance_parent(mi, master)
        dirty = True
    for map_name in MAPS_ORDER:
        wanted = textures.get(map_name) or defaults[map_name]
        if mel.get_material_instance_texture_parameter_value(mi, map_name) != wanted:
            mel.set_material_instance_texture_parameter_value(mi, map_name, wanted)
            dirty = True
    if dirty:
        mel.update_material_instance(mi)
        lib.save_loaded_asset(mi, False)
    return mi, dirty


# ---- meshes ----

def fbx_options():
    s = MESH_SETTINGS
    ui = unreal.FbxImportUI()
    ui.set_editor_property('import_mesh', True)
    ui.set_editor_property('import_as_skeletal', False)
    ui.set_editor_property('import_animations', False)
    ui.set_editor_property('import_materials', False)  # the materials come from art/textures and M_ArtPBR
    ui.set_editor_property('import_textures', False)
    ui.set_editor_property('mesh_type_to_import', unreal.FBXImportType.FBXIT_STATIC_MESH)
    data = ui.get_editor_property('static_mesh_import_data')
    data.set_editor_property('import_uniform_scale', s['scale'])
    data.set_editor_property('convert_scene', s['convert_scene'])
    data.set_editor_property('force_front_x_axis', s['force_front_x_axis'])
    data.set_editor_property('convert_scene_unit', s['convert_scene_unit'])
    data.set_editor_property('combine_meshes', s['combine_meshes'])
    data.set_editor_property('auto_generate_collision', s['auto_generate_collision'])
    data.set_editor_property('one_convex_hull_per_ucx', s['one_convex_hull_per_ucx'])
    data.set_editor_property('generate_lightmap_u_vs', s['generate_lightmap_uvs'])
    data.set_editor_property('normal_import_method',
                             unreal.FBXNormalImportMethod.FBXNIM_IMPORT_NORMALS_AND_TANGENTS)
    data.set_editor_property('build_nanite', s['nanite'])
    return ui


def import_mesh(entry):
    destination = DEST + '/' + entry['category']
    sha1 = file_sha1(entry['path'], MESH_SETTINGS)
    path = destination + '/' + entry['name']
    if is_current(path, sha1):
        return lib.load_asset(path), False
    mesh = run_import(entry['path'], destination, entry['name'], fbx_options())
    if not isinstance(mesh, unreal.StaticMesh):
        unreal.log_error('Art: could not import {} as a static mesh'.format(entry['path']))
        return None, False
    lib.set_metadata_tag(mesh, TAG, sha1)
    return mesh, True


def assign_materials(mesh, instances, sets):
    """Puts MI_<Set> on the slots (art_contract.material_for_slot); returns the slots left without a set."""
    slots = mesh.static_materials
    changed, bare = False, []
    for index, slot in enumerate(slots):
        slot_name = str(slot.material_slot_name)
        set_name = art_contract.material_for_slot(slot_name, mesh.get_name(), len(slots), sets)
        if set_name is None:
            bare.append(slot_name)
            continue
        if slot.material_interface != instances[set_name]:
            mesh.set_material(index, instances[set_name])
            changed = True
    return changed, bare


def report_mesh(mesh):
    box = mesh.get_bounding_box()
    size = [(b - a) / 100.0 for a, b in ((box.min.x, box.max.x), (box.min.y, box.max.y), (box.min.z, box.max.z))]
    collision = unreal.get_editor_subsystem(unreal.StaticMeshEditorSubsystem).get_simple_collision_count(mesh)
    unreal.log('Art: {} size X {:.2f} x Y {:.2f} x Z {:.2f} m, bottom at Z {:.2f} m, {} UCX_ collision shapes, {} '
               'material slots'.format(mesh.get_name(), size[0], size[1], size[2], box.min.z / 100.0, collision,
                                       len(mesh.static_materials)))


def stale_assets(meshes, sets):
    """Assets under /Game/Art whose file is no longer in art/ (listed, never deleted)."""
    expected = {DEST + '/' + m['category'] + '/' + m['name'] for m in meshes}
    expected |= {TEXTURES + '/' + s + '/T_' + s + '_' + k for s, maps in sets.items() for k in maps}
    stale = []
    for path in lib.list_assets(DEST, recursive=True, include_folder=False):
        path = path.split('.')[0]
        if path.startswith(MATERIALS) or path.startswith(TEXTURES + '/' + DEFAULT_SET + '/'):
            continue
        asset = lib.load_asset(path)
        if lib.get_metadata_tag(asset, TAG) and path not in expected:
            stale.append(path)
    return stale


def main():
    if not os.path.isdir(ART):
        raise RuntimeError('Missing {}: the script must stay in unreal/scripts/ of the repository'.format(ART))
    with open(os.path.join(ART, 'ASSETS.md'), encoding='utf-8') as f:
        contract = art_contract.contract_names(f.read())
    meshes, mesh_problems = art_contract.scan_exports(os.path.join(ART, 'exports'), contract)
    sets, texture_problems = art_contract.scan_textures(os.path.join(ART, 'textures'), contract)
    for where, problem, imported in mesh_problems + texture_problems:
        unreal.log_warning('Art: {}: {}{}'.format(where, problem, '' if imported else ' (not imported)'))

    defaults = default_textures()
    master, master_rebuilt = build_master(defaults)
    instances, textures_imported, instances_changed = {}, 0, 0
    for set_name, maps in sorted(sets.items()):
        textures = {}
        for map_name, path in maps.items():
            textures[map_name], imported = import_texture(path, set_name, map_name)
            textures_imported += imported
        if textures.get('BaseColor') is not None:
            instances[set_name], dirty = build_instance(set_name, textures, master, defaults)
            instances_changed += dirty

    meshes_imported, bare_slots = 0, []
    for entry in meshes:
        mesh, imported = import_mesh(entry)
        if mesh is None:
            continue
        meshes_imported += imported
        changed, bare = assign_materials(mesh, instances, sets)
        bare_slots += ['{}.{}'.format(mesh.get_name(), s) for s in bare]
        if imported or changed:
            lib.save_loaded_asset(mesh, False)
        report_mesh(mesh)
    if bare_slots:
        unreal.log_warning('Art: material slots without a texture set (name the Blender material M_<Set> with '
                           'art/textures/<Set>/): ' + ', '.join(bare_slots))
    stale = stale_assets(meshes, sets)
    if stale:
        unreal.log_warning('Art: assets whose file is no longer in art/ (delete them by hand if unused): '
                           + ', '.join(stale))
    problems = len(mesh_problems) + len(texture_problems)
    unreal.log('Art imported: {} meshes ({} re-imported), {} texture sets ({} textures re-imported, {} material '
               'instances updated){}, {} contract problems'.format(
                   len(meshes), meshes_imported, len(sets), textures_imported, instances_changed,
                   ', master material rebuilt' if master_rebuilt else '', problems))


main()
