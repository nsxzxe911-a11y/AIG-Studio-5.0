#include "cache_io_probe.hpp"
#include <algorithm>
#include <chrono>
#include <fstream>
#include <random>
#include <string>
#include <vector>
namespace aig {
CacheIOReport probe_app_cache_io(const std::filesystem::path& path,std::size_t probe_bytes,std::uintmax_t reserve){
  CacheIOReport out;
  std::error_code ec;
  const auto s=std::filesystem::space(path,ec);
  if(ec)return out;
  out.capacity_measured=true;out.available_bytes=s.available;out.total_bytes=s.capacity;
  if(probe_bytes==0||probe_bytes>1024*1024||s.available<=reserve||probe_bytes>s.available-reserve)return out;
  // Strictly unique own temporary probe file inside the supplied app cache directory.
  const auto stamp=std::chrono::steady_clock::now().time_since_epoch().count();
  const auto random=std::random_device{}();
  const auto probe=path/("aig-fastmodel-io-probe-"+std::to_string(stamp)+"-"+std::to_string(random)+".tmp");
  if(std::filesystem::exists(probe,ec)||ec)return out;
  std::ofstream f(probe,std::ios::binary|std::ios::trunc);
  if(!f)return out;
  std::vector<char> data(std::min<std::size_t>(probe_bytes,4096),0x59);
  const auto start=std::chrono::steady_clock::now();
  std::size_t total=0;
  while(total<probe_bytes&&f){const std::size_t n=std::min(data.size(),probe_bytes-total);f.write(data.data(),static_cast<std::streamsize>(n));total+=n;}
  f.flush();const bool good=f.good();f.close();
  const auto finish=std::chrono::steady_clock::now();
  const auto readstart=std::chrono::steady_clock::now();
  std::ifstream input(probe,std::ios::binary);
  std::size_t readbytes=0;std::vector<char> readbuf(4096);
  while(input&&readbytes<probe_bytes){input.read(readbuf.data(),static_cast<std::streamsize>(std::min(readbuf.size(),probe_bytes-readbytes)));readbytes+=static_cast<std::size_t>(input.gcount());}
  input.close();
  const auto readend=std::chrono::steady_clock::now();
  std::filesystem::remove(probe,ec); // remove ONLY own probe; failure stays visible as an error
  if(!good||ec||readbytes!=probe_bytes)return out;
  const double seconds=std::chrono::duration<double>(finish-start).count();
  if(seconds<=0.0)return out;
  out.throughput_measured=true;
  out.write_megabytes_per_sec=static_cast<double>(probe_bytes)/1048576.0/seconds;
  const double readseconds=std::chrono::duration<double>(readend-readstart).count();
  if(readseconds>0.0)out.read_megabytes_per_sec=static_cast<double>(probe_bytes)/1048576.0/readseconds;
  out.safe_to_write=true;
  return out;
}
}