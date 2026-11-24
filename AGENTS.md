# AGENTS.md

이 저장소에서 작업하는 에이전트 규칙.
**이 파일은 규칙의 원본이 아니라 라우터다.** 무엇이 원본인지는
[`docs/harness/00-ssot.md`](docs/harness/00-ssot.md) 가 정한다.

---

## 0. 읽기 원칙

1. **작업을 시작할 때 문서를 한꺼번에 읽지 않는다.** 1절 라우팅 표에서 지금 질문에 해당하는 행만 연다.
2. **파일 전체가 아니라 절 단위로 읽는다.** 원본은 크다(`01` 279줄 · `06` 679줄).
   `grep -n "^#" <파일>` 로 목차를 잡고, 표가 가리키는 절만 `sed -n 'A,Bp'` 로 읽는다.
3. **라우팅된 문서로 판단이 서지 않을 때만 범위를 넓힌다.** 2절의 사다리를 한 칸씩 오르고, 건너뛰지 않는다.
4. **원본에 없으면 정해지지 않은 것이다.** 코드나 참고 문서에서 추측해 채우지 않는다.
   없다고 보고하고, 원본에 추가할지 사람에게 묻는다.
5. **충돌이 확인되면 `00-ssot.md §4`를 따른다.** 참고 문서와 SSOT가 다르면 SSOT를 우선한다.
   Issue ↔ SSOT · SSOT ↔ SSOT가 다르면 **`NEEDS_HUMAN` 상태를 선언하고 사람에게 판단을 요청한다.**
   어느 쪽이 옳아 보이더라도 내 판단대로 행동하지 않는다.

---

## 1. 라우팅 표

### 원본

| 질문의 종류 | 읽을 것 | 어느 절부터 |
|---|---|---|
| **재고 규칙** — 로트 단위 · 거점 · 증감 사유 · 무엇을 만들고 안 만드는가 · 완료 기준 | `docs/01-requirements.md` | 개념 §2 · 기능 §3 · 비기능 §5 · 제외 §6 · 완료 기준 §7 |
| **구조** — 스택 · 폴더 · 데이터 모델 · 재고 증감 통로 · FEFO/LEFO · 인증 · 시드 · 불변식 | `docs/06-architecture.md` | 스택 §1 · 폴더 §2 · 모델 §3 · 핵심 로직 §4 · 시드 §7 · 결정 요약 §7.5 · 불변식 §9 |
| **지금 하는 작업** — 범위 · 완료 조건 | 해당 GitHub Issue | `gh issue view <N>` |
| **무엇이 원본인가** / 문서끼리 말이 다르다 | `docs/harness/00-ssot.md` | 책임별 원본 §1 · 책임 경계 §2 · 충돌 정책과 `NEEDS_HUMAN` §4 |
| **어디까지 고쳐도 되나** — AI가 수정할 수 있는 영역 · 사람 승인이 필요한 영역 | `docs/harness/00-ssot.md` | 보호 영역과 소유권 §5 |

### 원본이 아직 없는 영역

| 질문의 종류 | 처리 |
|---|---|
| **검증 규칙** — 무엇을 통과해야 끝인가 | 원본 없음 (`00-ssot.md §3`, 스크립트로 대체 예정). 판정 기준을 임의로 정하지 않고 사람에게 묻는다 |
| **구현·검증 루프** — 몇 번 다시 시도하나 · 언제 사람에게 넘기나 | 원본 없음 (`00-ssot.md §3`). 반복 횟수와 멈출 시점을 임의로 정하지 않고 사람에게 묻는다 |

### 참고 문서 — 원본이 아니다

원본으로 답이 나오지 않을 때 2절 사다리를 따라 연다. 원본과 다르면 원본을 따른다.

| 질문의 종류 | 읽을 것 |
|---|---|
| 업무 흐름이 실제로 어떻게 이어지나 (S1~S12) | `docs/03-scenarios.md` — 해당 시나리오 절만 |
| 왜 이 기능이 필요한가 · 누가 어떻게 쓰나 | `docs/02-personas.md` · `docs/04-engagement.md` |
| 화면 · 컴포넌트 · 색 · 간격 · 접근성 | `docs/05-design.md` |
| 실행 · 명령어 · 시드 초기화 · 데모 계정 | `README.md` |
| 왜 이렇게 됐나 (과거 결정 경위) | `docs/HANDOVER.md` · `handsover/` — 기록일 뿐, 현재 상태로 믿지 않는다 |

---

## 2. 판단이 안 설 때 — 확장 사다리

라우팅된 문서로 답이 안 나올 때만 한 칸씩 올라간다. 답이 나오면 거기서 멈춘다.

| 단계 | 범위 |
|---|---|
| 1차 | 라우팅된 원본의 **해당 절** |
| 2차 | 같은 원본의 인접 절 + 짝이 되는 원본의 해당 절 (재고 도메인 `01` ↔ 아키텍처 `06`) |
| 3차 | 참고 문서 — `03-scenarios`(흐름) · `02-personas`(왜 필요한가) · `04-engagement`(장치) · `05-design`(화면) |
| 4차 | 코드 — `src/lib/` 의 해당 모듈과 `tests/` (지도: `06 §2`) |
| 5차 | 저장소 전체 검색. 여기까지 와서 근거가 없으면 **없는 것이다** → 0절 4번대로 보고 |

3차 이후에서 찾은 내용은 원본이 아니다. 그 내용으로 판단했다면 어디서 찾았는지 함께 보고한다.

---

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
