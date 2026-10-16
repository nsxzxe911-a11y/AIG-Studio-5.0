#!/usr/bin/env python3
"""Token-free AIG 6AX V9 GLB generator.

Builds the approved Visual V9 industrial machining-center concept with a clean
C -> B -> A hierarchy and named bodies for AIG Web Runtime binding.
Units in source/node transforms are millimetres; the manifest records this.
"""
from __future__ import annotations

import json
import math
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "local-glb"
OUT.mkdir(parents=True, exist_ok=True)
GLB_PATH = OUT / "aig_6ax_machine_v9.glb"
MANIFEST_PATH = OUT / "aig_6ax_machine_v9.manifest.json"


def pad4(data: bytes, fill: bytes = b"\x00") -> bytes:
    return data + fill * ((4 - len(data) % 4) % 4)


def hex_rgba(value: str):
    value = value.lstrip("#")
    return [int(value[i:i+2], 16) / 255.0 for i in (0, 2, 4)] + [1.0]


class Builder:
    def __init__(self):
        self.bin = bytearray()
        self.buffer_views = []
        self.accessors = []
        self.meshes = []
        self.nodes = []
        self.materials = []
        self.material_index = {}

    def material(self, name, color, metallic=0.45, roughness=0.38, emissive=None):
        if name in self.material_index:
            return self.material_index[name]
        mat = {
            "name": name,
            "pbrMetallicRoughness": {
                "baseColorFactor": hex_rgba(color),
                "metallicFactor": metallic,
                "roughnessFactor": roughness,
            },
            "doubleSided": False,
        }
        if emissive:
            rgb = hex_rgba(emissive)[:3]
            mat["emissiveFactor"] = rgb
        idx = len(self.materials)
        self.materials.append(mat)
        self.material_index[name] = idx
        return idx

    def add_view(self, payload: bytes, target=None):
        while len(self.bin) % 4:
            self.bin.append(0)
        offset = len(self.bin)
        self.bin.extend(payload)
        view = {"buffer": 0, "byteOffset": offset, "byteLength": len(payload)}
        if target:
            view["target"] = target
        idx = len(self.buffer_views)
        self.buffer_views.append(view)
        return idx

    def add_accessor(self, values, component_type, value_type, target=None):
        if component_type == 5126:
            flat = [c for v in values for c in (v if isinstance(v, (list, tuple)) else (v,))]
            payload = struct.pack("<" + "f" * len(flat), *flat)
        elif component_type == 5125:
            flat = list(values)
            payload = struct.pack("<" + "I" * len(flat), *flat)
        else:
            raise ValueError(component_type)
        view = self.add_view(payload, target=target)
        acc = {"bufferView": view, "componentType": component_type, "count": len(values), "type": value_type}
        if value_type == "VEC3" and values:
            acc["min"] = [min(v[i] for v in values) for i in range(3)]
            acc["max"] = [max(v[i] for v in values) for i in range(3)]
        idx = len(self.accessors)
        self.accessors.append(acc)
        return idx

    def mesh(self, name, positions, normals, indices, material):
        p = self.add_accessor(positions, 5126, "VEC3", 34962)
        n = self.add_accessor(normals, 5126, "VEC3", 34962)
        i = self.add_accessor(indices, 5125, "SCALAR", 34963)
        mesh = {"name": name, "primitives": [{"attributes": {"POSITION": p, "NORMAL": n}, "indices": i, "material": material}]}
        idx = len(self.meshes)
        self.meshes.append(mesh)
        return idx

    def node(self, name, mesh=None, translation=None, scale=None, rotation=None, children=None, extras=None):
        node = {"name": name}
        if mesh is not None:
            node["mesh"] = mesh
        if translation is not None:
            node["translation"] = translation
        if scale is not None:
            node["scale"] = scale
        if rotation is not None:
            node["rotation"] = rotation
        if children:
            node["children"] = children
        if extras:
            node["extras"] = extras
        idx = len(self.nodes)
        self.nodes.append(node)
        return idx


