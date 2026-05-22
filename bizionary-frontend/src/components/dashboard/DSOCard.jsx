import React from 'react';
import ReactECharts from 'echarts-for-react';

const DSOCard = ({ value = 45, history = [42,44,46,48,45,43] }) => {
  const gaugeOpt = {
    tooltip: { formatter: '{a} <br/>{c} days' },
    series: [{
      name: 'DSO',
      type: 'gauge',
      startAngle: 200,
      endAngle: -20,
      progress: { show: true, width: 14, itemStyle:{color:'#0A6ED1'} },
      axisLine: { lineStyle: { width: 14, color: [[0.5,'#34d399'],[0.8,'#f59e0b'],[1,'#ef4444']] } },
      pointer: { show:false },
      axisTick: { show: false },
      splitLine: { show:false },
      axisLabel: { show:false },
      detail: { valueAnimation:true, formatter: '{value} days', color:'#0f172a', fontSize:14 },
      data: [{ value: value }]
    }],
    backgroundColor: 'transparent'
  };

  const sparkOpt = {
    tooltip:{trigger:'axis'},
    xAxis:{type:'category',show:false,data:history.map((_,i)=>i)},
    yAxis:{show:false,type:'value'},
    series:[{type:'line',data:history,smooth:true,lineStyle:{color:'#0A6ED1',width:2},areaStyle:{color:'rgba(10,110,209,0.12)'}}],
    backgroundColor:'transparent'
  };

  return (
    <div className="bg-surface p-4 rounded-xl border border-surface/10 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-textMain">Days Sales Outstanding (DSO)</h4>
        <div className="text-xs text-textMuted">Current</div>
      </div>

      <div className="flex items-center gap-4">
        <div style={{width:120,height:100}}>
          <ReactECharts option={gaugeOpt} style={{width:120,height:100}} />
        </div>
        <div className="flex-1">
          <div className="text-2xl font-bold text-textMain">{value} <span className="text-sm text-textMuted">days</span></div>
          <div className="text-sm text-textMuted mt-1">30-day trend</div>
          <div style={{height:64}}><ReactECharts option={sparkOpt} style={{height:64,width:'100%'}} /></div>
        </div>
      </div>
    </div>
  );
};

export default DSOCard;
