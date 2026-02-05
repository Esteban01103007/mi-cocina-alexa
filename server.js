const express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session'); // Recuerda: npm install express-session
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Configuración de Sesiones
app.use(session({
    secret: 'secreto-cocina-inteligente-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 } // La sesión dura 1 hora
}));

const DATA_FOLDER = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_FOLDER, 'inventario.json');

// Crear carpeta y archivo con estructura extendida si no existen
if (!fs.existsSync(DATA_FOLDER)) fs.mkdirSync(DATA_FOLDER);
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ productos: [], usuarios: [] }, null, 2));
}

// Helper para leer/escribir datos
const readData = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const writeData = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

// Middleware para proteger rutas (Solo deja pasar si hay sesión)
const authMiddleware = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    res.status(401).json({ error: "No autorizado" });
};

// --- RUTAS DE AUTENTICACIÓN ---

// Registro de nuevos usuarios
app.post('/api/register', (req, res) => {
    const { user, pass } = req.body;
    const data = readData();
    
    if (data.usuarios.find(u => u.user === user)) {
        return res.json({ success: false, message: "El usuario ya existe" });
    }

    data.usuarios.push({ user, pass });
    writeData(data);
    res.json({ success: true });
});

// Inicio de sesión
app.post('/api/login', (req, res) => {
    const { user, pass } = req.body;
    const data = readData();
    const usuario = data.usuarios.find(u => u.user === user && u.pass === pass);

    if (usuario) {
        req.session.userId = user; // Guardamos el usuario en la sesión
        res.json({ success: true });
    } else {
        res.json({ success: false, message: "Usuario o contraseña incorrectos" });
    }
});

// Cerrar sesión
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// --- RUTAS DE LA API (PROTEGIDAS) ---

// 1. Leer inventario
app.get('/api/inventario', authMiddleware, (req, res) => {
    const data = readData();
    res.json(data);
});

// 2. Agregar producto
app.post('/api/inventario', authMiddleware, (req, res) => {
    const data = readData();
    const nuevoProducto = {
        id: Date.now().toString(),
        ...req.body
    };
    data.productos.push(nuevoProducto);
    writeData(data);
    res.json({ success: true, producto: nuevoProducto });
});

// 3. Editar producto
app.put('/api/inventario/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    const data = readData();
    const index = data.productos.findIndex(p => p.id === id);

    if (index !== -1) {
        data.productos[index] = { id, ...req.body };
        writeData(data);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Producto no encontrado" });
    }
});

// --- SERVIR ARCHIVOS ESTÁTICOS ---
// Servimos el login sin protección
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// El resto de la carpeta public (incluyendo el index) requiere estar logueado
app.use((req, res, next) => {
    if (req.path === '/login.html' || req.session.userId) {
        return next();
    }
    res.redirect('/login.html');
});

app.use(express.static('public'));

app.listen(PORT, () => console.log(`Servidor de Cocina Inteligente en puerto ${PORT}`));
