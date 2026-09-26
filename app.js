// Lógica del Controlador de Presupuesto - Tarjeta de Crédito

// Reglas de Negocio Principales
const PERSONAL_LIMIT = 300000; // Tope personal mensual estricto
const BANK_LIMIT = 500000;     // Cupo bancario real total
const STORAGE_KEY = 'credit_budget_app_data_v1';

// Estado Inicial de la Aplicación
let expenses = [];

// Elementos del DOM
const expenseForm = document.getElementById('expenseForm');
const expenseNameInput = document.getElementById('expenseName');
const expenseAmountInput = document.getElementById('expenseAmount');

const availableBudgetEl = document.getElementById('availableBudget');
const totalSpentEl = document.getElementById('totalSpent');
const spentCountEl = document.getElementById('spentCount');
const bankAvailableEl = document.getElementById('bankAvailable');

const availableCard = document.getElementById('availableCard');
const statusBadge = document.getElementById('statusBadge');
const statusIcon = document.getElementById('statusIcon');
const statusText = document.getElementById('statusText');

const progressBar = document.getElementById('progressBar');
const progressPercent = document.getElementById('progressPercent');

const historyList = document.getElementById('historyList');
const emptyHistory = document.getElementById('emptyHistory');
const clearMonthBtn = document.getElementById('clearMonthBtn');

// Cargar Datos al Iniciar la Aplicación
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    updateUI();
});

// Formateador de Moneda Chilena (CLP)
function formatCLP(amount) {
    const isNegative = amount < 0;
    const absAmount = Math.abs(amount);
    
    const formatted = new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0
    }).format(absAmount);

    return isNegative ? `-${formatted}` : formatted;
}

// Guardar y Cargar de LocalStorage
function saveToLocalStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            expenses = JSON.parse(saved);
        } catch (e) {
            expenses = [];
        }
    }
}

// Actualización Completa de la Interfaz (UI)
function updateUI() {
    // 1. Calcular Totales
    const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const availablePersonal = PERSONAL_LIMIT - totalSpent;
    const availableBank = BANK_LIMIT - totalSpent;
    
    // Calcular Porcentaje consumido del presupuesto personal ($300.000)
    const rawPercent = (totalSpent / PERSONAL_LIMIT) * 100;
    const percentUsed = Math.min(Math.round(rawPercent), 100);

    // 2. Renderizar Valores Numéricos
    availableBudgetEl.textContent = formatCLP(availablePersonal);
    totalSpentEl.textContent = formatCLP(totalSpent);
    bankAvailableEl.textContent = formatCLP(availableBank);
    
    spentCountEl.textContent = `${expenses.length} ${expenses.length === 1 ? 'compra registrada' : 'compras registradas'}`;
    progressPercent.textContent = `${Math.round(rawPercent)}%`;
    progressBar.style.width = `${percentUsed}%`;

    // 3. Aplicar Lógica de Colores e Indicadores de Estado
    availableCard.classList.remove('status-green', 'status-yellow', 'status-red');
    
    // Regla de Semaforización:
    // Verde: Queda más de $60.000 (20% del presupuesto)
    // Amarillo: Queda entre $0 y $59.999 (Alerta de precaución)
    // Rojo: Menor a $0 (Excedido / Sobrepasó los $300.000)
    if (availablePersonal >= 60000) {
        availableCard.classList.add('status-green');
        statusIcon.className = 'fa-solid fa-circle-check';
        statusText.textContent = 'Presupuesto Sano';
        progressBar.style.background = 'var(--color-green)';
    } else if (availablePersonal >= 0) {
        availableCard.classList.add('status-yellow');
        statusIcon.className = 'fa-solid fa-triangle-exclamation';
        statusText.textContent = '¡Precaución! Queda poco presupuesto';
        progressBar.style.background = 'var(--color-yellow)';
    } else {
        availableCard.classList.add('status-red');
        statusIcon.className = 'fa-solid fa-circle-exclamation';
        statusText.textContent = '¡EXCEDIDO! Superaste tu tope personal';
        progressBar.style.background = 'var(--color-red)';
    }

    // 4. Renderizar Lista de Historial
    renderHistory();
}

// Renderizar la lista de historial
function renderHistory() {
    historyList.innerHTML = '';

    if (expenses.length === 0) {
        emptyHistory.style.display = 'block';
        historyList.style.display = 'none';
        return;
    }

    emptyHistory.style.display = 'none';
    historyList.style.display = 'flex';

    // Mostrar los más recientes primero
    const reversedExpenses = [...expenses].reverse();

    reversedExpenses.forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `
            <div class="item-info">
                <h4>${escapeHTML(item.name)}</h4>
                <small><i class="fa-regular fa-clock"></i> ${item.date}</small>
            </div>
            <div class="item-actions">
                <span class="item-amount">${formatCLP(item.amount)}</span>
                <button class="btn-delete" onclick="deleteExpense(${item.id})" title="Eliminar gasto">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
        historyList.appendChild(li);
    });
}

// Agregar Nuevo Gasto
expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = expenseNameInput.value.trim();
    const amount = parseFloat(expenseAmountInput.value);

    if (!name || isNaN(amount) || amount <= 0) {
        alert('Por favor ingresa un nombre y monto válido.');
        return;
    }

    const newExpense = {
        id: Date.now(),
        name: name,
        amount: amount,
        date: new Date().toLocaleDateString('es-CL', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        })
    };

    expenses.push(newExpense);
    saveToLocalStorage();
    updateUI();

    // Resetear formulario
    expenseForm.reset();
    expenseNameInput.focus();
});

// Eliminar Gasto por ID
function deleteExpense(id) {
    expenses = expenses.filter(item => item.id !== id);
    saveToLocalStorage();
    updateUI();
}

// Reiniciar Mes Completo
clearMonthBtn.addEventListener('click', () => {
    if (expenses.length === 0) return;

    if (confirm('¿Estás seguro de reiniciar el mes? Se borrarán todos los gastos registrados.')) {
        expenses = [];
        saveToLocalStorage();
        updateUI();
    }
});

// Helper para prevenir vulnerabilidades de texto (XSS)
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
