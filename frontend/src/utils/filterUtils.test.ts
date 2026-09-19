import { describe, it, expect } from 'vitest'
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
    web_url: '',
    ...overrides,
  }) as Issue

const titles = (issues: Issue[]) => issues.map((i) => i.title)

describe('filterIssues', () => {
  it('フィルタ未指定なら全件を返す', () => {
    const issues = [buildIssue({ title: 'a' }), buildIssue({ title: 'b' })]
    expect(filterIssues(issues, {})).toHaveLength(2)
  })

  it('Quarterで絞り込める', () => {
    const issues = [
      buildIssue({ title: 'q1', quarter: 'FY25Q1' }),
      buildIssue({ title: 'q2', quarter: 'FY25Q2' }),
      buildIssue({ title: 'none' }),
    ]
    expect(titles(filterIssues(issues, { quarter: 'FY25Q1' }))).toEqual(['q1'])
  })

  it('Pointの下限に0を指定できる', () => {
    const issues = [
      buildIssue({ title: 'zero', point: 0 }),
      buildIssue({ title: 'three', point: 3 }),
    ]
    expect(titles(filterIssues(issues, { point_min: 0 }))).toEqual([
      'zero',
      'three',
    ])
    expect(titles(filterIssues(issues, { point_max: 0 }))).toEqual(['zero'])
  })

  it('Point指定時はpoint未設定のissueを除外する（バックエンドと同じ）', () => {
    const issues = [
      buildIssue({ title: 'none' }),
      buildIssue({ title: 'null', point: null as unknown as number }),
      buildIssue({ title: 'five', point: 5 }),
    ]
    expect(titles(filterIssues(issues, { point_min: 1 }))).toEqual(['five'])
    expect(titles(filterIssues(issues, { point_max: 8 }))).toEqual(['five'])
  })

  it('Completed Atの開始日指定時は未完了issueを除外する（バックエンドと同じ）', () => {
    const issues = [
      buildIssue({ title: 'open' }),
      buildIssue({ title: 'done', completed_at: '2025-06-10T00:00:00Z' }),
    ]
    expect(
      titles(filterIssues(issues, { completed_at_from: '2025-06-01' })),
    ).toEqual(['done'])
  })

  it('Completed Atの終了日のみ指定時は未完了issueを含める（バックエンドと同じ）', () => {
    const issues = [
      buildIssue({ title: 'open' }),
      buildIssue({ title: 'late', completed_at: '2025-06-20T00:00:00Z' }),
      buildIssue({ title: 'done', completed_at: '2025-06-10T00:00:00Z' }),
    ]
    expect(
      titles(filterIssues(issues, { completed_at_to: '2025-06-15' })),
    ).toEqual(['open', 'done'])
  })

  it('検索は説明文も対象にする（バックエンドと同じ）', () => {
    const issues = [
      buildIssue({ title: 'in title: Login' }),
      buildIssue({ title: 'in description', description: 'fix LOGIN flow' }),
      buildIssue({
        title: 'no description',
        description: undefined as unknown as string,
      }),
      buildIssue({ title: 'unrelated', description: 'other' }),
    ]
    expect(titles(filterIssues(issues, { search: 'login' }))).toEqual([
      'in title: Login',
      'in description',
    ])
  })

  it("stateの'all'は絞り込みなしとして扱う（バックエンドと同じ）", () => {
    const issues = [
      buildIssue({ title: 'open', state: 'opened' }),
      buildIssue({ title: 'closed', state: 'closed' }),
    ]
    expect(titles(filterIssues(issues, { state: 'all' }))).toEqual([
      'open',
      'closed',
    ])
    expect(titles(filterIssues(issues, { state: 'closed' }))).toEqual([
      'closed',
    ])
  })

  it('複数条件はANDで適用する', () => {
    const issues = [
      buildIssue({ title: 'login api', service: 'auth', state: 'opened' }),
      buildIssue({ title: 'login ui', service: 'web', state: 'opened' }),
      buildIssue({ title: 'login batch', service: 'auth', state: 'closed' }),
    ]
    expect(
      titles(
        filterIssues(issues, {
          search: 'LOGIN',
          service: 'auth',
          state: 'opened',
        }),
      ),
    ).toEqual(['login api'])
  })
})
