import React from 'react';
import ReactECharts from 'echarts-for-react';

const ProductHeatmap = ({ categories = ['Electronics','Grocery','Clothing','Auto','Pharma'], months = ['Jan','Feb','Mar','Apr','May','Jun'], matrix }) => {
  const data = matrix || categories.flatMap((cat,y)=> months.map((m,x)=> [x,y, Math.round(Math.random()*100)]));

  const option = {
    tooltip: { position: 'top', formatter: (params) => {
      const val = params.data[2];
      const m = months[params.data[0]] || params.data[0];
      const c = categories[params.data[1]] || params.data[1];
      return `${c} / ${m}: ${val}`;
    } },
    grid: { left: '6%', right: '6%', bottom: '8%', top: '12%' },
    xAxis: { type: 'category', data: months, axisLine:{lineStyle:{color:'#cbd5e1'}} },
    yAxis: { type: 'category', data: categories, axisLine:{lineStyle:{color:'#cbd5e1'}} },
    visualMap: { min: 0, max: 100, calculable: false, orient: 'horizontal', left: 'center', bottom: 0, inRange: { color: ['#f0f9ff','#7dd3fc','#0A6ED1'] } },
    series: [{
      name: 'Performance',
      type: 'heatmap',
      data: data,
      label: { show: false },
      emphasis: { itemStyle: { borderColor: '#333', borderWidth: 1 } }
    }],
    backgroundColor: 'transparent'
  };

  return (
    <div className="bg-surface p-4 rounded-xl border border-surface/10 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-textMain">Product Performance Heatmap</h4>
        <div className="text-xs text-textMuted">Category × Month</div>
      </div>
      <ReactECharts option={option} style={{height:240,width:'100%'}} />
    </div>
  );
};

export default ProductHeatmap;