def box_mesh():
    positions, normals, indices = [], [], []
    faces = [
        ((1,0,0), [(0.5,-0.5,-0.5),(0.5,0.5,-0.5),(0.5,0.5,0.5),(0.5,-0.5,0.5)]),
        ((-1,0,0), [(-0.5,0.5,-0.5),(-0.5,-0.5,-0.5),(-0.5,-0.5,0.5),(-0.5,0.5,0.5)]),
        ((0,1,0), [(-0.5,0.5,-0.5),(0.5,0.5,-0.5),(0.5,0.5,0.5),(-0.5,0.5,0.5)]),
        ((0,-1,0), [(0.5,-0.5,-0.5),(-0.5,-0.5,-0.5),(-0.5,-0.5,0.5),(0.5,-0.5,0.5)]),
        ((0,0,1), [(-0.5,-0.5,0.5),(0.5,-0.5,0.5),(0.5,0.5,0.5),(-0.5,0.5,0.5)]),
        ((0,0,-1), [(-0.5,0.5,-0.5),(0.5,0.5,-0.5),(0.5,-0.5,-0.5),(-0.5,-0.5,-0.5)]),
    ]
    for normal, verts in faces:
        base = len(positions)
        positions += verts
        normals += [normal] * 4
        indices += [base, base+1, base+2, base, base+2, base+3]
    return positions, normals, indices


def cylinder_mesh(segments=32, inner_ratio=0.0):
    pos, nor, ind = [], [], []
    # Outer side
    base = len(pos)
    for i in range(segments):
        a = 2 * math.pi * i / segments
        x, y = 0.5 * math.cos(a), 0.5 * math.sin(a)
        pos += [(x, y, -0.5), (x, y, 0.5)]
        n = (math.cos(a), math.sin(a), 0.0)
        nor += [n, n]
    for i in range(segments):
        j = (i + 1) % segments
        a0, a1 = base + 2*i, base + 2*j
        ind += [a0, a1, a1+1, a0, a1+1, a0+1]

    if inner_ratio <= 0:
        # top cap
        c = len(pos); pos.append((0,0,0.5)); nor.append((0,0,1))
        r = len(pos)
        for i in range(segments):
            a = 2 * math.pi * i / segments
            pos.append((0.5*math.cos(a), 0.5*math.sin(a), 0.5)); nor.append((0,0,1))
        for i in range(segments):
            j = (i+1) % segments; ind += [c, r+i, r+j]
        # bottom cap
        c = len(pos); pos.append((0,0,-0.5)); nor.append((0,0,-1))
        r = len(pos)
        for i in range(segments):
            a = 2 * math.pi * i / segments
            pos.append((0.5*math.cos(a), 0.5*math.sin(a), -0.5)); nor.append((0,0,-1))
        for i in range(segments):
            j = (i+1) % segments; ind += [c, r+j, r+i]
    else:
        ri = 0.5 * inner_ratio
        # Inner side
        base = len(pos)
        for i in range(segments):
            a = 2 * math.pi * i / segments
            x, y = ri * math.cos(a), ri * math.sin(a)
            pos += [(x, y, -0.5), (x, y, 0.5)]
            n = (-math.cos(a), -math.sin(a), 0.0)
            nor += [n, n]
        for i in range(segments):
            j = (i+1) % segments; a0, a1 = base + 2*i, base + 2*j
            ind += [a0, a1+1, a1, a0, a0+1, a1+1]
        # Top annulus
        base = len(pos)
        for i in range(segments):
            a = 2 * math.pi * i / segments
            ca, sa = math.cos(a), math.sin(a)
            pos += [(0.5*ca,0.5*sa,0.5),(ri*ca,ri*sa,0.5)]
            nor += [(0,0,1),(0,0,1)]
        for i in range(segments):
            j=(i+1)%segments; a0,a1=base+2*i,base+2*j
            ind += [a0,a1,a1+1,a0,a1+1,a0+1]
        # Bottom annulus
        base = len(pos)
        for i in range(segments):
            a = 2 * math.pi * i / segments
            ca, sa = math.cos(a), math.sin(a)
            pos += [(0.5*ca,0.5*sa,-0.5),(ri*ca,ri*sa,-0.5)]
            nor += [(0,0,-1),(0,0,-1)]
        for i in range(segments):
            j=(i+1)%segments; a0,a1=base+2*i,base+2*j
            ind += [a0,a1+1,a1,a0,a0+1,a1+1]
    return pos, nor, ind


