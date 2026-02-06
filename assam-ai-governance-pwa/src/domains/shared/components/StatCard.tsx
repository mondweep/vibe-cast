import './StatCard.css';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function StatCard({ label, value, subtitle, trend, trendLabel, variant = 'default' }: StatCardProps) {
  const trendArrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';

  return (
    <div className={`stat-card stat-card--${variant}`} role="group" aria-label={label}>
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{value}</span>
      {subtitle && <span className="stat-card__subtitle">{subtitle}</span>}
      {trend && trendLabel && (
        <span className={`stat-card__trend stat-card__trend--${trend}`} aria-label={`Trend: ${trendLabel}`}>
          <span aria-hidden="true">{trendArrow}</span> {trendLabel}
        </span>
      )}
    </div>
  );
}
