document.addEventListener('DOMContentLoaded', () => {
    // Form Selectors
    const formPengaturanToko = document.getElementById('formPengaturanToko');
    const formPengaturanStruk = document.getElementById('formPengaturanStruk');
    const formKeamanan = document.getElementById('formKeamanan');
    const formPajakDiskon = document.getElementById('formPajakDiskon');
    const btnSimpanPengaturan = document.getElementById('btnSimpanPengaturan');
    const logoToko = document.getElementById('logoToko');
    const previewLogo = document.getElementById('previewLogo');

    // Logo Preview
    logoToko.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                previewLogo.src = event.target.result;
                previewLogo.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    // Muat Pengaturan Saat Halaman Dimuat
    function muatPengaturan() {
        const pengaturan = JSON.parse(localStorage.getItem('pengaturanToko') || '{}');

        // Informasi Toko
        document.getElementById('namaToko').value = pengaturan.namaToko || '';
        document.getElementById('emailToko').value = pengaturan.emailToko || '';
        document.getElementById('nomorWAToko').value = pengaturan.nomorWAToko || '';
        document.getElementById('npwpToko').value = pengaturan.npwpToko || '';
        document.getElementById('alamatToko').value = pengaturan.alamatToko || '';
        document.getElementById('deskripsiToko').value = pengaturan.deskripsiToko || '';

        // Pengaturan Struk
        document.getElementById('catatanKakiStruk').value = pengaturan.catatanKakiStruk || '';
        document.getElementById('metodeTunai').checked = pengaturan.metodeTunai || false;
        document.getElementById('metodeTransfer').checked = pengaturan.metodeTransfer || false;
        document.getElementById('metodeQRIS').checked = pengaturan.metodeQRIS || false;
        document.getElementById('metodeShopee').checked = pengaturan.metodeShopee || false;

        // Logo
        if (pengaturan.logoToko) {
            previewLogo.src = pengaturan.logoToko;
            previewLogo.style.display = 'block';
        }

        // Keamanan
        document.getElementById('usernameAdmin').value = pengaturan.usernameAdmin || '';

        // Pajak & Diskon
        document.getElementById('persentasePajak').value = pengaturan.persentasePajak || 0;
        document.getElementById('persentaseDiskon').value = pengaturan.persentaseDiskon || 0;
        document.getElementById('aktifkanDiskon').checked = pengaturan.aktifkanDiskon || false;
    }

    // Validasi Form
    function validasiForm() {
        const namaToko = document.getElementById('namaToko').value.trim();
        const passwordAdmin = document.getElementById('passwordAdmin').value;
        const konfirmasiPassword = document.getElementById('konfirmasiPassword').value;

        if (namaToko === '') {
            Swal.fire({
                title: 'Error Validasi',
                text: 'Nama Toko tidak boleh kosong',
                icon: 'error',
                confirmButtonText: 'OK'
            });
            return false;
        }

        if (passwordAdmin && passwordAdmin !== konfirmasiPassword) {
            Swal.fire({
                title: 'Error Validasi',
                text: 'Konfirmasi password tidak cocok',
                icon: 'error',
                confirmButtonText: 'OK'
            });
            return false;
        }

        return true;
    }

    // Simpan Pengaturan
    btnSimpanPengaturan.addEventListener('click', () => {
        if (!validasiForm()) return;

        const pengaturan = {
            // Informasi Toko
            namaToko: document.getElementById('namaToko').value,
            emailToko: document.getElementById('emailToko').value,
            nomorWAToko: document.getElementById('nomorWAToko').value,
            npwpToko: document.getElementById('npwpToko').value,
            alamatToko: document.getElementById('alamatToko').value,
            deskripsiToko: document.getElementById('deskripsiToko').value,

            // Pengaturan Struk
            catatanKakiStruk: document.getElementById('catatanKakiStruk').value,
            metodeTunai: document.getElementById('metodeTunai').checked,
            metodeTransfer: document.getElementById('metodeTransfer').checked,
            metodeQRIS: document.getElementById('metodeQRIS').checked,
            metodeShopee: document.getElementById('metodeShopee').checked,
            logoToko: previewLogo.src || '',

            // Keamanan
            usernameAdmin: document.getElementById('usernameAdmin').value,
            
            // Password (hanya diupdate jika diisi)
            passwordAdmin: document.getElementById('passwordAdmin').value || 
                           JSON.parse(localStorage.getItem('pengaturanToko') || '{}').passwordAdmin,

            // Pajak & Diskon
            persentasePajak: parseFloat(document.getElementById('persentasePajak').value),
            persentaseDiskon: parseFloat(document.getElementById('persentaseDiskon').value),
            aktifkanDiskon: document.getElementById('aktifkanDiskon').checked
        };

        // Simpan ke Local Storage
        localStorage.setItem('pengaturanToko', JSON.stringify(pengaturan));

        // Notifikasi Berhasil
        Swal.fire({
            title: 'Berhasil',
            text: 'Pengaturan berhasil disimpan!',
            icon: 'success',
            confirmButtonText: 'OK'
        });
    });

    // Muat Pengaturan Saat Halaman Dimuat
    muatPengaturan();
        
    reader.readAsText(file);
});