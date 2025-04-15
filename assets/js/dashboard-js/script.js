document.addEventListener('DOMContentLoaded', function() {
    // ====================== //
    // KONFIGURASI APLIKASI   //
    // ====================== //
    const CONFIG = {
        currency: 'IDR',
        dateFormat: 'id-ID',
        csvFileName: 'WalletKu_backup',
        categories: {
            income: [
                { id: 'salary', name: 'Gaji', color: '#4cc9f0' },
                { id: 'bonus', name: 'Bonus', color: '#4895ef' },
                { id: 'save', name: 'Tabungan', color: '#c57312' },
                { id: 'investment', name: 'Investasi', color: '#4361ee' },
                { id: 'freelance', name: 'Freelance', color: '#3f37c9' },
                { id: 'other-income', name: 'Lainnya', color: '#b5179e' }
            ],
            expense: [
                { id: 'food', name: 'Makanan', color: '#f72585' },
                { id: 'transport', name: 'Transportasi', color: '#b5179e' },
                { id: 'shopping', name: 'Belanja', color: '#a30d79' },
                { id: 'bill', name: 'Tagihan', color: '#893505' },
                { id: 'Installment', name: 'Cicilan', color: '#148b01' },
                { id: 'housing', name: 'Perumahan', color: '#7209b7' },
                { id: 'utilities', name: 'Listrik/Air', color: '#560bad' },
                { id: 'other-expense', name: 'Lainnya', color: '#480ca8' }
            ]
        },
        walletTypes: {
            'cash': { name: 'Tunai', color: '#4361ee' },
            'bank': { name: 'Bank', color: '#3f37c9' },
            'savings': { name: 'Tabungan', color: '#4895ef' },
            'investment': { name: 'Investasi', color: '#7209b7' },
            'other': { name: 'Lainnya', color: '#8d99ae' }
        }
    };

    // ======================
    // INISIALISASI ELEMEN
    // ======================
    const DOM = {
        // Modal
        transactionModal: document.getElementById('transactionModal') ? new bootstrap.Modal('#transactionModal') : null,
        walletModal: document.getElementById('walletModal') ? new bootstrap.Modal('#walletModal') : null,
        confirmModal: document.getElementById('confirmModal') ? new bootstrap.Modal('#confirmModal') : null,
        importModal: document.getElementById('importModal') ? new bootstrap.Modal('#importModal') : null,
        
        // Form Transaksi
        transactionForm: document.getElementById('transaction-form'),
        transactionType: document.getElementById('transaction-type'),
        transactionWallet: document.getElementById('transaction-wallet'),
        transferTo: document.getElementById('transfer-to'),
        transferContainer: document.getElementById('transfer-to-container'),
        transactionAmount: document.getElementById('transaction-amount'),
        transactionDate: document.getElementById('transaction-date'),
        transactionDesc: document.getElementById('transaction-description'),
        transactionCategory: document.getElementById('transaction-category'),
        submitTransactionBtn: document.getElementById('submit-transaction-btn'),
        
        // Form Dompet
        walletForm: document.getElementById('wallet-form'),
        walletName: document.getElementById('wallet-name'),
        walletType: document.getElementById('wallet-type'),
        walletBalance: document.getElementById('wallet-balance'),
        walletCurrency: document.getElementById('wallet-currency'),
        saveWalletBtn: document.getElementById('save-wallet-btn'),
        
        // Dashboard
        totalBalance: document.getElementById('total-balance'),
        totalIncome: document.getElementById('total-income'),
        totalExpense: document.getElementById('total-expense'),
        walletsContainer: document.getElementById('wallets-container'),
        
        // Laporan
        reportPeriod: document.getElementById('report-period'),
        reportStartDate: document.getElementById('report-start-date'),
        reportEndDate: document.getElementById('report-end-date'),
        customDateRange: document.getElementById('custom-date-range'),
        generateReportBtn: document.getElementById('generate-report'),
        reportIncome: document.getElementById('report-income'),
        reportExpense: document.getElementById('report-expense'),
        reportBalance: document.getElementById('report-balance'),
        reportChange: document.getElementById('report-change'),
        incomeChart: document.getElementById('income-chart'),
        expenseChart: document.getElementById('expense-chart'),
        walletChart: document.getElementById('wallet-balance-chart'),
        monthlyComparisonChart: document.getElementById('monthly-comparison-chart'),
        
        // Riwayat Transaksi
        filterDate: document.getElementById('filter-date'),
        filterType: document.getElementById('filter-type'),
        filterWallet: document.getElementById('filter-wallet'),
        filterBtn: document.getElementById('filter-btn'),
        resetFilters: document.getElementById('reset-filters'),
        transactionsList: document.getElementById('transactions-list'),
        
        // Backup/Restore
        exportBtn: document.getElementById('export-btn'),
        importBtn: document.getElementById('import-btn'),
        importFile: document.getElementById('import-file'),
        importSubmit: document.getElementById('import-submit')
    };

    // ======================
    // STATE APLIKASI
    // ======================
    const STATE = {
        editId: null,
        currentTransactionType: null,
        chartInstances: {
            income: null,
            expense: null,
            wallet: null,
            monthlyComparison: null
        },
        confirmCallback: null
    };

    // ======================
    // FUNGSI UTILITAS
    // ======================
    const utils = {
        formatCurrency: (amount) => {
            return new Intl.NumberFormat(CONFIG.dateFormat, {
                style: 'currency',
                currency: CONFIG.currency,
                minimumFractionDigits: 0
            }).format(amount);
        },
        
        formatDate: (dateString) => {
            const date = new Date(dateString);
            return date.toLocaleDateString(CONFIG.dateFormat, {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        },
        
        showNotification: (message, type = 'success') => {
            Swal.fire({
                icon: type === 'success' ? 'success' : 'error',
                title: type === 'success' ? 'Sukses' : 'Error',
                text: message,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
            });
        },
        
        getWalletById: (id) => {
            const wallets = utils.getData('wallets');
            return wallets.find(w => w.id === id);
        },
        
        getData: (key) => {
            const data = localStorage.getItem(key);
            try {
                return data ? JSON.parse(data) : [];
            } catch (e) {
                console.error(`Error parsing ${key} data:`, e);
                return [];
            }
        },
        
        saveData: (key, data) => {
            try {
                localStorage.setItem(key, JSON.stringify(data));
                return true;
            } catch (e) {
                console.error(`Error saving ${key} data:`, e);
                utils.showNotification('Gagal menyimpan data', 'danger');
                return false;
            }
        },
        
        calculateWalletBalance: (walletId) => {
            const wallets = utils.getData('wallets');
            const transactions = utils.getData('transactions');
            const wallet = wallets.find(w => w.id === walletId);
            
            if (!wallet) return 0;
            
            let balance = wallet.initialBalance || 0;
            
            transactions.forEach(t => {
                if (t.walletId === walletId) {
                    if (t.type === 'income') balance += t.amount;
                    if (t.type === 'expense') balance -= t.amount;
                    if (t.type === 'transfer') balance -= t.amount;
                }
                
                if (t.toWalletId === walletId && t.type === 'transfer') {
                    balance += t.amount;
                }
            });
            
            return balance;
        },
        
        checkWalletBalance: (walletId, amount) => {
            const balance = utils.calculateWalletBalance(walletId);
            return balance >= amount;
        },
        
        getCurrentMonthData: () => {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            
            return {
                month: currentMonth,
                year: currentYear
            };
        },
        
        getLastMonthData: () => {
            const now = new Date();
            let lastMonth = now.getMonth() - 1;
            let year = now.getFullYear();
            
            if (lastMonth < 0) {
                lastMonth = 11;
                year--;
            }
            
            return {
                month: lastMonth,
                year: year
            };
        },
        
        confirm: (message, callback) => {
            Swal.fire({
                title: 'Konfirmasi',
                text: message,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Ya',
                cancelButtonText: 'Batal'
            }).then((result) => {
                if (result.isConfirmed) {
                    callback();
                }
            });
        },
        
        exportToCSV: function() {
            try {
                const wallets = utils.getData('wallets');
                const transactions = utils.getData('transactions');
                
                let walletsCSV = 'id,name,type,initialBalance,currency,createdAt\n';
                wallets.forEach(wallet => {
                    walletsCSV += `"${wallet.id}","${wallet.name}","${wallet.type}",${wallet.initialBalance},"${wallet.currency}","${wallet.createdAt}"\n`;
                });
                
                let transactionsCSV = 'id,type,walletId,toWalletId,amount,date,description,category,createdAt\n';
                transactions.forEach(trans => {
                    transactionsCSV += `"${trans.id}","${trans.type}","${trans.walletId}","${trans.toWalletId || ''}",${trans.amount},"${trans.date}","${trans.description}","${trans.category || ''}","${trans.createdAt}"\n`;
                });
                
                const csvData = `=== WALLETS ===\n${walletsCSV}\n=== TRANSACTIONS ===\n${transactionsCSV}`;
                
                const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${CONFIG.csvFileName}_${new Date().toISOString().slice(0, 10)}.csv`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                utils.showNotification('Backup data berhasil diexport ke CSV');
                return true;
            } catch (e) {
                console.error('Error exporting to CSV:', e);
                utils.showNotification('Gagal mengeksport data ke CSV', 'danger');
                return false;
            }
        },
        
        importFromCSV: function(file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const content = e.target.result;
                    const parts = content.split('=== WALLETS ===\n')[1].split('\n=== TRANSACTIONS ===\n');
                    
                    if (parts.length !== 2) {
                        utils.showNotification('Format file backup tidak valid', 'danger');
                        return;
                    }
                    
                    const walletsCSV = parts[0];
                    const transactionsCSV = parts[1];
                    
                    // Parse wallets
                    const walletLines = walletsCSV.split('\n').filter(line => line.trim() !== '');
                    const walletHeaders = walletLines[0].replace(/"/g, '').split(',');
                    const wallets = [];
                    
                    for (let i = 1; i < walletLines.length; i++) {
                        const values = walletLines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
                        if (!values || values.length !== walletHeaders.length) continue;
                        
                        const wallet = {};
                        walletHeaders.forEach((header, index) => {
                            let value = values[index].replace(/^"|"$/g, '');
                            if (header === 'initialBalance') {
                                value = parseFloat(value) || 0;
                            }
                            wallet[header] = value;
                        });
                        wallets.push(wallet);
                    }
                    
                    // Parse transactions
                    const transLines = transactionsCSV.split('\n').filter(line => line.trim() !== '');
                    const transHeaders = transLines[0].replace(/"/g, '').split(',');
                    const transactions = [];
                    
                    for (let i = 1; i < transLines.length; i++) {
                        const values = transLines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
                        if (!values || values.length < transHeaders.length) continue;
                        
                        const trans = {};
                        transHeaders.forEach((header, index) => {
                            let value = values[index].replace(/^"|"$/g, '');
                            if (header === 'amount') {
                                value = parseFloat(value) || 0;
                            }
                            trans[header] = value;
                        });
                        transactions.push(trans);
                    }
                    
                    utils.confirm(`Anda akan mengimpor ${wallets.length} dompet dan ${transactions.length} transaksi. Lanjutkan? Data sebelumnya akan diganti.`, () => {
                        if (utils.saveData('wallets', wallets) && utils.saveData('transactions', transactions)) {
                            utils.showNotification('Backup data berhasil diimpor');
                            app.loadWallets();
                            app.updateDashboard();
                            if (DOM.generateReportBtn) {
                                app.generateReport();
                            }
                            
                            if (DOM.importModal) {
                                DOM.importModal.hide();
                            }
                        }
                    });
                } catch (e) {
                    console.error('Error importing from CSV:', e);
                    utils.showNotification('Gagal mengimpor data dari CSV', 'danger');
                }
            };
            reader.onerror = function() {
                utils.showNotification('Gagal membaca file CSV', 'danger');
            };
            reader.readAsText(file);
        }
    };

    // ======================
    // FUNGSI UTAMA
    // ======================
    const app = {
        init: function() {
            // Set tanggal default
            const today = new Date().toISOString().split('T')[0];
            if (DOM.transactionDate) DOM.transactionDate.value = today;
            if (DOM.reportStartDate) DOM.reportStartDate.value = today;
            if (DOM.reportEndDate) DOM.reportEndDate.value = today;
            if (DOM.filterDate) DOM.filterDate.value = today;
            
            // Inisialisasi data default jika belum ada
            if (!localStorage.getItem('wallets')) {
                const defaultWallets = [
                    {
                        id: 'wallet-default-1',
                        name: 'Dompet Utama',
                        type: 'cash',
                        initialBalance: 0,
                        currency: 'IDR',
                        createdAt: new Date().toISOString()
                    }
                ];
                utils.saveData('wallets', defaultWallets);
            }
            
            if (!localStorage.getItem('transactions')) {
                utils.saveData('transactions', []);
            }
            
            // Load data awal
            this.loadWallets();
            this.updateDashboard();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Generate laporan jika di halaman laporan
            if (DOM.generateReportBtn) {
                this.generateReport();
            }
            
            // Load transaksi jika di halaman riwayat
            if (DOM.transactionsList) {
                this.loadTransactions();
            }
        },
        
        setupEventListeners: function() {
            // Transaction Form
            if (DOM.transactionType) {
                DOM.transactionType.addEventListener('change', this.handleTransactionTypeChange.bind(this));
            }
            
            if (DOM.submitTransactionBtn) {
                DOM.submitTransactionBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.saveTransaction();
                });
            }
            
            // Wallet Form
            if (DOM.saveWalletBtn) {
                DOM.saveWalletBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.saveWallet();
                });
            }
            
            // Report Controls
            if (DOM.reportPeriod) {
                DOM.reportPeriod.addEventListener('change', this.handleReportPeriodChange.bind(this));
            }
            
            if (DOM.generateReportBtn) {
                DOM.generateReportBtn.addEventListener('click', () => this.generateReport());
            }
            
            // Riwayat Transaksi Controls
            if (DOM.filterBtn) {
                DOM.filterBtn.addEventListener('click', () => this.loadTransactions());
            }
            
            if (DOM.resetFilters) {
                DOM.resetFilters.addEventListener('click', () => {
                    if (DOM.filterDate) DOM.filterDate.value = '';
                    if (DOM.filterType) DOM.filterType.value = '';
                    if (DOM.filterWallet) DOM.filterWallet.value = '';
                    this.loadTransactions();
                });
            }
            
            // Event delegation for wallet actions
            if (DOM.walletsContainer) {
                DOM.walletsContainer.addEventListener('click', (e) => {
                    const btn = e.target.closest('[data-transaction-type]');
                    if (btn) {
                        const type = btn.getAttribute('data-transaction-type');
                        const walletId = btn.getAttribute('data-wallet-id');
                        this.showTransactionForm(type, walletId);
                    }
                    
                    const deleteBtn = e.target.closest('[data-action="delete-wallet"]');
                    if (deleteBtn) {
                        const walletId = deleteBtn.getAttribute('data-wallet-id');
                        this.deleteWallet(walletId);
                    }
                });
            }
            
            // Event delegation for transaction actions
            if (DOM.transactionsList) {
                DOM.transactionsList.addEventListener('click', (e) => {
                    const editBtn = e.target.closest('[data-action="edit-transaction"]');
                    if (editBtn) {
                        const transactionId = editBtn.getAttribute('data-transaction-id');
                        this.editTransaction(transactionId);
                    }
                    
                    const deleteBtn = e.target.closest('[data-action="delete-transaction"]');
                    if (deleteBtn) {
                        const transactionId = deleteBtn.getAttribute('data-transaction-id');
                        this.deleteTransaction(transactionId);
                    }
                });
            }
            
            // Backup/Restore
            if (DOM.exportBtn) {
                DOM.exportBtn.addEventListener('click', utils.exportToCSV);
            }
            
            if (DOM.importSubmit) {
                DOM.importSubmit.addEventListener('click', () => {
                    if (DOM.importFile.files.length > 0) {
                        utils.importFromCSV(DOM.importFile.files[0]);
                    } else {
                        utils.showNotification('Pilih file backup terlebih dahulu', 'danger');
                    }
                });
            }
        },
        
        loadWallets: function() {
            const wallets = utils.getData('wallets');
            
            if (!DOM.walletsContainer) return;
            
            // Kosongkan container
            DOM.walletsContainer.innerHTML = '';
            
            if (wallets.length === 0) {
                DOM.walletsContainer.innerHTML = `
                    <div class="empty-state">
                        <p>Anda belum memiliki dompet/tabungan</p>
                        <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#walletModal">
                            <i class="fas fa-plus"></i> Tambah dompet dulu yuk
                        </button>
                    </div>
                `;
                return;
            }
            
            // Render setiap dompet
            wallets.forEach(wallet => {
                const balance = utils.calculateWalletBalance(wallet.id);
                const walletEl = document.createElement('div');
                walletEl.className = `wallet-card ${wallet.type}`;
                walletEl.innerHTML = `
                    <div class="wallet-header">
                        <span class="wallet-name">${wallet.name}</span>
                        <span class="wallet-type">${CONFIG.walletTypes[wallet.type]?.name || wallet.type}</span>
                    </div>
                    <div class="wallet-balance">${utils.formatCurrency(balance)}</div>
                    <div class="wallet-currency">${wallet.currency}</div>
                    <div class="wallet-actions">
                        <button class="btn btn-sm btn-income" data-wallet-id="${wallet.id}" data-transaction-type="income">
                            <i class="fas fa-plus-circle"></i> Tambah
                        </button>
                        <button class="btn btn-sm btn-expense" data-wallet-id="${wallet.id}" data-transaction-type="expense">
                            <i class="fas fa-minus-circle"></i> Kurangi
                        </button>
                        <button class="btn btn-sm btn-danger" data-wallet-id="${wallet.id}" data-action="delete-wallet">
                            <i class="fas fa-trash"></i> Hapus
                        </button>
                    </div>
                `;
                
                DOM.walletsContainer.appendChild(walletEl);
            });
            
            // Update select options
            this.updateWalletSelectOptions();
        },
        
        loadTransactions: function() {
            if (!DOM.transactionsList) return;
            
            const transactions = utils.getData('transactions');
            const wallets = utils.getData('wallets');
            const filterDate = DOM.filterDate ? DOM.filterDate.value : '';
            const filterType = DOM.filterType ? DOM.filterType.value : '';
            const filterWallet = DOM.filterWallet ? DOM.filterWallet.value : '';
            
            // Filter transaksi
            let filteredTransactions = [...transactions];
            
            if (filterDate) {
                filteredTransactions = filteredTransactions.filter(t => t.date.startsWith(filterDate));
            }
            
            if (filterType) {
                filteredTransactions = filteredTransactions.filter(t => t.type === filterType);
            }
            
            if (filterWallet) {
                filteredTransactions = filteredTransactions.filter(t => 
                    t.walletId === filterWallet || t.toWalletId === filterWallet
                );
            }
            
            // Urutkan transaksi dari yang terbaru
            filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            // Kosongkan daftar transaksi
            DOM.transactionsList.innerHTML = '';
            
            if (filteredTransactions.length === 0) {
                DOM.transactionsList.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center py-4">Tidak ada transaksi</td>
                    </tr>
                `;
                return;
            }
            
            // Kelompokkan transaksi per hari
            const transactionsByDate = {};
            filteredTransactions.forEach(t => {
                const date = utils.formatDate(t.date);
                if (!transactionsByDate[date]) {
                    transactionsByDate[date] = [];
                }
                transactionsByDate[date].push(t);
            });
            
            // Render transaksi
            for (const [date, dailyTransactions] of Object.entries(transactionsByDate)) {
                // Tambahkan header tanggal
                const dateRow = document.createElement('tr');
                dateRow.className = 'date-header';
                dateRow.innerHTML = `
                    <td colspan="6" class="fw-bold bg-light">${date}</td>
                `;
                DOM.transactionsList.appendChild(dateRow);
                
                // Tambahkan transaksi untuk tanggal tersebut
                dailyTransactions.forEach(t => {
                    const wallet = utils.getWalletById(t.walletId);
                    const walletName = wallet ? wallet.name : 'Unknown';
                    const toWallet = t.toWalletId ? utils.getWalletById(t.toWalletId) : null;
                    const toWalletName = toWallet ? toWallet.name : '';
                    
                    const category = t.category ? 
                        (t.type === 'income' ? 
                            CONFIG.categories.income.find(c => c.id === t.category)?.name || t.category :
                            CONFIG.categories.expense.find(c => c.id === t.category)?.name || t.category) :
                        '-';
                    
                    const row = document.createElement('tr');
                    row.className = `transaction-${t.type}`;
                    
                    row.innerHTML = `
                        <td>${t.date.split('T')[1]?.slice(0, 5) || ''}</td>
                        <td>${t.description || '-'}</td>
                        <td>${walletName}${t.type === 'transfer' ? ` → ${toWalletName}` : ''}</td>
                        <td>${category}</td>
                        <td class="${t.type === 'income' ? 'text-success' : 
                                      t.type === 'expense' ? 'text-danger' : 
                                      'text-primary'}">
                            ${t.type === 'income' ? '+' : 
                              t.type === 'expense' ? '-' : '↔'} 
                            ${utils.formatCurrency(t.amount)}
                        </td>
                        <td class="transaction-actions">
                            <button data-action="edit-transaction" data-transaction-id="${t.id}" class="btn btn-sm btn-warning">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button data-action="delete-transaction" data-transaction-id="${t.id}" class="btn btn-sm btn-danger">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    `;
                    
                    DOM.transactionsList.appendChild(row);
                });
            }
        },
        
        updateWalletSelectOptions: function() {
            const wallets = utils.getData('wallets');
            
            // Update untuk form transaksi
            if (DOM.transactionWallet) {
                DOM.transactionWallet.innerHTML = '';
                wallets.forEach(wallet => {
                    const option = document.createElement('option');
                    option.value = wallet.id;
                    option.textContent = wallet.name;
                    DOM.transactionWallet.appendChild(option);
                });
            }
            
            // Update untuk transfer
            if (DOM.transferTo) {
                DOM.transferTo.innerHTML = '';
                wallets.forEach(wallet => {
                    const option = document.createElement('option');
                    option.value = wallet.id;
                    option.textContent = wallet.name;
                    DOM.transferTo.appendChild(option);
                });
            }
            
            // Update untuk filter
            if (DOM.filterWallet) {
                DOM.filterWallet.innerHTML = '<option value="">Semua Dompet</option>';
                wallets.forEach(wallet => {
                    const option = document.createElement('option');
                    option.value = wallet.id;
                    option.textContent = wallet.name;
                    DOM.filterWallet.appendChild(option);
                });
            }
        },
        
        saveWallet: function() {
            // Validasi form
            if (!DOM.walletName.value || !DOM.walletName.value.trim()) {
                Swal.fire({
                    icon: 'error',
                    title: 'Nama Dompet Kosong',
                    text: 'Harap isi nama dompet terlebih dahulu!',
                    confirmButtonText: 'OK'
                });
                return;
            }

            // Validasi saldo awal
            const initialBalance = parseFloat(DOM.walletBalance.value) || 0;
            if (isNaN(initialBalance)) {
                Swal.fire({
                    icon: 'error',
                    title: 'Saldo Tidak Valid',
                    text: 'Harap masukkan angka yang valid untuk saldo awal',
                    confirmButtonText: 'OK'
                });
                return;
            }

            const wallet = {
                id: 'wallet-' + Date.now(),
                name: DOM.walletName.value.trim(),
                type: DOM.walletType.value,
                initialBalance: initialBalance,
                currency: DOM.walletCurrency.value,
                createdAt: new Date().toISOString()
            };

            // Simpan ke localStorage
            const wallets = utils.getData('wallets');
            wallets.push(wallet);
            
            if (utils.saveData('wallets', wallets)) {
                // Reset form
                DOM.walletForm.reset();
                DOM.walletBalance.value = '0'; // Set default value
                
                // Tutup modal
                if (DOM.walletModal) {
                    DOM.walletModal.hide();
                }

                // Update UI
                this.loadWallets();
                this.updateDashboard();
                
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil!',
                    text: 'Dompet baru berhasil ditambahkan',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: 'Gagal menyimpan dompet baru',
                    confirmButtonText: 'OK'
                });
            }
        },
        
        updateDashboard: function() {
            const transactions = utils.getData('transactions');
            const wallets = utils.getData('wallets');
            
            let totalIncome = 0;
            let totalExpense = 0;
            
            transactions.forEach(t => {
                if (t.type === 'income') totalIncome += t.amount;
                if (t.type === 'expense') totalExpense += t.amount;
            });
            
            let totalBalance = 0;
            wallets.forEach(wallet => {
                totalBalance += utils.calculateWalletBalance(wallet.id);
            });
            
            if (DOM.totalBalance) DOM.totalBalance.textContent = utils.formatCurrency(totalBalance);
            if (DOM.totalIncome) DOM.totalIncome.textContent = utils.formatCurrency(totalIncome);
            if (DOM.totalExpense) DOM.totalExpense.textContent = utils.formatCurrency(totalExpense);
        },
        
        deleteWallet: function(walletId) {
            const wallet = utils.getWalletById(walletId);
            const currentBalance = utils.calculateWalletBalance(walletId);
            
            if (currentBalance > 0) {
                Swal.fire({
                    icon: 'error',
                    title: 'Tidak Dapat Menghapus',
                    html: `Dompet <strong>${wallet.name}</strong> masih memiliki saldo ${utils.formatCurrency(currentBalance)}!<br><br>
                          Anda harus mengosongkan saldo terlebih dahulu sebelum menghapus dompet.`,
                    confirmButtonText: 'OK'
                });
                return;
            }
            
            Swal.fire({
                title: 'Konfirmasi Hapus Dompet',
                html: `Apakah Anda yakin ingin menghapus dompet <strong>${wallet.name}</strong>?<br><br>
                      Semua transaksi terkait juga akan dihapus.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Ya, Hapus!',
                cancelButtonText: 'Batal'
            }).then((result) => {
                if (result.isConfirmed) {
                    const wallets = utils.getData('wallets');
                    const updatedWallets = wallets.filter(w => w.id !== walletId);
                    
                    // Hapus transaksi terkait dompet ini
                    const transactions = utils.getData('transactions');
                    const updatedTransactions = transactions.filter(t => 
                        t.walletId !== walletId && t.toWalletId !== walletId
                    );
                    
                    if (utils.saveData('wallets', updatedWallets) && utils.saveData('transactions', updatedTransactions)) {
                        // Update UI
                        this.loadWallets();
                        this.updateDashboard();
                        
                        if (DOM.generateReportBtn) {
                            this.generateReport();
                        }
                        
                        if (DOM.transactionsList) {
                            this.loadTransactions();
                        }
                        
                        Swal.fire({
                            icon: 'success',
                            title: 'Terhapus!',
                            text: 'Dompet berhasil dihapus',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Gagal',
                            text: 'Gagal menghapus dompet',
                            confirmButtonText: 'OK'
                        });
                    }
                }
            });
        },
        
        showTransactionForm: function(type, walletId = null) {
            if (!DOM.transactionModal) return;
            
            STATE.currentTransactionType = type;
            STATE.editId = null;
            
            // Update judul modal
            const titleMap = {
                'income': 'Tambah Pemasukan',
                'expense': 'Tambah Pengeluaran',
                'transfer': 'Tambah Transfer'
            };
            document.getElementById('transactionModalLabel').textContent = titleMap[type] || 'Tambah Transaksi';
            
            // Reset form
            DOM.transactionForm.reset();
            
            // Set nilai default
            DOM.transactionType.value = type;
            if (walletId) DOM.transactionWallet.value = walletId;
            DOM.transactionDate.value = new Date().toISOString().split('T')[0];
            
            // Tampilkan/sembunyikan transfer container
            if (DOM.transferContainer) {
                DOM.transferContainer.style.display = type === 'transfer' ? 'block' : 'none';
            }
            
            // Load kategori
            this.loadCategories(type);
            
            // Tampilkan modal
            DOM.transactionModal.show();
        },
        
        editTransaction: function(transactionId) {
            const transactions = utils.getData('transactions');
            const transaction = transactions.find(t => t.id === transactionId);
            
            if (!transaction || !DOM.transactionModal) return;
            
            STATE.editId = transactionId;
            STATE.currentTransactionType = transaction.type;
            
            // Update judul modal
            document.getElementById('transactionModalLabel').textContent = 'Edit Transaksi';
            
            // Isi form
            DOM.transactionType.value = transaction.type;
            DOM.transactionWallet.value = transaction.walletId;
            DOM.transactionAmount.value = transaction.amount;
            DOM.transactionDate.value = transaction.date.split('T')[0];
            DOM.transactionDesc.value = transaction.description || '';
            
            if (transaction.type === 'transfer') {
                DOM.transferTo.value = transaction.toWalletId;
                DOM.transferContainer.style.display = 'block';
            } else {
                DOM.transferContainer.style.display = 'none';
            }
            
            // Load kategori
            this.loadCategories(transaction.type);
            if (transaction.category) {
                DOM.transactionCategory.value = transaction.category;
            }
            
            // Tampilkan modal
            DOM.transactionModal.show();
        },
        
        handleTransactionTypeChange: function() {
            const type = DOM.transactionType.value;
            STATE.currentTransactionType = type;
            
            // Tampilkan/sembunyikan transfer container
            if (DOM.transferContainer) {
                DOM.transferContainer.style.display = type === 'transfer' ? 'block' : 'none';
            }
            
            // Load kategori
            this.loadCategories(type);
        },
        
        loadCategories: function(type) {
            if (!DOM.transactionCategory) return;
            
            DOM.transactionCategory.innerHTML = '<option value="">Pilih Kategori (Opsional)</option>';
            
            const categories = type === 'income' ? CONFIG.categories.income : 
                             type === 'expense' ? CONFIG.categories.expense : [];
            
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.name;
                DOM.transactionCategory.appendChild(option);
            });
        },
        
        saveTransaction: function() {
            const transaction = {
                type: DOM.transactionType.value,
                walletId: DOM.transactionWallet.value,
                amount: parseFloat(DOM.transactionAmount.value),
                date: DOM.transactionDate.value,
                description: DOM.transactionDesc.value.trim(),
                category: DOM.transactionCategory.value || null,
                createdAt: new Date().toISOString()
            };
            
            // Validasi dasar
            if (!transaction.walletId) {
                Swal.fire({
                    icon: 'error',
                    title: 'Peringatan',
                    text: 'Silakan pilih dompet terlebih dahulu!',
                    confirmButtonText: 'OK'
                });
                return;
            }
            
            if (!transaction.amount || isNaN(transaction.amount) || transaction.amount <= 0) {
                Swal.fire({
                    icon: 'error',
                    title: 'Peringatan',
                    text: 'Jumlah transaksi harus lebih dari 0!',
                    confirmButtonText: 'OK'
                });
                return;
            }
            
            if (transaction.type === 'transfer') {
                transaction.toWalletId = DOM.transferTo.value;
                if (!transaction.toWalletId) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Peringatan',
                        text: 'Silakan pilih dompet tujuan transfer!',
                        confirmButtonText: 'OK'
                    });
                    return;
                }
                
                if (transaction.walletId === transaction.toWalletId) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Peringatan',
                        text: 'Tidak bisa transfer ke dompet yang sama!',
                        confirmButtonText: 'OK'
                    });
                    return;
                }
            }
            
            // Validasi saldo untuk expense/transfer
            if (transaction.type === 'expense' || transaction.type === 'transfer') {
                const wallet = utils.getWalletById(transaction.walletId);
                const currentBalance = utils.calculateWalletBalance(transaction.walletId);
                
                // Adjust balance jika dalam mode edit
                if (STATE.editId) {
                    const transactions = utils.getData('transactions');
                    const originalTransaction = transactions.find(t => t.id === STATE.editId);
                    if (originalTransaction && (originalTransaction.type === 'expense' || originalTransaction.type === 'transfer')) {
                        currentBalance += originalTransaction.amount; // Kembalikan saldo sebelumnya
                    }
                }
                
                if (currentBalance === 0) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Saldo Tidak Cukup',
                        html: `Dompet <strong>${wallet.name}</strong> memiliki saldo 0!<br><br>
                              Anda tidak dapat melakukan ${transaction.type === 'expense' ? 'pengeluaran' : 'transfer'} dengan saldo 0.`,
                        confirmButtonText: 'OK'
                    });
                    return;
                }
                
                if (!utils.checkWalletBalance(transaction.walletId, transaction.amount)) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Saldo Tidak Cukup',
                        html: `Saldo dompet <strong>${wallet.name}</strong> tidak mencukupi!<br><br>
                              Saldo saat ini: ${utils.formatCurrency(currentBalance)}<br>
                              Kebutuhan: ${utils.formatCurrency(transaction.amount)}`,
                        confirmButtonText: 'OK'
                    });
                    return;
                }
            }
            
            // Lanjutkan proses penyimpanan transaksi
            const transactions = utils.getData('transactions');
            
            if (STATE.editId) {
                // Update transaksi yang ada
                const index = transactions.findIndex(t => t.id === STATE.editId);
                if (index !== -1) {
                    transactions[index] = { ...transactions[index], ...transaction };
                    Swal.fire({
                        icon: 'success',
                        title: 'Berhasil',
                        text: 'Transaksi berhasil diperbarui',
                        timer: 2000,
                        showConfirmButton: false
                    });
                }
            } else {
                // Tambah transaksi baru
                transaction.id = 'trans-' + Date.now();
                transactions.push(transaction);
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: 'Transaksi berhasil ditambahkan',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
            
            if (utils.saveData('transactions', transactions)) {
                // Reset form
                DOM.transactionForm.reset();
                STATE.editId = null;
                
                if (DOM.transactionModal) {
                    DOM.transactionModal.hide();
                }
                
                // Update UI
                this.updateDashboard();
                this.loadWallets();
                
                if (DOM.generateReportBtn) {
                    this.generateReport();
                }
                
                if (DOM.transactionsList) {
                    this.loadTransactions();
                }
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: 'Gagal menyimpan transaksi',
                    confirmButtonText: 'OK'
                });
            }
        },
        
        deleteTransaction: function(transactionId) {
            utils.confirm('Apakah Anda yakin ingin menghapus transaksi ini?', () => {
                const transactions = utils.getData('transactions');
                const updatedTransactions = transactions.filter(t => t.id !== transactionId);
                
                if (utils.saveData('transactions', updatedTransactions)) {
                    // Update UI
                    this.updateDashboard();
                    this.loadWallets();
                    
                    if (DOM.generateReportBtn) {
                        this.generateReport();
                    }
                    
                    if (DOM.transactionsList) {
                        this.loadTransactions();
                    }
                    
                    utils.showNotification('Transaksi berhasil dihapus');
                } else {
                    utils.showNotification('Gagal menghapus transaksi', 'danger');
                }
            });
        },
        
        handleReportPeriodChange: function() {
            if (DOM.reportPeriod && DOM.customDateRange) {
                if (DOM.reportPeriod.value === 'custom') {
                    DOM.customDateRange.style.display = 'flex';
                } else {
                    DOM.customDateRange.style.display = 'none';
                }
            }
        },
        
        generateReport: function() {
            if (!DOM.generateReportBtn) return;
            
            const transactions = utils.getData('transactions');
            const wallets = utils.getData('wallets');
            let filteredTransactions = [...transactions];
            
            // Filter berdasarkan periode
            const period = DOM.reportPeriod.value;
            const now = new Date();
            
            if (period === 'month') {
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                
                filteredTransactions = filteredTransactions.filter(t => {
                    const date = new Date(t.date);
                    return date.getMonth() === currentMonth && 
                           date.getFullYear() === currentYear;
                });
            } else if (period === 'last-month') {
                const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
                const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
                
                filteredTransactions = filteredTransactions.filter(t => {
                    const date = new Date(t.date);
                    return date.getMonth() === lastMonth && 
                           date.getFullYear() === year;
                });
            } else if (period === 'year') {
                const currentYear = now.getFullYear();
                
                filteredTransactions = filteredTransactions.filter(t => {
                    const date = new Date(t.date);
                    return date.getFullYear() === currentYear;
                });
            } else if (period === 'custom') {
                const startDate = new Date(DOM.reportStartDate.value);
                const endDate = new Date(DOM.reportEndDate.value);
                
                filteredTransactions = filteredTransactions.filter(t => {
                    const date = new Date(t.date);
                    return date >= startDate && date <= endDate;
                });
            }
            
            // Hitung total
            let reportIncome = 0;
            let reportExpense = 0;
            
            filteredTransactions.forEach(t => {
                if (t.type === 'income') reportIncome += t.amount;
                if (t.type === 'expense') reportExpense += t.amount;
            });
            
            // Tambahkan saldo awal dompet yang dibuat dalam periode ini
            if (period === 'month' || period === 'custom') {
                const startDate = period === 'month' ? 
                    new Date(now.getFullYear(), now.getMonth(), 1) : 
                    new Date(DOM.reportStartDate.value);
                
                const endDate = period === 'month' ? 
                    new Date(now.getFullYear(), now.getMonth() + 1, 0) : 
                    new Date(DOM.reportEndDate.value);
                
                wallets.forEach(wallet => {
                    const walletDate = new Date(wallet.createdAt);
                    if (walletDate >= startDate && walletDate <= endDate) {
                        reportIncome += wallet.initialBalance || 0;
                    }
                });
            }
            
            const reportBalance = reportIncome - reportExpense;
            
            // Hitung perubahan dari bulan lalu
            let lastMonthIncome = 0;
            let lastMonthExpense = 0;
            
            if (period === 'month' || period === 'last-month') {
                const lastMonthData = utils.getLastMonthData();
                
                transactions.forEach(t => {
                    const date = new Date(t.date);
                    if (date.getMonth() === lastMonthData.month && 
                        date.getFullYear() === lastMonthData.year) {
                        if (t.type === 'income') lastMonthIncome += t.amount;
                        if (t.type === 'expense') lastMonthExpense += t.amount;
                    }
                });
                
                // Tambahkan saldo awal dompet bulan lalu
                wallets.forEach(wallet => {
                    const walletDate = new Date(wallet.createdAt);
                    if (walletDate.getMonth() === lastMonthData.month && 
                        walletDate.getFullYear() === lastMonthData.year) {
                        lastMonthIncome += wallet.initialBalance || 0;
                    }
                });
            }
            
            const lastMonthBalance = lastMonthIncome - lastMonthExpense;
            const balanceChange = reportBalance - lastMonthBalance;
            const changePercentage = lastMonthBalance !== 0 ? 
                Math.round((balanceChange / Math.abs(lastMonthBalance)) * 100) : 0;
            
            // Update tampilan
            if (DOM.reportIncome) DOM.reportIncome.textContent = utils.formatCurrency(reportIncome);
            if (DOM.reportExpense) DOM.reportExpense.textContent = utils.formatCurrency(reportExpense);
            if (DOM.reportBalance) DOM.reportBalance.textContent = utils.formatCurrency(reportBalance);
            if (DOM.reportChange) {
                DOM.reportChange.textContent = `${balanceChange >= 0 ? '+' : ''}${utils.formatCurrency(balanceChange)} (${changePercentage}%)`;
                DOM.reportChange.className = balanceChange >= 0 ? 'text-success' : 'text-danger';
            }
            
            // Generate charts
            this.generateCharts(filteredTransactions, wallets);
            this.generateMonthlyComparisonChart(transactions);
        },
        
        generateCharts: function(transactions, wallets) {
            // Income by Category
            const incomeByCategory = {};
            transactions
                .filter(t => t.type === 'income')
                .forEach(t => {
                    const category = t.category || 'other-income';
                    incomeByCategory[category] = (incomeByCategory[category] || 0) + t.amount;
                });
            
            // Expense by Category
            const expenseByCategory = {};
            transactions
                .filter(t => t.type === 'expense')
                .forEach(t => {
                    const category = t.category || 'other-expense';
                    expenseByCategory[category] = (expenseByCategory[category] || 0) + t.amount;
                });
            
            // Wallet Balances
            const walletBalances = wallets.map(wallet => ({
                name: wallet.name,
                balance: utils.calculateWalletBalance(wallet.id),
                color: CONFIG.walletTypes[wallet.type]?.color || '#8d99ae'
            })).filter(wallet => wallet.balance > 0); // Hanya tampilkan dompet dengan saldo positif
            
            // Render charts
            this.renderChart('income', incomeByCategory);
            this.renderChart('expense', expenseByCategory);
            this.renderWalletChart(walletBalances);
        },
        
        generateMonthlyComparisonChart: function(allTransactions) {
            if (!DOM.monthlyComparisonChart) return;
            
            // Hancurkan chart sebelumnya jika ada
            if (STATE.chartInstances.monthlyComparison) {
                STATE.chartInstances.monthlyComparison.destroy();
            }
            
            const now = new Date();
            const currentYear = now.getFullYear();
            const months = [];
            const incomeData = [];
            const expenseData = [];
            
            // Siapkan data untuk 6 bulan terakhir
            for (let i = 5; i >= 0; i--) {
                const date = new Date(currentYear, now.getMonth() - i, 1);
                const monthName = date.toLocaleDateString('id-ID', { month: 'short' });
                months.push(monthName);
                
                // Hitung pemasukan dan pengeluaran untuk bulan ini
                let monthIncome = 0;
                let monthExpense = 0;
                
                allTransactions.forEach(t => {
                    const transactionDate = new Date(t.date);
                    if (transactionDate.getMonth() === date.getMonth() && 
                        transactionDate.getFullYear() === date.getFullYear()) {
                        if (t.type === 'income') monthIncome += t.amount;
                        if (t.type === 'expense') monthExpense += t.amount;
                    }
                });
                
                // Tambahkan saldo awal dompet yang dibuat bulan ini
                const wallets = utils.getData('wallets');
                wallets.forEach(wallet => {
                    const walletDate = new Date(wallet.createdAt);
                    if (walletDate.getMonth() === date.getMonth() && 
                        walletDate.getFullYear() === date.getFullYear()) {
                        monthIncome += wallet.initialBalance || 0;
                    }
                });
                
                incomeData.push(monthIncome);
                expenseData.push(monthExpense);
            }
            
            STATE.chartInstances.monthlyComparison = new Chart(DOM.monthlyComparisonChart, {
                type: 'bar',
                data: {
                    labels: months,
                    datasets: [
                        {
                            label: 'Pemasukan',
                            data: incomeData,
                            backgroundColor: '#4cc9f0',
                            borderWidth: 1
                        },
                        {
                            label: 'Pengeluaran',
                            data: expenseData,
                            backgroundColor: '#f72585',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Perbandingan Bulanan',
                            font: { size: 16 }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return utils.formatCurrency(context.raw);
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return utils.formatCurrency(value);
                                }
                            }
                        }
                    }
                }
            });
        },
        
        renderChart: function(type, data) {
            const ctx = type === 'income' ? DOM.incomeChart : DOM.expenseChart;
            if (!ctx) return;
            
            // Hancurkan chart sebelumnya jika ada
            if (STATE.chartInstances[type]) {
                STATE.chartInstances[type].destroy();
            }
            
            const categories = CONFIG.categories[type];
            const labels = [];
            const amounts = [];
            const colors = [];
            
            categories.forEach(cat => {
                if (data[cat.id]) {
                    labels.push(cat.name);
                    amounts.push(data[cat.id]);
                    colors.push(cat.color);
                }
            });
            
            // Handle other category
            const otherKey = `other-${type}`;
            if (data[otherKey]) {
                labels.push('Lainnya');
                amounts.push(data[otherKey]);
                colors.push('#8d99ae');
            }
            
            STATE.chartInstances[type] = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: amounts,
                        backgroundColor: colors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: type === 'income' ? 'Pemasukan per Kategori' : 'Pengeluaran per Kategori',
                            font: { size: 16 }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return utils.formatCurrency(context.raw);
                                }
                            }
                        }
                    }
                }
            });
        },
        
        renderWalletChart: function(walletData) {
            if (!DOM.walletChart) return;
            
            if (STATE.chartInstances.wallet) {
                STATE.chartInstances.wallet.destroy();
            }
            
            const labels = walletData.map(w => w.name);
            const balances = walletData.map(w => w.balance);
            const colors = walletData.map(w => w.color);
            
            STATE.chartInstances.wallet = new Chart(DOM.walletChart, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Saldo Dompet',
                        data: balances,
                        backgroundColor: colors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Saldo per Dompet',
                            font: { size: 16 }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return utils.formatCurrency(context.raw);
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return utils.formatCurrency(value);
                                }
                            }
                        }
                    }
                }
            });
        }
    };

    // Inisialisasi aplikasi
    app.init();
    window.app = app;
});