const fs = require("fs");
const PDFDocument = require("pdfkit");
const path = require("path");

// function createInvoice(invoice, path) {
//   const doc = new PDFDocument({ size: "A4", margin: 50 });

//   generateHeader(doc);
//   generateCustomerInformation(doc, invoice);
//   generateInvoiceTable(doc, invoice);
//   generateFooter(doc);

//   doc.end();
//   doc.pipe(fs.createWriteStream(path));
// }

function createInvoice(invoice, path) {
 return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const stream = fs.createWriteStream(path);

    doc.pipe(stream); // Pipe before adding content

    generateHeader(doc);
    generateCustomerInformation(doc, invoice);
    generateInvoiceTable(doc, invoice);
    generateFooter(doc);

    doc.end(); // End after piping

    stream.on('finish', () => resolve());
    stream.on('error', (error) => reject(error));
  });
}

function generateHeader(doc) {
  const logoPath = path.join(__dirname, "../../public/logodark.png");

  if (!fs.existsSync(logoPath)) {
    console.error("❌ Logo file not found at:", logoPath);
  } else {
    console.log("✅ Logo found at:", logoPath);
  }
  doc
    .image(path.join(__dirname, "../../public/logodark.png"), 50, 45, { width: 120 })
    .fillColor("#444444")
    .fontSize(20)
    .fontSize(10)
    .text("FormMatic Inc.", 200, 50, { align: "right" })
    .text("123 Main Street", 200, 65, { align: "right" })
    .text("New York, NY, 10025", 200, 80, { align: "right" })
    .moveDown();
}

function generateCustomerInformation(doc, invoice) {
  doc
    .fillColor("#444444")
    .fontSize(20)
    .text("Invoice", 50, 160);

  generateHr(doc, 185);

  const top = 200;

  doc
    .fontSize(10)
    .text("Invoice Number:", 50, top)
    .font("Helvetica-Bold")
    .text(invoice.invoice_nr, 150, top)
    .font("Helvetica")
    .text("Invoice Date:", 50, top + 15)
    .text(formatDate(new Date()), 150, top + 15)
    .text("Balance Due:", 50, top + 30)
    .text(formatCurrency(invoice.subtotal - invoice.paid), 150, top + 30)

    // .font("Helvetica-Bold")
    // .text(invoice.shipping.name, 300, top)
    // .font("Helvetica-Bold")
    // .text(invoice.shipping.email, 300, top+15)
  
    .moveDown();

  generateHr(doc, 272);
}

function generateInvoiceTable(doc, invoice) {
  let i;
  const top = 330;

  doc.font("Helvetica-Bold");
  generateTableRow(
    doc,
    top,
    "Item",
    "",
    "Unit Cost",
    "Quantity",
    "Line Total"
  );
  generateHr(doc, top + 20);
  doc.font("Helvetica");

  for (i = 0; i < invoice.items.length; i++) {
    const item = invoice.items[i];
    const position = top + (i + 1) * 30;
    generateTableRow(
      doc,
      position,
      item.item,
      "",
      formatCurrency(item.amount / item.quantity),
      item.quantity,
      formatCurrency(item.amount)
    );

    generateHr(doc, position + 20);
  }

  const subtotalPosition = top + (i + 1) * 30;
  generateTableRow(
    doc,
    subtotalPosition,
    "",
    "",
    "Subtotal",
    "",
    formatCurrency(invoice.subtotal)
  );

  const paidToDatePosition = subtotalPosition + 20;
  generateTableRow(
    doc,
    paidToDatePosition,
    "",
    "",
    "Paid To Date",
    "",
    formatCurrency(invoice.paid)
  );

  const duePosition = paidToDatePosition + 25;
  doc.font("Helvetica-Bold");
  generateTableRow(
    doc,
    duePosition,
    "",
    "",
    "Balance Due",
    "",
    formatCurrency(invoice.subtotal - invoice.paid)
  );
  doc.font("Helvetica");
}

function generateFooter(doc) {
  doc
    .fontSize(10)
    .text(
      "",
      50,
      780,
      { align: "center", width: 500 }
    );
}

function generateTableRow(doc, y, item, description, unitCost, quantity, lineTotal) {
  doc
    .fontSize(10)
    .text(item, 50, y)
    .text(description, 150, y)
    .text(unitCost, 280, y, { width: 90, align: "right" })
    .text(quantity, 370, y, { width: 90, align: "right" })
    .text(lineTotal, 0, y, { align: "right" });
}

function generateHr(doc, y) {
  doc
    .strokeColor("#aaaaaa")
    .lineWidth(1)
    .moveTo(50, y)
    .lineTo(550, y)
    .stroke();
}

function formatCurrency(cents) {
  return "$" + (cents / 100).toFixed(2);
}

function formatDate(date) {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${year}/${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`;
}

module.exports = {
  createInvoice
};
