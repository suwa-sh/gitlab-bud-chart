// PBL Viewerの全フィルタを未指定に戻す値。
// reducerは既存値にマージするため、解除したいキーは省略せず空値で明示する
export const EMPTY_PBL_FILTERS = {
  search: '',
  milestone: '',
  assignee: '',
  kanban_status: '',
  service: '',
  state: '',
  min_point: undefined,
  max_point: undefined,
  created_after: '',
  created_before: '',
  completed_after: '',
  completed_before: '',
  is_epic: '',
  quarter: '',
}
