import PDFDocument from "pdfkit";
import type { AnalysisReport } from "./analysis";
import { formatMoney } from "./analysis";
import { loadChineseFontBuffer } from "./chinese-font";

const PAGE_MARGIN = 50;
const CONTENT_WIDTH = 495;

function formatDateTime(date: Date): string {
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type PdfContext = {
  doc: InstanceType<typeof PDFDocument>;
  y: number;
  font: string;
};

function ensureSpace(ctx: PdfContext, needed: number) {
  const bottom = ctx.doc.page.height - PAGE_MARGIN;
  if (ctx.y + needed > bottom) {
    ctx.doc.addPage();
    ctx.y = PAGE_MARGIN;
  }
}

function writeTitle(ctx: PdfContext, text: string) {
  ensureSpace(ctx, 36);
  ctx.doc.font(ctx.font).fontSize(20).fillColor("#14532d").text(text, PAGE_MARGIN, ctx.y);
  ctx.y += 32;
}

function writeSection(ctx: PdfContext, text: string) {
  ensureSpace(ctx, 28);
  ctx.doc.font(ctx.font).fontSize(14).fillColor("#166534").text(text, PAGE_MARGIN, ctx.y);
  ctx.y += 22;
}

function writeParagraph(ctx: PdfContext, text: string, indent = 0) {
  ensureSpace(ctx, 20);
  ctx.doc
    .font(ctx.font)
    .fontSize(10.5)
    .fillColor("#1c1917")
    .text(text, PAGE_MARGIN + indent, ctx.y, { width: CONTENT_WIDTH - indent, lineGap: 3 });
  ctx.y = ctx.doc.y + 8;
}

function writeKeyValues(ctx: PdfContext, rows: [string, string][]) {
  for (const [label, value] of rows) {
    ensureSpace(ctx, 18);
    ctx.doc.font(ctx.font).fontSize(10.5).fillColor("#57534e").text(label, PAGE_MARGIN, ctx.y, {
      continued: true,
      width: 140,
    });
    ctx.doc.fillColor("#1c1917").text(value, { width: CONTENT_WIDTH - 140 });
    ctx.y = ctx.doc.y + 4;
  }
  ctx.y += 6;
}

function writeTable(
  ctx: PdfContext,
  headers: string[],
  rows: string[][],
  colWidths: number[],
) {
  const rowHeight = 20;
  const headerHeight = 22;

  ensureSpace(ctx, headerHeight + rowHeight * Math.min(rows.length, 3));

  let x = PAGE_MARGIN;
  ctx.doc.font(ctx.font).fontSize(9.5).fillColor("#ffffff");
  ctx.doc.rect(PAGE_MARGIN, ctx.y, CONTENT_WIDTH, headerHeight).fill("#166534");

  headers.forEach((header, index) => {
    ctx.doc.fillColor("#ffffff").text(header, x + 4, ctx.y + 6, {
      width: colWidths[index]! - 8,
      align: index === colWidths.length - 1 ? "right" : "left",
    });
    x += colWidths[index]!;
  });
  ctx.y += headerHeight;

  rows.forEach((row, rowIndex) => {
    ensureSpace(ctx, rowHeight);
    const fill = rowIndex % 2 === 0 ? "#fafaf9" : "#ffffff";
    ctx.doc.rect(PAGE_MARGIN, ctx.y, CONTENT_WIDTH, rowHeight).fill(fill);

    x = PAGE_MARGIN;
    row.forEach((cell, colIndex) => {
      ctx.doc
        .font(ctx.font)
        .fontSize(9)
        .fillColor("#1c1917")
        .text(cell, x + 4, ctx.y + 5, {
          width: colWidths[colIndex]! - 8,
          align: colIndex === colWidths.length - 1 ? "right" : "left",
          ellipsis: true,
        });
      x += colWidths[colIndex]!;
    });
    ctx.y += rowHeight;
  });

  ctx.y += 10;
}

export async function generateAnalysisPdf(report: AnalysisReport): Promise<Buffer> {
  const fontBuffer = await loadChineseFontBuffer();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: PAGE_MARGIN, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.registerFont("zh", fontBuffer);
    const ctx: PdfContext = { doc, y: PAGE_MARGIN, font: "zh" };

    writeTitle(ctx, "借还本 — 数据分析报告");
    writeParagraph(
      ctx,
      `生成时间：${formatDateTime(report.generatedAt)}    数据区间：${report.overview.dateFrom} 至 ${report.overview.dateTo}`,
    );
    ctx.y += 4;

    writeSection(ctx, "一、数据概览");
    writeKeyValues(ctx, [
      ["流水条数", `${report.overview.recordCount} 条`],
      ["相关方数量", `${report.overview.partyCount} 个`],
      ["净应收（别人欠我）", `${formatMoney(report.overview.totalReceivable)} 元`],
      ["净应付（我欠别人）", `${formatMoney(report.overview.totalPayable)} 元`],
      ["净头寸", `${formatMoney(report.overview.netPosition)} 元`],
    ]);

    writeSection(ctx, "二、核心洞见");
    report.insights.forEach((insight, index) => {
      writeParagraph(ctx, `${index + 1}. ${insight}`);
    });

    writeSection(ctx, "三、净应收排行");
    if (report.topReceivable.length === 0) {
      writeParagraph(ctx, "暂无净应收。");
    } else {
      writeTable(
        ctx,
        ["相关方", "净应收（元）", "占比"],
        report.topReceivable.map((item) => [
          item.name,
          formatMoney(item.amount),
          `${((item.amount / report.overview.totalReceivable) * 100).toFixed(1)}%`,
        ]),
        [180, 180, 135],
      );
    }

    writeSection(ctx, "四、净应付排行");
    if (report.topPayable.length === 0) {
      writeParagraph(ctx, "暂无净应付。");
    } else {
      writeTable(
        ctx,
        ["相关方", "净应付（元）", "占比"],
        report.topPayable.map((item) => [
          item.name,
          formatMoney(item.amount),
          `${((item.amount / report.overview.totalPayable) * 100).toFixed(1)}%`,
        ]),
        [180, 180, 135],
      );
    }

    writeSection(ctx, "五、相关方明细");
    writeTable(
      ctx,
      ["相关方", "状态", "净应收", "净应付", "末次流水"],
      report.partyDetails.map((party) => [
        party.name,
        party.status,
        party.netReceivable > 0 ? formatMoney(party.netReceivable) : "-",
        party.netPayable > 0 ? formatMoney(party.netPayable) : "-",
        party.lastActivity,
      ]),
      [110, 70, 95, 95, 125],
    );

    writeSection(ctx, "六、年度借还汇总");
    writeTable(
      ctx,
      ["年份", "借款", "还款", "流水数"],
      report.byYear.map((year) => [
        String(year.year),
        formatMoney(year.borrow),
        formatMoney(year.repay),
        String(year.count),
      ]),
      [70, 140, 140, 145],
    );

    writeSection(ctx, "七、大额交易 TOP5");
    writeTable(
      ctx,
      ["日期", "相关方", "类型", "金额（元）"],
      report.largestTransactions.map((item) => [
        item.date,
        item.party,
        item.label,
        formatMoney(item.amount),
      ]),
      [80, 130, 70, 215],
    );

    writeSection(ctx, "八、数据质量");
    writeKeyValues(ctx, [
      ["含用途备注", `${report.meta.withPurpose} / ${report.overview.recordCount} 条`],
      ["标记计息", `${report.meta.interestCount} 条`],
      ["凭证附件", `${report.meta.attachmentCount} 个`],
    ]);

    writeParagraph(
      ctx,
      "本报告由借还本系统自动生成，金额依据当前账本流水计算，仅供参考。",
    );

    doc.end();
  });
}
