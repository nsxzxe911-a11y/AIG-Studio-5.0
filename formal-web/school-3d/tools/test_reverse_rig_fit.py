"""Tests for reverse-proportions-own-rig sizing gate."""
import json
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from normalize_rig_for_reverse import build_handoff, read_legacy_bones, CONTRACT, REVERSE

class TestReverseRigSizing(unittest.TestCase):
    def test_legacy_33_joints_preserved_but_dimensionless(self):
        x=build_handoff()
        self.assertEqual(x["legacyRig"]["boneCount"],33)
        self.assertEqual(len(x["normalizedBoneTemplate"]),33)
        self.assertAlmostEqual(max(b["unitlessPoint"][1] for b in x["normalizedBoneTemplate"]),1.0)
    def test_normalization_does_not_approve_legacy_rig(self):
        x=build_handoff()
        self.assertFalse(x["bindAllowed"])
        self.assertFalse(x["homepageAllowed"])
        self.assertFalse(x["legacyRig"]["physicalHumanHeightInferred"])
        self.assertTrue(all(b["role"]=="TEMPLATE_ONLY_NOT_APPROVED_FOR_BIND" for b in x["normalizedBoneTemplate"]))
    def test_reverse_is_source_of_visible_ratio(self):
        x=build_handoff()
        self.assertEqual(x["observed2D"]["headCrownToChin"],266)
        self.assertEqual(x["observed2D"]["visibleShoulderSpan"],353)
        self.assertGreater(x["observed2D"]["headToShoulderRatio"],1.0)
    def test_uncalibrated_camera_cannot_assert_world_height(self):
        x=build_handoff()
        contract=json.loads(CONTRACT.read_text(encoding="utf8"))
        self.assertFalse(contract["camera"]["calibrated"])
        self.assertIsNone(contract["camera"]["absoluteHeightMetres"])
        self.assertFalse(contract["bake"]["allowedToBind"])
        self.assertFalse(x["legacyRig"]["physicalHumanHeightInferred"])
    def test_no_authority_sha_drift(self):
        c=json.loads(CONTRACT.read_text(encoding="utf8"))
        r=json.loads(REVERSE.read_text(encoding="utf8"))
        self.assertEqual(c["sourceAuthoritySHA256"],r["source"]["sha256"])
        self.assertTrue(c["gates"]["rejectLegacySizeAuthority"])
    def test_hierarchy_no_fake_missing_bone(self):
        bones=read_legacy_bones()
        names={b[0] for b in bones}
        self.assertEqual(len(names),33)
        self.assertTrue(all(parent is None or parent in names for _,parent,_ in bones))

if __name__=="__main__": unittest.main()
