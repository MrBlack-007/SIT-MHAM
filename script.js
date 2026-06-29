// ========== WORKING FULL VERSION ==========
console.log("Script loaded!");

let products = JSON.parse(localStorage.getItem('products')) || [
    { name: "Napoli Gold", price: 25000, cost: 22000, stock: 50, alertLimit: 5 },
    { name: "NPS SH", price: 24500, cost: 23160, stock: 35, alertLimit: 5 }
];
let customers = JSON.parse(localStorage.getItem('customers')) || ["Theint", "Mg Mg", "Aung Aung"];
let salesHistory = JSON.parse(localStorage.getItem('salesHistory')) || [];
let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
let currentCart = [];
let tempSelectedProducts = [];
let currentEditingVoucherId = null;
let currentReportType = 'daily';

// ========== HELPERS ==========

function parseDateStringToNum(dateStr) {
    if(!dateStr) return 0;
    let parts = dateStr.split('.');
    if(parts.length === 3) {
        let day = parts[0].padStart(2,'0');
        let month = parts[1].padStart(2,'0');
        let year = parts[2];
        return parseInt(year + month + day);
    }
    return 0;
}

function getToday() {
    let d = new Date();
    return d.getDate() + "." + (d.getMonth()+1) + "." + d.getFullYear();
}

function getNow() {
    let d = new Date();
    return d.getDate() + "." + (d.getMonth()+1) + "." + d.getFullYear() + " " + d.toLocaleTimeString();
}

// ========== CUSTOM ALERT & CONFIRM ==========
function showAlert(message, title) {
    let modal = document.getElementById('custom-alert-modal');
    if(!modal) { alert(message); return; }
    let titleEl = document.getElementById('alert-title');
    let msgEl = document.getElementById('alert-message');
    if(titleEl) titleEl.innerText = title || "Notification";
    if(msgEl) msgEl.innerText = message;
    modal.classList.add('open');
    let okBtn = document.getElementById('alert-ok-btn');
    let newBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newBtn, okBtn);
    newBtn.onclick = function() { modal.classList.remove('open'); };
}

function showConfirm(message, title, callback) {
    let modal = document.getElementById('custom-confirm-modal');
    if(!modal) { if(confirm(message)) callback(true); return; }
    let titleEl = document.getElementById('confirm-title');
    let msgEl = document.getElementById('confirm-message');
    if(titleEl) titleEl.innerText = title || "Confirm";
    if(msgEl) msgEl.innerText = message;
    modal.classList.add('open');
    let okBtn = document.getElementById('confirm-ok-btn');
    let cancelBtn = document.getElementById('confirm-cancel-btn');
    let newOk = okBtn.cloneNode(true);
    let newCancel = cancelBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOk, okBtn);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
    newOk.onclick = function() { modal.classList.remove('open'); callback(true); };
    newCancel.onclick = function() { modal.classList.remove('open'); callback(false); };
}

// ========== NAVIGATION ==========
function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    let targetPage = document.getElementById('page-' + pageId);
    let targetNav = document.getElementById('nav-' + pageId);
    if(targetPage) targetPage.classList.add('active');
    if(targetNav) targetNav.classList.add('active');
    if(pageId === 'home') renderHome();
    if(pageId === 'sell') { filterCustomer(); renderCart(); }
    if(pageId === 'products' || pageId === 'customers') renderLists();
    if(pageId === 'reports') renderReports();
}

// ========== HOME ==========
function renderHome() {
    let today = getToday();
    let todayNum = parseDateStringToNum(today);
    let todaySales = 0, todayCost = 0;
    
    for(let s of salesHistory) {
        if(s.date) {
            let saleDateStr = s.date.split(' ')[0];
            if(parseDateStringToNum(saleDateStr) === todayNum) {
                todaySales += s.total || 0;
                todayCost += s.cost || 0;
            }
        }
    }
    
    let salesEl = document.getElementById('home-total-sales');
    let costEl = document.getElementById('home-total-cost');
    let profitEl = document.getElementById('home-profit');
    let recentEl = document.getElementById('recent-sales-list');
    
    if(salesEl) salesEl.innerText = todaySales.toLocaleString() + " ကျပ်";
    if(costEl) costEl.innerText = todayCost.toLocaleString() + " ကျပ်";
    if(profitEl) profitEl.innerText = (todaySales - todayCost).toLocaleString() + " ကျပ်";
    
    if(recentEl) {
        recentEl.innerHTML = "";
        for(let i = salesHistory.length-1; i >= Math.max(0, salesHistory.length-5); i--) {
            let s = salesHistory[i];
            let li = document.createElement('li');
            li.innerHTML = "<b>" + (s.customer || 'No customer') + "</b> - " + s.total.toLocaleString() + " K<br><small>" + (s.date || '') + "</small>";
            recentEl.appendChild(li);
        }
    }
}

// ========== SELL PAGE ==========
function openProductModal() {
    let modal = document.getElementById('product-modal');
    let grid = document.getElementById('products-grid');
    if(!modal || !grid) return;
    
    grid.innerHTML = "";
    tempSelectedProducts = [];
    
    for(let i = 0; i < currentCart.length; i++) {
        tempSelectedProducts.push({...currentCart[i]});
    }
    
    if(products.length === 0) {
        grid.innerHTML = "<p style='text-align:center;padding:20px;'>No products yet</p>";
        modal.classList.add('open');
        return;
    }
    
    // Build HTML string instead of creating elements
    let html = '';
    for(let i = 0; i < products.length; i++) {
        let p = products[i];
        
        let qty = 0;
        for(let j = 0; j < tempSelectedProducts.length; j++) {
            if(tempSelectedProducts[j].name === p.name) {
                qty = tempSelectedProducts[j].qty;
                break;
            }
        }
        
        let selectedClass = qty > 0 ? 'selected' : '';
        let stockClass = p.stock <= 0 ? 'out-of-stock' : '';
        let badgeHtml = qty > 0 ? `<div class="badge">${qty}</div>` : '';
        
        html += `
            <div class="grid-item ${selectedClass} ${stockClass}" 
                 data-name="${p.name}"
                 data-price="${p.price}"
                 data-cost="${p.cost}"
                 data-stock="${p.stock}"
                 onclick="selectProduct(this)">
                <h4>${p.name}</h4>
                <p>${p.price.toLocaleString()} K</p>
                <span>Stock: ${p.stock}</span>
                ${badgeHtml}
            </div>
        `;
    }
    
    grid.innerHTML = html;
    modal.classList.add('open');
}

function closeProductModal() {
    document.getElementById('product-modal').classList.remove('open');
}

function confirmSelectedProducts() {
    currentCart = [];
    for(let i = 0; i < tempSelectedProducts.length; i++) {
        if(tempSelectedProducts[i].qty > 0) {
            currentCart.push({...tempSelectedProducts[i]});
        }
    }
    closeProductModal();
    renderCart();
}

function renderCart() {
    let cartDiv = document.getElementById('cart-items');
    if(!cartDiv) return;
    if(currentCart.length === 0) {
        cartDiv.innerHTML = "Cart is empty";
        cartDiv.className = "cart-empty-text";
        calculateSellPage();
        return;
    }
    cartDiv.className = "";
    cartDiv.innerHTML = "";
    for(let i = 0; i < currentCart.length; i++) {
        let item = currentCart[i];
        let prod = null;
        for(let p = 0; p < products.length; p++) {
            if(products[p].name === item.name) { prod = products[p]; break; }
        }
        let maxStock = prod ? prod.stock : 9999;
        let div = document.createElement('div');
        div.className = "cart-row";
        div.innerHTML =
            "<div style='flex:1'><b>" + item.name + "</b><br><small>" + item.price.toLocaleString() + " K</small></div>" +
            "<div style='display:flex;align-items:center;gap:4px;'>" +
                "<button class='qty-btn' onclick='changeQty(" + i + ",-1)'>−</button>" +
                "<input class='cart-qty-input' type='number' inputmode='numeric' min='1' max='" + maxStock + "' value='" + item.qty + "' data-idx='" + i + "' onfocus='this.select()' oninput='setQtyManual(this)' onblur='setQtyManual(this)'>" +
                "<button class='qty-btn' onclick='changeQty(" + i + ",1)'>+</button>" +
            "</div>" +
            "<div style='min-width:64px;text-align:right;'><b id='cart-row-total-" + i + "'>" + (item.price * item.qty).toLocaleString() + " K</b></div>";
        cartDiv.appendChild(div);
    }
    calculateSellPage();
}

