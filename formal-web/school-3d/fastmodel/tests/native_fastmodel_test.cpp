#include "fastmodel.hpp"
#include "fastmodel_c_api.h"
#include <limits>
#ifdef NDEBUG
#undef NDEBUG // Safety assertions must remain active even with -O3 release build
#endif
#include <cassert>
#include <chrono>
#include <cstdio>
#include <numeric>
#include <algorithm>
#include <stdexcept>
using namespace aig;
using clock_t_=std::chrono::steady_clock;
int main(){
 float initial[]={0,0,0,1,0,0,0,1,0};uint32_t mesh_indices[]={0,1,2};
 AIG_Model* model=aig_model_create(initial,3,mesh_indices,3);assert(model&&aig_model_vertex_count(model)==3);
 AIG_DirtySpan api_spans[4];assert(aig_model_consume_dirty(model,api_spans,4)==1&&api_spans[0].end==3);
 uint32_t idx[]={1};float valapi[]={1,2,0};assert(aig_model_patch(model,idx,valapi,1)==0&&aig_model_revision(model)==1);
 assert(aig_model_consume_dirty(model,api_spans,4)==1&&api_spans[0].begin==1&&api_spans[0].end==2);
 assert(aig_model_positions_ro(model)[4]==2);
 uint32_t bad[]={999};assert(aig_model_patch(model,bad,valapi,1)!=0&&aig_model_revision(model)==1);
 aig_model_destroy(model);

 std::vector<Vec3> xyz(300000);for(size_t i=0;i<xyz.size();++i)xyz[i]={float(i)*.001f,float(i%100)*.02f,0.0f};
 FastModel m(xyz,{0,1,2});
 assert(m.vertex_count()==300000&&m.index_count()==3);
 assert(m.pending_upload_bytes()==300000*sizeof(Vec3));
 assert(m.consume_dirty().size()==1&&m.pending_upload_bytes()==0);
 uint64_t original=m.position_digest();
 std::vector<uint32_t> ids(256);std::iota(ids.begin(),ids.end(),1000u);
 std::vector<Vec3> val(256);
 for(int i=0;i<256;i++)val[i]={float(i+1000)*.001f,12.0f,.03f};
 auto save=m.positions()[1000];
 try{m.patch(std::vector<uint32_t>{1,1000000},std::vector<Vec3>{{0,0,0},{0,0,0}});assert(false);}catch(const std::out_of_range&){}
 assert(m.revision()==0&&m.positions()[1000].y==save.y);
 try{m.patch(std::vector<uint32_t>{3},std::vector<Vec3>{{0,0,std::numeric_limits<float>::quiet_NaN()}});assert(false);}catch(const std::invalid_argument&){}
 assert(m.revision()==0);
 m.patch(ids,val);assert(m.pending_upload_bytes()==256*sizeof(Vec3));
 auto spans=m.consume_dirty();assert(spans.size()==1&&spans[0].begin==1000&&spans[0].end==1256);
 assert(m.position_digest()!=original&&m.revision()==1);
 assert(m.pending_upload_bytes()==0);
 constexpr int repeat=1000;
 std::vector<double> patch_times,full_times;patch_times.reserve(repeat);full_times.reserve(repeat);
 double checksum=0;
 for(int k=0;k<repeat;k++){
  // full mesh recompute equivalent to old replace-everything pipeline, not same work as 256-vertex patch
  auto a=clock_t_::now();
  std::vector<Vec3> clone(xyz.size());
  for(size_t i=0;i<clone.size();i++)clone[i]={xyz[i].x,xyz[i].y+float(k)*.00001f,xyz[i].z};
  checksum+=clone[(k*997)%clone.size()].y;
  auto b=clock_t_::now();
  m.patch(ids,val);auto c=clock_t_::now();
  auto dirty=m.consume_dirty();assert(dirty.size()==1&&dirty[0].end-dirty[0].begin==256);
  full_times.push_back(std::chrono::duration<double,std::milli>(b-a).count());
  patch_times.push_back(std::chrono::duration<double,std::milli>(c-b).count());
 }
 auto median=[](auto v){std::sort(v.begin(),v.end());return v[v.size()/2];};
 auto p95=[](auto v){std::sort(v.begin(),v.end());return v[(v.size()*95)/100];};
 double fm=median(full_times),pm=median(patch_times);
 std::printf("{\"baseline\":\"LINUX_HOST_ONLY_NOT_WINDOWS_OR_ANDROID\",\"vertices\":300000,\"patchedVertices\":256,\"samples\":%d,\"fullRebuildMedianMs\":%.6f,\"fullRebuildP95Ms\":%.6f,\"patchMedianMs\":%.6f,\"patchP95Ms\":%.6f,\"patchUploadBytes\":%zu,\"fullUploadBytes\":%zu,\"speedupIllustrative\":%.2f,\"checksum\":%.3f,\"assertions\":\"PASS\"}\n",repeat,fm,p95(full_times),pm,p95(patch_times),256*sizeof(Vec3),xyz.size()*sizeof(Vec3),fm/std::max(pm,1e-12),checksum);
}