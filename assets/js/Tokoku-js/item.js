document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const daftarProduk = document.getElementById('daftarProduk');
    const formProduk = document.getElementById('formProduk');
    const btnExportProduk = document.getElementById('btnExportProduk');
    const btnImportProduk = document.getElementById('btnImportProduk');
    const fileImportProduk = document.getElementById('fileImportProduk');
    const fotoProduk = document.getElementById('fotoProduk');
    const pratinjauFoto = document.getElementById('pratinjauFoto');
    const modalTambahProduk = new bootstrap.Modal(document.getElementById('modalTambahProduk'));
    const cariProduk = document.getElementById('cariProduk');
    const btnResetPencarian = document.getElementById('btnResetPencarian');
    const filterKategori = document.getElementById('filterKategori');

    // Data
    let produkList = [];
    let filteredProdukList = [];
    let editIndex = -1;

    // Initialize
    initEventListeners();
    muatProduk();

    // Fungsi Inisialisasi
    function initEventListeners() {
        // Foto Preview
        fotoProduk.addEventListener('change', handleFotoChange);

        // Form Submit
        formProduk.addEventListener('submit', handleFormSubmit);

        // Import/Export
        if (btnImportProduk && fileImportProduk) {
            btnImportProduk.addEventListener('click', () => fileImportProduk.click());
            fileImportProduk.addEventListener('change', handleFileImport);
        }
        
        if (btnExportProduk) {
            btnExportProduk.addEventListener('click', handleExport);
        }

        // Search Functionality
        cariProduk.addEventListener('input', handleSearch);
        btnResetPencarian.addEventListener('click', resetSearch);
        if (filterKategori) {
            filterKategori.addEventListener('change', handleSearch);
        }
    }

    // Foto Handler
    function handleFotoChange(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                pratinjauFoto.src = event.target.result;
                pratinjauFoto.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    }

    // Load Products
    function muatProduk() {
        produkList = JSON.parse(localStorage.getItem('produk') || '[]');
        filteredProdukList = [];
        updateKategoriFilter();
        renderProdukList();
    }

    // Render Product List
    function renderProdukList() {
        const listToRender = filteredProdukList.length > 0 ? filteredProdukList : produkList;
        
        daftarProduk.innerHTML = listToRender.map((produk, index) => `
            <div class="col-md-4 col-lg-3 col-sm-6 col-12 mb-4">
                <div class="card card-produk border-0 shadow" style="border-radius: 16px;">
                    <img src="${produk.fotoProduk || 'https://walletku.biz.id/assets/img/image/notfound.webp'}" 
                         class="card-img-top" 
                         alt="${produk.namaProduk}"
                         style="border-radius: 16px 16px 0 0; object-fit: cover;height: 200px" loading="lazy">
                    <div class="card-body">
                        <h5 class="fw-bold text-bg-warning card-title" style="padding: 6px;padding-right: 12px;padding-left: 12px;border-radius: 16px;">${produk.namaProduk}</h5>
                        <div class="card-text">
                            <div class="d-flex flex-column gap-2">
                                <div>
                                    <span class="fw-bold" style="margin-left: 12px">Kategori:</span>
                                    <span class="d-block" style="margin-left: 18px">${produk.kategoriProduk}</span>
                                </div>
                                <div>
                                    <span class="fw-bold" style="margin-left: 12px">Harga Jual:</span>
                                    <span class="d-block" style="margin-left: 18px">Rp ${produk.hargaJual.toLocaleString()}</span>
                                </div>
                                <div>
                                    <span class="fw-bold" style="margin-left: 12px">Stok:</span>
                                    <span class="d-block" style="margin-left: 18px">${produk.stokProduk}</span>
                                </div>
                            </div>
                        </div>
                        <div class="d-flex justify-content-between mt-4 gap-2">
                            <button class="btn btn-warning flex-grow-1 edit-produk" 
                                    data-index="${listToRender === filteredProdukList ? produkList.indexOf(produk) : index}"
                                    style="border-radius: 16px;font-family: Nunito, sans-serif;box-shadow: 0px 6px 14px rgba(67,97,238,0.56);width: auto;border-width: 0px;padding-top: 8px;padding-right: 12px;padding-bottom: 8px;padding-left: 12px;">
                                <i class="bi bi-pencil"></i> Edit
                            </button>
                            <button class="btn btn-danger flex-grow-1 hapus-produk" 
                                    data-index="${listToRender === filteredProdukList ? produkList.indexOf(produk) : index}"
                                    style="border-radius: 16px;font-family: Nunito, sans-serif;box-shadow: 0px 6px 14px rgba(67,97,238,0.56);width: auto;">
                                <i class="bi bi-trash"></i> Hapus
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Add event listeners to edit and delete buttons
        document.querySelectorAll('.edit-produk').forEach(btn => {
            btn.addEventListener('click', editProduk);
        });

        document.querySelectorAll('.hapus-produk').forEach(btn => {
            btn.addEventListener('click', hapusProduk);
        });
    }

    // Form Handler
    async function handleFormSubmit(e) {
        e.preventDefault();

        const produkBaru = {
            namaProduk: document.getElementById('namaProduk').value,
            kategoriProduk: document.getElementById('kategoriProduk').value,
            hargaJual: parseFloat(document.getElementById('hargaJual').value),
            hargaModal: parseFloat(document.getElementById('hargaModal').value),
            stokProduk: parseInt(document.getElementById('stokProduk').value),
            barcodeProduk: document.getElementById('barcodeProduk').value,
            satuanProduk: document.getElementById('satuanProduk').value,
            catatanProduk: document.getElementById('catatanProduk').value
        };

        // Validate required fields
        if (!produkBaru.namaProduk || !produkBaru.kategoriProduk || isNaN(produkBaru.hargaJual) || isNaN(produkBaru.stokProduk)) {
            await Swal.fire({
                icon: 'error',
                title: 'Data tidak lengkap',
                text: 'Harap isi semua field yang wajib diisi (Nama, Kategori, Harga Jual, Stok)'
            });
            return;
        }

        // Process photo
        const file = fotoProduk.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                produkBaru.fotoProduk = reader.result;
                simpanProduk(produkBaru);
            };
            reader.readAsDataURL(file);
        } else {
            // Use old photo if no new photo
            if (editIndex !== -1) {
                produkBaru.fotoProduk = produkList[editIndex].fotoProduk;
            }
            simpanProduk(produkBaru);
        }
    }

    // Save Product
    async function simpanProduk(produkBaru) {
        try {
            if (editIndex === -1) {
                produkList.push(produkBaru);
            } else {
                produkList[editIndex] = produkBaru;
                editIndex = -1;
            }

            localStorage.setItem('produk', JSON.stringify(produkList));
            renderProdukList();
            updateKategoriFilter();
            
            // Reset form
            formProduk.reset();
            pratinjauFoto.src = '';
            pratinjauFoto.style.display = 'none';
            modalTambahProduk.hide();
            
            await Swal.fire({
                position: 'center',
                icon: 'success',
                title: 'Produk berhasil disimpan',
                showConfirmButton: false,
                timer: 1500
            });
        } catch (error) {
            console.error('Error saving product:', error);
            Swal.fire({
                icon: 'error',
                title: 'Gagal menyimpan',
                text: 'Terjadi kesalahan saat menyimpan produk'
            });
        }
    }

    // Edit Product
    function editProduk(e) {
        editIndex = parseInt(e.currentTarget.dataset.index);
        const produk = produkList[editIndex];

        // Fill form with product data
        document.getElementById('namaProduk').value = produk.namaProduk;
        document.getElementById('kategoriProduk').value = produk.kategoriProduk;
        document.getElementById('hargaJual').value = produk.hargaJual;
        document.getElementById('hargaModal').value = produk.hargaModal;
        document.getElementById('stokProduk').value = produk.stokProduk;
        document.getElementById('barcodeProduk').value = produk.barcodeProduk || '';
        document.getElementById('satuanProduk').value = produk.satuanProduk || '';
        document.getElementById('catatanProduk').value = produk.catatanProduk || '';

        // Show photo if exists
        if (produk.fotoProduk) {
            pratinjauFoto.src = produk.fotoProduk;
            pratinjauFoto.style.display = 'block';
        } else {
            pratinjauFoto.src = '';
            pratinjauFoto.style.display = 'none';
        }

        // Open modal
        modalTambahProduk.show();
    }

    // Delete Product
    async function hapusProduk(e) {
        const index = parseInt(e.currentTarget.dataset.index);
        const produk = produkList[index];
        
        const { isConfirmed } = await Swal.fire({
            title: `PERHATIKAN!`,
            text: "Produk yang dihapus mungkin akan mempengaruhi laporan : hilangnya riwayat transaksi produk tersebut yang telah di proses sebelumnya dan tidak dapat dipulihkan. tetap menghapus produk '${produk.namaProduk}'?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Lanjutkan!',
            cancelButtonText: 'Urungkan'
        });

        if (isConfirmed) {
            produkList.splice(index, 1);
            localStorage.setItem('produk', JSON.stringify(produkList));
            renderProdukList();
            updateKategoriFilter();
            
            await Swal.fire(
                'Terhapus!',
                'Produk telah dihapus.',
                'success'
            );
        }
    }

    // Search Functionality
    function handleSearch() {
        const keyword = cariProduk.value.toLowerCase().trim();
        const selectedKategori = filterKategori ? filterKategori.value : '';
        
        if (!keyword && !selectedKategori) {
            filteredProdukList = [];
            renderProdukList();
            return;
        }
        
        filteredProdukList = produkList.filter(produk => {
            const matchesKeyword = 
                produk.namaProduk.toLowerCase().includes(keyword) ||
                produk.kategoriProduk.toLowerCase().includes(keyword) ||
                (produk.barcodeProduk && produk.barcodeProduk.toLowerCase().includes(keyword)) ||
                (produk.catatanProduk && produk.catatanProduk.toLowerCase().includes(keyword)) ||
                produk.hargaJual.toString().includes(keyword) ||
                produk.stokProduk.toString().includes(keyword);
            
            const matchesKategori = !selectedKategori || produk.kategoriProduk === selectedKategori;
            
            return matchesKeyword && matchesKategori;
        });
        
        renderProdukList();
    }

    function resetSearch() {
        cariProduk.value = '';
        if (filterKategori) filterKategori.value = '';
        filteredProdukList = [];
        renderProdukList();
    }

    function updateKategoriFilter() {
        if (!filterKategori) return;
        
        const currentValue = filterKategori.value;
        const categories = [...new Set(produkList.map(p => p.kategoriProduk))];
        
        filterKategori.innerHTML = `
            <option value="">Semua Kategori</option>
            ${categories.map(k => `<option value="${k}">${k}</option>`).join('')}
        `;
        
        if (categories.includes(currentValue)) {
            filterKategori.value = currentValue;
        }
    }

    // Import Handler
    async function handleFileImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const { value: action } = await Swal.fire({
            title: 'Konfirmasi Import',
            text: `Anda akan mengimpor data dari ${file.name}`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Import',
            cancelButtonText: 'Batal',
            showLoaderOnConfirm: true,
            preConfirm: async () => {
                try {
                    const content = await readFile(file);
                    let importedProducts = [];
                    
                    if (file.name.endsWith('.csv')) {
                        importedProducts = parseCSV(content);
                    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                        if (typeof XLSX === 'undefined') {
                            throw new Error('Library SheetJS diperlukan untuk import Excel');
                        }
                        importedProducts = parseExcel(content);
                    } else {
                        throw new Error('Format file tidak didukung');
                    }
                    
                    if (importedProducts.length === 0) {
                        throw new Error('Tidak ada produk yang valid ditemukan dalam file');
                    }
                    
                    return { success: true, count: importedProducts.length, products: importedProducts };
                } catch (error) {
                    Swal.showValidationMessage(`Import gagal: ${error.message}`);
                    return false;
                }
            }
        });

        if (action && action.success) {
            // Merge with existing products
            const newProducts = [...produkList];
            let duplicates = 0;
            
            action.products.forEach(imported => {
                const existingIndex = newProducts.findIndex(p => 
                    p.namaProduk === imported.namaProduk || 
                    (p.barcodeProduk && p.barcodeProduk === imported.barcodeProduk)
                );
                
                if (existingIndex !== -1) {
                    newProducts[existingIndex] = imported;
                    duplicates++;
                } else {
                    newProducts.push(imported);
                }
            });
            
            produkList = newProducts;
            localStorage.setItem('produk', JSON.stringify(produkList));
            muatProduk();
            
            let message = `Berhasil mengimport ${action.count} produk.`;
            if (duplicates > 0) {
                message += ` ${duplicates} produk yang sudah ada diperbarui.`;
            }
            
            await Swal.fire({
                title: 'Import Berhasil',
                text: message,
                icon: 'success'
            });
        }
        
        // Reset file input
        e.target.value = '';
    }

    // Export Handler
    async function handleExport() {
        if (produkList.length === 0) {
            await Swal.fire({
                icon: 'info',
                title: 'Tidak ada data',
                text: 'Tidak ada produk untuk diexport'
            });
            return;
        }
        
        const { value: format } = await Swal.fire({
            title: 'Export Data',
            text: 'Pilih format export:',
            input: 'select',
            inputOptions: {
                'csv': 'CSV',
                'xlsx': 'Excel'
            },
            inputValue: 'csv',
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value) {
                    return 'Anda harus memilih format!';
                }
            }
        });

        if (!format) return;

        const { value: fileName } = await Swal.fire({
            title: 'Nama File',
            input: 'text',
            inputValue: `produk_${new Date().toISOString().split('T')[0]}`,
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value) {
                    return 'Anda harus memberi nama file!';
                }
            }
        });

        if (!fileName) return;

        try {
            if (format === 'csv') {
                exportToCSV(fileName);
            } else if (format === 'xlsx') {
                exportToExcel(fileName);
            }
            
            await Swal.fire({
                position: 'center',
                icon: 'success',
                title: 'Export Berhasil',
                showConfirmButton: false,
                timer: 1500
            });
        } catch (error) {
            console.error('Export error:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Export Gagal',
                text: 'Terjadi kesalahan saat mengekspor data'
            });
        }
    }

    // Helper Functions
    function readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = (error) => reject(error);
            
            if (file.name.endsWith('.csv')) {
                reader.readAsText(file);
            } else {
                reader.readAsArrayBuffer(file);
            }
        });
    }

    function parseCSV(content) {
        const lines = content.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        return lines.slice(1).map(line => {
            if (!line.trim()) return null;
            
            const values = line.split(',');
            const product = {};
            
            headers.forEach((header, index) => {
                const value = values[index] ? values[index].trim() : '';
                
                switch(header) {
                    case 'nama produk':
                        product.namaProduk = value;
                        break;
                    case 'kategori':
                        product.kategoriProduk = value;
                        break;
                    case 'harga jual':
                        product.hargaJual = parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
                        break;
                    case 'harga modal':
                        product.hargaModal = parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
                        break;
                    case 'stok':
                        product.stokProduk = parseInt(value.replace(/[^0-9]/g, '')) || 0;
                        break;
                    case 'barcode':
                        product.barcodeProduk = value;
                        break;
                    case 'satuan':
                        product.satuanProduk = value;
                        break;
                    case 'catatan':
                        product.catatanProduk = value;
                        break;
                }
            });
            
            return product.namaProduk ? product : null;
        }).filter(product => product !== null);
    }

    function parseExcel(content) {
        const workbook = XLSX.read(content, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        return jsonData.map(item => {
            const product = {
                namaProduk: item['Nama Produk'] || item['namaProduk'] || '',
                kategoriProduk: item['Kategori'] || item['kategoriProduk'] || '',
                hargaJual: parseFloat(item['Harga Jual'] || item['hargaJual'] || 0),
                hargaModal: parseFloat(item['Harga Modal'] || item['hargaModal'] || 0),
                stokProduk: parseInt(item['Stok'] || item['stokProduk'] || 0),
                barcodeProduk: item['Barcode'] || item['barcodeProduk'] || '',
                satuanProduk: item['Satuan'] || item['satuanProduk'] || '',
                catatanProduk: item['Catatan'] || item['catatanProduk'] || ''
            };
            return product.namaProduk ? product : null;
        }).filter(product => product !== null);
    }

    function exportToCSV(fileName) {
        const csvContent = [
            ['Nama Produk', 'Kategori', 'Harga Jual', 'Harga Modal', 'Stok', 'Barcode', 'Satuan', 'Catatan'],
            ...produkList.map(produk => [
                `"${produk.namaProduk}"`,
                `"${produk.kategoriProduk}"`,
                produk.hargaJual,
                produk.hargaModal,
                produk.stokProduk,
                `"${produk.barcodeProduk || ''}"`,
                `"${produk.satuanProduk || ''}"`,
                `"${produk.catatanProduk || ''}"`
            ])
        ].map(e => e.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        downloadFile(blob, `${fileName}.csv`);
    }

    function exportToExcel(fileName) {
        if (typeof XLSX === 'undefined') {
            throw new Error('Library SheetJS diperlukan untuk export Excel');
        }
        
        const excelData = produkList.map(produk => ({
            'Nama Produk': produk.namaProduk,
            'Kategori': produk.kategoriProduk,
            'Harga Jual': produk.hargaJual,
            'Harga Modal': produk.hargaModal,
            'Stok': produk.stokProduk,
            'Barcode': produk.barcodeProduk || '',
            'Satuan': produk.satuanProduk || '',
            'Catatan': produk.catatanProduk || ''
        }));
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);
        XLSX.utils.book_append_sheet(wb, ws, "Daftar Produk");
        XLSX.writeFile(wb, `${fileName}.xlsx`);
    }

    function downloadFile(blob, fileName) {
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});