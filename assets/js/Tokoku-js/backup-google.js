// backupgoogle.js
document.addEventListener('DOMContentLoaded', () => {
    const GoogleDriveManager = (() => {
        const clientId = '362387001717-qd55fokbba192mjd97t61b3jslbvqp47.apps.googleusercontent.com';
        const apiKey = 'AIzaSyCrnA2v4briyn9mUcRkMTcADdFJNa8CijQ';
        const scope = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile';
        const backupFileName = 'app_backup.json';
        const syncInterval = 30 * 60 * 1000; // 30 menit

        let googleAuth = null;
        let googleUser = null;
        let autoSyncTimer = null;

        const elements = {
            btnGoogleLogin: document.getElementById('btnGoogleLogin'),
            btnGoogleLogout: document.getElementById('btnGoogleLogout'),
            btnGoogleBackup: document.getElementById('btnGoogleBackup'),
            btnGoogleImport: document.getElementById('btnGoogleImport'),
            autoSyncToggle: document.getElementById('autoSyncToggle'),
            lastSyncElement: document.getElementById('lastSync')
        };

        const showSpinner = (element, show) => {
            if (element) element.style.display = show ? 'inline-block' : 'none';
        };

        const initGAPI = async () => {
            await new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://apis.google.com/js/api.js';
                script.onload = () => {
                    gapi.load('client:auth2', () => resolve());
                };
                document.head.appendChild(script);
            });

            await gapi.client.init({
                apiKey,
                clientId,
                scope,
            });

            googleAuth = gapi.auth2.getAuthInstance();
            googleAuth.isSignedIn.listen(updateAuthStatus);
            
            // Cek status login awal
            updateAuthStatus(googleAuth.isSignedIn.get());
        };

        const updateAuthStatus = (isSignedIn) => {
            if (isSignedIn) {
                googleUser = googleAuth.currentUser.get();
                enableActions();
                checkAutoSync();
            } else {
                googleUser = null;
                disableActions();
                stopAutoSync();
            }
            updateUI();
        };

        const updateUI = () => {
            const isLoggedIn = !!googleUser;
            
            // Toggle UI elements
            elements.btnGoogleLogin?.classList.toggle('d-none', isLoggedIn);
            elements.btnGoogleLogout?.classList.toggle('d-none', !isLoggedIn);
            
            // Update last sync time
            const lastSync = localStorage.getItem('lastSync');
            if (elements.lastSyncElement) {
                elements.lastSyncElement.textContent = lastSync 
                    ? `Terakhir sync: ${new Date(lastSync).toLocaleString()}`
                    : 'Belum pernah sync';
            }
        };

        const enableActions = () => {
            elements.btnGoogleBackup.disabled = false;
            elements.btnGoogleImport.disabled = false;
            elements.autoSyncToggle.disabled = false;
        };

        const disableActions = () => {
            elements.btnGoogleBackup.disabled = true;
            elements.btnGoogleImport.disabled = true;
            elements.autoSyncToggle.disabled = true;
        };

        const handleLogin = async () => {
            try {
                showSpinner(elements.btnGoogleLogin.querySelector('.spinner'), true);
                await googleAuth.signIn();
            } catch (error) {
                console.error('Login error:', error);
                alert('Login gagal: ' + error.error);
            } finally {
                showSpinner(elements.btnGoogleLogin.querySelector('.spinner'), false);
            }
        };

        const handleLogout = async () => {
            try {
                showSpinner(elements.btnGoogleLogout.querySelector('.spinner'), true);
                await googleAuth.signOut();
            } catch (error) {
                console.error('Logout error:', error);
                alert('Logout gagal: ' + error.error);
            } finally {
                showSpinner(elements.btnGoogleLogout.querySelector('.spinner'), false);
            }
        };

        const backupData = async () => {
            try {
                showSpinner(elements.btnGoogleBackup.querySelector('.spinner'), true);
                const data = {
                    produk: JSON.parse(localStorage.getItem('produk') || '[]'),
                    nota: JSON.parse(localStorage.getItem('nota') || '[]'),
                    pengaturan: JSON.parse(localStorage.getItem('pengaturanToko') || '{}')
                };

                const file = new Blob([JSON.stringify(data)], { type: 'application/json' });
                const metadata = {
                    name: backupFileName,
                    mimeType: 'application/json'
                };

                const formData = new FormData();
                formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' });
                formData.append('file', file);

                const response = await gapi.client.drive.files.create({
                    resource: metadata,
                    media: {
                        mimeType: 'application/json',
                        body: file
                    },
                    fields: 'id'
                });

                localStorage.setItem('lastSync', new Date().toISOString());
                alert('Backup berhasil! File ID: ' + response.result.id);
            } catch (error) {
                console.error('Backup error:', error);
                alert('Backup gagal: ' + error.result?.error?.message || error.message);
            } finally {
                showSpinner(elements.btnGoogleBackup.querySelector('.spinner'), false);
            }
        };

        const importData = async () => {
            try {
                showSpinner(elements.btnGoogleImport.querySelector('.spinner'), true);
                const response = await gapi.client.drive.files.list({
                    q: `name='${backupFileName}' and trashed=false`,
                    fields: 'files(id, name)'
                });

                const files = response.result.files;
                if (!files.length) throw new Error('File backup tidak ditemukan');

                const fileResponse = await gapi.client.drive.files.get({
                    fileId: files[0].id,
                    alt: 'media'
                });

                const data = fileResponse.result;
                localStorage.setItem('produk', JSON.stringify(data.produk));
                localStorage.setItem('nota', JSON.stringify(data.nota));
                localStorage.setItem('pengaturanToko', JSON.stringify(data.pengaturan));
                localStorage.setItem('lastSync', new Date().toISOString());

                alert('Import berhasil! Halaman akan direfresh');
                location.reload();
            } catch (error) {
                console.error('Import error:', error);
                alert('Import gagal: ' + error.result?.error?.message || error.message);
            } finally {
                showSpinner(elements.btnGoogleImport.querySelector('.spinner'), false);
            }
        };

        const toggleAutoSync = (enable) => {
            localStorage.setItem('autoSync', enable);
            if (enable) {
                startAutoSync();
            } else {
                stopAutoSync();
            }
        };

        const startAutoSync = () => {
            autoSyncTimer = setInterval(async () => {
                if (googleAuth.isSignedIn.get()) {
                    await backupData();
                }
            }, syncInterval);
        };

        const stopAutoSync = () => {
            if (autoSyncTimer) {
                clearInterval(autoSyncTimer);
                autoSyncTimer = null;
            }
        };

        const checkAutoSync = () => {
            const autoSyncEnabled = localStorage.getItem('autoSync') === 'true';
            elements.autoSyncToggle.checked = autoSyncEnabled;
            if (autoSyncEnabled && googleAuth.isSignedIn.get()) {
                startAutoSync();
            }
        };

        // Event Listeners
        const initEventListeners = () => {
            elements.btnGoogleLogin?.addEventListener('click', handleLogin);
            elements.btnGoogleLogout?.addEventListener('click', handleLogout);
            elements.btnGoogleBackup?.addEventListener('click', backupData);
            elements.btnGoogleImport?.addEventListener('click', importData);
            elements.autoSyncToggle?.addEventListener('change', (e) => toggleAutoSync(e.target.checked));
        };

        return {
            init: async () => {
                await initGAPI();
                initEventListeners();
                checkAutoSync();
                updateUI();
            }
        };
    })();

    GoogleDriveManager.init();
});