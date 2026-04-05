/**
 * FileProcessor - Real document processing
 * Supports: PDF, Excel, CSV, Images (OCR)
 * 
 * REAL - Actual file processing, not fake
 */

import pdfParse from 'pdf-parse';
import XLSX from 'xlsx';
import Papa from 'papaparse';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import AIModelRouter from '../models/AIModelRouter.js';

class FileProcessor {
  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
    this.tempDir = process.env.TEMP_DIR || './temp';
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 52428800; // 50MB

    // Ensure directories exist
    [this.uploadDir, this.tempDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Upload and store file
   */
  async uploadFile(file, userId) {
    if (file.size > this.maxFileSize) {
      throw new Error(`File too large. Max: ${this.maxFileSize} bytes`);
    }

    const filename = `${Date.now()}_${file.originalname}`;
    const filepath = path.join(this.uploadDir, filename);

    // Save file
    fs.writeFileSync(filepath, file.buffer);

    return {
      fileId: filename,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: filepath,
      uploadedAt: new Date()
    };
  }

  /**
   * Extract text from PDF (REAL)
   */
  async extractPDFText(filepath) {
    try {
      const fileBuffer = fs.readFileSync(filepath);
      const data = await pdfParse(fileBuffer);

      return {
        type: 'pdf',
        pageCount: data.numpages,
        text: data.text,
        metadata: data.info,
        version: data.version
      };
    } catch (error) {
      throw new Error(`PDF extraction failed: ${error.message}`);
    }
  }

  /**
   * Parse Excel file (REAL)
   */
  async parseExcel(filepath) {
    try {
      const workbook = XLSX.readFile(filepath);
      const sheets = {};

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        sheets[sheetName] = XLSX.utils.sheet_to_json(worksheet);
      }

      return {
        type: 'excel',
        sheets: Object.keys(sheets),
        data: sheets,
        rowCount: Object.values(sheets)[0]?.length || 0
      };
    } catch (error) {
      throw new Error(`Excel parsing failed: ${error.message}`);
    }
  }

  /**
   * Parse CSV file (REAL)
   */
  async parseCSV(filepath) {
    return new Promise((resolve, reject) => {
      const fileStream = fs.createReadStream(filepath);

      Papa.parse(fileStream, {
        header: true,
        complete: (results) => {
          resolve({
            type: 'csv',
            rowCount: results.data.length,
            columnCount: results.meta.fields.length,
            columns: results.meta.fields,
            data: results.data.filter(row => Object.values(row).some(v => v))
          });
        },
        error: reject
      });
    });
  }

  /**
   * Extract text from image using OCR (REAL)
   */
  async extractImageText(filepath, language = 'eng') {
    try {
      const result = await Tesseract.recognize(filepath, language);

      return {
        type: 'image-ocr',
        text: result.data.text,
        confidence: result.data.confidence,
        language,
        blocks: result.data.blocks
      };
    } catch (error) {
      throw new Error(`OCR failed: ${error.message}`);
    }
  }

  /**
   * Analyze document with AI
   */
  async analyzeDocument(filepath, fileType) {
    let content;

    switch (fileType) {
      case 'pdf':
        content = await this.extractPDFText(filepath);
        break;
      case 'excel':
        content = await this.parseExcel(filepath);
        break;
      case 'csv':
        content = await this.parseCSV(filepath);
        break;
      case 'image':
        content = await this.extractImageText(filepath);
        break;
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }

    // Use AI to analyze
    const analysisPrompt = `Analyze this document and provide key insights:\n\n${JSON.stringify(content).substring(0, 2000)}`;

    const analysis = await AIModelRouter.route(analysisPrompt, {
      taskType: 'analysis',
      maxTokens: 1500
    });

    return {
      content,
      analysis: analysis.response,
      model: analysis.model
    };
  }

