#pragma once
#include <stddef.h>
#include <stdint.h>
#if defined(_WIN32) && defined(AIG_FASTMODEL_SHARED)
# ifdef AIG_FASTMODEL_EXPORTS
#  define AIG_EXPORT __declspec(dllexport)
# else
#  define AIG_EXPORT __declspec(dllimport)
# endif
#else
#define AIG_EXPORT
#endif
#ifdef __cplusplus
extern "C" {
#endif
typedef struct AIG_Model AIG_Model;
typedef struct AIG_DirtySpan{uint32_t begin,end;} AIG_DirtySpan;
// All float positions are XYZ triples; vertices/indices are copied and caller retains ownership.
AIG_EXPORT AIG_Model* aig_model_create(const float* xyz,size_t vertex_count,const uint32_t* triangles,size_t index_count);
AIG_EXPORT void aig_model_destroy(AIG_Model*);
AIG_EXPORT int aig_model_patch(AIG_Model*,const uint32_t* ids,const float* xyz,size_t count);
// Returns required span count if capacity too small; does not consume on failure.
AIG_EXPORT size_t aig_model_consume_dirty(AIG_Model*,AIG_DirtySpan* output,size_t output_capacity);
AIG_EXPORT size_t aig_model_pending_upload_bytes(const AIG_Model*);
AIG_EXPORT uint64_t aig_model_revision(const AIG_Model*);
AIG_EXPORT size_t aig_model_vertex_count(const AIG_Model*);
AIG_EXPORT const float* aig_model_positions_ro(const AIG_Model*);
// Per-thread failure reason. This is a library boundary only: Vulkan/DX12 renderer is not connected.
AIG_EXPORT const char* aig_model_last_error(void);
#ifdef __cplusplus
}
#endif