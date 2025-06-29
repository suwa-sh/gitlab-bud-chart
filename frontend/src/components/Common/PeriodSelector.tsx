import { useState } from 'react'
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns'
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
  const [selectedPreset, setSelectedPreset] = useState('this-quarter')

  const handlePresetPeriod = (preset: string) => {
    const today = new Date()
    let start: Date
    let end: Date

    switch (preset) {
      case 'this-month':
        start = startOfMonth(today)
        end = endOfMonth(today)
        break
      case 'last-month':
        const lastMonth = addMonths(today, -1)
        start = startOfMonth(lastMonth)
        end = endOfMonth(lastMonth)
        break
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
          className={!isCustom && selectedPreset === 'this-month' ? 'active' : ''}
          onClick={() => handlePresetPeriod('this-month')}
        >
          今月
        </button>
        <button 
          className={!isCustom && selectedPreset === 'last-month' ? 'active' : ''}
          onClick={() => handlePresetPeriod('last-month')}
        >
          先月
        </button>
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
          className={isCustom ? 'active' : ''}
          onClick={() => {
            if (!isCustom) {
              // When opening custom mode, set to current quarter if no specific period is selected
              const today = new Date()
              const quarterMonth = Math.floor(today.getMonth() / 3) * 3
              const start = new Date(today.getFullYear(), quarterMonth, 1)
              const end = endOfMonth(addMonths(start, 2))
              
              onChange({
                start: format(start, 'yyyy-MM-dd'),
                end: format(end, 'yyyy-MM-dd')
              })
              setSelectedPreset('')
            }
            setIsCustom(!isCustom)
          }}
        >
          カスタム
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
      
      <div className="current-period">
        <span>{value.start} 〜 {value.end}</span>
      </div>
    </div>
  )
}