  /**
   * Convert image format
   */
  async convertImage(filepath, format = 'webp', quality = 80) {
    try {
      const outputFilename = `converted_${Date.now()}.${format}`;
      const outputPath = path.join(this.tempDir, outputFilename);

      await sharp(filepath)
        .toFormat(format, { quality })
        .toFile(outputPath);

      const stats = fs.statSync(outputPath);

      return {
        type: 'image-converted',
        format,
        inputSize: fs.statSync(filepath).size,
        outputSize: stats.size,
        compressionRatio: (1 - (stats.size / fs.statSync(filepath).size)) * 100,
        file: outputFilename
      };
    } catch (error) {
      throw new Error(`Image conversion failed: ${error.message}`);
    }
  }

  /**
   * Summarize document
   */
  async summarizeDocument(filepath, fileType, maxLength = 500) {
    let text;

    switch (fileType) {
      case 'pdf':
        const pdfData = await this.extractPDFText(filepath);
        text = pdfData.text;
        break;
      case 'image':
        const imageData = await this.extractImageText(filepath);
        text = imageData.text;
        break;
      case 'csv':
        const csvData = await this.parseCSV(filepath);
        text = JSON.stringify(csvData.data).substring(0, 2000);
        break;
      default:
        throw new Error(`Cannot summarize file type: ${fileType}`);
    }

    const prompt = `Summarize this document in ${maxLength} characters or less:\n\n${text}`;

    const summary = await AIModelRouter.route(prompt, {
      taskType: 'summarization',
      maxTokens: 1000
    });

    return {
      originalLength: text.length,
      summaryLength: summary.response.length,
      compressionRatio: (1 - (summary.response.length / text.length)) * 100,
      summary: summary.response,
      model: summary.model
    };
  }

  /**
   * Extract tables from document
   */
  async extractTables(filepath, fileType) {
    if (fileType === 'excel') {
      return this.parseExcel(filepath);
    } else if (fileType === 'pdf') {
      // For PDF, extract text and let AI parse tables
      const pdfData = await this.extractPDFText(filepath);
      const prompt = `Extract all tables from this text:\n\n${pdfData.text}`;

      const result = await AIModelRouter.route(prompt, {
        taskType: 'data-extraction'
      });

      return {
        type: 'extracted-tables',
        tables: result.response
      };
    } else {
      throw new Error(`Cannot extract tables from ${fileType}`);
    }
  }

  /**
   * Batch process multiple files
   */
  async batchProcess(filepaths, operation) {
    const results = [];

    for (const filepath of filepaths) {
      try {
        const fileType = path.extname(filepath).toLowerCase().substring(1);
        let result;

        switch (operation) {
          case 'extract-text':
            result = await this.extractPDFText(filepath);
            break;
          case 'analyze':
            result = await this.analyzeDocument(filepath, fileType);
            break;
          case 'summarize':
            result = await this.summarizeDocument(filepath, fileType);
            break;
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }

        results.push({
          file: path.basename(filepath),
          success: true,
          result
        });
      } catch (error) {
        results.push({
          file: path.basename(filepath),
          success: false,
          error: error.message
        });
      }
    }

    return {
      total: filepaths.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * Clean up old files
   */
  cleanupOldFiles(maxAgeDays = 7) {
    const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let deletedCount = 0;

    [this.uploadDir, this.tempDir].forEach(dir => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filepath = path.join(dir, file);
        const stats = fs.statSync(filepath);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          fs.unlinkSync(filepath);
          deletedCount++;
        }
      });
    });

    return { deletedCount, maxAgeDays };
  }

  /**
   * Get file system status
   */
  getStatus() {
    const uploadFiles = fs.readdirSync(this.uploadDir).length;
    const tempFiles = fs.readdirSync(this.tempDir).length;

    return {
      uploadDir: this.uploadDir,
      tempDir: this.tempDir,
      uploadedFiles: uploadFiles,
      tempFiles: tempFiles,
      maxFileSize: this.maxFileSize
    };
  }
}

export default new FileProcessor();
