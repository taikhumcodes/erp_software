const fs = require('fs');
let code = fs.readFileSync('src/pages/sales.tsx', 'utf8');

const target = `              </TableRow>
                  <TableRow key={sale.id}>`;

const replacement = `            </TableHeader>
            <TableBody>
              {salesQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 11 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : salesQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-12 text-center text-destructive">
                    {t('no_records')}
                  </TableCell>
                </TableRow>
              ) : !list?.data?.length ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-12 text-center text-muted-foreground">
                    {debouncedSearch ? t('sale_no_results') : t('sale_empty')}
                  </TableCell>
                </TableRow>
              ) : (
                list.data.map(sale => (
                  <TableRow key={sale.id}>`;

code = code.replace(target, replacement);

fs.writeFileSync('src/pages/sales.tsx', code);
console.log('Fixed TableBody');
