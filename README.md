# ことのは村 · 코토노하 마을

귀여운 여우 `코하루`와 함께 매일 조금씩 일본어 단어를 익히는 모바일 웹 학습 서비스입니다.

## 현재 구현

- JLPT N5 40단어 / N4 30단어 스타터팩
- 레벨 전환 N5 / N4
- 오늘의 10단어 학습
- 단어 카드 뒤집기
- 일본어 / 읽기 / 뜻 / 예문 / 한국어 해석
- Web Speech API 기반 일본어 발음 듣기
- 기억도 선택: 다시 / 어려워요 / 알아요 / 쉬워요
- SRS 복습 일정
- 오답 우선 복습 바구니
- 4지선다 뜻 맞히기 퀴즈
- 콤보 XP 보너스
- 일일 목표
- 연속 학습일 스트릭
- 정확도
- XP / 코하루 레벨
- 숙련도 기반 단어책
- 일본어 / 읽기 / 뜻 검색
- localStorage 자동 저장
- 모바일 반응형 UI
- 외부 AI/API 사용 없음

## 학습 구조

```text
오늘의 덱
  ├─ 복습 시간이 된 단어
  ├─ 최근 오답
  ├─ 아직 안 본 단어
  └─ 오래 안 본 숙련 단어
        ↓
카드 학습 / 퀴즈
        ↓
Again / Hard / Good / Easy
        ↓
SRS 일정 + XP + streak + 복습 바구니
```

## 실행

별도 빌드가 필요 없는 정적 웹앱입니다.

```bash
python3 -m http.server 8080
```

브라우저에서 `http://localhost:8080`을 엽니다.

## 테스트

```bash
npm test
npm run check
```

GitHub Actions에서도 JavaScript 문법 검사와 학습 엔진 테스트를 실행합니다.

## 구조

```text
index.html
src/
  data.js       # JLPT 스타터 단어 데이터
  learning.js   # SRS / 덱 / XP / streak
  app.js        # UI와 학습 흐름
  styles.css    # 마을/마스코트/모바일 UI
tests/
  learning.test.js
docs/
  PRODUCT.md
```

## 비용

현재 버전은 외부 AI API를 사용하지 않습니다. 일본어 음성은 지원 브라우저의 Web Speech API를 사용하므로 별도 OpenAI API 비용이 없습니다.

## 다음 고도화 후보

1. 히라가나 / 가타카나 코스
2. JLPT N3~N1 단어팩
3. 듣고 뜻 맞히기
4. 일본어를 보고 직접 한국어 입력
5. 한국어 뜻을 보고 일본어 입력
6. 문장 배열 게임
7. 일일 미션 / 업적
8. 코하루 방 꾸미기와 아이템
9. 로그인 / 클라우드 동기화
10. 선택형 AI 회화 연습
