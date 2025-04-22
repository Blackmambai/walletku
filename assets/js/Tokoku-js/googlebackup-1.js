// googlebackup.js - Updated for Cloudflare Compatibility
document.addEventListener('DOMContentLoaded', () => {
    // Configuration - Replace with your actual values
    const GOOGLE_CLIENT_ID = '362387001717-qd55fokbba192mjd97t61b3jslbvqp47.apps.googleusercontent.com;
    const GOOGLE_API_KEY = 'AIzaSyCrnA2v4briyn9mUcRkMTcADdFJNa8CijQ';
    const APP_BASE_URL = window.location.origin; // Automatically gets current domain

    // DOM Elements
    const btnGoogleAuth = document.getElementById('btnGoogleAuth');
    const btnGoogleBackup = document.getElementById('btnGoogleBackup');
    const btnGoogleRestore = document.getElementById('btnGoogleRestore');
    const authStatus = document.getElementById('googleAuthStatus');
    const backupStatus = document.getElementById('backupStatus');

    // Google API initialization
    let googleAuth;
    let googleUser;

    // Initialize Google API
    function initGoogleAPI() {
        return new Promise((resolve, reject) => {
            gapi.load('client:auth2:picker', {
                callback: () => {
                    gapi.client.init({
                        apiKey: GOOGLE_API_KEY,
                        clientId: GOOGLE_CLIENT_ID,
                        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                        scope: 'https://www.googleapis.com/auth/drive.file',
                        redirect_uri: `${APP_BASE_URL}/auth/google/callback`
                    }).then(() => {
                        googleAuth = gapi.auth2.getAuthInstance();
                        updateAuthUI();
                        resolve();
                    }).catch(err => {
                        console.error('Google API init error:', err);
                        showError('Failed to initialize Google API. Please check console for details.');
                        reject(err);
                    });
                },
                onerror: () => {
                    const err = 'Failed to load Google API script';
                    console.error(err);
                    showError('Failed to load Google API. Check your network connection.');
                    reject(err);
                },
                timeout: 10000 // 10 seconds
            });
        });
    }

    // Update authentication UI
    function updateAuthUI() {
        const isSignedIn = googleAuth.isSignedIn.get();
        
        if (isSignedIn) {
            googleUser = googleAuth.currentUser.get();
            authStatus.innerHTML = `
                <span class="text-success">
                    <i class="fas fa-check-circle"></i> Connected to Google Drive
                    <small class="d-block">(${googleUser.getBasicProfile().getEmail()})</small>
                </span>
            `;
            btnGoogleAuth.innerHTML = '<i class="fab fa-google"></i> Sign Out';
            btnGoogleBackup.disabled = false;
            btnGoogleRestore.disabled = false;
        } else {
            authStatus.innerHTML = `
                <span class="text-danger">
                    <i class="fas fa-times-circle"></i> Not connected to Google Drive
                </span>
            `;
            btnGoogleAuth.innerHTML = '<i class="fab fa-google"></i> Sign In with Google';
            btnGoogleBackup.disabled = true;
            btnGoogleRestore.disabled = true;
        }
    }

    // Handle authentication
    async function handleAuth() {
        try {
            if (!googleAuth) {
                await initGoogleAPI();
            }

            if (googleAuth.isSignedIn.get()) {
                await googleAuth.signOut();
                showSuccess('Successfully signed out from Google Drive');
            } else {
                await googleAuth.signIn();
                showSuccess('Successfully signed in to Google Drive');
            }
            updateAuthUI();
        } catch (error) {
            console.error('Authentication error:', error);
            showError(`Authentication failed: ${error.error || error.message}`);
        }
    }

    // Create backup to Google Drive
    async function createBackup() {
        try {
            if (!googleUser) {
                throw new Error('Not authenticated with Google');
            }

            showLoading('Creating backup...');

            // Prepare backup data
            const backupData = {
                timestamp: new Date().toISOString(),
                products: JSON.parse(localStorage.getItem('produk') || '[]'),
                transactions: JSON.parse(localStorage.getItem('nota') || '[]'),
                settings: JSON.parse(localStorage.getItem('pengaturanToko') || '{}')
            };

            const filename = `backup_${new Date().toISOString().split('T')[0]}.json`;
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const metadata = {
                name: filename,
                mimeType: 'application/json',
                parents: ['root']
            };

            // Upload to Google Drive
            const accessToken = googleUser.getAuthResponse().access_token;
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', blob);

            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: new Headers({
                    'Authorization': `Bearer ${accessToken}`
                }),
                body: form
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Failed to upload backup');
            }

            const result = await response.json();
            showSuccess(`Backup created successfully! File ID: ${result.id}`);
            backupStatus.innerHTML = `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle"></i> Last backup: ${new Date().toLocaleString()}
                    <br><small>File: ${filename}</small>
                </div>
            `;
        } catch (error) {
            console.error('Backup error:', error);
            showError(`Backup failed: ${error.message}`);
        }
    }

    // Restore from Google Drive
    async function restoreBackup() {
        try {
            if (!googleUser) {
                throw new Error('Not authenticated with Google');
            }

            // Create file picker
            const picker = new google.picker.PickerBuilder()
                .addView(new google.picker.DocsView()
                    .setMimeTypes('application/json')
                    .setQuery('backup_')
                )
                .setOAuthToken(googleUser.getAuthResponse().access_token)
                .setDeveloperKey(GOOGLE_API_KEY)
                .setCallback(pickerCallback)
                .setOrigin(APP_BASE_URL)
                .build();

            picker.setVisible(true);

            async function pickerCallback(data) {
                if (data.action !== google.picker.Action.PICKED) return;

                const fileId = data.docs[0].id;
                showLoading('Restoring backup...');

                try {
                    // Download the file
                    const response = await gapi.client.drive.files.get({
                        fileId: fileId,
                        alt: 'media'
                    });

                    const backupData = response.result;

                    // Validate backup
                    if (!backupData.products || !backupData.transactions || !backupData.settings) {
                        throw new Error('Invalid backup file format');
                    }

                    // Confirm restore
                    const isConfirmed = await Swal.fire({
                        title: 'Confirm Restore',
                        text: 'This will overwrite all current data. Continue?',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Restore',
                        cancelButtonText: 'Cancel'
                    });

                    if (!isConfirmed.isConfirmed) return;

                    // Restore data
                    localStorage.setItem('produk', JSON.stringify(backupData.products));
                    localStorage.setItem('nota', JSON.stringify(backupData.transactions));
                    localStorage.setItem('pengaturanToko', JSON.stringify(backupData.settings));

                    showSuccess('Data restored successfully! Page will reload...');
                    setTimeout(() => location.reload(), 2000);
                } catch (error) {
                    console.error('Restore error:', error);
                    showError(`Restore failed: ${error.message}`);
                }
            }
        } catch (error) {
            console.error('Picker error:', error);
            showError(`Failed to open file picker: ${error.message}`);
        }
    }

    // Helper functions
    function showLoading(message) {
        Swal.fire({
            title: message,
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
    }

    function showSuccess(message) {
        Swal.fire({
            icon: 'success',
            title: 'Success',
            text: message,
            timer: 3000
        });
    }

    function showError(message) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: message
        });
    }

    // Event listeners
    if (btnGoogleAuth) {
        btnGoogleAuth.addEventListener('click', handleAuth);
    }

    if (btnGoogleBackup) {
        btnGoogleBackup.addEventListener('click', createBackup);
    }

    if (btnGoogleRestore) {
        btnGoogleRestore.addEventListener('click', restoreBackup);
    }

    // Load Google API script
    function loadGoogleAPI() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.async = true;
            script.defer = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Initialize
    async function initialize() {
        try {
            await loadGoogleAPI();
            await initGoogleAPI();
            
            // Check for recent backups
            checkRecentBackups();
        } catch (error) {
            console.error('Initialization error:', error);
            authStatus.innerHTML = `
                <span class="text-danger">
                    <i class="fas fa-exclamation-triangle"></i> Failed to load Google API
                    <small class="d-block">${error.message}</small>
                </span>
            `;
        }
    }

    // Check for recent backups
    async function checkRecentBackups() {
        if (!googleUser) return;

        try {
            const response = await gapi.client.drive.files.list({
                q: "name contains 'backup_' and mimeType='application/json'",
                orderBy: 'modifiedTime desc',
                pageSize: 1,
                fields: 'files(id,name,modifiedTime)'
            });

            const files = response.result.files;
            if (files && files.length > 0) {
                const lastBackup = new Date(files[0].modifiedTime);
                backupStatus.innerHTML = `
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle"></i> Last backup found: ${lastBackup.toLocaleString()}
                        <br><small>File: ${files[0].name}</small>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error checking backups:', error);
        }
    }

    // Start the application
    initialize();
});