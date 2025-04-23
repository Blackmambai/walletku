// googlebackup-fixed.js
document.addEventListener('DOMContentLoaded', async () => {
    // Konfigurasi - Ganti dengan milik Anda
    const CONFIG = {
        API_KEY: 'AIzaSyCrnA2v4briyn9mUcRkMTcADdFJNa8CijQ',
        CLIENT_ID: '362387001717-qd55fokbba192mjd97t61b3jslbvqp47.apps.googleusercontent.com',
        SCOPES: 'https://www.googleapis.com/auth/drive.file',
        DISCOVERY_DOCS: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
    };

    // Elemen UI
    const statusEl = document.getElementById('google-auth-status');
    const backupBtn = document.getElementById('btn-backup');
    const restoreBtn = document.getElementById('btn-restore');
    const signInBtn = document.getElementById('btn-signin');
    const signOutBtn = document.getElementById('btn-signout');

    // Inisialisasi Google API
    async function initGoogleAPI() {
        try {
            // Load client library
            await loadScript('https://apis.google.com/js/api.js');
            
            // Init client
            await new Promise((resolve, reject) => {
                gapi.load('client:auth2:picker', {
                    callback: resolve,
                    onerror: reject,
                    timeout: 5000
                });
            });

            await gapi.client.init({
                apiKey: CONFIG.API_KEY,
                clientId: CONFIG.CLIENT_ID,
                scope: CONFIG.SCOPES,
                discoveryDocs: CONFIG.DISCOVERY_DOCS
            });

            // Update UI
            updateAuthUI(gapi.auth2.getAuthInstance().isSignedIn.get());
            
            // Listen auth changes
            gapi.auth2.getAuthInstance().isSignedIn.listen(updateAuthUI);
            
            return true;
        } catch (error) {
            console.error('Init error:', error);
            showError('Gagal inisialisasi Google API');
            return false;
        }
    }

    // Update UI berdasarkan status auth
    function updateAuthUI(isSignedIn) {
        if (isSignedIn) {
            statusEl.innerHTML = '<span class="text-success">✓ Terhubung ke Google Drive</span>';
            signInBtn.style.display = 'none';
            signOutBtn.style.display = 'block';
            backupBtn.disabled = false;
            restoreBtn.disabled = false;
        } else {
            statusEl.innerHTML = '<span class="text-danger">✗ Tidak terhubung</span>';
            signInBtn.style.display = 'block';
            signOutBtn.style.display = 'none';
            backupBtn.disabled = true;
            restoreBtn.disabled = true;
        }
    }

    // Fungsi Backup
    async function backupData() {
        try {
            showLoading('Mempersiapkan backup...');
            
            // Siapkan data
            const data = {
                produk: JSON.parse(localStorage.getItem('produk') || '[]'),
                nota: JSON.parse(localStorage.getItem('nota') || '[]'),
                pengaturan: JSON.parse(localStorage.getItem('pengaturanToko') || '{}'),
                timestamp: new Date().toISOString()
            };

            // Buat nama file
            const dateStr = new Date().toISOString().split('T')[0];
            const filename = `backup-kasir-${dateStr}.json`;

            // Upload ke Google Drive
            const file = new Blob([JSON.stringify(data)], {type: 'application/json'});
            const metadata = {
                name: filename,
                mimeType: 'application/json'
            };

            const accessToken = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
            form.append('file', file);

            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: new Headers({'Authorization': 'Bearer ' + accessToken}),
                body: form
            });

            if (!response.ok) throw new Error('Upload gagal');
            
            showSuccess('Backup berhasil disimpan!');
        } catch (error) {
            console.error('Backup error:', error);
            showError(`Gagal backup: ${error.message}`);
        }
    }

    // Fungsi Restore
    async function restoreData() {
        try {
            const picker = new google.picker.PickerBuilder()
                .addView(new google.picker.DocsView().setMimeTypes('application/json'))
                .setOAuthToken(gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token)
                .setDeveloperKey(CONFIG.API_KEY)
                .setCallback(async (data) => {
                    if (data.action === google.picker.Action.PICKED) {
                        const fileId = data.docs[0].id;
                        await processRestore(fileId);
                    }
                })
                .build();
            picker.setVisible(true);
        } catch (error) {
            console.error('Restore error:', error);
            showError(`Gagal memuat file picker: ${error.message}`);
        }
    }

    async function processRestore(fileId) {
        try {
            showLoading('Memproses restore...');
            
            const response = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
            });

            const data = response.result;
            
            // Validasi data
            if (!data.produk || !data.nota || !data.pengaturan) {
                throw new Error('Format file backup tidak valid');
            }

            // Simpan ke localStorage
            localStorage.setItem('produk', JSON.stringify(data.produk));
            localStorage.setItem('nota', JSON.stringify(data.nota));
            localStorage.setItem('pengaturanToko', JSON.stringify(data.pengaturan));
            
            showSuccess('Restore berhasil! Halaman akan direfresh...');
            setTimeout(() => location.reload(), 2000);
        } catch (error) {
            console.error('Process restore error:', error);
            showError(`Gagal restore: ${error.message}`);
        }
    }

    // Helper functions
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    function showLoading(message) {
        Swal.fire({
            title: 'Harap tunggu',
            html: message,
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
    }

    function showSuccess(message) {
        Swal.fire('Sukses!', message, 'success');
    }

    function showError(message) {
        Swal.fire('Error!', message, 'error');
    }

    // Event listeners
    signInBtn.addEventListener('click', () => {
        gapi.auth2.getAuthInstance().signIn();
    });

    signOutBtn.addEventListener('click', () => {
        gapi.auth2.getAuthInstance().signOut();
    });

    backupBtn.addEventListener('click', backupData);
    restoreBtn.addEventListener('click', restoreData);

    // Initialize
    initGoogleAPI();
});