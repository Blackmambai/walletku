document.addEventListener('DOMContentLoaded', () => {  
    const cariProduk = document.getElementById('cariProduk');  
    const daftarProduk = document.getElementById('daftarProduk');  
    const keranjang = document.getElementById('keranjang');  
    const totalHarga = document.getElementById('totalHarga');  
    const btnProsesPembayaran = document.getElementById('btnProsesPembayaran');  
    const formTambahProdukCepat = document.getElementById('formTambahProdukCepat');  
    const formPembayaran = document.getElementById('formPembayaran');  
    const strukPembayaran = document.getElementById('strukPembayaran');  
    const btnCetakNota = document.getElementById('btnCetakNota');  

    let keranjangItems = [];  
    let produkList = JSON.parse(localStorage.getItem('produk') || '[]');  

    // Fungsi untuk update stok produk (updated)
    function updateStokProduk(namaProduk, jumlah, operasi = 'kurangi') {  
        const produkIndex = produkList.findIndex(p => p.namaProduk === namaProduk);  
        if (produkIndex !== -1) {  
            if (operasi === 'kurangi') {  
                produkList[produkIndex].stokProduk -= jumlah;  
            } else {  
                produkList[produkIndex].stokProduk += jumlah;  
            }  
            // Pastikan stok tidak negatif
            produkList[produkIndex].stokProduk = Math.max(produkList[produkIndex].stokProduk, 0);
            localStorage.setItem('produk', JSON.stringify(produkList));  
            muatProduk(cariProduk.value);  
        }  
    }  

    // Fungsi untuk membuat struk  
    function buatStruk(nota) {  
        const pengaturanToko = JSON.parse(localStorage.getItem('pengaturanToko') || '{}');  
        // Konversi ISO string ke format yang mudah dibaca
    const tanggal = new Date(nota.tanggal);
    const options = { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit', 
        timeZone: 'Asia/Jakarta' 
    };
    const tanggalTerformat = tanggal.toLocaleDateString('id-ID', options) + ' WIB';

    // Di bagian tampilan tanggal, ganti:
    // <span style="font-weight: 500;">${nota.tanggal}</span>
    // <span style="font-weight: 500;">${tanggalTerformat}</span>
        return `  
            <div id="strukCetak" class="container-fluid p-3" style="  
                max-width: 400px;   
                margin: 0 auto;   
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;  
                border: 2px solid #4a90e2;  
                border-radius: 10px;  
                box-shadow: 0 0 15px rgba(74, 144, 226, 0.3);  
                position: relative;  
                overflow: hidden;  
                background: linear-gradient(135deg, #f8f9fa 0%, #e9f5ff 100%);  
            ">  
                <!-- Watermark -->  
                <div style="  
                    position: absolute;  
                    opacity: 0.1;  
                    font-size: 120px;  
                    font-weight: bold;  
                    color: #4a90e2;  
                    transform: rotate(-30deg);  
                    top: 30%;  
                    left: 10%;  
                    z-index: 0;  
                    pointer-events: none;  
                ">  
                    walletku.biz.id  
                </div>  
                
                <div class="position-relative" style="z-index: 1;">  
                    <!-- Header -->  
                    <div class="text-center mb-3">  
                        ${pengaturanToko.logoToko ?   
                            `<img src="${pengaturanToko.logoToko}"   
                                   class="img-fluid mb-2"   
                                   style="max-height: 80px;">`   
                            : ''  
                        }  
                        <h3 class="mb-1" style="color: #2c3e50; font-weight: bold;">  
                            ${pengaturanToko.namaToko || 'TOKO SAYA'}  
                        </h3>  
                        <p class="mb-1 text-muted small">  
                            <i class="fas fa-map-marker-alt"></i> ${pengaturanToko.alamatToko || 'Alamat Tidak Tersedia'}  
                        </p>  
                        <p class="mb-2 text-muted small">  
                            <i class="fab fa-whatsapp"></i> ${pengaturanToko.nomorWAToko || '-'}  
                        </p>  
                        <hr style="border-top: 2px dashed #4a90e2; opacity: 0.7;">  
                    </div>  
                    
                    <!-- Customer Info -->  
                    <div class="mb-3">  
                        <div class="d-flex justify-content-between mb-1">  
                            <span class="text-muted">Nama:</span>  
                            <span style="font-weight: 500;">${nota.namaPelanggan || 'Pelanggan Umum'}</span>  
                        </div>  
                        <div class="d-flex justify-content-between mb-1">  
                            <span class="text-muted">Tanggal:</span>  
                            <span style="font-weight: 500;">${tanggalTerformat}</span>  
                        </div>  
                        <div class="d-flex justify-content-between mb-2">  
                            <span class="text-muted">Metode:</span>  
                            <span class="badge bg-primary">${nota.metodePembayaran}</span>  
                        </div>  
                        <hr style="border-top: 2px dashed #4a90e2; opacity: 0.7;">  
                    </div>  
                    
                    <!-- Product List -->  
                    <div class="mb-3">  
                        <table class="table table-sm">  
                            <thead>  
                                <tr style="background-color: #e9f5ff;">  
                                    <th class="ps-0" style="color: #2c3e50;">Produk</th>  
                                    <th class="text-end pe-0" style="color: #2c3e50;">Jumlah</th>  
                                    <th class="text-end pe-0" style="color: #2c3e50;">Total</th>  
                                </tr>  
                            </thead>  
                            <tbody>  
                                ${nota.produk.map(item => `  
                                    <tr>  
                                        <td class="ps-0">${item.nama}</td>  
                                        <td class="text-end pe-0">${item.jumlah} x ${item.harga.toLocaleString()}</td>  
                                        <td class="text-end pe-0" style="font-weight: 500;">${(item.harga * item.jumlah).toLocaleString()}</td>  
                                    </tr>  
                                `).join('')}  
                            </tbody>  
                        </table>  
                        
                        <hr style="border-top: 2px dashed #4a90e2; opacity: 0.7;">  
                        
                        <!-- Summary -->  
                        <div class="mb-2">  
                            <div class="d-flex justify-content-between">  
                                <span class="text-muted">Total:</span>  
                                <span class="fw-bold" style="color: #2c3e50;">Rp ${nota.totalHarga.toLocaleString()}</span>  
                            </div>  
                            <div class="d-flex justify-content-between">  
                                <span class="text-muted">Bayar:</span>  
                                <span class="fw-bold" style="color: #27ae60;">Rp ${nota.uangDiterima.toLocaleString()}</span>  
                            </div>  
                            <div class="d-flex justify-content-between">  
                                <span class="text-muted">Kembali:</span>  
                                <span class="fw-bold" style="color: #e74c3c;">Rp ${nota.kembalian.toLocaleString()}</span>  
                            </div>  
                        </div>  
                        
                        <hr style="border-top: 2px dashed #4a90e2; opacity: 0.7;">  
                        
                        <!-- Footer -->  
                        <div class="text-center mt-3">  
                            <p class="small text-muted mb-1">  
                                ${pengaturanToko.catatanKakiStruk || 'Terima Kasih Telah Berbelanja'}  
                            </p>
                            <div class="align-item-center">
                            <p class="" style="font-size: 14px; color: #4a90e2; font-weight: 500; margin: 0;">  
                                <i class="fas fa-wallet"></i> WalletKu.biz.id  
                            </p>
                            <p class="" style="font-size: 14px; color: #4a90e2; font-weight: 500; margin: 0;">  
                                <i class=""></i>Ahli mengatur toko dan keuangan  
                            </p>
                            </div>
                        </div>  
                    </div>  
                </div>  
            </div>  
        `;  
    }  

    // Fungsi Cetak Nota  
    function cetakNota(nota) {  
        const jendelaCetak = window.open('', '_blank', 'width=800,height=600');  
        if (!nota) {  
            alert('Nota tidak valid');  
            return;  
        }  
        jendelaCetak.document.open();  
        jendelaCetak.document.write(`  
            <html>  
                <head>  
                    <title>Cetak Nota</title>  
                    <style>  
                        @media print {  
                            body { display: flex; justify-content: center; align-items: center; margin: 0; padding: 0; }  
                            #strukCetak { max-width: 300px !important; margin: 0 auto !important; }  
                        }  
                        body { font-family: 'Courier New', monospace; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }  
                    </style>  
                </head>  
                <body>  
                    ${buatStruk(nota)}  
                    <script>  
                        window.onload = function() {  
                            window.print();  
                            window.close();  
                        }  
                    <\/script>  
                </body>  
            </html>  
        `);  
        jendelaCetak.document.close();  
    }  

    // Muat Produk  
    function muatProduk(filter = '') {  
        const produkTersedia = produkList.filter(p =>  
            p.stokProduk > 0 && p.namaProduk.toLowerCase().includes(filter.toLowerCase())  
        );  

        daftarProduk.innerHTML = produkTersedia.map(produk => `  
            <div class="col-md-4" style="padding: 5px;margin-bottom: 16px;">  
                <div class="card summary-card paddingAll produk01" style="padding: 10px;">  
                    <div class="card-body" style="padding: 0px;">  
                        <img src="${produk.fotoProduk || 'https://walletku.biz.id/assets/img/image/notfound.webp'}" class="card-img-top" alt="${produk.namaProduk}" style="border-radius: 16px 16px 0 0; object-fit: cover; height: 200px; margin-bottom: 16px;">  
                        <h5 class="card-title" style="font-family: Nunito, sans-serif;font-size: 20px;font-weight: bold;">${produk.namaProduk}</h5>  
                        <p class="card-text" style="font-family: Nunito, sans-serif;font-size: 16px;color: rgb(43,43,44);font-weight: bold;">  
                            Harga: Rp ${produk.hargaJual.toLocaleString()}<br />  
                            Stok: ${produk.stokProduk}  
                        </p>  
                        <button class="btn btn-primary text-nowrap text-start d-flex d-xxl-flex justify-content-center align-items-center tambah-produk btnproduk1"  
                                data-nama="${produk.namaProduk}"  
                                data-harga="${produk.hargaJual}"  
                                data-stok="${produk.stokProduk}">  
                            <i class="fas fa-plus-circle" style="margin-right: 10px;"></i> Tambah  
                        </button>  
                    </div>  
                </div>  
            </div>  
        `).join('');  

        document.querySelectorAll('.tambah-produk').forEach(btn => {  
            btn.addEventListener('click', tambahKeKeranjang);  
        });  
    }  

    // Tambah ke Keranjang (updated)
    function tambahKeKeranjang(e) {  
        const nama = e.currentTarget.dataset.nama;  
        const harga = parseFloat(e.currentTarget.dataset.harga);  
        const stok = parseInt(e.currentTarget.dataset.stok);  

        const produk = produkList.find(p => p.namaProduk === nama);  
        if (!produk) return;
        
        // Cek apakah stok mencukupi
        const itemExist = keranjangItems.find(item => item.nama === nama);
        const jumlahDiKeranjang = itemExist ? itemExist.jumlah : 0;
        
        if (produk.stokProduk <= jumlahDiKeranjang) {
            alert('Stok produk tidak mencukupi!');
            return;
        }

        if (itemExist) {  
            itemExist.jumlah++;  
        } else {  
            keranjangItems.push({ nama, harga, jumlah: 1 });  
        }  

        updateKeranjang();  
    }  

    // Update Keranjang  
    function updateKeranjang() {  
        keranjang.innerHTML = keranjangItems.map((item, index) => {  
            const produk = produkList.find(p => p.namaProduk === item.nama);
            const stokTersedia = produk ? produk.stokProduk : 0;
            const stokWarning = item.jumlah > stokTersedia ? 'style="color: red;"' : '';
            
            return `  
                <li class="list-group-item d-flex justify-content-between align-items-center">  
                    <div>  
                        <strong>${item.nama}</strong>  
                        <small class="d-block">Rp ${item.harga.toLocaleString()} x ${item.jumlah}</small>  
                        <small class="d-block" ${stokWarning}>Stok tersedia: ${stokTersedia}</small>  
                    </div>  
                    <div>  
                        <button class="btn btn-sm btn-outline-danger me-2 kurang-item" data-index="${index}" data-nama="${item.nama}">  
                            <i class="fas fa-minus"></i>  
                        </button>  
                        <button class="btn btn-sm btn-outline-danger hapus-item" data-index="${index}" data-nama="${item.nama}">  
                            <i class="fas fa-trash"></i>  
                        </button>  
                    </div>  
                </li>  
            `;
        }).join('');  

        const total = keranjangItems.reduce((sum, item) => sum + (item.harga * item.jumlah), 0);  
        totalHarga.textContent = `Rp ${total.toLocaleString()}`;  

        document.querySelectorAll('.kurang-item').forEach(btn => {  
            btn.addEventListener('click', kurangItem);  
        });  

        document.querySelectorAll('.hapus-item').forEach(btn => {  
            btn.addEventListener('click', hapusItem);  
        });  
    }  

    // Kurang Item  
    function kurangItem(e) {  
        const index = e.currentTarget.dataset.index;  
        
        if (keranjangItems[index].jumlah > 1) {  
            keranjangItems[index].jumlah--;  
        } else {  
            keranjangItems.splice(index, 1);  
        }  
        updateKeranjang();  
    }  

    // Hapus Item  
    function hapusItem(e) {  
        const index = e.currentTarget.dataset.index;  
        keranjangItems.splice(index, 1);  
        updateKeranjang();  
    }  

    // Tambah Produk Cepat  
    formTambahProdukCepat.addEventListener('submit', (e) => {  
        e.preventDefault();  
        const produk = {  
            namaProduk: document.getElementById('namaProdukBaru').value,  
            hargaJual: parseFloat(document.getElementById('hargaProdukBaru').value),  
            stokProduk: parseInt(document.getElementById('stokProdukBaru').value),  
            fotoProduk: 'https://walletku.biz.id/assets/img/notfound.webp'  
        };  

        produkList.push(produk);  
        localStorage.setItem('produk', JSON.stringify(produkList));  

        formTambahProdukCepat.reset();  
        bootstrap.Modal.getInstance(document.getElementById('modalTambahProduk')).hide();  
        muatProduk();  
    });  

    // Proses Pembayaran  
    btnProsesPembayaran.addEventListener('click', () => {  
        if (keranjangItems.length === 0) {  
            alert('Keranjang masih kosong');  
            return;  
        }  

        // Validasi stok sebelum pembayaran
        let stokValid = true;
        keranjangItems.forEach(item => {
            const produk = produkList.find(p => p.namaProduk === item.nama);
            if (!produk || produk.stokProduk < item.jumlah) {
                stokValid = false;
                alert(`Stok tidak cukup untuk produk ${item.nama}`);
            }
        });

        if (!stokValid) return;

        const total = keranjangItems.reduce((sum, item) => sum + (item.harga * item.jumlah), 0);  
        document.getElementById('totalPembayaran').value = `Rp ${total.toLocaleString()}`;  
        new bootstrap.Modal(document.getElementById('modalPembayaran')).show();  
    });  

    // Submit Pembayaran (updated)
    formPembayaran.addEventListener('submit', (e) => {  
        e.preventDefault();  
        const total = keranjangItems.reduce((sum, item) => sum + (item.harga * item.jumlah), 0);  
        const uangDiterima = parseFloat(document.getElementById('uangDiterima').value);  
        const namaPelanggan = document.getElementById('namaPelanggan').value;  
        const metodePembayaran = document.getElementById('metodePembayaran').value;  

        if (uangDiterima < total) {  
            alert('Uang yang diterima kurang');  
            return;  
        }  

        // Update stok produk setelah pembayaran berhasil
        keranjangItems.forEach(item => {
            updateStokProduk(item.nama, item.jumlah, 'kurangi');
        });

        // Simpan nota  
        const nota = JSON.parse(localStorage.getItem('nota') || '[]');  
        const notaBaru = {  
    tanggal: new Date().toISOString(), // Ganti toLocaleString() ke toISOString()  
            namaPelanggan,  
            metodePembayaran,  
            produk: keranjangItems,  
            totalHarga: total,  
            uangDiterima,  
            kembalian: uangDiterima - total  
        };  
        nota.push(notaBaru);  
        localStorage.setItem('nota', JSON.stringify(nota));  

        // Tampilkan struk  
        strukPembayaran.innerHTML = buatStruk(notaBaru);  
        const modalStruk = new bootstrap.Modal(document.getElementById('modalStruk'));  
        modalStruk.show();  

        btnCetakNota.onclick = () => {  
            cetakNota(notaBaru);  
        };  

        // Reset keranjang  
        keranjangItems = [];  
        updateKeranjang();  
        formPembayaran.reset();  
        bootstrap.Modal.getInstance(document.getElementById('modalPembayaran')).hide();  
    });  
    
    
    
    // Hitung Kembalian  
    document.getElementById('uangDiterima').addEventListener('input', (e) => {  
        const total = keranjangItems.reduce((sum, item) => sum + (item.harga * item.jumlah), 0);  
        const uangDiterima = parseFloat(e.target.value);  
        const kembalian = uangDiterima - total;  
        document.getElementById('kembalian').value = `Rp ${kembalian.toLocaleString()}`;  
    });  

    // Muat produk awal  
    muatProduk();  

    // Pencarian Produk  
    cariProduk.addEventListener('input', (e) => {  
        muatProduk(e.target.value);  
    });  
});