import React from 'react';
import { AreaChart as RechartsAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const AreaChart = ({ data, xKey, yKeys = [], title, colors = ['#ff4d4f', '#1890ff', '#52c41a'], height = 300 }) => {
  return (
    <div style={{ width: '100%', height: height }}>
      {title && (
        <h4 style={{ 
          fontSize: 'var(--admin-font-size-lg)', 
          fontWeight: 'var(--admin-font-weight-semibold)',
          marginBottom: 'var(--admin-space-md)',
          color: 'var(--admin-text-primary)'
        }}>
          {title}
        </h4>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart 
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <defs>
            {yKeys.map((key, index) => (
              <linearGradient key={key} id={`color${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[index % colors.length]} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={colors[index % colors.length]} stopOpacity={0}/>
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey={xKey} 
            tick={{ fill: '#8c8c8c', fontSize: 12 }}
            stroke="#d9d9d9"
          />
          <YAxis 
            tick={{ fill: '#8c8c8c', fontSize: 12 }}
            stroke="#d9d9d9"
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #d9d9d9',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '10px' }}
            iconType="circle"
          />
          {yKeys.map((key, index) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[index % colors.length]}
              fillOpacity={1}
              fill={`url(#color${key})`}
              name={key}
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AreaChart;
