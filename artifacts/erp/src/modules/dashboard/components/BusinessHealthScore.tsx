import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, ShieldAlert, HeartPulse } from 'lucide-react';

interface BusinessHealthScoreProps {
  data: any;
  isLoading: boolean;
}

export const BusinessHealthScore: React.FC<BusinessHealthScoreProps> = ({ data, isLoading }) => {
  if (isLoading || !data) {
    return <div className="animate-pulse h-48 bg-muted rounded-xl w-full" />;
  }

  const { score, status, insights } = data;

  return (
    <Card className={`border-2 ${status === 'Healthy' ? 'border-green-200 dark:border-green-900/50' : status === 'Average' ? 'border-yellow-200' : 'border-red-200'}`}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center">
          <HeartPulse className="w-5 h-5 mr-2 text-primary" />
          Business Health Score
        </CardTitle>
        <div className="flex text-2xl font-bold">
          {score}%
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center mb-4">
          {status === 'Healthy' ? (
            <ShieldCheck className="w-8 h-8 text-green-500 mr-3" />
          ) : (
            <ShieldAlert className={`w-8 h-8 mr-3 ${status === 'Average' ? 'text-yellow-500' : 'text-red-500'}`} />
          )}
          <div>
            <h4 className="font-semibold text-lg">{status}</h4>
            <p className="text-sm text-muted-foreground">Based on cash flow, inventory, and receivables</p>
          </div>
        </div>
        <div className="space-y-2">
          <h5 className="text-sm font-semibold mb-2">AI Insights:</h5>
          <ul className="space-y-1">
            {insights.map((insight: string, idx: number) => (
              <li key={idx} className="text-sm flex items-start">
                <span className="text-primary mr-2">•</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
