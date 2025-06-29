# Task 05: Issue分析ロジック実装

## 概要
issue_rules.mdに従ったラベル解析・データ変換ロジックを実装し、burn-up/burn-downチャート用データ準備を行う。

## 目的
- ラベル解析ロジック（point, kanban_status, service, quarter）実装
- データ変換・バリデーション機能実装
- 分析済みissueデータ提供機能
- 単体テスト・検証機能実装

## 前提条件
- Task 04完了（Issue取得機能実装済み）
- issue_rules.md の仕様確認済み

## 作業手順

### 1. Issue分析サービス実装

#### 1.1 IssueAnalyzerサービス作成

**backend/app/services/issue_analyzer.py**:
```python
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
            'quarter': None
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
```

#### 1.2 IssueService分析機能統合

**backend/app/services/issue_service.py** 更新:
```python
from app.services.issue_analyzer import issue_analyzer

class IssueService:
    # 既存メソッド...
    
    async def get_analyzed_issues(
        self,
        state: Optional[str] = 'all',
        milestone: Optional[str] = None,
        assignee: Optional[str] = None,
        labels: Optional[List[str]] = None,
        analyze: bool = True
    ) -> Tuple[List[IssueModel], Dict[str, Any]]:
        """
        分析済みissue取得 + 統計情報
        """
        # Issue取得
        issues = await self.get_all_issues(
            state=state,
            milestone=milestone,
            assignee=assignee,
            labels=labels
        )
        
        # 分析実行
        if analyze:
            issues = issue_analyzer.analyze_issues_batch(issues)
        
        # 統計情報生成
        statistics = self._generate_statistics(issues)
        
        return issues, statistics
    
    def _generate_statistics(self, issues: List[IssueModel]) -> Dict[str, Any]:
        """
        Issue統計情報生成
        """
        try:
            total_count = len(issues)
            
            # 状態別集計
            state_counts = {}
            for issue in issues:
                state_counts[issue.state] = state_counts.get(issue.state, 0) + 1
            
            # Point集計
            total_points = sum(issue.point for issue in issues if issue.point)
            avg_points = total_points / len([i for i in issues if i.point]) if any(i.point for i in issues) else 0
            
            # Kanban Status集計
            kanban_counts = {}
            for issue in issues:
                if issue.kanban_status:
                    kanban_counts[issue.kanban_status] = kanban_counts.get(issue.kanban_status, 0) + 1
            
            # Service集計
            service_counts = {}
            for issue in issues:
                if issue.service:
                    service_counts[issue.service] = service_counts.get(issue.service, 0) + 1
            
            # 完了率
            completed_issues = [i for i in issues if i.completed_at or i.state == 'closed']
            completion_rate = len(completed_issues) / total_count if total_count > 0 else 0
            
            # 一意値リスト
            unique_values = issue_analyzer.get_unique_values(issues)
            
            return {
                'total_count': total_count,
                'state_counts': state_counts,
                'total_points': total_points,
                'average_points': round(avg_points, 2),
                'kanban_counts': kanban_counts,
                'service_counts': service_counts,
                'completion_rate': round(completion_rate, 4),
                'unique_values': unique_values
            }
            
        except Exception as e:
            logger.error(f"統計情報生成失敗: {e}")
            return {}
```

### 2. 分析API実装

#### 2.1 Issues API分析機能追加