function setQtyManual(input) {
    let idx = parseInt(input.dataset.idx);
    if(isNaN(idx) || idx < 0 || idx >= currentCart.length) return;
    let val = parseInt(input.value);
    if(isNaN(val) || val < 1) { input.value = currentCart[idx].qty; return; }
    let item = currentCart[idx];
    let prod = null;
    for(let i = 0; i < products.length; i++) {
        if(products[i].name === item.name) { prod = products[i]; break; }
    }
    if(prod && val > prod.stock) {
        val = prod.stock;
        input.value = val;
        showAlert(item.name + " — stock " + prod.stock + " ခုသာ ကျန်တော့တယ်!", "Stock Limit");
    }
    currentCart[idx].qty = val;
    let rowTotal = document.getElementById('cart-row-total-' + idx);
    if(rowTotal) rowTotal.textContent = (item.price * val).toLocaleString() + " K";
    calculateSellPage();
}

function changeQty(idx, amt) {
    if(idx < 0 || idx >= currentCart.length) return;
    let item = currentCart[idx];
    let prod = null;
    for(let i = 0; i < products.length; i++) {
        if(products[i].name === item.name) { prod = products[i]; break; }
    }
    if(amt > 0 && prod && item.qty >= prod.stock) {
        showAlert("Only " + prod.stock + " left in stock!", "Stock Limit");
        return;
    }
    item.qty += amt;
    if(item.qty <= 0) { currentCart.splice(idx, 1); }
    renderCart();
}

function calculateSellPage() {
    let sub = 0;
    for(let i = 0; i < currentCart.length; i++) {
        sub += currentCart[i].price * currentCart[i].qty;
    }
    let disc = parseFloat(document.getElementById('discount')?.value) || 0;
    let total = sub - disc;
    if(total < 0) total = 0;
    let totalEl = document.getElementById('sell-total');
    let discountEl = document.getElementById('sell-discount-val');
    let grandEl = document.getElementById('sell-grand-total');
    if(totalEl) totalEl.innerText = sub.toLocaleString() + " K";
    if(discountEl) discountEl.innerText = disc.toLocaleString() + " K";
    if(grandEl) grandEl.innerText = total.toLocaleString() + " K";
}

function completeSale() {
    if(currentCart.length === 0) {
        showAlert("Cart is empty!", "Empty Cart");
        return;
    }
    for(let i = 0; i < currentCart.length; i++) {
        let item = currentCart[i];
        let prod = null;
        for(let j = 0; j < products.length; j++) {
            if(products[j].name === item.name) { prod = products[j]; break; }
        }
        if(!prod || prod.stock < item.qty) {
            showAlert(item.name + " stock not enough! Only " + (prod?.stock || 0) + " left.", "Out of Stock");
            return;
        }
    }
    for(let i = 0; i < currentCart.length; i++) {
        let item = currentCart[i];
        for(let j = 0; j < products.length; j++) {
            if(products[j].name === item.name) {
                products[j].stock -= item.qty;
                break;
            }
        }
    }
    localStorage.setItem('products', JSON.stringify(products));
    let sub = 0, cost = 0;
    for(let i = 0; i < currentCart.length; i++) {
        sub += currentCart[i].price * currentCart[i].qty;
        cost += (currentCart[i].cost || 0) * currentCart[i].qty;
    }
    let disc = parseFloat(document.getElementById('discount')?.value) || 0;
    if(disc > sub) disc = sub;
    let cust = document.getElementById('customer-search')?.value.trim() || "No Customer";
if(cust !== "No Customer" && cust !== "") {
    let cleanName = cust.trim().toLowerCase();
    let customerIdx = customers.findIndex(c => c.trim().toLowerCase() === cleanName);
    
    if(customerIdx === -1) {
        customers.push(cust.trim());
        localStorage.setItem('customers', JSON.stringify(customers));
        renderLists();
        filterCustomer();
    }
}
  
    let now = new Date();
    let dateTimeStr = now.getDate() + "." + (now.getMonth()+1) + "." + now.getFullYear() + " " + now.toLocaleTimeString();
    let sale = {
        id: Date.now().toString(),
        customer: cust,
        subtotal: sub,
        discount: disc,
        total: sub - disc,
        cost: cost,
        date: dateTimeStr,
        items: []
    };
    for(let i = 0; i < currentCart.length; i++) {
        sale.items.push({...currentCart[i]});
    }
    salesHistory.push(sale);
    localStorage.setItem('salesHistory', JSON.stringify(salesHistory));
    generateVoucherUI(cust, sub, disc, dateTimeStr, currentCart);
    document.getElementById('discount').value = "";
    document.getElementById('customer-search').value = "";
    currentCart = [];
    renderCart();
    renderHome();
    filterCustomer();
}

