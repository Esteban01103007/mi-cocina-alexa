let editingId = null;
const modal = document.getElementById("modal");
const tableBody = document.getElementById("tableBody");
const productForm = document.getElementById("productForm");

// Cargar productos al iniciar
window.onload = loadProducts;

async function loadProducts() {
    const res = await fetch('/api/inventario');
    const data = await res.json();
    renderTable(data.productos);
}

function renderTable(productos) {
    if (productos.length === 0) {
        tableBody.innerHTML = '<tr id="emptyRow"><td colspan="6" class="empty">No hay productos</td></tr>';
        return;
    }

    tableBody.innerHTML = productos.map(prod => {
        const [status, cls] = getStatus(prod.cantidad);
        return `
            <tr data-id="${prod.id}">
                <td>${prod.nombre}</td>
                <td>${prod.categoria}</td>
                <td>${prod.cantidad}</td>
                <td>${prod.unidad}</td>
                <td><span class="badge ${cls}">${status}</span></td>
                <td><button class="edit" onclick="openEdit('${prod.id}')">✏️</button></td>
            </tr>
        `;
    }).join('');
}

function getStatus(qty) {
    if (qty == 0) return ["Agotado", "out"];
    if (qty < 5) return ["Poco stock", "low"];
    return ["Disponible", "ok"];
}

function openAdd() {
    editingId = null;
    productForm.reset();
    document.getElementById("modalTitle").textContent = "Agregar producto";
    modal.classList.add("active");
}

async function openEdit(id) {
    editingId = id;
    const res = await fetch('/api/inventario');
    const data = await res.json();
    const prod = data.productos.find(p => p.id === id);

    document.getElementById("name").value = prod.nombre;
    document.getElementById("category").value = prod.categoria;
    document.getElementById("quantity").value = prod.cantidad;
    document.getElementById("unit").value = prod.unidad;

    document.getElementById("modalTitle").textContent = "Editar producto";
    modal.classList.add("active");
}

async function saveProduct(e) {
    e.preventDefault();
    const prodData = {
        nombre: document.getElementById("name").value,
        categoria: document.getElementById("category").value,
        cantidad: document.getElementById("quantity").value,
        unidad: document.getElementById("unit").value
    };

    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/inventario/${editingId}` : '/api/inventario';

    await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prodData)
    });

    closeModal();
    loadProducts();
}

function closeModal() { modal.classList.remove("active"); }