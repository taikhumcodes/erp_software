const fs = require('fs');
const file = 'src/pages/sales.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = `                    </TableCell>
                    <TableCell>{sale.customer.name}</TableCell>
                    <TableCell>{new Date(sale.saleDate).toLocaleDateString()}</TableCell>
                            <DropdownMenuSeparator />`;

const replacement = `                    </TableCell>
                    <TableCell>{sale.customer.name}</TableCell>
                    <TableCell>{new Date(sale.saleDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {t('sale_items_count', { count: sale.itemCount })}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end font-mono">
                      {formatKWD(sale.netAmount)}
                    </TableCell>
                    <TableCell className="text-end font-mono text-green-600">
                      {formatKWD(sale.paidAmount)}
                    </TableCell>
                    <TableCell className="text-end font-mono text-destructive">
                      {formatKWD(sale.outstandingAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[sale.status]}>
                        {t(\`status_\${sale.status.toLowerCase()}\`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={PAYMENT_STATUS_COLORS[sale.paymentStatus]}>
                        {t(\`payment_status_\${sale.paymentStatus.toLowerCase()}\`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewTargetId(sale.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              {t('view_sale')}
                            </DropdownMenuItem>

                            {sale.status === 'DRAFT' && (
                              <DropdownMenuItem onClick={() => setStatusTarget({ id: sale.id, newStatus: 'CONFIRMED' })}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                {t('confirm_sale')}
                              </DropdownMenuItem>
                            )}
                            
                            {sale.status === 'CONFIRMED' && (
                              <DropdownMenuItem onClick={() => setStatusTarget({ id: sale.id, newStatus: 'DELIVERED' })}>
                                <PackageCheck className="mr-2 h-4 w-4" />
                                {t('deliver_sale')}
                              </DropdownMenuItem>
                            )}

                            {sale.status !== 'CANCELLED' && (
                              <DropdownMenuItem onClick={() => setEditTargetId(sale.id)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                {t('edit')}
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code);
  console.log('Restored table body!');
} else {
  console.log('Target not found! ' + target.substring(0, 100));
}
