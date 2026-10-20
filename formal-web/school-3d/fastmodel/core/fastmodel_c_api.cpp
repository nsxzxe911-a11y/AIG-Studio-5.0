#include "fastmodel_c_api.h"
#include "fastmodel.hpp"
#include "resource_policy.hpp"
#include <algorithm>
#include <exception>
#include <memory>
#include <string>
#include <type_traits>
struct AIG_Model {aig::FastModel impl;explicit AIG_Model(std::vector<aig::Vec3>p,std::vector<uint32_t>t):impl(std::move(p),std::move(t)){} };
struct AIG_Scheduler {aig::BalancedScheduler impl;};
static thread_local std::string aig_error;
static_assert(sizeof(aig::Vec3)==3*sizeof(float));
extern "C" {
AIG_Model* aig_model_create(const float* xyz,size_t count,const uint32_t* indices,size_t index_count) {
 try{
  if(!xyz||!count||(!indices&&index_count))throw std::invalid_argument("null input / no vertices");
  std::vector<aig::Vec3> p(count);for(size_t i=0;i<count;i++)p[i]={xyz[i*3],xyz[i*3+1],xyz[i*3+2]};
  std::vector<uint32_t> t;if(index_count)t.assign(indices,indices+index_count);
  aig_error.clear();return new AIG_Model(std::move(p),std::move(t));
 }catch(const std::exception&e){aig_error=e.what();return nullptr;}
}
void aig_model_destroy(AIG_Model*m){delete m;}
int aig_model_patch(AIG_Model*m,const uint32_t*ids,const float* xyz,size_t count){
 try{if(!m||((!ids||!xyz)&&count))throw std::invalid_argument("null patch handle/data");std::vector<aig::Vec3> val(count);for(size_t i=0;i<count;i++)val[i]={xyz[i*3],xyz[i*3+1],xyz[i*3+2]};m->impl.patch({ids,count},val);aig_error.clear();return 0;}
 catch(const std::exception&e){aig_error=e.what();return -1;}
}
size_t aig_model_consume_dirty(AIG_Model*m,AIG_DirtySpan*out,size_t capacity){
 if(!m){aig_error="null handle";return 0;}
 const auto count=m->impl.peek_dirty().size();if(!out||count>capacity){if(out&&count>capacity)aig_error="insufficient span capacity";return count;}
 auto spans=m->impl.consume_dirty();
 for(size_t i=0;i<spans.size();i++)out[i]={spans[i].begin,spans[i].end};return spans.size();
}
size_t aig_model_pending_upload_bytes(const AIG_Model*m){return m?m->impl.pending_upload_bytes():0;}
uint64_t aig_model_revision(const AIG_Model*m){return m?m->impl.revision():0;}
size_t aig_model_vertex_count(const AIG_Model*m){return m?m->impl.vertex_count():0;}
const float* aig_model_positions_ro(const AIG_Model*m){return m?reinterpret_cast<const float*>(m->impl.positions().data()):nullptr;}
AIG_Scheduler* aig_scheduler_create(void){try{auto* s=new AIG_Scheduler;aig_error.clear();return s;}catch(const std::exception& e){aig_error=e.what();return nullptr;}}
void aig_scheduler_destroy(AIG_Scheduler*s){delete s;}
int aig_scheduler_record(AIG_Scheduler*s,double frame_ms,double cpu_submit_ms,double gpu_ms,AIG_FramePolicy*out){
 try{if(!s||!out)throw std::invalid_argument("null scheduler/output");auto d=s->impl.push(frame_ms,cpu_submit_ms,gpu_ms);*out={d.render_scale,d.cpu_submit_ms,d.gpu_ms,d.gpu_measured?1:0};aig_error.clear();return 0;}
 catch(const std::exception&e){aig_error=e.what();return -1;}
}
int aig_scheduler_allow_upload(const AIG_Scheduler*s,uint64_t n,uint64_t current){return s&&s->impl.upload_allowed(n,current)?1:0;}
int aig_scheduler_allow_disk_write(const AIG_Scheduler*s,uint64_t avail,uint64_t planned){return s&&s->impl.disk_write_allowed(avail,planned)?1:0;}
const char* aig_model_last_error(){return aig_error.c_str();}
}