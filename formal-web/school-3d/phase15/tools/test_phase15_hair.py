"""Fail-closed QA for original AIG 3D hair cards and actual bone animation."""
from __future__ import annotations
import hashlib, json, math, os, struct, sys, tempfile, unittest
from pathlib import Path
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
from build_hair_cards import read_glb, make_hair
ROOT=HERE.parent
LOCAL=Path('/mnt/data')

def pvar(key,local):return Path(os.environ.get(key,str(local)))
BASE=pvar('AIG_PHASE15_BASE_GLB',LOCAL/'AIG_School3D_Phase13_Envelope/out/source-envelope-NOT-AUTHORITY.glb')
OUTPUT=pvar('AIG_PHASE15_OUTPUT_GLB',ROOT/'out/phase15-real-3d-hair-cards-NOT-APPROVED.glb')
HAIR=pvar('AIG_PHASE15_HAIR_SPEC',LOCAL/'AIG_School3D_Phase14_HairFace/hair-face-spec.v1.json')
IMAGE=pvar('AIG_PHASE15_SOURCE_IMG',LOCAL/'櫻花校園的青春時光.png')
ENV=pvar('AIG_PHASE15_ENVELOPE_SPEC',LOCAL/'AIG_School3D_Phase13_Envelope/mesh-envelope.v1.json')
BUILDER=pvar('AIG_PHASE15_PHASE13_BUILDER',LOCAL/'AIG_School3D_Phase13_Envelope/tools/build_envelope.py')

