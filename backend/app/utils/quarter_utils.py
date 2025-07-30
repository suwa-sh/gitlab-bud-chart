from datetime import date, datetime
from typing import List


def get_overlapping_quarters(start_date, end_date) -> List[str]:
    """
    期間に重なる四半期を取得
    
    Args:
        start_date: 開始日（date or datetime or str）
        end_date: 終了日（date or datetime or str）
    
    Returns:
        List[str]: 四半期ラベルのリスト（例: ['FY23Q4', 'FY24Q1']）
    """
    # 文字列の場合は日付に変換
    if isinstance(start_date, str):
        start_date = datetime.fromisoformat(start_date).date()
    elif isinstance(start_date, datetime):
        start_date = start_date.date()
        
    if isinstance(end_date, str):
        end_date = datetime.fromisoformat(end_date).date()
    elif isinstance(end_date, datetime):
        end_date = end_date.date()
    
    quarters = set()
    
    # 開始月から終了月まで1ヶ月ずつチェック
    current = date(start_date.year, start_date.month, 1)
    while current <= end_date:
        quarter = date_to_fiscal_quarter(current)
        quarters.add(quarter)
        
        # 次の月へ
        if current.month == 12:
            current = date(current.year + 1, 1, 1)
        else:
            current = date(current.year, current.month + 1, 1)
    
    return sorted(list(quarters))


def date_to_fiscal_quarter(d: date) -> str:
    """
    日付から会計四半期を取得
    
    Args:
        d: 日付
    
    Returns:
        str: 四半期ラベル（例: 'FY25Q2'）
    """
    month = d.month
    year = d.year
    
    # 会計年度は4月開始と仮定
    # Q1: 4-6月, Q2: 7-9月, Q3: 10-12月, Q4: 1-3月
    if month >= 4:
        fiscal_year = year
        quarter = (month - 4) // 3 + 1
    else:
        fiscal_year = year - 1
        quarter = 4
    
    # 2桁の年度表記（例: 2025 -> 25）
    fiscal_year_short = fiscal_year % 100
    
    return f'FY{fiscal_year_short:02d}Q{quarter}'


def normalize_quarter_label(quarter: str) -> str:
    """
    四半期ラベルを正規化（@プレフィックスを除去）
    
    Args:
        quarter: 四半期ラベル（例: '@FY25Q2' or 'FY25Q2'）
    
    Returns:
        str: 正規化された四半期ラベル（例: 'FY25Q2'）
    """
    return quarter.replace('@', '') if quarter else ''