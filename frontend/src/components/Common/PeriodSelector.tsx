import { useState, useEffect } from 'react'
import { format, addMonths, endOfMonth } from 'date-fns'
import './PeriodSelector.css'

interface PeriodSelectorProps {
  value: {
    start: string
    end: string
  }
  onChange: (period: { start: string; end: string }) => void
}

export const PeriodSelector = ({ value, onChange }: PeriodSelectorProps) => {
  const [isCustom, setIsCustom] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState('')

  const formatPeriodDisplay = (start: string, end: string): string => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    
    const formatDate = (date: Date) => {
      return format(date, 'yyyy/MM/dd')
    }
    
    return `${formatDate(startDate)} 〜 ${formatDate(endDate)}`
  }

  // 現在の期間がどのプリセットに一致するかを判定
  const detectPreset = (start: string, end: string): string => {
    const today = new Date()
    
    // 今四半期をチェック
    const quarterMonth = Math.floor(today.getMonth() / 3) * 3
    const thisQuarterStart = new Date(today.getFullYear(), quarterMonth, 1)
    const thisQuarterEnd = endOfMonth(addMonths(thisQuarterStart, 2))
    if (start === format(thisQuarterStart, 'yyyy-MM-dd') && 
        end === format(thisQuarterEnd, 'yyyy-MM-dd')) {
      return 'this-quarter'
    }
    
    // 前四半期をチェック
    const lastQuarterStart = addMonths(new Date(), -3)
    const lastQuarterMonth = Math.floor(lastQuarterStart.getMonth() / 3) * 3
    const prevQuarterStart = new Date(lastQuarterStart.getFullYear(), lastQuarterMonth, 1)
    const prevQuarterEnd = endOfMonth(addMonths(prevQuarterStart, 2))
    if (start === format(prevQuarterStart, 'yyyy-MM-dd') && 
        end === format(prevQuarterEnd, 'yyyy-MM-dd')) {
      return 'last-quarter'
    }
    
    // 今年をチェック
    const thisYearStart = new Date(today.getFullYear(), 0, 1)
    const thisYearEnd = new Date(today.getFullYear(), 11, 31)
    if (start === format(thisYearStart, 'yyyy-MM-dd') && 
        end === format(thisYearEnd, 'yyyy-MM-dd')) {
      return 'this-year'
    }
    
    return ''
  }

  // valueが変更されたときにプリセットを再判定
  useEffect(() => {
    const preset = detectPreset(value.start, value.end)
    setSelectedPreset(preset)
    setIsCustom(preset === '')
  }, [value.start, value.end])

  const handlePresetPeriod = (preset: string) => {
    const today = new Date()
    let start: Date
    let end: Date

    switch (preset) {
      case 'this-quarter':
        const quarterMonth = Math.floor(today.getMonth() / 3) * 3
        start = new Date(today.getFullYear(), quarterMonth, 1)
        end = endOfMonth(addMonths(start, 2))
        break
      case 'last-quarter':
        const lastQuarterStart = addMonths(new Date(), -3)
        const lastQuarterMonth = Math.floor(lastQuarterStart.getMonth() / 3) * 3
        start = new Date(lastQuarterStart.getFullYear(), lastQuarterMonth, 1)
        end = endOfMonth(addMonths(start, 2))
        break
      case 'this-year':
        start = new Date(today.getFullYear(), 0, 1)
        end = new Date(today.getFullYear(), 11, 31)
        break
      default:
        return
    }

    onChange({
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd')
    })
    setIsCustom(false)
    setSelectedPreset(preset)
  }

  return (
    <div className="period-selector">
      <div className="period-presets">
        <button 
          className={!isCustom && selectedPreset === 'this-quarter' ? 'active' : ''}
          onClick={() => handlePresetPeriod('this-quarter')}
        >
          今四半期
        </button>
        <button 
          className={!isCustom && selectedPreset === 'last-quarter' ? 'active' : ''}
          onClick={() => handlePresetPeriod('last-quarter')}
        >
          前四半期
        </button>
        <button 
          className={!isCustom && selectedPreset === 'this-year' ? 'active' : ''}
          onClick={() => handlePresetPeriod('this-year')}
        >
          今年
        </button>
        <button 
          className={`period-display-button ${isCustom ? 'active' : ''}`}
          onClick={() => {
            if (!isCustom) {
              setSelectedPreset('')
            }
            setIsCustom(!isCustom)
          }}
          title="クリックしてカスタム期間を設定"
        >
          📅 {formatPeriodDisplay(value.start, value.end)}
        </button>
      </div>
      
      {isCustom && (
        <div className="custom-period">
          <input
            type="date"
            value={value.start}
            onChange={(e) => onChange({ ...value, start: e.target.value })}
            className="date-input"
          />
          <span>〜</span>
          <input
            type="date"
            value={value.end}
            onChange={(e) => onChange({ ...value, end: e.target.value })}
            className="date-input"
          />
        </div>
      )}
    </div>
  )
}