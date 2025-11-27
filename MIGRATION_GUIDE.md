# 📦 localStorage → Supabase 마이그레이션 가이드

## 🎯 목적
이 마이그레이션은 `QuotaExceededError` 문제를 해결하고, 대용량 프로젝트를 안정적으로 처리하기 위해 수행되었습니다.

## 🔄 변경 사항

### 1. Supabase 스키마 변경
**scenes 테이블에 새 컬럼 추가:**
```sql
ALTER TABLE scenes ADD COLUMN image_prompt text;
```

### 2. 데이터 저장 위치 변경

| 데이터 종류 | 이전 (Before) | 이후 (After) |
|------------|--------------|-------------|
| 이미지 프롬프트 | localStorage | Supabase (scenes.image_prompt) |
| 프로젝트 데이터 | localStorage + Supabase | Supabase (완전 이동) |
| Scene 데이터 | localStorage + Supabase | Supabase (완전 이동) |
| API 키 | localStorage ✅ | localStorage ✅ (유지) |
| UI 설정 | localStorage ✅ | localStorage ✅ (유지) |

### 3. 코드 변경
- ✅ `Scene` 인터페이스에 `imagePrompt` 필드 추가
- ✅ `useProjectStore`: scene 로드/저장 시 `imagePrompt` 처리
- ✅ `image/page.tsx`: localStorage 제거, Supabase 기반으로 완전 전환
- ✅ 자동 마이그레이션 로직 추가

## 🚀 마이그레이션 실행 방법

### Step 1: Supabase 마이그레이션 실행

```bash
# Supabase CLI가 설치되어 있다면:
supabase db push

# 또는 Supabase Dashboard에서 직접 실행:
# 1. Supabase Dashboard > SQL Editor 접속
# 2. supabase_migration_add_image_prompt.sql 파일 내용 복사
# 3. 실행
```

**수동 실행 SQL:**
```sql
ALTER TABLE scenes 
ADD COLUMN IF NOT EXISTS image_prompt text;

COMMENT ON COLUMN scenes.image_prompt IS 'Image generation prompt for this scene (moved from localStorage to resolve QuotaExceededError)';
```

### Step 2: 애플리케이션 재시작

```bash
npm run dev
```

### Step 3: 자동 마이그레이션 확인

애플리케이션이 시작되면 다음이 자동으로 수행됩니다:

1. ✅ 기존 localStorage의 `editablePrompts_${projectId}` 데이터를 감지
2. ✅ 각 scene의 프롬프트를 Supabase로 이동
3. ✅ localStorage에서 해당 데이터 삭제
4. ✅ 콘솔에 "Successfully migrated image prompts..." 메시지 표시

**확인 방법:**
```javascript
// 브라우저 콘솔에서 확인
console.log(localStorage.getItem('editablePrompts_...')); // null이어야 함
```

## 📊 마이그레이션 효과

### Before (문제 상황)
```
localStorage 사용량:
- editablePrompts_xxx: ~3-5MB (장면 많을 경우)
- 기타 데이터: ~500KB
→ 총 5MB 제한 초과 가능 ❌
```

### After (해결 완료)
```
localStorage 사용량:
- API Keys: ~1KB
- UI Settings: ~500B
- Timeline (세션용): ~100KB
→ 총 ~101KB ✅

Supabase 사용량:
- scenes.image_prompt: 무제한 ✅
- 모든 프로젝트 데이터: 무제한 ✅
```

## 🔒 안전장치

### 1. 자동 저장 타이밍
- **프롬프트 수정 시**: onBlur 시점에 자동 저장
- **전체 프롬프트 변경 시**: 즉시 저장
- **이미지 생성 전**: 명시적 저장

### 2. 데이터 손실 방지
- localStorage 데이터는 마이그레이션 성공 후에만 삭제
- Supabase 저장 실패 시 localStorage 데이터 유지

### 3. 기존 사용자 호환성
- 기존 localStorage 데이터 자동 감지 및 마이그레이션
- 신규 사용자는 처음부터 Supabase 사용

## 🧪 테스트 체크리스트

- [ ] 새 프로젝트 생성 → 스크립트 생성 → 이미지 탭 확인
- [ ] 프롬프트 수정 → 저장 확인 (localStorage 없음)
- [ ] 이미지 생성 → 프롬프트가 Supabase에 저장되어 있는지 확인
- [ ] 페이지 새로고침 → 프롬프트 유지 확인
- [ ] 다른 기기/브라우저에서 접속 → 프롬프트 동기화 확인

## 📝 추가 최적화 가능 항목

향후 필요시 다음 항목들도 최적화 가능:

1. **Timeline 데이터**: 현재 localStorage 사용 중, 큰 프로젝트 시 Supabase로 이동 고려
2. **Asset 메타데이터**: 이미 Supabase 사용 중 ✅
3. **Project 설정**: 이미 Supabase 사용 중 ✅

## 🐛 문제 해결

### "QuotaExceededError" 여전히 발생하는 경우

1. 브라우저 콘솔에서 localStorage 전체 확인:
```javascript
Object.keys(localStorage).forEach(key => {
    const size = localStorage.getItem(key).length;
    console.log(key, ':', size, 'bytes');
});
```

2. 큰 항목 제거:
```javascript
// 마이그레이션되지 않은 오래된 데이터 제거
localStorage.removeItem('editablePrompts_...');
localStorage.removeItem('fixedPrompt_...');
```

3. 완전 초기화 (주의! 로그인 정보도 삭제됨):
```javascript
localStorage.clear();
```

## ✅ 완료 확인

다음이 모두 충족되면 마이그레이션 완료:

- ✅ Supabase scenes 테이블에 image_prompt 컬럼 존재
- ✅ 브라우저 localStorage에 `editablePrompts_...` 키가 없음
- ✅ 이미지 탭에서 프롬프트 수정/저장 정상 작동
- ✅ 페이지 새로고침 후에도 프롬프트 유지
- ✅ QuotaExceededError 발생하지 않음

---

**마이그레이션 완료 일자**: 2025-11-27  
**작업자**: Antigravity Agent  
**관련 문서**: `antigravity_supabase_strategy_guide.txt`

