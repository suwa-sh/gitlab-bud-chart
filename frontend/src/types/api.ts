export interface Issue {
  id: number
  iid: number
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
  is_epic?: boolean
}

export interface ChartData {
  date: string
  planned_points: number
  actual_points: number
  remaining_points: number
  completed_points: number
  total_points: number
  completed_issues: number
  total_issues: number
}

export interface BurnChartResponse {
  chart_data: ChartData[]
  metadata: {
    total_issues: number
    total_points: number
    milestone: string | null
    date_range: {
      start: string
      end: string
    }
  }
  statistics: {
    completion_rate: number
    final_remaining_points?: number
    final_completed_points?: number
    days_analyzed: number
  }
}

export interface VelocityData {
  week_start: string
  week_end: string
  completed_points: number
  completed_issues: number
}

export interface VelocityResponse {
  velocity_data: VelocityData[]
  average_velocity: number
  weeks_analyzed: number
}