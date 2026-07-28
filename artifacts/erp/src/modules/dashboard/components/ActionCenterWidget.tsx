import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ActionCenterWidgetProps {
  data: any;
  isLoading: boolean;
}

export const ActionCenterWidget: React.FC<ActionCenterWidgetProps> = ({ data, isLoading }) => {
  if (isLoading || !data) {
    return <div className="animate-pulse h-64 bg-muted rounded-xl w-full" />;
  }

  const { alerts, recentActivity } = data;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center text-red-600">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Action Center
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No urgent actions required.</p>
            ) : (
              alerts.map((alert: any, idx: number) => (
                <div key={idx} className="flex items-start justify-between p-3 border rounded-lg bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30">
                  <div className="flex items-center">
                    <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                    <span className="text-sm font-medium">{alert.message}</span>
                  </div>
                  <Badge variant={alert.severity === 'Critical' ? 'destructive' : 'secondary'}>
                    {alert.severity}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <Info className="w-5 h-5 mr-2" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((act: any) => (
              <div key={act.id} className="flex flex-col border-b last:border-0 pb-3 last:pb-0">
                <span className="text-sm font-medium">{act.description}</span>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{act.user} - {act.entity}</span>
                  <span>{new Date(act.time).toLocaleString()}</span>
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
