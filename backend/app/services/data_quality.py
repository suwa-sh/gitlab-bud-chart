import logging
from typing import List, Dict, Any
from collections import Counter
from app.models.issue import IssueModel

logger = logging.getLogger(__name__)

class DataQualityChecker:
    """Issue分析データの品質チェック"""
    
    def generate_quality_report(self, issues: List[IssueModel]) -> Dict[str, Any]:
        """データ品質レポート生成"""
        try:
            total_issues = len(issues)
            
            # 基本統計
            basic_stats = self._calculate_basic_stats(issues)
            
            # データ完整性
            completeness = self._check_data_completeness(issues)
            
            # データ一貫性
            consistency = self._check_data_consistency(issues)
            
            # 異常値検出
            anomalies = self._detect_anomalies(issues)
            
            return {
                'total_issues': total_issues,
                'basic_statistics': basic_stats,
                'data_completeness': completeness,
                'data_consistency': consistency,
                'anomalies': anomalies,
                'quality_score': self._calculate_quality_score(completeness, consistency, anomalies)
            }
            
        except Exception as e:
            logger.error(f"品質レポート生成失敗: {e}")
            return {}
    
    def _calculate_basic_stats(self, issues: List[IssueModel]) -> Dict[str, Any]:
        """基本統計計算"""
        total = len(issues)
        
        return {
            'total_issues': total,
            'opened_issues': len([i for i in issues if i.state == 'opened']),
            'closed_issues': len([i for i in issues if i.state == 'closed']),
            'with_point': len([i for i in issues if i.point is not None]),
            'with_kanban_status': len([i for i in issues if i.kanban_status]),
            'with_service': len([i for i in issues if i.service]),
            'with_quarter': len([i for i in issues if i.quarter]),
            'with_assignee': len([i for i in issues if i.assignee]),
            'with_milestone': len([i for i in issues if i.milestone])
        }
    
    def _check_data_completeness(self, issues: List[IssueModel]) -> Dict[str, float]:
        """データ完整性チェック"""
        total = len(issues)
        if total == 0:
            return {}
        
        return {
            'point_completeness': len([i for i in issues if i.point is not None]) / total,
            'kanban_completeness': len([i for i in issues if i.kanban_status]) / total,
            'service_completeness': len([i for i in issues if i.service]) / total,
            'quarter_completeness': len([i for i in issues if i.quarter]) / total,
            'assignee_completeness': len([i for i in issues if i.assignee]) / total,
            'milestone_completeness': len([i for i in issues if i.milestone]) / total
        }
    
    def _check_data_consistency(self, issues: List[IssueModel]) -> Dict[str, Any]:
        """データ一貫性チェック"""
        inconsistencies = []
        
        for issue in issues:
            # 完了日 vs ステータス一貫性
            if issue.completed_at and issue.state == 'opened':
                inconsistencies.append({
                    'issue_id': issue.id,
                    'type': 'completed_date_vs_state',
                    'message': 'Openedのissueに完了日が設定されています'
                })
            
            # Kanban Status vs State一貫性
            if issue.kanban_status == '完了' and issue.state == 'opened':
                inconsistencies.append({
                    'issue_id': issue.id,
                    'type': 'kanban_vs_state',
                    'message': 'Kanbanステータスが完了だがissueがopen状態です'
                })
        
        return {
            'inconsistency_count': len(inconsistencies),
            'inconsistencies': inconsistencies
        }
    
    def _detect_anomalies(self, issues: List[IssueModel]) -> Dict[str, Any]:
        """異常値検出"""
        anomalies = []
        
        # Point値異常
        points = [i.point for i in issues if i.point is not None]
        if points:
            avg_point = sum(points) / len(points)
            for issue in issues:
                if issue.point and issue.point > avg_point * 3:
                    anomalies.append({
                        'issue_id': issue.id,
                        'type': 'high_point_value',
                        'value': issue.point,
                        'message': f'Point値が平均の3倍以上です (平均: {avg_point:.1f})'
                    })
        
        # ラベル数異常
        for issue in issues:
            if len(issue.labels) > 10:
                anomalies.append({
                    'issue_id': issue.id,
                    'type': 'too_many_labels',
                    'value': len(issue.labels),
                    'message': 'ラベル数が異常に多いです'
                })
        
        return {
            'anomaly_count': len(anomalies),
            'anomalies': anomalies
        }
    
    def _calculate_quality_score(self, completeness: Dict, consistency: Dict, anomalies: Dict) -> float:
        """品質スコア計算 (0-1)"""
        try:
            # 完整性スコア (重要フィールドの平均)
            important_fields = ['point_completeness', 'kanban_completeness', 'milestone_completeness']
            completeness_score = sum(completeness.get(field, 0) for field in important_fields) / len(important_fields)
            
            # 一貫性スコア
            consistency_score = 1.0 if consistency.get('inconsistency_count', 0) == 0 else 0.8
            
            # 異常値スコア
            anomaly_score = 1.0 if anomalies.get('anomaly_count', 0) == 0 else 0.9
            
            # 総合スコア
            return (completeness_score * 0.5 + consistency_score * 0.3 + anomaly_score * 0.2)
            
        except Exception as e:
            logger.error(f"品質スコア計算失敗: {e}")
            return 0.0

# グローバルインスタンス
data_quality_checker = DataQualityChecker()