import { describe, it, expect } from 'vitest'
import { issuesToCsv } from './csvExport'
import { sortIssues } from './issueSort'
import { filterIssues } from './filterUtils'
import { Issue } from '../types/api'

const buildIssue = (overrides: Partial<Issue>): Issue =>
  ({
    id: 1,
    iid: 1,
    title: 'issue',
    description: '',
    state: 'opened',
    created_at: '2025-06-02T00:00:00Z',
    labels: [],
    ...overrides,
  }) as Issue

const parseRows = (csv: string): string[] => csv.trimEnd().split('\r\n')

describe('issuesToCsv', () => {
  it('バックエンドのCSVエクスポートと同じ列構成のヘッダーを出力する', () => {
    const [header] = parseRows(issuesToCsv([]))

    expect(header).toBe(
      'ID,Title,State,Created At,Updated At,Due Date,Assignee,Milestone,Epic,Point,Kanban Status,Service,Quarter,Completed At,Web URL',
    )
  })

  it('issueの各フィールドを列の順に出力する', () => {
    const csv = issuesToCsv([
      buildIssue({
        id: 42,
        title: 'ログイン改修',
        state: 'closed',
        created_at: '2025-06-02T10:00:00Z',
        updated_at: '2025-06-05T10:00:00Z',
        due_date: '2025-06-10',
        assignee: 'alice',
        milestone: 'v1.0',
        is_epic: true,
        point: 5,
        kanban_status: '完了',
        service: 'frontend',
        quarter: 'FY25Q1',
        completed_at: '2025-06-10T00:00:00Z',
        web_url: 'http://gitlab.example/issues/42',
      }),
    ])

    expect(parseRows(csv)[1]).toBe(
      '42,ログイン改修,closed,2025-06-02T10:00:00Z,2025-06-05T10:00:00Z,2025-06-10,alice,v1.0,Epic,5,完了,frontend,FY25Q1,2025-06-10T00:00:00Z,http://gitlab.example/issues/42',
    )
  })

  it('値が無いフィールドは空欄にする', () => {
    const row = parseRows(issuesToCsv([buildIssue({ id: 7, title: 't' })]))[1]

    expect(row).toBe('7,t,opened,2025-06-02T00:00:00Z,,,,,,,,,,,')
  })

  it('Pointの0は空欄にせず0と出力する', () => {
    const row = parseRows(issuesToCsv([buildIssue({ point: 0 })]))[1]

    expect(row.split(',')[9]).toBe('0')
  })

  it('カンマ・引用符・改行を含むセルは引用符で囲み、引用符は二重にする', () => {
    const csv = issuesToCsv([
      buildIssue({ title: 'a,b' }),
      buildIssue({ title: 'say "hi"' }),
      buildIssue({ title: 'line1\nline2' }),
    ])

    expect(csv).toContain('1,"a,b",opened')
    expect(csv).toContain('1,"say ""hi""",opened')
    expect(csv).toContain('1,"line1\nline2",opened')
  })

  it('数式として解釈される先頭文字を持つセルは無害化する', () => {
    const titles = ['=HYPERLINK("http://evil")', '+1', '-1', '@SUM(A1)']
    const csv = issuesToCsv(titles.map((title) => buildIssue({ title })))

    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`)
    expect(csv).toContain(",'+1,")
    expect(csv).toContain(",'-1,")
    expect(csv).toContain(",'@SUM(A1),")
  })

  it('渡された順序のまま出力する', () => {
    const csv = issuesToCsv([
      buildIssue({ id: 3, title: 'c' }),
      buildIssue({ id: 1, title: 'a' }),
      buildIssue({ id: 2, title: 'b' }),
    ])

    expect(
      parseRows(csv)
        .slice(1)
        .map((row) => row.split(',')[0]),
    ).toEqual(['3', '1', '2'])
  })

  it('画面と同じ絞り込み・並べ替えを適用したissueだけが出力される', () => {
    const issues = [
      buildIssue({ id: 1, title: 'web b', service: 'web', point: 8 }),
      buildIssue({ id: 2, title: 'auth', service: 'auth', point: 5 }),
      buildIssue({ id: 3, title: 'web a', service: 'web', point: 3 }),
    ]

    const displayed = sortIssues(filterIssues(issues, { service: 'web' }), {
      key: 'point',
      direction: 'asc',
    })
    const ids = parseRows(issuesToCsv(displayed))
      .slice(1)
      .map((row) => row.split(',')[0])

    expect(ids).toEqual(['3', '1'])
  })
})

describe('sortIssues', () => {
  const issues = [
    buildIssue({ id: 1, point: 5 }),
    buildIssue({ id: 2 }),
    buildIssue({ id: 3, point: 1 }),
  ]
  const ids = (list: Issue[]) => list.map((i) => i.id)

  it('ソート指定が無ければ元の順序を返す', () => {
    expect(ids(sortIssues(issues, null))).toEqual([1, 2, 3])
  })

  it('昇順・降順で並べ替え、値が無いissueはどちらでも末尾に置く', () => {
    expect(ids(sortIssues(issues, { key: 'point', direction: 'asc' }))).toEqual(
      [3, 1, 2],
    )
    expect(
      ids(sortIssues(issues, { key: 'point', direction: 'desc' })),
    ).toEqual([1, 3, 2])
  })

  it('元の配列を書き換えない', () => {
    sortIssues(issues, { key: 'point', direction: 'asc' })

    expect(ids(issues)).toEqual([1, 2, 3])
  })
})
