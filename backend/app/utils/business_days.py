"""営業日計算ユーティリティ"""

from datetime import date, timedelta
from typing import List
import holidays

class BusinessDayCalculator:
    """営業日計算クラス"""
    
    def __init__(self):
        # 日本の祝日カレンダーを初期化
        self.jp_holidays = holidays.Japan()
    
    def is_business_day(self, target_date: date) -> bool:
        """指定日が営業日かどうかを判定
        
        Args:
            target_date: 判定対象の日付
            
        Returns:
            営業日の場合True、土日祝日の場合False
        """
        # 土日の場合はFalse
        if target_date.weekday() >= 5:  # 5:土曜, 6:日曜
            return False
        
        # 日本の祝日の場合はFalse
        if target_date in self.jp_holidays:
            return False
        
        return True
    
    def get_business_days_between(self, start_date: date, end_date: date) -> List[date]:
        """期間内の営業日リストを取得
        
        Args:
            start_date: 開始日
            end_date: 終了日（含む）
            
        Returns:
            営業日のリスト
        """
        business_days = []
        current_date = start_date
        
        while current_date <= end_date:
            if self.is_business_day(current_date):
                business_days.append(current_date)
            current_date += timedelta(days=1)
        
        return business_days
    
    def count_business_days(self, start_date: date, end_date: date) -> int:
        """期間内の営業日数を計算
        
        Args:
            start_date: 開始日
            end_date: 終了日（含む）
            
        Returns:
            営業日数
        """
        return len(self.get_business_days_between(start_date, end_date))
    
    def calculate_business_day_progress(
        self, 
        start_date: date, 
        end_date: date, 
        current_date: date
    ) -> float:
        """営業日ベースでの進捗率を計算
        
        Args:
            start_date: 期間開始日
            end_date: 期間終了日
            current_date: 現在日
            
        Returns:
            進捗率（0.0〜1.0）
        """
        if current_date <= start_date:
            return 0.0
        if current_date >= end_date:
            return 1.0
        
        total_business_days = self.count_business_days(start_date, end_date)
        if total_business_days == 0:
            return 1.0
        
        elapsed_business_days = self.count_business_days(start_date, current_date)
        return min(1.0, elapsed_business_days / total_business_days)