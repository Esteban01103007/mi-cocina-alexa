const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// --- CONFIGURACIÓN DE SEGURIDAD (Cámbialo aquí) ---
const USUARIO_PROPIO = "admin"; 
const CLAVE_PROPIA = "cocina2026"; // <--- CAMBIA ESTO POR TU CLAVE

const authMiddleware = (req, res, next) => {
    // Si la petición viene de Alexa, la dejamos pasar sin contraseña (ella usa su propio ID de Skill)
    // Pero para la web (navegador), pedimos clave.
    if (req.path === '/alexa') return next();

    const auth = { login: USUARIO_PROPIO, password: CLAVE_PROPIA };
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    if (login && password && login === auth.login && password === auth.password) {
        return next();
    }

    res.set('WWW-Authenticate', 'Basic realm="Acceso Privado - Mi Cocina"');
    res.status(401).send('Acceso denegado. Se requiere usuario y contraseña.');
};

// Aplicamos la seguridad antes de servir los archivos y la API
app.use(authMiddleware);
app.use(express.static('public')); 

const DATA_FOLDER = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_FOLDER, 'inventario.json');

// --- SEGURIDAD: Crear carpeta y archivo si no existen ---
if (!fs.existsSync(DATA_FOLDER)) {
    fs.mkdirSync(DATA_FOLDER);
}
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ productos: [] }, null, 2));
}

// --- RUTAS PARA LA WEB ---

// 1. Leer inventario
app.get('/api/inventario', (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    res.json(data);
});

// 2. Agregar producto (POST)
app.post('/api/inventario', (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const nuevoProducto = {
        id: Date.now().toString(),
        ...req.body
    };
    data.productos.push(nuevoProducto);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true, producto: nuevoProducto });
});

// 3. Editar producto (PUT)
app.put('/api/inventario/:id', (req, res) => {
    const { id } = req.params;
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const index = data.productos.findIndex(p => p.id === id);

    if (index !== -1) {
        data.productos[index] = { id, ...req.body };
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Producto no encontrado" });
    }
});

// --- RUTA PARA ALEXA ---
app.post('/alexa', (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const productos = data.productos;
    
    let mensaje = "";
    if (productos.length === 0) {
        mensaje = "Tu cocina está vacía.";
    } else {
        const lista = productos.map(p => `${p.cantidad} ${p.unidad} de ${p.nombre}`).join(", ");
        mensaje = `En tu inventario tienes: ${lista}`;
    }

    res.json({
        version: "1.0",
        response: {
            outputSpeech: { type: "PlainText", text: mensaje },
            shouldEndSession: true
        }
    });
});

app.listen(PORT, () => console.log(`Servidor encendido en puerto ${PORT}`));
