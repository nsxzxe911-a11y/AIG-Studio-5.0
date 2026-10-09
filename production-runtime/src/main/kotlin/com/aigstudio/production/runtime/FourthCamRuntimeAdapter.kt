package com.aigstudio.production.runtime

import com.aigstudio.runtime4.contract.*
import java.security.MessageDigest
import kotlin.math.abs

class FourthCamRuntimeAdapter(
    private val session:CleanCamSession=CleanCamSession(),
):CamRuntimePort,CamPersistencePort {
    private var toolNumber=1
    private var spindleRpm=2300.0
    private var leadInMm=2.0
    private var leadOutMm=2.0
    private var machiningRegion:CamMachiningRegion?=null
    private var strategyRevision=0L
    private var candidateRevision=0L
    private var activeRevision=0L
    private var saveRevision=0L
    private var state=CamState.initial().copy(strategy=buildStrategy())

    override fun snapshot():CamState=state

    override fun exportCheckpoint():String = CamCheckpointCodec.encode(CamCheckpointData(state,snapshotPoints()))

    override fun restoreCheckpoint(raw:String):CamDispatchResult {
        val before=state
        return try {
            val data=CamCheckpointCodec.decode(raw)
            require(strategyDigest(data.state.strategy)==data.state.strategy.digest){"CAM strategy digest mismatch"}
            data.state.active?.let { require(pathDigest(it.points)==it.digest){"CAM active digest mismatch"} }
            data.state.candidate?.let { require(pathDigest(it.points)==it.digest){"CAM candidate digest mismatch"} }
            data.state.savedCandidates.forEach { require(pathDigest(it.points)==it.digest){"CAM saved candidate digest mismatch"} }
            session.restoreBaseline(data.state.strategy,data.baseline)
            toolNumber=data.state.strategy.toolNumber
            spindleRpm=data.state.strategy.spindleRpm
            leadInMm=data.state.strategy.leadInMm
            leadOutMm=data.state.strategy.leadOutMm
            machiningRegion=data.state.strategy.machiningRegion
            strategyRevision=data.state.strategy.revision
            activeRevision=data.state.active?.revision ?: 0L
            candidateRevision=(listOfNotNull(data.state.candidate?.revision)+data.state.savedCandidates.map{it.revision}).maxOrNull() ?: 0L
            saveRevision=data.state.saveHistory.maxOfOrNull{it.revision} ?: 0L
            state=data.state.copy(message=null)
            accepted()
        } catch(e:Exception) {
            state=before.copy(message=RuntimeMessage(MessageSeverity.WARNING,e.message ?: "CAM checkpoint rejected"))
            CamDispatchResult(false,state)
        }
    }

    override fun dispatch(command:CamCommand):CamDispatchResult = try {
        when(command) {
            CamCommand.StartManual -> startManual()
            is CamCommand.SetToolNumber -> strategyMutation { require(command.value in 1..999){"Tool number out of range"}; toolNumber=command.value }
            is CamCommand.SetToolDiameter -> strategyMutation { session.setToolDiameter(command.valueMm) }
            is CamCommand.SetDepth -> strategyMutation { session.setDepth(command.valueMm) }
            is CamCommand.SetSafeZ -> strategyMutation { session.setSafeZ(command.valueMm) }
            is CamCommand.SetFeed -> strategyMutation { session.setFeed(command.valueMmMin) }
            is CamCommand.SetSpeed -> strategyMutation { require(command.valueRpm.isFinite() && command.valueRpm>0.0 && command.valueRpm<=99_999.0){"Spindle speed out of range"}; spindleRpm=command.valueRpm }
            is CamCommand.SetContourSide -> strategyMutation { if(session.side()!=command.value.name) session.toggleSide() }
            is CamCommand.SetContourDirection -> strategyMutation { if(session.direction()!=command.value.name) session.toggleDirection() }
            is CamCommand.SetLeadIn -> strategyMutation { require(command.valueMm.isFinite() && command.valueMm>=0.0){"Lead-in must be non-negative"}; leadInMm=command.valueMm }
            is CamCommand.SetLeadOut -> strategyMutation { require(command.valueMm.isFinite() && command.valueMm>=0.0){"Lead-out must be non-negative"}; leadOutMm=command.valueMm }
            is CamCommand.SetMachiningRegion -> strategyMutation { validateRegion(command.value); machiningRegion=command.value }
            is CamCommand.SelectSource -> {
                require(command.source.kind!=CamSourceKind.NONE){"Source kind NONE cannot be selected"}
                state=state.copy(source=command.source,zones=command.source.zones,message=null)
                accepted()
            }
            CamCommand.DisconnectSource -> { state=state.copy(sourceLink=CamSourceLinkState.DISCONNECTED,message=null); accepted() }
            CamCommand.ConnectSource -> {
                require(state.source!=null){"No CAM source selected"}
                state=state.copy(sourceLink=CamSourceLinkState.CONNECTED,message=null); accepted()
            }
            CamCommand.ConnectToolpath -> {
                state=state.copy(toolpathLink=CamToolpathLinkState.CONNECTED,message=null)
                generateCandidate()
            }
            CamCommand.DisconnectToolpath -> { state=state.copy(toolpathLink=CamToolpathLinkState.DISCONNECTED,message=null); accepted() }
            CamCommand.GenerateCandidate -> generateCandidate()
            CamCommand.PreviewCandidate -> {
                val candidate=state.candidate ?: return rejected("No CAM candidate to preview")
                state=state.copy(previewCandidateId=candidate.id,message=null); accepted()
            }
            CamCommand.KeepActiveToolpath -> { state=state.copy(previewCandidateId=null,message=null); accepted() }
            CamCommand.AdoptCandidate -> adoptCandidate()
            CamCommand.SaveCandidateAsNewVersion -> saveCandidate()
            is CamCommand.AddPoint -> editActive { points ->
                require(command.index in 0..points.size){"CAM point insert index out of range"}
                val p=manualPoint(command.x,command.y,command.z,command.a,command.b,command.c,command.motion)
                points.toMutableList().apply { add(command.index,p) }
            }
            is CamCommand.DeletePoint -> editActive { points ->
                require(points.size>2){"Active toolpath must keep at least two points"}
                require(command.index in points.indices){"CAM point index out of range"}
                points.toMutableList().apply { removeAt(command.index) }
            }
            is CamCommand.ReplacePointXYZABC -> editActive { points ->
                require(command.index in points.indices){"CAM point index out of range"}
                val old=points[command.index]
                val p=manualPoint(command.x,command.y,command.z,command.a,command.b,command.c,command.motion).copy(avoidance=old.avoidance)
                points.toMutableList().apply { this[command.index]=p }
            }
            is CamCommand.SetMotionKind -> editActive { points ->
                require(command.index in points.indices){"CAM point index out of range"}
                val old=points[command.index]
                val p=old.copy(motion=command.motion,arcI=null,arcJ=null,manualOverride=true)
                validatePoint(p)
                points.toMutableList().apply { this[command.index]=p }
            }
            is CamCommand.InsertAvoidance -> insertAvoidance(command)
            is CamCommand.AddZone -> addZone(command.zone)
            is CamCommand.RemoveZone -> removeZone(command.id)
            is CamCommand.SetSafeClearance -> setSafeClearance(command.id,command.valueMm)
            CamCommand.FreezeActive -> setFrozen(true)
            CamCommand.UnfreezeActive -> setFrozen(false)
            CamCommand.ClearLocalMessage -> { state=state.copy(message=null); accepted() }
        }
    } catch(e:IllegalArgumentException) {
        rejected(e.message ?: "CAM input rejected")
    } catch(e:IllegalStateException) {
        rejected(e.message ?: "CAM state rejected")
    } catch(e:Exception) {
        state=state.copy(message=RuntimeMessage(MessageSeverity.ALARM,e.message ?: "CAM operation failed"))
        CamDispatchResult(false,state)
    }

    private fun startManual():CamDispatchResult {
        if(session.mode()!="MANUAL") session.startManual()
        val points=snapshotPoints()
        require(points.size>=2){"Manual CAM path requires at least two points"}
        activeRevision++
        val active=CamToolpathVersion(
            id="TP$activeRevision",revision=activeRevision,digest=pathDigest(points),points=points,
            frozen=false,sourceRevision=state.source?.sourceRevision,strategyRevision=state.strategy.revision,
        )
        state=state.copy(active=active,candidate=null,previewCandidateId=null,toolpathLink=CamToolpathLinkState.DISCONNECTED,message=null)
        return accepted()
    }

    private inline fun strategyMutation(block:()->Unit):CamDispatchResult {
        block()
        strategyRevision++
        state=state.copy(strategy=buildStrategy(),message=null)
        return accepted()
    }

    private fun generateCandidate():CamDispatchResult {
        val points=snapshotPoints()
        require(points.size>=2){"No CAM path available for candidate"}
        candidateRevision++
        val candidate=CamCandidateToolpath(
            id="C$candidateRevision",revision=candidateRevision,digest=pathDigest(points),points=points,
            sourceRevision=state.source?.sourceRevision,strategyRevision=state.strategy.revision,
        )
        state=state.copy(candidate=candidate,previewCandidateId=null,message=null)
        return accepted()
    }

    private fun adoptCandidate():CamDispatchResult {
        val candidate=state.candidate ?: return rejected("No CAM candidate to adopt")
        if(state.active?.frozen==true) return rejected("Active toolpath is frozen")
        activeRevision++
        val active=CamToolpathVersion(
            id="TP$activeRevision",revision=activeRevision,digest=candidate.digest,points=candidate.points,
            frozen=false,sourceRevision=candidate.sourceRevision,strategyRevision=candidate.strategyRevision,
        )
        state=state.copy(active=active,candidate=null,previewCandidateId=null,message=null)
        return accepted()
    }

    private fun saveCandidate():CamDispatchResult {
        val candidate=state.candidate ?: return rejected("No CAM candidate to save")
        saveRevision++
        val record=CamSaveRecord(saveRevision,"CANDIDATE",candidate.id,candidate.digest,"Candidate ${candidate.id} saved")
        state=state.copy(savedCandidates=state.savedCandidates+candidate,saveHistory=state.saveHistory+record,message=null)
        return accepted()
    }

    private inline fun editActive(transform:(List<CamPointSnapshot>)->List<CamPointSnapshot>):CamDispatchResult {
        val active=state.active ?: return rejected("No active toolpath")
        if(active.frozen) return rejected("Active toolpath is frozen")
        val points=transform(active.points)
        require(points.size>=2){"Active toolpath must keep at least two points"}
        activeRevision++
        state=state.copy(active=active.copy(revision=activeRevision,digest=pathDigest(points),points=points),message=null)
        return accepted()
    }

    private fun manualPoint(x:Double,y:Double,z:Double,a:Double,b:Double,c:Double,motion:CamMotionKind):CamPointSnapshot {
        val point=CamPointSnapshot(x,y,z,a,b,c,motion,manualOverride=true)
        validatePoint(point)
        return point
    }

    private fun validatePoint(p:CamPointSnapshot) {
        require(listOf(p.x,p.y,p.z,p.a,p.b,p.c).all{it.isFinite()}){"CAM point must be finite"}
        require(abs(p.a)<=360.0 && abs(p.b)<=360.0 && abs(p.c)<=360.0){"CAM A/B/C out of range"}
        when(p.motion) {
            CamMotionKind.G0 -> require(p.z+1e-9>=state.strategy.safeZMm){"G0 point must be at or above Safe-Z"}
            CamMotionKind.G1 -> require(p.z<=1e-9){"G1 point must be at or below Z0"}
            CamMotionKind.G2, CamMotionKind.G3 -> {
                require(p.z<=1e-9){"Arc cut must be at or below Z0"}
                require(p.arcI!=null && p.arcJ!=null){"G2/G3 point requires arc center data"}
            }
        }
    }

    private fun insertAvoidance(command:CamCommand.InsertAvoidance):CamDispatchResult = editActive { points ->
        require(command.afterIndex in points.indices){"Avoidance insertion index out of range"}
        require(listOf(command.landingX,command.landingY,command.landingZ).all{it.isFinite()}){"Avoidance point must be finite"}
        require(command.landingZ<=1e-9){"Avoidance landing Z must be at or below Z0"}
        val from=points[command.afterIndex]
        val lift=CamPointSnapshot(from.x,from.y,state.strategy.safeZMm,from.a,from.b,from.c,CamMotionKind.G0,manualOverride=true,avoidance=true)
        val traverse=CamPointSnapshot(command.landingX,command.landingY,state.strategy.safeZMm,from.a,from.b,from.c,CamMotionKind.G0,manualOverride=true,avoidance=true)
        val landing=CamPointSnapshot(command.landingX,command.landingY,command.landingZ,from.a,from.b,from.c,CamMotionKind.G1,manualOverride=true,avoidance=true)
        points.toMutableList().apply { addAll(command.afterIndex+1,listOf(lift,traverse,landing)) }
    }

    private fun addZone(zone:CamZoneSnapshot):CamDispatchResult {
        validateZone(zone)
        require(state.zones.none{it.id==zone.id}){"CAM zone id already exists"}
        state=state.copy(zones=state.zones+zone,message=null)
        return accepted()
    }

    private fun removeZone(id:String):CamDispatchResult {
        require(state.zones.any{it.id==id}){"CAM zone not found"}
        state=state.copy(zones=state.zones.filterNot{it.id==id},message=null)
        return accepted()
    }

    private fun setSafeClearance(id:String,value:Double):CamDispatchResult {
        require(value.isFinite() && value in 0.0..1000.0){"Safe clearance out of range"}
        require(state.zones.any{it.id==id}){"CAM zone not found"}
        state=state.copy(zones=state.zones.map{if(it.id==id) it.copy(safeClearanceMm=value) else it},message=null)
        return accepted()
    }

    private fun validateZone(zone:CamZoneSnapshot) {
        require(zone.id.isNotBlank()){"CAM zone id is required"}
        require(listOf(zone.minX,zone.minY,zone.maxX,zone.maxY,zone.safeClearanceMm).all{it.isFinite()}){"CAM zone values must be finite"}
        require(zone.maxX-zone.minX>=0.001 && zone.maxY-zone.minY>=0.001){"CAM zone must be at least 0.001 mm"}
        require(zone.safeClearanceMm in 0.0..1000.0){"Safe clearance out of range"}
    }

    private fun setFrozen(value:Boolean):CamDispatchResult {
        val active=state.active ?: return rejected("No active toolpath")
        state=state.copy(active=active.copy(frozen=value),message=null)
        return accepted()
    }

    private fun buildStrategy():CamStrategySnapshot {
        val base=CamStrategySnapshot(
            toolNumber=toolNumber,
            toolDiameterMm=session.toolDiameter(),depthMm=session.depth(),safeZMm=session.safeZ(),feedMmMin=session.feed(),
            spindleRpm=spindleRpm,
            side=CamContourSide.valueOf(session.side()),direction=CamContourDirection.valueOf(session.direction()),
            leadInMm=leadInMm,leadOutMm=leadOutMm,machiningRegion=machiningRegion,revision=strategyRevision,
        )
        return base.copy(digest=strategyDigest(base))
    }

    private fun snapshotPoints():List<CamPointSnapshot> = session.points().map { p ->
        CamPointSnapshot(p.x,p.y,p.z,p.axisA,p.axisB,p.axisC,p.motion,p.arcI,p.arcJ)
    }

    private fun validateRegion(region:CamMachiningRegion?) {
        if(region==null) return
        require(listOf(region.minX,region.minY,region.maxX,region.maxY).all{it.isFinite()}){"Machining region must be finite"}
        require(region.maxX-region.minX>=0.001 && region.maxY-region.minY>=0.001){"Machining region must be at least 0.001 mm"}
    }

    private fun strategyDigest(v:CamStrategySnapshot):String = sha(buildString {
        append(v.toolNumber).append('|'); d(v.toolDiameterMm); d(v.depthMm); d(v.safeZMm); d(v.feedMmMin); d(v.spindleRpm)
        append(v.side.name).append('|').append(v.direction.name).append('|'); d(v.leadInMm); d(v.leadOutMm)
        v.machiningRegion?.let { d(it.minX); d(it.minY); d(it.maxX); d(it.maxY) } ?: append("NONE|")
    })

    private fun pathDigest(points:List<CamPointSnapshot>):String = sha(buildString {
        append("AIG_CAM_PATH_V1|").append(points.size).append('|')
        points.forEach { p ->
            d(p.x); d(p.y); d(p.z); d(p.a); d(p.b); d(p.c); append(p.motion.name).append('|')
            nullableD(p.arcI); nullableD(p.arcJ); append(if(p.manualOverride)'1' else '0').append('|'); append(if(p.avoidance)'1' else '0').append('|')
        }
    })

    private fun StringBuilder.d(value:Double){ append(java.lang.Double.doubleToLongBits(value)).append('|') }
    private fun StringBuilder.nullableD(value:Double?){ if(value==null) append("NULL|") else d(value) }
    private fun sha(raw:String):String = MessageDigest.getInstance("SHA-256").digest(raw.toByteArray(Charsets.UTF_8)).joinToString(""){"%02x".format(it)}
    private fun accepted()=CamDispatchResult(true,state)
    private fun rejected(text:String):CamDispatchResult { state=state.copy(message=RuntimeMessage(MessageSeverity.WARNING,text)); return CamDispatchResult(false,state) }
}
