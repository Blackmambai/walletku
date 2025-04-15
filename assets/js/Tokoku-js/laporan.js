document.addEventListener('DOMContentLoaded', () => {  
    const totalPenjualan = document.getElementById('totalPenjualan');  
    const totalLaba = document.getElementById('totalLaba');  
    const produkTerjual = document.getElementById('produkTerjual');  
    const detailPenjualan = document.getElementById('detailPenjualan');  
    const produkTerlaris = document.getElementById('produkTerlaris');  
    const btnHarian = document.getElementById('btnHarian');  
    const btnBulanan = document.getElementById('btnBulanan');  
    const btnExportLaporan = document.getElementById('btnExportLaporan');  
    const btnTerapkanFilter = document.getElementById('btnTerapkanFilter');  
    const filterProduk = document.getElementById('filterProduk');  
    const tanggalMulai = document.getElementById('tanggalMulai');  
    const tanggalSelesai = document.getElementById('tanggalSelesai');  
    const btnMingguan = document.getElementById('btnMingguan');  
    const btnCustom = document.getElementById('btnCustom');  
    const btnHariIni = document.getElementById('btnHariIni');  
    const btnMingguIni = document.getElementById('btnMingguIni');  
    const btnBulanIni = document.getElementById('btnBulanIni');  
    const btnTahunIni = document.getElementById('btnTahunIni');  
    const kunjunganHariIni = document.getElementById('kunjunganHariIni');  

    let nota = [];  
    let produk = [];  
    let grafikPenjualan = null;  
    let grafikFrekuensi = null;
    // Fungsi Buat Struk untuk Cetak Nota  
    function buatStruk(nota) {  
        const pengaturanToko = JSON.parse(localStorage.getItem('pengaturanToko') || '{}');  
        const tanggal = new Date(nota.tanggal);
    const tanggalTerformat = tanggal.toLocaleDateString('id-ID', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    }) + ' WIB';

    // Ganti ${nota.tanggal} dengan ${tanggalTerformat}
        
        
        return `  
            <div id="strukCetak" style="  
                max-width: 300px;  
                width: 100%;  
                margin: 0 auto;  
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;  
                padding: 12px;  
                border: 2px solid #4a90e2;  
                border-radius: 8px;  
                box-shadow: 0 0 10px rgba(74, 144, 226, 0.2);  
                background: linear-gradient(135deg, #f8f9fa 0%, #e9f5ff 100%);  
                position: relative;  
                overflow: hidden;">  
                <!-- Watermark -->  
                <div style="  
                    position: absolute;  
                    opacity: 0.1;  
                    font-size: 80px;  
                    font-weight: bold;  
                    color: #4a90e2;  
                    transform: rotate(-30deg);  
                    top: 30%;  
                    left: 10%;  
                    z-index: 0;  
                    pointer-events: none;">  
                    ${pengaturanToko.namaToko || 'TOKO SAYA'}  
                </div>  

                <!-- Konten Struk -->  
                <div style="position: relative; z-index: 1;">  
                    <!-- Header -->  
                    <div style="text-align: center; margin-bottom: 10px;">  
                        ${pengaturanToko.logoToko ?   
                            `<img src="${pengaturanToko.logoToko}"   
                               style="max-height: 70px; margin-bottom: 5px;">`   
                            : ''  
                        }  
                        <h3 style="margin: 0; color: #2c3e50; font-size: 1.2rem; font-weight: bold;">  
                            ${pengaturanToko.namaToko || 'TOKO SAYA'}  
                        </h3>  
                        <p style="margin: 3px 0; font-size: 0.7rem; color: #6c757d;">  
                            <i class="fas fa-map-marker-alt"></i> ${pengaturanToko.alamatToko || 'Alamat Tidak Tersedia'}  
                        </p>  
                        <p style="margin: 3px 0; font-size: 0.7rem; color: #6c757d;">  
                            <i class="fab fa-whatsapp"></i> ${pengaturanToko.nomorWAToko || '-'}  
                        </p>  
                        <hr style="border-top: 1px dashed #4a90e2; margin: 8px 0; opacity: 0.7;">  
                    </div>  

                    <!-- Info Pelanggan -->  
                    <div style="margin-bottom: 10px; font-size: 0.8rem;">  
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">  
                            <span style="color: #6c757d;">Nama:</span>  
                            <span style="font-weight: 500;">${nota.namaPelanggan || 'Pelanggan Umum'}</span>  
                        </div>  
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">  
                            <span style="color: #6c757d;">Tanggal:</span>  
                            <span style="font-weight: 500;">${tanggalTerformat}</span>  
                        </div>  
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">  
                            <span style="color: #6c757d;">Metode:</span>  
                            <span style="background-color: #4a90e2; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem;">  
                                ${nota.metodePembayaran}  
                            </span>  
                        </div>  
                        <hr style="border-top: 1px dashed #4a90e2; margin: 8px 0; opacity: 0.7;">  
                    </div>  

                    <!-- Daftar Produk -->  
                    <table style="width: 100%; font-size: 0.8rem; margin-bottom: 10px;">  
                        <thead>  
                            <tr style="border-bottom: 1px solid #e9f5ff;">  
                                <th style="text-align: left; padding-bottom: 5px;">Produk</th>  
                                <th style="text-align: right; padding-bottom: 5px;">Jumlah</th>  
                                <th style="text-align: right; padding-bottom: 5px;">Total</th>  
                            </tr>  
                        </thead>  
                        <tbody>  
                            ${nota.produk.map(item => `  
                                <tr>  
                                    <td>${item.nama}</td>  
                                    <td style="text-align: right;">${item.jumlah} × ${item.harga.toLocaleString()}</td>  
                                    <td style="text-align: right; font-weight: 500;">${(item.harga * item.jumlah).toLocaleString()}</td>  
                                </tr>  
                            `).join('')}  
                        </tbody>  
                    </table>  

                    <hr style="border-top: 1px dashed #4a90e2; margin: 8px 0; opacity: 0.7;">  

                    <!-- Ringkasan Pembayaran -->  
                    <div style="font-size: 0.8rem; margin-bottom: 10px;">  
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">  
                            <span style="color: #6c757d;">Total:</span>  
                            <span style="font-weight: bold; color: #2c3e50;">Rp ${nota.totalHarga.toLocaleString()}</span>  
                        </div>  
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">  
                            <span style="color: #6c757d;">Bayar:</span>  
                            <span style="font-weight: bold; color: #28a745;">Rp ${nota.uangDiterima.toLocaleString()}</span>  
                        </div>  
                        <div style="display: flex; justify-content: space-between;">  
                            <span style="color: #6c757d;">Kembali:</span>  
                            <span style="font-weight: bold; color: #dc3545;">Rp ${nota.kembalian.toLocaleString()}</span>  
                        </div>  
                    </div>  

                    <hr style="border-top: 1px dashed #4a90e2; margin: 8px 0; opacity: 0.7;">  

                    <!-- Footer -->  
                    <div style="text-align: center;">  
                        <p style="font-size: 0.7rem; color: #6c757d; margin-bottom: 5px;">  
                            ${pengaturanToko.catatanKakiStruk || 'Terima Kasih'}  
                        </p>  
                        
                        <div class="premium2">  
                            <p class="small mb-0 premium2" style="color: #4a90e2; font-weight: 500; font-size: 0.7rem;">  
                                <i class="fas fa-lock"></i> by: walletku.biz.id  
                            </p>  
                        </div>  
                        <div class="premium2">  
                            <p style="font-size: 0.7rem; color: #4a90e2; font-weight: 500; margin: 0;" class="premium2">  
                                <i class="fas fa-lock"></i> WalletKu.biz.id | Upgrade Premium  
                            </p>  
                        </div>  
                    </div>  
                </div>  
            </div>  
        `;  
    }  

    // Fungsi Cetak Nota Universal  
    function cetakNota(nota) {  
        const jendelaCetak = window.open('', '_blank', 'width=600,height=600');  
        
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
                            body {   
                                display: flex;   
                                justify-content: center;   
                                align-items: center;   
                                margin: 0;  
                                padding: 0;  
                            }  
                            #strukCetak {   
                                max-width: 600px !important;   
                                margin: 0 auto !important;  
                            }  
                        }  
                        body {   
                            font-family: 'Courier New', monospace;   
                            display: flex;   
                            justify-content: center;   
                            align-items: center;   
                            height: 100vh;   
                            margin: 0;   
                        }  
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

    // Fungsi Muat Data  
    function muatData() {  
        nota = JSON.parse(localStorage.getItem('nota') || '[]');  
        produk = JSON.parse(localStorage.getItem('produk') || '[]');  

        // Isi filter produk  
        filterProduk.innerHTML = produk.map(p => `  
            <option value="${p.namaProduk}">${p.namaProduk}</option>  
        `).join('');  

        // Hitung statistik  
        hitungStatistik(nota);  

        // Buat grafik default (harian)  
        buatGrafikPenjualan('harian');  

        // Tampilkan detail penjualan  
        tampilkanDetailPenjualan(nota);  

        // Tampilkan produk terlaris  
        tampilkanProdukTerlaris();  

        // Hitung kunjungan hari ini  
        hitungKunjunganHariIni();  
    }  

    // Fungsi Hitung Statistik  
    function hitungStatistik(dataNota) {  
        const totalPenjualanValue = dataNota.reduce((total, n) => total + n.totalHarga, 0);  
        const totalLabaValue = dataNota.reduce((total, n) => {  
            const labaTransaksi = n.produk.reduce((subTotal, p) => {  
                const produkDetail = produk.find(pr => pr.namaProduk === p.nama);  
                return subTotal + ((p.harga - produkDetail.hargaModal) * p.jumlah);  
            }, 0);  
            return total + labaTransaksi;  
        }, 0);  
        const produkTerjualValue = dataNota.reduce((total, n) =>   
            total + n.produk.reduce((subTotal, p) => subTotal + p.jumlah, 0)  
        , 0);  

        totalPenjualan.textContent = `Rp ${totalPenjualanValue.toLocaleString()}`;  
        totalLaba.textContent = `Rp ${totalLabaValue.toLocaleString()}`;  
        produkTerjual.textContent = produkTerjualValue;  
    }  

    // Fungsi Hitung Transaksi Hari Ini  
    function hitungTransaksiHariIni() {  
        const today = new Date().toISOString().split('T')[0];  
        const transaksiHariIni = nota.filter(n => n.tanggal.startsWith(today));  

        const totalTransaksi = transaksiHariIni.reduce((total, n) => total + n.totalHarga, 0);  
        const kunjunganHariIni = document.getElementById('kunjunganHariIni');  
        kunjunganHariIni.textContent = `Jumlah Transaksi Hari Ini: Rp ${totalTransaksi.toLocaleString()}`;  
    }
    
    function buatGrafikFrekuensi(tipe) {
    const ctx = document.getElementById('grafikFrekuensi').getContext('2d');
    
    // Hancurkan chart sebelumnya jika ada
    if (grafikFrekuensi) {
        grafikFrekuensi.destroy();
    }

    // Handle case ketika nota kosong
    // Di laporan.js, tambahkan pengecekan data
if (nota.length === 0) {
    // Hapus chart sebelumnya dan tampilkan pesan
    if (grafikFrekuensi) grafikFrekuensi.destroy();
    document.getElementById('grafikFrekuensi').innerHTML = 
        '<p class="text-muted text-center">Tidak ada data transaksi</p>';
    return;
}
        
    // Siapkan data
    let labels = [];
    let data = [];
    const now = new Date();

    if (tipe === 'harian') {
        // Data per jam
        labels = Array.from({length: 24}, (_, i) => `${i}:00`);
        data = Array(24).fill(0);
        
        nota.forEach(n => {
            const date = new Date(n.tanggal);
            // Jika tanggal sama dengan hari ini
            if (date.toDateString() === now.toDateString()) {
                const hour = date.getHours();
                data[hour]++;
            }
        });
    } 
    else if (tipe === 'mingguan') {
        // Data per hari dalam minggu
        labels = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        data = Array(7).fill(0);
        
        // Hitung minggu terakhir
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        
        nota.forEach(n => {
            const date = new Date(n.tanggal);
            if (date >= oneWeekAgo) {
                const day = date.getDay(); // 0=Minggu, 1=Senin, dst
                data[day]++;
            }
        });
    }
    else if (tipe === 'bulanan') {
        // Data per hari dalam bulan
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        labels = Array.from({length: daysInMonth}, (_, i) => `Tgl ${i+1}`);
        data = Array(daysInMonth).fill(0);
        
        nota.forEach(n => {
            const date = new Date(n.tanggal);
            if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
                const day = date.getDate() - 1;
                data[day]++;
            }
        });
    }

    // Buat chart
    grafikFrekuensi = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Jumlah Transaksi',
                data: data,
                backgroundColor: 'rgba(54, 162, 235, 0.7)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                        callback: function(value) {
                            if (Number.isInteger(value)) {
                                return value;
                            }
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Transaksi: ${context.parsed.y}`;
                        }
                    }
                }
            }
        }
    });
}
    
    // Di dalam muatData():
btnTimeHarian.addEventListener('click', () => {
    buatGrafikFrekuensi('harian');
    updateActiveTimeButtons('btnTimeHarian');
});

btnTimeMingguan.addEventListener('click', () => {
    buatGrafikFrekuensi('mingguan');
    updateActiveTimeButtons('btnTimeMingguan');
});

btnTimeBulanan.addEventListener('click', () => {
    buatGrafikFrekuensi('bulanan');
    updateActiveTimeButtons('btnTimeBulanan');
});

// Fungsi pembantu untuk update tombol aktif
function updateActiveTimeButtons(activeId) {
    [btnTimeHarian, btnTimeMingguan, btnTimeBulanan].forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(activeId).classList.add('active');
}
    
    // Enhanced Grafik Penjualan Function  
function buatGrafikPenjualan(tipe, dataFilter = null) {  
    const ctx = document.getElementById('grafikPenjualan').getContext('2d');  
    if (grafikPenjualan) grafikPenjualan.destroy();  

    const dataNota = dataFilter || nota;  
    
    const configGrafik = {  
        harian: {  
            label: 'Penjualan Harian',  
            groupBy: tanggal => tanggal.split('T')[0],  
            formatLabel: label => new Date(label).toLocaleDateString('id-ID'),  
            warna: ['rgba(75, 192, 192, 0.6)', 'rgba(75, 192, 192, 1)']  
        },  
        mingguan: {  
            label: 'Penjualan Mingguan',  
            groupBy: tanggal => {  
                const date = new Date(tanggal);  
                const firstDay = new Date(date.setDate(date.getDate() - date.getDay()));  
                return firstDay.toISOString().split('T')[0];  
            },  
            formatLabel: label => `Minggu ${new Date(label).toLocaleDateString('id-ID')}`,  
            warna: ['rgba(255, 159, 64, 0.6)', 'rgba(255, 159, 64, 1)']  
        },  
        bulanan: {  
            label: 'Penjualan Bulanan',  
            groupBy: tanggal => tanggal.slice(0, 7),  
            formatLabel: label => {
                const [year, month] = label.split('-');
                const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                                  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                return `${monthNames[parseInt(month) - 1]} ${year}`;
            },
            warna: ['rgba(153, 102, 255, 0.6)', 'rgba(153, 102, 255, 1)']  
        },  
        tahunan: {  
            label: 'Penjualan Tahunan',  
            groupBy: tanggal => tanggal.slice(0, 4),  
            formatLabel: label => label,  
            warna: ['rgba(54, 162, 235, 0.6)', 'rgba(54, 162, 235, 1)']  
        }  
    };  

    // Rest of the function remains the same...
    const { label, groupBy, formatLabel, warna } = configGrafik[tipe];  
    const dataGrup = dataNota.reduce((acc, n) =>   
        (acc[groupBy(n.tanggal)] = (acc[groupBy(n.tanggal)] || 0) + n.totalHarga, acc), {});  

    // Sort by date  
    const sortedLabels = Object.keys(dataGrup).sort();  
    const sortedData = sortedLabels.map(label => dataGrup[label]);  
    const formattedLabels = sortedLabels.map(formatLabel);  

    // Opsi grafik  
    const opsiGrafik = {  
        responsive: true,  
        scales: {  
            y: {  
                beginAtZero: true,  
                ticks: {   
                    callback: v => 'Rp ' + v.toLocaleString(),  
                    color: '#6c757d'  
                },  
                grid: { display: false },  
                border: { display: false }  
            },  
            x: {  
                display: true,  
                ticks: {  
                    color: '#6c757d'  
                },  
                grid: { display: false },  
                border: { display: false }  
            }  
        },  
        plugins: {  
            tooltip: {  
                callbacks: {   
                    label: ctx => 'Rp ' + ctx.parsed.y.toLocaleString()   
                }  
            },  
            legend: { display: false }  
        }  
    };  

    grafikPenjualan = new Chart(ctx, {  
        type: 'bar',  
        data: {  
            labels: formattedLabels,  
            datasets: [{  
                label,  
                data: sortedData,  
                backgroundColor: warna[0],  
                borderColor: warna[1],  
                borderWidth: 1,  
                borderRadius: 4,  
                fill: false  
            }]  
        },  
        options: opsiGrafik  
    });  
}  
    
    // New Function: Hitung Kunjungan Hari Ini  
    function hitungKunjunganHariIni() {  
        const today = new Date().toISOString().split('T')[0];  
        const kunjungan = nota.filter(n => n.tanggal.includes(today)).length;  
        kunjunganHariIni.textContent = kunjungan;  
        
        // Add trend indicator  
        const yesterday = new Date();  
        yesterday.setDate(yesterday.getDate() - 1);  
        const yesterdayStr = yesterday.toISOString().split('T')[0];  
        const kunjunganKemarin = nota.filter(n => n.tanggal.startsWith(yesterdayStr)).length;  
        
        const trendIndicator = document.getElementById('trendIndicator');  
        trendIndicator.innerHTML = '';  
        
        if (kunjunganKemarin > 0) {  
            const persentase = ((kunjungan - kunjunganKemarin) / kunjunganKemarin * 100).toFixed(1);  
            const trendIcon = kunjungan > kunjunganKemarin ?   
                `<i class="fas fa-arrow-up text-success"></i> ${persentase}%` :   
                `<i class="fas fa-arrow-down text-danger"></i> ${Math.abs(persentase)}%`;  
            
            trendIndicator.innerHTML = `(${trendIcon} dari kemarin)`;  
        }  
    }  

    // Enhanced Filter Function  
    function terapkanFilter(rentangWaktu = null) {  
        let startDate, endDate;  
        const now = new Date();  
        
        switch(rentangWaktu) {  
            case 'hari-ini':  
                startDate = new Date();  
                startDate.setHours(0, 0, 0, 0);  
                endDate = new Date();  
                break;  
            case 'minggu-ini':  
                startDate = new Date();  
                startDate.setDate(startDate.getDate() - startDate.getDay());  
                startDate.setHours(0, 0, 0, 0);  
                endDate = new Date();  
                break;  
            case 'bulan-ini':  
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);  
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);  
                endDate.setHours(23, 59, 59, 999);  
                break;  
            case 'tahun-ini':  
                startDate = new Date(now.getFullYear(), 0, 1);  
                endDate = new Date(now.getFullYear(), 11, 31);  
                endDate.setHours(23, 59, 59, 999);  
                break;  
            case 'custom':  
                startDate = new Date(tanggalMulai.value);  
                endDate = new Date(tanggalSelesai.value);  
                if (endDate) endDate.setHours(23, 59, 59, 999);  
                break;  
            default:  
                startDate = null;  
                endDate = null;  
        }  

        const produkDipilih = Array.from(filterProduk.selectedOptions).map(option => option.value);  
        
        const notaFiltered = nota.filter(n => {  
            const notaDate = new Date(n.tanggal);  
            const tanggalSesuai = (!startDate || notaDate >= startDate) &&  
                                  (!endDate || notaDate <= endDate);  
            const produkSesuai = produkDipilih.length === 0 ||   
                n.produk.some(p => produkDipilih.includes(p.nama));  
            return tanggalSesuai && produkSesuai;  
        });  

        hitungStatistik(notaFiltered);  
        tampilkanDetailPenjualan(notaFiltered);  
        
        // Determine chart type based on time range  
        if (rentangWaktu === 'tahun-ini') {  
            buatGrafikPenjualan('tahunan', notaFiltered);  
        } else if (rentangWaktu === 'bulan-ini' ||   
                 (startDate && endDate && (endDate - startDate) > 30 * 24 * 60 * 60 * 1000)) {  
            buatGrafikPenjualan('bulanan', notaFiltered);  
        } else if (rentangWaktu === 'minggu-ini' ||   
                 (startDate && endDate && (endDate - startDate) > 7 * 24 * 60 * 60 * 1000)) {  
            buatGrafikPenjualan('mingguan', notaFiltered);  
        } else {  
            buatGrafikPenjualan('harian', notaFiltered);  
        }  

        tampilkanProdukTerlaris();  
    }  
    
    // Update Event Listeners  
    btnHarian.addEventListener('click', () => {  
        buatGrafikPenjualan('harian');
        buatGrafikFrekuensi('harian');
        btnHarian.classList.add('active');  
        btnMingguan.classList.remove('active');  
        btnBulanan.classList.remove('active');  
    });  

    btnMingguan.addEventListener('click', () => {  
        buatGrafikPenjualan('mingguan');  
        btnMingguan.classList.add('active');  
        btnHarian.classList.remove('active');  
        btnBulanan.classList.remove('active');  
    });  

    btnBulanan.addEventListener('click', () => {  
        buatGrafikPenjualan('bulanan');  
        btnBulanan.classList.add('active');  
        btnHarian.classList.remove('active');  
        btnMingguan.classList.remove('active');  
    });  

    // New Event Listeners for Time Filters  
    btnHariIni.addEventListener('click', () => {  
        terapkanFilter('hari-ini');  
        updateActiveFilterButtons('hari-ini');  
    });  

    btnMingguIni.addEventListener('click', () => {  
        terapkanFilter('minggu-ini');  
        updateActiveFilterButtons('minggu-ini');  
    });  

    btnBulanIni.addEventListener('click', () => {  
        terapkanFilter('bulan-ini');  
        updateActiveFilterButtons('bulan-ini');  
    });  

    btnTahunIni.addEventListener('click', () => {  
        terapkanFilter('tahun-ini');  
        updateActiveFilterButtons('tahun-ini');  
    });  

    btnCustom.addEventListener('click', () => {  
        terapkanFilter('custom');  
        updateActiveFilterButtons('custom');  
    });  

    function updateActiveFilterButtons(activeFilter) {  
        [btnHariIni, btnMingguIni, btnBulanIni, btnTahunIni, btnCustom].forEach(btn => {  
            btn.classList.remove('active');  
        });  
        
        switch(activeFilter) {  
            case 'hari-ini': btnHariIni.classList.add('active'); break;  
            case 'minggu-ini': btnMingguIni.classList.add('active'); break;  
            case 'bulan-ini': btnBulanIni.classList.add('active'); break;  
            case 'tahun-ini': btnTahunIni.classList.add('active'); break;  
            case 'custom': btnCustom.classList.add('active'); break;  
        }  
    }  

    // Fungsi Tampilkan Detail Penjualan  
    function tampilkanDetailPenjualan(dataNota) {  
        const detailPenjualanData = dataNota.flatMap(nota =>   
            nota.produk.map(produk => ({  
                tanggal: nota.tanggal,  
                namaProduk: produk.nama,
                namaPelanggan: nota.namaPelanggan,
                jumlah: produk.jumlah,  
                hargaSatuan: produk.harga,  
                total: produk.harga * produk.jumlah,  
                laba: hitungLaba(produk),  
                aksi: nota  
            }))  
        );  

        detailPenjualan.innerHTML = detailPenjualanData.map((detail, index) => `  
            <tr>  
                <td>${detail.tanggal}</td>  
                <td>${detail.namaProduk}</td>
                <td>${detail.jumlah}</td>  
                <td>Rp ${detail.hargaSatuan.toLocaleString()}</td>  
                <td>Rp ${detail.total.toLocaleString()}</td>  
                <td>Rp ${detail.laba.toLocaleString()}</td>  
                <td>  
                    <button class="btn btn-sm btn-info cetak-nota" data-index="${index}">  
                        <i class="fas fa-print"></i>  
                    </button>  
                </td>  
            </tr>  
        `).join('');  

        // Tambahkan event listener untuk cetak nota  
        document.querySelectorAll('.cetak-nota').forEach(btn => {  
            btn.addEventListener('click', (e) => {  
                const index = e.currentTarget.dataset.index;  
                const notaCetak = detailPenjualanData[index].aksi;  
                cetakNota(notaCetak);  
            });  
        });  
    }  

    // Fungsi Hitung Laba  
    function hitungLaba(produkNota) {  
        const produkDetail = produk.find(p => p.namaProduk === produkNota.nama);  
        return (produkNota.harga - produkDetail.hargaModal) * produkNota.jumlah;  
    }  

    // Fungsi Tampilkan Produk Terlaris  
    function tampilkanProdukTerlaris() {  
        const penjualanProduk = nota.flatMap(n => n.produk).reduce((acc, produk) => {  
            acc[produk.nama] = (acc[produk.nama] || 0) + produk.jumlah;  
            return acc;  
        }, {});  

        const produkTerlarisList = Object.entries(penjualanProduk)  
            .sort((a, b) => b[1] - a[1])  
            .slice(0, 5)  
            .map(([nama, jumlah]) => `  
                <li class="list-group-item d-flex justify-content-between align-items-center">  
                    ${nama}  
                    <span class="badge bg-primary rounded-pill">${jumlah}</span>  
                </li>  
            `).join('');  

        produkTerlaris.innerHTML = produkTerlarisList;  
    }  

    // Export Laporan  
    btnExportLaporan.addEventListener('click', () => {  
        const detailPenjualanData = nota.flatMap(nota =>   
            nota.produk.map(produk => ({  
                tanggal: nota.tanggal,  
                namaPelanggan: nota.namaPelanggan,  
                namaProduk: produk.nama,  
                jumlah: produk.jumlah,  
                hargaSatuan: produk.harga,  
                total: produk.harga * produk.jumlah,  
                laba: hitungLaba(produk)  
            }))  
        );  

        const csvContent = [  
            ['Tanggal','Waktu', 'Nama Produk', 'Nama Pelanggan', 'Jumlah', 'Harga Satuan', 'Total', 'Laba'],  
            ...detailPenjualanData.map(detail => [  
                detail.tanggal,  
                detail.namaPelanggan,  
                detail.namaProduk,  
                detail.jumlah,  
                detail.hargaSatuan,  
                detail.total,  
                detail.laba  
            ])  
        ].map(e => e.join(",")).join("\n");  

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });  
        const link = document.createElement("a");  
        const url = URL.createObjectURL(blob);  
        link.setAttribute("href", url);  
        link.setAttribute("download", `laporan_penjualan_${new Date().toISOString().split('T')[0]}.csv`);  
        link.style.visibility = 'hidden';  
        document.body.appendChild(link);  
        link.click();  
        document.body.removeChild(link);  
    });  

    // Muat data saat halaman pertama kali dimuat  
    muatData();  

    // Backup Data  
    document.getElementById('btnBackup').addEventListener('click', () => {  
        const data = {  
            produk: JSON.parse(localStorage.getItem('produk') || '[]'),  
            nota: JSON.parse(localStorage.getItem('nota') || '[]'),  
            pengaturanToko: JSON.parse(localStorage.getItem('pengaturanToko') || '{}')  
        };  
        
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });  
        const url = URL.createObjectURL(blob);  
        const a = document.createElement('a');  
        a.href = url;  
        a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;  
        document.body.appendChild(a);  
        a.click();  
        document.body.removeChild(a);  
        URL.revokeObjectURL(url);  
    });  

    // Import Data  
    document.getElementById('btnImport').addEventListener('click', () => {  
        document.getElementById('fileImport').click();  
    });  

    // Import data dengan pemanggilan fungsi yang benar  
    document.getElementById('fileImport').addEventListener('change', function(e) {  
        const file = e.target.files[0];  
        if (!file) return;  

        const reader = new FileReader();  
        reader.onload = (event) => {  
            try {  
                const data = JSON.parse(event.target.result);  
                localStorage.setItem('produk', JSON.stringify(data.produk));  
                localStorage.setItem('nota', JSON.stringify(data.nota));  
                localStorage.setItem('pengaturanToko', JSON.stringify(data.pengaturanToko));  
                alert('Data berhasil diimpor!');  
                muatData(); // Memuat data setelah impor  
            } catch (error) {  
                alert('Silahkan Refresh!');  
            }  
        };  
        reader.readAsText(file);  
    });  
});  