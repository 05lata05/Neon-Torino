"""Unreal Editor script: procedural facade materials with windows, one per facade type of the export.

The export (tools/facades.mjs) gives every facade wall UVs that count window bays and floors: U = bays (about 3 m
each, a whole number per wall), V = 0-1 on the ground floor, then +1 per floor. The master material M_Facade draws,
in every bay x floor cell: a window with its frame and sill, a roller shutter lowered by a different amount in each
window, a thin line at every floor; on the ground floor, depending on the type, ordinary windows, shop windows or a
garage roller door. One material instance per Facade_* type sets the plaster colour and the shape of the windows.
build_level.py assigns the instances to the facade slots of the city meshes (also after every re-import).

Invented details (not in the data): window size and position, frames, shutters, shop windows on the ground floor of
commercial buildings, roller doors on garages, the high strip windows of industrial buildings, the tall narrow windows
of churches. The plaster colours are the export's ones (FACADE_MATERIALS in tools/facades.mjs).

Run on its own (Tools > Execute Python Script...) or through build_level.py. Running it again changes nothing unless
this file changed: the master stores a hash of its code and the instances are saved only when a value changes.
"""
import hashlib
import json

import unreal

FOLDER = '/Game/NeonTorino/Facades'
MASTER = 'M_Facade'
VERSION_TAG = 'NeonTorinoFacadeVersion'

# HLSL of the Custom node. Inputs: UV and the parameters below; outputs: base colour (return) and Rough.
CODE = r'''
float2 cell = floor(UV);
float2 f = frac(UV);
bool ground = UV.y < 1.0;
float w = ground ? GroundWidth : WinWidth;
float b = ground ? GroundBottom : WinBottom;
float t = ground ? GroundTop : WinTop;
float mode = ground ? GroundMode : 0.0;   // 0 windows, 1 shop window, 2 roller door, 3 plain wall
if (mode > 0.5 && mode < 1.5) { w = 0.9; b = 0.08; t = 0.82; }
float hx = abs(f.x - 0.5);
float h = frac(sin(dot(cell + Seed, float2(12.9898, 78.233))) * 43758.5453);
float win = step(hx, w * 0.5) * step(b, f.y) * step(f.y, t);
float fr = 0.05;
float frame = step(hx, w * 0.5 + fr) * step(b - fr, f.y) * step(f.y, t + fr) * (1.0 - win);
float sill = step(hx, w * 0.5 + 0.08) * step(b - 0.05, f.y) * step(f.y, b - fr * 0.5);
float band = ground ? 0.0 : step(f.y, 0.025);
float shutter = win * step(t - (t - b) * h * Shutters, f.y);
float door = 0.0;
if (mode > 1.5 && mode < 2.5) { door = step(hx, 0.42) * step(f.y, 0.78); win = 0.0; frame = 0.0; sill = 0.0; shutter = 0.0; }
if (mode > 2.5) { win = 0.0; frame = 0.0; sill = 0.0; shutter = 0.0; }
float3 c = Wall * (1.0 - Dirt * 0.25 * (1.0 - f.y) * (1.0 - f.y));
c = lerp(c, Wall * 0.82, band);
c = lerp(c, Frame, saturate(frame + sill));
c = lerp(c, Glass * (0.55 + 0.45 * h), win);
float slats = 0.82 + 0.18 * step(0.5, frac(f.y * 28.0));
c = lerp(c, Frame * 0.75 * slats, shutter);
c = lerp(c, float3(0.42, 0.43, 0.44) * (0.8 + 0.2 * step(0.5, frac(f.y * 18.0))), door);
Rough = lerp(0.88, 0.12, win * (1.0 - shutter));
Rough = lerp(Rough, 0.45, door);
return c;
'''

SCALARS = ['WinWidth', 'WinBottom', 'WinTop', 'GroundWidth', 'GroundBottom', 'GroundTop', 'GroundMode', 'Shutters',
           'Dirt', 'Seed']
