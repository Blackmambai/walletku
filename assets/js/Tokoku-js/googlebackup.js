document.addEventListener('DOMContentLoaded', () => {
        // Konfigurasi API
        const CONFIG = {
            CLIENT_ID: '362387001717-qd55fokbba192mjd97t61b3jslbvqp47.apps.googleusercontent.com',
            API_KEY: 'AIzaSyCrnA2v4briyn9mUcRkMTcADdFJNa8CijQ',
            SCOPES: 'https://www.googleapis.com/auth/drive.file',
            DISCOVERY_DOCS: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
            REDIRECT_URI: window.location.origin
        };

        // State Management
        let isGoogleInitialized = false;
        let authInstance = null;

        // DOM Elements
        const elements = {
            authStatus: document.getElementById('googleAuthStatus'),
            signInBtn: document.getElementById('btnGoogleSignIn'),
            signOutBtn: document.getElementById('btnGoogleSignOut'),
            backupBtn: document.getElementById('btnGoogleBackup'),
            importBtn: document.getElementById('btnGoogleImport')
        };

        // 1. Inisialisasi Google API
        async function initializeGoogleAPI() {
            try {
                // Load Google API Script
                if (!window.gapi) {
                    await loadScript('https://apis.google.com/js/api.js');
                }

                // Initialize Client
                await new Promise((resolve, reject) => {
                    gapi.load('client:auth2', {
                        callback: resolve,
                        onerror: reject,
                        timeout: 5000
                    });
                });

                await gapi.client.init({
                    clientId: CONFIG.CLIENT_ID,
                    apiKey: CONFIG.API_KEY,
                    discoveryDocs: CONFIG.DISCOVERY_DOCS,
                    scope: CONFIG.SCOPES,
                    redirect_uri: CONFIG.REDIRECT_URI,
                    ux_mode: 'redirect'
                });

                authInstance = gapi.auth2.getAuthInstance();
                authInstance.isSignedIn.listen(updateAuthStatus);
                
                // Initialize Picker
                await new Promise(resolve => gapi.load('picker', resolve));
                
                isGoogleInitialized = true;
                updateAuthStatus(authInstance.isSignedIn.get());

                console.log('Google API initialized successfully');
            } catch (error) {
                console.error('Initialization error:', error);
                showError('Gagal menginisialisasi Google API', error);
            }
        }

        // 2. Update UI Status
        function updateAuthStatus(isSignedIn) {
            if (isSignedIn) {
                elements.authStatus.className = 'status connected';
                elements.authStatus.innerHTML = `
                    <i class="fas fa-check-circle"></i> Terhubung dengan Google Drive (${authInstance.currentUser.get().getBasicProfile().getEmail()})
                `;
                elements.signInBtn.disabled = true;
                elements.signOutBtn.disabled = false;
                elements.backupBtn.disabled = false;
                elements.importBtn.disabled = false;
            } else {
                elements.authStatus.className = 'status disconnected';
                elements.authStatus.innerHTML = `
                    <i class="fas fa-times-circle"></i> Tidak terhubung dengan Google Drive
                `;
                elements.signInBtn.disabled = false;
                elements.signOutBtn.disabled = true;
                elements.backupBtn.disabled = true;
                elements.importBtn.disabled = true;
            }
        }

        // 3. Authentication Handlers
        async function handleGoogleLogin() {
            try {
                if (!isGoogleInitialized) {
                    await initializeGoogleAPI();
                }
                
                await authInstance.signIn({
                    prompt: 'select_account',
                    include_granted_scopes: true
                });
                
                showSuccess('Berhasil login ke Google Drive');
            } catch (error) {
                console.error('Login error:', error);
                showError('Gagal login ke Google', error);
            }
        }

        async function handleGoogleLogout() {
            try {
                await authInstance.signOut();
                showSuccess('Berhasil logout dari Google Drive');
            } catch (error) {
                console.error('Logout error:', error);
                showError('Gagal logout dari Google', error);
            }
        }

        // 4. Backup Functions
        async function createBackup() {
            try {
                await validateAuth();
                
                // Minta nama backup
                const { value: backupName } = await Swal.fire({
                    title: 'Buat Backup',
                    input: 'text',
                    inputLabel: 'Nama File Backup',
                    inputValue: `backup_${new Date().toISOString().slice(0,10)}`,
                    showCancelButton: true,
                    inputValidator: (value) => {
                        if (!value) return 'Nama backup tidak boleh kosong!';
                    }
                });

                if (!backupName) return;

                const loader = showLoader('Menyimpan backup ke Google Drive...');
                
                // Siapkan data backup
                const backupData = {
                    version: 2.1,
                    created: new Date().toISOString(),
                    data: {
                        produk: getLocalStorageData('produk', []),
                        nota: getLocalStorageData('nota', []),
                        pengaturan: getLocalStorageData('pengaturanToko', {})
                    }
                };

                // Upload ke Google Drive
                const accessToken = authInstance.currentUser.get().getAuthResponse().access_token;
                const fileMetadata = {
                    name: `${backupName}.json`,
                    mimeType: 'application/json',
                    parents: ['root']
                };

                const formData = new FormData();
                formData.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
                formData.append('file', new Blob([JSON.stringify(backupData)], { type: 'application/json' }));

                const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error.message || 'Upload gagal');
                }

                loader.close();
                showSuccess('Backup berhasil dibuat!');
                
            } catch (error) {
                console.error('Backup error:', error);
                showError('Gagal membuat backup', error);
            }
        }

        // 5. Restore Functions
        async function restoreBackup() {
            try {
                await validateAuth();
                
                // Pilih file dari Google Drive
                const file = await selectDriveFile();
                if (!file) return;

                const loader = showLoader('Memuat data backup...');
                
                // Download file
                const fileData = await downloadFile(file.id);
                
                // Validasi backup
                if (!validateBackup(fileData)) {
                    throw new Error('Format file backup tidak valid');
                }

                // Konfirmasi restore
                const { isConfirmed } = await Swal.fire({
                    title: 'Restore Backup?',
                    html: `Anda akan memulihkan backup dari:<br>
                           <b>${file.name}</b><br>
                           <small>Dibuat: ${new Date(fileData.created).toLocaleString()}</small>`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Ya, Restore',
                    cancelButtonText: 'Batal'
                });

                if (!isConfirmed) {
                    loader.close();
                    return;
                }

                // Simpan data ke localStorage
                localStorage.setItem('produk', JSON.stringify(fileData.data.produk));
                localStorage.setItem('nota', JSON.stringify(fileData.data.nota));
                localStorage.setItem('pengaturanToko', JSON.stringify(fileData.data.pengaturan));

                loader.close();
                showSuccess('Restore berhasil! Halaman akan direfresh...', true);

            } catch (error) {
                console.error('Restore error:', error);
                showError('Gagal restore backup', error);
            }
        }

        // 6. Helper Functions
        async function validateAuth() {
            if (!isGoogleInitialized) {
                throw new Error('Google API belum diinisialisasi');
            }
            if (!authInstance.isSignedIn.get()) {
                await handleGoogleLogin();
                throw new Error('Silakan login terlebih dahulu');
            }
        }

        function getLocalStorageData(key, defaultValue) {
            try {
                return JSON.parse(localStorage.getItem(key)) || defaultValue;
            } catch {
                return defaultValue;
            }
        }

        async function selectDriveFile() {
            return new Promise((resolve, reject) => {
                const accessToken = authInstance.currentUser.get().getAuthResponse().access_token;
                
                const view = new google.picker.DocsView()
                    .setIncludeFolders(false)
                    .setMimeTypes('application/json')
                    .setQuery('name contains "backup_"');
                
                const picker = new google.picker.PickerBuilder()
                    .addView(view)
                    .setOAuthToken(accessToken)
                    .setDeveloperKey(CONFIG.API_KEY)
                    .setCallback(data => {
                        if (data[google.picker.Response.ACTION] === google.picker.Action.PICKED) {
                            resolve(data[google.picker.Response.DOCUMENTS][0]);
                        } else if (data[google.picker.Response.ACTION] === google.picker.Action.CANCEL) {
                            reject('User membatalkan pemilihan file');
                        }
                    })
                    .setOrigin(window.location.origin)
                    .setSize(window.innerWidth > 600 ? 600 : Math.floor(window.innerWidth * 0.9))
                    .build();
                
                picker.setVisible(true);
            });
        }

        async function downloadFile(fileId) {
            const accessToken = authInstance.currentUser.get().getAuthResponse().access_token;
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error.message || 'Download gagal');
            }
            
            return response.json();
        }

        function validateBackup(data) {
            return data && 
                   data.version && 
                   data.data && 
                   Array.isArray(data.data.produk) && 
                   Array.isArray(data.data.nota) && 
                   typeof data.data.pengaturan === 'object';
        }

        function loadScript(src) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.async = true;
                script.defer = true;
                script.onload = resolve;
                script.onerror = () => reject(new Error(`Gagal memuat script: ${src}`));
                document.head.appendChild(script);
            });
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
                title: 'Sukses!',
                text: message,
                willClose: () => reload && location.reload()
            });
        }

        function showError(title, error) {
            Swal.fire({
                icon: 'error',
                title: title,
                html: `<div style="text-align:left">
                         <b>Error Detail:</b><br>
                         <code>${error.message || error.error || error}</code>
                       </div>`,
                showCloseButton: true
            });
        }

        // Event Listeners
        elements.signInBtn.addEventListener('click', handleGoogleLogin);
        elements.signOutBtn.addEventListener('click', handleGoogleLogout);
        elements.backupBtn.addEventListener('click', createBackup);
        elements.importBtn.addEventListener('click', restoreBackup);

        // Initialize
        initializeGoogleAPI().catch(error => {
            console.error('Initialization failed:', error);
            showError('Gagal inisialisasi Google API', error);
        });
    });