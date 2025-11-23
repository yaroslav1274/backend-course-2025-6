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

// --- Обмеження методів (405) ---

// /register – лише POST
app.all('/register', (req, res, next) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }
  next();
});

// /inventory – лише GET
app.all('/inventory', (req, res, next) => {
  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }
  next();
});

// /inventory/:id – GET, PUT, DELETE
app.all('/inventory/:id', (req, res, next) => {
  const allowed = ['GET', 'PUT', 'DELETE'];
  if (!allowed.includes(req.method)) {
    return res.status(405).send('Method Not Allowed');
  }
  next();
});

// /inventory/:id/photo – GET, PUT
app.all('/inventory/:id/photo', (req, res, next) => {
  const allowed = ['GET', 'PUT'];
  if (!allowed.includes(req.method)) {
    return res.status(405).send('Method Not Allowed');
  }
  next();
});

// /search – лише POST
app.all('/search', (req, res, next) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }
  next();
});

// Форми – лише GET
app.all('/RegisterForm.html', (req, res, next) => {
  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }
  next();
});

app.all('/SearchForm.html', (req, res, next) => {
  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }
  next();
});

// --- Роздача HTML-форм ---

app.get('/RegisterForm.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'RegisterForm.html'));
});

app.get('/SearchForm.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'SearchForm.html'));
});