def get_access(g,b,index):
    a=g['accessors'][index];v=g['bufferViews'][a['bufferView']]
    comps={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
    fmt={5126:'f',5123:'H',5125:'I'}[a['componentType']]
    stride=struct.calcsize('<'+fmt*comps)
    start=v.get('byteOffset',0)+a.get('byteOffset',0)
    return [struct.unpack_from('<'+fmt*comps,b,start+k*stride) for k in range(a['count'])]

def qrotate(q,v):
    x,y,z,w=q; vx,vy,vz=v
    # Quaternion vector transform q v q^-1 (assuming q normalized)
    tx=2*(y*vz-z*vy);ty=2*(z*vx-x*vz);tz=2*(x*vy-y*vx)
    return (vx+w*tx+(y*tz-z*ty),vy+w*ty+(z*tx-x*tz),vz+w*tz+(x*ty-y*tx))

def add(a,b):return tuple(a[i]+b[i] for i in range(3))
def sub(a,b):return tuple(a[i]-b[i] for i in range(3))
def mul(a,v):return tuple(a*q for q in v)

def test_actual_skin_deforms(g,b,strand=0,frame=6):
    mesh=g['meshes'][18+strand]['primitives'][0]
    positions=get_access(g,b,mesh['attributes']['POSITION'])
    jrows=get_access(g,b,mesh['attributes']['JOINTS_0'])
    weights=get_access(g,b,mesh['attributes']['WEIGHTS_0'])
    anim=g['animations'][-1]
    assert len(anim['channels'])==176
    jointids=g['skins'][1]['joints']
    root_id=jointids[7+strand*2]; tip_id=jointids[8+strand*2]
    def animquat(nid):
        c=next(c for c in anim['channels'] if c['target']['node']==nid)
        smp=anim['samplers'][c['sampler']]
        return get_access(g,b,smp['output'])[frame]
    qr=animquat(root_id);qt=animquat(tip_id)
    # Exact rest globals built by the Phase15 builder: Head global + root local, tip global = root + local.
    spec=json.loads(ENV.read_text())
    pxunit=spec['mesh']['pixelToUnit']
    ref=spec['skeleton']['joints'][4]['xy']
    head=((ref[0]-653)*pxunit,(941-ref[1])*pxunit,0)
    rl=g['nodes'][root_id]['translation'];tl=g['nodes'][tip_id]['translation']
    root=add(head,rl); mid=add(root,tl)
    def skinned(point,weight):
        r1=add(root,qrotate(qr,sub(point,root)))
        # tip bone child of root, so first rotate tip vector about mid, then root around root.
        r2=add(root,qrotate(qr,add(sub(mid,root),qrotate(qt,sub(point,mid)))))
        return add(mul(weight[0],r1),mul(weight[1],r2))
    # t=0 left edge and t=1 left edge. 4 vertices per section.
    start=0;finish=(9-1)*4
    initial_start=positions[start];final_start=skinned(initial_start,weights[start])
    initial_end=positions[finish];final_end=skinned(initial_end,weights[finish])
    return (math.dist(initial_start,final_start),math.dist(initial_end,final_end),qr,qt)

class TestPhase15(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.g,cls.b=read_glb(OUTPUT); cls.old,cls.oldbin=read_glb(BASE)
        cls.s=json.loads(HAIR.read_text());cls.e=json.loads(ENV.read_text())
    def test_01_binary_prefix_and_old_meshes_byte_for_byte_unchanged(self):
        self.assertEqual(self.b[:len(self.oldbin)],self.oldbin)
        self.assertEqual(self.g['meshes'][:18],self.old['meshes'])
        self.assertEqual(self.g['images'],self.old['images'])
        self.assertEqual(self.g['textures'],self.old['textures'])
    def test_02_88_real_new_meshes_with_nonzero_3d_thickness(self):
        self.assertEqual(len(self.g['meshes']),106)
        for i in range(88):
            mesh=self.g['meshes'][18+i];self.assertTrue(mesh['name'].startswith('True3DHairCard_'))
            pp=get_access(self.g,self.b,mesh['primitives'][0]['attributes']['POSITION'])
            self.assertEqual(len(pp),9*4)
            self.assertGreater(max(v[2] for v in pp)-min(v[2] for v in pp),.002)
    def test_03_two_skins_and_real_hair_bones(self):
        self.assertEqual(len(self.g['skins']),2)
        self.assertEqual(len(self.g['skins'][0]['joints']),7)
        self.assertEqual(len(self.g['skins'][1]['joints']),183)
        self.assertEqual(len([n for n in self.g['nodes'] if n.get('name','').startswith('Hair_')]),176)
    def test_04_actual_joint_keyframes_encoded(self):
        a=self.g['animations'][-1];self.assertEqual(len(a['channels']),176)
        self.assertEqual(len(a['samplers']),176)
        self.assertEqual(len(get_access(self.g,self.b,a['samplers'][0]['input'])),25)
        for c in a['channels']:self.assertEqual(c['target']['path'],'rotation')
    def test_05_root_is_anchored_to_head(self):
        nodes=self.g['nodes'];head=nodes[4]
        roots=[i for i,n in enumerate(nodes) if n.get('name','').endswith('_Scalp')]
        self.assertEqual(len(roots),88)
        self.assertTrue(set(roots).issubset(set(head['children'])))
        for ri in roots:self.assertEqual(len(nodes[ri]['children']),1)
    def test_06_no_legacy_doll_and_no_release(self):
        x=self.g['extras'];self.assertFalse(x['legacyDollGeometryUsed'])
        self.assertFalse(x['visualAuthorityApproved']);self.assertFalse(x['releaseAllowed'])
        self.assertFalse(x['hasGenuineFacialAI']);self.assertTrue(x['inferredSideAndBack'])
    def test_07_exact_source_sha(self):
        sha=hashlib.sha256(IMAGE.read_bytes()).hexdigest()
        self.assertEqual(sha,self.g['extras']['sourceImageSHA256'])
        self.assertEqual(sha,self.s['source']['sha256'])
        self.assertEqual(sha,self.e['source']['sha256'])
    def test_08_true_bone_motion_changes_tip(self):
        v=[test_actual_skin_deforms(self.g,self.b,strand=i,frame=6) for i in (0,30,45,70)]
        self.assertTrue(any(e[1]>.003 for e in v),v)
        self.assertTrue(all(e[1]>e[0] for e in v),v)
    def test_09_weights_are_valid(self):
        for i in (0,28,55,87):
            p=self.g['meshes'][18+i]['primitives'][0]
            w=get_access(self.g,self.b,p['attributes']['WEIGHTS_0'])
            j=get_access(self.g,self.b,p['attributes']['JOINTS_0'])
            for x,y in zip(w,j):
                self.assertAlmostEqual(sum(x),1.0,places=5)
                self.assertLess(max(y),183)
    def test_10_input_mismatch_is_blocked(self):
        with tempfile.TemporaryDirectory() as td:
            bad=Path(td)/'bad.png';bad.write_bytes(IMAGE.read_bytes()+b'corruption')
            with self.assertRaises(ValueError):make_hair(BASE,bad,HAIR,ENV,Path(td)/'bad.glb',BUILDER)
    def test_11_two_runs_are_identical(self):
        with tempfile.TemporaryDirectory() as td:
            out=Path(td)/'rebuild.glb'
            r=make_hair(BASE,IMAGE,HAIR,ENV,out,BUILDER)
            self.assertEqual(r['sha256'],hashlib.sha256(OUTPUT.read_bytes()).hexdigest())
    def test_12_only_original_workflow_hair_joint_data(self):
        self.assertEqual(len(self.g['animations']),len(self.old['animations'])+1)
        self.assertEqual(self.g['animations'][:-1],self.old['animations'])
        self.assertTrue(self.g['asset']['generator'].startswith('AIG Phase15'))

if __name__=='__main__':unittest.main()