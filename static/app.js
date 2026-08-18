document.getElementById('order-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const sku = document.getElementById('sku').value.trim();
    const price = parseFloat(document.getElementById('price').value);
    const quantity = parseInt(document.getElementById('quantity').value);
    
    const resultDiv = document.getElementById('result');
    const errorDiv = document.getElementById('error');
    const calculateBtn = document.getElementById('calculate-btn');
    
    // Validate input
    if (!sku) {
        showError('SKU товара обязателен');
        return;
    }
    
    if (isNaN(price) || price < 0) {
        showError('Цена должна быть положительным числом');
        return;
    }
    
    if (isNaN(quantity) || quantity < 1) {
        showError('Количество должно быть положительным целым числом');
        return;
    }
    
    // Hide previous results
    resultDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');
    
    // Disable button and show loading state
    calculateBtn.disabled = true;
    calculateBtn.textContent = 'Расчёт...';
    
    try {
        const response = await fetch('/quote', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                items: [{ sku, price, qty: quantity }]
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Ошибка расчёта');
        }
        
        // Display results
        document.getElementById('goods-amount').textContent = formatCurrency(data.goods);
        document.getElementById('delivery-amount').textContent = formatCurrency(data.delivery);
        document.getElementById('total-amount').textContent = formatCurrency(data.total);
        
        resultDiv.classList.remove('hidden');
    } catch (error) {
        showError(error.message);
    } finally {
        calculateBtn.disabled = false;
        calculateBtn.textContent = 'Рассчитать';
    }
});

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(amount);
}