VECTORS = ['Wall', 'Frame', 'Glass']

WHITE_FRAME = (0.86, 0.85, 0.82)
GREEN_SHUTTER = (0.30, 0.36, 0.27)  # Turin's green persiane on older houses
DARK_GLASS = (0.05, 0.07, 0.09)

BLOCK = dict(WinWidth=0.55, WinBottom=0.30, WinTop=0.84, GroundWidth=0.50, GroundBottom=0.35, GroundTop=0.80,
             GroundMode=0, Shutters=0.7, Dirt=0.6, Frame=WHITE_FRAME, Glass=DARK_GLASS)
HISTORIC = dict(WinWidth=0.36, WinBottom=0.22, WinTop=0.86, GroundWidth=0.36, GroundBottom=0.25, GroundTop=0.86,
                GroundMode=0, Shutters=0.9, Dirt=0.8, Frame=GREEN_SHUTTER, Glass=DARK_GLASS)


def colour(hex_srgb):
    """'#rrggbb' (sRGB, as in tools/facades.mjs) to linear RGB."""
    return tuple((int(hex_srgb[i:i + 2], 16) / 255.0) ** 2.2 for i in (1, 3, 5))


# one instance per glTF facade material: name -> parameters (plaster colours from tools/facades.mjs)
TYPES = {
    'Facade_Block_Ochre': dict(BLOCK, Wall=colour('#d9a66e'), Seed=1),
    'Facade_Block_Yellow': dict(BLOCK, Wall=colour('#e8cf8e'), Seed=2),
    'Facade_Block_Cream': dict(BLOCK, Wall=colour('#efe2c8'), Seed=3),
    'Facade_Block_Grey': dict(BLOCK, Wall=colour('#c9c4ba'), Seed=4),
    'Facade_Block_Brick': dict(BLOCK, Wall=colour('#b9785a'), Seed=5, Dirt=0.3),
    'Facade_Historic_Yellow': dict(HISTORIC, Wall=colour('#e6c26a'), Seed=6),
    'Facade_Historic_Ochre': dict(HISTORIC, Wall=colour('#cf9350'), Seed=7),
    'Facade_Historic_Cream': dict(HISTORIC, Wall=colour('#eadbb8'), Seed=8),
    'Facade_Industrial': dict(BLOCK, Wall=colour('#a9aaa5'), WinWidth=0.8, WinBottom=0.62, WinTop=0.9,
                              GroundWidth=0.8, GroundBottom=0.62, GroundTop=0.9, Shutters=0, Dirt=1.0,
                              Frame=(0.35, 0.36, 0.37), Seed=9),
    'Facade_Commercial': dict(BLOCK, Wall=colour('#d6d3cc'), GroundMode=1, Shutters=0.3, Frame=(0.25, 0.26, 0.27),
                              Seed=10),
    'Facade_Public': dict(BLOCK, Wall=colour('#e2d6bf'), WinWidth=0.62, WinBottom=0.25, WinTop=0.86, Shutters=0.2,
                          Seed=11),
    'Facade_Church': dict(BLOCK, Wall=colour('#efe6d2'), WinWidth=0.22, WinBottom=0.3, WinTop=0.92,
                          GroundWidth=0.22, GroundBottom=0.3, GroundTop=0.92, Shutters=0, Dirt=0.4,
                          Glass=(0.08, 0.06, 0.05), Seed=12),
    'Facade_Garage': dict(BLOCK, Wall=colour('#b3aea4'), GroundMode=2, Shutters=0, Dirt=0.9, Seed=13),
}

mel = unreal.MaterialEditingLibrary
lib = unreal.EditorAssetLibrary


def _code_version():
    return hashlib.sha1(json.dumps([CODE, SCALARS, VECTORS]).encode('utf-8')).hexdigest()


