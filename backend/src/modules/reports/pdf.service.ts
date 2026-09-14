/**
 * PDF service: a one-visit PDF with timestamps, door, reassignment trail, and
 * the detention estimate.
 *
 * Generates a minimal valid PDF document. Every estimate is labeled "Not an
 * invoice. For discussion only."
 */
import { Injectable } from '@nestjs/common';
import { Visit } from '../visits/visit.entity';
import { DetentionEstimate, DETENTION_DISCLAIMER } from '../visits/detention.service';

@Injectable()
export class PdfService {
  /**
   * Escape a PDF text string.
   *
   * Args:
   *   text: The text to escape.
   *
   * Returns:
   *   The escaped text safe for a PDF string literal.
   */
  private esc(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  /**
   * Build a one-visit PDF document.
   *
   * Args:
   *   visit: The visit.
   *   detention: The detention estimate.
   *   confirmationCode: The appointment confirmation code.
   *
   * Returns:
   *   The PDF as a Buffer.
   */
  buildVisitPdf(
    visit: Visit,
    detention: DetentionEstimate,
    confirmationCode: string,
  ): Buffer {
    const lines = [
      `Dockwise Visit Record`,
      `Confirmation: ${confirmationCode}`,
      `Plate: ${visit.tractorPlate}  Trailer: ${visit.trailerNumber}`,
      `Driver: ${visit.driverName ?? '-'}`,
      `Arrived: ${visit.arrivedAt.toISOString()}`,
      `Door ready: ${visit.doorReadyAt?.toISOString() ?? '-'}`,
      `Load start: ${visit.loadStartAt?.toISOString() ?? '-'}`,
      `Load complete: ${visit.loadCompleteAt?.toISOString() ?? '-'}`,
      `Exited: ${visit.exitedAt?.toISOString() ?? '-'}`,
      `Detention billable minutes: ${detention.billableMinutes}`,
      ``,
      DETENTION_DISCLAIMER,
    ];

    // Build a minimal single-page PDF with a text stream.
    const textOps = lines
      .map((line, i) => `BT /F1 12 Tf 50 ${760 - i * 18} Td (${this.esc(line)}) Tj ET`)
      .join('\n');

    const content = textOps;
    const objects: string[] = [];
    objects.push('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj');
    objects.push('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj');
    objects.push(
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    );
    objects.push('4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj');
    objects.push(
      `5 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
    );

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [];
    for (const obj of objects) {
      offsets.push(pdf.length);
      pdf += obj + '\n';
    }
    const xrefStart = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (const offset of offsets) {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\n`;
    pdf += `startxref\n${xrefStart}\n%%EOF`;

    return Buffer.from(pdf, 'latin1');
  }
}