function generateVoucherUI(customer, subtotal, discount, date, items) {
    let body = document.getElementById('voucher-receipt-body');
    if(!body) return;
    
    let grandTotal = subtotal - discount;
    let rows = "";
    
    for(let i = 0; i < items.length; i++) {
        let item = items[i];
        rows += `
            <tr style="border-bottom: 1px solid #ddd;">
                <td class="text-center" style="padding: 12px 6px; font-weight: 500; font-size: 15px;">${i + 1}</td>
                <td style="padding: 12px 6px; font-weight: 500; font-size: 15px;"><b>${item.name}</b></td>
                <td class="text-center" style="padding: 12px 6px; font-weight: 500; font-size: 15px;">${item.qty}</td>
                <td class="text-right" style="padding: 12px 6px; font-weight: 500; font-size: 15px;">${item.price.toLocaleString()}</td>
                <td class="text-right" style="padding: 12px 6px; font-weight: 700; font-size: 15px;"><b>${(item.price * item.qty).toLocaleString()}</b></td>
            </tr>
        `;
    }
    
    body.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px; font-family: 'Segoe UI', Arial, sans-serif;">
            <h2 style="font-size: 26px; margin-bottom: 6px; font-weight: 800; color: #1e3a2f;">SIT MHAN</h2>
            <p style="font-size: 14px; color: #555; font-weight: 600;">Distribution & Retail </p>
            <p style="font-size: 12px; margin-top: 8px;">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
        </div>
        
        <div style="font-size: 16px; margin-bottom: 20px; line-height: 1.8; font-weight: 500;">
            <div><b>Date:</b> ${date}</div>
            <div><b>Customer:</b> ${customer}</div>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
            <thead>
                <tr style="background: #2e7d32; color: white;">
                    <th class="text-center" style="padding: 12px 6px; font-weight: 700;">No.</th>
                    <th style="padding: 12px 6px; font-weight: 700;">Item</th>
                    <th class="text-center" style="padding: 12px 6px; font-weight: 700;">Qty</th>
                    <th class="text-right" style="padding: 12px 6px; font-weight: 700;">Price</th>
                    <th class="text-right" style="padding: 12px 6px; font-weight: 700;">Total</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
        
        <p style="font-size: 12px; margin-top: 16px;">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
        
        <div style="font-size: 17px; font-weight: 700; line-height: 2; margin-top: 12px;">
            <div style="display: flex; justify-content: space-between;">
                <span>Subtotal :</span>
                <span>${subtotal.toLocaleString()} K</span>
            </div>
            <div style="display: flex; justify-content: space-between; color: #c62828;">
                <span>Discount :</span>
                <span>- ${discount.toLocaleString()} K</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 22px; margin-top: 12px; border-top: 2px solid #333; padding-top: 12px;">
                <span style="font-weight: 800;">Grand Total :</span>
                <span style="color: #1a5e20; font-weight: 900;">${grandTotal.toLocaleString()} K</span>
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 28px;">
            <p style="font-size: 16px; font-weight: 800; color: #1e3a2f;">ဝယ်ယူအားပေးမှုကို ကျေးဇူးတင်ပါသည်။</p>
            <p style="font-size: 13px; font-weight: 500; margin-top: 6px;">Thank You for Your Purchase!</p>
        </div>
    `;
    
    document.getElementById('voucher-modal').classList.add('open');
}

function printVoucher() {
    let voucherContent = document.getElementById('voucher-receipt-body').innerHTML;
    let paperSize = localStorage.getItem('paperSize') || "80";
    
    // Set width based on paper size
    let bodyWidth = (paperSize === "58") ? "58mm" : "80mm";
    let fontSize = (paperSize === "58") ? "10px" : "12px";
    let tableFontSize = (paperSize === "58") ? "9px" : "11px";
    let titleFontSize = (paperSize === "58") ? "14px" : "18px";
    
    let printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Voucher</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: 'Courier New', monospace;
                    padding: 8px;
                    width: ${bodyWidth};
                    margin: 0 auto;
                    font-size: ${fontSize};
                }
                .receipt-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: ${tableFontSize};
                }
                .receipt-table th, .receipt-table td {
                    padding: 4px 2px;
                    text-align: left;
                    border-bottom: 1px dashed #ccc;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                h2 { 
                    font-size: ${titleFontSize}; 
                    text-align: center; 
                    margin-bottom: 5px;
                }
                .divider { 
                    text-align: center; 
                    margin: 5px 0; 
                }
                .total-row { 
                    display: flex; 
                    justify-content: space-between; 
                    margin: 5px 0;
                    font-weight: bold;
                }
                .thankyou { 
                    text-align: center; 
                    margin-top: 15px; 
                    font-size: ${(paperSize === "58") ? "9px" : "11px"};
                }
                @page {
                    size: ${bodyWidth} auto;
                    margin: 0mm;
                }
            </style>
        </head>
        <body>
            ${voucherContent}
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() {
                        window.close();
                    }, 500);
                };
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function setPaperSize(size) {
    localStorage.setItem('paperSize', size);
    showAlert("Paper size set to " + size + "mm", "Settings");
}

function loadPaperSize() {
    let savedSize = localStorage.getItem('paperSize');
    if(savedSize) {
        let radios = document.querySelectorAll('input[name="paper-size"]');
        for(let i = 0; i < radios.length; i++) {
            if(radios[i].value === savedSize) {
                radios[i].checked = true;
                break;
            }
        }
    }
}

function closeVoucherModal() { document.getElementById('voucher-modal').classList.remove('open'); switchPage('home'); }

// ========== REPORTS ==========

function renderReports() {
    let filteredSales = [];
    let filteredExpenses = [];

    if(currentReportType === 'daily') {
        let startDate = document.getElementById('report-start-date')?.value;
        let endDate = document.getElementById('report-end-date')?.value;
        
        console.log("Daily Report - Start:", startDate, "End:", endDate);
        
        if(startDate && endDate) {
            // HTML Input ကရတဲ့ YYYY-MM-DD ကို ကိန်းဂဏန်းပြောင်းခြင်း
            let startNum = parseInt(startDate.replace(/-/g, ''));
            let endNum = parseInt(endDate.replace(/-/g, ''));
            
            for(let i = 0; i < salesHistory.length; i++) {
                let sale = salesHistory[i];
                if(!sale.date) continue;
                
                let saleDateStr = sale.date.split(' ')[0];
                let saleNum = parseDateStringToNum(saleDateStr);
                
                if(saleNum >= startNum && saleNum <= endNum) {
                    filteredSales.push(sale);
                }
            }
            
            // Expenses စစ်ခြင်း
            for(let i = 0; i < expenses.length; i++) {
                let exp = expenses[i];
                if(!exp.date) continue;
                
                let expDateStr = exp.date.split(' ')[0];
                let expNum = parseDateStringToNum(expDateStr);
                
                if(expNum >= startNum && expNum <= endNum) {
                    filteredExpenses.push(exp);
                }
            }
        } else {
            // ရက်စွဲမရွေးထားရင် ဒီနေ့စာရင်းပဲပြမယ်
            let today = getToday();
            let todayNum = parseDateStringToNum(today);
            console.log("No date range, showing today:", today);
            
            for(let i = 0; i < salesHistory.length; i++) {
                let sale = salesHistory[i];
                let saleDate = sale.date ? sale.date.split(' ')[0] : '';
                if(parseDateStringToNum(saleDate) === todayNum) {
                    filteredSales.push(sale);
                }
            }
            
            for(let i = 0; i < expenses.length; i++) {
                let exp = expenses[i];
                let expDate = exp.date ? exp.date.split(' ')[0] : '';
                if(parseDateStringToNum(expDate) === todayNum) {
                    filteredExpenses.push(exp);
                }
            }
        }
    } else {
    // Monthly report (လစဉ်အစီရင်ခံစာ) - အမှန်ပြင်ဆင်ထားသော Logic
    let selectedMonth = document.getElementById('report-month')?.value;
    if(selectedMonth) {
        let [year, month] = selectedMonth.split('-');
        let targetYear = parseInt(year, 10);
        let targetMonth = parseInt(month, 10); // 08 ဖြစ်နေရင်လည်း 8 အဖြစ် စိတ်ချရအောင် ပြောင်းလဲခြင်း
        
        for(let i = 0; i < salesHistory.length; i++) {
            let sale = salesHistory[i];
            if(!sale.date) continue;
            let saleDate = sale.date.split(' ')[0];
            let parts = saleDate.split('.');
            if(parts.length === 3) {
                let saleYear = parseInt(parts[2], 10);
                let saleMonth = parseInt(parts[1], 10);
                if(saleYear === targetYear && saleMonth === targetMonth) {
                    filteredSales.push(sale);
                }
            }
        }
        
        for(let i = 0; i < expenses.length; i++) {
            let exp = expenses[i];
            if(!exp.date) continue;
            let expDate = exp.date.split(' ')[0];
            let parts = expDate.split('.');
            if(parts.length === 3) {
                let expYear = parseInt(parts[2], 10);
                let expMonth = parseInt(parts[1], 10);
                if(expYear === targetYear && expMonth === targetMonth) {
                    filteredExpenses.push(exp);
                }
            }
        }
    } else {
        // No month selected - show current month
        let now = new Date();
        let currentYear = now.getFullYear();
        let currentMonth = now.getMonth() + 1;
        
        for(let i = 0; i < salesHistory.length; i++) {
            let sale = salesHistory[i];
            if(!sale.date) continue;
            let saleDate = sale.date.split(' ')[0];
            let parts = saleDate.split('.');
            if(parts.length === 3) {
                let saleYear = parseInt(parts[2], 10);
                let saleMonth = parseInt(parts[1], 10);
                if(saleYear === currentYear && saleMonth === currentMonth) {
                    filteredSales.push(sale);
                }
            }
        }
        
        for(let i = 0; i < expenses.length; i++) {
            let exp = expenses[i];
            if(!exp.date) continue;
            let expDate = exp.date.split(' ')[0];
            let parts = expDate.split('.');
            if(parts.length === 3) {
                let expYear = parseInt(parts[2], 10);
                let expMonth = parseInt(parts[1], 10);
                if(expYear === currentYear && expMonth === currentMonth) {
                    filteredExpenses.push(exp);
                }
            }
        }
    }
 }
    
    // Calculate totals
    let revenue = 0, cost = 0;
    for(let i = 0; i < filteredSales.length; i++) {
        revenue += filteredSales[i].total || 0;
        cost += filteredSales[i].cost || 0;
    }
    
    let expTotal = 0;
    for(let i = 0; i < filteredExpenses.length; i++) {
        expTotal += filteredExpenses[i].amount || 0;
    }
    
    let profit = revenue - cost;
    let net = profit - expTotal;
    
    // Update display
    let revEl = document.getElementById('rep-revenue');
    let profitEl = document.getElementById('rep-profit');
    let expEl = document.getElementById('rep-expense');
    let netEl = document.getElementById('rep-net');
    
    if(revEl) revEl.innerText = revenue.toLocaleString() + " K";
    if(profitEl) profitEl.innerText = profit.toLocaleString() + " K";
    if(expEl) expEl.innerText = expTotal.toLocaleString() + " K";
    if(netEl) {
        netEl.innerText = net.toLocaleString() + " K";
        netEl.style.color = net >= 0 ? "#2e7d32" : "#c62828";
    }
    let whC=0,whQ=0,caC=0,caQ=0;
    for(let i=0;i<products.length;i++){let p=products[i];whC+=(p.warehouseStock||0)*(p.cost||0);whQ+=(p.warehouseStock||0);caC+=(p.stock||0)*(p.cost||0);caQ+=(p.stock||0);}
    let e1=document.getElementById('rep-warehouse-cost'),e2=document.getElementById('rep-warehouse-qty'),e3=document.getElementById('rep-car-cost'),e4=document.getElementById('rep-car-qty'),e5=document.getElementById('rep-total-stock-value');
    if(e1)e1.innerText=whC.toLocaleString()+" K";if(e2)e2.innerText=whQ+" ခု";if(e3)e3.innerText=caC.toLocaleString()+" K";if(e4)e4.innerText=caQ+" ခု";if(e5)e5.innerText=(whC+caC).toLocaleString()+" K";
    
    // Transaction history
    let container = document.getElementById('report-sales-list');
    if(container) {
        container.innerHTML = "";
        if(filteredSales.length === 0) {
            container.innerHTML = "<li>No transactions in this period</li>";
        } else {
            let today = getToday();
            for(let i = filteredSales.length - 1; i >= 0; i--) {
                let s = filteredSales[i];
                let saleDate = s.date ? s.date.split(' ')[0] : '';
                let isToday = (saleDate === today);
                
                let li = document.createElement('li');
                li.style.cssText = "display:block; margin-bottom:12px; padding:16px; border-radius:16px; background:#fafafa; border:1px solid #e0e0e0;";
                li.innerHTML = `
                    <div style='display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; margin-bottom:8px;'>
                        <div>
                            <span style='font-weight:bold;'>${s.customer || 'No customer'}</span>
                            <span style='color:#2e7d32; font-weight:bold; margin-left:10px;'>${s.total.toLocaleString()} K</span>
                        </div>
                        <div style='font-size:12px; color:gray;'>📅 ${s.date || ''}</div>
                    </div>
                    <div style='display:flex; gap:10px; margin-top:10px;'>
                        <button onclick='viewSaleDetails("${s.id}")' style='flex:1; padding:8px; border:none; border-radius:30px; background:#1976d2; color:white; cursor:pointer;'>👁️ View</button>
                        <button onclick='deleteSale("${s.id}")' style='flex:1; padding:8px; border:none; border-radius:30px; background:#c62828; color:white; cursor:pointer;'>🗑️ Delete</button>
                    </div>
                    ${isToday ? "<div style='margin-top:8px; font-size:11px; color:#2e7d32; background:#e8f5e9; display:inline-block; padding:4px 12px; border-radius:20px;'>📅 Today (can edit)</div>" : ""}
                `;
                container.appendChild(li);
            }
        }
    }
    
    // Expenses list
    let expContainer = document.getElementById('report-expense-list');
    if(expContainer) {
        expContainer.innerHTML = "";
        if(filteredExpenses.length === 0) {
            expContainer.innerHTML = "<li>No expenses in this period</li>";
        } else {
            for(let i = filteredExpenses.length - 1; i >= 0; i--) {
                let e = filteredExpenses[i];
                let li = document.createElement('li');
                li.innerHTML = `<b>${e.title}</b> - ${e.amount.toLocaleString()} K<br><small>${e.date}</small>`;
                expContainer.appendChild(li);
            }
        }
    }
    
    // Best sellers
    renderBestSellers(filteredSales);
}

function renderBestSellers(sales) {
    let container = document.getElementById('top-selling-container');
    if(!container) return;
    
    container.innerHTML = "";
    
    if(sales.length === 0) {
        container.innerHTML = "<p style='font-size:12px; color:gray; text-align:center; padding:16px;'>No sales data yet</p>";
        return;
    }
    
    // Count products
    let productCounts = {};
    let totalQty = 0;
    
    for(let i = 0; i < sales.length; i++) {
        let sale = sales[i];
        if(sale.items) {
            for(let j = 0; j < sale.items.length; j++) {
                let item = sale.items[j];
                let name = item.name;
                let qty = item.qty;
                
                if(productCounts[name]) {
                    productCounts[name] += qty;
                } else {
                    productCounts[name] = qty;
                }
                totalQty += qty;
            }
        }
    }
    
    // Convert to array and sort
    let sorted = [];
    for(let name in productCounts) {
        sorted.push({ name: name, qty: productCounts[name] });
    }
    sorted.sort(function(a, b) {
        return b.qty - a.qty;
    });
    
    // Display top 5
    for(let i = 0; i < Math.min(sorted.length, 5); i++) {
        let item = sorted[i];
        let percentage = totalQty > 0 ? ((item.qty / totalQty) * 100).toFixed(1) : 0;
        
        let div = document.createElement('div');
        div.className = "top-sell-row";
        div.innerHTML = `
            <div class="top-sell-info">
                <span><b>${item.name}</b></span>
                <span>${item.qty} sold (${percentage}%)</span>
            </div>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${percentage}%"></div>
            </div>
        `;
        container.appendChild(div);
    }
    
    if(sorted.length === 0) {
        container.innerHTML = "<p style='font-size:12px; color:gray; text-align:center; padding:16px;'>No sales data yet</p>";
    }
}

function saveExpense() {
    let title = document.getElementById('exp-title')?.value.trim();
    let amt = parseFloat(document.getElementById('exp-amount')?.value) || 0;
    if(!title || amt <= 0) { showAlert("Fill correctly!", "Missing"); return; }
    expenses.push({ title: title, amount: amt, date: getNow() });
    localStorage.setItem('expenses', JSON.stringify(expenses));
    document.getElementById('exp-title').value = "";
    document.getElementById('exp-amount').value = "";
    renderReports();
    showAlert("Expense saved!", "Success");
}

// ========== VIEW SALE DETAILS ==========
function viewSaleDetails(id) {
    let sale = null;
    for(let i = 0; i < salesHistory.length; i++) {
        if(salesHistory[i].id == id) { sale = salesHistory[i]; break; }
    }
    if(!sale) { showAlert("Sale not found!", "Error"); return; }
    
    let today = getToday();
    let saleDate = sale.date ? sale.date.split(' ')[0] : '';
    
    // စာသားချင်း မယှဉ်ဘဲ ကိန်းဂဏန်းပြောင်းပြီး စိတ်ချလက်ချ ယှဉ်ခြင်း
    let isToday = (parseDateStringToNum(saleDate) === parseDateStringToNum(today));
    
    let itemsText = "";
    for(let i = 0; i < sale.items.length; i++) {
        let item = sale.items[i];
        itemsText += (i+1) + ". " + item.name + " x" + item.qty + " = " + (item.price * item.qty).toLocaleString() + " K\n";
    }
    
    if(isToday) {
        showConfirm("This is today's sale.\n\nCustomer: " + sale.customer + "\nTotal: " + sale.total.toLocaleString() + " K\n\nDo you want to edit this sale?", "Edit Sale", function(result) {
            if(result) { editVoucher(id); }
        });
    } else {
        showAlert("SALE DETAILS\n\nCustomer: " + sale.customer + "\nTotal: " + sale.total.toLocaleString() + " K\nDate: " + sale.date + "\nDiscount: " + (sale.discount || 0) + " K\n\nItems:\n" + itemsText, "Sale Details");
    }
}

// ========== DELETE SALE ==========
function deleteSale(id) {
    showConfirm("Delete this sale?\n\nStock will be restored automatically.", "Delete Sale", function(result) {
        if(result) {
            let saleIndex = -1;
            for(let i = 0; i < salesHistory.length; i++) {
                if(salesHistory[i].id == id) { saleIndex = i; break; }
            }
            if(saleIndex === -1) return;
            let sale = salesHistory[saleIndex];
            for(let i = 0; i < sale.items.length; i++) {
                let item = sale.items[i];
                for(let j = 0; j < products.length; j++) {
                    if(products[j].name === item.name) {
                        products[j].stock += item.qty;
                        break;
                    }
                }
            }
            salesHistory.splice(saleIndex, 1);
            localStorage.setItem('products', JSON.stringify(products));
            localStorage.setItem('salesHistory', JSON.stringify(salesHistory));
            showAlert("Sale deleted! Stock restored.", "Deleted");
            renderReports();
            renderHome();
            renderLists();
        }
    });
}

// ========== EDIT VOUCHER ==========
function editVoucher(id) {
    currentEditingVoucherId = id;
    let sale = null;
    for(let i = 0; i < salesHistory.length; i++) {
        if(salesHistory[i].id == id) { sale = salesHistory[i]; break; }
    }
    if(!sale) return;
    let body = document.getElementById('edit-voucher-body');
    if(!body) return;
    let itemsHtml = "";
    for(let i = 0; i < sale.items.length; i++) {
        let item = sale.items[i];
        let orig = null;
        for(let j = 0; j < products.length; j++) {
            if(products[j].name === item.name) { orig = products[j]; break; }
        }
        let max = (orig ? orig.stock : 0) + item.qty;
        itemsHtml += "<div style='background:white; border:1px solid #eee; border-radius:12px; padding:12px; margin-bottom:10px;'><p><b>" + item.name + "</b> (Max: " + max + ")</p><div style='display:flex; gap:10px;'><input type='number' class='edit-qty' data-name='" + item.name + "' value='" + item.qty + "' style='width:80px; padding:8px; border-radius:8px; border:1px solid #ddd;'><input type='number' class='edit-price' data-name='" + item.name + "' value='" + item.price + "' style='width:100px; padding:8px; border-radius:8px; border:1px solid #ddd;'></div></div>";
    }
    body.innerHTML = "<p><b>Customer:</b> " + sale.customer + "</p><p><b>Date:</b> " + sale.date + "</p><hr>" + itemsHtml + "<div style='margin-top:15px;'><label style='font-weight:bold;'>Discount:</label><input type='number' id='edit-discount' value='" + (sale.discount || 0) + "' style='width:100%; padding:10px; border-radius:8px; border:1px solid #ddd;'></div>";
    document.getElementById('edit-voucher-modal').classList.add('open');
}

function closeEditVoucherModal() {
    document.getElementById('edit-voucher-modal').classList.remove('open');
    currentEditingVoucherId = null;
}

function updateVoucherData() {
    let idx = -1;
    for(let i = 0; i < salesHistory.length; i++) {
        if(salesHistory[i].id == currentEditingVoucherId) { idx = i; break; }
    }
    if(idx === -1) return;
    let sale = salesHistory[idx];
    for(let i = 0; i < sale.items.length; i++) {
        let item = sale.items[i];
        for(let j = 0; j < products.length; j++) {
            if(products[j].name === item.name) {
                products[j].stock += item.qty;
                break;
            }
        }
    }
    let qtys = document.querySelectorAll('.edit-qty');
    let prices = document.querySelectorAll('.edit-price');
    let newItems = [];
    for(let i = 0; i < qtys.length; i++) {
        let name = qtys[i].getAttribute('data-name');
        let qty = parseInt(qtys[i].value) || 0;
        let price = parseFloat(prices[i].value) || 0;
        let product = null;
        for(let j = 0; j < products.length; j++) {
            if(products[j].name === name) { product = products[j]; break; }
        }
        if(qty < 0) { showAlert("Invalid quantity!", "Error"); return; }
        if(product && qty > product.stock) {
            showAlert(name + " only " + product.stock + " left!", "Stock Limit");
            return;
        }
        newItems.push({ name: name, price: price, cost: product ? product.cost : 0, qty: qty });
    }
    for(let i = 0; i < newItems.length; i++) {
        let item = newItems[i];
        for(let j = 0; j < products.length; j++) {
            if(products[j].name === item.name) {
                products[j].stock -= item.qty;
                break;
            }
        }
    }
    let newDiscount = parseFloat(document.getElementById('edit-discount')?.value) || 0;
    let newSub = 0, newCost = 0;
    for(let i = 0; i < newItems.length; i++) {
        newSub += newItems[i].price * newItems[i].qty;
        newCost += newItems[i].cost * newItems[i].qty;
    }
    sale.items = newItems.filter(i => i.qty > 0);
    sale.subtotal = newSub;
    sale.discount = newDiscount;
    sale.total = newSub - newDiscount;
    sale.cost = newCost;
    localStorage.setItem('products', JSON.stringify(products));
    localStorage.setItem('salesHistory', JSON.stringify(salesHistory));
    showAlert("Voucher updated!", "Success");
    closeEditVoucherModal();
    renderReports();
    renderHome();
    renderLists();
}

// ========== PRODUCTS ==========
function saveProduct() {
    let name = document.getElementById('p-name').value.trim();
    let price = parseFloat(document.getElementById('p-price').value) || 0;
    let cost = parseFloat(document.getElementById('p-cost').value) || 0;
    let stock = parseInt(document.getElementById('p-stock').value) || 0;
    let alertL = parseInt(document.getElementById('p-alert').value) || 5;
    let editIdx = parseInt(document.getElementById('edit-product-index').value) || -1;
    
    if(!name) {
        showAlert("Enter product name!", "Missing");
        return;
    }
    
    // If edit mode, use updateProduct instead
    if(editIdx !== -1) {
        updateProduct();
        return;
    }
    
    // Check duplicate for new product
    for(let i = 0; i < products.length; i++) {
        if(products[i].name.toLowerCase() === name.toLowerCase()) {
            showAlert("Product \"" + name + "\" already exists!", "Duplicate");
            return;
        }
    }
    
    products.push({ name, price, cost, stock, warehouseStock: 0, alertLimit: alertL });
    localStorage.setItem('products', JSON.stringify(products));
    showAlert("Product \"" + name + "\" added successfully!", "Added");
    
    resetProductForm();
    renderLists();
}

function editProduct(idx) {
    let p = products[idx];
    document.getElementById('p-name').value = p.name;
    document.getElementById('p-price').value = p.price;
    document.getElementById('p-cost').value = p.cost;
    document.getElementById('p-stock').value = p.stock;
    document.getElementById('p-alert').value = p.alertLimit || 5;
    document.getElementById('edit-product-index').value = idx;
    document.getElementById('product-form-title').innerText = "Edit Product";
    document.getElementById('product-action-buttons').innerHTML = `
        <button class="btn-block btn-update-product" onclick="updateProduct()">Update Product</button>
        <button class="btn-block btn-cancel-edit" onclick="cancelProductEdit()">Cancel</button>
    `;
}

function updateProduct() {
    let idx = parseInt(document.getElementById('edit-product-index').value);
    if(idx === -1) return;
    
    let name = document.getElementById('p-name').value.trim();
    let price = parseFloat(document.getElementById('p-price').value) || 0;
    let cost = parseFloat(document.getElementById('p-cost').value) || 0;
    let stock = parseInt(document.getElementById('p-stock').value) || 0;
    let alertL = parseInt(document.getElementById('p-alert').value) || 5;
    
    if(!name) {
        showAlert("Enter product name!", "Missing");
        return;
    }
    
    // Check duplicate name (except current product)
    for(let i = 0; i < products.length; i++) {
        if(products[i].name.toLowerCase() === name.toLowerCase() && i !== idx) {
            showAlert("Product \"" + name + "\" already exists!", "Duplicate");
            return;
        }
    }
    
    // Update the product at the same index
    products[idx] = { 
        name: name, 
        price: price, 
        cost: cost, 
        stock: stock,
        warehouseStock: products[idx].warehouseStock || 0,
        alertLimit: alertL 
    };
    
    localStorage.setItem('products', JSON.stringify(products));
    showAlert("Product \"" + name + "\" updated successfully!", "Updated");
    
    cancelProductEdit();
    renderLists();
}

function cancelProductEdit() {
    resetProductForm();
    document.getElementById('product-form-title').innerText = "Add New Product";
    document.getElementById('edit-product-index').value = "-1";
    document.getElementById('product-action-buttons').innerHTML = "<button class='btn-block btn-save-product' onclick='saveProduct()'>Save Product</button>";
}

function deleteProduct(idx) {
    let productName = products[idx].name;
    showConfirm("Delete \"" + productName + "\"?", "Delete Product", function(result) {
        if(result) {
            products.splice(idx, 1);
            localStorage.setItem('products', JSON.stringify(products));
            cancelProductEdit();
            renderLists();
            showAlert("Product deleted!", "Deleted");
        }
    });
}

function resetProductForm() {
    document.getElementById('p-name').value = "";
    document.getElementById('p-price').value = "";
    document.getElementById('p-cost').value = "";
    document.getElementById('p-stock').value = "";
    document.getElementById('p-alert').value = "5";
}

// ========== WAREHOUSE ==========
let _whRIdx=-1,_whLIdx=-1;
function setProductTab(tab){
    let cs=document.getElementById('car-stock-section'),ws=document.getElementById('warehouse-section'),tc=document.getElementById('tab-car'),tw=document.getElementById('tab-warehouse');
    if(cs)cs.style.display=tab==='car'?'block':'none';if(ws)ws.style.display=tab==='warehouse'?'block':'none';
    if(tc)tc.className='report-tab'+(tab==='car'?' active':'');if(tw)tw.className='report-tab'+(tab==='warehouse'?' active':'');
    if(tab==='warehouse')renderWarehouseList();
}
function renderWarehouseList(){
    let wList=document.getElementById('warehouse-list');if(!wList)return;wList.innerHTML='';
    if(!products||products.length===0){wList.innerHTML='<li style="display:block;text-align:center;color:#999;">Product မရှိသေးပါဘူး</li>';return;}
    for(let i=0;i<products.length;i++){
        let p=products[i],wS=p.warehouseStock||0,cS=p.stock||0;
        let wC=wS===0?'#e53935':(wS<=(p.alertLimit||5)?'#f57c00':'#1e88e5');
        let li=document.createElement('li');
        li.style.cssText='display:block;padding:14px;margin-bottom:10px;border-radius:16px;border:1px solid #eef1ee;list-style:none;';
        li.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><div><b style="font-size:15px;">'+p.name+'</b><br><span style="color:#666;font-size:12px;">Cost: '+(p.cost||0).toLocaleString()+' K | Sell: '+(p.price||0).toLocaleString()+' K</span></div><div style="text-align:right;"><div style="font-size:11px;color:#666;">🏭 ဂိုထောင်</div><b style="font-size:22px;color:'+wC+';">'+wS+'</b><div style="font-size:11px;color:#666;">🚐 ကားပေါ်: <b>'+cS+'</b></div></div></div>'
            +'<div style="display:flex;gap:8px;"><button style="flex:1;padding:10px;border:none;border-radius:30px;background:linear-gradient(135deg,#1e88e5,#1257a0);color:white;font-weight:bold;font-size:13px;cursor:pointer;" onclick="openLoadToCarModal('+i+')">🚐 ကားပေါ်တင်</button><button style="flex:1;padding:10px;border:none;border-radius:30px;background:linear-gradient(135deg,#2e7d32,#14532d);color:white;font-weight:bold;font-size:13px;cursor:pointer;" onclick="openReceiveWarehouseModal('+i+')">📦 ဂိုထောင်ထည့်</button></div>';
        wList.appendChild(li);
    }
}
function openLoadToCarModal(idx){
    let p=products[idx],wS=p.warehouseStock||0;
    if(wS<=0){showAlert('"'+p.name+'" ဂိုထောင်ထဲမှာ stock မရှိပါဘူး!','🏭 Empty');return;}
    _whLIdx=idx;
    let body=document.getElementById('warehouse-load-body');
    if(body)body.innerHTML='<p style="font-weight:bold;font-size:16px;margin-bottom:8px;">'+p.name+'</p><div style="display:flex;gap:12px;margin-bottom:16px;"><div style="flex:1;background:#e3f1ff;padding:12px;border-radius:12px;text-align:center;"><div style="font-size:11px;color:#555;">🏭 ဂိုထောင်ကျန်</div><b style="font-size:22px;color:#1e88e5;">'+wS+'</b></div><div style="flex:1;background:#e8f8ec;padding:12px;border-radius:12px;text-align:center;"><div style="font-size:11px;color:#555;">🚐 ကားပေါ်ရှိ</div><b style="font-size:22px;color:#2e7d32;">'+(p.stock||0)+'</b></div></div><label style="font-size:13px;font-weight:bold;display:block;margin-bottom:6px;">တင်မယ့် အရေအတွက်</label><input type="number" inputmode="numeric" id="load-qty-input" placeholder="အရေအတွက်" min="1" max="'+wS+'" style="font-size:18px;text-align:center;">';
    let m=document.getElementById('warehouse-load-modal');if(m)m.classList.add('open');
    setTimeout(function(){let el=document.getElementById('load-qty-input');if(el)el.focus();},200);
}
function closeLoadModal(){let m=document.getElementById('warehouse-load-modal');if(m)m.classList.remove('open');_whLIdx=-1;}
function confirmLoadToCar(){
    let idx=_whLIdx;if(idx<0||idx>=products.length)return;
    let qty=parseInt(document.getElementById('load-qty-input').value)||0,wS=products[idx].warehouseStock||0;
    if(qty<=0){showAlert('အရေအတွက် ထည့်ပါ!','Missing');return;}
    if(qty>wS){showAlert('ဂိုထောင်ထဲမှာ '+wS+' ခုပဲ ရှိတော့တယ်!','Stock Limit');return;}
    products[idx].warehouseStock=wS-qty;products[idx].stock=(products[idx].stock||0)+qty;
    localStorage.setItem('products',JSON.stringify(products));closeLoadModal();renderWarehouseList();renderLists();
    showAlert(products[idx].name+' — '+qty+' ခု ကားပေါ်တင်ပြီး ✅\n🏭 ဂိုထောင်ကျန်: '+products[idx].warehouseStock+' ခု\n🚐 ကားပေါ်: '+products[idx].stock+' ခု','ပြီးပြီ');
}
function openReceiveWarehouseModal(idx){
    _whRIdx=idx;let p=products[idx];
    let body=document.getElementById('warehouse-receive-body');
    if(body)body.innerHTML='<p style="font-weight:bold;font-size:16px;margin-bottom:4px;">'+p.name+'</p><p style="color:#666;font-size:12px;margin-bottom:16px;">လက်ရှိ ဂိုထောင်: <b>'+(p.warehouseStock||0)+'</b> ခု</p><label style="font-size:13px;font-weight:bold;display:block;margin-bottom:6px;">ထည့်မယ့် အရေအတွက် *</label><input type="number" inputmode="numeric" id="wh-receive-qty" placeholder="အရေအတွက်" style="margin-bottom:14px;"><label style="font-size:13px;font-weight:bold;display:block;margin-bottom:6px;">Cost တစ်ခုဈေး (ပြင်ချင်မှ ထည့်ပါ)</label><input type="number" inputmode="decimal" id="wh-receive-cost" placeholder="ဗလာ = '+(p.cost||0).toLocaleString()+' K အတိုင်း">';
    let m=document.getElementById('warehouse-receive-modal');if(m)m.classList.add('open');
    setTimeout(function(){let el=document.getElementById('wh-receive-qty');if(el)el.focus();},200);
}
function closeReceiveModal(){let m=document.getElementById('warehouse-receive-modal');if(m)m.classList.remove('open');_whRIdx=-1;}
function confirmReceiveWarehouse(){
    let idx=_whRIdx;if(idx<0||idx>=products.length)return;
    let qty=parseInt(document.getElementById('wh-receive-qty').value)||0,newCost=parseFloat(document.getElementById('wh-receive-cost').value);
    if(qty<=0){showAlert('အရေအတွက် ထည့်ပါ!','Missing');return;}
    products[idx].warehouseStock=(products[idx].warehouseStock||0)+qty;
    if(!isNaN(newCost)&&newCost>0)products[idx].cost=newCost;
    localStorage.setItem('products',JSON.stringify(products));closeReceiveModal();renderWarehouseList();renderLists();
    showAlert(products[idx].name+' — '+qty+' ခု ဂိုထောင်ထည့်ပြီး ✅\n🏭 ဂိုထောင်ကျန်: '+products[idx].warehouseStock+' ခု'+(!isNaN(newCost)&&newCost>0?'\nCost အသစ်: '+newCost.toLocaleString()+' K':''),'ပြီးပြီ');
}
function endOfDayReturn(){
    let lines=[],total=0;
    for(let i=0;i<products.length;i++){let s=products[i].stock||0;if(s>0){lines.push('• '+products[i].name+': '+s+' ခု');total+=s;}}
    if(lines.length===0){showAlert('ကားပေါ်မှာ ပစ္စည်းမရှိတော့ပါဘူး','🚐 Empty');return;}
    showConfirm('🌙 နေ့ပိတ် ဂိုထောင်ပြန်သိမ်း\n\nကားပေါ်ကျန်တာ:\n'+lines.join('\n')+'\n\nစုစုပေါင်း '+total+' ခု ဂိုထောင်ပြန်ဝင်မည်\nဆက်လုပ်မှာလား?','🌙 ပြန်သိမ်းမည်',function(r){
        if(!r)return;
        for(let i=0;i<products.length;i++){let s=products[i].stock||0;if(s>0){products[i].warehouseStock=(products[i].warehouseStock||0)+s;products[i].stock=0;}}
        localStorage.setItem('products',JSON.stringify(products));renderWarehouseList();renderLists();
        showAlert('ကားပေါ်ကျန်တာ အားလုံး ဂိုထောင်ပြန်ဝင်ပြီး ✅\nနက်ဖြန် ဂိုထောင် tab ကနေ ကားပေါ်တင်ပါ။','ပြီးပြီ');
    });
}

// ========== CUSTOMERS ==========
function addCustomer() {
    let name = document.getElementById('c-name')?.value.trim();
    if(!name) { 
        showAlert("Enter customer name!", "Missing"); 
        return; 
    }
    
    let cleanName = name.toLowerCase();
    let exists = false;
    for(let i = 0; i < customers.length; i++) {
        if(customers[i].toLowerCase() === cleanName) {
            exists = true;
            break;
        }
    }
    
    if(exists) {
        showAlert("Customer \"" + name + "\" already exists!", "Duplicate");
        return;
    }
    
    customers.push(name);
    localStorage.setItem('customers', JSON.stringify(customers));
    document.getElementById('c-name').value = "";
    renderLists();
    filterCustomer();
    showAlert("Customer \"" + name + "\" added successfully!", "Added");
}

function editCustomer(idx) {
    let oldName = customers[idx];
    showEditCustomerModal(oldName, function(newName) {
        console.log("Callback received: " + newName);
        
        if(newName && newName.trim()) {
            newName = newName.trim();
            
            // Check if exists
            let exists = false;
            for(let i = 0; i < customers.length; i++) {
                if(customers[i].toLowerCase() === newName.toLowerCase() && i !== idx) {
                    showAlert("Customer \"" + newName + "\" already exists!", "Duplicate");
                    exists = true;
                    break;
                }
            }
            if(exists) return;
            
            customers[idx] = newName;
            localStorage.setItem('customers', JSON.stringify(customers));
            renderLists();
            filterCustomer();
            showAlert("Customer changed from \"" + oldName + "\" to \"" + newName + "\"", "Updated");
        }
    });
}

function showEditCustomerModal(oldName, callback) {
    // Remove existing modal if any
    let existingModal = document.getElementById('edit-customer-modal');
    if(existingModal) {
        existingModal.remove();
    }
    
    let modalHtml = `
        <div id="edit-customer-modal" class="modal">
            <div class="modal-content" style="max-width: 350px; height: auto; border-radius: 28px;">
                <div class="modal-header" style="background: linear-gradient(135deg, #1e3a2f, #2e7d32); border-radius: 28px 28px 0 0;">
                    <h2 style="margin: 0;">✏️ Edit Customer</h2>
                    <button class="close-btn" onclick="closeEditCustomerModal()" style="font-size: 28px;">×</button>
                </div>
                <div class="modal-body" style="padding: 24px;">
                    <label style="font-weight: bold; display: block; margin-bottom: 8px; color: #1e293b;">Customer Name:</label>
                    <input type="text" id="edit-customer-name" value="` + oldName + `" style="width: 100%; padding: 14px; border-radius: 14px; border: 1px solid #e2e8f0; font-size: 16px; background: #f8fafc;">
                </div>
                <div class="modal-footer" style="display: flex; gap: 12px; padding: 16px;">
                    <button onclick="closeEditCustomerModal()" class="btn-block" style="background: #757575; margin: 0; border-radius: 40px;">Cancel</button>
                    <button onclick="confirmEditCustomer()" class="btn-block" style="background: linear-gradient(135deg, #2e7d32, #1a5e20); margin: 0; border-radius: 40px;">Save Changes</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Store callback
    window.editCustomerCallback = callback;
    
    let modal = document.getElementById('edit-customer-modal');
    modal.classList.add('open');
}

