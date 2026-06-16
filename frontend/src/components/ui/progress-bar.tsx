interface Props {
  current: number;
  total: number;
  labels?: string[];
}

export function ProgressBar({ current, total, labels }: Props) {
  const pct = total > 0 ? Math.round(((current + 1) / total) * 100) : 0;

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-primary/60 mb-1">
        <span>
          Step {current + 1} of {total}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-2 bg-primary/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      {labels && labels[current] && (
        <p className="text-sm font-semibold text-primary mt-1">{labels[current]}</p>
      )}
    </div>
  );
}
