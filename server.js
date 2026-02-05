const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
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
app.get('/api/inventario', (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    res.json(data);
});

app.post('/api/inventario', (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const nuevoProducto = { id: Date.now().toString(), ...req.body };
    data.productos.push(nuevoProducto);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true, producto: nuevoProducto });
});

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

// --- RUTA PARA ALEXA (CORREGIDA PARA PANTALLA) ---
app.post('/alexa', (req, res) => {
    const requestType = req.body.request.type;
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const productos = data.productos;
    const miWebUrl = "https://mi-cocina-alexa.onrender.com"; // Tu URL de Render

    let mensaje = "";
    if (productos.length === 0) {
        mensaje = "Tu cocina está vacía.";
    } else {
        const lista = productos.map(p => `${p.cantidad} ${p.unidad} de ${p.nombre}`).join(", ");
        mensaje = `En tu inventario tienes: ${lista}`;
    }

    // Si el usuario dice "Abre mi cocina", mostramos la web
    if (requestType === 'LaunchRequest') {
        res.json({
            version: "1.0",
            response: {
                outputSpeech: { type: "PlainText", text: "Hola, abriendo tu inventario visual." },
                directives: [
                    {
                        type: "Alexa.Presentation.APL.RenderDocument",
                        version: "1.4",
                        document: {
                            type: "APL",
                            version: "1.4",
                            import: [{ name: "alexa-layouts", version: "1.2.0" }],
                            mainTemplate: {
                                items: [{
                                    type: "Frame",
                                    width: "100%",
                                    height: "100%",
                                    item: {
                                        type: "Webview",
                                        source: miWebUrl,
                                        width: "100%",
                                        height: "100%"
                                    }
                                }]
                            }
                        }
                    }
                ],
                shouldEndSession: false
            }
        });
    } else {
        // Respuesta normal de voz si solo pregunta qué hay
        res.json({
            version: "1.0",
            response: {
                outputSpeech: { type: "PlainText", text: mensaje },
                shouldEndSession: true
            }
        });
    }
});

app.listen(PORT, () => console.log(`Servidor encendido en puerto ${PORT}`));
