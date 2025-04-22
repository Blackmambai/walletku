// googlebackup.js
document.addEventListener('DOMContentLoaded', () => {
    // Konfigurasi Google Drive API
    const CLIENT_ID = '362387001717-qd55fokbba192mjd97t61b3jslbvqp47.apps.googleusercontent.com';
    const API_KEY = 'AIzaSyCrnA2v4briyn9mUcRkMTcADdFJNa8CijQ';
    const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
    const SCOPES = 'https://www.googleapis.com/auth/drive.file';

    // Status API
    let isGoogleClientInitialized = false;
    let isPickerInitialized = false;

    // DOM Elements
    const btnGoogleBackup = document.getElementById('btnGoogleBackup');
    const btnGoogleImport = document.getElementById('btnGoogleImport');
    const googleAuthStatus = document.getElementById('googleAuthStatus');

    // 1. Inisialisasi API Google
    async function initializeGoogleAPIs() {
        try {
            // Muat library Google API
            await new Promise((resolve, reject) => {
                if (window.gapi) return resolve();
                
                const script = document.createElement('script');
                script.src = 'https://apis.google.com/js/api.js';
                script.async = true;
                script.defer = true;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });

            // Inisialisasi Client API
            await new Promise((resolve) => gapi.load('client:auth2', resolve));
            await gapi.client.init({
                apiKey: API_KEY,
                clientId: CLIENT_ID,
                discoveryDocs: DISCOVERY_DOCS,
                scope: SCOPES,
                redirect_uri: window.location.origin,
                ux_mode: 'redirect'
            });
            
            isGoogleClientInitialized = true;
            console.log('Google Client API initialized');

            // Muat Picker API
            await new Promise((resolve) => gapi.load('picker', resolve));
            isPickerInitialized = true;
            console.log('Google Picker API initialized');

            // Setel listener status login
            gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
            updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());

        } catch (error) {
            console.error('Gagal inisialisasi:', error);
            showError(`Gagal memuat Google API: ${error.message}`);
        }
    }

    // 2. Update UI status login
    function updateSigninStatus(isSignedIn) {
        if (isSignedIn) {
            googleAuthStatus.innerHTML = `
                <span class="text-success">
                    <i class="fas fa-check-circle"></i> Terhubung dengan Google Drive
                </span>`;
            toggleButtons(true);
        } else {
            googleAuthStatus.innerHTML = `
                <span class="text-danger">
                    <i class="fas fa-times-circle"></i> Tidak terhubung dengan Google Drive
                </span>`;
            toggleButtons(false);
        }
    }

    // 3. Fungsi toggle tombol
    function toggleButtons(enabled) {
        if (btnGoogleBackup) btnGoogleBackup.disabled = !enabled;
        if (btnGoogleImport) btnGoogleImport.disabled = !enabled;
    }

    // 4. Handle Login Google
    async function handleGoogleSignIn() {
        if (!isGoogleClientInitialized) {
            showError('Google API belum siap');
            return;
        }
        
        try {
            await gapi.auth2.getAuthInstance().signIn();
            Swal.fire('Berhasil Login', 'Anda sekarang terhubung dengan Google Drive', 'success');
        } catch (error) {
            console.error('Login error:', error);
            showError(`Gagal login: ${error.error || error.details}`);
        }
    }

    // 5. Handle Backup ke Google Drive
    async function backupToGoogleDrive() {
        try {
            await checkAPIsReady();
            
            const swalInstance = Swal.fire({
                title: 'Membuat Backup',
                html: 'Sedang mengupload data...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            // Prepare data
            const backupData = {
                produk: JSON.parse(localStorage.getItem('produk') || [],
                nota: JSON.parse(localStorage.getItem('nota') || [],
                pengaturanToko: JSON.parse(localStorage.getItem('pengaturanToko') || {},
                metadata: {
                    version: 1.2,
                    created: new Date().toISOString()
                }
            };

            // Upload ke Google Drive
            const accessToken = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;
            const formData = new FormData();
            formData.append('metadata', new Blob([JSON.stringify({
                name: `backup_${Date.now()}.json`,
                parents: ['root']
            })], { type: 'application/json' }));
            
            formData.append('file', new Blob([JSON.stringify(backupData)], { type: 'application/json' }));

            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}` },
                body: formData
            });

            if (!response.ok) throw await response.json();
            
            await swalInstance.close();
            Swal.fire('Backup Berhasil!', 'Data telah disimpan ke Google Drive', 'success');
            
        } catch (error) {
            console.error('Backup error:', error);
            showError(`Gagal backup: ${error.error?.message || error.message}`);
        }
    }

    // 6. Handle Import dari Google Drive
    async function importFromGoogleDrive() {
        try {
            await checkAPIsReady();
            
            // Pilih file
            const file = await new Promise((resolve, reject) => {
                const picker = new google.picker.PickerBuilder()
                    .addView(new google.picker.DocsView()
                        .setMimeTypes('application/json')
                        .setIncludeFolders(true))
                    .setOAuthToken(gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token)
                    .setDeveloperKey(API_KEY)
                    .setCallback(data => {
                        if (data.action === google.picker.Action.PICKED) {
                            resolve(data.docs[0]);
                        } else {
                            reject('User membatalkan pemilihan file');
                        }
                    })
                    .setOrigin(window.location.origin)
                    .build();
                picker.setVisible(true);
            });

            // Download file
            const swalInstance = Swal.fire({
                title: 'Memproses File',
                html: 'Sedang memuat data...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
                headers: { 'Authorization': `Bearer ${gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token}` }
            });

            if (!response.ok) throw await response.json();
            
            const data = await response.json();

            // Validasi data
            if (!data.produk || !data.nota || !data.pengaturanToko) {
                throw new Error('Format file backup tidak valid');
            }

            // Konfirmasi
            const confirm = await Swal.fire({
                title: 'Yakin ingin mengimpor?',
                text: 'Semua data saat ini akan diganti!',
                icon: 'warning',
                showCancelButton: true
            });

            if (!confirm.isConfirmed) return;

            // Simpan ke localStorage
            localStorage.setItem('produk', JSON.stringify(data.produk));
            localStorage.setItem('nota', JSON.stringify(data.nota));
            localStorage.setItem('pengaturanToko', JSON.stringify(data.pengaturanToko));

            await swalInstance.close();
            Swal.fire('Import Berhasil!', 'Halaman akan direfresh...', 'success').then(() => location.reload());

        } catch (error) {
            console.error('Import error:', error);
            showError(`Gagal import: ${error.error?.message || error.message}`);
        }
    }

    // 7. Fungsi pengecekan API
    async function checkAPIsReady() {
        if (!isGoogleClientInitialized || !isPickerInitialized) {
            await Swal.fire({
                title: 'Memuat API...',
                html: 'Harap tunggu sebentar',
                timer: 2000,
                didOpen: () => Swal.showLoading()
            });
            throw new Error('API belum siap');
        }
        
        if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
            await handleGoogleSignIn();
            throw new Error('Harap login terlebih dahulu');
        }
    }

    // 8. Inisialisasi awal
    initializeGoogleAPIs().catch(error => {
        console.error('Initialization failed:', error);
        showError('Gagal memulai sistem backup: ' + error.message);
    });

    // 9. Event Listeners
    document.getElementById('btnGoogleSignIn')?.addEventListener('click', handleGoogleSignIn);
    document.getElementById('btnGoogleSignOut')?.addEventListener('click', () => gapi.auth2.getAuthInstance().signOut());
    btnGoogleBackup?.addEventListener('click', backupToGoogleDrive);
    btnGoogleImport?.addEventListener('click', importFromGoogleDrive);

    // 10. Fungsi bantuan
    function showError(message) {
        Swal.fire('Error!', message, 'error');
    }
});