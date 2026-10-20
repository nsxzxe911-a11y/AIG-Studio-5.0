#include "fastmodel_c_api.h"
#include "fastmodel.hpp"
#include <algorithm>
#include <exception>
#include <memory>
#include <string>
#include <type_traits>
struct AIG_Model {aig::FastModel impl;explicit AIG_Model(std::vector<aig::Vec3>p,std::vector<uint32_t>t):impl(std::move(p),std::move(t)){} };
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
const char* aig_model_last_error(){return aig_error.c_str();}
}