B = Builder()
colors = {
    "frame": ("#050A10", .65, .30), "panel": ("#111923", .55, .36), "paint": ("#17242E", .55, .32),
    "steel": ("#9AA7AC", .90, .24), "darkSteel": ("#46565E", .85, .28), "rail": ("#68767C", .85, .22),
    "work": ("#C9922E", .72, .30), "tool": ("#E3ECEF", .92, .18),
}
for key,(col,metal,rough) in colors.items():
    B.material(key, col, metal, rough)
for key,col in {"rgbCyan":"#00D9FF","rgbBlue":"#3867FF","rgbViolet":"#9D4DFF","rgbPink":"#FF3BA7","rgbAmber":"#FFB03A"}.items():
    B.material(key, col, .15, .18, emissive=col)

BOX = box_mesh()
QX = [-math.sin(math.pi/4), 0, 0, math.cos(math.pi/4)]
QY = [0, math.sin(math.pi/4), 0, math.cos(math.pi/4)]

static_nodes, spindle_nodes, c_nodes, b_nodes, a_nodes = [], [], [], [], []


def add_box(name,cx,cy,z0,sx,sy,sz,mat,parent_list,origin=(0,0,0),role="static"):
    mesh = B.mesh(name+"_MESH", *BOX, B.material_index[mat])
    center=(cx-origin[0], cy-origin[1], z0+sz/2-origin[2])
    idx=B.node(name,mesh,translation=list(center),scale=[sx,sy,sz],extras={"aigRole":role,"units":"mm"})
    parent_list.append(idx); return idx


def add_cyl(name,axis,cx,cy,cz,length,od,mat,parent_list,origin=(0,0,0),role="static",inner=0.0,segments=32):
    geom=cylinder_mesh(segments,inner)
    mesh=B.mesh(name+"_MESH",*geom,B.material_index[mat])
    rot=None if axis=="Z" else (QY if axis=="X" else QX)
    center=[cx-origin[0],cy-origin[1],cz-origin[2]]
    idx=B.node(name,mesh,translation=center,scale=[od,od,length],rotation=rot,extras={"aigRole":role,"units":"mm"})
    parent_list.append(idx); return idx

# Static enclosure
add_box("STATIC_BED",0,0,0,1500,980,105,"frame",static_nodes)
add_box("STATIC_FRONT_PLINTH",0,-445,105,1340,90,150,"panel",static_nodes)
add_box("STATIC_LEFT_COLUMN",-650,245,105,155,300,790,"frame",static_nodes)
add_box("STATIC_RIGHT_COLUMN",650,245,105,155,300,790,"frame",static_nodes)
add_box("STATIC_BRIDGE",0,250,790,1440,250,125,"frame",static_nodes)
add_box("STATIC_BACK_WALL",0,360,105,1040,70,630,"panel",static_nodes)
add_box("STATIC_LEFT_INNER_WALL",-515,250,130,65,205,600,"paint",static_nodes)
add_box("STATIC_RIGHT_INNER_WALL",515,250,130,65,205,600,"paint",static_nodes)
add_box("STATIC_LEFT_SHELL",-715,-15,125,115,760,690,"panel",static_nodes)
add_box("STATIC_RIGHT_SHELL",715,-15,125,115,760,690,"panel",static_nodes)
add_box("STATIC_LEFT_TOP_CAP",-650,-25,750,245,620,85,"panel",static_nodes)
add_box("STATIC_RIGHT_TOP_CAP",650,-25,750,245,620,85,"panel",static_nodes)
for spec in [
    ("RGB_LEFT_CYAN",-772,-120,165,8,410,480,"rgbCyan"),
    ("RGB_LEFT_BLUE",-772,155,205,8,120,400,"rgbBlue"),
    ("RGB_RIGHT_VIOLET",772,70,175,8,270,490,"rgbViolet"),
    ("RGB_RIGHT_PINK",772,-210,175,8,210,340,"rgbPink"),
    ("RGB_RIGHT_AMBER",772,245,215,8,90,300,"rgbAmber"),
    ("X_RAIL_UPPER",0,302,700,860,28,32,"rail"),
    ("X_RAIL_LOWER",0,302,628,860,28,32,"rail"),
    ("Z_RAIL_LEFT",-82,285,405,34,34,330,"rail"),
    ("Z_RAIL_RIGHT",82,285,405,34,34,330,"rail"),
]: add_box(*spec, static_nodes)

