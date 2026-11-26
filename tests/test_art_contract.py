"""Tests of unreal/scripts/art_contract.py, the name checks of the art import script (runs without Unreal)."""
import os
import sys
import tempfile
import unittest
import zlib

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'unreal', 'scripts'))
import art_contract  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')


def write(root, rel, data=b'data'):
    path = os.path.join(root, *rel.split('/'))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as f:
        f.write(data)
    return path


class ContractNamesTest(unittest.TestCase):
    def test_reads_the_real_contract(self):
        with open(os.path.join(ROOT, 'art', 'ASSETS.md'), encoding='utf-8') as f:
            names = art_contract.contract_names(f.read())
        for name in ('SM_Calibration_Arrow', 'SM_Tree_Tilia_A', 'SM_Tree_Tilia_B', 'SM_GTT8000_Module0',
                     'SM_GTT8000_DoorLeaf', 'M_Plaster_Ochre', 'M_RoofTiles_Coppi', 'M_Asphalt_Sidewalk'):
            self.assertIn(name, names)
        self.assertNotIn('Facade_Block_Ochre', names)

    def test_shorthand_suffix_only_after_a_name(self):
        names = art_contract.contract_names('| `SM_Tree_A`, `_B` | `_C` |\n| `_D` |')
        self.assertEqual(names, {'SM_Tree_A', 'SM_Tree_B', 'SM_Tree_C'})


class ScanTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = self.tmp.name
        self.contract = {'SM_Bench_Turin', 'SM_Calibration_Arrow', 'M_Plaster_Ochre'}

    def tearDown(self):
        self.tmp.cleanup()

    def test_exports(self):
        exports = os.path.join(self.root, 'exports')
        write(exports, 'Test/SM_Calibration_Arrow.fbx')
        write(exports, 'Props/SM_Bench_Turin.FBX')
        write(exports, 'Props/SM_Unknown_Thing.fbx')
        write(exports, 'Props/SM_Bad Name.fbx')
        write(exports, 'Props/Bench.fbx')
        write(exports, 'SM_NoCategory.fbx')
        write(exports, 'Props/SM_Bench_Turin.blend')
        write(exports, 'Props/SM_Lfs.fbx', b'version https://git-lfs.github.com/spec/v1\noid sha256:00\n')
        write(exports, 'Other/SM_Bench_Turin.fbx')
        write(exports, 'Props/.gitkeep')
        meshes, problems = art_contract.scan_exports(exports, self.contract)
        self.assertEqual([(m['category'], m['name']) for m in meshes],
                         [('Other', 'SM_Bench_Turin'), ('Props', 'SM_Unknown_Thing'), ('Test', 'SM_Calibration_Arrow')])
        flagged = {where: imported for where, _text, imported in problems}
        self.assertEqual(flagged, {
            'Props/SM_Unknown_Thing.fbx': True,
            'Props/SM_Bad Name.fbx': False,
            'Props/Bench.fbx': False,
            'SM_NoCategory.fbx': False,
            'Props/SM_Bench_Turin.blend': False,
            'Props/SM_Lfs.fbx': False,
            'SM_Bench_Turin': True,
        })

    def test_missing_folders_are_empty(self):
        self.assertEqual(art_contract.scan_exports(os.path.join(self.root, 'nope'), self.contract), ([], []))
        self.assertEqual(art_contract.scan_textures(os.path.join(self.root, 'nope'), self.contract), ({}, []))

    def test_textures(self):
        textures = os.path.join(self.root, 'textures')
        write(textures, 'Bench_Turin/T_Bench_Turin_BaseColor.png')
        write(textures, 'Bench_Turin/T_Bench_Turin_Normal.png')
        write(textures, 'Bench_Turin/T_Bench_Turin_Roughness.png')
        write(textures, 'SM_Calibration_Arrow/T_Calibration_Arrow_ORM.png')
        write(textures, 'Plaster_Ochre/T_Plaster_Ochre_BaseColor.jpg')
        write(textures, 'Plaster_Ochre/T_Plaster_Ochre_BaseColor.png')
        write(textures, 'Stray/T_Stray_BaseColor.png')
        sets, problems = art_contract.scan_textures(textures, self.contract)
        self.assertEqual(sorted(sets), ['Bench_Turin', 'Calibration_Arrow', 'Plaster_Ochre', 'Stray'])
        self.assertEqual(sorted(sets['Bench_Turin']), ['BaseColor', 'Normal'])
        self.assertTrue(sets['Plaster_Ochre']['BaseColor'].endswith('.jpg'))
        self.assertEqual(sorted(where for where, _t, _i in problems), [
            'Bench_Turin/T_Bench_Turin_Roughness.png', 'Calibration_Arrow', 'Plaster_Ochre/T_Plaster_Ochre_BaseColor.png',
            'Stray'])


class MaterialForSlotTest(unittest.TestCase):
    SETS = {'Bench_Turin': {'BaseColor': 'a'}, 'Plaster_Ochre': {'BaseColor': 'b'}, 'NoColour': {'Normal': 'c'}}

    def test_slot_named_after_a_material(self):
        self.assertEqual(art_contract.material_for_slot('M_Plaster_Ochre', 'SM_Bench_Turin', 2, self.SETS),
                         'Plaster_Ochre')

    def test_single_slot_falls_back_to_the_mesh(self):
        self.assertEqual(art_contract.material_for_slot('Material.001', 'SM_Bench_Turin', 1, self.SETS),
                         'Bench_Turin')
        self.assertIsNone(art_contract.material_for_slot('Material.001', 'SM_Bench_Turin', 2, self.SETS))

    def test_set_without_base_colour_is_not_used(self):
        self.assertIsNone(art_contract.material_for_slot('M_NoColour', 'SM_Other', 1, self.SETS))


class SolidPngTest(unittest.TestCase):
    def test_writes_a_valid_png(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, 'x.png')
            art_contract.solid_png(path, (255, 204, 0), size=2)
            with open(path, 'rb') as f:
                data = f.read()
        self.assertTrue(data.startswith(b'\x89PNG\r\n\x1a\n'))
        start = data.index(b'IDAT') + 4
        length = int.from_bytes(data[start - 8:start - 4], 'big')
        self.assertEqual(zlib.decompress(data[start:start + length]), (b'\x00' + b'\xff\xcc\x00' * 2) * 2)


if __name__ == '__main__':
    unittest.main()
