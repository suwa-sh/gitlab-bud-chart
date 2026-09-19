import { Issue } from '../types/api'

// バックエンドの CSV エクスポート (/api/issues/export/csv) と同じ列構成
const CSV_COLUMNS: { header: string; value: (issue: Issue) => unknown }[] = [
  { header: 'ID', value: (i) => i.id },
  { header: 'Title', value: (i) => i.title },
  { header: 'State', value: (i) => i.state },
  { header: 'Created At', value: (i) => i.created_at },
  { header: 'Updated At', value: (i) => i.updated_at },
  { header: 'Due Date', value: (i) => i.due_date },
  { header: 'Assignee', value: (i) => i.assignee },
  { header: 'Milestone', value: (i) => i.milestone },
  { header: 'Epic', value: (i) => (i.is_epic ? 'Epic' : '') },
  { header: 'Point', value: (i) => i.point },
  { header: 'Kanban Status', value: (i) => i.kanban_status },
  { header: 'Service', value: (i) => i.service },
  { header: 'Quarter', value: (i) => i.quarter },
  { header: 'Completed At', value: (i) => i.completed_at },
  { header: 'Web URL', value: (i) => i.web_url },
]

// 表計算ソフトが数式として解釈する先頭文字。issue のタイトル等は GitLab の利用者が自由に書けるため、
// そのまま出力すると CSV を開いた人の環境で数式が実行されるおそれがある (CSV インジェクション)
const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r']

const toCell = (value: unknown): string => {
  // 0 は有効な値なので空欄にしない (null / undefined だけを空欄にする)
  if (value === null || value === undefined) return ''

  let text = String(value)
  if (
    typeof value === 'string' &&
    FORMULA_PREFIXES.some((p) => text.startsWith(p))
  ) {
    text = `'${text}`
  }
  // RFC 4180: 区切り文字・引用符・改行を含むセルは引用符で囲み、引用符は二重にする
  if (/[",\r\n]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`
  }
  return text
}

/**
 * 渡された issue をそのままの順序で CSV にする。
 * 画面に表示している issue (絞り込み・並べ替え済み) を渡すことで、画面と CSV の内容が必ず一致する
 */
export const issuesToCsv = (issues: Issue[]): string => {
  const rows = [
    CSV_COLUMNS.map((c) => toCell(c.header)),
    ...issues.map((issue) => CSV_COLUMNS.map((c) => toCell(c.value(issue)))),
  ]
  return rows.map((row) => row.join(',')).join('\r\n') + '\r\n'
}

export const downloadCsv = (filename: string, csv: string): void => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const exportIssuesAsCsv = (
  issues: Issue[],
  filenamePrefix: string,
): void => {
  const date = new Date().toISOString().split('T')[0]
  downloadCsv(`${filenamePrefix}_${date}.csv`, issuesToCsv(issues))
}
