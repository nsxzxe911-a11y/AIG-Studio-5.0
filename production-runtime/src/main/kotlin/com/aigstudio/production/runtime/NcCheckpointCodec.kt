package com.aigstudio.production.runtime

import com.aigstudio.runtime4.contract.*
import java.security.MessageDigest
import java.util.Base64

data class NcCheckpointData(val state:NcState)

object NcCheckpointCodec {
    const val HEADER="AIG_NC_CHECKPOINT_V1"
    private val encoder=Base64.getUrlEncoder().withoutPadding()
    private val decoder=Base64.getUrlDecoder()

    fun encode(data:NcCheckpointData):String {
        validate(data)
        val s=data.state; val p=s.machineProfile; val w=s.working; val motion=s.motionProgram!!
        return buildString {
            appendLine(HEADER)
            appendLine(listOf("PROFILE",txt(p.id),p.axisCount.toString(),range(p.x),range(p.y),range(p.z),range(p.a),range(p.b),range(p.c),txt(p.customCodes.sorted().joinToString("\u001f")),txt(p.g34Profile),p.revision.toString(),txt(p.digest)).joinToString("|"))
            appendLine("WORK|${txt(w.id)}|${w.revision}|${txt(w.digest)}|${w.cursorOffset}|${if(w.frozen)1 else 0}")
            appendLine("PROGRAM|${enc(w.program)}")
            appendLine("LINK|${s.camLink.name}")
            s.candidate?.let{c->appendLine(candidateLine("CAND",c,null))}
            s.savedCandidates.forEachIndexed{i,c->appendLine(candidateLine("SAVED",c,i))}
            appendLine("PREVIEW|${s.previewCandidateId?.let(::txt) ?: "-"}")
            s.saveHistory.forEach{h->appendLine("HIST|${h.revision}|${txt(h.kind)}|${txt(h.id)}|${txt(h.digest)}|${txt(h.message)}")}
            appendLine("MOTION|${txt(motion.id)}|${motion.revision}|${txt(motion.digest)}")
            appendLine("DIAG_SOURCE|${w.revision}|${p.revision}|${txt(motion.digest)}")
            appendLine("END")
        }
    }

    fun decode(raw:String):NcCheckpointData {
        val lines=raw.replace("\r\n","\n").replace('\r','\n').trimEnd('\n').split('\n')
        require(lines.size>=8 && lines.first()==HEADER){"Unsupported NC checkpoint schema"}
        require(lines.last()=="END") {"NC checkpoint is truncated"}
        var profile:NcMachineProfileSnapshot?=null
        var workHeader:WorkHeader?=null; var program:String?=null; var link:NcCamLinkState?=null
        var candidate:NcCandidate?=null; val saved=linkedMapOf<Int,NcCandidate>(); var preview:String?=null; var previewSeen=false
        val history=mutableListOf<NcSaveRecord>(); var motion:MotionProgram?=null; var diagSeen=false
        lines.drop(1).dropLast(1).forEach{line->
            require(line.isNotBlank()){"Blank NC checkpoint record"}; val x=line.split('|')
            when(x[0]){
                "PROFILE"->{require(x.size==13 && profile==null);profile=NcMachineProfileSnapshot(decTxt(x[1]),int(x[2]),parseRange(x[3]),parseRange(x[4]),parseRange(x[5]),parseRange(x[6]),parseRange(x[7]),parseRange(x[8]),decTxt(x[9]).split('\u001f').filter{it.isNotBlank()}.toSet(),decTxt(x[10]),long(x[11]),decTxt(x[12]))}
                "WORK"->{require(x.size==6 && workHeader==null);workHeader=WorkHeader(decTxt(x[1]),long(x[2]),decTxt(x[3]),int(x[4]),bool(x[5]))}
                "PROGRAM"->{require(x.size==2 && program==null);program=dec(x[1])}
                "LINK"->{require(x.size==2 && link==null);link=enumValueOf(x[1])}
                "CAND"->{require(candidate==null);candidate=parseCandidate(x,1)}
                "SAVED"->{require(x.size==8);val i=int(x[1]);require(i>=0 && i !in saved);saved[i]=parseCandidate(x,2)}
                "PREVIEW"->{require(x.size==2 && !previewSeen);previewSeen=true;preview=if(x[1]=="-")null else decTxt(x[1])}
                "HIST"->{require(x.size==6);history+=NcSaveRecord(long(x[1]),decTxt(x[2]),decTxt(x[3]),decTxt(x[4]),decTxt(x[5]))}
                "MOTION"->{require(x.size==4 && motion==null);motion=MotionProgram(decTxt(x[1]),long(x[2]),decTxt(x[3]),emptyList())}
                "DIAG_SOURCE"->{require(x.size==4 && !diagSeen);diagSeen=true}
                else->error("Unknown NC checkpoint record: ${x[0]}")
            }
        }
        val p=profile?:error("NC machine profile missing"); val wh=workHeader?:error("NC Working Copy header missing"); val text=program?:error("NC program missing")
        val working=NcWorkingCopy(wh.id,wh.revision,wh.digest,text,wh.cursor,wh.frozen)
        val st=NcState(machineProfile=p,working=working,camLink=link?:error("NC CAM link missing"),candidate=candidate,savedCandidates=saved.toSortedMap().values.toList(),previewCandidateId=preview,motionProgram=motion?:error("NC motion identity missing"),saveHistory=history)
        require(previewSeen && diagSeen){"NC preview/diagnostic source record missing"}
        return NcCheckpointData(st).also(::validate)
    }

