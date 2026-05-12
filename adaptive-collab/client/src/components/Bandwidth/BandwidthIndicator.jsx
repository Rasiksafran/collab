const palette = {
  high: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  medium: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  low: 'border-rose-400/30 bg-rose-500/10 text-rose-200 animate-pulse',
};

const labelMap = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export default function BandwidthIndicator({ level = 'high' }) {
  return (
    <div className={`rounded-full border px-4 py-2 text-sm font-medium ${palette[level] || palette.high}`} title={level === 'low' ? 'Mic auto-muted' : 'Connection health'}>
      {level === 'high' ? '🟢' : level === 'medium' ? '🟡' : '🔴'} {labelMap[level] || 'High'} {level === 'low' ? 'Mic auto-muted' : ''}
    </div>
  );
}
