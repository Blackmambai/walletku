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
                        }).then(() => {
                            console.log('GAPI Auth2 initialized.');
                            resolve();
                        }, (error) => {
                            console.error('Error initializing GAPI Auth2:', error);
                            reject(error);
                        });
                    });
                };
                script.onerror = (error) => {
                    console.error('Error loading Google Platform script:', error);
                    reject(error);
                };
                document.head.appendChild(script);
            });
        }

        async authenticate() {
            if (!gapi.auth2) {
                const error = new Error('Google Auth2 belum diinisialisasi.');
                console.error('Authentication error:', error);
                throw error;
            }
            try {
                googleUser = await gapi.auth2.getAuthInstance().signIn();
                console.log('Authentication successful:', googleUser);
                return googleUser;
            } catch (error) {
                console.error('Error during sign in:', error);
                Swal.fire('Error', 'Gagal login ke Google', 'error');
                throw error;
            }
        }

        async executeWithAuth(callback) {
            try {
                if (!googleUser) {
                    await this.authenticate();
                }
                return await callback(googleUser.getAuthResponse().access_token);
            } catch (error) {
                console.error('Error in executeWithAuth:', error);
                throw error;
            }
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
                    console.error('Error getting backup files:', error);
                    throw new Error(`Gagal mendapatkan file backup: ${error.error.message}`);
                }
                const data = await response.json();
                console.log('Backup files retrieved:', data);
                return data;
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
                    console.error(`Error downloading file ${fileId}:`, error);
                    throw new Error(`Gagal mengunduh file: ${error.error.message}`);
                }
                const data = await response.json();
                console.log(`File ${fileId} downloaded:`, data);
                return data;
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
                    console.error(`Error uploading file ${filename}:`, error);
                    throw new Error(`Gagal mengunggah file: ${error.error.message}`);
                }
                const responseData = await response.json();
                console.log(`File ${filename} uploaded:`, responseData);
                return responseData;
            });
        }

        async getLocalData() {
            const localData = {
                produk: JSON.parse(localStorage.getItem('produk') || '[]'),
                nota: JSON.parse(localStorage.getItem('nota') || '[]'),
                pengaturanToko: JSON.parse(localStorage.getItem('pengaturanToko') || '{}'),
                lastSync: localStorage.getItem('lastSync') || null
            };
            console.log('Local data retrieved:', localData);
            return localData;
        }

        async syncData() {
            try {
                const localData = await this.getLocalData();
                const remoteFiles = await this.getBackupFiles();

                if (!remoteFiles || !remoteFiles.files || remoteFiles.files.length === 0) {
                    console.log('No remote backup files found, initiating backup.');
                    await this.backupData();
                    return;
                }

                const latestRemote = remoteFiles.files.sort((a, b) =>
                    new Date(b.createdTime) - new Date(a.createdTime))[0];
                console.log('Latest remote backup:', latestRemote);

                const remoteData = await this.downloadFile(latestRemote.id);

                if (!localData.lastSync || new Date(latestRemote.createdTime) > new Date(localData.lastSync)) {
                    // Update local data with remote
                    localStorage.setItem('produk', JSON.stringify(remoteData.produk));
                    localStorage.setItem('nota', JSON.stringify(remoteData.nota));
                    localStorage.setItem('pengaturanToko', JSON.stringify(remoteData.pengaturanToko));
                    localStorage.setItem('lastSync', new Date().toISOString());
                    console.log('Local data updated from remote.');

                    Swal.fire({
                        title: 'Data Diperbarui',
                        text: 'Data lokal telah disinkronisasi dengan versi terbaru dari Google Drive',
                        icon: 'success'
                    });
                } else {
                    // Update remote with local data
                    console.log('Local data is up to date or newer, initiating backup.');
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
                console.log('Backup successful. Last sync updated.');

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
                console.log('Data imported successfully.');

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