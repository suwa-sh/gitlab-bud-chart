import axios from 'axios'
import { Issue, BurnChartResponse, VelocityResponse } from '../types/api'

const API_BASE_URL = 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

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
    created_after?: string
    created_before?: string
    completed_after?: string
    page?: number
    per_page?: number
    sort_by?: string
    sort_order?: string
  }): Promise<Issue[] | any> => {
    const response = await api.get('/issues', { params })
    return response.data
  },
  
  getIssue: async (id: number): Promise<Issue> => {
    const response = await api.get(`/issues/${id}`)
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
    const response = await api.get('/issues/analyzed', { params })
    return response.data
  },
  
  getIssueStatistics: async (params?: any): Promise<any> => {
    const response = await api.get('/issues/statistics', { params })
    return response.data
  },
  
  validateIssues: async (): Promise<any> => {
    const response = await api.get('/issues/validation')
    return response.data
  }
}

export const chartsApi = {
  getBurnDownData: async (
    milestone: string | undefined,
    startDate: string,
    endDate: string
  ): Promise<BurnChartResponse> => {
    const params: any = { start_date: startDate, end_date: endDate }
    if (milestone) {
      params.milestone = milestone
    }
    const response = await api.get('/charts/burn-down', { params })
    return response.data
  },
  
  getBurnUpData: async (
    milestone: string | undefined,
    startDate: string,
    endDate: string
  ): Promise<BurnChartResponse> => {
    const params: any = { start_date: startDate, end_date: endDate }
    if (milestone) {
      params.milestone = milestone
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
  }) => {
    const response = await api.post('/gitlab/connect', config)
    return response.data
  },
  
  getStatus: async () => {
    const response = await api.get('/gitlab/status')
    return response.data
  },
  
  getSampleIssues: async () => {
    const response = await api.get('/gitlab/issues/sample')
    return response.data
  },
}