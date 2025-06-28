import axios from 'axios'
import { Issue, ChartData } from '../types/api'

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
  }): Promise<Issue[]> => {
    const response = await api.get('/issues', { params })
    return response.data
  },
  
  getIssue: async (id: number): Promise<Issue> => {
    const response = await api.get(`/issues/${id}`)
    return response.data
  },
}

export const chartsApi = {
  getBurnDownData: async (
    milestone: string,
    startDate: string,
    endDate: string
  ): Promise<ChartData[]> => {
    const response = await api.get('/charts/burn-down', {
      params: { milestone, start_date: startDate, end_date: endDate }
    })
    return response.data
  },
  
  getBurnUpData: async (
    milestone: string,
    startDate: string,
    endDate: string
  ): Promise<ChartData[]> => {
    const response = await api.get('/charts/burn-up', {
      params: { milestone, start_date: startDate, end_date: endDate }
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