function closeEditCustomerModal() {
    let modal = document.getElementById('edit-customer-modal');
    if(modal) {
        modal.classList.remove('open');
        setTimeout(function() {
            modal.remove();
        }, 300);
    }
    window.editCustomerCallback = null;
}

function confirmEditCustomer() {
    let input = document.getElementById('edit-customer-name');
    let newName = input ? input.value.trim() : '';
    
    console.log("Confirm edit: " + newName);
    
    if(newName && window.editCustomerCallback) {
        window.editCustomerCallback(newName);
    }
    
    closeEditCustomerModal();
}

function deleteCustomer(idx) {
    let customerName = customers[idx];
    showConfirm("Delete \"" + customerName + "\"?", "Delete Customer", function(result) {
        if(result) {
            customers.splice(idx, 1);
            localStorage.setItem('customers', JSON.stringify(customers));
            renderLists();
            filterCustomer();
            showAlert("Customer deleted!", "Deleted");
        }
    });
}

function filterCustomer() {
    let input = document.getElementById('customer-search');
    let dropdown = document.getElementById('customer-dropdown');
    if(!input || !dropdown) return;
    let val = input.value.toLowerCase();
    dropdown.innerHTML = '<option value="">No customer</option>';
    for(let i = 0; i < customers.length; i++) {
        if(customers[i].toLowerCase().includes(val)) {
            let opt = document.createElement('option');
            opt.value = customers[i];
            opt.textContent = customers[i];
            dropdown.appendChild(opt);
        }
    }
}

