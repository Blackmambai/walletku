// googlebackup.js
document.addEventListener('DOMContentLoaded', () => {
    // Konfigurasi API
    const CLIENT_ID = '362387001717-qd55fokbba192mjd97t61b3jslbvqp47.apps.googleusercontent.com';
    const API_KEY = 'AIzaSyCrnA2v4briyn9mUcRkMTcADdFJNa8CijQ';
    const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
    const SCOPES = 'https://www.googleapis.com/auth/drive.file';
    const BACKUP_MIME_TYPE = 'application/json';

    // State Management
    let isAPILoaded = false;
    let authInstance = null;

    // DOM Elements
    const elements = {
        backupBtn: document.getElementById('btnGoogleBackup'),
        importBtn: document.getElementById('btnGoogleImport'),
        authStatus: document.getElementById('googleAuthStatus'),
        signInBtn: document.getElementById('btnGoogleSignIn'),
        signOutBtn: document.getElementById('btnGoogleSignOut')
    };

    // 1. Inisialisasi Google APIs
    async function initializeGoogleAPI() {
        try {
            // Load Google API Script
            if (!window.gapi) {
                await loadScript('https://apis.google.com/js/api.js');
            }

            // Load Client & Auth
            await new Promise(resolve => gapi.load('client:auth2', resolve));
            await gapi.client.init({
                apiKey: API_KEY,
                clientId: CLIENT_ID,
                discoveryDocs: DISCOVERY_DOCS,
                scope: SCOPES,
                ux_mode: 'popup'
            });

            authInstance = gapi.auth2.getAuthInstance();
            authInstance.isSignedIn.listen(updateAuthStatus);
            
            // Load Picker API
            await new Promise(resolve => gapi.load('picker', resolve));
            
            isAPILoaded = true;
            updateAuthStatus(authInstance.isSignedIn.get());
            
        } catch (error) {
            handleError('Gagal inisialisasi API', error);
        }
    }

    // 2. Manajemen Autentikasi
    function updateAuthStatus(isSignedIn) {
        elements.authStatus.innerHTML = isSignedIn ? 
            `<span class="connected"><i class="fas fa-cloud"></i> Terhubung ke Google Drive</span>` :
            `<span class="disconnected"><i class="fas fa-cloud-slash"></i> Tidak terhubung</span>`;

        [elements.backupBtn, elements.importBtn].forEach(btn => {
            if(btn) btn.disabled = !isSignedIn;
        });
    }

    async function handleAuth() {
        try {
            if (!authInstance.isSignedIn.get()) {
                await authInstance.signIn({ prompt: 'select_account' });
                showToast('Berhasil login ke Google Drive');
            }
        } catch (error) {
            handleError('Gagal autentikasi', error);
        }
    }

    async function handleSignOut() {
        try {
            await authInstance.signOut();
            showToast('Berhasil logout dari Google Drive');
        } catch (error) {
            handleError('Gagal logout', error);
        }
    }

    // 3. Backup ke Google Drive
    async function createBackup() {
        try {
            await validateAPIs();
            
            const { value: backupName } = await Swal.fire({
                title: 'Buat Backup',
                input: 'text',
                inputLabel: 'Nama File Backup',
                inputValue: `backup_${new Date().toISOString().slice(0,10)}`,
                showCancelButton: true
            });

            if(!backupName) return;

            const loader = showLoader('Menyimpan backup ke Google Drive...');
            
            const backupData = {
                version: 2.0,
                created: new Date().toISOString(),
                data: {
                    produk: safeParse(localStorage.getItem('produk'), []),
                    nota: safeParse(localStorage.getItem('nota'), []),
                    pengaturan: safeParse(localStorage.getItem('pengaturanToko'), {})
                }
            };

            const fileMetadata = {
                name: `${backupName}.json`,
                mimeType: BACKUP_MIME_TYPE,
                parents: ['root']
            };

            const formData = new FormData();
            formData.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
            formData.append('file', new Blob([JSON.stringify(backupData)], { type: BACKUP_MIME_TYPE }));

            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authInstance.currentUser.get().getAuthResponse().access_token}`
                },
                body: formData
            });

            if (!response.ok) throw await response.json();
            
            loader.close();
            showSuccess('Backup berhasil dibuat!');
            
        } catch (error) {
            handleError('Gagal membuat backup', error);
        }
    }

    // 4. Import dari Google Drive
    async function restoreBackup() {
        try {
            await validateAPIs();
            
            const file = await selectDriveFile();
            if(!file) return;

            const loader = showLoader('Memuat data backup...');
            const fileData = await downloadFile(file.id);
            
            if(!validateBackup(fileData)) {
                throw new Error('Format backup tidak valid');
            }

            const { isConfirmed } = await Swal.fire({
                title: 'Yakin ingin restore?',
                text: 'Semua data saat ini akan diganti!',
                icon: 'warning',
                showCancelButton: true
            });

            if(!isConfirmed) return;

            // Simpan data
            localStorage.setItem('produk', JSON.stringify(fileData.data.produk));
            localStorage.setItem('nota', JSON.stringify(fileData.data.nota));
            localStorage.setItem('pengaturanToko', JSON.stringify(fileData.data.pengaturan));

            loader.close();
            showSuccess('Restore berhasil! Halaman akan direfresh...', true);

        } catch (error) {
            handleError('Gagal restore backup', error);
        }
    }

    // 5. Fungsi Bantuan
    async function validateAPIs() {
        if(!isAPILoaded) throw new Error('API belum siap');
        if(!authInstance.isSignedIn.get()) {
            await handleAuth();
            throw new Error('Silakan login terlebih dahulu');
        }
    }

    function safeParse(data, defaultValue) {
        try {
            return JSON.parse(data || JSON.stringify(defaultValue));
        } catch {
            return defaultValue;
        }
    }

    async function selectDriveFile() {
        return new Promise((resolve, reject) => {
            const picker = new google.picker.PickerBuilder()
                .addView(new google.picker.DocsView()
                    .setMimeTypes(BACKUP_MIME_TYPE)
                    .setIncludeFolders(false))
                .setOAuthToken(authInstance.currentUser.get().getAuthResponse().access_token)
                .setDeveloperKey(API_KEY)
                .setCallback(data => {
                    if(data.action === google.picker.Action.PICKED) {
                        resolve(data.docs[0]);
                    } else {
                        reject('Pemilihan file dibatalkan');
                    }
                })
                .setSize(window.innerWidth > 600 ? 600 : Math.floor(window.innerWidth * 0.9))
                .build();
            picker.setVisible(true);
        });
    }

    async function downloadFile(fileId) {
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: {
                'Authorization': `Bearer ${authInstance.currentUser.get().getAuthResponse().access_token}`
            }
        });
        if(!response.ok) throw await response.json();
        return response.json();
    }

    function validateBackup(data) {
        return data.version &&
               data.data &&
               Array.isArray(data.data.produk) &&
               Array.isArray(data.data.nota) &&
               typeof data.data.pengaturan === 'object';
    }

    function showLoader(text) {
        return Swal.fire({
            title: text,
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
    }

    function showSuccess(message, reload = false) {
        Swal.fire({
            icon: 'success',
            title: 'Berhasil!',
            text: message,
            willClose: () => reload && location.reload()
        });
    }

    function handleError(context, error) {
        console.error(`${context}:`, error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: `${context}: ${error.message || error.error || error}`
        });
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Gagal memuat script: ${src}`));
            document.head.appendChild(script);
        });
    }

    // Event Listeners
    function initEventListeners() {
        elements.signInBtn?.addEventListener('click', handleAuth);
        elements.signOutBtn?.addEventListener('click', handleSignOut);
        elements.backupBtn?.addEventListener('click', createBackup);
        elements.importBtn?.addEventListener('click', restoreBackup);
    }

    // Inisialisasi
    (async () => {
        try {
            await initializeGoogleAPI();
            initEventListeners();
        } catch (error) {
            handleError('Gagal inisialisasi sistem', error);
        }
    })();
});