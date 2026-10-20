"""Produce explicitly synthetic protocol evidence, NEVER a generated photo model."""
import argparse, json, shutil
from pathlib import Path
from test_pipeline import PipelineTest
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from server import offline_document


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--out',required=True);a=parser.parse_args()
    out=Path(a.out);out.mkdir(parents=True,exist_ok=False)
    PipelineTest.setUpClass();case=PipelineTest();case.setUp()
    try:
        job=case.p.create(case.source,action_id=4)['id'];result=case.finish(job)
        assert result['status']=='COMPLETE'
        html=offline_document(case.p,job)
        html=html.replace('<main>','<div style="position:fixed;z-index:99;bottom:0;left:0;padding:8px;background:#4a3111;color:#ffe2aa;font:12px sans-serif">SYNTHETIC QA · 合成協定測試 · 非照片重建／非人物模型</div><main>')
        (out/'CI-SYNTHETIC-ANIMATION-NOT-PHOTO-RESULT.html').write_text(html,encoding='utf8')
        shutil.copytree(case.p.directory(job),out/'SYNTHETIC-JOB',ignore=shutil.ignore_patterns('.lock'))
        evidence={'schema':'AIG_SINGLE_PHOTO_2_7_CI','liveProviderCalled':False,'realPhotoReconstructionVerified':False,'realisticVisualQualityVerified':False,'fixture':'synthetic tetrahedron + translation animation','remoteTaskChain':'local HTTP fixture only','result':result['status'],'releaseAllowed':False}
        (out/'CI-EVIDENCE-NOT-LIVE-GENERATION.json').write_text(json.dumps(evidence,indent=2)+'\n')
        bundle=out/'SOURCE-AND-LOCAL-VIEWER';bundle.mkdir()
        root=Path(__file__).resolve().parents[1]
        for name in ('provider.py','pipeline.py','glb.py','server.py','index.html','README.md','requirements.txt','package.json','package-lock.json','build.mjs','viewer.mjs','app.mjs','submission.mjs'):
            shutil.copyfile(root/name,bundle/name)
        shutil.copytree(root/'dist',bundle/'dist')
        shutil.copytree(root/'tests',bundle/'tests',ignore=shutil.ignore_patterns('__pycache__'))
    finally:
        case.doCleanups();PipelineTest.tearDownClass()


if __name__=='__main__':main()
