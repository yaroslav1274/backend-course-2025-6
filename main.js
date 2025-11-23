const express = require('express');
const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const multer = require('multer');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

// --- Частина 1: Параметри командного рядка ---
program
  .requiredOption('-h, --host <host>', 'server address')
  .requiredOption('-p, --port <port>', 'server port')
  .requiredOption('-c, --cache <path>', 'cache directory path');

program.parse(process.argv);
const options = program.opts();

// Створення директорії кешу, якщо не існує
if (!fs.existsSync(options.cache)) {
  fs.mkdirSync(options.cache, { recursive: true });
  console.log(`Created cache directory: ${options.cache}`);
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Налаштування Multer для завантаження фото ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, options.cache);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage });

// "База даних" у пам'яті
let inventory = [];

// --- Swagger конфігурація ---
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Inventory API',
      version: '1.0.0',
      description: 'API сервісу інвентаризації',
    },
    servers: [{ url: `http://${options.host}:${options.port}` }],
  },
  // Поточний файл
  apis: [__filename],
};

try {
  const swaggerSpec = swaggerJsdoc(swaggerOptions);
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
} catch (error) {
  console.error('Swagger generation error:', error);
}