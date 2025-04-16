// googledrive.js
document.addEventListener('DOMContentLoaded', () => {
    const btnGoogleBackup = document.getElementById('btnGoogleBackup');
    const btnGoogleImport = document.getElementById('btnGoogleImport');
    const btnSync = document.getElementById('btnSync');
    const clientId = '362387001717-qd55fokbba192mjd97t61b3jslbvqp47.apps.googleusercontent.com';
    const scope = 'https://www.googleapis.com/auth/drive.file';
    let googleUser = null;
    let isAutoSync = false;

    class GoogleDriveManager {
        constructor() {
            this.initializeGAPI();
        }

        async initializeGAPI() {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://apis.google.com/js/platform.js';
                script.onload = () => {
                    gapi.load('auth2', () => {
                        gapi.auth2.init({
                            client_id: clientId,
                            scope: scope
                        }).then(resolve, reject); // Handle init error
                    });
                };
                script.onerror = reject; // Handle script load error
                document.head.appendChild(script);
            });
        }

        async authenticate() {
            if (!gapi.auth2) {
                throw new Error('Google Auth2 belum diinisialisasi.');
            }
            googleUser = await gapi.auth2.getAuthInstance().signIn();
            return googleUser;
        }

        async executeWithAuth(callback) {
            if (!googleUser) {
                try {
                    await this.authenticate();
                } catch (error) {
                    Swal.fire('Error', 'Gagal login ke Google', 'error');
                    throw error; // Re-throw error to be caught by the caller
                }
            }
            return callback(googleUser.getAuthResponse().access_token);
        }

        async getBackupFiles() {
            return this.executeWithAuth(async (accessToken) => {
                const response = await fetch('https://www.googleapis.com/drive/v3/files?q=mimeType="application/json"', {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(`Gagal mendapatkan file backup: ${error.error.message}`);
                }
                return await response.json();
            });
        }

        async downloadFile(fileId) {
            return this.executeWithAuth(async (accessToken) => {
                const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(`Gagal mengunduh file: ${error.error.message}`);
                }
                return await response.json();
            });
        }

        async uploadFile(data, filename) {
            return this.executeWithAuth(async (accessToken) => {
                const metadata = {
                    name: filename,
                    mimeType: 'application/json',
                    parents: ['root']
                };

                const form = new FormData();
                form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
                form.append('file', new Blob([JSON.stringify(data)], { type: 'application/json' }));

                const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: form
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(`Gagal mengunggah file: ${error.error.message}`);
                }
                return await response.json();
            });
        }

        async getLocalData() {
            return {
                produk: JSON.parse(localStorage.getItem('produk') || '[]'),
                nota: JSON.parse(localStorage.getItem('nota') || '[]'),
                pengaturanToko: JSON.parse(localStorage.getItem('pengaturanToko') || '{}'),
                lastSync: localStorage.getItem('lastSync') || null
            };
        }

        async syncData() {
            try {
                const localData = await this.getLocalData();
                const remoteFiles = await this.getBackupFiles();

                if (!remoteFiles || !remoteFiles.files || remoteFiles.files.length === 0) {
                    await this.backupData();
                    return;
                }

                const latestRemote = remoteFiles.files.sort((a, b) =>
                    new Date(b.createdTime) - new Date(a.createdTime))[0];

                const remoteData = await this.downloadFile(latestRemote.id);

                if (!localData.lastSync || new Date(latestRemote.createdTime) > new Date(localData.lastSync)) {
                    // Update local data with remote
                    localStorage.setItem('produk', JSON.stringify(remoteData.produk));
                    localStorage.setItem('nota', JSON.stringify(remoteData.nota));
                    localStorage.setItem('pengaturanToko', JSON.stringify(remoteData.pengaturanToko));
                    localStorage.setItem('lastSync', new Date().toISOString());

                    Swal.fire({
                        title: 'Data Diperbarui',
                        text: 'Data lokal telah disinkronisasi dengan versi terbaru dari Google Drive',
                        icon: 'success'
                    });
                } else {
                    // Update remote with local data
                    await this.backupData();
                }
            } catch (error) {
                console.error('Error during sync:', error);
                Swal.fire('Error', `Gagal melakukan sinkronisasi: ${error.message}`, 'error');
            }
        }

        async backupData() {
            try {
                const localData = await this.getLocalData();
                const today = new Date();
                const filename = `backup_${today.toISOString()}.json`;

                await this.uploadFile(localData, filename);
                localStorage.setItem('lastSync', today.toISOString());

                Swal.fire({
                    title: 'Backup Berhasil',
                    text: 'Data telah disimpan ke Google Drive',
                    icon: 'success'
                });
            } catch (error) {
                console.error('Error during backup:', error);
                Swal.fire('Error', `Gagal melakukan backup: ${error.message}`, 'error');
            }
        }
    }

    const driveManager = new GoogleDriveManager();

    // Handle Backup
    btnGoogleBackup.addEventListener('click', async () => {
        await driveManager.backupData();
    });

    // Handle Import
    btnGoogleImport.addEventListener('click', async () => {
        try {
            const files = await driveManager.getBackupFiles();
            if (!files || !files.files || files.files.length === 0) {
                Swal.fire('Info', 'Tidak ada file backup ditemukan di Google Drive.', 'info');
                return;
            }

            const inputOptions = files.files.reduce((acc, file) => {
                acc[file.id] = file.name;
                return acc;
            }, {});

            const { value: fileId } = await Swal.fire({
                title: 'Pilih Backup',
                input: 'select',
                inputOptions: inputOptions,
                showCancelButton: true
            });

            if (fileId) {
                const remoteData = await driveManager.downloadFile(fileId);

                localStorage.setItem('produk', JSON.stringify(remoteData.produk));
                localStorage.setItem('nota', JSON.stringify(remoteData.nota));
                localStorage.setItem('pengaturanToko', JSON.stringify(remoteData.pengaturanToko));
                localStorage.setItem('lastSync', new Date().toISOString());

                Swal.fire({
                    title: 'Import Berhasil',
                    text: 'Data akan direfresh...',
                    icon: 'success'
                }).then(() => location.reload());
            }
        } catch (error) {
            console.error('Error during import:', error);
            Swal.fire('Error', `Gagal melakukan import: ${error.message}`, 'error');
        }
    });

    // Handle Auto Sync
    btnSync.addEventListener('click', async () => {
        await driveManager.syncData();
    });

    // Auto Sync on Load
    const checkAutoSync = async () => {
        if (localStorage.getItem('autoSync') === 'true') {
            isAutoSync = true;
            try {
                await driveManager.syncData();
            } catch (error) {
                console.error('Auto sync error:', error);
                // Optionally show a notification to the user about auto-sync failure
            }
        }
    };

    checkAutoSync();
});