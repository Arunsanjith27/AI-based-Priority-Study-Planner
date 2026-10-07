const fs = require('fs/promises');
const pdfParse = require('pdf-parse');

const extractSyllabusText = async (filePath, fileType) => {
  if (fileType === 'text/plain') {
    return fs.readFile(filePath, 'utf8');
  }

  if (fileType === 'application/pdf') {
    const fileBuffer = await fs.readFile(filePath);

    const parser = new pdfParse.PDFParse({
      data: fileBuffer,
    });

    const result = await parser.getText();

    await parser.destroy();

    return result.text || '';
  }

  throw new Error('Unsupported file format');
};

module.exports = {
  extractSyllabusText,
};
