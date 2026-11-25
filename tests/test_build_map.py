import unittest

from tools.build_map import CLIP, Geo, build, to_ll


class TramRouteTest(unittest.TestCase):
    def test_orients_first_available_track_after_skipped_members(self):
        points = [(650, 800), (850, 800), (1050, 800), (1250, 800)]
        nodes = {str(i): (*to_ll(*point), {}) for i, point in enumerate(points)}
        ways = {
            'first': (['1', '0'], {'railway': 'tram'}),
            'second': (['1', '2'], {'railway': 'tram'}),
            'third': (['3', '2'], {'railway': 'tram'}),
            'partial': (['0', '1', 'missing-node'], {'railway': 'tram'}),
            'empty': ([], {'railway': 'tram'}),
        }
        track_members = [('way', way, '') for way in ('first', 'second', 'third')]
        skipped_members = (
            None,
            ('node', '0', 'stop'),
            ('way', 'outside-tiles', ''),
            ('way', 'partial', ''),
            ('way', 'empty', ''),
        )
        for skipped in skipped_members:
            with self.subTest(skipped=skipped):
                members = track_members if skipped is None else [skipped, *track_members]
                relations = {'route': (members, {'route': 'tram', 'ref': '4'})}
                result = build(Geo(nodes, ways, relations), CLIP, landmark_ids=False)
                self.assertEqual(result['TR'], [['4', [list(point) for point in points]]])
