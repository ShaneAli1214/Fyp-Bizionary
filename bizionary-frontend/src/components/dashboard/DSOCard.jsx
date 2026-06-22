import React from 'react';
import ReactECharts from 'echarts-for-react';

const CHART_ACCENT = '#B7A893';
const CHART_TRACK  = '#E8E0D3';
const TEXT_PRIMARY   = '#2B2620';
const TEXT_SECONDARY = '#9C9387';

const DSOCard = ({ value = 45, history = [42, 44, 46, 48, 45, 43] }) => {
  const gaugeOpt = {
    tooltip: { formatter: '{a} <br/>{c} days' },
    series: [{
      name: 'DSO',
      type: 'gauge',
      startAngle: 210,
      endAngle: -30,
      min: 0,
      max: 90,
      // Filled arc — single flat chart-accent, no gradient/multi-color
      progress: {
        show: true,
        width: 10,
        itemStyle: { color: CHART_ACCENT }
      },
      // Unfilled track — chart-track, single color
      axisLine: {
        lineStyle: { width: 10, color: [[1, CHART_TRACK]] }
      },
      // Needle/pointer — chart-accent
      pointer: {
        show: true,
        width: 3,
        length: '58%',
        itemStyle: { color: CHART_ACCENT }
      },
      // Needle hub pin
      anchor: {
        show: true,
        size: 8,
        itemStyle: { color: CHART_ACCENT, borderColor: CHART_TRACK, borderWidth: 2 }
      },
      axisTick:  { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      // Large bold value — text-primary
      detail: {
        valueAnimation: true,
        formatter: '{value}',
        color: TEXT_PRIMARY,
        fontSize: 20,
        fontWeight: 'bold',
        offsetCenter: [0, '55%']
      },
      // Label underneath — text-secondary
      title: {
        offsetCenter: [0, '80%'],
        fontSize: 10,
        color: TEXT_SECONDARY,
        fontWeight: 'normal'
      },
      data: [{ value, name: 'days' }]
    }],
    backgroundColor: 'transparent'
  };

  const sparkOpt = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', show: false, data: history.map((_, i) => i) },
    yAxis: { show: false, type: 'value' },
    series: [{
      type: 'line',
      data: history,
      smooth: true,
      lineStyle: { color: CHART_ACCENT, width: 2 },
      areaStyle: { color: 'rgba(183,168,147,0.2)' },
      itemStyle: { color: CHART_ACCENT }
    }],
    backgroundColor: 'transparent'
  };

  return (
    <div className="bg-bg-card p-4 rounded-2xl border border-border-card shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-text-primary">Days Sales Outstanding</h4>
        <div className="text-xs text-text-secondary">Current</div>
      </div>

      <div className="flex items-center gap-3">
        {/* Speedometer gauge */}
        <div style={{ width: 150, height: 130, flexShrink: 0 }}>
          <ReactECharts option={gaugeOpt} style={{ width: 150, height: 130 }} />
        </div>

        {/* Numeric readout + sparkline */}
        <div className="flex-1 min-w-0">
          <div className="text-2xl font-bold text-text-primary leading-none">
            {value}
          </div>
          <div className="text-sm text-text-secondary mt-0.5">days outstanding</div>
          <div className="text-xs text-text-secondary mt-3 mb-1">30-day trend</div>
          <div style={{ height: 56 }}>
            <ReactECharts option={sparkOpt} style={{ height: 56, width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DSOCard;
