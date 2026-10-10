package com.aigstudio.runtime4.renderer.machine

import com.aigstudio.runtime4.contract.AxisMode

private fun linear(id:String,axis:MachineAxis,parent:String?,pivot:MachineVec3,min:Double,max:Double)=MachineJointSpec(id,axis,JointKind.LINEAR,parent,pivot,min,max)
private fun rotary(id:String,axis:MachineAxis,parent:String?,pivot:MachineVec3,min:Double,max:Double)=MachineJointSpec(id,axis,JointKind.ROTARY,parent,pivot,min,max)
private fun part(id:String,parent:String?,sx:Float,sy:Float,sz:Float,ox:Float,oy:Float,oz:Float)=MachinePartSpec(id,parent,MachineVec3(sx,sy,sz),MachineVec3(ox,oy,oz))

val MachineProfile3Ax=MachineProfile(
    AxisMode.AXIS3,"AIG-3AX-VMC",
    listOf(
        linear("X",MachineAxis.X,null,MachineVec3(0f,0f,0f),-500.0,500.0),
        linear("Y",MachineAxis.Y,"X",MachineVec3(0f,0f,0f),-400.0,400.0),
        linear("Z",MachineAxis.Z,null,MachineVec3(0f,0f,0f),-500.0,500.0),
    ),
    listOf(
        part("BASE",null,7.2f,0.8f,5.4f,0f,-2.5f,0f),part("COLUMN",null,1.3f,5.0f,1.5f,-2.8f,0f,0.5f),
        part("TABLE","Y",4.8f,0.5f,3.4f,0f,-1.55f,0f),part("WORKPIECE","Y",2.8f,0.8f,2.0f,0f,-0.88f,0f),
        part("SPINDLE","Z",0.9f,1.8f,0.9f,0f,2.0f,0f),part("TOOL","Z",0.22f,2.0f,0.22f,0f,0.15f,0f),
    ),MachineVec3(0f,-0.88f,0f),MachineVec3(0f,0.15f,0f)
)

val MachineProfile4AxHrtStyle=MachineProfile(
    AxisMode.AXIS4,"AIG-4AX-HRT-STYLE",
    listOf(
        linear("X",MachineAxis.X,null,MachineVec3(0f,0f,0f),-500.0,500.0),
        linear("Y",MachineAxis.Y,"X",MachineVec3(0f,0f,0f),-400.0,400.0),
        linear("Z",MachineAxis.Z,null,MachineVec3(0f,0f,0f),-500.0,500.0),
        rotary("A",MachineAxis.A,"Y",MachineVec3(0.65f,-0.78f,0f),-360.0,360.0),
    ),
    listOf(
        part("BASE",null,7.4f,0.8f,5.6f,0f,-2.5f,0f),part("COLUMN",null,1.3f,5.0f,1.5f,-2.9f,0f,0.5f),
        part("TABLE","Y",5.0f,0.5f,3.5f,0f,-1.55f,0f),part("ROTARY_HOUSING","Y",1.45f,1.55f,1.65f,-0.65f,-0.78f,0f),
        part("PLATTER","A",0.34f,1.65f,1.65f,0.35f,-0.78f,0f),part("CHUCK","A",0.42f,1.15f,1.15f,0.62f,-0.78f,0f),
        part("WORKPIECE","A",1.7f,0.82f,0.82f,1.55f,-0.78f,0f),part("SPINDLE","Z",0.9f,1.8f,0.9f,0.4f,2.1f,0f),part("TOOL","Z",0.22f,2.0f,0.22f,0.4f,0.3f,0f),
    ),MachineVec3(1.55f,-0.78f,0f),MachineVec3(0.4f,0.3f,0f)
)

val MachineProfile5AxTrunnionStyle=MachineProfile(
    AxisMode.AXIS5,"AIG-5AX-TRUNNION-STYLE",
    listOf(
        linear("X",MachineAxis.X,null,MachineVec3(0f,0f,0f),-500.0,500.0),
        linear("Y",MachineAxis.Y,"X",MachineVec3(0f,0f,0f),-400.0,400.0),
        linear("Z",MachineAxis.Z,null,MachineVec3(0f,0f,0f),-500.0,500.0),
        rotary("A",MachineAxis.A,"Y",MachineVec3(0f,-0.72f,0f),-120.0,120.0),
        rotary("B",MachineAxis.B,"A",MachineVec3(0f,-0.72f,0f),-360.0,360.0),
    ),
    listOf(
        part("BASE",null,7.6f,0.8f,5.8f,0f,-2.5f,0f),part("COLUMN",null,1.3f,5.0f,1.5f,-3.0f,0f,0.5f),part("TABLE","Y",5.2f,0.45f,3.6f,0f,-1.55f,0f),
        part("TILT_SUPPORT_LEFT","Y",0.72f,2.0f,1.7f,-2.15f,-0.78f,0f),part("TILT_SUPPORT_RIGHT","Y",0.72f,2.0f,1.7f,2.15f,-0.78f,0f),
        part("TILT_CRADLE","A",3.8f,0.48f,2.7f,0f,-0.72f,0f),part("PLATTER","B",2.35f,0.28f,2.35f,0f,-0.37f,0f),part("WORKPIECE","B",1.55f,0.9f,1.55f,0f,0.22f,0f),
        part("SPINDLE","Z",0.9f,1.8f,0.9f,0f,2.2f,0f),part("TOOL","Z",0.22f,2.0f,0.22f,0f,0.35f,0f),
    ),MachineVec3(0f,0.22f,0f),MachineVec3(0f,0.35f,0f)
)

val MachineProfile6AxNicStyle=MachineProfile(
    AxisMode.AXIS6,"AIG-6AX-NIC-STYLE",
    listOf(
        linear("X",MachineAxis.X,null,MachineVec3(0f,0f,0f),-500.0,500.0),
        linear("Y",MachineAxis.Y,"X",MachineVec3(0f,0f,0f),-400.0,400.0),
        linear("Z",MachineAxis.Z,"Y",MachineVec3(0f,0f,0f),-500.0,500.0),
        rotary("A",MachineAxis.A,"Z",MachineVec3(0f,1.6f,0f),-180.0,180.0),
        rotary("B",MachineAxis.B,"A",MachineVec3(0f,1.05f,0f),-180.0,180.0),
        rotary("C",MachineAxis.C,"B",MachineVec3(0f,0.55f,0f),-360.0,360.0),
    ),
    listOf(
        part("BASE",null,7.8f,0.8f,5.8f,0f,-2.55f,0f),part("COLUMN",null,1.45f,5.4f,1.65f,-3.05f,0.05f,0.55f),part("TABLE","Y",4.8f,0.5f,3.5f,0f,-1.55f,0f),
        part("WORKPIECE","Y",2.2f,0.9f,1.8f,0f,-0.82f,0f),part("SWIVEL_A","A",1.35f,1.05f,1.25f,0f,1.6f,0f),part("SWIVEL_B","B",1.05f,0.95f,1.05f,0f,1.05f,0f),
        part("SPINDLE_C","C",0.72f,1.4f,0.72f,0f,0.55f,0f),part("TOOL","C",0.18f,1.65f,0.18f,0f,-0.62f,0f),
    ),MachineVec3(0f,-0.82f,0f),MachineVec3(0f,-0.62f,0f)
)