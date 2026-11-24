"""Unreal Editor script: rebuilds the Santa Rita city in the SantaRita level in one go.

1. opens the level /Game/Maps/SantaRita;
2. imports (or re-imports) unreal/import/santa_rita.glb into /Game/SantaRita;
3. gives every city mesh collision that follows its real shape ("use complex as simple");
4. replaces the city actors in the outliner folder "SantaRita" with one Static Mesh Actor per mesh at the origin
   (the glTF vertices are already in world space);
5. sets the GameMode Override to the vehicle game mode and puts one Player Start at 0, 0, 100;
6. saves the level, its actors and the imported assets.

Run it in the Unreal Editor (Tools > Execute Python Script... > this file) after `npm run unreal` has regenerated
the .glb. Needs the "Python Editor Script Plugin" and "Editor Scripting Utilities" (already enabled in
NeonTorino.uproject). It can be run again at any time: it replaces the city, it does not duplicate it.
The level itself (lights, sky, fog) must already exist: the script does not create it.

Written in the cloud without trying it in Unreal: see the "(local)" box in ROADMAP.md.
"""
import json
import os
import struct

import unreal

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
GLB = os.path.normpath(os.path.join(SCRIPT_DIR, '..', 'import', 'santa_rita.glb'))
LEVEL = '/Game/Maps/SantaRita'
DEST = '/Game/SantaRita'  # imported meshes and materials
FOLDER = 'SantaRita'  # outliner folder of the city actors
GAME_MODE = '/Game/VehicleTemplate/Blueprints/BP_VehicleAdvGameMode'
PLAYER_START = unreal.Vector(0, 0, 100)  # centimetres: on the street next to piazza Santa Rita


def glb_mesh_names(path):
    """Names of the meshes in the .glb (written by tools/export_gltf.mjs), read from its JSON chunk."""
    with open(path, 'rb') as f:
        magic, _version, _length = struct.unpack('<4sII', f.read(12))
        chunk_length, chunk_type = struct.unpack('<II', f.read(8))
        if magic != b'glTF' or chunk_type != 0x4E4F534A:  # 'JSON'
            raise RuntimeError('Not a binary glTF file: ' + path)
        gltf = json.loads(f.read(chunk_length).decode('utf-8'))
    return [n['name'] for n in gltf['nodes'] if 'mesh' in n]


def matches(asset_name, mesh_name):
    """The importer may add a prefix ("SM_") and replace characters such as '-' in negative tile numbers."""
    for n in (mesh_name, mesh_name.replace('-', '_')):
        if asset_name == n or asset_name.endswith('_' + n):
            return True
    return False


def import_city():
    task = unreal.AssetImportTask()
    task.set_editor_property('filename', GLB)
    task.set_editor_property('destination_path', DEST)
    task.set_editor_property('automated', True)  # no import dialog: default options
    task.set_editor_property('replace_existing', True)
    task.set_editor_property('save', True)
    unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([task])


def city_meshes(names):
    """The imported static meshes, in the order of the .glb; warns about meshes not found."""
    assets = {}
    for path in unreal.EditorAssetLibrary.list_assets(DEST, recursive=True, include_folder=False):
        asset = unreal.EditorAssetLibrary.load_asset(path)
        if isinstance(asset, unreal.StaticMesh):
            assets[asset.get_name()] = asset
    found, missing = [], []
    for name in names:
        hit = [a for n, a in assets.items() if matches(n, name)]
        # the exact name wins over a prefixed one, so "Ground" never picks up an unrelated mesh
        hit.sort(key=lambda a: len(a.get_name()))
        if hit:
            found.append(hit[0])
        else:
            missing.append(name)
    if missing:
        unreal.log_warning('Santa Rita: {} meshes of the .glb not found under {}: {}'.format(
            len(missing), DEST, ', '.join(missing[:20])))
    return found


def set_collision(meshes):
    done, skipped = 0, []
    for mesh in meshes:
        body = mesh.get_editor_property('body_setup')
        if body is None:
            skipped.append(mesh.get_name())
            continue
        # the mesh itself is the collision: exact for roads and buildings, fine for static scenery
        body.set_editor_property('collision_trace_flag', unreal.CollisionTraceFlag.CTF_USE_COMPLEX_AS_SIMPLE)
        unreal.EditorAssetLibrary.save_loaded_asset(mesh)
        done += 1
    if skipped:
        unreal.log_warning('No body setup (set Collision Complexity by hand): ' + ', '.join(skipped))
    return done


def place_city(actors, meshes):
    old = [a for a in actors.get_all_level_actors() if str(a.get_folder_path()) == FOLDER]
    for actor in old:
        actors.destroy_actor(actor)
    for mesh in meshes:
        actor = actors.spawn_actor_from_class(unreal.StaticMeshActor, unreal.Vector(0, 0, 0))
        actor.static_mesh_component.set_static_mesh(mesh)
        actor.set_actor_label(mesh.get_name())
        actor.set_folder_path(FOLDER)
    return len(old)


def set_game_mode(world):
    game_mode = unreal.EditorAssetLibrary.load_blueprint_class(GAME_MODE)
    if game_mode is None:
        unreal.log_warning('Game mode not found: ' + GAME_MODE + ' (set World Settings > GameMode Override by hand)')
        return
    world.get_world_settings().set_editor_property('default_game_mode', game_mode)


def set_player_start(actors):
    starts = [a for a in actors.get_all_level_actors() if isinstance(a, unreal.PlayerStart)]
    for extra in starts[1:]:
        actors.destroy_actor(extra)
    start = starts[0] if starts else actors.spawn_actor_from_class(unreal.PlayerStart, PLAYER_START)
    start.set_actor_location(PLAYER_START, False, False)
    start.set_actor_rotation(unreal.Rotator(0, 0, 0), False)


def main():
    if not os.path.isfile(GLB):
        raise RuntimeError('Missing {}: run `npm run unreal` first'.format(GLB))
    if not unreal.EditorAssetLibrary.does_asset_exist(LEVEL):
        raise RuntimeError('Missing level {}: create it first (unreal/README.md, "How the level was built")'.format(LEVEL))

    level_editor = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
    actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    world_of = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
    if not level_editor.load_level(LEVEL):
        raise RuntimeError('Could not open ' + LEVEL)

    names = glb_mesh_names(GLB)
    import_city()
    meshes = city_meshes(names)
    if not meshes:
        raise RuntimeError('No Santa Rita meshes imported under ' + DEST + ': check the Output Log')
    collided = set_collision(meshes)
    removed = place_city(actors, meshes)
    set_game_mode(world_of.get_editor_world())
    set_player_start(actors)

    # World Partition with one file per actor: the actors are separate packages, save every dirty one
    unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)
    unreal.log('Santa Rita built: {} meshes of {} placed ({} old actors replaced), {} with collision, '
               'game mode and Player Start set'.format(len(meshes), len(names), removed, collided))


main()