**backend/app/api/issues.py** 更新:
```python
from app.services.issue_analyzer import issue_analyzer

@router.get("/analyzed", response_model=Dict[str, Any])
async def get_analyzed_issues(
    state: Optional[str] = Query('all'),
    milestone: Optional[str] = Query(None),
    assignee: Optional[str] = Query(None),
    labels: Optional[str] = Query(None),
    include_statistics: bool = Query(True, description="統計情報を含めるか")
):
    """分析済みissue一覧取得"""
    try:
        label_list = labels.split(',') if labels else None
        
        # 分析済みissue取得
        issues, statistics = await issue_service.get_analyzed_issues(
            state=state,
            milestone=milestone,
            assignee=assignee,
            labels=label_list,
            analyze=True
        )
        
        # レスポンス構築
        issue_responses = [
            IssueResponse(
                id=issue.id,
                title=issue.title,
                description=issue.description,
                state=issue.state,
                created_at=issue.created_at,
                updated_at=issue.updated_at,
                due_date=issue.due_date,
                assignee=issue.assignee,
                milestone=issue.milestone,
                labels=issue.labels,
                web_url=issue.web_url,
                point=issue.point,
                kanban_status=issue.kanban_status,
                service=issue.service,
                quarter=issue.quarter,
                completed_at=issue.completed_at
            )
            for issue in issues
        ]
        
        response = {
            'issues': issue_responses,
            'total_count': len(issue_responses)
        }
        
        if include_statistics:
            response['statistics'] = statistics
        
        return response
        
    except Exception as e:
        logger.error(f"分析済みIssues取得API失敗: {e}")
        raise HTTPException(status_code=500, detail=f"分析済みIssues取得に失敗しました: {str(e)}")

@router.get("/validation", response_model=Dict[str, Any])
async def validate_issues_data():
    """Issue分析データ検証"""
    try:
        # 全issue取得・分析
        issues = await issue_service.get_all_issues()
        analyzed_issues = issue_analyzer.analyze_issues_batch(issues)
        
        # 検証実行
        validation_results = []
        for issue in analyzed_issues:
            validation = issue_analyzer.validate_issue_data(issue)
            if validation['warnings'] or validation['errors']:
                validation_results.append({
                    'issue_id': issue.id,
                    'issue_title': issue.title,
                    'warnings': validation['warnings'],
                    'errors': validation['errors']
                })
        
        # 検証サマリー
        total_issues = len(analyzed_issues)
        issues_with_warnings = len([r for r in validation_results if r['warnings']])
        issues_with_errors = len([r for r in validation_results if r['errors']])
        
        return {
            'validation_results': validation_results,
            'summary': {
                'total_issues': total_issues,
                'issues_with_warnings': issues_with_warnings,
                'issues_with_errors': issues_with_errors,
                'validation_rate': round((total_issues - issues_with_errors) / total_issues, 4) if total_issues > 0 else 0
            }
        }
        
    except Exception as e:
        logger.error(f"Issue検証API失敗: {e}")
        raise HTTPException(status_code=500, detail=f"Issue検証に失敗しました: {str(e)}")

@router.get("/statistics", response_model=Dict[str, Any])
async def get_issues_statistics(
    milestone: Optional[str] = Query(None),
    quarter: Optional[str] = Query(None),
    service: Optional[str] = Query(None)
):
    """Issue統計情報取得"""
    try:
        # フィルタ条件構築
        labels = []
        if quarter:
            labels.append(f"@{quarter}")
        if service:
            labels.append(f"s:{service}")
        
        # 分析済みissue取得
        issues, base_statistics = await issue_service.get_analyzed_issues(
            milestone=milestone,
            labels=labels if labels else None,
            analyze=True
        )
        
        # 詳細統計追加
        detailed_statistics = {
            **base_statistics,
            'milestone_breakdown': {},
            'quarter_breakdown': {},
            'service_breakdown': {},
            'point_distribution': {}
        }
        
        # マイルストーン別分析
        milestones = set(issue.milestone for issue in issues if issue.milestone)
        for ms in milestones:
            ms_issues = [i for i in issues if i.milestone == ms]
            detailed_statistics['milestone_breakdown'][ms] = {
                'count': len(ms_issues),
                'total_points': sum(i.point for i in ms_issues if i.point),
                'completed_count': len([i for i in ms_issues if i.completed_at])
            }
        
        # Quarter別分析
        quarters = set(issue.quarter for issue in issues if issue.quarter)
        for q in quarters:
            q_issues = [i for i in issues if i.quarter == q]
            detailed_statistics['quarter_breakdown'][q] = {
                'count': len(q_issues),
                'total_points': sum(i.point for i in q_issues if i.point)
            }
        
        # Service別分析
        services = set(issue.service for issue in issues if issue.service)
        for s in services:
            s_issues = [i for i in issues if i.service == s]
            detailed_statistics['service_breakdown'][s] = {
                'count': len(s_issues),
                'total_points': sum(i.point for i in s_issues if i.point)
            }
        
        # Point分布
        points = [issue.point for issue in issues if issue.point]
        if points:
            detailed_statistics['point_distribution'] = {
                'min': min(points),
                'max': max(points),
                'median': sorted(points)[len(points)//2],
                'distribution': {str(p): points.count(p) for p in set(points)}
            }
        
        return detailed_statistics
        
    except Exception as e:
        logger.error(f"Issue統計API失敗: {e}")
        raise HTTPException(status_code=500, detail=f"Issue統計取得に失敗しました: {str(e)}")
```

