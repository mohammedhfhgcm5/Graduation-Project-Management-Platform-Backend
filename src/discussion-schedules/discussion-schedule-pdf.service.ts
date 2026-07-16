import { Injectable } from '@nestjs/common';
import { existsSync } from 'node:fs';
import PDFDocument from 'pdfkit';
import { Prisma } from '../generated/prisma/client';

type DiscussionSchedulePdfData = Prisma.DiscussionScheduleGetPayload<{
  include: {
    createdBy: {
      select: {
        id: true;
        name: true;
        email: true;
        role: true;
        department: true;
        avatarUrl: true;
      };
    };
    items: true;
  };
}>;

type PdfColumn = {
  key: string;
  label: string;
  width: number;
  align?: 'left' | 'center' | 'right';
};

@Injectable()
export class DiscussionSchedulePdfService {
  async createSchedulePdf(schedule: DiscussionSchedulePdfData) {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 32,
      info: {
        Title: schedule.title,
        Author: 'Graduation Project Management Platform',
      },
      bufferPages: true,
    });
    const chunks: Buffer[] = [];
    const pdfBuffer = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    this.registerFonts(doc);
    this.drawHeader(doc, schedule);

    const columns: PdfColumn[] = [
      { key: 'slotOrder', label: 'م', width: 28, align: 'center' },
      { key: 'students', label: 'الطالب', width: 112 },
      { key: 'projectTitle', label: 'عنوان المشروع', width: 218 },
      { key: 'supervisors', label: 'المشرف', width: 112 },
      { key: 'time', label: 'التوقيت', width: 78, align: 'center' },
      { key: 'committee', label: 'اللجنة', width: 160 },
      { key: 'room', label: 'القاعة', width: 70, align: 'center' },
    ];

    let y = 128;
    y = this.drawTableHeader(doc, columns, y);

    for (const item of schedule.items) {
      const row = {
        slotOrder: String(item.slotOrder),
        students: item.studentNames.join('\n'),
        projectTitle: item.projectTitle,
        supervisors: item.supervisorNames.join('\n'),
        time: `${this.formatTime(item.startsAt)}\n${this.formatTime(item.endsAt)}`,
        committee: item.committeeNames.join('\n'),
        room: item.room ?? '-',
      };
      const rowHeight = this.measureRowHeight(doc, columns, row);

      if (y + rowHeight > doc.page.height - 118) {
        doc.addPage();
        this.drawPageTopRule(doc);
        y = 58;
        y = this.drawTableHeader(doc, columns, y);
      }

      this.drawTableRow(doc, columns, row, y, rowHeight, item.slotOrder);
      y += rowHeight;
    }

    this.drawSignature(doc, schedule, y);
    this.drawPageNumbers(doc);
    doc.end();

    return pdfBuffer;
  }

  private registerFonts(doc: PDFKit.PDFDocument) {
    const regularFont = this.findExistingPath([
      process.env.PDF_ARABIC_FONT_PATH,
      'C:\\Windows\\Fonts\\tahoma.ttf',
      'C:\\Windows\\Fonts\\arial.ttf',
      '/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf',
      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    ]);
    const boldFont = this.findExistingPath([
      process.env.PDF_ARABIC_BOLD_FONT_PATH,
      'C:\\Windows\\Fonts\\tahomabd.ttf',
      'C:\\Windows\\Fonts\\arialbd.ttf',
      '/usr/share/fonts/truetype/noto/NotoNaskhArabic-Bold.ttf',
      '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
      regularFont,
    ]);

    if (regularFont) {
      doc.registerFont('Arabic', regularFont);
      doc.registerFont('ArabicBold', boldFont ?? regularFont);
      doc.font('Arabic');
      return;
    }

    doc.font('Helvetica');
  }

  private findExistingPath(paths: Array<string | undefined>) {
    return paths.find((path) => path && existsSync(path));
  }

  private drawHeader(
    doc: PDFKit.PDFDocument,
    schedule: DiscussionSchedulePdfData,
  ) {
    const margin = doc.page.margins.left;
    const width = doc.page.width - margin * 2;

    doc.rect(0, 0, doc.page.width, 102).fill('#f8fafc');
    doc.rect(0, 0, doc.page.width, 8).fill('#1f6f8b');
    doc
      .fillColor('#0f172a')
      .font('ArabicBold')
      .fontSize(18)
      .text(schedule.title, margin, 24, {
        width,
        align: 'center',
        features: ['liga', 'rlig', 'calt'],
      });

    const dateLabel = this.formatDate(schedule.discussionDate);
    const subtitle = [
      schedule.academicYear,
      schedule.semester,
      dateLabel,
    ].filter(Boolean);

    doc
      .fillColor('#475569')
      .font('Arabic')
      .fontSize(10)
      .text(subtitle.join('  |  '), margin, 54, {
        width,
        align: 'center',
        features: ['liga', 'rlig', 'calt'],
      });

    const meta = [
      schedule.department ? `القسم: ${schedule.department}` : undefined,
      schedule.location ? `المكان: ${schedule.location}` : undefined,
    ].filter(Boolean);

    if (meta.length > 0) {
      doc.roundedRect(margin + width / 2 - 170, 76, 340, 18, 4).fill('#e0f2fe');
      doc
        .fillColor('#075985')
        .font('ArabicBold')
        .fontSize(9)
        .text(meta.join('  |  '), margin + width / 2 - 164, 80, {
          width: 328,
          align: 'center',
          features: ['liga', 'rlig', 'calt'],
        });
    }
  }

  private drawPageTopRule(doc: PDFKit.PDFDocument) {
    doc.rect(0, 0, doc.page.width, 8).fill('#1f6f8b');
    doc
      .fillColor('#64748b')
      .font('Arabic')
      .fontSize(9)
      .text('جدول مناقشات مشاريع التخرج', doc.page.margins.left, 22, {
        width: doc.page.width - doc.page.margins.left * 2,
        align: 'center',
        features: ['liga', 'rlig', 'calt'],
      });
  }

  private drawTableHeader(
    doc: PDFKit.PDFDocument,
    columns: PdfColumn[],
    y: number,
  ) {
    this.drawTableCells(doc, columns, {}, y, 28, {
      fill: '#0f3d56',
      stroke: '#0f3d56',
      textColor: '#ffffff',
      bold: true,
      header: true,
    });

    return y + 28;
  }

  private drawTableRow(
    doc: PDFKit.PDFDocument,
    columns: PdfColumn[],
    row: Record<string, string>,
    y: number,
    height: number,
    index: number,
  ) {
    this.drawTableCells(doc, columns, row, y, height, {
      fill: index % 2 === 0 ? '#f8fafc' : '#ffffff',
      stroke: '#cbd5e1',
      textColor: '#0f172a',
      bold: false,
      header: false,
    });
  }

  private drawTableCells(
    doc: PDFKit.PDFDocument,
    columns: PdfColumn[],
    row: Record<string, string>,
    y: number,
    height: number,
    style: {
      fill: string;
      stroke: string;
      textColor: string;
      bold: boolean;
      header: boolean;
    },
  ) {
    const tableRight = doc.page.width - doc.page.margins.right;
    let cursorRight = tableRight;

    for (const column of columns) {
      const x = cursorRight - column.width;
      const value = style.header ? column.label : (row[column.key] ?? '');

      doc
        .rect(x, y, column.width, height)
        .fillAndStroke(style.fill, style.stroke);
      doc
        .fillColor(style.textColor)
        .font(style.bold ? 'ArabicBold' : 'Arabic')
        .fontSize(style.header ? 9 : 8)
        .text(value, x + 5, y + 7, {
          width: column.width - 10,
          height: height - 10,
          align: column.align ?? 'right',
          features: ['liga', 'rlig', 'calt'],
        });

      cursorRight = x;
    }
  }

  private measureRowHeight(
    doc: PDFKit.PDFDocument,
    columns: PdfColumn[],
    row: Record<string, string>,
  ) {
    const heights = columns.map((column) => {
      doc.font('Arabic').fontSize(8);
      return doc.heightOfString(row[column.key] ?? '', {
        width: column.width - 10,
        align: column.align ?? 'right',
        features: ['liga', 'rlig', 'calt'],
      });
    });

    return Math.max(34, Math.ceil(Math.max(...heights) + 14));
  }

  private drawSignature(
    doc: PDFKit.PDFDocument,
    schedule: DiscussionSchedulePdfData,
    currentY: number,
  ) {
    const signatureY =
      currentY > doc.page.height - 150 ? doc.page.height - 96 : currentY + 44;
    const x = doc.page.width - doc.page.margins.right - 210;

    doc
      .moveTo(x, signatureY)
      .lineTo(x + 170, signatureY)
      .strokeColor('#94a3b8')
      .lineWidth(1)
      .stroke();

    doc
      .fillColor('#0f172a')
      .font('ArabicBold')
      .fontSize(10)
      .text(schedule.department ?? 'رئيس القسم', x, signatureY + 12, {
        width: 170,
        align: 'center',
        features: ['liga', 'rlig', 'calt'],
      });

    doc
      .fillColor('#334155')
      .font('Arabic')
      .fontSize(10)
      .text(schedule.chairName ?? '', x, signatureY + 32, {
        width: 170,
        align: 'center',
        features: ['liga', 'rlig', 'calt'],
      });
  }

  private drawPageNumbers(doc: PDFKit.PDFDocument) {
    const range = doc.bufferedPageRange();

    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      doc
        .fillColor('#64748b')
        .font('Arabic')
        .fontSize(8)
        .text(
          `Page ${i + 1} / ${range.count}`,
          doc.page.margins.left,
          doc.page.height - 24,
          {
            width: doc.page.width - doc.page.margins.left * 2,
            align: 'center',
          },
        );
    }
  }

  private formatDate(value: Date) {
    return new Intl.DateTimeFormat('ar-JO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(value);
  }

  private formatTime(value: Date) {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(value);
  }
}
