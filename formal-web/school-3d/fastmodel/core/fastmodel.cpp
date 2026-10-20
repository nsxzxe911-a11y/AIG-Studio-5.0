#include "fastmodel.hpp"
#include <algorithm>
#include <bit>
#include <cmath>
namespace aig {
FastModel::FastModel(std::vector<Vec3> p,std::vector<uint32_t> t):positions_(std::move(p)),triangles_(std::move(t)) {
 if(positions_.empty()) throw std::invalid_argument("empty mesh");
 for(auto q:triangles_) if(q>=positions_.size()) throw std::out_of_range("triangle index");
 for(auto p:positions_) if(!std::isfinite(p.x)||!std::isfinite(p.y)||!std::isfinite(p.z)) throw std::invalid_argument("nonfinite source");
 dirty_.push_back({0,static_cast<uint32_t>(positions_.size())});
}
void FastModel::patch(std::span<const uint32_t> ids, std::span<const Vec3> vals) {
 if(ids.size()!=vals.size()) throw std::invalid_argument("patch count mismatch");
 if(ids.empty()) return;
 for(size_t i=0;i<ids.size();++i) {
  if(ids[i]>=positions_.size()) throw std::out_of_range("patch outside mesh");
  if(!std::isfinite(vals[i].x)||!std::isfinite(vals[i].y)||!std::isfinite(vals[i].z)) throw std::invalid_argument("nonfinite patch");
 }
 for(size_t i=0;i<ids.size();++i) {positions_[ids[i]]=vals[i]; dirty_.push_back({ids[i],ids[i]+1});}
 ++revision_;
}
std::vector<DirtySpan> FastModel::peek_dirty() const {
 if(dirty_.empty()) return {};
 auto sorted=dirty_;std::sort(sorted.begin(),sorted.end(),[](auto a,auto b){return a.begin<b.begin;});
 std::vector<DirtySpan> out;out.reserve(sorted.size());
 for(auto s:sorted) {if(!out.empty()&&s.begin<=out.back().end)out.back().end=std::max(out.back().end,s.end);else out.push_back(s);}
 return out;
}
std::vector<DirtySpan> FastModel::consume_dirty(){auto out=peek_dirty();dirty_.clear();return out;}
size_t FastModel::pending_upload_bytes() const{
 if(dirty_.empty()) return 0;
 auto spans=dirty_;std::sort(spans.begin(),spans.end(),[](auto a,auto b){return a.begin<b.begin;});
 size_t n=0;uint32_t l=spans[0].begin,r=spans[0].end;
 for(size_t i=1;i<spans.size();++i){if(spans[i].begin<=r)r=std::max(r,spans[i].end);else{n+=r-l;l=spans[i].begin;r=spans[i].end;}}
 return (n+r-l)*sizeof(Vec3);
}
uint64_t FastModel::position_digest() const{
 uint64_t h=14695981039346656037ULL;
 for(auto q:positions_){for(auto n:{std::bit_cast<uint32_t>(q.x),std::bit_cast<uint32_t>(q.y),std::bit_cast<uint32_t>(q.z)}){
  for(int i=0;i<4;++i){h^=(n>>(8*i))&255;h*=1099511628211ULL;}
 }}return h;
}
}