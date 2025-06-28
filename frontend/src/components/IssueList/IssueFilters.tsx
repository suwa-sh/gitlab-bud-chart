import { useApp } from '../../contexts/AppContext'

export const IssueFilters = () => {
  const { state, dispatch } = useApp()

  const handleFilterChange = (key: string, value: string) => {
    dispatch({
      type: 'SET_FILTERS',
      payload: {
        ...state.filters,
        [key]: value === '' ? undefined : value
      }
    })
  }

  return (
    <div className="issue-filters">
      <h3>フィルター</h3>
      
      <div className="filter-grid">
        <div className="filter-group">
          <label htmlFor="filter-milestone">マイルストーン</label>
          <select
            id="filter-milestone"
            value={state.filters.milestone || ''}
            onChange={(e) => handleFilterChange('milestone', e.target.value)}
          >
            <option value="">すべて</option>
            <option value="v1.0">v1.0</option>
            <option value="v1.1">v1.1</option>
            <option value="v2.0">v2.0</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="filter-assignee">担当者</label>
          <select
            id="filter-assignee"
            value={state.filters.assignee || ''}
            onChange={(e) => handleFilterChange('assignee', e.target.value)}
          >
            <option value="">すべて</option>
            <option value="user1">user1</option>
            <option value="user2">user2</option>
            <option value="user3">user3</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="filter-service">サービス</label>
          <select
            id="filter-service"
            value={state.filters.service || ''}
            onChange={(e) => handleFilterChange('service', e.target.value)}
          >
            <option value="">すべて</option>
            <option value="frontend">frontend</option>
            <option value="backend">backend</option>
            <option value="infrastructure">infrastructure</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="filter-kanban-status">カンバンステータス</label>
          <select
            id="filter-kanban-status"
            value={state.filters.kanban_status || ''}
            onChange={(e) => handleFilterChange('kanban_status', e.target.value)}
          >
            <option value="">すべて</option>
            <option value="作業中">作業中</option>
            <option value="完了">完了</option>
            <option value="ブロック">ブロック</option>
          </select>
        </div>
      </div>
    </div>
  )
}