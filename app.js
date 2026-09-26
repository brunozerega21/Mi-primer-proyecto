// Lógica del Controlador de Presupuesto & Transferencias (v3.0)

const DEFAULT_BUDGET = 300000;
const BANK_LIMIT = 500000;

const STORAGE_EXPENSES_KEY = 'credit_budget_app_data_v1';
const STORAGE_TRANSFERS_KEY = 'credit_budget_transfers_v1';
const STORAGE_LIMIT_KEY = 'credit_budget_app_limit_v1';

// Estado Global de la Aplicación
let personalBudget = DEFAULT_BUDGET;
let expenses = [];
let transfers = [];

// Elementos del DOM - Formularios
const expenseForm = document.getElementById('expenseForm');
const expenseNameInput = document.getElementById('expenseName');
const expenseAmountInput = document.getElementById('expenseAmount');

const transferForm = document.getElementById('transferForm');
const transferNameInput = document.getElementById('transferName');
const transferAmountInput = document.getElementById('transferAmount');

const budgetForm = document.getElementById('budgetForm');
const budgetInput = document.getElementById('budgetInput');

// Elementos del DOM - Valores Financieros
const availableBudgetEl = document.getElementById('availableBudget');
const personalLimitDisplayEl = document.getElementById('personalLimitDisplay');

const totalCreditSpentEl = document.getElementById('totalCreditSpent');
const creditCountEl = document.getElementById('creditCount');

const totalTransferSpentEl = document.getElementById('totalTransferSpent');
const transferCountEl = document.getElementById('transferCount');

const bankAvailableEl = document.getElementById('bankAvailable');

// Elementos del DOM - Badges & Barras
const availableCard = document.getElementById('availableCard');
const statusIcon = document.getElementById('statusIcon');
const statusText = document.getElementById('statusText');

const progressBar = document.getElementById('progressBar');
const progressPercent = document.getElementById('progressPercent');

// Elementos del DOM - Historiales
const historyList = document.getElementById('historyList');
const emptyHistory = document.getElementById('emptyHistory');

const transfersList = document.getElementById('transfersList');
const emptyTransfersHistory = document.getElementById('emptyTransfersHistory');

const clearMonthBtn = document.getElementById('clearMonthBtn');
const clearTransfersBtn = document.getElementById('clearTransfersBtn');

// Inicialización de la Aplicación
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    updateUI();
});

// Limpiador Inteligente de Números (Maneja puntos de miles, $, espacios)
function parseCleanAmount(rawInput) {
    if (!rawInput) return NaN;
    const cleanDigits = String(rawInput).replace(/[^0-9]/g, '');
    if (!cleanDigits) return NaN;
    return parseInt(cleanDigits, 10);
}

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

// Persistencia en LocalStorage
function saveExpensesToStorage() {
    localStorage.setItem(STORAGE_EXPENSES_KEY, JSON.stringify(expenses));
}

function saveTransfersToStorage() {
    localStorage.setItem(STORAGE_TRANSFERS_KEY, JSON.stringify(transfers));
}

function saveBudgetToStorage() {
    localStorage.setItem(STORAGE_LIMIT_KEY, personalBudget.toString());
}

function loadFromLocalStorage() {
    // 1. Cargar Gastos Tarjeta
    const savedExpenses = localStorage.getItem(STORAGE_EXPENSES_KEY);
    if (savedExpenses) {
        try { expenses = JSON.parse(savedExpenses); } catch (e) { expenses = []; }
    }

    // 2. Cargar Transferencias
    const savedTransfers = localStorage.getItem(STORAGE_TRANSFERS_KEY);
    if (savedTransfers) {
        try { transfers = JSON.parse(savedTransfers); } catch (e) { transfers = []; }
    }

    // 3. Cargar Presupuesto Inicial Editable
    const savedBudget = localStorage.getItem(STORAGE_LIMIT_KEY);
    if (savedBudget && !isNaN(parseFloat(savedBudget))) {
        personalBudget = parseFloat(savedBudget);
    } else {
        personalBudget = DEFAULT_BUDGET;
    }

    budgetInput.value = formatCLP(personalBudget);
}

