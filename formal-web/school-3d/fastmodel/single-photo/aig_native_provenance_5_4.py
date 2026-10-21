"""AIG 5.4: verify *persisted* native-job source -> scaffold -> GLB byte chain.
No 3D identity inference, no network, no release or cryptographic signing claim.
"""
import json
import hashlib
import struct
from pathlib import Path

SCHEMA="AIG_FASTMODEL_5_4_NATIVE_SOURCE_CHAIN_TECHNICAL_ONLY"

def sha256(path):
    with Path(path).open("rb") as source:
        return hashlib.file_digest(source,"sha256").hexdigest()

def source_glb_extras(path):
    path=Path(path)
    if path.stat().st_size<32 or path.stat().st_size>40*1024*1024:
        raise ValueError("AIG54_GLB_SIZE_INVALID")
    with path.open("rb") as source:
        head=source.read(20)
        if len(head)!=20:
            raise ValueError("AIG54_GLB_HEADER_INVALID")
        magic,version,claimed,json_size,json_magic=struct.unpack("<5I",head)
        if magic!=0x46546c67 or version!=2 or claimed!=path.stat().st_size or \
            json_magic!=0x4e4f534a or json_size<8 or json_size>4*1024*1024:
            raise ValueError("AIG54_GLB_HEADER_INVALID")
        doc=json.loads(source.read(json_size))
    if doc.get("asset",{}).get("generator")!="AIG FastModel 4.0 self-developed scaffold":
        raise ValueError("AIG54_NATIVE_ENGINE_MARKER_MISSING")
    return doc.get("extras") or {}

def audit_native_aig4_job(job_dir,job):
    job_dir=Path(job_dir)
    if job.get("status")!="COMPLETE" or job.get("mode")!="SCULPTURAL_VOLUME_NOT_HUMANOID_RIG":
        raise ValueError("AIG54_NATIVE_COMPLETED_DRAFT_REQUIRED")
    if job.get("real3DMeshProduced") is not True or \
        job.get("isolatedProcessVerified") is not True or \
        job.get("noCreditsSpent") is not True or job.get("networkRequestsMade")!=0:
        raise ValueError("AIG54_NATIVE_JOB_POLICY_UNVERIFIED")
    source=job_dir/"front-input"
    model=job_dir/"generated"/"AIG-4.0-VOLUME-TECHNICAL-NOT-APPROVED.glb"
    scaffold=job_dir/"generated"/"scaffold.json"
    side=job_dir/"side-input"
    if not source.is_file() or not model.is_file() or not scaffold.is_file():
        raise ValueError("AIG54_REAL_SOURCE_OR_OUTPUT_MISSING")
    source_hash=sha256(source);model_hash=sha256(model);scaffold_hash=sha256(scaffold)
    a=job.get("artifacts") or {}
    if source_hash!=job.get("sourceSHA256") or \
      model_hash!=a.get("model.glb",{}).get("sha256") or \
      scaffold_hash!=a.get("scaffold.json",{}).get("sha256"):
        raise ValueError("AIG54_PERSISTED_DIGEST_MISMATCH")
    side_hash=sha256(side) if side.is_file() else None
    if side_hash!=job.get("sideSourceSHA256"):
        raise ValueError("AIG54_SIDE_SOURCE_DIGEST_MISMATCH")
    doc=json.loads(scaffold.read_text(encoding="utf-8"))
    extras=source_glb_extras(model)
    if doc.get("sourceSHA256")!=source_hash or doc.get("meshGLBSHA256")!=model_hash or \
      doc.get("sideSourceSHA256")!=side_hash or extras.get("sourceImageSHA256")!=source_hash:
        raise ValueError("AIG54_EMBEDDED_SOURCE_MISMATCH")
    if doc.get("meshType")!="CLOSED_ELLIPTICAL_SECTION_VOLUME" or \
      doc.get("autoRiggingAvailable") is not False or \
      doc.get("unseenSurfacesInferred") is not True or \
      extras.get("rigged") is not False or \
      extras.get("structuralDraftOnly") is not True or \
      extras.get("realHeroineGLBApproved") is not False:
        raise ValueError("AIG54_NOT_NATIVE_TECHNICAL_DRAFT")
    script=Path(__file__).with_name("aig_native4.py")
    current_script_sha=sha256(script)
    worker_sha=job.get("nativeEngineSourceSHA256")
    if worker_sha is None or len(worker_sha)!=64:
        raise ValueError("AIG54_PRE54_JOB_MISSING_GENERATOR_PROVENANCE")
    # Old verified outputs can be inspected after future code revisions.
    return {
      "schema":SCHEMA,"status":"SOURCE_CHAIN_INTEGRITY_PASS_TECHNICAL_DRAFT_ONLY",
      "sourceImageSHA256":source_hash,"optionalSideSHA256":side_hash,
      "modelGLBSHA256":model_hash,"scaffoldSHA256":scaffold_hash,
      "nativeEngineSourceSHA256AtBuild":worker_sha,
      "engineSourceNowMatchesBuild":current_script_sha==worker_sha,
      "sourceGLBEmbeddedSHA256Matches":True,
      "jobId":job.get("id"),"requestId":job.get("requestId"),
      "verificationPerformedOnPersistedSourceBytes":True,
      "verificationPerformedOnPersistedGLBBytes":True,
      "zeroCreditNativeOnly":True,"networkRequestsMade":0,
      "generatorHasHumanoidRig":False,"fullBody5_0Validated":False,
      "hairCollisions5_1Validated":False,"realHeroineAppearanceApproved":False,
      "glbSourceIntegrityOnlyNotSemanticIdentity":True,
      "sameJobSourceToGLBVerified":True,
      "formalReleaseAllowed":False,"releaseAllowed":False
    }
