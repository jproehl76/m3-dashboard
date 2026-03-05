export const CHART_MARGINS = { top: 8, right: 8, bottom: 24, left: 48 };
export const CHART_MARGINS_MOBILE = { top: 4, right: 4, bottom: 20, left: 40 };

export const AXIS_STYLE = {
  tick: { fill: '#606070', fontSize: 10, fontFamily: 'JetBrains Mono' },
  axisLine: { stroke: '#2E2E3C' },
  tickLine: { stroke: '#2E2E3C' },
};

export const GRID_STYLE = {
  stroke: '#1E1E28',
  strokeDasharray: 'none' as const,
  vertical: false,
};

export const TOOLTIP_STYLE = {
  backgroundColor: '#242430',
  border: '1px solid #38384A',
  borderRadius: '8px',
  padding: '8px 12px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  fontFamily: 'JetBrains Mono',
  fontSize: '12px',
  color: '#E8E8F0',
};

export const CHANNEL_COLORS = {
  speed:    '#3B82F6',
  brake:    '#EF4444',
  throttle: '#22C55E',
  rpm:      '#F97316',
  gear:     '#A855F7',
  steering: '#06B6D4',
  latg:     '#EC4899',
  longg:    '#EAB308',
};

// Session colors (existing palette — keep consistent)
export const SESSION_COLORS = ['#2563EB','#D97706','#059669','#DC2626','#7C3AED','#0891B2'];
