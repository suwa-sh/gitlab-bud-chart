import { useState } from 'react'
import { gitlabApi } from '../../services/api'
import { useApp } from '../../contexts/AppContext'
import './GitLabConfig.css'

interface GitLabConfigProps {
  onConfigured?: () => void
}

export const GitLabConfig = ({ onConfigured }: GitLabConfigProps) => {
  const { dispatch } = useApp()
  const [config, setConfig] = useState({
    gitlab_url: import.meta.env.VITE_GITLAB_URL || 'http://localhost:8080',
    gitlab_token: import.meta.env.VITE_GITLAB_TOKEN || '',
    project_id: import.meta.env.VITE_GITLAB_PROJECT_ID || '1'
  })
  const [isConnecting, setIsConnecting] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [error, setError] = useState<string>('')

  const handleConnect = async () => {
    setIsConnecting(true)
    setError('')
    setStatus('接続中...')
    
    try {
      const result = await gitlabApi.connect(config)
      setStatus(`✓ GitLab接続済み: ${result.project_info.project?.name || 'Unknown'}`)
      
      // AppContextを更新
      dispatch({
        type: 'SET_GITLAB_CONFIG',
        payload: {
          isConnected: true,
          url: config.gitlab_url,
          token: config.gitlab_token,
          projectId: config.project_id
        }
      })
      
      onConfigured?.()
    } catch (err: any) {
      setError(err.response?.data?.detail || '接続に失敗しました')
      setStatus('')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleTestConnection = async () => {
    try {
      const status = await gitlabApi.getStatus()
      if (status.connected) {
        setStatus(`接続確認済み: ${status.project?.name}`)
        setError('')
      } else {
        setError(status.error || '接続されていません')
        setStatus('')
      }
    } catch (err: any) {
      setError('接続状態確認に失敗しました')
      setStatus('')
    }
  }

  return (
    <div className="gitlab-config">
      <h3>GitLab Configuration</h3>
      
      <div className="config-form">
        <div className="form-group">
          <label htmlFor="gitlab-url">GitLab URL:</label>
          <input
            id="gitlab-url"
            type="text"
            value={config.gitlab_url}
            onChange={(e) => setConfig(prev => ({ ...prev, gitlab_url: e.target.value }))}
            placeholder="http://localhost:8080"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="access-token">Access Token:</label>
          <input
            id="access-token"
            type="password"
            value={config.gitlab_token}
            onChange={(e) => setConfig(prev => ({ ...prev, gitlab_token: e.target.value }))}
            placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="project-id">Project ID:</label>
          <input
            id="project-id"
            type="text"
            value={config.project_id}
            onChange={(e) => setConfig(prev => ({ ...prev, project_id: e.target.value }))}
            placeholder="1"
          />
        </div>
        
        <div className="form-actions">
          <button 
            onClick={handleConnect} 
            disabled={isConnecting || !config.gitlab_token || !config.project_id}
          >
            {isConnecting ? '接続中...' : '接続'}
          </button>
          
          <button onClick={handleTestConnection}>
            接続確認
          </button>
        </div>
      </div>
      
      {status && (
        <div className="status success">
          {status}
        </div>
      )}
      
      {error && (
        <div className="status error">
          {error}
        </div>
      )}
    </div>
  )
}