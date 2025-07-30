import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { generateQuarterOptions, fiscalQuarterToDateRange } from '../../utils/quarterUtils'
import './PeriodSelector.css'

interface PeriodSelectorProps {
  value: {
    start: string
    end: string
  }
  onChange: (period: { start: string; end: string }) => void
}

export const PeriodSelector = ({ value, onChange }: PeriodSelectorProps) => {
  // Pending state for user inputs (not yet applied)
  const [pendingPeriod, setPendingPeriod] = useState(value)
  const [hasChanges, setHasChanges] = useState(false)
  const [selectedQuarter, setSelectedQuarter] = useState('')

  // Generate options
  const quarterOptions = generateQuarterOptions()

  // Update pending state when external value changes
  useEffect(() => {
    setPendingPeriod(value)
    setHasChanges(false)
    setSelectedQuarter('')
  }, [value])

  const handlePendingChange = (field: 'start' | 'end', newValue: string) => {
    const newPeriod = { ...pendingPeriod, [field]: newValue }
    setPendingPeriod(newPeriod)
    setHasChanges(
      newPeriod.start !== value.start || newPeriod.end !== value.end
    )
    setSelectedQuarter('')
  }

  const handleQuarterChange = (quarterValue: string) => {
    if (!quarterValue) {
      setSelectedQuarter('')
      return
    }

    try {
      const { start, end } = fiscalQuarterToDateRange(quarterValue)
      const newPeriod = {
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd')
      }
      setPendingPeriod(newPeriod)
      setHasChanges(
        newPeriod.start !== value.start || newPeriod.end !== value.end
      )
      setSelectedQuarter(quarterValue)
    } catch (error) {
      console.error('Invalid quarter format:', quarterValue)
    }
  }


  const handleApply = () => {
    onChange(pendingPeriod)
    setHasChanges(false)
  }

  const handleReset = () => {
    setPendingPeriod(value)
    setHasChanges(false)
    setSelectedQuarter('')
  }

  const formatPeriodDisplay = (start: string, end: string): string => {
    if (!start || !end) return '期間を選択してください'
    
    const startDate = new Date(start)
    const endDate = new Date(end)
    
    const formatDate = (date: Date) => {
      return format(date, 'yyyy/MM/dd')
    }
    
    return `${formatDate(startDate)} 〜 ${formatDate(endDate)}`
  }

  return (
    <div className={`period-selector ${hasChanges ? 'has-changes' : ''}`}>
      {/* Row 1: Quarter Selection - Full Width */}
      <div className="detail-filters-row">
        <div className="filter-group quarter-selection">
          <label>四半期選択:</label>
          <select
            value={selectedQuarter}
            onChange={(e) => handleQuarterChange(e.target.value)}
            className="filter-select"
          >
            <option value="">四半期を選択...</option>
            {quarterOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: Manual Date Selection */}
      <div className="detail-filters-row">
        <div className="filter-group period-dates">
          <label>期間:</label>
          <div className="date-range-inputs">
            <input
              type="date"
              value={pendingPeriod.start}
              onChange={(e) => handlePendingChange('start', e.target.value)}
              className="filter-input date-input"
            />
            <span className="range-separator">〜</span>
            <input
              type="date"
              value={pendingPeriod.end}
              onChange={(e) => handlePendingChange('end', e.target.value)}
              className="filter-input date-input"
            />
          </div>
        </div>
      </div>

      {/* Row 3: Period Display */}
      <div className="detail-filters-row">
        <div className="filter-group period-display-section">
          <label>選択中の期間:</label>
          <div className="period-display">
            {formatPeriodDisplay(pendingPeriod.start, pendingPeriod.end)}
          </div>
        </div>
      </div>

      {/* Row 4: Action Buttons */}
      <div className="filter-reset-section">
        <button 
          className={`apply-btn ${hasChanges ? 'highlighted' : ''}`}
          onClick={handleApply}
          disabled={!hasChanges || !pendingPeriod.start || !pendingPeriod.end}
        >
          ✓ 適用
        </button>
        <button 
          className="filter-reset-btn"
          onClick={handleReset}
          disabled={!hasChanges}
        >
          🔄 リセット
        </button>
      </div>
    </div>
  )
}