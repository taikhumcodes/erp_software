import React from 'react';
import { formatKWD } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { CompanyHeader } from './CompanyHeader';

interface OutstandingInvoicePdfProps {
  customer: any;
  sales: any[];
  company: any;
}

export const OutstandingInvoicePdf = React.forwardRef<HTMLDivElement, OutstandingInvoicePdfProps>(
  ({ customer, sales, company }, ref) => {
    if (!customer || !sales || !company) return null;

    const outstanding = sales
      .filter((s) => parseFloat(s.outstandingAmount) > 0)
      .sort((a, b) => new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime());

    if (outstanding.length === 0) return <div ref={ref} id="outstanding-invoice-pdf" style={{ display: 'none' }} />;

    const fromDate = outstanding[0]?.saleDate;
    const toDate = outstanding[outstanding.length - 1]?.saleDate;
    
    let totalBillAmount = 0;
    let totalPaid = 0;
    let totalBalance = 0;

    let runningTotalBalance = 0;
    const today = new Date();

    return (
      <div style={{ position: 'fixed', top: 0, left: '-9999px', zIndex: -1000 }}>
        <div 
          ref={ref} 
          id="outstanding-invoice-pdf"
          className="p-8" 
          style={{ width: '210mm', minHeight: '297mm', backgroundColor: '#ffffff', color: '#000000' }}
        >
          <CompanyHeader company={company} />
          
          <div className="text-center mb-8">
            <h2 className="text-lg font-bold mb-8">Outstanding Invoice</h2>
          </div>

          <div className="mb-6">
            <div className="text-base mb-4">
              Account: <span className="font-bold">{customer.name}</span>
            </div>
            
            <div className="flex gap-8 text-sm">
              <div>From: <span className="font-bold">{fromDate ? format(new Date(fromDate), 'dd/MM/yyyy') : '-'}</span></div>
              <div>To: <span className="font-bold">{toDate ? format(new Date(toDate), 'dd/MM/yyyy') : '-'}</span></div>
            </div>
          </div>

          <table className="w-full text-xs text-center border-collapse border" style={{ borderColor: '#d1d5db' }}>
            <thead>
              <tr style={{ backgroundColor: '#e5e7eb' }}>
                <th className="border p-2" style={{ borderColor: '#d1d5db' }}>Sr</th>
                <th className="border p-2" style={{ borderColor: '#d1d5db' }}>Date</th>
                <th className="border p-2" style={{ borderColor: '#d1d5db' }}>Do. No.</th>
                <th className="border p-2" style={{ borderColor: '#d1d5db' }}>Invoice No.</th>
                <th className="border p-2" style={{ borderColor: '#d1d5db' }}>LPO</th>
                <th className="border p-2 text-right" style={{ borderColor: '#d1d5db' }}>Bill Amount</th>
                <th className="border p-2 text-right" style={{ borderColor: '#d1d5db' }}>Paid</th>
                <th className="border p-2 text-right" style={{ borderColor: '#d1d5db' }}>Balance</th>
                <th className="border p-2 text-right" style={{ borderColor: '#d1d5db' }}>Total Balance</th>
                <th className="border p-2" style={{ borderColor: '#d1d5db' }}>Aging Days</th>
              </tr>
            </thead>
            <tbody>
              {outstanding.map((sale, index) => {
                const billAmt = parseFloat(sale.netAmount);
                const paid = parseFloat(sale.paidAmount);
                const balance = parseFloat(sale.outstandingAmount);
                runningTotalBalance += balance;

                totalBillAmount += billAmt;
                totalPaid += paid;
                totalBalance += balance;

                const days = differenceInDays(today, new Date(sale.saleDate));

                return (
                  <tr key={sale.id}>
                    <td className="border p-2" style={{ borderColor: '#d1d5db' }}>{index + 1}</td>
                    <td className="border p-2" style={{ borderColor: '#d1d5db' }}>{format(new Date(sale.saleDate), 'dd-MM-yyyy')}</td>
                    <td className="border p-2" style={{ borderColor: '#d1d5db' }}>{sale.deliveryOrder?.number || '-'}</td>
                    <td className="border p-2" style={{ borderColor: '#d1d5db' }}>{sale.number}</td>
                    <td className="border p-2" style={{ borderColor: '#d1d5db' }}>{sale.customerPONumber || '-'}</td>
                    <td className="border p-2 text-right" style={{ borderColor: '#d1d5db' }}>{billAmt.toFixed(3)}</td>
                    <td className="border p-2 text-right" style={{ borderColor: '#d1d5db' }}>{paid.toFixed(3)}</td>
                    <td className="border p-2 text-right" style={{ borderColor: '#d1d5db' }}>{balance.toFixed(3)}</td>
                    <td className="border p-2 text-right" style={{ borderColor: '#d1d5db' }}>{runningTotalBalance.toFixed(3)}</td>
                    <td className="border p-2" style={{ borderColor: '#d1d5db' }}>{days}</td>
                  </tr>
                );
              })}
              <tr className="font-bold">
                <td className="border p-2 text-left" colSpan={5} style={{ borderColor: '#d1d5db' }}>Total</td>
                <td className="border p-2 text-right" style={{ borderColor: '#d1d5db' }}>{totalBillAmount.toFixed(3)}</td>
                <td className="border p-2 text-right" style={{ borderColor: '#d1d5db' }}>{totalPaid.toFixed(3)}</td>
                <td className="border p-2 text-right" style={{ borderColor: '#d1d5db' }}>{totalBalance.toFixed(3)}</td>
                <td className="border p-2 text-right" style={{ borderColor: '#d1d5db' }}>{totalBalance.toFixed(3)}</td>
                <td className="border p-2" style={{ borderColor: '#d1d5db' }}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }
);
OutstandingInvoicePdf.displayName = 'OutstandingInvoicePdf';
