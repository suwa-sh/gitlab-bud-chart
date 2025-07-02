import re
import logging
from typing import Dict, Optional, List, Tuple
from datetime import datetime
from app.models.issue import IssueModel

logger = logging.getLogger(__name__)

class IssueAnalyzer:
    """
    GitLab issueのラベル分析・データ変換サービス
    
    issue_rules.md準拠:
    - point: prefix が p: の label 値 [p:0.5, p:1.0, ...]
    - kanban_status: prefix が # の label 値 [#作業中, #完了, ...]
    - service: prefix が s: の label 値 [s:backend, s:frontend, ...]
    - quarter: prefix が @ の label 値 [@FY25Q1, @FY25Q2, ...]
    - completed_at: due_date を completed_at
    """
    
    def __init__(self):
        # ラベル解析用正規表現
        self.point_pattern = re.compile(r'^p:(\d+(?:\.\d+)?)$')
        self.kanban_pattern = re.compile(r'^#(.+)$')
        self.service_pattern = re.compile(r'^s:(.+)$')
        self.quarter_pattern = re.compile(r'^@(.+)$')
    
    def analyze_issue(self, issue: IssueModel) -> IssueModel:
        """
        Issue分析・ラベル解析実行
        """
        try:
            # ラベル解析
            analysis_result = self._analyze_labels(issue.labels)
            
            # 分析結果をissueに反映
            issue.point = analysis_result['point']
            issue.kanban_status = analysis_result['kanban_status']
            issue.service = analysis_result['service']
            issue.quarter = analysis_result['quarter']
            issue.is_epic = analysis_result['is_epic']
            
            # completed_at設定
            issue.completed_at = self._determine_completed_at(issue)
            
            logger.debug(f"Issue分析完了 (ID: {issue.id}): point={issue.point}, "
                        f"kanban={issue.kanban_status}, service={issue.service}")
            
            return issue
            
        except Exception as e:
            logger.error(f"Issue分析失敗 (ID: {issue.id}): {e}")
            # 分析失敗時はデフォルト値設定
            issue.point = None
            issue.kanban_status = None
            issue.service = None
            issue.quarter = None
            issue.completed_at = None
            issue.is_epic = None
            return issue
    
    def analyze_issues_batch(self, issues: List[IssueModel]) -> List[IssueModel]:
        """
        複数Issue一括分析
        """
        analyzed_issues = []
        
        for issue in issues:
            analyzed_issue = self.analyze_issue(issue)
            analyzed_issues.append(analyzed_issue)
        
        # 分析結果統計
        self._log_analysis_statistics(analyzed_issues)
        
        return analyzed_issues
    
    def _analyze_labels(self, labels: List[str]) -> Dict[str, Optional[str]]:
        """
        ラベル解析メイン処理
        """
        result = {
            'point': None,
            'kanban_status': None,
            'service': None,
            'quarter': None,
            'is_epic': False
        }
        
        for label in labels:
            # Point解析 (p:1.0, p:0.5, etc.)
            point_match = self.point_pattern.match(label)
            if point_match:
                try:
                    result['point'] = float(point_match.group(1))
                    logger.debug(f"Point解析: {label} -> {result['point']}")
                except ValueError:
                    logger.warning(f"Point値変換失敗: {label}")
            
            # Kanban Status解析 (#作業中, #完了, etc.)
            kanban_match = self.kanban_pattern.match(label)
            if kanban_match:
                result['kanban_status'] = kanban_match.group(1)
                logger.debug(f"Kanban Status解析: {label} -> {result['kanban_status']}")
            
            # Service解析 (s:backend, s:frontend, etc.)
            service_match = self.service_pattern.match(label)
            if service_match:
                result['service'] = service_match.group(1)
                logger.debug(f"Service解析: {label} -> {result['service']}")
            
            # Quarter解析 (@FY25Q1, @FY25Q2, etc.)
            quarter_match = self.quarter_pattern.match(label)
            if quarter_match:
                result['quarter'] = quarter_match.group(1)
                logger.debug(f"Quarter解析: {label} -> {result['quarter']}")
            
            # Epic解析 (ラベルに"epic"が含まれる場合)
            if 'epic' in label.lower():
                result['is_epic'] = True
                logger.debug(f"Epic解析: {label} -> Epic issue detected")
        
        return result
    
    def _determine_completed_at(self, issue: IssueModel) -> Optional[datetime]:
        """
        completed_at決定ロジック
        
        Rules:
        1. due_dateが設定されていて、stateが'closed'の場合 -> due_date
        2. kanban_statusが'完了'系の場合 -> updated_at
        3. その他 -> None
        """
        try:
            # Rule 1: due_date + closed state
            if issue.due_date and issue.state == 'closed':
                return issue.due_date
            
            # Rule 2: kanban_statusが完了系
            if issue.kanban_status:
                completed_statuses = ['完了', '済', 'done', 'completed', 'finished']
                if any(status in issue.kanban_status.lower() for status in completed_statuses):
                    return issue.updated_at or issue.created_at
            
            # Rule 3: その他
            return None
            
        except Exception as e:
            logger.warning(f"completed_at決定失敗 (ID: {issue.id}): {e}")
            return None
    
    def _log_analysis_statistics(self, issues: List[IssueModel]) -> None:
        """
        分析結果統計ログ出力
        """
        total = len(issues)
        
        point_count = sum(1 for issue in issues if issue.point is not None)
        kanban_count = sum(1 for issue in issues if issue.kanban_status is not None)
        service_count = sum(1 for issue in issues if issue.service is not None)
        quarter_count = sum(1 for issue in issues if issue.quarter is not None)
        completed_count = sum(1 for issue in issues if issue.completed_at is not None)
        
        logger.info(f"Issue分析統計 (総数: {total}):")
        logger.info(f"  Point設定済み: {point_count}/{total} ({point_count/total*100:.1f}%)")
        logger.info(f"  Kanban Status設定済み: {kanban_count}/{total} ({kanban_count/total*100:.1f}%)")
        logger.info(f"  Service設定済み: {service_count}/{total} ({service_count/total*100:.1f}%)")
        logger.info(f"  Quarter設定済み: {quarter_count}/{total} ({quarter_count/total*100:.1f}%)")
        logger.info(f"  完了日設定済み: {completed_count}/{total} ({completed_count/total*100:.1f}%)")
    
    def get_unique_values(self, issues: List[IssueModel]) -> Dict[str, List[str]]:
        """
        分析済みissueから一意値リスト取得
        """
        try:
            unique_kanban_statuses = list(set(
                issue.kanban_status for issue in issues 
                if issue.kanban_status is not None
            ))
            
            unique_services = list(set(
                issue.service for issue in issues 
                if issue.service is not None
            ))
            
            unique_quarters = list(set(
                issue.quarter for issue in issues 
                if issue.quarter is not None
            ))
            
            unique_points = sorted(list(set(
                issue.point for issue in issues 
                if issue.point is not None
            )))
            
            return {
                'kanban_statuses': sorted(unique_kanban_statuses),
                'services': sorted(unique_services),
                'quarters': sorted(unique_quarters),
                'points': unique_points
            }
            
        except Exception as e:
            logger.error(f"一意値取得失敗: {e}")
            return {
                'kanban_statuses': [],
                'services': [],
                'quarters': [],
                'points': []
            }
    
    def validate_issue_data(self, issue: IssueModel) -> Dict[str, List[str]]:
        """
        Issue分析データ検証
        """
        warnings = []
        errors = []
        
        # Point検証
        if issue.point is not None:
            if issue.point <= 0:
                errors.append(f"Point値が不正です: {issue.point}")
            elif issue.point > 100:
                warnings.append(f"Point値が大きすぎます: {issue.point}")
        
        # Kanban Status検証
        if issue.kanban_status:
            valid_statuses = ['未着手', '作業中', '完了', 'レビュー中', 'ブロック中']
            if issue.kanban_status not in valid_statuses:
                warnings.append(f"非標準のKanban Status: {issue.kanban_status}")
        
        # Service検証
        if issue.service:
            valid_services = ['frontend', 'backend', 'infrastructure', 'design', 'testing']
            if issue.service not in valid_services:
                warnings.append(f"非標準のService: {issue.service}")
        
        # Quarter検証
        if issue.quarter:
            quarter_pattern = re.compile(r'^FY\d{2}Q[1-4]$')
            if not quarter_pattern.match(issue.quarter):
                warnings.append(f"非標準のQuarter形式: {issue.quarter}")
        
        # completed_at整合性検証
        if issue.completed_at and issue.state == 'opened':
            warnings.append("Openedのissueに完了日が設定されています")
        
        return {
            'warnings': warnings,
            'errors': errors
        }

# グローバルインスタンス
issue_analyzer = IssueAnalyzer()