### 3. 単体テスト実装

#### 3.1 IssueAnalyzer テスト

**backend/tests/test_issue_analyzer.py**:
```python
import pytest
from datetime import datetime
from app.services.issue_analyzer import IssueAnalyzer
from app.models.issue import IssueModel

class TestIssueAnalyzer:
    
    @pytest.fixture
    def analyzer(self):
        return IssueAnalyzer()
    
    @pytest.fixture
    def sample_issue(self):
        return IssueModel(
            id=1,
            title="Test Issue",
            description="Test Description",
            state="opened",
            created_at=datetime(2024, 1, 1),
            updated_at=datetime(2024, 1, 15),
            due_date=datetime(2024, 2, 1),
            assignee="testuser",
            milestone="v1.0",
            labels=["p:1.5", "#作業中", "s:backend", "@FY25Q1", "enhancement"],
            web_url="http://example.com/issues/1"
        )
    
    def test_analyze_issue_all_labels(self, analyzer, sample_issue):
        # 実行
        result = analyzer.analyze_issue(sample_issue)
        
        # 検証
        assert result.point == 1.5
        assert result.kanban_status == "作業中"
        assert result.service == "backend"
        assert result.quarter == "FY25Q1"
        assert result.completed_at is None  # openedなので
    
    def test_analyze_labels_point_parsing(self, analyzer):
        # テストケース
        test_cases = [
            (["p:1.0"], 1.0),
            (["p:2.5"], 2.5),
            (["p:0.5"], 0.5),
            (["p:invalid"], None),
            (["point:1.0"], None),  # 無効なプレフィックス
            ([], None)
        ]
        
        for labels, expected in test_cases:
            result = analyzer._analyze_labels(labels)
            assert result['point'] == expected, f"Labels: {labels}, Expected: {expected}, Got: {result['point']}"
    
    def test_analyze_labels_kanban_parsing(self, analyzer):
        test_cases = [
            (["#作業中"], "作業中"),
            (["#完了"], "完了"),
            (["#レビュー中"], "レビュー中"),
            (["#未着手"], "未着手"),
            (["作業中"], None),  # プレフィックスなし
            ([], None)
        ]
        
        for labels, expected in test_cases:
            result = analyzer._analyze_labels(labels)
            assert result['kanban_status'] == expected
    
    def test_analyze_labels_service_parsing(self, analyzer):
        test_cases = [
            (["s:backend"], "backend"),
            (["s:frontend"], "frontend"),
            (["s:infrastructure"], "infrastructure"),
            (["service:backend"], None),  # 無効なプレフィックス
            ([], None)
        ]
        
        for labels, expected in test_cases:
            result = analyzer._analyze_labels(labels)
            assert result['service'] == expected
    
    def test_analyze_labels_quarter_parsing(self, analyzer):
        test_cases = [
            (["@FY25Q1"], "FY25Q1"),
            (["@FY25Q4"], "FY25Q4"),
            (["FY25Q1"], None),  # プレフィックスなし
            ([], None)
        ]
        
        for labels, expected in test_cases:
            result = analyzer._analyze_labels(labels)
            assert result['quarter'] == expected
    
    def test_determine_completed_at_due_date_closed(self, analyzer):
        issue = IssueModel(
            id=1,
            title="Test",
            description="",
            state="closed",
            created_at=datetime(2024, 1, 1),
            updated_at=datetime(2024, 1, 15),
            due_date=datetime(2024, 2, 1),
            labels=[]
        )
        
        result = analyzer._determine_completed_at(issue)
        assert result == datetime(2024, 2, 1)
    
    def test_determine_completed_at_kanban_completed(self, analyzer):
        issue = IssueModel(
            id=1,
            title="Test",
            description="",
            state="opened",
            created_at=datetime(2024, 1, 1),
            updated_at=datetime(2024, 1, 15),
            labels=[],
            kanban_status="完了"
        )
        
        result = analyzer._determine_completed_at(issue)
        assert result == datetime(2024, 1, 15)
    
    def test_determine_completed_at_none(self, analyzer):
        issue = IssueModel(
            id=1,
            title="Test",
            description="",
            state="opened",
            created_at=datetime(2024, 1, 1),
            labels=[],
            kanban_status="作業中"
        )
        
        result = analyzer._determine_completed_at(issue)
        assert result is None
    
    def test_analyze_issues_batch(self, analyzer):
        issues = [
            IssueModel(
                id=1, title="Issue 1", description="", state="opened",
                created_at=datetime(2024, 1, 1), labels=["p:1.0", "#作業中"]
            ),
            IssueModel(
                id=2, title="Issue 2", description="", state="closed",
                created_at=datetime(2024, 1, 2), labels=["p:2.0", "#完了"]
            )
        ]
        
        results = analyzer.analyze_issues_batch(issues)
        
        assert len(results) == 2
        assert results[0].point == 1.0
        assert results[0].kanban_status == "作業中"
        assert results[1].point == 2.0
        assert results[1].kanban_status == "完了"
    
    def test_get_unique_values(self, analyzer):
        issues = [
            IssueModel(
                id=1, title="Issue 1", description="", state="opened",
                created_at=datetime(2024, 1, 1), labels=[],
                point=1.0, kanban_status="作業中", service="backend", quarter="FY25Q1"
            ),
            IssueModel(
                id=2, title="Issue 2", description="", state="opened",
                created_at=datetime(2024, 1, 2), labels=[],
                point=2.0, kanban_status="完了", service="frontend", quarter="FY25Q1"
            ),
            IssueModel(
                id=3, title="Issue 3", description="", state="opened",
                created_at=datetime(2024, 1, 3), labels=[],
                point=1.0, kanban_status="作業中", service="backend", quarter="FY25Q2"
            )
        ]
        
        result = analyzer.get_unique_values(issues)
        
        assert set(result['kanban_statuses']) == {"作業中", "完了"}
        assert set(result['services']) == {"backend", "frontend"}
        assert set(result['quarters']) == {"FY25Q1", "FY25Q2"}
        assert set(result['points']) == {1.0, 2.0}
    
    def test_validate_issue_data_valid(self, analyzer):
        issue = IssueModel(
            id=1, title="Test", description="", state="opened",
            created_at=datetime(2024, 1, 1), labels=[],
            point=1.0, kanban_status="作業中", service="backend", quarter="FY25Q1"
        )
        
        result = analyzer.validate_issue_data(issue)
        
        # 標準的な値なので警告のみ（非標準serviceかもしれないが）
        assert len(result['errors']) == 0
    
    def test_validate_issue_data_errors(self, analyzer):
        issue = IssueModel(
            id=1, title="Test", description="", state="opened",
            created_at=datetime(2024, 1, 1), labels=[],
            point=-1.0,  # 無効
            kanban_status="不明なステータス",
            service="unknown_service",
            quarter="invalid_quarter",
            completed_at=datetime(2024, 1, 15)  # openedなのに完了日設定
        )
        
        result = analyzer.validate_issue_data(issue)
        
        assert len(result['errors']) >= 1  # point値エラー
        assert len(result['warnings']) >= 4  # 各種警告
        assert any("Point値が不正" in error for error in result['errors'])
        assert any("Openedのissue" in warning for warning in result['warnings'])
```

