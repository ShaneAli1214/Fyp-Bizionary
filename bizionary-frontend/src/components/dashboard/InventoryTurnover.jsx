import React from 'react';
import ReactECharts from 'echarts-for-react';

const CHART_ACCENT = '#B7A893';
const BORDER_CARD = '#E8E0D3';
const TEXT_SECONDARY = '#9C9387';

const InventoryTurnover = ({ data }) => {
  const categories = data?.categories || ['Electronics','Grocery','Clothing','Auto','Pharma'];
  const turnover = data?.turnover || [8,6,4,5,3];
  const moving = data?.moving || [6,6.5,5,4.8,4.2];

  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#FFFFFF',
      borderColor: BORDER_CARD,
      borderWidth: 1,
      textStyle: { color: '#2B2620', fontSize: 12 },
      formatter: (params) => {
        const p = params[0];
        const mv = params.find(s => s.seriesName === 'Moving avg');
        const label = p ? `${p.axisValue}<br/>Turnover: ${p.data}` : '';
        const mvLabel = mv ? `<br/>Moving avg: ${mv.data}` : '';
        return label + mvLabel;
      }
    },
    legend: {
      right: 10,
      top: 6,
      textStyle: { color: TEXT_SECONDARY }
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLine: { lineStyle: { color: BORDER_CARD } },
      axisTick: { alignWithLabel: true, lineStyle: { color: BORDER_CARD } },
      axisLabel: { color: TEXT_SECONDARY, fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      name: 'Turns',
      nameTextStyle: { color: TEXT_SECONDARY },
      axisLine: { lineStyle: { color: BORDER_CARD } },
      axisLabel: { color: TEXT_SECONDARY, fontSize: 11 },
      splitLine: { lineStyle: { color: BORDER_CARD } }
    },
    grid: { left: '6%', right: '6%', bottom: '8%', top: '28%' },
    series: [
      {
        name: 'Turnover',
        type: 'bar',
        data: turnover,
        itemStyle: { color: CHART_ACCENT, borderRadius: [4, 4, 0, 0] },
        barWidth: '44%',
        label: { show: true, position: 'top', formatter: '{c}', color: TEXT_SECONDARY, fontSize: 11 }
      },
      {
        name: 'Moving avg',
        type: 'line',
        data: moving,
        smooth: true,
        lineStyle: { color: CHART_ACCENT, width: 2, type: 'dashed' },
        itemStyle: { color: CHART_ACCENT },
        symbol: 'circle',
        symbolSize: 6
      }
    ],
    backgroundColor: 'transparent'
  };

  return (
    <div className="bg-bg-card p-4 rounded-2xl border border-border-card shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-text-primary">Inventory Turnover</h4>
        <div className="text-xs text-text-secondary">Last 6 months</div>
      </div>
      <ReactECharts option={option} style={{ height: 220, width: '100%' }} />
    </div>
  );
};

export default InventoryTurnover;
