export function formatKWD(val: number | string | null | undefined): string {
  const num = typeof val === 'number' ? val : parseFloat(String(val || '0'));
  if (isNaN(num)) return '0.000';
  return num.toFixed(3);
}

export function generateCsv(columns: { id: string; label: string }[], rows: Record<string, any>[]): string {
  const headers = columns.map(c => `"${c.label.replace(/"/g, '""')}"`).join(',');

  const csvRows = rows.map(r => {
    return columns.map(c => {
      let val = r[c.id];
      if (val === null || val === undefined) return '""';
      if (typeof val === 'number') {
        return `"${val}"`;
      }
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',');
  });

  // Prepend UTF-8 BOM (\uFEFF) so Excel opens Arabic and special characters correctly
  return '\uFEFF' + [headers, ...csvRows].join('\r\n');
}

export function generateExcelXml(
  reportTitle: string,
  columns: { id: string; label: string; type?: string }[],
  rows: Record<string, any>[],
  totals?: Record<string, any>
): string {
  const sanitize = (str: any) => {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="TitleStyle">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="16" ss:Bold="1" ss:Color="#1E293B"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1E3A8A" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0F172A"/>
   </Borders>
  </Style>
  <Style ss:ID="CurrencyStyle">
   <NumberFormat ss:Format="#,##0.000"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="TotalStyle">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Bold="1" ss:Color="#0F172A"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="#,##0.000"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#94A3B8"/>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#94A3B8"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="Report">
  <Table ss:DefaultColumnWidth="120">
   <Row ss:Height="30">
    <Cell ss:MergeAcross="${Math.max(0, columns.length - 1)}" ss:StyleID="TitleStyle">
     <Data ss:Type="String">${sanitize(reportTitle)}</Data>
    </Cell>
   </Row>
   <Row ss:Height="10"></Row>
   <Row ss:Height="25">`;

  const headerCells = columns
    .map(c => `    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${sanitize(c.label)}</Data></Cell>`)
    .join('\n');

  const dataRowsXml = rows.map(r => {
    const cells = columns.map(c => {
      const val = r[c.id];
      const isNum = typeof val === 'number' || (c.type === 'currency' && !isNaN(parseFloat(val)));
      if (isNum && val !== null && val !== '') {
        const num = typeof val === 'number' ? val : parseFloat(val);
        const styleId = c.type === 'currency' ? ' ss:StyleID="CurrencyStyle"' : '';
        return `    <Cell${styleId}><Data ss:Type="Number">${num}</Data></Cell>`;
      }
      return `    <Cell><Data ss:Type="String">${sanitize(val ?? '')}</Data></Cell>`;
    }).join('\n');
    return `   <Row ss:Height="20">\n${cells}\n   </Row>`;
  }).join('\n');

  let totalsRowXml = '';
  if (totals && Object.keys(totals).length > 0) {
    const totalCells = columns.map((c, i) => {
      if (i === 0) {
        return `    <Cell ss:StyleID="TotalStyle"><Data ss:Type="String">TOTAL / الإجمالي</Data></Cell>`;
      }
      const val = totals[c.id];
      if (val !== undefined && val !== null) {
        const num = typeof val === 'number' ? val : parseFloat(val);
        return `    <Cell ss:StyleID="TotalStyle"><Data ss:Type="Number">${num}</Data></Cell>`;
      }
      return `    <Cell ss:StyleID="TotalStyle"><Data ss:Type="String"></Data></Cell>`;
    }).join('\n');
    totalsRowXml = `\n   <Row ss:Height="24">\n${totalCells}\n   </Row>`;
  }

  const xmlFooter = `
  </Table>
 </Worksheet>
</Workbook>`;

  return xmlHeader + '\n' + headerCells + '\n   </Row>\n' + dataRowsXml + totalsRowXml + xmlFooter;
}
