/**
 * 백엔드(JSON `{error: "..."}` 형식)와 axios/네트워크 에러를 공통 처리.
 * 사용처: Alert/Toast 의 사용자 노출 메시지.
 *
 * 우선순위:
 *  1. err.response.data.error  (백엔드의 친절한 한국어 메시지)
 *  2. err.message              (axios/네트워크 디폴트, 보통 영문)
 *  3. fallback                 (위 둘 다 없을 때)
 */
export function getErrorMessage(err: any, fallback = '오류가 발생했습니다.'): string {
  return err?.response?.data?.error ?? err?.message ?? fallback;
}
