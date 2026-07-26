const fs = require('fs');
let code = fs.readFileSync('src/pages/sales.tsx', 'utf8');

const replacementStr = `    onError: (err: Error) => {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
      setStatusTarget(null);
    },
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['sales'] });
    void queryClient.invalidateQueries({ queryKey: ['sales-statistics'] });
    void queryClient.invalidateQueries({ queryKey: ['dos-for-invoice'] });
  }, [queryClient]);

  const stats = statsQuery.data?.data;
  const list  = salesQuery.data;

  return (
    <div className="space-y-6">`;

code = code.replace(`    onError: (err: Error) => {
  return (
    <div className="space-y-6">`, replacementStr);

fs.writeFileSync('src/pages/sales.tsx', code);
console.log('Restored');
