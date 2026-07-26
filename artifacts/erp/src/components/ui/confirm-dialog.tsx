import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { Loader2, AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmText?: string;
  variant?: 'default' | 'destructive';
  loading?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
  onOpenChange?: (open: boolean) => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmText,
  variant = 'default',
  loading,
  onConfirm,
  onCancel,
  onOpenChange,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && (onCancel ? onCancel() : onOpenChange && onOpenChange(false))}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="mt-1">{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={() => onCancel ? onCancel() : onOpenChange && onOpenChange(false)}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent transition-colors disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 disabled:opacity-50 ${
              variant === 'destructive' 
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmText ?? confirmLabel ?? t('delete')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
