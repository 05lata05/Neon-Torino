"""Unreal Editor script: rebuilds the Santa Rita city in the SantaRita level in one go.

1. opens the level /Game/Maps/SantaRita;
2. imports (or re-imports) unreal/import/santa_rita.glb into /Game/SantaRita, unless the meshes already come from
   this exact file (SHA-1 in their metadata);
3. gives every city mesh collision that follows its real shape ("use complex as simple") and puts the procedural
   facade materials of facade_materials.py (windows per floor and bay) on its Facade_* slots;
4. keeps one Static Mesh Actor per mesh at the origin in the outliner folder "SantaRita" (the glTF vertices are
   already in world space): existing actors are reused by label, missing ones added, stale ones removed;
5. sets the GameMode Override to the vehicle game mode and puts one Player Start at 0, 0, 100;
6. saves the level, its actors and the imported assets.

Run it in the Unreal Editor (Tools > Execute Python Script... > this file) after `npm run unreal` has regenerated
the .glb. Needs the "Python Editor Script Plugin" and "Editor Scripting Utilities" (already enabled in
NeonTorino.uproject). It can be run again at any time: it updates the city, it does not duplicate it, and when
the .glb has not changed it changes no file (so Git sees nothing to commit).
The level itself (lights, sky, fog) must already exist: the script does not create it.

Tried in Unreal Engine 5.8 (headless and Tools > Execute Python Script).
"""
import hashlib
import importlib
import json
import os
import struct
import sys

import unreal

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.append(SCRIPT_DIR)
import facade_materials  # noqa: E402 (needs SCRIPT_DIR on the path)

importlib.reload(facade_materials)  # the editor keeps modules between runs: pick up changes to the file
GLB = os.path.normpath(os.path.join(SCRIPT_DIR, '..', 'import', 'santa_rita.glb'))
LEVEL = '/Game/Maps/SantaRita'
DEST = '/Game/SantaRita'  # imported meshes and materials
FOLDER = 'SantaRita'  # outliner folder of the city actors
GAME_MODE = '/Game/VehicleTemplate/Blueprints/BP_VehicleAdvGameMode'
PLAYER_START = unreal.Vector(0, 0, 100)  # centimetres: on the street next to piazza Santa Rita
# metadata tag on every city mesh: SHA-1 of the .glb it was imported from. The importer rewrites all the assets even
# when nothing changed, so the script skips the import (and the Git LFS churn) when the tag matches the file.
GLB_TAG = 'NeonTorinoGlbSha1'


def glb_sha1(path):
    with open(path, 'rb') as f:
        return hashlib.sha1(f.read()).hexdigest()


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
    """The imported static meshes, in the order of the .glb, and the names of the meshes not found."""
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
    return found, missing


def is_up_to_date(meshes, missing, sha1):
    lib = unreal.EditorAssetLibrary
    return bool(meshes) and not missing and all(lib.get_metadata_tag(m, GLB_TAG) == sha1 for m in meshes)


def set_collision(meshes, sha1, facades):
    """Collision "use complex as simple", the .glb tag and the facade materials ({slot name: material}); a mesh is
    saved only when one of them changes."""
    lib = unreal.EditorAssetLibrary
    complex_as_simple = unreal.CollisionTraceFlag.CTF_USE_COMPLEX_AS_SIMPLE
    done, skipped = 0, []
    for mesh in meshes:
        dirty = False
        for index, slot in enumerate(mesh.static_materials):
            wanted = facades.get(str(slot.material_slot_name))
            if wanted is not None and slot.material_interface != wanted:
                mesh.set_material(index, wanted)
                dirty = True
        if lib.get_metadata_tag(mesh, GLB_TAG) != sha1:
            lib.set_metadata_tag(mesh, GLB_TAG, sha1)
            dirty = True
        body = mesh.get_editor_property('body_setup')
        if body is None:
            skipped.append(mesh.get_name())
        else:
            # the mesh itself is the collision: exact for roads and buildings, fine for static scenery
            if body.get_editor_property('collision_trace_flag') != complex_as_simple:
                body.set_editor_property('collision_trace_flag', complex_as_simple)
                dirty = True
            done += 1
        if dirty:
            lib.save_loaded_asset(mesh, False)
    if skipped:
        unreal.log_warning('No body setup (set Collision Complexity by hand): ' + ', '.join(skipped))
    return done


def load_city_actors(names):
    """World Partition keeps in memory only the actors near the camera (none when the editor has just opened the
    level), so get_all_level_actors() misses the city: load every city actor before replacing it."""
    lib = unreal.WorldPartitionBlueprintLibrary
    mesh_actor = unreal.StaticMeshActor.static_class()
    guids = [d.guid for d in lib.get_actor_descs()
             if d.native_class == mesh_actor and any(matches(str(d.label), n) for n in names)]
    if guids:
        lib.load_actors(guids)
    return len(guids)


def place_city(actors, meshes):
    """One Static Mesh Actor per mesh. An existing actor with the same label is reused, so that running the script
    again does not rewrite every one-file-per-actor package (and Git LFS object) when the city has not changed.
    Returns (reused, created, removed)."""
    old = {}
    extra = []
    for a in actors.get_all_level_actors():
        if str(a.get_folder_path()) != FOLDER:
            continue
        label = a.get_actor_label()
        if label in old or not isinstance(a, unreal.StaticMeshActor):
            extra.append(a)  # duplicates and anything else left in the folder
        else:
            old[label] = a
    reused = created = 0
    for mesh in meshes:
        actor = old.pop(mesh.get_name(), None)
        if actor is None:
            actor = actors.spawn_actor_from_class(unreal.StaticMeshActor, unreal.Vector(0, 0, 0))
            actor.set_actor_label(mesh.get_name())
            actor.set_folder_path(FOLDER)
            created += 1
        else:
            reused += 1
        component = actor.static_mesh_component
        if component.static_mesh != mesh:
            component.set_static_mesh(mesh)
        if actor.get_actor_location() != unreal.Vector(0, 0, 0):
            actor.set_actor_location(unreal.Vector(0, 0, 0), False, False)
    stale = list(old.values()) + extra  # meshes no longer in the .glb, duplicates
    for actor in stale:
        actors.destroy_actor(actor)
    return reused, created, len(stale)


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
    sha1 = glb_sha1(GLB)
    meshes, missing = city_meshes(names)
    imported = not is_up_to_date(meshes, missing, sha1)
    if imported:
        import_city()
        meshes, missing = city_meshes(names)
    if missing:
        unreal.log_warning('Santa Rita: {} meshes of the .glb not found under {}: {}'.format(
            len(missing), DEST, ', '.join(missing[:20])))
    if not meshes:
        raise RuntimeError('No Santa Rita meshes imported under ' + DEST + ': check the Output Log')
    collided = set_collision(meshes, sha1, facade_materials.ensure())
    load_city_actors(names)
    reused, created, removed = place_city(actors, meshes)
    set_game_mode(world_of.get_editor_world())
    set_player_start(actors)

    # World Partition with one file per actor: the actors are separate packages, save every dirty one
    unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)
    unreal.log('Santa Rita built: {} meshes of {} placed ({}; {} actors kept, {} added, {} removed), {} with '
               'collision, game mode and Player Start set'.format(
                   len(meshes), len(names), 'imported' if imported else '.glb unchanged, import skipped',
                   reused, created, removed, collided))


main()