def _build_master():
    path = FOLDER + '/' + MASTER
    version = _code_version()
    if lib.does_asset_exist(path):
        material = lib.load_asset(path)
        if lib.get_metadata_tag(material, VERSION_TAG) == version:
            return material, False
        mel.delete_all_material_expressions(material)
    else:
        material = unreal.AssetToolsHelpers.get_asset_tools().create_asset(
            MASTER, FOLDER, unreal.Material, unreal.MaterialFactoryNew())

    custom = mel.create_material_expression(material, unreal.MaterialExpressionCustom, -400, 0)
    custom.set_editor_property('code', CODE)
    custom.set_editor_property('description', 'Facade windows')
    custom.set_editor_property('output_type', unreal.CustomMaterialOutputType.CMOT_FLOAT3)
    inputs = []
    for n in ['UV'] + VECTORS + SCALARS:
        item = unreal.CustomInput()
        item.set_editor_property('input_name', n)
        inputs.append(item)
    custom.set_editor_property('inputs', inputs)
    rough = unreal.CustomOutput()
    rough.set_editor_property('output_name', 'Rough')
    rough.set_editor_property('output_type', unreal.CustomMaterialOutputType.CMOT_FLOAT1)
    custom.set_editor_property('additional_outputs', [rough])

    uv = mel.create_material_expression(material, unreal.MaterialExpressionTextureCoordinate, -800, -200)
    mel.connect_material_expressions(uv, '', custom, 'UV')
    y = -100
    for name in VECTORS:
        node = mel.create_material_expression(material, unreal.MaterialExpressionVectorParameter, -800, y)
        node.set_editor_property('parameter_name', name)
        mel.connect_material_expressions(node, '', custom, name)
        y += 120
    for name in SCALARS:
        node = mel.create_material_expression(material, unreal.MaterialExpressionScalarParameter, -800, y)
        node.set_editor_property('parameter_name', name)
        mel.connect_material_expressions(node, '', custom, name)
        y += 80

    mel.connect_material_property(custom, '', unreal.MaterialProperty.MP_BASE_COLOR)
    mel.connect_material_property(custom, 'Rough', unreal.MaterialProperty.MP_ROUGHNESS)
    mel.recompile_material(material)
    lib.set_metadata_tag(material, VERSION_TAG, version)
    lib.save_loaded_asset(material, False)
    return material, True


def _close(a, b):
    return abs(a - b) < 1e-4


def _build_instance(name, params, master, master_changed):
    path = FOLDER + '/MI_' + name
    if lib.does_asset_exist(path):
        mi = lib.load_asset(path)
        dirty = master_changed
    else:
        mi = unreal.AssetToolsHelpers.get_asset_tools().create_asset(
            'MI_' + name, FOLDER, unreal.MaterialInstanceConstant, unreal.MaterialInstanceConstantFactoryNew())
        dirty = True
    if mi.get_editor_property('parent') != master:
        mel.set_material_instance_parent(mi, master)
        dirty = True
    for key in SCALARS:
        value = float(params[key])
        if not _close(mel.get_material_instance_scalar_parameter_value(mi, key), value):
            mel.set_material_instance_scalar_parameter_value(mi, key, value)
            dirty = True
    for key in VECTORS:
        r, g, b = params[key]
        old = mel.get_material_instance_vector_parameter_value(mi, key)
        if not (_close(old.r, r) and _close(old.g, g) and _close(old.b, b)):
            mel.set_material_instance_vector_parameter_value(mi, key, unreal.LinearColor(r, g, b, 1.0))
            dirty = True
    if dirty:
        mel.update_material_instance(mi)
        lib.save_loaded_asset(mi, False)
    return mi, dirty


def ensure():
    """Creates or updates the master and the instances; returns {glTF material name: material instance}."""
    master, master_changed = _build_master()
    instances, changed = {}, 0
    for name, params in TYPES.items():
        instances[name], dirty = _build_instance(name, params, master, master_changed)
        changed += dirty
    unreal.log('Facade materials: {} instances ({} updated){}'.format(
        len(instances), changed, ', master rebuilt' if master_changed else ''))
    return instances


if __name__ == '__main__':
    ensure()