#### 3.2 分析API テスト

**backend/tests/test_api_analysis.py**:
```python
import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock
from datetime import datetime
from app.main import app
from app.models.issue import IssueModel

@pytest.mark.asyncio
class TestAnalysisAPI:
    
    @patch('app.api.issues.issue_service')
    async def test_get_analyzed_issues_success(self, mock_service):
        # Mock設定
        mock_issues = [
            IssueModel(
                id=1, title="Test Issue 1", description="", state="opened",
                created_at=datetime(2024, 1, 1), labels=[],
                point=1.0, kanban_status="作業中", service="backend"
            )
        ]
        mock_statistics = {
            'total_count': 1,
            'total_points': 1.0,
            'completion_rate': 0.0
        }
        mock_service.get_analyzed_issues = AsyncMock(return_value=(mock_issues, mock_statistics))
        
        # API呼び出し
        async with AsyncClient(app=app, base_url="http://test") as ac:
            response = await ac.get("/api/issues/analyzed")
        
        # 検証
        assert response.status_code == 200
        data = response.json()
        assert data['total_count'] == 1
        assert data['issues'][0]['point'] == 1.0
        assert data['issues'][0]['kanban_status'] == "作業中"
        assert 'statistics' in data
    
    @patch('app.api.issues.issue_service')
    @patch('app.api.issues.issue_analyzer')
    async def test_validate_issues_data(self, mock_analyzer, mock_service):
        # Mock設定
        mock_issues = [
            IssueModel(
                id=1, title="Test Issue", description="", state="opened",
                created_at=datetime(2024, 1, 1), labels=[]
            )
        ]
        mock_service.get_all_issues = AsyncMock(return_value=mock_issues)
        mock_analyzer.analyze_issues_batch.return_value = mock_issues
        mock_analyzer.validate_issue_data.return_value = {
            'warnings': ['Test warning'],
            'errors': []
        }
        
        # API呼び出し
        async with AsyncClient(app=app, base_url="http://test") as ac:
            response = await ac.get("/api/issues/validation")
        
        # 検証
        assert response.status_code == 200
        data = response.json()
        assert 'validation_results' in data
        assert 'summary' in data
        assert data['summary']['total_issues'] == 1
    
    @patch('app.api.issues.issue_service')
    async def test_get_issues_statistics(self, mock_service):
        # Mock設定
        mock_issues = [
            IssueModel(
                id=1, title="Test Issue", description="", state="opened",
                created_at=datetime(2024, 1, 1), labels=[],
                point=1.0, milestone="v1.0", quarter="FY25Q1", service="backend"
            )
        ]
        mock_statistics = {
            'total_count': 1,
            'total_points': 1.0
        }
        mock_service.get_analyzed_issues = AsyncMock(return_value=(mock_issues, mock_statistics))
        
        # API呼び出し
        async with AsyncClient(app=app, base_url="http://test") as ac:
            response = await ac.get("/api/issues/statistics")
        
        # 検証
        assert response.status_code == 200
        data = response.json()
        assert 'milestone_breakdown' in data
        assert 'quarter_breakdown' in data
        assert 'service_breakdown' in data
        assert 'point_distribution' in data
```

