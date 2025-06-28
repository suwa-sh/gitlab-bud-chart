export interface Issue {
  id: number
  title: string
  description?: string
  state: string
  created_at: string
  updated_at?: string
  due_date?: string
  assignee?: string
  milestone?: string
  labels: string[]
  
  // 分析済みフィールド
  point?: number
  kanban_status?: string
  service?: string
  quarter?: string
  completed_at?: string
}

export interface ChartData {
  date: string
  planned_points: number
  actual_points: number
  remaining_points: number
  completed_points: number
  completed_issues: number
  total_issues: number
}