function selectCustomer() {
    let dropdown = document.getElementById('customer-dropdown');
    let search = document.getElementById('customer-search');
    if(dropdown.value) search.value = dropdown.value;
}

function selectProduct(element) {
    let name = element.getAttribute('data-name');
    let price = parseFloat(element.getAttribute('data-price'));
    let cost = parseFloat(element.getAttribute('data-cost'));
    let stock = parseInt(element.getAttribute('data-stock'));
    
    console.log("Selected: " + name + " | Stock: " + stock);
    
    if(stock <= 0) {
        showAlert(name + " is out of stock!", "Out of Stock");
        return;
    }
    
    // Find current quantity in tempSelectedProducts
    let currentQty = 0;
    let existingIndex = -1;
    for(let i = 0; i < tempSelectedProducts.length; i++) {
        if(tempSelectedProducts[i].name === name) {
            currentQty = tempSelectedProducts[i].qty;
            existingIndex = i;
            break;
        }
    }
    
    console.log("Current quantity: " + currentQty);
    
    if(currentQty >= stock) {
        showAlert("Only " + stock + " left! Cannot add more.", "Stock Limit");
        return;
    }
    
    // Add to tempSelectedProducts
    if(existingIndex !== -1) {
        tempSelectedProducts[existingIndex].qty++;
        console.log("Increased qty to: " + tempSelectedProducts[existingIndex].qty);
    } else {
        tempSelectedProducts.push({
            name: name,
            price: price,
            cost: cost,
            qty: 1
        });
        console.log("Added new product: " + name);
    }
    
    // Show badge by updating the element
    let badgeDiv = element.querySelector('.badge');
    let newQty = 0;
    for(let i = 0; i < tempSelectedProducts.length; i++) {
        if(tempSelectedProducts[i].name === name) {
            newQty = tempSelectedProducts[i].qty;
            break;
        }
    }
    
    if(badgeDiv) {
        badgeDiv.innerText = newQty;
    } else {
        let newBadge = document.createElement('div');
        newBadge.className = 'badge';
        newBadge.innerText = newQty;
        element.appendChild(newBadge);
    }
    
    element.classList.add('selected');
    
    // Don't refresh modal, just update the badge
    // openProductModal(); // ဒါကို မခေါ်ပါနဲ့
}

