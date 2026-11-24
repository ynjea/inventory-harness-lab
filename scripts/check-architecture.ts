/**
 * 아키텍처 검사 — 재고 변경이 정해진 경로를 거치는지 정적으로 확인한다.
 *
 * 원본: docs/06-architecture.md
 *   §2  "재고 수량을 바꾸는 코드는 lib/stock.ts의 applyMovement() 한 곳에만 존재한다.
 *        화면·액션은 이 함수를 부를 뿐, prisma.lot.update()를 직접 호출하지 않는다"
 *   §4.1 "반드시 prisma.$transaction() 안에서 호출한다"
 *        "이력 기록 — 항상 함께, 항상 같은 트랜잭션"
 *   §7.5 "복잡한 조회가 필요해지면 제한적으로 raw SQL을 사용할 수 있다" (조회 = 읽기)
 *
 * DB도 시드도 필요 없다. 파일만 읽으므로 lint 다음에 바로 돌린다.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

/** 재고 변경의 유일한 통로. 이 파일의 applyMovement() 본문에서만 Lot·Movement 를 직접 쓴다 */
const STOCK_MODULE = 'src/lib/stock.ts'
const GATEWAY_FN = 'applyMovement'

/**
 * 검사 범위 — 실행되는 앱 코드.
 *
 * 제외한 곳과 이유:
 *   src/generated/  Prisma 가 생성한 클라이언트. JSDoc 예제에 prisma.lot.update() 가 들어 있다
 *   tests/          픽스처 준비·정리 코드. 재고 변경 경로가 아니다
 *   scripts/        검증 하네스 자체
 * prisma/seed.ts 는 범위 안이다 — 시드도 applyMovement 를 통과해야 한다 (§7).
 */
const SCAN_DIRS = ['src']
const SCAN_FILES = ['prisma/seed.ts']
const SKIP_DIRS = ['src/generated']

const WRITE_METHODS =
  'create|createMany|createManyAndReturn|update|updateMany|updateManyAndReturn|upsert|delete|deleteMany'

type Violation = { file: string; line: number; text: string }
type Rule = {
  id: string
  title: string
  source: string
  scan: (file: string, line: string, lineNo: number) => boolean
}

/**
 * applyMovement() 본문의 줄 범위 [시작, 끝]. 예외는 파일 전체가 아니라 이 범위에만 준다 —
 * 같은 파일에 함수가 하나 더 생겨 Lot 을 직접 써도 통과해 버리는 일을 막는다.
 * 끝은 시작 뒤 처음 나오는 0열의 `}` 다 (이 파일은 최상위 함수를 0열 `}` 로 닫는다).
 */
function gatewayRange(): [number, number] {
  const lines = readFileSync(STOCK_MODULE, 'utf8').split(/\r?\n/)
  const start = lines.findIndex((l) => new RegExp(`^export\\s+async\\s+function\\s+${GATEWAY_FN}\\b`).test(l))
  const end = start === -1 ? -1 : lines.findIndex((l, i) => i > start && /^\}/.test(l))
  if (start === -1 || end === -1) {
    console.error(`\n✗ ${STOCK_MODULE} 에서 ${GATEWAY_FN}() 의 본문을 찾지 못했습니다.`)
    console.error('  통로 함수가 없거나 모양이 바뀌었다면 이 스크립트도 함께 고쳐야 합니다. 검사를 중단합니다.\n')
    process.exit(1)
  }
  return [start + 1, end + 1]
}
const [GW_START, GW_END] = gatewayRange()
const inGateway = (file: string, lineNo: number) =>
  file === STOCK_MODULE && lineNo >= GW_START && lineNo <= GW_END