### 4. バリデーション・品質確認

#### 4.1 分析データ品質チェック

**backend/app/services/data_quality.py**:
```python
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
```

## 成果物

### 必須成果物
1. **IssueAnalyzer実装**:
   - ラベル解析機能（point, kanban_status, service, quarter）
   - completed_at決定ロジック
   - バリデーション機能
   - 統計情報生成機能

2. **分析API実装**:
   - GET /api/issues/analyzed（分析済みissue取得）
   - GET /api/issues/validation（データ検証）
   - GET /api/issues/statistics（統計情報）

3. **データ品質チェック**:
   - DataQualityChecker実装
   - 品質レポート生成機能

4. **テスト実装**:
   - IssueAnalyzer単体テスト
   - 分析API テスト
   - データ品質テスト

5. **バリデーション機能**:
   - データ完整性チェック
   - データ一貫性チェック
   - 異常値検出

## 検証項目

### 実施前確認
- [ ] Task 04のIssue取得機能動作確認
- [ ] issue_rules.md仕様理解完了
- [ ] テスト用GitLab データ準備完了

### 実施後確認
- [ ] 各種ラベル解析正常動作（point, kanban_status, service, quarter）
- [ ] completed_at決定ロジック正常動作
- [ ] バリデーション機能適切な警告・エラー検出
- [ ] 統計情報生成正常動作
- [ ] 単体テスト全件成功
- [ ] 分析API全件正常動作

### 品質確認
- [ ] データ品質スコア80%以上
- [ ] 分析処理パフォーマンス適切（1000件 < 3秒）
- [ ] エラーログ適切な出力
- [ ] メモリ使用量適正

## 次のタスクへの引き継ぎ

### Task 06への引き継ぎ事項
- 分析済みIssueModel構造確定
- 統計情報形式確定
- チャートデータ生成用基盤完成

### 注意事項
- issue_rules.mdの仕様変更時は分析ロジック更新必要
- 大量データ処理時のメモリ管理
- GitLab ラベル命名規則の徹底

## 作業時間見積もり
- **IssueAnalyzer実装**: 4-5時間
- **分析API実装**: 2-3時間
- **データ品質チェック**: 2-3時間
- **テスト実装**: 3-4時間
- **合計**: 11-15時間