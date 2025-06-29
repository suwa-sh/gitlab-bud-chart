import pandas as pd
from domain.glissue_csv import GlissueCsv


class GlissueCsvHtmlRepo:
    def __init__(self, output_dir: str) -> None:
        self.filepath = f"{output_dir}/viewer.html"

    def write(self, glissue_csv: GlissueCsv) -> None:
        df = glissue_csv.raw()

        # 日付フォーマットは`yyyy/MM/dd`
        df["created_at"] = self.__date_format(df, "created_at", "%Y/%m/%d")
        df["completed_at"] = self.__date_format(df, "completed_at", "%Y/%m/%d")

        # NaNは、glissue_csvのデフォルト値に合わせる
        df = df.fillna(glissue_csv.default_value())

        self.__write_html(df)

    def __date_format(self, df: pd.DataFrame, col_name: str, format: str) -> pd.DataFrame:
        return_value = pd.DataFrame()
        return_value[col_name] = pd.to_datetime(df[col_name])
        return return_value[col_name].dt.strftime("%Y/%m/%d")

    def __write_html(self, df: pd.DataFrame) -> None:
        scripts = """
<link href="https://unpkg.com/tabulator-tables@6.2.5/dist/css/tabulator.min.css" rel="stylesheet">
<script type="text/javascript" src="https://unpkg.com/tabulator-tables@6.2.5/dist/js/tabulator.min.js"></script>
<script>
var table = new Tabulator("#viewer", { // pandasで出力したtableタグをid指定
  // テーブル全体
  height: "100%",        // ヘッダー固定
  layout:"fitDataTable", // カラム幅をデータに合わせる
  pagenation: false,     // ページング無効

  // クリップボード範囲コピー
  // 以下コードでクリップボードの範囲コピーが可能だが、初期表示時に強制的にセル１：１にフォーカス移動してしまう
  // ワークアラウンド対応としては、jsでページのロード完了時に先頭へスクロール
  selectableRange:1,             // 範囲選択
  clipboard:"copy",              // クリップボード: コピーのみ許可
  clipboardCopyRowRange:"range", // クリップボードコピー時の範囲: 範囲
  clipboardCopyConfig:{
    columnHeaders:false, // カラムヘッダーをコピーしない
  },
  
  // レイアウト
  columns:[ 
    { title:"service",       headerFilter:"list", headerFilterParams:{valuesLookup:true, clearable:true} },
    { title:"milestone",     headerFilter:"list", headerFilterParams:{valuesLookup:true, clearable:true} },
    { title:"is_epic",       headerFilter:"list", headerFilterParams:{valuesLookup:true, clearable:true} },
    { title:"title",         headerFilter:true,   formatter:"link", formatterParams:{ urlField:"web_url", target:"_blank" } }, // リンク付きテキスト
    { title:"point",         headerFilter:"list", headerFilterParams:{valuesLookup:true, clearable:true} },
    { title:"kanban_status", headerFilter:"list", headerFilterParams:{valuesLookup:true, clearable:true} },
    { title:"assignee",      headerFilter:"list", headerFilterParams:{valuesLookup:true, clearable:true} },
    { title:"quarter",       headerFilter:"list", headerFilterParams:{valuesLookup:true, clearable:true} },
    { title:"created_at",    headerFilter:dateRangeFilterEditor, headerFilterFunc:dateRangeFilterFunction, headerFilterLiveFilter:false },  // 範囲フィルタ
    { title:"completed_at",    headerFilter:dateRangeFilterEditor, headerFilterFunc:dateRangeFilterFunction, headerFilterLiveFilter:false },  // 範囲フィルタ
//    { title:"completed_at",  headerFilter:true },  // 未設定:- での検索があるため、範囲でのフィルタはなし
    { title:"state",         headerFilter:"list", headerFilterParams:{valuesLookup:true, clearable:true} }, 
    { title:"web_url",       headerFilter:true },
  ],

  // ソート
  columnHeaderSortMulti: true, // 複数項目ソート
  sortOrderReverse: true,      // ソートの順序を逆順にする = 記載順で優先されてソート
  initialSort:[
    {column:"service", dir:"asc"},
    {column:"milestone", dir:"asc"},
    {column:"title", dir:"asc"},
  ],

  // 条件付き書式 ※同じプロパティは、後勝ちで上書きされる
  rowFormatter:function(row){
      // ------------------------------ テンプレート ------------------------------
      if(row.getData().kanban_status == "--テンプレート"){
          row.getElement().style.backgroundColor = "#FFFBD5";
      }

      // ------------------------------ 計画 ------------------------------
      // epic
      if(row.getData().is_epic == "True"){
          row.getElement().style.backgroundColor = "#D5E0F1";
      }
      // ゴール
      if(row.getData().kanban_status == "--ゴール/アナウンス"){
          row.getElement().style.backgroundColor = "#F6D4D8";
      }
      // 完了
      if(row.getData().kanban_status == "完了" || row.getData().kanban_status == "不要"){
          row.getElement().style.backgroundColor = "darkgray";
      }
      if(row.getData().state == "closed"){
          row.getElement().style.backgroundColor = "darkgray";
      }
  },
});

// color palette
//   background
//     red    : #F6D4D8
//     orange : #FCF1D3
//     yellow : #FFFBD5
//     lime   : #EEF5D3
//     green  : #D1F1CC
//     blue   : #D5E0F1
//     purple : #E5D7EE
</script>
"""

        html = df.to_html(table_id="viewer", index=False)
        html = html + self.__date_range_filter_scritps() + scripts

        with open(self.filepath, mode="w") as f:
            f.write(html)

    def __date_range_filter_scritps(self) -> str:
        #
        return """
<script>
// date range header filter
// https://stackoverflow.com/questions/64257406/tabulator-filter-by-date-range-from-to-in-header
var dateRangeFilterEditor = function(cell, onRendered, success, cancel, editorParams){
  var end;
  var container = document.createElement("span");

  //create and style inputs
  var start = document.createElement("input");
  start.setAttribute("type", "date");
  start.setAttribute("placeholder", "Min");
  start.style.padding = "1px";
  start.style.width = "50%";
  start.style.boxSizing = "border-box";
  start.value = cell.getValue();
  function buildValues(){
    success({ start:start.value, end:end.value, });
  }
  function keypress(e){
    if(e.keyCode == 13){ buildValues(); }
    if(e.keyCode == 27){ cancel(); }
  }

  // clone
  end = start.cloneNode();
  end.setAttribute("placeholder", "Max");

  start.addEventListener("change", buildValues);
  start.addEventListener("blur", buildValues);
  start.addEventListener("keydown", keypress);
  end.addEventListener("change", buildValues);
  end.addEventListener("blur", buildValues);
  end.addEventListener("keydown", keypress);

  container.appendChild(start);
  container.appendChild(end);

  return container;
}

// date range filter function
function dateRangeFilterFunction(headerValue, rowValue, rowData, filterParams){
  //headerValue - the value of the header filter element
  //rowValue - the value of the column in this row
  //rowData - the data for the row being filtered
  //filterParams - params object passed to the headerFilterFuncParams property

  //convert strings into dates
  if(headerValue.start != ""){
    headerValue.start = new Date(headerValue.start);
  } 
  if(headerValue.end != ""){
    headerValue.end = new Date(headerValue.end );
  }

  //compare dates
  if(rowValue){
    rowValue = new Date(rowValue);
    if(headerValue.start != ""){
      if(headerValue.end != ""){
        return rowValue >= headerValue.start && rowValue <= headerValue.end;
      }else{
        return rowValue >= headerValue.start;
      }
    }else{
      if(headerValue.end != ""){
        return rowValue <= headerValue.end;
      }
    }
  }
  return true; //must return a boolean, true if it passes the filter.
}
</script>
"""
