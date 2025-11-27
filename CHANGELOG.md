# 📝 Changelog

## [2025-11-27] localStorage → Supabase 마이그레이션

### 🎯 목표
`QuotaExceededError` 해결 및 대용량 프로젝트 지원을 위한 데이터 저장 구조 개선

### ✨ 추가 (Added)
- Supabase `scenes` 테이블에 `image_prompt` 컬럼 추가
- Scene 인터페이스에 `imagePrompt` 필드 추가
- localStorage → Supabase 자동 마이그레이션 로직 추가
- 프롬프트 수정 시 자동 저장 기능 (onBlur)

### 🔄 변경 (Changed)
- **이미지 프롬프트 저장 위치**: localStorage → Supabase
- `useProjectStore`: scene 로드/저장 시 `imagePrompt` 처리 추가
- `image/page.tsx`: 
  - `editablePrompts` useState 제거
  - localStorage 읽기/쓰기 로직 제거
  - `scene.imagePrompt`를 직접 사용하도록 변경
  - `updateScene` 호출로 Zustand 상태 직접 업데이트

### ❌ 제거 (Removed)
- `image/page.tsx`의 localStorage 관련 useEffect 훅 (4개)
- `editablePrompts` 로컬 상태 관리
- `fixedPrompt` localStorage 저장 로직

### 🐛 수정 (Fixed)
- ✅ `QuotaExceededError: Failed to execute 'setItem' on 'Storage'` 해결
- ✅ 대용량 프로젝트(많은 장면, 긴 프롬프트) 처리 안정화
- ✅ 여러 기기에서 프롬프트 동기화 가능

### 📊 성능 개선
- localStorage 사용량: ~5MB → ~100KB (98% 감소)
- Supabase를 통한 무제한 데이터 저장 가능
- 브라우저 메모리 사용량 감소

### 🔐 보안 및 데이터 안정성
- RLS 정책을 통한 사용자별 데이터 격리 유지
- 자동 마이그레이션으로 기존 사용자 데이터 보존
- Supabase 기반 자동 백업

### 📚 문서
- `MIGRATION_GUIDE.md` 추가
- `supabase_migration_add_image_prompt.sql` 추가
- `useTimelineStore.ts`에 최적화 관련 주석 추가

### 🎓 참고 자료
- 설계 문서: `antigravity_supabase_strategy_guide.txt`
- 마이그레이션 가이드: `MIGRATION_GUIDE.md`

---

## [이전 버전]
(이전 변경 내역은 여기에 추가...)

