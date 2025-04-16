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
            await new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://apis.google.com/js/platform.js';
                script.onload = () => {
                    gapi.load('auth2', () => {
                        gapi.auth2.init({
                            client_id: clientId,
                            scope: scope
                        }).then(resolve);
                    });
                };
                document.head.appendChild(script);
            });
        }

        async authenticate() {
            googleUser = await gapi.auth2.getAuthInstance().signIn();
            return googleUser;
        }

        async getBackupFiles() {
            const response = await fetch('https://www.googleapis.com/drive/v3/files?q=mimeType="application/json"', {
                headers: {
                    'Authorization': `Bearer ${googleUser.getAuthResponse().access_token}`
                }
            });
            return await response.json();
        }

        async downloadFile(fileId) {
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                headers: {
                    'Authorization': `Bearer ${googleUser.getAuthResponse().access_token}`
                }
            });
            return await response.json();
        }

        async uploadFile(data, filename) {
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
                    'Authorization': `Bearer ${googleUser.getAuthResponse().access_token}`
                },
                body: form
            });

            return await response.json();
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
            const localData = await this.getLocalData();
            const remoteFiles = await this.getBackupFiles();
            
            if(remoteFiles.files.length === 0) {
                await this.backupData();
                return;
            }

            const latestRemote = remoteFiles.files.sort((a, b) => 
                new Date(b.createdTime) - new Date(a.createdTime))[0];
            
            const remoteData = await this.downloadFile(latestRemote.id);
            
            if(!localData.lastSync || new Date(latestRemote.createdTime) > new Date(localData.lastSync)) {
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
        }

        async backupData() {
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
        }
    }

    const driveManager = new GoogleDriveManager();

    // Handle Backup
    btnGoogleBackup.addEventListener('click', async () => {
        if (!googleUser) {
            try {
                await driveManager.authenticate();
            } catch (error) {
                Swal.fire('Error', 'Gagal login ke Google', 'error');
                return;
            }
        }
        
        await driveManager.backupData();
    });

    // Handle Import
    btnGoogleImport.addEventListener('click', async () => {
        if (!googleUser) {
            try {
                await driveManager.authenticate();
            } catch (error) {
                Swal.fire('Error', 'Gagal login ke Google', 'error');
                return;
            }
        }

        const { value: fileId } = await Swal.fire({
            title: 'Pilih Backup',
            input: 'select',
            inputOptions: (await driveManager.getBackupFiles()).files.reduce((acc, file) => {
                acc[file.id] = file.name;
                return acc;
            }, {}),
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
    });

    // Handle Auto Sync
    btnSync.addEventListener('click', async () => {
        if (!googleUser) {
            try {
                await driveManager.authenticate();
            } catch (error) {
                Swal.fire('Error', 'Gagal login ke Google', 'error');
                return;
            }
        }
        
        await driveManager.syncData();
    });

    // Auto Sync on Load
    const checkAutoSync = async () => {
        if (localStorage.getItem('autoSync') === 'true') {
            isAutoSync = true;
            try {
                await driveManager.authenticate();
                await driveManager.syncData();
            } catch (error) {
                console.error('Auto sync error:', error);
            }
        }
    };
    
    checkAutoSync();
});