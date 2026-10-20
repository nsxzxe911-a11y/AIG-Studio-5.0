#include "resource_policy.hpp"
#include "cache_io_probe.hpp"
#include "fastmodel_c_api.h"
#include <filesystem>
#include <cassert>
#include <iostream>
using namespace aig;
int main(){
  auto* abi=aig_scheduler_create();assert(abi);
  AIG_FramePolicy pd{};
  for(int i=0;i<18;i++)assert(aig_scheduler_record(abi,27,4.9,-1,&pd)==0);
  assert(pd.recommended_render_scale==.75&&pd.gpu_time_measured==0);
  assert(aig_scheduler_allow_upload(abi,17ull<<20,0)==0);
  assert(aig_scheduler_allow_disk_write(abi,250ull<<20,1ull<<20)==0);
  assert(aig_scheduler_record(abi,-1,2,-1,&pd)==-1);
  aig_scheduler_destroy(abi);
  BalancedScheduler g;
  FrameDecision d;
  for(int i=0;i<20;i++)d=g.push(27,4.8);
  assert(d.render_scale==.75&&!d.gpu_measured);
  d=g.push(14,2,7);assert(d.gpu_measured&&d.gpu_ms==7);
  assert(!g.upload_allowed(17ull<<20,0));
  assert(!g.upload_allowed(1ull<<20,g.budgets().gpu_estimated_limit));
  assert(g.upload_allowed(1ull<<20,0));
  assert(!g.disk_write_allowed(250ull<<20,1ull<<20));
  assert(g.disk_write_allowed(500ull<<20,10ull<<20));
  DerivedCache c;int released=0;
  assert(!c.put("unsaved",1024,[]{return true;},true,false));
  assert(!c.put("vault",1024,[]{return true;},false,true));
  assert(c.put("preview",2048,[&](){++released;return true;}));
  assert(c.put("other",1024,[]{return false;}));
  assert(c.touch("other"));
  assert(c.reclaim_to(1024)==2048&&released==1);
  assert(c.reclaim_to(0)==0&&c.held_bytes()==1024);
  auto probe=probe_app_cache_io(std::filesystem::temp_directory_path(),128*1024,16ull*1024*1024);
  assert(probe.capacity_measured&&probe.total_bytes>0);
  assert(probe.throughput_measured&&probe.write_megabytes_per_sec>0&&probe.read_megabytes_per_sec>0);
  std::cout<<"{\"platform\":\"C++20_PORTABLE_HOST\",\"resourceGatesPassed\":true,\"unsavedModelProtected\":true,\"gpuPercentAssumed\":false}\n";
}