    fun validate(data:NcCheckpointData){
        val s=data.state; val w=s.working; require(w.id.isNotBlank() && w.revision>=1 && w.digest.isNotBlank());require(w.cursorOffset in 0..w.program.length);require(sha256(w.program)==w.digest){"NC Working Copy digest mismatch"}
        require(s.machineProfile.id.isNotBlank() && s.machineProfile.axisCount in 3..6 && s.machineProfile.revision>=0)
        s.candidate?.let(::validateCandidate);s.savedCandidates.forEach(::validateCandidate)
        if(s.previewCandidateId!=null)require(s.candidate?.id==s.previewCandidateId){"NC preview candidate is stale"}
        require(s.saveHistory.map{it.revision}.distinct().size==s.saveHistory.size){"Duplicate NC save revision"}
        val m=s.motionProgram?:error("NC MotionProgram identity missing");require(m.id.isNotBlank() && m.revision>=1 && m.digest.isNotBlank())
    }
    private fun validateCandidate(c:NcCandidate){require(c.id.isNotBlank() && c.revision>=1 && c.digest.isNotBlank());require(sha256(c.program)==c.digest){"NC candidate digest mismatch"}}
    private data class WorkHeader(val id:String,val revision:Long,val digest:String,val cursor:Int,val frozen:Boolean)
    private fun candidateLine(tag:String,c:NcCandidate,index:Int?)=listOfNotNull(tag,index?.toString(),txt(c.id),c.revision.toString(),txt(c.digest),c.sourceKind.name,c.sourceRevision?.toString()?:"-",enc(c.program)).joinToString("|")
    private fun parseCandidate(x:List<String>,o:Int):NcCandidate{require(x.size==o+6);return NcCandidate(decTxt(x[o]),long(x[o+1]),decTxt(x[o+2]),dec(x[o+5]),enumValueOf(x[o+3]),nullableLong(x[o+4]),null)}
    private fun range(r:NcAxisRangeSnapshot?)=r?.let{"${it.min},${it.max}"}?:"-"
    private fun parseRange(s:String):NcAxisRangeSnapshot?=if(s=="-")null else s.split(',').also{require(it.size==2)}.let{NcAxisRangeSnapshot(num(it[0]),num(it[1]))}
    private fun enc(s:String)=encoder.encodeToString(s.toByteArray(Charsets.UTF_8));private fun dec(s:String)=String(decoder.decode(s),Charsets.UTF_8)
    private fun txt(s:String)=if(s.isEmpty())"-" else enc(s);private fun decTxt(s:String)=if(s=="-")"" else dec(s)
    private fun int(s:String)=s.toIntOrNull()?:error("Invalid NC integer");private fun long(s:String)=s.toLongOrNull()?.takeIf{it>=0}?:error("Invalid NC revision")
    private fun nullableLong(s:String)=if(s=="-")null else long(s);private fun num(s:String)=s.toDoubleOrNull()?.takeIf{it.isFinite()}?:error("Invalid NC number")
    private fun bool(s:String)=when(s){"1"->true;"0"->false;else->error("Invalid NC boolean")}
    private fun sha256(text:String)=MessageDigest.getInstance("SHA-256").digest(text.toByteArray(Charsets.UTF_8)).joinToString(""){"%02x".format(it)}
}