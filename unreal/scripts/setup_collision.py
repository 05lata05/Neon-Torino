"""Unreal Editor script: gives the imported Santa Rita meshes collision that follows their real shape,
so cars drive on the roads and crash into the buildings.

Run it in the Unreal Editor after importing unreal/import/santa_rita.glb:
Tools > Execute Python Script... > this file (needs the "Python Editor Script Plugin", Edit > Plugins).
"""
import unreal

# names of the meshes written by tools/export_gltf.mjs (the importer may add a prefix such as "SM_")
GROUPS = ('Ground', 'Areas_', 'Roads_', 'Sidewalks_', 'Buildings_', 'Landmarks_', 'Trees_')

done, skipped = 0, []
for path in unreal.EditorAssetLibrary.list_assets('/Game', recursive=True, include_folder=False):
    name = path.split('/')[-1].split('.')[0]
    if not any(name == g or name.endswith('_' + g) or g.endswith('_') and g in name for g in GROUPS):
        continue
    mesh = unreal.EditorAssetLibrary.load_asset(path)
    if not isinstance(mesh, unreal.StaticMesh):
        continue
    body = mesh.get_editor_property('body_setup')
    if body is None:
        skipped.append(name)
        continue
    # the mesh itself is the collision: exact for roads and buildings, fine for static scenery
    body.set_editor_property('collision_trace_flag', unreal.CollisionTraceFlag.CTF_USE_COMPLEX_AS_SIMPLE)
    unreal.EditorAssetLibrary.save_loaded_asset(mesh)
    done += 1

unreal.log('Santa Rita collision: {} meshes set to "use complex as simple"'.format(done))
if skipped:
    unreal.log_warning('No body setup (set Collision Complexity by hand): ' + ', '.join(skipped))
if done == 0:
    unreal.log_warning('No Santa Rita meshes found under /Game: import unreal/import/santa_rita.glb first')