const rules: Rule[] = [
  {
    id: 'A1',
    title: 'Lot 쓰기는 applyMovement() 안에서만',
    source: '06 §2 · §4.1',
    scan: (file, line, lineNo) =>
      !inGateway(file, lineNo) &&
      new RegExp(`\\.lot\\.(${WRITE_METHODS})\\s*\\(`).test(line) &&
      // 전체 초기화(인자 없는 deleteMany)는 재고 변경이 아니라 판 갈아엎기다 — 시드가 쓴다
      !/\.lot\.deleteMany\s*\(\s*\)/.test(line),
  },
  {
    id: 'A2',
    title: 'Movement 쓰기는 applyMovement() 안에서만',
    source: '06 §4.1 — 이력 기록은 항상 재고 변경과 같은 트랜잭션',
    scan: (file, line, lineNo) =>
      !inGateway(file, lineNo) &&
      new RegExp(`\\.movement\\.(${WRITE_METHODS})\\s*\\(`).test(line) &&
      !/\.movement\.deleteMany\s*\(\s*\)/.test(line),
  },
  {
    id: 'A3',
    title: 'applyMovement()·reverseMovement() 의 첫 인자는 트랜잭션 클라이언트',
    source: '06 §4.1 — 반드시 $transaction() 안에서 호출한다',
    scan: (_file, line) => {
      const m = line.match(/\b(applyMovement|reverseMovement)\s*\(\s*([A-Za-z_$][\w$]*)/)
      return m !== null && m[2] !== 'tx' && m[2] !== 't'
    },
  },
  {
    id: 'A4',
    title: 'raw SQL 로 Lot·Movement 를 쓰지 않는다',
    source: '06 §7.5 — raw SQL 은 조회에만',
    scan: (file, line, lineNo) =>
      !inGateway(file, lineNo) &&
      /\$executeRaw(Unsafe)?/.test(line) &&
      /\b(lot|movement)\b/i.test(line),
  },
]

/** 주석은 규칙 위반이 아니다. 지운 자리를 공백으로 채워 줄 번호를 지킨다 */
function stripComments(src: string): string[] {
  const out = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  return out.split('\n').map((l) => l.replace(/\/\/.*$/, ''))
}

function collect(dir: string, acc: string[]) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    // 규칙은 '/' 경로로 비교한다. Windows 의 path.relative() 는 '\' 를 돌려주므로 맞춰 둔다
    const rel = path.relative(process.cwd(), full).split(path.sep).join('/')
    if (SKIP_DIRS.some((skip) => rel === skip || rel.startsWith(skip + '/'))) continue
    if (statSync(full).isDirectory()) collect(full, acc)
    else if (/\.tsx?$/.test(name)) acc.push(rel)
  }
}

const files: string[] = []
for (const dir of SCAN_DIRS) collect(path.resolve(process.cwd(), dir), files)
files.push(...SCAN_FILES)

const found = new Map<string, Violation[]>(rules.map((r) => [r.id, []]))

for (const file of files.sort()) {
  const lines = stripComments(readFileSync(file, 'utf8'))
  lines.forEach((line, i) => {
    for (const rule of rules) {
      if (rule.scan(file, line, i + 1)) {
        found.get(rule.id)!.push({ file, line: i + 1, text: line.trim() })
      }
    }
  })
}

console.log(`\n▸ 아키텍처 검사 — 재고 변경 경로 (검사 대상 ${files.length}개 파일)\n`)

let failed = 0
for (const rule of rules) {
  const hits = found.get(rule.id)!
  if (hits.length > 0) failed++
  console.log(`${hits.length === 0 ? '✅' : '❌'} ${rule.id}  ${rule.title}`)
  console.log(`      근거: ${rule.source}`)
  for (const v of hits) console.log(`      ↳ ${v.file}:${v.line}  ${v.text}`)
}

if (failed > 0) {
  console.log(
    `\n❌ 규칙 ${failed}개 위반. 재고 수량 변경은 ${STOCK_MODULE} 의 applyMovement() 하나로만 한다.\n`
  )
  process.exit(1)
}

console.log('\n✅ 재고 변경은 전부 applyMovement() 를 거친다\n')
