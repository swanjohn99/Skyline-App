import { useMemo, useState, Suspense, lazy } from 'react';
import { getIncomePieSegments } from '../utils/financialBreakdown';
import { formatCurrency } from '../utils/format';
import './FinancialBreakdownChart.css';

const FinancialBreakdownPie3D = lazy(() => import('./FinancialBreakdownPie3D'));

function formatPercent(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Math.abs(value).toFixed(1)}%`;
}

export default function FinancialBreakdownChart({ expenses, income, title = 'Financial breakdown' }) {
  const [hovered, setHovered] = useState(null);
  const pieData = useMemo(
    () => getIncomePieSegments(expenses, income),
    [expenses, income],
  );

  if (!pieData.hasData) {
    return (
      <div className="financial-breakdown chart-card">
        <h3 className="chart-card-title">{title}</h3>
        <p className="financial-breakdown-empty">No income or expenses recorded yet.</p>
      </div>
    );
  }

  const { segments, received, profit, profitPercent, lossMode, noIncome } = pieData;
  const activeSegment = hovered ?? segments.find((s) => s.amount > 0) ?? segments[0];

  return (
    <div className="financial-breakdown chart-card">
      <h3 className="chart-card-title">{title}</h3>
      <p className="financial-breakdown-hint">Drag to rotate · hover a slice for details</p>

      <div className="financial-breakdown-3d-layout">
        <Suspense fallback={<div className="financial-breakdown-canvas financial-breakdown-canvas--loading">Loading chart…</div>}>
          <FinancialBreakdownPie3D
            segments={segments}
            received={received}
            onHover={setHovered}
          />
        </Suspense>

        <div className="financial-breakdown-tooltip">
          {activeSegment ? (
            <>
              <span
                className="financial-breakdown-tooltip-swatch"
                style={{ backgroundColor: activeSegment.color }}
              />
              <div>
                <p className="financial-breakdown-tooltip-label">{activeSegment.label}</p>
                <p className="financial-breakdown-tooltip-value">{formatCurrency(activeSegment.amount)}</p>
                <p className="financial-breakdown-tooltip-percent">
                  {noIncome
                    ? `${formatPercent(activeSegment.anglePercent)} of spend`
                    : `${formatPercent(activeSegment.incomePercent ?? activeSegment.anglePercent)} of income`}
                </p>
              </div>
            </>
          ) : (
            <p className="financial-breakdown-tooltip-label">Hover a slice</p>
          )}
        </div>
      </div>

      <ul className="financial-breakdown-legend">
        {segments.map((segment) => (
          <li key={segment.key}>
            <span className="financial-breakdown-swatch" style={{ backgroundColor: segment.color }} />
            <span className="financial-breakdown-legend-label">{segment.label}</span>
            <span className="financial-breakdown-legend-value">{formatCurrency(segment.amount)}</span>
            <span className="financial-breakdown-legend-percent">
              {noIncome
                ? formatPercent(segment.anglePercent)
                : formatPercent(segment.incomePercent ?? segment.anglePercent)}
            </span>
          </li>
        ))}
        {received > 0 && profit > 0 && !segments.some((s) => s.key === 'profit') && (
          <li>
            <span className="financial-breakdown-swatch" style={{ backgroundColor: '#10b981' }} />
            <span className="financial-breakdown-legend-label">Profit</span>
            <span className="financial-breakdown-legend-value">{formatCurrency(profit)}</span>
            <span className="financial-breakdown-legend-percent">{formatPercent(profitPercent)}</span>
          </li>
        )}
      </ul>

      {lossMode && (
        <p className="financial-breakdown-loss-note">
          Loss: expenses exceed income by {formatCurrency(Math.abs(profit))} ({formatPercent(profitPercent)} of income). Chart shows expense split.
        </p>
      )}

      {noIncome && pieData.totalExpenses > 0 && (
        <p className="financial-breakdown-loss-note financial-breakdown-loss-note--muted">
          No income recorded — slices show % of total spend.
        </p>
      )}
    </div>
  );
}