# Spindle group (XYZ motion remains runtime-owned)
add_box("SPINDLE_CARRIAGE",0,255,500,265,210,250,"paint",spindle_nodes,role="tool")
add_box("SPINDLE_HEAD",0,160,430,190,180,255,"panel",spindle_nodes,role="tool")
add_cyl("SPINDLE_GUARD","Z",0,68,445,180,146,"darkSteel",spindle_nodes,role="tool")
add_cyl("SPINDLE_NOSE","Z",0,68,338,82,82,"steel",spindle_nodes,role="tool")
add_cyl("TOOL_HOLDER","Z",0,68,278,68,48,"darkSteel",spindle_nodes,role="tool")
add_cyl("TOOL","Z",0,68,220,92,12,"tool",spindle_nodes,role="tool")
SPINDLE_GROUP=B.node("SPINDLE_GROUP",children=spindle_nodes,extras={"aigRole":"tool","units":"mm","motion":"XYZ"})

# Pivots
C=(0,0,225); Bp=(0,0,365); A=(0,0,420)
# C group children
add_cyl("C_AXIS_BASE","Z",0,0,158,110,300,"paint",c_nodes,C,"c")
add_cyl("C_AXIS_TABLE","Z",0,0,225,54,338,"darkSteel",c_nodes,C,"c")
add_cyl("C_AXIS_RING","Z",0,0,246,36,382,"steel",c_nodes,C,"c",inner=344/382)
for name,cy in (("B_SUPPORT_FRONT",-172),("B_SUPPORT_REAR",172)):
    add_cyl(name,"Y",0,cy,365,68,214,"paint",c_nodes,C,"c",inner=158/214)
for name,cy in (("B_BEARING_FRONT",-172),("B_BEARING_REAR",172)):
    add_cyl(name,"Y",0,cy,365,74,142,"steel",c_nodes,C,"c",inner=66/142)

# B group children
for name,cy in (("B_JOURNAL_FRONT",-172),("B_JOURNAL_REAR",172)):
    add_cyl(name,"Y",0,cy,365,98,54,"darkSteel",b_nodes,Bp,"b")
add_box("B_CRADLE",0,0,285,610,310,42,"paint",b_nodes,Bp,"b")
add_box("B_CRADLE_LEFT_ARM",-285,0,310,64,310,255,"paint",b_nodes,Bp,"b")
add_box("B_CRADLE_RIGHT_ARM",285,0,310,64,310,255,"paint",b_nodes,Bp,"b")
add_box("B_CRADLE_LEFT_FOOT",-285,0,260,118,330,70,"panel",b_nodes,Bp,"b")
add_box("B_CRADLE_RIGHT_FOOT",285,0,260,118,330,70,"panel",b_nodes,Bp,"b")
for name,cx in (("A_SUPPORT_LEFT",-282),("A_SUPPORT_RIGHT",282)):
    add_cyl(name,"X",cx,0,420,118,236,"paint",b_nodes,Bp,"b",inner=182/236)
