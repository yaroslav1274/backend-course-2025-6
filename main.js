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

// --- Ендпоінти (WebAPI) ---

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Реєстрація нового пристрою
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               inventory_name:
 *                 type: string
 *               description:
 *                 type: string
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Bad Request
 */
app.post('/register', upload.single('photo'), (req, res) => {
  const { inventory_name, description } = req.body;

  if (!inventory_name) {
    return res.status(400).send('Inventory name is required');
  }

  const newItem = {
    id: Date.now().toString(),
    name: inventory_name,
    description: description || '',
    photoPath: req.file ? req.file.filename : null,
  };

  inventory.push(newItem);
  res.status(201).send(`Inventory registered with ID: ${newItem.id}`);
});

/**
 * @swagger
 * /inventory:
 *   get:
 *     summary: Отримання списку всіх речей
 *     responses:
 *       200:
 *         description: JSON список речей
 */
app.get('/inventory', (req, res) => {
  const response = inventory.map((item) => ({
    ...item,
    photoUrl: item.photoPath
      ? `http://${options.host}:${options.port}/inventory/${item.id}/photo`
      : null,
  }));
  res.json(response);
});

/**
 * @swagger
 * /inventory/{id}:
 *   get:
 *     summary: Отримання інформації про конкретну річ
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Інформація про річ
 *       404:
 *         description: Not found
 *   put:
 *     summary: Оновлення імені або опису речі
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated
 *       404:
 *         description: Not found
 *   delete:
 *     summary: Видалення речі
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 *       404:
 *         description: Not found
 */
app.get('/inventory/:id', (req, res) => {
  const item = inventory.find((i) => i.id === req.params.id);
  if (!item) return res.status(404).send('Not found');

  res.json({
    ...item,
    photoUrl: item.photoPath
      ? `http://${options.host}:${options.port}/inventory/${item.id}/photo`
      : null,
  });
});

app.put('/inventory/:id', (req, res) => {
  const item = inventory.find((i) => i.id === req.params.id);
  if (!item) return res.status(404).send('Not found');

  if (req.body.name) item.name = req.body.name;
  if (req.body.description) item.description = req.body.description;

  res.json(item);
});

app.delete('/inventory/:id', (req, res) => {
  const index = inventory.findIndex((i) => i.id === req.params.id);
  if (index === -1) return res.status(404).send('Not found');

  if (inventory[index].photoPath) {
    const filePath = path.join(options.cache, inventory[index].photoPath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  inventory.splice(index, 1);
  res.send('Deleted');
});

/**
 * @swagger
 * /inventory/{id}/photo:
 *   get:
 *     summary: Отримання фото речі
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Фото зображення
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Not found
 *   put:
 *     summary: Оновлення фото речі
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Photo updated
 *       400:
 *         description: No photo uploaded
 *       404:
 *         description: Not found
 */
app.get('/inventory/:id/photo', (req, res) => {
  const item = inventory.find((i) => i.id === req.params.id);
  if (!item || !item.photoPath) return res.status(404).send('Photo not found');

  const filePath = path.join(options.cache, item.photoPath);
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.sendFile(filePath);
  } else {
    res.status(404).send('File not found');
  }
});

app.put('/inventory/:id/photo', upload.single('photo'), (req, res) => {
  const item = inventory.find((i) => i.id === req.params.id);
  if (!item) return res.status(404).send('Not found');

  if (!req.file) {
    return res.status(400).send('No photo uploaded');
  }

  // Видаляємо старе фото, якщо було
  if (item.photoPath) {
    const oldPath = path.join(options.cache, item.photoPath);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  item.photoPath = req.file.filename;
  res.send('Photo updated');
});

/**
 * @swagger
 * /search:
 *   post:
 *     summary: Пошук пристрою за ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               has_photo:
 *                 type: string
 *                 description: Прапорець (on/off), чи додавати посилання на фото в опис
 *     responses:
 *       200:
 *         description: Знайдено
 *       404:
 *         description: Not found
 */