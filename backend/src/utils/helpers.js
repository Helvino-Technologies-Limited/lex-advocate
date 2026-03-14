const { v4: uuidv4 } = require('uuid');

function generateInvoiceNumber(prefix = 'INV') {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 90000) + 10000;
  return `${prefix}-${year}-${random}`;
}

function generateCaseNumber(prefix = 'CASE') {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 90000) + 10000;
  return `${prefix}/${year}/${random}`;
}

function getPagination(page = 1, limit = 20) {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;
  return { page: pageNum, limit: limitNum, offset };
}

function buildPaginationMeta(total, page, limit) {
  return {
    total: parseInt(total),
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1
  };
}

function sanitizeString(str) {
  if (!str) return null;
  return str.toString().trim();
}

module.exports = { generateInvoiceNumber, generateCaseNumber, getPagination, buildPaginationMeta, sanitizeString };
