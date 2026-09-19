import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface ScoreBadgeProps {
  score: number; // 0 to 5
  total?: number; // default 5
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function ScoreBadge({ score, total = 5, size = 'md', showLabel = true }: ScoreBadgeProps) {
  let colorStyle = '';
  let Icon = CheckCircle2;
  let labelText = 'Compliant';

  if (score >= 4) {
    colorStyle = 'bg-green-100 text-[#16A34A] border-green-300';
    Icon = CheckCircle2;
    labelText = score === 5 ? 'Fully Compliant' : 'Compliant';
  } else if (score >= 2) {
    colorStyle = 'bg-amber-100 text-[#D97706] border-amber-300';
    Icon = AlertTriangle;
    labelText = 'Partially Compliant';
  } else {
    colorStyle = 'bg-red-100 text-[#DC2626] border-red-300';
    Icon = XCircle;
    labelText = 'Non-Compliant';
  }

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs space-x-1.5 border',
    md: 'px-3.5 py-1.5 text-sm space-x-2 border font-medium',
    lg: 'px-5 py-2 text-lg space-x-3 border-2 font-bold shadow-sm',
  }[size];

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
  }[size];

  return (
    <div className={`inline-flex items-center rounded-full font-semibold transition-colors ${colorStyle} ${sizeClasses}`}>
      <Icon className={`${iconSizes} shrink-0`} />
      <span>
        {score} / {total} {showLabel ? labelText : 'Compliant'}
      </span>
    </div>
  );
}
