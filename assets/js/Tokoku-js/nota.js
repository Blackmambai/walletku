document.addEventListener('DOMContentLoaded', () => {
    const daftarNota = document.getElementById('daftarNota');
    const btnExportNota = document.getElementById('btnExportNota');
    const btnTerapkanFilter = document.getElementById('btnTerapkanFilter');
    const modalDetailNota = new bootstrap.Modal(document.getElementById('modalDetailNota'));
    const detailNotaContent = document.getElementById('detailNotaContent');
    const btnCetakNota = document.getElementById('btnCetakNota');
    const btnUnduhPNG = document.getElementById('btnUnduhPNG');

    let notaList = [];
    let notaDetail = null;

    // Fungsi Muat Nota
    function muatNota(filter = {}) {
        notaList = JSON.parse(localStorage.getItem('nota') || '[]');
    
        // Filter berdasarkan tanggal
        if (filter.tanggalMulai || filter.tanggalSelesai) {
            const startDate = filter.tanggalMulai ? new Date(filter.tanggalMulai) : null;
            const endDate = filter.tanggalSelesai ? new Date(filter.tanggalSelesai) : null;
            if (endDate) endDate.setHours(23, 59, 59, 999); // Akhir hari
    
            notaList = notaList.filter(nota => {
                const notaDate = new Date(nota.tanggal);
                return (!startDate || notaDate >= startDate) && 
                       (!endDate || notaDate <= endDate);
            });
        }
        
        // Di fungsi muatNota(), tambahkan validasi tanggal
if (filter.tanggalMulai) startDate = new Date(filter.tanggalMulai + 'T00:00:00');
if (filter.tanggalSelesai) endDate = new Date(filter.tanggalSelesai + 'T23:59:59');
    
        // Filter metode pembayaran (jika dipilih)
        if (filter.metodePembayaran) {
            notaList = notaList.filter(nota => 
                nota.metodePembayaran === filter.metodePembayaran
            );
        }
    
        // Urutkan dari terbaru
        notaList.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

        // Tampilkan nota
        daftarNota.innerHTML = notaList.map((nota, index) => `
            <tr>
                <td>${nota.tanggal}</td>
                <td>${nota.namaPelanggan}</td>
                <td>Rp ${nota.totalHarga.toLocaleString()}</td>
                <td>${nota.metodePembayaran}</td>
                <td>
                    <button class="btn btn-sm btn-danger detail-nota" style="border-radius: 16px;font-family: Nunito, sans-serif;box-shadow: 0px 6px 14px rgba(67,97,238,0.56);width: auto;" data-index="${index}">
                        <i class="fas fa-eye"></i> Detail
                    </button>
                    <button class="btn btn-sm btn-danger hapus-nota" style="border-radius: 16px;font-family: Nunito, sans-serif;box-shadow: 0px 6px 14px rgba(67,97,238,0.56);width: auto;" data-index="${index}">
                        <i class="fas fa-trash"></i> Hapus
                    </button>
                </td>
            </tr>
        `).join('');

        // Tambahkan event listener untuk tombol detail dan hapus
        document.querySelectorAll('.detail-nota').forEach(btn => {
            btn.addEventListener('click', tampilkanDetailNota);
        });

        document.querySelectorAll('.hapus-nota').forEach(btn => {
            btn.addEventListener('click', hapusNota);
        });
    }

    // Fungsi Tampilkan Detail Nota
    function tampilkanDetailNota(e) {
        const index = e.currentTarget.dataset.index;
        notaDetail = notaList[index];
        const tanggal = new Date(notaDetail.tanggal);
    const options = { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    };
    const tanggalTerformat = tanggal.toLocaleDateString('id-ID', options) + ' WIB';

    // Ganti ${notaDetail.tanggal} dengan ${tanggalTerformat}
        
        detailNotaContent.innerHTML = `
            <div id="strukCetak" style="
                max-width: 100%;
                margin: 0 auto;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                padding: 20px;
                border: 2px solid #4a90e2;
                border-radius: 10px;
                box-shadow: 0 0 15px rgba(74, 144, 226, 0.2);
                background: linear-gradient(135deg, #f8f9fa 0%, #e9f5ff 100%);
                position: relative;
                overflow: hidden;
            ">
                <!-- Watermark -->
                <div style="
                    position: absolute;
                    opacity: 0.08;
                    font-size: 120px;
                    font-weight: bold;
                    color: #4a90e2;
                    transform: rotate(-30deg);
                    top: 30%;
                    left: 10%;
                    z-index: 0;
                    pointer-events: none;
                ">
                    NOTABOOST
                </div>

                <!-- Header -->
                <div class="text-center mb-4">
                    <h3 style="color: #2c3e50; font-weight: bold; margin-bottom: 5px;">NOTA PENJUALAN</h3>
                    <hr style="border-top: 2px dashed #4a90e2; opacity: 0.7;">
                </div>

                <!-- Informasi Nota -->
                <div class="row" style="margin-bottom: 20px;">
                    <div class="col-md-6">
                        <div style="background-color: #e9f5ff; padding: 12px; border-radius: 8px;">
                            <h5 style="color: #2c3e50; border-bottom: 1px solid #4a90e2; padding-bottom: 5px; font-size: 1rem;">
                                <i class="fas fa-info-circle"></i> INFORMASI NOTA
                            </h5>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span style="color: #6c757d;">Tanggal:</span>
                                <span style="font-weight: 500;">${tanggalTerformat}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span style="color: #6c757d;">Nama Pelanggan:</span>
                                <span style="font-weight: 500;">${notaDetail.namaPelanggan}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;" class="align-items-start">
                                <span style="color: #6c757d;">Metode Pembayaran:</span>
                                <span class="badge text-nowrap" style="background-color: #4a90e2; color: white; padding: 3px 8px; border-radius: 4px; font-size: 0.8rem;">
                                    ${notaDetail.metodePembayaran}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div style="background-color: #f0f8ff; padding: 12px; border-radius: 8px;">
                            <h5 style="color: #2c3e50; border-bottom: 1px solid #4a90e2; padding-bottom: 5px; font-size: 1rem;">
                                <i class="fas fa-receipt"></i> RINGKASAN TRANSAKSI
                            </h5>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span style="color: #6c757d;">Total Penjualan:</span>
                                <span style="font-weight: bold; color: #2c3e50;">Rp ${notaDetail.totalHarga.toLocaleString()}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span style="color: #6c757d;">Uang Diterima:</span>
                                <span style="font-weight: bold; color: #28a745;">Rp ${notaDetail.uangDiterima.toLocaleString()}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: #6c757d;">Kembalian:</span>
                                <span style="font-weight: bold; color: #dc3545;">Rp ${notaDetail.kembalian.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Daftar Produk -->
                <div>
                    <h5 style="color: #2c3e50; border-bottom: 1px solid #4a90e2; padding-bottom: 5px; font-size: 1rem;">
                        <i class="fas fa-boxes"></i> DAFTAR PRODUK
                    </h5>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                        <thead>
                            <tr style="background-color: #e9f5ff; border-bottom: 2px solid #4a90e2;">
                                <th style="padding: 8px; text-align: left;">Produk</th>
                                <th style="padding: 8px; text-align: right;">Harga</th>
                                <th style="padding: 8px; text-align: center;">Jumlah</th>
                                <th style="padding: 8px; text-align: right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${notaDetail.produk.map(produk => `
                                <tr style="border-bottom: 1px solid #e0e0e0;">
                                    <td style="padding: 8px;">${produk.nama}</td>
                                    <td style="padding: 8px; text-align: right;">Rp ${produk.harga.toLocaleString()}</td>
                                    <td style="padding: 8px; text-align: center;">${produk.jumlah}</td>
                                    <td style="padding: 8px; text-align: right; font-weight: 500;">Rp ${(produk.harga * produk.jumlah).toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Footer -->
                <div style="text-align: center; margin-top: 20px;">
                    <p style="font-size: 0.8rem; color: #6c757d; margin-bottom: 5px;">
                        Terima kasih telah berbelanja dengan kami
                    </p>
                    <p class="premium2" style="font-size: 0.7rem; color: #4a90e2; font-weight: 500; margin: 0;">
                        <i class="fas fa-lock premium"></i> WalletKu.biz.id | Upgrade Premium
                    </p>
                </div>
            </div>
        `;

        modalDetailNota.show();
    }

    // Fungsi Hapus Nota
    function hapusNota(e) {
        const index = e.currentTarget.dataset.index;
        
        if (confirm('Apakah Anda yakin ingin menghapus nota ini?')) {
            notaList.splice(index, 1);
            localStorage.setItem('nota', JSON.stringify(notaList));
            muatNota();
        }
    }

    // Export Nota ke Excel
    btnExportNota.addEventListener('click', () => {
        // Konversi nota ke format CSV
        const notaBaru = {
            tanggal: new Date().toISOString(), // Ganti toLocaleString() ke toISOString()
            namaPelanggan,
            metodePembayaran,
            produk: keranjangItems,
            totalHarga: total,
            uangDiterima,
            kembalian: uangDiterima - total
        };

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `nota_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Terapkan Filter
    btnTerapkanFilter.addEventListener('click', () => {
        const tanggalMulai = document.getElementById('tanggalMulai').value;
        const tanggalSelesai = document.getElementById('tanggalSelesai').value;
        const metodePembayaran = document.getElementById('metodePembayaran').value;

        muatNota({
            tanggalMulai,
            tanggalSelesai,
            metodePembayaran
        });

        bootstrap.Modal.getInstance(document.getElementById('modalFilterNota')).hide();
    });

    // Cetak Nota
    btnCetakNota.addEventListener('click', () => {
        if (notaDetail) {
            const printContent = document.createElement('div');
            printContent.innerHTML = detailNotaContent.innerHTML;
            
            const originalContents = document.body.innerHTML;
            document.body.innerHTML = printContent.innerHTML;
            window.print();
            document.body.innerHTML = originalContents;
        }
    });

    // Fungsi untuk mengunduh nota sebagai PNG
    async function unduhNotaPNG() {
        if (!notaDetail) return;

        try {
            // Gunakan html2canvas untuk mengkonversi HTML ke canvas
            const canvas = await html2canvas(document.getElementById('strukCetak'), {
                scale: 2, // Tingkatkan skala untuk kualitas yang lebih baik
                logging: false,
                useCORS: true,
                allowTaint: true,
                backgroundColor: null // Transparent background
            });

            // Konversi canvas ke PNG dan unduh
            const link = document.createElement('a');
            link.download = `nota_${notaDetail.tanggal}_${notaDetail.namaPelanggan}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error('Error generating PNG:', error);
            alert('Gagal mengunduh nota sebagai PNG. Pastikan Anda memiliki koneksi internet untuk menggunakan fitur ini.');
        }
    }

    // Tambahkan event listener untuk tombol unduh PNG
    btnUnduhPNG.addEventListener('click', unduhNotaPNG);

    // Muat nota saat halaman pertama kali dimuat
    muatNota();

});