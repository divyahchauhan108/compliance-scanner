import { ComplianceScan } from './types';

export async function generatePdfReport(scan: ComplianceScan): Promise<void> {
  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const primaryColor = [30, 58, 138]; // #1E3A8A
    const textColor = [31, 41, 55]; // #1F2937
    const lightGray = [248, 249, 250];

    // Page Width: 210mm, Margins: 15mm
    let y = 15;

    // Header Bar
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(15, y, 180, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('LEGAL METROLOGY COMPLIANCE AUDIT REPORT', 20, y + 10);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Rules 2011 (Packaged Commodities) Audit Verification Certificate', 20, y + 17);

    y += 30;

    // Audit Info Box
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(15, y, 180, 28, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.rect(15, y, 180, 28, 'S');

    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Product Name: ${scan.productName}`, 20, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Audit Reference ID: ${scan.id}`, 20, y + 15);
    doc.text(`Date & Time: ${scan.timestamp}`, 20, y + 22);

    // Score Badge Box
    const badgeText = `${scan.compliantCount} / ${scan.totalFields} COMPLIANT`;
    if (scan.compliantCount >= 4) {
      doc.setFillColor(22, 163, 74); // Green
    } else if (scan.compliantCount >= 2) {
      doc.setFillColor(217, 119, 6); // Orange
    } else {
      doc.setFillColor(220, 38, 38); // Red
    }
    doc.rect(135, y + 6, 52, 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(badgeText, 161, y + 16, { align: 'center' });

    y += 36;

    // Title Section
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('MANDATORY DECLARATIONS AUDIT CHECKLIST (5 FIELDS)', 15, y);
    y += 6;

    // Table Header
    doc.setFillColor(30, 58, 138);
    doc.rect(15, y, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Field Name', 18, y + 5.5);
    doc.text('Rule Reference', 75, y + 5.5);
    doc.text('Status', 140, y + 5.5);
    doc.text('Extracted Value', 160, y + 5.5);

    y += 8;

    // Table Rows
    scan.fields.forEach((field, index) => {
      const rowBg = index % 2 === 0 ? [255, 255, 255] : [243, 244, 246];
      doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
      doc.rect(15, y, 180, 18, 'F');
      doc.setDrawColor(229, 231, 235);
      doc.rect(15, y, 180, 18, 'S');

      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      // Field Name
      const fieldNameText = doc.splitTextToSize(field.name, 55);
      doc.text(fieldNameText, 18, y + 5);

      // Rule Ref
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      const refText = doc.splitTextToSize(field.ruleReference.split(' - ')[0], 60);
      doc.text(refText, 75, y + 5);

      // Status Badge
      if (field.status === 'pass') {
        doc.setFillColor(22, 163, 74);
        doc.rect(138, y + 4, 18, 6, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text('PASS', 147, y + 8.2, { align: 'center' });
      } else {
        doc.setFillColor(220, 38, 38);
        doc.rect(138, y + 4, 18, 6, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text('FAIL', 147, y + 8.2, { align: 'center' });
      }

      // Extracted Text
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      const snippet = field.extractedText || 'NOT FOUND / MISSING';
      const snippetText = doc.splitTextToSize(snippet, 30);
      doc.text(snippetText, 160, y + 5);

      y += 18;
    });

    y += 10;

    // Disclaimer Box
    doc.setFillColor(243, 244, 246);
    doc.rect(15, y, 180, 20, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(107, 114, 128);
    doc.text(
      'Disclaimer: This compliance audit report is generated automatically based on visual inspection of packaging declarations under Legal Metrology Rules, 2011. Official statutory enforcement rests with state Legal Metrology Inspectors.',
      18,
      y + 6,
      { maxWidth: 174 }
    );

    // Save PDF
    const filename = `legal-metrology-report-${scan.id}.pdf`;
    doc.save(filename);
  } catch (err) {
    console.error('Failed to generate PDF:', err);
    alert('Could not generate PDF report. Opening browser print view instead.');
    window.print();
  }
}
