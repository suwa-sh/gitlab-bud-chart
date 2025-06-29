from datetime import timedelta
from typing import Any

import matplotlib.dates as mdates
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import pandas as pd


def chart_settings(df: pd.DataFrame) -> Any:
    # フォント設定
    plt.rcParams["font.family"] = "Hiragino Sans"

    # 描画領域の設定
    plt.figure(figsize=(16, 9))
    fig, ax = plt.subplots(figsize=(16, 9))

    # 左右と上の枠線は非表示
    for p in ["left", "top", "right"]:
        ax.spines[p].set_visible(False)

    # y軸のグリッドのみ表示
    ax.grid(axis="y")

    # グラフの描画開始位置を0に合わせる
    ax.spines["bottom"].set_position("zero")

    # 日付ラベルのフォーマットを設定
    fig.autofmt_xdate(rotation=315, ha="left")

    # 日付ラベルは開始日〜終了日で3日毎に表示
    # DayLocatorだと期間によって開始日がラベルに出なかったりするので、FixedLocatorを使う
    xticks = mdates.date2num([df.index[0] + timedelta(days=i) for i in range(0, (df.index[-1] - df.index[0]).days + 1, 3)])
    ax.xaxis.set_major_locator(ticker.FixedLocator(xticks))
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y-%m-%d"))
    ax.set_xlim([df.index[0], df.index[-1]])

    return ax


def title_size() -> int:
    return 24
