document.addEventListener('DOMContentLoaded', () => {
    debugLog('DOM fully loaded');
    
    const GoogleDriveManager = (() => {
        const clientId = '362387001717-qd55fokbba192mjd97t61b3jslbvqp47.apps.googleusercontent.com';
        const apiKey = 'AIzaSyCrnA2v4briyn9mUcRkMTcADdFJNa8CijQ';
        const scope = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile';
        const backupFileName = 'app_backup.json';
        const syncInterval = 30 * 60 * 1000; // 30 minutes

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
            if (element) {
                const spinner = element.querySelector('.spinner');
                if (spinner) spinner.style.display = show ? 'inline-block' : 'none';
            }
        };

        const initGAPI = async () => {
            debugLog('Initializing GAPI...');
            
            try {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://apis.google.com/js/api.js';
                    script.onload = () => {
                        debugLog('Google API script loaded');
                        gapi.load('client:auth2', {
                            callback: resolve,
                            onerror: reject
                        });
                    };
                    script.onerror = reject;
                    document.head.appendChild(script);
                });

                debugLog('GAPI client loading...');
                
                await gapi.client.init({
                    apiKey,
                    clientId,
                    scope,
                });

                debugLog('GAPI client initialized');
                
                googleAuth = gapi.auth2.getAuthInstance();
                googleAuth.isSignedIn.listen(updateAuthStatus);
                
                // Check initial login status
                updateAuthStatus(googleAuth.isSignedIn.get());
            } catch (error) {
                debugLog('GAPI initialization failed: ' + error.message);
                console.error('GAPI init error:', error);
            }
        };

        const updateAuthStatus = (isSignedIn) => {
            debugLog(`Auth status changed: ${isSignedIn}`);
            
            if (isSignedIn) {
                googleUser = googleAuth.currentUser.get();
                debugLog(`User signed in: ${googleUser.getBasicProfile().getName()}`);
                enableActions();
                checkAutoSync();
            } else {
                googleUser = null;
                debugLog('User signed out');
                disableActions();
                stopAutoSync();
            }
            updateUI();
        };

        const updateUI = () => {
            const isLoggedIn = !!googleUser;
            
            // Toggle UI elements
            if (elements.btnGoogleLogin) elements.btnGoogleLogin.classList.toggle('d-none', isLoggedIn);
            if (elements.btnGoogleLogout) elements.btnGoogleLogout.classList.toggle('d-none', !isLoggedIn);
            
            // Update last sync time
            const lastSync = localStorage.getItem('lastSync');
            if (elements.lastSyncElement) {
                elements.lastSyncElement.textContent = lastSync 
                    ? `Last sync: ${new Date(lastSync).toLocaleString()}`
                    : 'Never synced';
            }
        };

        const enableActions = () => {
            if (elements.btnGoogleBackup) elements.btnGoogleBackup.disabled = false;
            if (elements.btnGoogleImport) elements.btnGoogleImport.disabled = false;
            if (elements.autoSyncToggle) elements.autoSyncToggle.disabled = false;
        };

        const disableActions = () => {
            if (elements.btnGoogleBackup) elements.btnGoogleBackup.disabled = true;
            if (elements.btnGoogleImport) elements.btnGoogleImport.disabled = true;
            if (elements.autoSyncToggle) elements.autoSyncToggle.disabled = true;
        };

        const handleLogin = async () => {
            try {
                debugLog('Attempting login...');
                showSpinner(elements.btnGoogleLogin, true);
                await googleAuth.signIn();
            } catch (error) {
                debugLog('Login error: ' + error.message);
                console.error('Login error:', error);
                alert('Login failed: ' + error.error);
            } finally {
                showSpinner(elements.btnGoogleLogin, false);
            }
        };

        const handleLogout = async () => {
            try {
                debugLog('Attempting logout...');
                showSpinner(elements.btnGoogleLogout, true);
                await googleAuth.signOut();
            } catch (error) {
                debugLog('Logout error: ' + error.message);
                console.error('Logout error:', error);
                alert('Logout failed: ' + error.error);
            } finally {
                showSpinner(elements.btnGoogleLogout, false);
            }
        };

        const backupData = async () => {
            try {
                debugLog('Starting backup...');
                showSpinner(elements.btnGoogleBackup, true);
                
                // Create sample data if none exists
                if (!localStorage.getItem('produk')) {
                    localStorage.setItem('produk', JSON.stringify([{id: 1, name: "Sample Product"}]));
                    localStorage.setItem('nota', JSON.stringify([{id: 1, date: new Date().toISOString()}]));
                    localStorage.setItem('pengaturanToko', JSON.stringify({shopName: "My Shop"}));
                }
                
                const data = {
                    produk: JSON.parse(localStorage.getItem('produk') || '[]'),
                    nota: JSON.parse(localStorage.getItem('nota') || '[]'),
                    pengaturan: JSON.parse(localStorage.getItem('pengaturanToko') || '{}')
                };

                const file = new Blob([JSON.stringify(data)], { type: 'application/json' });
                const metadata = {
                    name: backupFileName,
                    mimeType: 'application/json',
                    parents: ['root'] // Specify parent folder (root is the Drive root)
                };

                const accessToken = googleUser.getAuthResponse().access_token;
                
                // Using Fetch API instead of gapi.client.drive for better error handling
                const formData = new FormData();
                formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
                formData.append('file', file);

                const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
                    method: 'POST',
                    headers: new Headers({
                        'Authorization': 'Bearer ' + accessToken
                    }),
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error.message || 'Backup failed');
                }

                const result = await response.json();
                debugLog('Backup successful. File ID: ' + result.id);
                
                localStorage.setItem('lastSync', new Date().toISOString());
                alert('Backup successful! File ID: ' + result.id);
            } catch (error) {
                debugLog('Backup error: ' + error.message);
                console.error('Backup error:', error);
                alert('Backup failed: ' + error.message);
            } finally {
                showSpinner(elements.btnGoogleBackup, false);
                updateUI();
            }
        };

        const importData = async () => {
            try {
                debugLog('Starting import...');
                showSpinner(elements.btnGoogleImport, true);
                
                const response = await gapi.client.drive.files.list({
                    q: `name='${backupFileName}' and trashed=false`,
                    fields: 'files(id, name)',
                    spaces: 'drive'
                });

                const files = response.result.files;
                if (!files || files.length === 0) throw new Error('Backup file not found');

                debugLog(`Found backup file: ${files[0].name} (${files[0].id})`);
                
                const fileResponse = await gapi.client.drive.files.get({
                    fileId: files[0].id,
                    alt: 'media'
                });

                const data = fileResponse.result;
                if (!data) throw new Error('Empty backup data');
                
                debugLog('Importing data...');
                localStorage.setItem('produk', JSON.stringify(data.produk));
                localStorage.setItem('nota', JSON.stringify(data.nota));
                localStorage.setItem('pengaturanToko', JSON.stringify(data.pengaturan));
                localStorage.setItem('lastSync', new Date().toISOString());

                debugLog('Import successful, reloading...');
                alert('Import successful! Page will reload');
                location.reload();
            } catch (error) {
                debugLog('Import error: ' + error.message);
                console.error('Import error:', error);
                alert('Import failed: ' + (error.result?.error?.message || error.message));
            } finally {
                showSpinner(elements.btnGoogleImport, false);
            }
        };

        const toggleAutoSync = (enable) => {
            debugLog(`Auto sync ${enable ? 'enabled' : 'disabled'}`);
            localStorage.setItem('autoSync', enable);
            if (enable) {
                startAutoSync();
            } else {
                stopAutoSync();
            }
        };

        const startAutoSync = () => {
            debugLog('Starting auto sync');
            stopAutoSync(); // Clear existing timer
            autoSyncTimer = setInterval(async () => {
                if (googleAuth.isSignedIn.get()) {
                    debugLog('Auto sync triggered');
                    await backupData();
                }
            }, syncInterval);
        };

        const stopAutoSync = () => {
            if (autoSyncTimer) {
                debugLog('Stopping auto sync');
                clearInterval(autoSyncTimer);
                autoSyncTimer = null;
            }
        };

        const checkAutoSync = () => {
            const autoSyncEnabled = localStorage.getItem('autoSync') === 'true';
            if (elements.autoSyncToggle) {
                elements.autoSyncToggle.checked = autoSyncEnabled;
            }
            if (autoSyncEnabled && googleAuth.isSignedIn.get()) {
                startAutoSync();
            }
        };

        // Event Listeners
        const initEventListeners = () => {
            debugLog('Initializing event listeners');
            
            if (elements.btnGoogleLogin) {
                elements.btnGoogleLogin.addEventListener('click', handleLogin);
            }
            if (elements.btnGoogleLogout) {
                elements.btnGoogleLogout.addEventListener('click', handleLogout);
            }
            if (elements.btnGoogleBackup) {
                elements.btnGoogleBackup.addEventListener('click', backupData);
            }
            if (elements.btnGoogleImport) {
                elements.btnGoogleImport.addEventListener('click', importData);
            }
            if (elements.autoSyncToggle) {
                elements.autoSyncToggle.addEventListener('change', (e) => toggleAutoSync(e.target.checked));
            }
        };

        return {
            init: async () => {
                debugLog('Initializing GoogleDriveManager');
                await initGAPI();
                initEventListeners();
                checkAutoSync();
                updateUI();
            }
        };
    })();

    GoogleDriveManager.init();
});