import { useState, useEffect } from 'react'
import { gitlabApi } from '../../services/api'
import { useApp } from '../../contexts/AppContext'
import { getEnv } from '../../config/env'
import './GitLabConfig.css'

interface GitLabConfigProps {
  onConfigured?: () => void
  editMode?: boolean
  onCancel?: () => void
}

interface Project {
  id: number
  name: string
  path: string
  path_with_namespace: string
  description: string
  web_url: string
}

export const GitLabConfig = ({ onConfigured, editMode = false, onCancel }: GitLabConfigProps) => {
  const { state, dispatch } = useApp()
  
  // Initialize config from context when in edit mode
  const [config, setConfig] = useState({
    gitlab_url: editMode && state.gitlabConfig.url ? state.gitlabConfig.url : 
                (getEnv('VITE_GITLAB_URL', 'http://localhost:8080')),
    gitlab_token: editMode && state.gitlabConfig.token ? state.gitlabConfig.token : 
                  (getEnv('VITE_GITLAB_TOKEN', '')),
    project_id: editMode && state.gitlabConfig.projectId ? state.gitlabConfig.projectId : 
                (getEnv('VITE_GITLAB_PROJECT_ID', '1')),
    api_version: editMode && state.gitlabConfig.apiVersion ? state.gitlabConfig.apiVersion : 
                 (getEnv('VITE_GITLAB_API_VERSION', '4')),
    http_proxy: editMode && state.gitlabConfig.httpProxy ? state.gitlabConfig.httpProxy :
                (getEnv('VITE_HTTP_PROXY', '')),
    https_proxy: editMode && state.gitlabConfig.httpsProxy ? state.gitlabConfig.httpsProxy :
                 (getEnv('VITE_HTTPS_PROXY', '')),
    no_proxy: editMode && state.gitlabConfig.noProxy ? state.gitlabConfig.noProxy :
              (getEnv('VITE_NO_PROXY', ''))
  })
  
  const [isConnecting, setIsConnecting] = useState(false)
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [projects, setProjects] = useState<Project[]>([])
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [credentialsValid, setCredentialsValid] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Validate credentials and fetch projects when URL and token change
  useEffect(() => {
    const validateAndFetchProjects = async () => {
      if (config.gitlab_url && config.gitlab_token && config.gitlab_url.length > 5 && config.gitlab_token.length > 10) {
        setIsLoadingProjects(true)
        try {
          const validation = await gitlabApi.validate({
            gitlab_url: config.gitlab_url,
            gitlab_token: config.gitlab_token,
            api_version: config.api_version,
            http_proxy: config.http_proxy,
            https_proxy: config.https_proxy,
            no_proxy: config.no_proxy
          })
          
          if (validation.valid) {
            setCredentialsValid(true)
            const projectsResult = await gitlabApi.getProjects({
              gitlab_url: config.gitlab_url,
              gitlab_token: config.gitlab_token,
              api_version: config.api_version,
              http_proxy: config.http_proxy,
              https_proxy: config.https_proxy,
              no_proxy: config.no_proxy
            })
            setProjects(projectsResult.projects || [])
            setShowProjectDropdown(true)
            setError('')
          } else {
            setCredentialsValid(false)
            setProjects([])
            setShowProjectDropdown(false)
            setError(validation.message)
          }
        } catch (err: any) {
          setCredentialsValid(false)
          setProjects([])
          setShowProjectDropdown(false)
          setError('認証情報の確認に失敗しました')
        } finally {
          setIsLoadingProjects(false)
        }
      } else {
        setCredentialsValid(false)
        setProjects([])
        setShowProjectDropdown(false)
      }
    }

    const debounce = setTimeout(validateAndFetchProjects, 500)
    return () => clearTimeout(debounce)
  }, [config.gitlab_url, config.gitlab_token, config.api_version])

  const handleConnect = async () => {
    setIsConnecting(true)
    setError('')
    setStatus('接続中...')
    
    try {
      const result = await gitlabApi.connect(config)
      setStatus(`✓ GitLab接続済み: ${result.project_info.project?.name || 'Unknown'}`)
      
      // AppContextを更新
      const selectedProject = projects.find(p => p.id.toString() === config.project_id)
      
      // Extract namespace from web_url if path_with_namespace is not available
      let projectNamespace = selectedProject?.path_with_namespace || result.project_info.project?.path_with_namespace
      if (!projectNamespace && result.project_info.project?.web_url) {
        // Extract namespace from URL like http://localhost:8080/root/test-project
        const urlMatch = result.project_info.project.web_url.match(/https?:\/\/[^\/]+\/(.+)$/)
        if (urlMatch) {
          projectNamespace = urlMatch[1]
        }
      }
      
      dispatch({
        type: 'SET_GITLAB_CONFIG',
        payload: {
          isConnected: true,
          url: config.gitlab_url,
          token: config.gitlab_token,
          projectId: config.project_id,
          projectName: selectedProject?.name || result.project_info.project?.name || config.project_id,
          projectNamespace: projectNamespace,
          apiVersion: config.api_version,
          httpProxy: config.http_proxy,
          httpsProxy: config.https_proxy,
          noProxy: config.no_proxy
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

  const handleDisconnect = () => {
    dispatch({
      type: 'SET_GITLAB_CONFIG',
      payload: {
        isConnected: false,
        url: '',
        token: '',
        projectId: '',
        projectName: '',
        projectNamespace: '',
        apiVersion: '4'
      }
    })
    setStatus('')
    setError('')
    onCancel?.()
  }

  return (
    <div className="gitlab-config">
      <h3>{editMode ? 'GitLab設定変更' : 'GitLab Configuration'}</h3>
      
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
          <label htmlFor="project-selector">Project:</label>
          <div className="project-selector">
            {showProjectDropdown && projects.length > 0 ? (
              <div className="project-dropdown-container">
                <select
                  id="project-selector"
                  value={config.project_id}
                  onChange={(e) => setConfig(prev => ({ ...prev, project_id: e.target.value }))}
                  className="project-dropdown"
                >
                  <option value="">プロジェクトを選択...</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id.toString()}>
                      {project.name} ({project.path_with_namespace})
                    </option>
                  ))}
                </select>
                <div className="project-dropdown-info">
                  {isLoadingProjects ? (
                    <span className="loading">プロジェクト読み込み中...</span>
                  ) : (
                    <span className="project-count">{projects.length}個のプロジェクトが利用可能</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="project-manual-input">
                <input
                  id="project-id"
                  type="text"
                  value={config.project_id}
                  onChange={(e) => setConfig(prev => ({ ...prev, project_id: e.target.value }))}
                  placeholder="プロジェクトIDまたは名前"
                />
                {isLoadingProjects && (
                  <div className="loading-indicator">認証確認中...</div>
                )}
                {!credentialsValid && config.gitlab_url && config.gitlab_token && (
                  <div className="validation-hint">有効なURLとトークンを入力するとプロジェクト一覧が表示されます</div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="api-version">API Version:</label>
          <input
            id="api-version"
            type="text"
            value={config.api_version}
            onChange={(e) => setConfig(prev => ({ ...prev, api_version: e.target.value }))}
            placeholder="4"
          />
        </div>
        
        <div className="advanced-section">
          <button
            type="button"
            className="advanced-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? '▼' : '▶'} プロキシ設定（高度な設定）
          </button>
          
          {showAdvanced && (
            <div className="advanced-fields">
              <div className="form-group">
                <label htmlFor="http-proxy">HTTP Proxy:</label>
                <input
                  id="http-proxy"
                  type="text"
                  value={config.http_proxy}
                  onChange={(e) => setConfig(prev => ({ ...prev, http_proxy: e.target.value }))}
                  placeholder="http://proxy.example.com:8080"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="https-proxy">HTTPS Proxy:</label>
                <input
                  id="https-proxy"
                  type="text"
                  value={config.https_proxy}
                  onChange={(e) => setConfig(prev => ({ ...prev, https_proxy: e.target.value }))}
                  placeholder="https://proxy.example.com:8080"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="no-proxy">No Proxy:</label>
                <input
                  id="no-proxy"
                  type="text"
                  value={config.no_proxy}
                  onChange={(e) => setConfig(prev => ({ ...prev, no_proxy: e.target.value }))}
                  placeholder="localhost,127.0.0.1,.example.com"
                />
                <small className="field-hint">
                  カンマ区切りでプロキシを使用しないホストを指定
                </small>
              </div>
            </div>
          )}
        </div>
        
        <div className="form-actions">
          <button 
            onClick={handleConnect} 
            disabled={isConnecting || !config.gitlab_token || !config.project_id}
            className="connect-button"
          >
            {isConnecting ? '接続中...' : (editMode ? '設定更新' : '接続')}
          </button>
          
          {!editMode && (
            <button onClick={handleTestConnection} className="test-button">
              接続確認
            </button>
          )}
          
          {editMode && (
            <>
              <button onClick={onCancel} className="cancel-button">
                キャンセル
              </button>
              <button onClick={handleDisconnect} className="disconnect-button">
                接続解除
              </button>
            </>
          )}
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
      
      {credentialsValid && projects.length > 0 && (
        <div className="status info">
          ✓ 認証成功 - {projects.length}個のプロジェクトが利用可能
        </div>
      )}
    </div>
  )
}