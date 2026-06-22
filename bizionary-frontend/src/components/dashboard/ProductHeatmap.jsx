import React from 'react';
import ReactECharts from 'echarts-for-react';

const CHART_ACCENT = '#B7A893';
const BORDER_CARD = '#E8E0D3';
const TEXT_SECONDARY = '#9C9387';

const ProductHeatmap = ({
  categories = ['Electronics','Grocery','Clothing','Auto','Pharma'],
  months = ['Jan','Feb','Mar','Apr','May','Jun'],
  matrix
}) => {
  const data = matrix || categories.flatMap((cat, y) =>
    months.map((m, x) => [x, y, Math.round(Math.random() * 100)])
  );

  const option = {
    tooltip: {
      position: 'top',
      backgroundColor: '#FFFFFF',
      borderColor: BORDER_CARD,
      borderWidth: 1,
      textStyle: { color: '#2B2620', fontSize: 12 },
      formatter: (params) => {
        const val = params.data[2];
        const m = months[params.data[0]] || params.data[0];
        const c = categories[params.data[1]] || params.data[1];
        return `${c} / ${m}: ${val}`;
      }
    },
    grid: { left: '6%', right: '6%', bottom: '8%', top: '12%' },
    xAxis: {
      type: 'category',
      data: months,
      axisLine: { lineStyle: { color: BORDER_CARD } },
      axisTick: { lineStyle: { color: BORDER_CARD } },
      axisLabel: { color: TEXT_SECONDARY, fontSize: 11 }
    },
    yAxis: {
      type: 'category',
      data: categories,
      axisLine: { lineStyle: { color: BORDER_CARD } },
      axisTick: { lineStyle: { color: BORDER_CARD } },
      axisLabel: { color: TEXT_SECONDARY, fontSize: 11 }
    },
    visualMap: {
      min: 0,
      max: 100,
      calculable: false,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      // Monochrome ramp: bg-page → border-card → chart-accent
      inRange: { color: ['#F1EBE3', '#D4C8B8', CHART_ACCENT] },
      textStyle: { color: TEXT_SECONDARY }
    },
    series: [{
      name: 'Performance',
      type: 'heatmap',
      data: data,
      label: { show: false },
      emphasis: { itemStyle: { borderColor: CHART_ACCENT, borderWidth: 1 } }
    }],
    backgroundColor: 'transparent'
  };

  return (
    <div className="bg-bg-card p-4 rounded-2xl border border-border-card shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-text-primary">Product Performance Heatmap</h4>
        <div className="text-xs text-text-secondary">Category × Month</div>
      </div>
      <ReactECharts option={option} style={{ height: 240, width: '100%' }} />
    </div>
  );
};

export default ProductHeatmap;
