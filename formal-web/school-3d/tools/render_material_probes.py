"""Offline physically based probes. Not a person, not an accepted character visual."""
from pathlib import Path
import vtk
from vtk.util.numpy_support import numpy_to_vtk
from PIL import Image
import numpy as np
root=Path(__file__).parent
out=root/'PBR_三材質_真實立體渲染.png'
render=vtk.vtkRenderer();render.SetBackground(.018,.028,.051)
window=vtk.vtkRenderWindow();window.SetOffScreenRendering(1);window.SetSize(1300,760);window.AddRenderer(render)
center=[-2.55,0,2.55]
color=[(.98,.70,.61),(.27,.16,.16),(.15,.23,.42)]
for i,(kind,rough) in enumerate([('skin',.6),('hair',.36),('fabric',.79)]):
 src=vtk.vtkSphereSource();src.SetRadius(1.05 if i==0 else 0.89);src.SetThetaResolution(120);src.SetPhiResolution(120)
 tex=vtk.vtkTexture();tex.SetInterpolate(True);tex.SetMipmap(True);tex.SetRepeat(True)
 reader=vtk.vtkPNGReader();reader.SetFileName(str(root/'generated-materials'/f'{kind}_basecolor.png'));reader.Update();tex.SetInputConnection(reader.GetOutputPort());
 mapper=vtk.vtkPolyDataMapper();mapper.SetInputConnection(src.GetOutputPort());
 actor=vtk.vtkActor();actor.SetMapper(mapper);actor.SetTexture(tex);actor.SetPosition(center[i],0,0)
 mat=actor.GetProperty();mat.SetInterpolationToPBR();mat.SetRoughness(rough);mat.SetMetallic(0.0);mat.SetColor(*color[i]);render.AddActor(actor)
# Cinematic studio lighting with warm key, cool fill, and rim.
for pos,power,colour in [((-3,5,8),2.6,(1.0,.83,.72)),((5,2,4),1.2,(.54,.66,1.0)),((0,3,-5),1.2,(.84,.78,1.0))]:
 light=vtk.vtkLight();light.SetPositional(True);light.SetPosition(*pos);light.SetFocalPoint(0,0,0);light.SetIntensity(power);light.SetColor(*colour);render.AddLight(light)
render.AutomaticLightCreationOff()
camera=render.GetActiveCamera();camera.SetPosition(0,.5,9.0);camera.SetFocalPoint(0,0,0);camera.SetViewUp(0,1,0);camera.SetViewAngle(35);render.SetActiveCamera(camera)
render.ResetCameraClippingRange();window.Render()
w=vtk.vtkWindowToImageFilter();w.SetInput(window);w.ReadFrontBufferOff();w.Update()
png=vtk.vtkPNGWriter();png.SetFileName(str(out));png.SetInputConnection(w.GetOutputPort());png.Write()
print('Generated',out,out.stat().st_size)