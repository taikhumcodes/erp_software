import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type StatusBadgeType = 'operational' | 'financial';

export interface StatusBadgeProps {
  status: string;
  type: StatusBadgeType;
  translationKey: string;
  colorMap: Record<string, string>;
  className?: string;
}

export function StatusBadge({ status, type, translationKey, colorMap, className }: StatusBadgeProps) {
  const { t } = useTranslation();

  return (
    <Badge
      variant="outline"
      aria-label={`${type} status`}
      className={cn(colorMap[status], className)}
    >
      {t(translationKey)}
    </Badge>
  );
}
