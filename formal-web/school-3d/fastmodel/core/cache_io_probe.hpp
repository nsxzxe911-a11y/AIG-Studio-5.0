#pragma once
#include <cstdint>
#include <filesystem>
#include <optional>
namespace aig {
struct CacheIOReport {
  bool capacity_measured=false,throughput_measured=false;
  std::uintmax_t available_bytes=0,total_bytes=0;
  double write_megabytes_per_sec=0.0,read_megabytes_per_sec=0.0;
  bool safe_to_write=false;
};
// CALL OFF THE RENDER THREAD only. Probes a small uniquely named temporary file inside
// an app-controlled cache path; no user file/autosave is ever opened or deleted.
CacheIOReport probe_app_cache_io(const std::filesystem::path& app_cache_directory,
                                 std::size_t probe_bytes=256*1024,
                                 std::uintmax_t min_free_reserve=256ull*1024*1024);
}