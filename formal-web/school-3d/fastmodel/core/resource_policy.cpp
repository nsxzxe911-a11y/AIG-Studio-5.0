#include "resource_policy.hpp"
#include <cmath>
#include <limits>
#include <stdexcept>
namespace aig {
FrameDecision BalancedScheduler::push(double frame_ms,double cpu_submit_ms,double gpu_ms){
  if(!std::isfinite(frame_ms)||frame_ms<0||!std::isfinite(cpu_submit_ms)||cpu_submit_ms<0||(!std::isfinite(gpu_ms)&&gpu_ms!=-1))throw std::invalid_argument("invalid frame timing");
  const bool gpu_measured=gpu_ms>=0.0;
  const bool overload=frame_ms>budget_.frame_target_ms*1.2||cpu_submit_ms>budget_.cpu_submit_target_ms*1.6||
    (gpu_measured&&gpu_ms>budget_.gpu_target_ms*1.2);
  if(overload){++slow_;fast_=0;}else{++fast_;slow_=0;}
  if(slow_>=18){render_scale_=std::max(.5,render_scale_-.25);slow_=0;}
  if(fast_>=180){render_scale_=std::min(1.0,render_scale_+.25);fast_=0;}
  return {render_scale_,cpu_submit_ms,gpu_ms,gpu_measured};
}
bool BalancedScheduler::upload_allowed(std::uint64_t n,std::uint64_t existing)const{
  if(n>budget_.max_upload_chunk||existing>budget_.gpu_estimated_limit)return false;
  return n<=budget_.gpu_estimated_limit-existing;
}
bool BalancedScheduler::disk_write_allowed(std::uint64_t available,std::uint64_t planned)const{
  return available>=budget_.disk_free_reserve&&planned<=available-budget_.disk_free_reserve;
}
bool DerivedCache::put(std::string key,std::uint64_t bytes,std::function<bool()> release,bool dirty,bool authoritative){
  if(dirty||authoritative||key.empty()||!release||items_.count(key)||bytes>std::numeric_limits<std::uint64_t>::max()-total_)return false;
  total_+=bytes;items_.emplace(std::move(key),Item{bytes,++clock_,std::move(release)});return true;
}
bool DerivedCache::touch(const std::string& k){auto i=items_.find(k);if(i==items_.end())return false;i->second.age=++clock_;return true;}
std::uint64_t DerivedCache::reclaim_to(std::uint64_t target){std::uint64_t freed=0;
  while(total_>target){auto oldest=items_.end();for(auto it=items_.begin();it!=items_.end();++it)
    if(oldest==items_.end()||it->second.age<oldest->second.age)oldest=it;
    if(oldest==items_.end())break;
    // Release may fail, in which case retain the allocation and stop rather than claim it was freed.
    bool done=false;try{done=oldest->second.release();}catch(...){done=false;}
    if(!done)break;
    freed+=oldest->second.bytes;total_-=oldest->second.bytes;evicted_+=oldest->second.bytes;items_.erase(oldest);
  }
  return freed;
}
}