function renderLists() {
    let pList = document.getElementById('product-list');
    if(pList) {
        pList.innerHTML = "";
        for(let i = 0; i < products.length; i++) {
            let p = products[i];
            let low = p.stock <= p.alertLimit ? "<span class='alert-tag'>Low: " + p.stock + "</span>" : "<span class='stock-tag'>Stock: " + p.stock + "</span>";
            let li = document.createElement('li');
            li.innerHTML = "<div><b>" + p.name + "</b><br>Price: " + p.price.toLocaleString() + " K / Cost: " + p.cost.toLocaleString() + " K<br>" + low + "</div><div><button class='btn-icon btn-edit' onclick='editProduct(" + i + ")'>✏️</button><button class='btn-icon btn-delete' onclick='deleteProduct(" + i + ")'>🗑️</button></div>";
            pList.appendChild(li);
        }
    }
    let cList = document.getElementById('customer-list');
    if(cList) {
        cList.innerHTML = "";
        for(let i = 0; i < customers.length; i++) {
            let li = document.createElement('li');
            li.innerHTML = "<div>👤 " + customers[i] + "</div><div><button class='btn-icon btn-edit' onclick='editCustomer(" + i + ")'>✏️</button><button class='btn-icon btn-delete' onclick='deleteCustomer(" + i + ")'>🗑️</button></div>";
            cList.appendChild(li);
        }
    }
}

