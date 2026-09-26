// Lógica del Controlador de Presupuesto - Tarjeta de Crédito (Actualizada v2)

// Constantes y Claves de LocalStorage
const DEFAULT_BUDGET = 300000;
const BANK_LIMIT = 500000;
const STORAGE_EXPENSES_KEY = 'credit_budget_app_data_v1';
const STORAGE_LIMIT_KEY = 'credit_budget_app_limit_v1';

// Estado Global de la Aplicación
let personalBudget = DEFAULT_BUDGET;
let expenses = [];

// Elementos del DOM
const expenseForm = document.getElementById('expenseForm');
const expenseNameInput = document.getElementById('expenseName');
const expenseAmountInput = document.getElementById('expenseAmount');

const budgetForm = document.getElementById('budgetForm');
const budgetInput = document.getElementById('budgetInput');

const availableBudgetEl = document.getElementById('availableBudget');
const personalLimitDisplayEl = document.getElementById('personalLimitDisplay');
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

// Inicialización de la App
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

// Cargar y Guardar en LocalStorage
function saveExpensesToStorage() {
    localStorage.setItem(STORAGE_EXPENSES_KEY, JSON.stringify(expenses));
}

function saveBudgetToStorage() {
    localStorage.setItem(STORAGE_LIMIT_KEY, personalBudget.toString());
}

function loadFromLocalStorage() {
    // Cargar Gastos
    const savedExpenses = localStorage.getItem(STORAGE_EXPENSES_KEY);
    if (savedExpenses) {
        try { expenses = JSON.parse(savedExpenses); } catch (e) { expenses = []; }
    }

    // Cargar Presupuesto Personal Editable
    const savedBudget = localStorage.getItem(STORAGE_LIMIT_KEY);
    if (savedBudget && !isNaN(parseFloat(savedBudget))) {
        personalBudget = parseFloat(savedBudget);
    } else {
        personalBudget = DEFAULT_BUDGET;
    }

    // Cargar valor actual en el input
    budgetInput.value = personalBudget;
}

// Actualización Completa de la Interfaz (UI)
function updateUI() {
    // 1. Calcular Totales Matemáticos
    const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const availablePersonal = personalBudget - totalSpent;
    const availableBank = BANK_LIMIT - totalSpent;

    // Porcentaje del presupuesto gastado y disponible
    const rawSpentPercent = (totalSpent / personalBudget) * 100;
    const percentUsedBar = Math.min(Math.round(rawSpentPercent), 100);
    
    // Porcentaje de presupuesto DISPONIBLE restante
    const availablePercent = (availablePersonal / personalBudget) * 100;

    // 2. Renderizar Valores en Pantalla
    availableBudgetEl.textContent = formatCLP(availablePersonal);
    personalLimitDisplayEl.textContent = formatCLP(personalBudget);
    totalSpentEl.textContent = formatCLP(totalSpent);
    bankAvailableEl.textContent = formatCLP(availableBank);
    
    spentCountEl.textContent = `${expenses.length} ${expenses.length === 1 ? 'compra registrada' : 'compras registradas'}`;
    progressPercent.textContent = `${Math.round(rawSpentPercent)}%`;
    progressBar.style.width = `${percentUsedBar}%`;

    // 3. Reglas Exactas de Alertas por Porcentaje Disponible:
    // • 50% o más disponible -> "Presupuesto Sano" (Verde)
    // • Entre 35% y 49% disponible -> "¡Precaución!" (Amarillo/Naranja)
    // • Menos del 35% disponible -> "¡Queda poco presupuesto!" (Rojo)
    // • Saldo Negativo (< 0) -> "¡EXCEDIDO! Superaste tu tope personal" (Rojo Alerta)
    
    availableCard.classList.remove('status-green', 'status-yellow', 'status-red');

    if (availablePersonal < 0) {
        // Excedido
        availableCard.classList.add('status-red');
        statusIcon.className = 'fa-solid fa-circle-exclamation';
        statusText.textContent = '¡EXCEDIDO! Superaste tu tope personal';
        progressBar.style.background = 'var(--color-red)';
    } else if (availablePercent < 35) {
        // Menos del 35% disponible
        availableCard.classList.add('status-red');
        statusIcon.className = 'fa-solid fa-triangle-exclamation';
        statusText.textContent = '¡Queda poco presupuesto!';
        progressBar.style.background = 'var(--color-red)';
    } else if (availablePercent < 50) {
        // Entre 35% y 49% disponible
        availableCard.classList.add('status-yellow');
        statusIcon.className = 'fa-solid fa-triangle-exclamation';
        statusText.textContent = '¡Precaución!';
        progressBar.style.background = 'var(--color-yellow)';
    } else {
        // 50% o más disponible
        availableCard.classList.add('status-green');
        statusIcon.className = 'fa-solid fa-circle-check';
        statusText.textContent = 'Presupuesto Sano';
        progressBar.style.background = 'var(--color-green)';
    }

    // 4. Renderizar Lista de Movimientos
    renderHistory();
}

// Renderizar Historial
function renderHistory() {
    historyList.innerHTML = '';

    if (expenses.length === 0) {
        emptyHistory.style.display = 'block';
        historyList.style.display = 'none';
        return;
    }

    emptyHistory.style.display = 'none';
    historyList.style.display = 'flex';

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

// Evento: Actualizar Presupuesto Inicial Editable
budgetForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const newBudget = parseFloat(budgetInput.value);

    if (isNaN(newBudget) || newBudget <= 0) {
        alert('Por favor ingresa un presupuesto inicial válido mayor a 0.');
        return;
    }

    personalBudget = newBudget;
    saveBudgetToStorage();
    updateUI();
});

// Evento: Agregar Nueva Compra
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
    saveExpensesToStorage();
    updateUI();

    expenseForm.reset();
    expenseNameInput.focus();
});

// Eliminar Compra por ID
function deleteExpense(id) {
    expenses = expenses.filter(item => item.id !== id);
    saveExpensesToStorage();
    updateUI();
}

// Reiniciar Mes Completo
clearMonthBtn.addEventListener('click', () => {
    if (expenses.length === 0) return;

    if (confirm('¿Estás seguro de reiniciar el mes? Se borrarán todos los gastos registrados.')) {
        expenses = [];
        saveExpensesToStorage();
        updateUI();
    }
});

// Helper XSS
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}
