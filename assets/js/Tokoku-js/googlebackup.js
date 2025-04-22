// googlebackup.js
document.addEventListener('DOMContentLoaded', () => {
    const CLIENT_ID = '362387001717-qd55fokbba192mjd97t61b3jslbvqp47.apps.googleusercontent.com';
    const API_KEY = 'AIzaSyCrnA2v4briyn9mUcRkMTcADdFJNa8CijQ';
    const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
    const SCOPES = 'https://www.googleapis.com/auth/drive.file';

    // DOM Elements
    const btnGoogleBackup = document.getElementById('btnGoogleBackup');
    const btnGoogleImport = document.getElementById('btnGoogleImport');
    const googleAuthStatus = document.getElementById('googleAuthStatus');
    
    let googleApiInitialized = false;
    let pickerApiLoaded = false;

    // Initialize Google API dengan UX mode yang sesuai
    function initGoogleClient() {
        return new Promise((resolve, reject) => {
            gapi.load('client:auth2', {
                callback: () => {
                    gapi.client.init({
                        apiKey: API_KEY,
                        clientId: CLIENT_ID,
                        discoveryDocs: DISCOVERY_DOCS,
                        scope: SCOPES,
                        ux_mode: isMobile() ? 'redirect' : 'popup',
                        redirect_uri: window.location.origin
                    }).then(() => {
                        googleApiInitialized = true;
                        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
                        updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
                        
                        // Handle redirect after login
                        if (window.location.hash.includes('access_token')) {
                            history.replaceState({}, document.title, window.location.pathname);
                        }
                        resolve();
                    }).catch(reject);
                },
                onerror: () => reject(new Error('Gagal memuat Google API')),
                timeout: 5000
            });
        });
    }

    // Deteksi perangkat mobile
    function isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // Load Picker API dengan view yang dioptimalkan
    function loadPickerApi() {
        return new Promise((resolve, reject) => {
            gapi.load('picker', {
                callback: () => {
                    pickerApiLoaded = true;
                    resolve();
                },
                onerror: () => reject(new Error('Gagal memuat Google Picker API')),
                timeout: 5000
            });
        });
    }

    // Update UI status login
    function updateSigninStatus(isSignedIn) {
        const statusHTML = isSignedIn ? 
            '<span class="text-success"><i class="fas fa-check-circle"></i> Terhubung dengan Google Drive</span>' :
            '<span class="text-danger"><i class="fas fa-times-circle"></i> Tidak terhubung dengan Google Drive</span>';
        
        googleAuthStatus.innerHTML = statusHTML;
        [btnGoogleBackup, btnGoogleImport].forEach(btn => {
            if (btn) btn.disabled = !isSignedIn;
        });
    }

    // Handle auth dengan fallback untuk mobile
    async function handleGoogleAuth(action) {
        try {
            if (!googleApiInitialized) throw new Error('Google API belum diinisialisasi');
            
            const auth = gapi.auth2.getAuthInstance();
            if (action === 'login') {
                await auth.signIn({ prompt: 'select_account' });
                Swal.fire('Berhasil Login', 'Terhubung dengan Google Drive', 'success');
            } else {
                await auth.signOut();
                Swal.fire('Berhasil Logout', 'Terputus dari Google Drive', 'success');
            }
        } catch (error) {
            console.error(`Error ${action}:`, error);
            showError(`Gagal ${action === 'login' ? 'login' : 'logout'}: ${error.error || error.message}`);
        }
    }

    // Backup dengan error handling improved
    async function backupToGoogleDrive() {
        try {
            if (!await checkAuth()) return;
            
            const { value: fileName } = await Swal.fire({
                title: 'Nama Backup',
                input: 'text',
                inputValue: `backup_${new Date().toISOString().split('T')[0]}`,
                showCancelButton: true,
                confirmButtonText: 'Backup',
                inputValidator: (value) => !value && 'Nama file tidak boleh kosong!'
            });

            if (!fileName) return;

            const swalInstance = Swal.fire({
                title: 'Membuat Backup',
                html: `<div class="progress mt-3">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" style="width: 100%"></div>
                      </div>`,
                allowOutsideClick: false,
                showConfirmButton: false
            });

            // Data preparation
            const backupData = {
                produk: JSON.parse(localStorage.getItem('produk') || '[]'),
                nota: JSON.parse(localStorage.getItem('nota') || '[]'),
                pengaturanToko: JSON.parse(localStorage.getItem('pengaturanToko') || '{}'),
                _meta: {
                    version: 2,
                    createdAt: new Date().toISOString(),
                    device: isMobile() ? 'mobile' : 'desktop'
                }
            };

            const accessToken = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;
            const fileMetadata = {
                name: `${fileName}.json`,
                mimeType: 'application/json'
            };

            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
            form.append('file', new Blob([JSON.stringify(backupData)], { type: 'application/json' }));

            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}` },
                body: form
            });

            await swalInstance.close();
            
            if (!response.ok) throw await response.json();
            Swal.fire('Backup Berhasil!', 'Data tersimpan di Google Drive', 'success');
        } catch (error) {
            console.error('Backup error:', error);
            showError(`Gagal backup: ${error.error?.message || error.message}`);
        }
    }

    // Import dengan Picker yang dioptimalkan
    async function importFromGoogleDrive() {
        try {
            if (!await checkAuth() || !pickerApiLoaded) return;

            const picker = new google.picker.PickerBuilder()
                .addView(new google.picker.DocsView()
                    .setMimeTypes('application/json')
                    .setQuery('name contains "backup_"'))
                .setOAuthToken(gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token)
                .setDeveloperKey(API_KEY)
                .setCallback(async (data) => {
                    if (data.action === google.picker.Action.PICKED) {
                        const fileId = data.docs[0].id;
                        await processFileImport(fileId);
                    }
                })
                .setSize(isMobile() ? google.picker.Size.ADAPTIVE : google.picker.Size.LARGE)
                .build();
            
            picker.setVisible(true);
        } catch (error) {
            showError(`Gagal memuat Picker: ${error.message}`);
        }
    }

    async function processFileImport(fileId) {
        try {
            const swalInstance = Swal.fire({
                title: 'Memvalidasi Data',
                html: '<div class="spinner-border text-primary"></div>',
                showConfirmButton: false,
                allowOutsideClick: false
            });

            const accessToken = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            const data = await response.json();
            if (!data._meta || data._meta.version < 2) throw new Error('Format backup kedaluwarsa');

            const { isConfirmed } = await Swal.fire({
                title: 'Timpa Data Sekarang?',
                text: 'Semua data lokal akan diganti!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Ya, Timpa!'
            });

            if (!isConfirmed) return;

            localStorage.setItem('produk', JSON.stringify(data.produk));
            localStorage.setItem('nota', JSON.stringify(data.nota));
            localStorage.setItem('pengaturanToko', JSON.stringify(data.pengaturanToko));

            Swal.fire('Import Berhasil!', 'Halaman akan direfresh...', 'success').then(() => location.reload());
        } catch (error) {
            showError(`Import gagal: ${error.message}`);
        } finally {
            Swal.close();
        }
    }

    // Utility functions
    async function checkAuth() {
        if (!googleApiInitialized) {
            showError('Google API belum siap');
            return false;
        }
        if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
            await handleGoogleAuth('login');
            return gapi.auth2.getAuthInstance().isSignedIn.get();
        }
        return true;
    }

    function showError(message) {
        Swal.fire('Error!', message, 'error');
    }

    // Event Listeners
    document.querySelectorAll('[data-google-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.target.dataset.googleAction;
            if (action === 'login') handleGoogleAuth('login');
            if (action === 'logout') handleGoogleAuth('logout');
            if (action === 'backup') backupToGoogleDrive();
            if (action === 'import') importFromGoogleDrive();
        });
    });

    // Initialize
    const initGoogleAPIs = async () => {
        try {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://apis.google.com/js/api.js';
                script.async = true;
                script.defer = true;
                script.onload = () => resolve();
                script.onerror = () => reject('Gagal memuat Google API');
                document.head.appendChild(script);
            });

            await initGoogleClient();
            await loadPickerApi();
        } catch (error) {
            showError(error);
        }
    };

    initGoogleAPIs();
});