for name,cx in (("A_BEARING_LEFT",-282),("A_BEARING_RIGHT",282)):
    add_cyl(name,"X",cx,0,420,128,168,"steel",b_nodes,Bp,"b",inner=78/168)

# A group children
for name,cx in (("A_SHAFT_LEFT",-282),("A_SHAFT_RIGHT",282)):
    add_cyl(name,"X",cx,0,420,146,62,"darkSteel",a_nodes,A,"a")
add_cyl("A_BODY","X",0,0,420,430,98,"darkSteel",a_nodes,A,"a")
add_cyl("CHUCK","X",0,0,420,214,158,"steel",a_nodes,A,"a")
add_cyl("WORKPIECE_HUB","X",0,0,420,138,116,"darkSteel",a_nodes,A,"a")
add_cyl("WORKPIECE","X",0,0,420,118,132,"work",a_nodes,A,"a",segments=12)

A_GROUP=B.node("A_GROUP",translation=[0,0,A[2]-Bp[2]],children=a_nodes,extras={"aigRole":"a","axis":"+X","pivotMM":list(A),"units":"mm"})
b_nodes.append(A_GROUP)
B_GROUP=B.node("B_GROUP",translation=[0,0,Bp[2]-C[2]],children=b_nodes,extras={"aigRole":"b","axis":"+Y","pivotMM":list(Bp),"units":"mm"})
c_nodes.append(B_GROUP)
C_GROUP=B.node("C_GROUP",translation=list(C),children=c_nodes,extras={"aigRole":"c","axis":"+Z","pivotMM":list(C),"units":"mm"})

root_nodes=static_nodes+[SPINDLE_GROUP,C_GROUP]
doc={
    "asset":{"version":"2.0","generator":"AIG-II V9 token-free parametric GLB generator","extras":{"source":"Visual V9 / Zoo CAD V2 contract","units":"mm","upAxis":"Z"}},
    "scene":0,
    "scenes":[{"name":"AIG_6AX_V9","nodes":root_nodes}],
    "nodes":B.nodes,"meshes":B.meshes,"materials":B.materials,
    "buffers":[{"byteLength":len(B.bin)}],"bufferViews":B.buffer_views,"accessors":B.accessors,
}
json_bytes=pad4(json.dumps(doc,separators=(",",":"),ensure_ascii=False).encode("utf-8"),b" ")
bin_bytes=pad4(bytes(B.bin),b"\x00")
total=12+8+len(json_bytes)+8+len(bin_bytes)
glb=struct.pack("<4sII",b"glTF",2,total)+struct.pack("<II",len(json_bytes),0x4E4F534A)+json_bytes+struct.pack("<II",len(bin_bytes),0x004E4942)+bin_bytes
GLB_PATH.write_bytes(glb)
manifest={
    "asset":"aig_6ax_machine_v9.glb","authority":"Visual V9","source":"aig_6ax_machine_v2.kcl contract mirrored procedurally",
    "units":"mm","upAxis":"Z","runtimeScaleRequired":True,
    "hierarchy":["C_GROUP","B_GROUP","A_GROUP"],
    "pivotsMM":{"C_GROUP":[0,0,225],"B_GROUP":[0,0,365],"A_GROUP":[0,0,420]},
    "axes":{"C_GROUP":"+Z","B_GROUP":"+Y","A_GROUP":"+X"},
    "nodeCount":len(B.nodes),"meshCount":len(B.meshes),"materialCount":len(B.materials),
    "status":"VISUAL_RUNTIME_ASSET_NOT_MANUFACTURING_CERTIFIED"
}
MANIFEST_PATH.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
print(f"AIG_V9_LOCAL_GLB_GENERATED bytes={len(glb)} nodes={len(B.nodes)} meshes={len(B.meshes)}")
