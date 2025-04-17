document.addEventListener('DOMContentLoaded', () => {
    debugLog('DOM fully loaded and parsed');
    
    const GoogleDriveManager = (() => {
        // Configuration
        const clientId = '362387001717-qd55fokbba192mjd97t61b3jslbvqp47.apps.googleusercontent.com';
        const apiKey = 'AIzaSyCrnA2v4briyn9mUcRkMTcADdFJNa8CijQ';
        const scope = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile';
        const backupFileName = 'app_backup.json';
        const syncInterval = 30 * 60 * 1000; // 30 minutes

        // State variables
        let googleAuth = null;
        let googleUser = null;
        let autoSyncTimer = null;
        let retryCount = 0;
        const maxRetries = 3;

        // DOM Elements
        const elements = {
            btnGoogleLogin: document.getElementById('btnGoogleLogin'),
            btnGoogleLogout: document.getElementById('btnGoogleLogout'),
            btnGoogleBackup: document.getElementById('btnGoogleBackup'),
            btnGoogleImport: document.getElementById('btnGoogleImport'),
            autoSyncToggle: document.getElementById('autoSyncToggle'),
            lastSyncElement: document.getElementById('lastSync'),
            userInfoElement: document.getElementById('userInfo')
        };

        // Helper functions
        const showSpinner = (element, show) => {
            if (element) {
                const spinner = element.querySelector('.spinner');
                if (spinner) {
                    spinner.style.display = show ? 'block' : 'none';
                    element.disabled = show;
                }
            }
        };

        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        // Initialize Google API
        const initGAPI = async () => {
            debugLog('Initializing Google API...');
            
            try {
                // Step 1: Load the Google API script
                if (!window.gapi) {
                    await loadScript('https://apis.google.com/js/api.js');
                    debugLog('Google API script loaded successfully');
                }

                // Step 2: Load the auth2 client
                if (!window.gapi.auth2) {
                    await new Promise((resolve, reject) => {
                        gapi.load('client:auth2', {
                            callback: resolve,
                            onerror: reject,
                            timeout: 10000 // 10 seconds timeout
                        });
                    });
                    debugLog('Google auth2 client loaded successfully');
                }

                // Step 3: Initialize the client
                await gapi.client.init({
                    apiKey: apiKey,
                    clientId: clientId,
                    scope: scope,
                    discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
                    ux_mode: 'popup'
                });
                
                debugLog('Google API client initialized successfully');
                
                googleAuth = gapi.auth2.getAuthInstance();
                googleAuth.isSignedIn.listen(updateAuthStatus);
                
                // Check initial auth status
                updateAuthStatus(googleAuth.isSignedIn.get());
                
            } catch (error) {
                if (retryCount < maxRetries) {
                    retryCount++;
                    debugLog(`Retry ${retryCount}/${maxRetries} after error: ${error.message}`);
                    await sleep(2000 * retryCount);
                    return initGAPI();
                }
                handleError(error, 'Google API initialization');
                throw error;
            }
        };

        const loadScript = (src) => {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.async = true;
                script.defer = true;
                script.onload = resolve;
                script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
                document.head.appendChild(script);
            });
        };

        // Auth status handler
        const updateAuthStatus = (isSignedIn) => {
            debugLog(`Auth status changed: ${isSignedIn}`);
            
            try {
                if (isSignedIn) {
                    googleUser = googleAuth.currentUser.get();
                    const profile = googleUser.getBasicProfile();
                    debugLog(`User signed in: ${profile.getName()} (${profile.getEmail()})`);
                    
                    updateUserInfo(profile);
                    enableActions();
                    checkAutoSync();
                } else {
                    googleUser = null;
                    clearUserInfo();
                    disableActions();
                    stopAutoSync();
                }
                
                updateUI();
            } catch (error) {
                handleError(error, 'updating auth status');
            }
        };

        const updateUserInfo = (profile) => {
            if (elements.userInfoElement) {
                elements.userInfoElement.innerHTML = `
                    <strong>Logged in as:</strong> ${profile.getName()} (${profile.getEmail()})
                    <img src="${profile.getImageUrl()}" style="width:24px;height:24px;border-radius:50%;margin-left:10px;vertical-align:middle;">
                `;
            }
        };

        const clearUserInfo = () => {
            if (elements.userInfoElement) {
                elements.userInfoElement.innerHTML = '';
            }
        };

        // UI Update functions
        const updateUI = () => {
            const isLoggedIn = !!googleUser;
            
            // Toggle login/logout buttons
            toggleElement(elements.btnGoogleLogin, !isLoggedIn);
            toggleElement(elements.btnGoogleLogout, isLoggedIn);
            
            // Update last sync time
            updateLastSyncTime();
        };

        const toggleElement = (element, show) => {
            if (element) {
                if (show) {
                    element.classList.remove('d-none');
                } else {
                    element.classList.add('d-none');
                }
            }
        };

        const updateLastSyncTime = () => {
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

        // Auth actions
        const handleLogin = async () => {
            debugLog('Login button clicked');
            
            try {
                showSpinner(elements.btnGoogleLogin, true);
                
                // Force consent prompt and clear any existing session
                await googleAuth.signIn({
                    prompt: 'consent',
                    login_hint: '',
                });
                
                debugLog('Login successful');
            } catch (error) {
                handleError(error, 'Google login');
            } finally {
                showSpinner(elements.btnGoogleLogin, false);
            }
        };

        const handleLogout = async () => {
            debugLog('Logout button clicked');
            
            try {
                showSpinner(elements.btnGoogleLogout, true);
                await googleAuth.signOut();
                debugLog('Logout successful');
            } catch (error) {
                handleError(error, 'Google logout');
            } finally {
                showSpinner(elements.btnGoogleLogout, false);
            }
        };

        // Backup functions
        const backupData = async () => {
            debugLog('Starting backup process...');
            
            try {
                showSpinner(elements.btnGoogleBackup, true);
                
                // Prepare data to backup
                const data = {
                    timestamp: new Date().toISOString(),
                    produk: JSON.parse(localStorage.getItem('produk') || '[]'),
                    nota: JSON.parse(localStorage.getItem('nota') || '[]'),
                    pengaturan: JSON.parse(localStorage.getItem('pengaturanToko') || '{}')
                };
                
                debugLog('Data prepared for backup');

                // Create file metadata
                const metadata = {
                    name: backupFileName,
                    mimeType: 'application/json',
                    parents: ['root']
                };

                // Get access token
                const accessToken = googleUser.getAuthResponse().access_token;
                
                // Create file content
                const fileContent = JSON.stringify(data, null, 2);
                const file = new Blob([fileContent], { type: 'application/json' });

                // Check for existing file
                const existingFile = await findBackupFile();
                
                if (existingFile) {
                    debugLog(`Updating existing file: ${existingFile.id}`);
                    await updateFile(existingFile.id, metadata, file, accessToken);
                } else {
                    debugLog('Creating new backup file');
                    await createFile(metadata, file, accessToken);
                }
                
                // Update last sync time
                localStorage.setItem('lastSync', new Date().toISOString());
                updateLastSyncTime();
                
                debugLog('Backup completed successfully');
                alert('Backup completed successfully!');
            } catch (error) {
                handleError(error, 'Google Drive backup');
            } finally {
                showSpinner(elements.btnGoogleBackup, false);
            }
        };

        const findBackupFile = async () => {
            try {
                const response = await gapi.client.drive.files.list({
                    q: `name='${backupFileName}' and trashed=false`,
                    spaces: 'drive',
                    fields: 'files(id, name)',
                    pageSize: 1
                });
                
                return response.result.files[0] || null;
            } catch (error) {
                throw new Error(`Failed to find backup file: ${error.message}`);
            }
        };

        const createFile = async (metadata, file, accessToken) => {
            const formData = new FormData();
            formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            formData.append('file', file);

            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error.message || 'Failed to create file');
            }

            return response.json();
        };

        const updateFile = async (fileId, metadata, file, accessToken) => {
            const formData = new FormData();
            formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            formData.append('file', file);

            const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error.message || 'Failed to update file');
            }

            return response.json();
        };

        // Import functions
        const importData = async () => {
            debugLog('Starting import process...');
            
            try {
                showSpinner(elements.btnGoogleImport, true);
                
                // Find backup file
                const file = await findBackupFile();
                if (!file) {
                    throw new Error('No backup file found');
                }
                
                debugLog(`Found backup file: ${file.id}`);

                // Download file content
                const response = await gapi.client.drive.files.get({
                    fileId: file.id,
                    alt: 'media'
                });
                
                const data = response.result;
                if (!data) {
                    throw new Error('Empty backup data');
                }
                
                debugLog('Backup data retrieved');

                // Validate data structure
                if (!data.produk || !data.nota || !data.pengaturan) {
                    throw new Error('Invalid backup file format');
                }

                // Save to local storage
                localStorage.setItem('produk', JSON.stringify(data.produk));
                localStorage.setItem('nota', JSON.stringify(data.nota));
                localStorage.setItem('pengaturanToko', JSON.stringify(data.pengaturan));
                localStorage.setItem('lastSync', new Date().toISOString());
                
                updateLastSyncTime();
                
                debugLog('Import completed successfully');
                alert('Import completed successfully! Page will reload.');
                setTimeout(() => location.reload(), 1000);
            } catch (error) {
                handleError(error, 'Google Drive import');
            } finally {
                showSpinner(elements.btnGoogleImport, false);
            }
        };

        // Auto sync functions
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
            stopAutoSync(); // Clear any existing timer
            autoSyncTimer = setInterval(async () => {
                if (googleAuth.isSignedIn.get()) {
                    debugLog('Auto sync triggered');
                    await backupData();
                }
            }, syncInterval);
            debugLog(`Auto sync started (interval: ${syncInterval/60000} minutes)`);
        };

        const stopAutoSync = () => {
            if (autoSyncTimer) {
                clearInterval(autoSyncTimer);
                autoSyncTimer = null;
                debugLog('Auto sync stopped');
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

        // Initialize event listeners
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
                elements.autoSyncToggle.addEventListener('change', (e) => {
                    toggleAutoSync(e.target.checked);
                });
            }
        };

        // Public API
        return {
            init: async () => {
                try {
                    debugLog('Initializing GoogleDriveManager');
                    await initGAPI();
                    initEventListeners();
                    checkAutoSync();
                    updateUI();
                    debugLog('Initialization complete');
                } catch (error) {
                    handleError(error, 'GoogleDriveManager initialization');
                }
            }
        };
    })();

    // Initialize the manager
    GoogleDriveManager.init();
});