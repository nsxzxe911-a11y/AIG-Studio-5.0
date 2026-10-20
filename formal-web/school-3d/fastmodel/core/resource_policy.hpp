#pragma once
// AIG FastModel original cross-platform resource scheduler: pure C++20, no DX12/Vulkan dependencies.
#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <functional>
#include <map>
#include <string>
#include <vector>
namespace aig {
struct ResourceBudgets {
  double frame_target_ms=1000.0/60.0, cpu_submit_target_ms=3.0, gpu_target_ms=10.0;
  std::uint64_t cpu_cache_limit=128ull<<20, gpu_estimated_limit=256ull<<20;
  std::uint64_t max_upload_chunk=16ull<<20, disk_free_reserve=256ull<<20;
};
struct FrameDecision {double render_scale=1.0, cpu_submit_ms=0.0, gpu_ms=-1.0;bool gpu_measured=false;};
class BalancedScheduler {
  ResourceBudgets budget_;
  unsigned slow_=0,fast_=0;
  double render_scale_=1.0;
public:
  explicit BalancedScheduler(ResourceBudgets b={}) :budget_(b){}
  // CPU and GPU percentages are not forced equal; act on whichever measured budget is stressed.
  FrameDecision push(double frame_ms,double cpu_submit_ms,double gpu_ms=-1.0);
  bool upload_allowed(std::uint64_t next_bytes,std::uint64_t current_estimated_gpu_bytes) const;
  bool disk_write_allowed(std::uint64_t available,std::uint64_t planned_bytes) const;
  const ResourceBudgets& budgets()const{return budget_;}
};
class DerivedCache {
  struct Item {std::uint64_t bytes,age;std::function<bool()> release;};
  std::map<std::string,Item> items_;
  std::uint64_t total_=0,clock_=0,evicted_=0;
public:
  // Working copies, source imagery, autosave and dirty buffers CANNOT be inserted.
  bool put(std::string key,std::uint64_t bytes,std::function<bool()> release,bool dirty=false,bool authoritative=false);
  bool touch(const std::string& key);
  std::uint64_t reclaim_to(std::uint64_t target_bytes);
  std::uint64_t held_bytes()const{return total_;}
  std::uint64_t total_evicted_bytes()const{return evicted_;}
};
}