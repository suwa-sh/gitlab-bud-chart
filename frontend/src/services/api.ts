import axios from 'axios'
import { Issue, BurnChartResponse, VelocityResponse } from '../types/api'
import { getApiUrl } from '../config/env'

const API_BASE_URL = getApiUrl() ? `${getApiUrl()}/api` : '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// セッションIDヘッダーを自動付与するインターセプター
api.interceptors.request.use((config) => {
  const sessionId = localStorage.getItem('gitlab-dashboard-session-id')
  if (sessionId) {
    config.headers['X-Session-Id'] = sessionId
  }
  return config
})

// セッション期限切れ通知用のイベント
export const sessionExpiredEvent = new CustomEvent('session-expired')

// セッションIDをレスポンスから保存・エラーハンドリングするインターセプター
api.interceptors.response.use(
  (response) => {
    if (response.data?.session_id) {
      localStorage.setItem('gitlab-dashboard-session-id', response.data.session_id)
    }
    return response
  },
  (error) => {
    // セッション期限切れ・セッション無効の検出
    if (error.response?.status === 401 || error.response?.status === 403) {
      // セッションIDをクリア
      localStorage.removeItem('gitlab-dashboard-session-id')
      
      // セッション期限切れイベントを発火
      window.dispatchEvent(sessionExpiredEvent)
    } else if (error.response?.status === 404 && 
               error.response?.data?.detail?.includes('セッションが見つかりません')) {
      // セッションが見つからない場合（Docker再起動後など）
      console.warn('Session not found on backend, clearing local session')
      localStorage.removeItem('gitlab-dashboard-session-id')
      
      // セッション期限切れイベントを発火
      window.dispatchEvent(sessionExpiredEvent)
    }
    return Promise.reject(error)
  }
)

export const issuesApi = {
  getIssues: async (params?: {
    milestone?: string
    assignee?: string
    state?: string
    kanban_status?: string
    service?: string
    search?: string
    query?: string
    min_point?: number
    max_point?: number
    quarter?: string
    labels?: string
    created_after?: string
    created_before?: string
    completed_after?: string
    is_epic?: string
    chart_start_date?: string
    chart_end_date?: string
    page?: number
    per_page?: number
    sort_by?: string
    sort_order?: string
  }): Promise<Issue[] | any> => {
    const response = await api.get('/issues/', { params })
    return response.data
  },
  
  getIssue: async (id: number): Promise<Issue> => {
    const response = await api.get(`/issues/${id}/`)
    return response.data
  },
  
  searchIssues: async (params: {
    query: string
    milestone?: string
    assignee?: string
    state?: string
    kanban_status?: string
    service?: string
    min_point?: number
    max_point?: number
    quarter?: string
    is_epic?: string
    chart_start_date?: string
    chart_end_date?: string
    page?: number
    per_page?: number
  }): Promise<Issue[] | any> => {
    const response = await api.post('/issues/search', params)
    return response.data
  },
  
  exportIssues: async (filters: any, format: 'csv' | 'json' = 'csv'): Promise<Blob> => {
    const response = await api.get(`/issues/export/${format}`, {
      params: filters,
      responseType: 'blob'
    })
    return response.data
  },
  
  getAnalyzedIssues: async (params?: any): Promise<any> => {
    const response = await api.get('/issues/analyzed/', { params })
    return response.data
  },
  
  getIssueStatistics: async (params?: any): Promise<any> => {
    const response = await api.get('/issues/statistics/', { params })
    return response.data
  },
  
  validateIssues: async (): Promise<any> => {
    const response = await api.get('/issues/validation/')
    return response.data
  }
}

export const chartsApi = {
  getBurnDownData: async (
    milestone: string | undefined,
    startDate: string,
    endDate: string,
    filters?: {
      service?: string
      assignee?: string
      kanban_status?: string
      state?: string
      is_epic?: string
      point_min?: number
      point_max?: number
    }
  ): Promise<BurnChartResponse> => {
    const params: any = { start_date: startDate, end_date: endDate }
    if (milestone) {
      params.milestone = milestone
    }
    if (filters) {
      Object.assign(params, filters)
    }
    const response = await api.get('/charts/burn-down', { params })
    return response.data
  },
  
  getBurnUpData: async (
    milestone: string | undefined,
    startDate: string,
    endDate: string,
    filters?: {
      service?: string
      assignee?: string
      kanban_status?: string
      state?: string
      is_epic?: string
      point_min?: number
      point_max?: number
    }
  ): Promise<BurnChartResponse> => {
    const params: any = { start_date: startDate, end_date: endDate }
    if (milestone) {
      params.milestone = milestone
    }
    if (filters) {
      Object.assign(params, filters)
    }
    const response = await api.get('/charts/burn-up', { params })
    return response.data
  },
  
  getVelocityData: async (weeks: number = 12): Promise<VelocityResponse> => {
    const response = await api.get('/charts/velocity', {
      params: { weeks }
    })
    return response.data
  },
}

export const gitlabApi = {
  connect: async (config: {
    gitlab_url: string
    gitlab_token: string
    project_id: string
    api_version?: string
    http_proxy?: string
    https_proxy?: string
    no_proxy?: string
  }) => {
    const response = await api.post('/gitlab/connect', config)
    return response.data
  },
  
  getStatus: async () => {
    const response = await api.get('/gitlab/status/')
    return response.data
  },
  
  getSampleIssues: async () => {
    const response = await api.get('/gitlab/issues/sample/')
    return response.data
  },
  
  validate: async (config: {
    gitlab_url: string
    gitlab_token: string
    api_version?: string
    http_proxy?: string
    https_proxy?: string
    no_proxy?: string
  }) => {
    const response = await api.post('/gitlab/validate', config)
    return response.data
  },
  
  getProjects: async (config: {
    gitlab_url: string
    gitlab_token: string
    api_version?: string
    http_proxy?: string
    https_proxy?: string
    no_proxy?: string
  }) => {
    const response = await api.post('/gitlab/projects', config)
    return response.data
  },
}

export const sessionApi = {
  validateSession: async (): Promise<{ valid: boolean; session_id?: string }> => {
    try {
      const response = await api.get('/gitlab/status/')
      return { valid: true, session_id: response.data.session_id }
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 404) {
        return { valid: false }
      }
      throw error
    }
  },
  
  recreateSession: async (gitlabConfig: {
    gitlab_url: string
    gitlab_token: string
    project_id: string
    api_version?: string
    http_proxy?: string
    https_proxy?: string
    no_proxy?: string
  }): Promise<{ session_id: string }> => {
    // GitLab接続を再実行してセッションを再作成
    const response = await api.post('/gitlab/connect', gitlabConfig)
    return response.data
  },
}