// ========== SETTINGS ==========
function clearAllData() {
    showConfirm("⚠️ CLEAR ALL DATA?\n\nThis cannot be undone!", "Danger Zone", function(result) {
        if(result) {
            localStorage.clear();
            location.reload();
        }
    });
}

function backupToExcel() {
    try {
        // Create CSV content
        let csvRows = [];
        
        // Products sheet
        csvRows.push("=== PRODUCTS ===");
        csvRows.push("Name,Price,Cost,Stock,WarehouseStock,Alert Limit");
        for(let i = 0; i < products.length; i++) {
            let p = products[i];
            csvRows.push(`"${p.name}",${p.price},${p.cost},${p.stock},${p.warehouseStock || 0},${p.alertLimit || 5}`);
        }
        
        // Customers sheet
        csvRows.push("");
        csvRows.push("=== CUSTOMERS ===");
        csvRows.push("Name");
        for(let i = 0; i < customers.length; i++) {
            csvRows.push(`"${customers[i]}"`);
        }
        
        // Sales History
        csvRows.push("");
        csvRows.push("=== SALES HISTORY ===");
        csvRows.push("ID,Customer,Total,Discount,Cost,Date,Items");
        for(let i = 0; i < salesHistory.length; i++) {
            let s = salesHistory[i];
            // Items ထဲက product တစ်ခုချင်းစီကို name~qty~price~cost ပုံစံနဲ့ encode လုပ်ပြီး
            // item တစ်ခုနဲ့တစ်ခုကြားမှာ "|" ခြားထားသည် (CSV column ထဲမှာ ဘေးထွက်စာလုံးတွေ မပျက်အောင် name ကို encodeURIComponent လုပ်ထားသည်)
            let itemsEncoded = (s.items || []).map(function(it) {
                return encodeURIComponent(it.name) + "~" + it.qty + "~" + it.price + "~" + (it.cost || 0);
            }).join("|");
            csvRows.push(`"${s.id}","${s.customer || ''}",${s.total || 0},${s.discount || 0},${s.cost || 0},"${s.date || ''}","${itemsEncoded}"`);
        }
        
        // Expenses
        csvRows.push("");
        csvRows.push("=== EXPENSES ===");
        csvRows.push("Title,Amount,Date");
        for(let i = 0; i < expenses.length; i++) {
            let e = expenses[i];
            csvRows.push(`"${e.title}",${e.amount},"${e.date}"`);
        }
        
        // Create and download
        let csvContent = csvRows.join("\n");
        let blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        let link = document.createElement("a");
        let url = URL.createObjectURL(blob);
        
        let now = new Date();
        let filename = `SIT_MHAN_Backup_${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}.csv`;
        
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showAlert("Data backup completed successfully!", "✅ Backup");
    } catch(error) {
        console.log("Backup error:", error);
        showAlert("Backup failed: " + error.message, "❌ Error");
    }
}

