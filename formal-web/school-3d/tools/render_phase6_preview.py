from pathlib import Path
import trimesh,numpy as np,vtk
from vtk.util.numpy_support import numpy_to_vtk, numpy_to_vtkIdTypeArray
path=Path(__file__).parent.parent/'assets/hero-rig-Phase6-TECHNICAL-ONLY.glb'
scene=trimesh.load(path,force='scene')
ren=vtk.vtkRenderer();ren.SetBackground(.83,.88,.95)
window=vtk.vtkRenderWindow();window.SetOffScreenRendering(True);window.SetSize(760,1050);window.AddRenderer(ren)
window.SetMultiSamples(4)
cols={'skin':(.98,.71,.62),'hair':(.18,.12,.1),'fabric':(.12,.17,.3),'shirt':(.89,.90,.94),'skirt':(.18,.2,.34),'ribbon':(.51,.13,.16),'black':(.045,.048,.07),'eyes':(.36,.23,.19)}
for name,mesh in scene.geometry.items():
 if len(mesh.faces)==0:continue
 pd=vtk.vtkPolyData();pts=vtk.vtkPoints();pts.SetData(numpy_to_vtk(mesh.vertices.astype(np.float32),deep=True));pd.SetPoints(pts)
 faces=np.c_[np.full((len(mesh.faces),1),3,dtype=np.int64),mesh.faces.astype(np.int64)].reshape(-1)
 arr=numpy_to_vtkIdTypeArray(faces,deep=True);ca=vtk.vtkCellArray();ca.SetCells(len(mesh.faces),arr);pd.SetPolys(ca)
 normals=vtk.vtkPolyDataNormals();normals.SetInputData(pd);normals.SetSplitting(False);normals.SetConsistency(True);normals.Update()
 mapper=vtk.vtkPolyDataMapper();mapper.SetInputConnection(normals.GetOutputPort())
 actor=vtk.vtkActor();actor.SetMapper(mapper)
 mat=name.split('_')[1];actor.GetProperty().SetColor(*cols.get(mat,(.4,.4,.4)))
 actor.GetProperty().SetInterpolationToPBR();actor.GetProperty().SetRoughness(.52 if mat=='skin' else .4 if mat=='hair' else .67)
 actor.GetProperty().SetMetallic(0.0)
 ren.AddActor(actor)
light=vtk.vtkLight();light.SetPosition(2,4,5);light.SetFocalPoint(0,1,0);light.SetIntensity(2.0);ren.AddLight(light)
fill=vtk.vtkLight();fill.SetPosition(-4,3,0);fill.SetFocalPoint(0,1,0);fill.SetIntensity(1.2);ren.AddLight(fill)
cam=ren.GetActiveCamera();cam.SetPosition(2.3,1.34,3.8);cam.SetFocalPoint(0,1.05,0);cam.SetViewUp(0,1,0);cam.SetViewAngle(27);ren.ResetCameraClippingRange()
window.Render();f=vtk.vtkWindowToImageFilter();f.SetInput(window);f.Update();writer=vtk.vtkPNGWriter();writer.SetFileName(str(Path(__file__).parent.parent/'phase6-preview-TECHNICAL-ONLY.png'));writer.SetInputConnection(f.GetOutputPort());writer.Write()
print('rendered',len(scene.geometry),'parts')