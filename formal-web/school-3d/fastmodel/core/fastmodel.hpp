#pragma once
#include <cstdint>
#include <vector>
#include <utility>
#include <stdexcept>
#include <span>
namespace aig {
struct Vec3 { float x,y,z; };
struct DirtySpan {uint32_t begin, end;};
class FastModel {
  std::vector<Vec3> positions_;
  std::vector<uint32_t> triangles_;
  std::vector<DirtySpan> dirty_;
  uint64_t revision_ = 0;
public:
  FastModel(std::vector<Vec3> p, std::vector<uint32_t> tris);
  [[nodiscard]] size_t vertex_count() const {return positions_.size();}
  [[nodiscard]] size_t index_count() const {return triangles_.size();}
  [[nodiscard]] uint64_t revision() const {return revision_;}
  [[nodiscard]] const std::vector<Vec3>& positions() const {return positions_;}
  [[nodiscard]] const std::vector<uint32_t>& indices() const {return triangles_;}
  // Mutation is atomic: all ids validated before modifying any position.
  void patch(std::span<const uint32_t> ids, std::span<const Vec3> values);
  // Includes one initial full upload after construction; subsequent edits only publish modified ranges.
  [[nodiscard]] std::vector<DirtySpan> peek_dirty() const;
  [[nodiscard]] std::vector<DirtySpan> consume_dirty();
  [[nodiscard]] size_t pending_upload_bytes() const;
  [[nodiscard]] uint64_t position_digest() const;
};
}