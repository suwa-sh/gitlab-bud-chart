export interface URLFilters {
  // Common filters
  search?: string
  milestone?: string
  assignee?: string
  kanban_status?: string
  service?: string
  state?: string
  min_point?: number
  max_point?: number
  created_after?: string
  created_before?: string
  completed_after?: string
  completed_before?: string
  is_epic?: string
  quarter?: string
  
  // Dashboard specific
  period_start?: string
  period_end?: string
  
  // Sort parameters
  sortKey?: string
  sortDirection?: 'asc' | 'desc'
}

/**
 * URLSearchParamsからフィルタオブジェクトに変換
 */
export const parseURLParams = (searchParams: URLSearchParams): URLFilters => {
  const filters: URLFilters = {}
  
  // 文字列型のパラメータ
  const stringParams = [
    'search', 'milestone', 'assignee', 'kanban_status', 'service', 
    'state', 'created_after', 'created_before', 'completed_after', 
    'completed_before', 'is_epic', 'quarter', 'period_start', 
    'period_end', 'sortKey', 'sortDirection'
  ]
  
  stringParams.forEach(param => {
    const value = searchParams.get(param)
    if (value) {
      filters[param as keyof URLFilters] = value as any
    }
  })
  
  // 数値型のパラメータ
  const numberParams = ['min_point', 'max_point']
  numberParams.forEach(param => {
    const value = searchParams.get(param)
    if (value && !isNaN(Number(value))) {
      filters[param as keyof URLFilters] = Number(value) as any
    }
  })
  
  return filters
}

/**
 * フィルタオブジェクトからURLSearchParamsに変換
 */
export const buildURLParams = (filters: URLFilters): URLSearchParams => {
  const params = new URLSearchParams()
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  })
  
  return params
}

/**
 * 現在のURLにフィルタパラメータを反映（履歴を更新）
 */
export const updateURLWithFilters = (filters: URLFilters, navigate: (to: string) => void, pathname: string) => {
  const params = buildURLParams(filters)
  const newURL = params.toString() ? `${pathname}?${params.toString()}` : pathname
  navigate(newURL)
}

/**
 * 共有用のフルURLを生成
 */
export const generateShareURL = (filters: URLFilters, pathname: string): string => {
  const params = buildURLParams(filters)
  const origin = window.location.origin
  const url = params.toString() ? `${origin}${pathname}?${params.toString()}` : `${origin}${pathname}`
  return url
}

/**
 * URLをクリップボードにコピー
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error('Failed to copy to clipboard:', err)
    // フォールバック: 古いブラウザ対応
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      document.execCommand('copy')
      document.body.removeChild(textArea)
      return true
    } catch (err) {
      document.body.removeChild(textArea)
      return false
    }
  }
}