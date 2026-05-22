import React from 'react';
import ReactECharts from 'echarts-for-react';

const InventoryTurnover = ({ data }) => {
  const categories = data?.categories || ['Electronics','Grocery','Clothing','Auto','Pharma'];
  const turnover = data?.turnover || [8,6,4,5,3];
  const moving = data?.moving || [6,6.5,5,4.8,4.2];

  const option = {
    tooltip: { trigger: 'axis', formatter: (params) => {
      const p = params[0];
      const mv = params.find(s=>s.seriesName==='Moving avg');
      const label = p ? `${p.axisValue}<br/>Turnover: ${p.data}` : '';
      const mvLabel = mv ? `<br/>Moving avg: ${mv.data}` : '';
      return label + mvLabel;
    } },
    legend: { right: 10, top: 6, textStyle:{color:'#0f172a'} },
    xAxis: { type: 'category', data: categories, axisLine:{lineStyle:{color:'#cbd5e1'}}, axisTick:{alignWithLabel:true} },
    yAxis: { type: 'value', name: 'Turns', axisLine:{lineStyle:{color:'#cbd5e1'}}, splitLine:{lineStyle:{color:'#eef2f7'}} },
    grid: { left: '6%', right: '6%', bottom: '8%', top: '28%' },
    series: [
      { name: 'Turnover', type: 'bar', data: turnover, itemStyle:{color:'#0A6ED1'}, barWidth:'44%', label:{show:true, position:'top', formatter:'{c}'} },
      { name: 'Moving avg', type: 'line', data: moving, smooth:true, lineStyle:{color:'#7e63ff',width:2}, symbol:'circle', symbolSize:6 }
    ],
    backgroundColor: 'transparent'
  };

  return (
    <div className="bg-surface p-4 rounded-xl border border-surface/10 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-textMain">Inventory Turnover</h4>
        <div className="text-xs text-textMuted">Last 6 months</div>
      </div>
      <ReactECharts option={option} style={{ height: 220, width: '100%' }} />
    </div>
  );
};

export default InventoryTurnover;
