import React from 'react';
import { Phone, Mail, Globe } from 'lucide-react';

export interface OutstandingInvoiceRow {
  sr: number;
  date: string; // DD-MM-YYYY
  doNo: string;
  invoiceNo: string;
  lpo: string;
  billAmount: number;
  paid: number;
  balance: number;
  totalBalance: number;
  agingDays: number;
}

export interface OutstandingInvoiceTemplateProps {
  customerName: string;
  fromDate: string;
  toDate: string;
  rows: OutstandingInvoiceRow[];
  totals: {
    billAmount: number;
    paid: number;
    balance: number;
    totalBalance: number;
  };
  logoUrl?: string;
}

export const OutstandingInvoiceTemplate: React.FC<OutstandingInvoiceTemplateProps> = ({
  customerName,
  fromDate,
  toDate,
  rows,
  totals,
  logoUrl,
}) => {
  const accentGold = '#D4AF37';

  return (
    <div
      id="outstanding-invoice-print-root"
      style={{
        width: '100%',
        maxWidth: '820px',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        color: '#1e293b',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        padding: '36px 40px',
        boxSizing: 'border-box',
      }}
    >
      {/* ── 1. Company Letterhead Header ────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          paddingBottom: '20px',
        }}
      >
        {/* Left Column: English Info */}
        <div style={{ flex: '1', textAlign: 'left' }}>
          <h2
            style={{
              margin: 0,
              fontSize: '15px',
              fontWeight: 800,
              lineHeight: 1.25,
              letterSpacing: '0.2px',
              color: '#000000',
              textTransform: 'uppercase',
            }}
          >
            SHEILD MAX WHOLESALE<br />&amp; RETAIL CO
          </h2>
          <div
            style={{
              marginTop: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontSize: '10.5px',
              color: '#334155',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={11} style={{ color: accentGold, flexShrink: 0 }} />
              <span>+965 6078 5178</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={11} style={{ color: accentGold, flexShrink: 0 }} />
              <span>Info@shieldmaxsafetykw.com</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={11} style={{ color: accentGold, flexShrink: 0 }} />
              <span>www.sheildmaxsafetykw.com</span>
            </div>
          </div>
        </div>

        {/* Center Column: Logo */}
        <div
          style={{
            flex: '0 0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Shield Max Logo"
              style={{ height: '95px', maxWidth: '220px', objectFit: 'contain' }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100px',
                height: '95px',
              }}
            >
              {/* Fallback clean Shield Max logo mark */}
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '12px',
                  backgroundColor: '#0f172a',
                  border: `2px solid ${accentGold}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: accentGold,
                  fontWeight: 900,
                  fontSize: '24px',
                }}
              >
                SM
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '1px',
                  color: '#0f172a',
                  marginTop: '4px',
                }}
              >
                SHIELD MAX
              </span>
            </div>
          )}
        </div>

        {/* Right Column: Arabic Info */}
        <div style={{ flex: '1', textAlign: 'right', direction: 'rtl' }}>
          <h2
            style={{
              margin: 0,
              fontSize: '15px',
              fontWeight: 800,
              lineHeight: 1.25,
              color: '#000000',
              fontFamily: '"IBM Plex Sans Arabic", "Noto Sans Arabic", sans-serif',
            }}
          >
            درع ماكس لتجارة الجملة والتجزئة
          </h2>
          <div
            style={{
              marginTop: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontSize: '10.5px',
              color: '#334155',
              alignItems: 'flex-start',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', direction: 'ltr' }}>
              <span>+965 6078 5178</span>
              <Phone size={11} style={{ color: accentGold, flexShrink: 0 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', direction: 'ltr' }}>
              <span>Info@shieldmaxsafetykw.com</span>
              <Mail size={11} style={{ color: accentGold, flexShrink: 0 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', direction: 'ltr' }}>
              <span>www.sheildmaxsafetykw.com</span>
              <Globe size={11} style={{ color: accentGold, flexShrink: 0 }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Gold Divider Line ────────────────────────────────────────────── */}
      <div
        style={{
          height: '2.5px',
          backgroundColor: accentGold,
          width: '100%',
          marginBottom: '24px',
        }}
      />

      {/* ── 3. Document Title ──────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1
          style={{
            margin: 0,
            fontSize: '19px',
            fontWeight: 800,
            color: '#000000',
            letterSpacing: '0.2px',
          }}
        >
          Outstanding Invoice
        </h1>
      </div>

      {/* ── 4. Account & Date Range Info ───────────────────────────────────── */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '13px', color: '#0f172a' }}>
          <span>Account: </span>
          <strong style={{ fontWeight: 700 }}>{customerName}</strong>
        </div>

        <div style={{ fontSize: '13px', color: '#0f172a', marginTop: '6px' }}>
          <span>From: </span>
          <strong style={{ fontWeight: 700 }}>{fromDate}</strong>
          <span style={{ margin: '0 28px' }} />
          <span>To: </span>
          <strong style={{ fontWeight: 700 }}>{toDate}</strong>
        </div>
      </div>

      {/* ── 5. Invoices Statement Table ────────────────────────────────────── */}
      <div style={{ width: '100%', overflow: 'hidden' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '11px',
            textAlign: 'center',
            border: '1px solid #cbd5e1',
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: '#e8edf3',
                color: '#0f172a',
                borderBottom: '1px solid #cbd5e1',
                height: '32px',
              }}
            >
              <th style={{ padding: '6px 4px', fontWeight: 700, borderRight: '1px solid #cbd5e1', width: '36px' }}>Sr</th>
              <th style={{ padding: '6px 6px', fontWeight: 700, borderRight: '1px solid #cbd5e1', width: '85px' }}>Date</th>
              <th style={{ padding: '6px 6px', fontWeight: 700, borderRight: '1px solid #cbd5e1', width: '70px' }}>Do. No.</th>
              <th style={{ padding: '6px 8px', fontWeight: 700, borderRight: '1px solid #cbd5e1', width: '115px' }}>Invoice No.</th>
              <th style={{ padding: '6px 6px', fontWeight: 700, borderRight: '1px solid #cbd5e1', width: '60px' }}>LPO</th>
              <th style={{ padding: '6px 8px', fontWeight: 700, borderRight: '1px solid #cbd5e1', textAlign: 'right' }}>Bill Amount</th>
              <th style={{ padding: '6px 8px', fontWeight: 700, borderRight: '1px solid #cbd5e1', textAlign: 'right' }}>Paid</th>
              <th style={{ padding: '6px 8px', fontWeight: 700, borderRight: '1px solid #cbd5e1', textAlign: 'right' }}>Balance</th>
              <th style={{ padding: '6px 8px', fontWeight: 700, borderRight: '1px solid #cbd5e1', textAlign: 'right' }}>Total Balance</th>
              <th style={{ padding: '6px 6px', fontWeight: 700, width: '75px' }}>Aging Days</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                  No outstanding invoices found for this account.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={index}
                  style={{
                    borderBottom: '1px solid #cbd5e1',
                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc',
                    height: '28px',
                  }}
                >
                  <td style={{ padding: '5px 4px', borderRight: '1px solid #cbd5e1' }}>{row.sr}</td>
                  <td style={{ padding: '5px 6px', borderRight: '1px solid #cbd5e1' }}>{row.date}</td>
                  <td style={{ padding: '5px 6px', borderRight: '1px solid #cbd5e1' }}>{row.doNo || '-'}</td>
                  <td style={{ padding: '5px 8px', borderRight: '1px solid #cbd5e1', fontWeight: 600 }}>{row.invoiceNo}</td>
                  <td style={{ padding: '5px 6px', borderRight: '1px solid #cbd5e1' }}>{row.lpo || '-'}</td>
                  <td style={{ padding: '5px 8px', borderRight: '1px solid #cbd5e1', textAlign: 'right', fontFamily: 'monospace' }}>
                    {row.billAmount.toFixed(3)}
                  </td>
                  <td style={{ padding: '5px 8px', borderRight: '1px solid #cbd5e1', textAlign: 'right', fontFamily: 'monospace' }}>
                    {row.paid.toFixed(3)}
                  </td>
                  <td style={{ padding: '5px 8px', borderRight: '1px solid #cbd5e1', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                    {row.balance.toFixed(3)}
                  </td>
                  <td style={{ padding: '5px 8px', borderRight: '1px solid #cbd5e1', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                    {row.totalBalance.toFixed(3)}
                  </td>
                  <td style={{ padding: '5px 6px' }}>{row.agingDays}</td>
                </tr>
              ))
            )}
          </tbody>
          {/* ── 6. Totals Footer Row ─────────────────────────────────────── */}
          <tfoot>
            <tr
              style={{
                fontWeight: 700,
                borderTop: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                height: '32px',
              }}
            >
              <td
                colSpan={5}
                style={{
                  padding: '6px 12px',
                  textAlign: 'left',
                  borderRight: '1px solid #cbd5e1',
                  fontWeight: 700,
                  fontSize: '12px',
                }}
              >
                Total
              </td>
              <td style={{ padding: '6px 8px', textAlign: 'right', borderRight: '1px solid #cbd5e1', fontFamily: 'monospace' }}>
                {totals.billAmount.toFixed(3)}
              </td>
              <td style={{ padding: '6px 8px', textAlign: 'right', borderRight: '1px solid #cbd5e1', fontFamily: 'monospace' }}>
                {totals.paid.toFixed(3)}
              </td>
              <td style={{ padding: '6px 8px', textAlign: 'right', borderRight: '1px solid #cbd5e1', fontFamily: 'monospace' }}>
                {totals.balance.toFixed(3)}
              </td>
              <td style={{ padding: '6px 8px', textAlign: 'right', borderRight: '1px solid #cbd5e1', fontFamily: 'monospace' }}>
                {totals.totalBalance.toFixed(3)}
              </td>
              <td style={{ padding: '6px 6px' }} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
