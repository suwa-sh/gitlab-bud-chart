interface PeriodSelectorProps {
  value: {
    start: string
    end: string
  }
  onChange: (period: { start: string; end: string }) => void
}

export const PeriodSelector = ({ value, onChange }: PeriodSelectorProps) => {
  const handleStartChange = (start: string) => {
    onChange({ ...value, start })
  }

  const handleEndChange = (end: string) => {
    onChange({ ...value, end })
  }

  // Generate month options (current year and next year)
  const generateMonthOptions = () => {
    const options = []
    const currentYear = new Date().getFullYear()
    
    for (let year = currentYear; year <= currentYear + 1; year++) {
      for (let month = 1; month <= 12; month++) {
        const monthStr = month.toString().padStart(2, '0')
        const value = `${year}-${monthStr}`
        const label = `${year}年${month}月`
        options.push({ value, label })
      }
    }
    
    return options
  }

  const monthOptions = generateMonthOptions()

  return (
    <div className="period-selector">
      <label>期間:</label>
      <div className="period-inputs">
        <select
          value={value.start}
          onChange={(e) => handleStartChange(e.target.value)}
          className="period-select"
        >
          {monthOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="period-separator">〜</span>
        <select
          value={value.end}
          onChange={(e) => handleEndChange(e.target.value)}
          className="period-select"
        >
          {monthOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}