function backupToJSON() {
    // Gather all app data into one object
    let data = {
        _version: 2,
        _app: "SIT MHAN Distribution",
        _date: new Date().toISOString().slice(0, 10),
        products: products,
        customers: customers,
        salesHistory: salesHistory,
        expenses: JSON.parse(localStorage.getItem('expenses') || '[]')
    };

    let json = JSON.stringify(data, null, 2);
    let blob = new Blob([json], { type: 'application/json' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    let dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = 'SIT-MHAN-backup-' + dateStr + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showAlert('JSON Backup ထုတ်ပြီး ✅\n\nဖိုင်နာမည်: SIT-MHAN-backup-' + dateStr + '.json\n\nProducts: ' + products.length + ' ခု\nCustomers: ' + customers.length + ' ဦး\nSales: ' + salesHistory.length + ' ကြိမ်', 'Backup ပြီးပြီ');
}

function restoreFromJSON(event) {
    let file = event.target.files[0];
    if(!file) return;
    if(!file.name.endsWith('.json')) {
        showAlert('JSON ဖိုင် (.json) ကိုသာ ရွေးပါ!', 'ဖိုင်မမှန်ဘူး');
        event.target.value = '';
        return;
    }
    let reader = new FileReader();
    reader.onload = function(e) {
        try {
            let data = JSON.parse(e.target.result);
            // Validate structure
            if(!data._app || !data.products || !data.salesHistory) {
                showAlert('ဒီဖိုင်က SIT MHAN backup ဖိုင်မဟုတ်ပါဘူး!', 'ဖိုင်မမှန်ဘူး');
                return;
            }
            let summary = '📂 JSON Restore လုပ်မည်\n\n' +
                'Backup ရက်: ' + (data._date || 'မသိ') + '\n' +
                'Products: ' + data.products.length + ' ခု\n' +
                'Customers: ' + (data.customers || []).length + ' ဦး\n' +
                'Sales: ' + data.salesHistory.length + ' ကြိမ်\n\n' +
                '⚠️ လက်ရှိ data အားလုံး အစားထိုးမည်\nဆက်လုပ်မှာလား?';
            showConfirm(summary, '📂 Restore မည်', function(result) {
                if(!result) return;
                // Restore all data
                products = data.products || [];
                customers = data.customers || [];
                salesHistory = data.salesHistory || [];
                localStorage.setItem('products', JSON.stringify(products));
                localStorage.setItem('customers', JSON.stringify(customers));
                localStorage.setItem('salesHistory', JSON.stringify(salesHistory));
                if(data.expenses) {
                    localStorage.setItem('expenses', JSON.stringify(data.expenses));
                }
                renderLists();
                renderReports();
                renderHome();
                showAlert('Restore ပြီး ✅\n\nProducts: ' + products.length + ' ခု\nCustomers: ' + customers.length + ' ဦး\nSales: ' + salesHistory.length + ' ကြိမ်', 'ပြီးပြီ');
            });
        } catch(err) {
            showAlert('JSON ဖိုင် ဖတ်မရဘူး — ဖိုင်ပျက်နေနိုင်ပါတယ်!\n(' + err.message + ')', 'Error');
        }
        event.target.value = '';
    };
    reader.readAsText(file);
}

function restoreData(event) {
    let file = event.target.files[0];
    if(!file) {
        showAlert("Please select a backup file!", "No File");
        return;
    }
    
    let reader = new FileReader();
    reader.onload = function(e) {
        try {
            let text = e.target.result;
            let lines = text.split("\n");
            
            let newProducts = [];
            let newCustomers = [];
            let newSalesHistory = [];
            let newExpenses = [];
            
            let currentSection = "";
            
            for(let i = 0; i < lines.length; i++) {
                let line = lines[i].trim();
                if(line === "=== PRODUCTS ===") {
                    currentSection = "products";
                    continue;
                } else if(line === "=== CUSTOMERS ===") {
                    currentSection = "customers";
                    continue;
                } else if(line === "=== SALES HISTORY ===") {
                    currentSection = "sales";
                    continue;
                } else if(line === "=== EXPENSES ===") {
                    currentSection = "expenses";
                    continue;
                }
                
                if(currentSection === "products" && line.includes(",") && !line.startsWith("Name")) {
                    let parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                    if(parts.length >= 5) {
                        newProducts.push({
                            name: parts[0].replace(/"/g, ""),
                            price: parseFloat(parts[1]) || 0,
                            cost: parseFloat(parts[2]) || 0,
                            stock: parseInt(parts[3]) || 0,
                            warehouseStock: parts.length >= 6 ? (parseInt(parts[4]) || 0) : 0,
                            alertLimit: parts.length >= 6 ? (parseInt(parts[5]) || 5) : (parseInt(parts[4]) || 5)
                        });
                    }
                } else if(currentSection === "customers" && line.includes(",") && !line.startsWith("Name")) {
                    newCustomers.push(line.replace(/"/g, ""));
                } else if(currentSection === "sales" && line.includes(",") && !line.startsWith("ID")) {
                    let parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                    if(parts.length >= 5) {
                        // ဟောင်း backup format (Items column မပါ) ကိုလည်း ဖတ်နိုင်ဖို့ parts.length စစ်ထားသည်
                        let hasNewFormat = parts.length >= 7;
                        let discount = hasNewFormat ? (parseFloat(parts[3]) || 0) : 0;
                        let costIdx = hasNewFormat ? 4 : 3;
                        let dateIdx = hasNewFormat ? 5 : 4;
                        let items = [];
                        if(hasNewFormat) {
                            let itemsRaw = parts[6].replace(/"/g, "");
                            if(itemsRaw) {
                                items = itemsRaw.split("|").map(function(chunk) {
                                    let f = chunk.split("~");
                                    return {
                                        name: decodeURIComponent(f[0] || ""),
                                        qty: parseInt(f[1]) || 0,
                                        price: parseFloat(f[2]) || 0,
                                        cost: parseFloat(f[3]) || 0
                                    };
                                });
                            }
                        }
                        newSalesHistory.push({
                            id: parts[0].replace(/"/g, ""),
                            customer: parts[1].replace(/"/g, ""),
                            total: parseFloat(parts[2]) || 0,
                            discount: discount,
                            cost: parseFloat(parts[costIdx]) || 0,
                            date: parts[dateIdx].replace(/"/g, ""),
                            items: items
                        });
                    }
                } else if(currentSection === "expenses" && line.includes(",") && !line.startsWith("Title")) {
                    let parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                    if(parts.length >= 3) {
                        newExpenses.push({
                            title: parts[0].replace(/"/g, ""),
                            amount: parseFloat(parts[1]) || 0,
                            date: parts[2].replace(/"/g, "")
                        });
                    }
                }
            }
            
            if(newProducts.length > 0) {
                localStorage.setItem('products', JSON.stringify(newProducts));
                products = newProducts;
            }
            if(newCustomers.length > 0) {
                localStorage.setItem('customers', JSON.stringify(newCustomers));
                customers = newCustomers;
            }
            if(newSalesHistory.length > 0) {
                localStorage.setItem('salesHistory', JSON.stringify(newSalesHistory));
                salesHistory = newSalesHistory;
            }
            if(newExpenses.length > 0) {
                localStorage.setItem('expenses', JSON.stringify(newExpenses));
                expenses = newExpenses;
            }
            
            showAlert("Data restored successfully! Page will reload.", "✅ Restore");
            setTimeout(function() {
                location.reload();
            }, 1500);
            
        } catch(error) {
            console.log("Restore error:", error);
            showAlert("Restore failed: " + error.message, "❌ Error");
        }
    };
    reader.readAsText(file, "UTF-8");
}

function setReportType(type) {
    console.log("setReportType called: " + type);
    currentReportType = type;
    
    let dailyTab = document.getElementById('tab-daily');
    let monthlyTab = document.getElementById('tab-monthly');
    let dailySection = document.getElementById('daily-report-section');
    let monthlySection = document.getElementById('monthly-report-section');
    
    if(type === 'daily') {
        dailyTab.classList.add('active');
        monthlyTab.classList.remove('active');
        dailySection.style.display = 'block';
        monthlySection.style.display = 'none';
    } else {
        dailyTab.classList.remove('active');
        monthlyTab.classList.add('active');
        dailySection.style.display = 'none';
        monthlySection.style.display = 'block';
    }
    
    renderReports();
}

// ========== INIT ==========
window.onload = function() {
    console.log("App loaded!");
    renderHome();
    renderLists();
    filterCustomer();
    loadPaperSize();
    
    // Set default month to current
    let now = new Date();
    let defaultMonth = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, '0');
    let monthInput = document.getElementById('report-month');
    if(monthInput) monthInput.value = defaultMonth;
    
    renderReports();
};