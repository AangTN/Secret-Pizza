import React from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const BarChart = ({ data, xKey, yKey, title, color = '#ff4d4f', height = 300 }) => {
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
        <RechartsBarChart 
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
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
            cursor={{ fill: 'rgba(255, 77, 79, 0.1)' }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '10px' }}
            iconType="circle"
          />
          <Bar 
            dataKey={yKey} 
            fill={color}
            radius={[8, 8, 0, 0]}
            name={yKey}
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarChart;
