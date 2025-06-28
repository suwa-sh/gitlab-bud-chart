import React, { createContext, useContext, useReducer, ReactNode } from 'react'
import { Issue } from '../types/api'

interface AppState {
  issues: Issue[]
  loading: boolean
  error: string | null
  filters: {
    milestone?: string
    assignee?: string
    service?: string
    kanban_status?: string
    state?: string
    search?: string
    min_point?: number
    max_point?: number
    quarter?: string
    created_after?: string
    created_before?: string
    completed_after?: string
  }
  gitlabConfig: {
    url: string
    isConnected: boolean
  }
}

type AppAction = 
  | { type: 'SET_ISSUES'; payload: Issue[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_FILTERS'; payload: Partial<AppState['filters']> }
  | { type: 'SET_GITLAB_CONFIG'; payload: Partial<AppState['gitlabConfig']> }
  | { type: 'SET_METADATA'; payload: any }

const initialState: AppState = {
  issues: [],
  loading: false,
  error: null,
  filters: {},
  gitlabConfig: {
    url: '',
    isConnected: false
  }
}

const AppContext = createContext<{
  state: AppState
  dispatch: React.Dispatch<AppAction>
}>({ state: initialState, dispatch: () => null })

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ISSUES':
      return { ...state, issues: action.payload }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } }
    case 'SET_GITLAB_CONFIG':
      return { ...state, gitlabConfig: { ...state.gitlabConfig, ...action.payload } }
    case 'SET_METADATA':
      // Handle metadata if we need to store it in state later
      return state
    default:
      return state
  }
}

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, initialState)
  
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}