// Actualización Completa de la Interfaz (UI)
function updateUI() {
    // 1. Cálculos de Fórmulas Matemáticas
    const totalCreditSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const totalTransferSpent = transfers.reduce((acc, curr) => acc + curr.amount, 0);
    
    // Gastos Totales Combinados (Tarjeta + Transferencias)
    const totalGlobalSpent = totalCreditSpent + totalTransferSpent;
    
    // FÓRMULA PRINCIPAL: Presupuesto Disponible = Presupuesto Inicial - (Gastos Tarjeta + Transferencias)
    const availablePersonal = personalBudget - totalGlobalSpent;
    
    // Cupo Bancario Real de Tarjeta ($500.000 - Gastos Tarjeta)
    const availableBank = BANK_LIMIT - totalCreditSpent;

    // Porcentajes de Consumo
    const rawSpentPercent = (totalGlobalSpent / personalBudget) * 100;
    const percentUsedBar = Math.min(Math.round(rawSpentPercent), 100);
    const availablePercent = (availablePersonal / personalBudget) * 100;

    // 2. Renderizar Valores en Pantalla
    availableBudgetEl.textContent = formatCLP(availablePersonal);
    personalLimitDisplayEl.textContent = formatCLP(personalBudget);
    
    totalCreditSpentEl.textContent = formatCLP(totalCreditSpent);
    creditCountEl.textContent = `${expenses.length} ${expenses.length === 1 ? 'compra' : 'compras'}`;
    
    totalTransferSpentEl.textContent = formatCLP(totalTransferSpent);
    transferCountEl.textContent = `${transfers.length} ${transfers.length === 1 ? 'envío' : 'envíos'}`;

    bankAvailableEl.textContent = formatCLP(availableBank);
    
    progressPercent.textContent = `${Math.round(rawSpentPercent)}%`;
    progressBar.style.width = `${percentUsedBar}%`;

    // 3. Reglas de Alertas y Semaforización por Porcentaje Disponible Global:
    availableCard.classList.remove('status-green', 'status-yellow', 'status-red');

    if (availablePersonal < 0) {
        availableCard.classList.add('status-red');
        statusIcon.className = 'fa-solid fa-circle-exclamation';
        statusText.textContent = '¡EXCEDIDO! Superaste tu tope personal';
        progressBar.style.background = 'var(--color-red)';
    } else if (availablePercent < 35) {
        availableCard.classList.add('status-red');
        statusIcon.className = 'fa-solid fa-triangle-exclamation';
        statusText.textContent = '¡Queda poco presupuesto!';
        progressBar.style.background = 'var(--color-red)';
    } else if (availablePercent < 50) {
        availableCard.classList.add('status-yellow');
        statusIcon.className = 'fa-solid fa-triangle-exclamation';
        statusText.textContent = '¡Precaución!';
        progressBar.style.background = 'var(--color-yellow)';
    } else {
        availableCard.classList.add('status-green');
        statusIcon.className = 'fa-solid fa-circle-check';
        statusText.textContent = 'Presupuesto Sano';
        progressBar.style.background = 'var(--color-green)';
    }

    // 4. Renderizar Ambos Historiales
    renderCreditHistory();
    renderTransfersHistory();
}

// Renderizar Historial de Tarjeta de Crédito
function renderCreditHistory() {
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

// Renderizar Historial de Transferencias
function renderTransfersHistory() {
    transfersList.innerHTML = '';

    if (transfers.length === 0) {
        emptyTransfersHistory.style.display = 'block';
        transfersList.style.display = 'none';
        return;
    }

    emptyTransfersHistory.style.display = 'none';
    transfersList.style.display = 'flex';

    const reversedTransfers = [...transfers].reverse();

    reversedTransfers.forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `
            <div class="item-info">
                <h4>${escapeHTML(item.name)}</h4>
                <small><i class="fa-regular fa-clock"></i> ${item.date}</small>
            </div>
            <div class="item-actions">
                <span class="item-amount text-transfer">${formatCLP(item.amount)}</span>
                <button class="btn-delete" onclick="deleteTransfer(${item.id})" title="Eliminar transferencia">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
        transfersList.appendChild(li);
    });
}

// Evento: Presupuesto Inicial Editable
budgetForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const newBudget = parseCleanAmount(budgetInput.value);

    if (isNaN(newBudget) || newBudget <= 0) {
        alert('Por favor ingresa un presupuesto inicial válido mayor a 0.');
        return;
    }

    personalBudget = newBudget;
    budgetInput.value = formatCLP(personalBudget);
    saveBudgetToStorage();
    updateUI();
});

// Evento: Agregar Compra con Tarjeta
expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = expenseNameInput.value.trim();
    const amount = parseCleanAmount(expenseAmountInput.value);

    if (!name || isNaN(amount) || amount <= 0) {
        alert('Por favor ingresa un concepto y monto válido para la compra.');
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

// Evento: Agregar Nueva Transferencia
transferForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = transferNameInput.value.trim();
    const amount = parseCleanAmount(transferAmountInput.value);

    if (!name || isNaN(amount) || amount <= 0) {
        alert('Por favor ingresa el destinatario y monto válido de la transferencia.');
        return;
    }

    const newTransfer = {
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

    transfers.push(newTransfer);
    saveTransfersToStorage();
    updateUI();

    transferForm.reset();
    transferNameInput.focus();
});

// Eliminar Compra Tarjeta
function deleteExpense(id) {
    expenses = expenses.filter(item => item.id !== id);
    saveExpensesToStorage();
    updateUI();
}

// Eliminar Transferencia
function deleteTransfer(id) {
    transfers = transfers.filter(item => item.id !== id);
    saveTransfersToStorage();
    updateUI();
}

// Limpiar Compras de Tarjeta
clearMonthBtn.addEventListener('click', () => {
    if (expenses.length === 0) return;
    if (confirm('¿Deseas borrar las compras de tarjeta de este mes?')) {
        expenses = [];
        saveExpensesToStorage();
        updateUI();
    }
});

// Limpiar Transferencias
clearTransfersBtn.addEventListener('click', () => {
    if (transfers.length === 0) return;
    if (confirm('¿Deseas borrar el historial de transferencias de este mes?')) {
        transfers = [];
        saveTransfersToStorage();
        updateUI();
    }
});

// Helper XSS
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}
