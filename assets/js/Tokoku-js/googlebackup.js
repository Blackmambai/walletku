// googlebackup.js - Enhanced Google Drive Backup Solution
document.addEventListener('DOMContentLoaded', () => {
    // Configuration - Should be loaded from environment variables in production
    const CONFIG = {
        GOOGLE_API_KEY: 'AIzaSyD2zZyhZPSRAr9JjNKJiRuIqL84Wk1hXZs', // Replace with your API key
        GOOGLE_CLIENT_ID: '362387001717-qd55fokbba192mjd97t61b3jslbvqp47.apps.googleusercontent.com', // Replace with your client ID
        DISCOVERY_DOCS: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
        SCOPES: 'https://www.googleapis.com/auth/drive.file',
        BACKUP_FOLDER_NAME: 'AplikasiKasir_Backups',
        BACKUP_FILE_PREFIX: 'backup_kasir_'
    };

    // DOM Elements
    const btnGoogleBackup = document.getElementById('btnGoogleBackup');
    const btnGoogleImport = document.getElementById('btnGoogleImport');
    const btnGoogleSignIn = document.getElementById('btnGoogleSignIn');
    const btnGoogleSignOut = document.getElementById('btnGoogleSignOut');
    const googleAuthStatus = document.getElementById('googleAuthStatus');
    const backupStatus = document.getElementById('backupStatus');
    const backupHistory = document.getElementById('backupHistory');

    // State variables
    let backupFolderId = null;
    let isInitialized = false;

    // Initialize Google API client
    async function initGoogleClient() {
        try {
            // Load the Google API client library
            await new Promise((resolve, reject) => {
                gapi.load('client:auth2:picker', {
                    callback: resolve,
                    onerror: reject,
                    timeout: 5000,
                    ontimeout: reject
                });
            });

            // Initialize the client with API key and client ID
            await gapi.client.init({
                apiKey: CONFIG.GOOGLE_API_KEY,
                clientId: CONFIG.GOOGLE_CLIENT_ID,
                discoveryDocs: CONFIG.DISCOVERY_DOCS,
                scope: CONFIG.SCOPES
            });

            // Listen for sign-in state changes
            gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
            
            // Handle initial sign-in state
            updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
            
            isInitialized = true;
            console.log('Google API initialized successfully');
            
            // Initialize backup folder
            if (gapi.auth2.getAuthInstance().isSignedIn.get()) {
                await initializeBackupFolder();
            }
            
        } catch (error) {
            console.error('Error initializing Google API:', error);
            showError('Gagal menginisialisasi Google API. Silakan refresh halaman dan coba lagi.');
            isInitialized = false;
        }
    }

    // Initialize the backup folder (create if not exists)
    async function initializeBackupFolder() {
        try {
            const response = await gapi.client.drive.files.list({
                q: `name='${CONFIG.BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                fields: 'files(id, name)',
                spaces: 'drive'
            });

            if (response.result.files && response.result.files.length > 0) {
                backupFolderId = response.result.files[0].id;
                console.log('Using existing backup folder:', backupFolderId);
            } else {
                // Create new folder if not exists
                const folderMetadata = {
                    name: CONFIG.BACKUP_FOLDER_NAME,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: ['root']
                };

                const createResponse = await gapi.client.drive.files.create({
                    resource: folderMetadata,
                    fields: 'id'
                });

                backupFolderId = createResponse.result.id;
                console.log('Created new backup folder:', backupFolderId);
            }
            
            // Load backup history
            await loadBackupHistory();
            
        } catch (error) {
            console.error('Error initializing backup folder:', error);
            throw new Error('Gagal mempersiapkan folder backup');
        }
    }

    // Update UI based on sign-in status
    function updateSigninStatus(isSignedIn) {
        if (isSignedIn) {
            googleAuthStatus.innerHTML = `
                <span class="text-success">
                    <i class="fas fa-check-circle"></i> Terhubung dengan Google Drive
                </span>
            `;
            if (btnGoogleSignIn) btnGoogleSignIn.style.display = 'none';
            if (btnGoogleSignOut) btnGoogleSignOut.style.display = 'inline-block';
            if (btnGoogleBackup) btnGoogleBackup.disabled = false;
            if (btnGoogleImport) btnGoogleImport.disabled = false;
            
            // Initialize backup folder
            initializeBackupFolder().catch(error => {
                console.error('Backup folder initialization error:', error);
            });
        } else {
            googleAuthStatus.innerHTML = `
                <span class="text-danger">
                    <i class="fas fa-times-circle"></i> Tidak terhubung dengan Google Drive
                </span>
            `;
            if (btnGoogleSignIn) btnGoogleSignIn.style.display = 'inline-block';
            if (btnGoogleSignOut) btnGoogleSignOut.style.display = 'none';
            if (btnGoogleBackup) btnGoogleBackup.disabled = true;
            if (btnGoogleImport) btnGoogleImport.disabled = true;
            backupFolderId = null;
        }
    }

    // Handle Google Sign-In
    async function handleGoogleSignIn() {
        if (!isInitialized) {
            await showInfo('Sedang mempersiapkan koneksi...');
            await initGoogleClient();
        }

        try {
            await gapi.auth2.getAuthInstance().signIn();
            await showSuccess('Berhasil login ke Google Drive');
            await initializeBackupFolder();
        } catch (error) {
            console.error('Error signing in:', error);
            if (error.error === 'popup_closed_by_user') {
                showWarning('Login dibatalkan oleh pengguna');
            } else {
                showError('Gagal login ke Google: ' + (error.error || error.message));
            }
        }
    }

    // Handle Google Sign-Out
    async function handleGoogleSignOut() {
        try {
            await gapi.auth2.getAuthInstance().signOut();
            await showSuccess('Berhasil logout dari Google Drive');
        } catch (error) {
            console.error('Error signing out:', error);
            showError('Gagal logout dari Google');
        }
    }

    // Backup to Google Drive
    async function backupToGoogleDrive() {
        if (!isInitialized || !backupFolderId) {
            await showError('Google Drive belum siap. Silakan login terlebih dahulu.');
            return;
        }

        const swalInstance = Swal.fire({
            title: 'Membuat Backup',
            html: 'Sedang mempersiapkan data...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            // Prepare backup data
            const data = {
                produk: JSON.parse(localStorage.getItem('produk') || [],
                nota: JSON.parse(localStorage.getItem('nota') || [],
                pengaturanToko: JSON.parse(localStorage.getItem('pengaturanToko') || {},
                metadata: {
                    appVersion: '1.0',
                    backupDate: new Date().toISOString(),
                    dataSize: 0 // Will be calculated below
                }
            };

            // Calculate data size
            const dataString = JSON.stringify(data);
            data.metadata.dataSize = new Blob([dataString]).size;

            // Format filename with timestamp
            const now = new Date();
            const timestamp = now.toISOString().replace(/[:.]/g, '-');
            const filename = `${CONFIG.BACKUP_FILE_PREFIX}${timestamp}.json`;

            // Create file metadata
            const fileMetadata = {
                name: filename,
                mimeType: 'application/json',
                parents: [backupFolderId],
                description: 'Backup data dari Aplikasi Kasir',
                appProperties: {
                    app: 'AplikasiKasir',
                    version: '1.0',
                    type: 'full-backup'
                }
            };

            // Create form data for multipart upload
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
            form.append('file', new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));

            // Get access token
            const accessToken = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;

            // Upload file
            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: new Headers({ 
                    'Authorization': 'Bearer ' + accessToken,
                    'X-Upload-Content-Type': 'application/json'
                }),
                body: form
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Gagal mengupload ke Google Drive');
            }

            const result = await response.json();
            console.log('Backup successful:', result);

            await swalInstance.close();
            await showSuccess(`Backup berhasil disimpan sebagai ${filename}`);
            
            // Update backup history
            await loadBackupHistory();

        } catch (error) {
            console.error('Backup error:', error);
            await swalInstance.close();
            await showError(`Gagal membuat backup: ${error.message}`);
        }
    }

    // Import from Google Drive
    async function importFromGoogleDrive() {
        if (!isInitialized || !backupFolderId) {
            await showError('Google Drive belum siap. Silakan login terlebih dahulu.');
            return;
        }

        try {
            // Show file picker
            const picker = await createFilePicker();
            const file = await picker.pick();

            if (file.action === google.picker.Action.PICKED) {
                const fileId = file.docs[0].id;
                await processFileImport(fileId);
            }
        } catch (error) {
            console.error('Import error:', error);
            if (error !== 'picker_canceled') {
                await showError(`Gagal mengimport data: ${error.message}`);
            }
        }
    }

    // Create Google Picker instance
    function createFilePicker() {
        return new Promise((resolve) => {
            const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
                .setMimeTypes('application/json')
                .setParent(backupFolderId)
                .setQuery(`${CONFIG.BACKUP_FILE_PREFIX}`);

            const picker = new google.picker.PickerBuilder()
                .addView(view)
                .setOAuthToken(gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token)
                .setDeveloperKey(CONFIG.GOOGLE_API_KEY)
                .setCallback((data) => {
                    if (data.action === google.picker.Action.PICKED) {
                        resolve(data);
                    } else if (data.action === google.picker.Action.CANCEL) {
                        resolve({ action: 'cancel' });
                        throw 'picker_canceled';
                    }
                })
                .setTitle('Pilih File Backup')
                .setOrigin(window.location.origin)
                .build();

            picker.setVisible(true);
            resolve(picker);
        });
    }

    // Process the selected file for import
    async function processFileImport(fileId) {
        const swalInstance = Swal.fire({
            title: 'Mengimpor Data',
            html: 'Sedang memproses file backup...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            // Get file metadata first
            const fileResponse = await gapi.client.drive.files.get({
                fileId: fileId,
                fields: 'name,modifiedTime,size'
            });

            const fileName = fileResponse.result.name;
            const fileSize = fileResponse.result.size;
            const modifiedTime = fileResponse.result.modifiedTime;

            // Confirm with user
            const confirmation = await Swal.fire({
                title: 'Konfirmasi Import',
                html: `Anda akan mengimpor file:<br>
                       <strong>${fileName}</strong><br>
                       Ukuran: ${formatFileSize(fileSize)}<br>
                       Tanggal: ${new Date(modifiedTime).toLocaleString()}<br><br>
                       Data saat ini akan diganti dengan data dari backup ini.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Ya, Import Data',
                cancelButtonText: 'Batal',
                reverseButtons: true
            });

            if (!confirmation.isConfirmed) {
                await swalInstance.close();
                return;
            }

            // Download file content
            const contentResponse = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
            });

            const data = contentResponse.result;

            // Validate backup data
            if (!data.produk || !data.nota || !data.pengaturanToko) {
                throw new Error('Format file backup tidak valid');
            }

            // Save to local storage
            localStorage.setItem('produk', JSON.stringify(data.produk));
            localStorage.setItem('nota', JSON.stringify(data.nota));
            localStorage.setItem('pengaturanToko', JSON.stringify(data.pengaturanToko));

            await swalInstance.close();
            
            const result = await Swal.fire({
                title: 'Import Berhasil',
                html: `Data berhasil diimpor dari file:<br><strong>${fileName}</strong><br><br>
                      Halaman akan direfresh untuk menerapkan perubahan.`,
                icon: 'success',
                confirmButtonText: 'OK'
            });

            if (result.isConfirmed) {
                location.reload();
            }

        } catch (error) {
            console.error('Import processing error:', error);
            await swalInstance.close();
            await showError(`Gagal memproses file backup: ${error.message}`);
        }
    }

    // Load backup history
    async function loadBackupHistory() {
        if (!isInitialized || !backupFolderId) return;

        try {
            const response = await gapi.client.drive.files.list({
                q: `'${backupFolderId}' in parents and name contains '${CONFIG.BACKUP_FILE_PREFIX}' and trashed=false`,
                fields: 'files(id, name, modifiedTime, size)',
                orderBy: 'modifiedTime desc',
                pageSize: 10
            });

            if (response.result.files && response.result.files.length > 0) {
                const historyItems = response.result.files.map(file => `
                    <div class="backup-item">
                        <div class="backup-name">${file.name}</div>
                        <div class="backup-details">
                            <span>${formatFileSize(file.size)}</span>
                            <span>${new Date(file.modifiedTime).toLocaleString()}</span>
                        </div>
                        <button class="btn btn-sm btn-outline-primary restore-btn" data-fileid="${file.id}">
                            <i class="fas fa-download"></i> Restore
                        </button>
                    </div>
                `).join('');

                if (backupHistory) {
                    backupHistory.innerHTML = historyItems || '<p>Tidak ada backup tersedia</p>';
                    
                    // Add event listeners to restore buttons
                    document.querySelectorAll('.restore-btn').forEach(btn => {
                        btn.addEventListener('click', async (e) => {
                            const fileId = e.currentTarget.dataset.fileid;
                            await processFileImport(fileId);
                        });
                    });
                }
            } else {
                if (backupHistory) {
                    backupHistory.innerHTML = '<p>Tidak ada backup tersedia</p>';
                }
            }
        } catch (error) {
            console.error('Error loading backup history:', error);
            if (backupHistory) {
                backupHistory.innerHTML = '<p class="text-danger">Gagal memuat riwayat backup</p>';
            }
        }
    }

    // Helper function to format file size
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Helper functions for showing notifications
    async function showSuccess(message) {
        await Swal.fire({
            title: 'Berhasil',
            text: message,
            icon: 'success',
            confirmButtonText: 'OK'
        });
    }

    async function showError(message) {
        await Swal.fire({
            title: 'Error',
            text: message,
            icon: 'error',
            confirmButtonText: 'OK'
        });
    }

    async function showInfo(message) {
        await Swal.fire({
            title: 'Info',
            text: message,
            icon: 'info',
            confirmButtonText: 'OK'
        });
    }

    async function showWarning(message) {
        await Swal.fire({
            title: 'Peringatan',
            text: message,
            icon: 'warning',
            confirmButtonText: 'OK'
        });
    }

    // Event Listeners
    if (btnGoogleBackup) {
        btnGoogleBackup.addEventListener('click', backupToGoogleDrive);
    }

    if (btnGoogleImport) {
        btnGoogleImport.addEventListener('click', importFromGoogleDrive);
    }

    if (btnGoogleSignIn) {
        btnGoogleSignIn.addEventListener('click', handleGoogleSignIn);
    }

    if (btnGoogleSignOut) {
        btnGoogleSignOut.addEventListener('click', handleGoogleSignOut);
    }

    // Initialize Google API when the script loads
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
        initGoogleClient().catch(error => {
            console.error('Failed to initialize Google API:', error);
            showError('Gagal memuat Google API. Silakan refresh halaman.');
        });
    };
    script.onerror = () => {
        showError('Gagal memuat Google API. Periksa koneksi internet Anda.');
    };
    document.head.appendChild(script);
});