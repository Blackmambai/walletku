document.addEventListener('DOMContentLoaded', () => {
    // Elemen UI
    const btnGoogleLogin = document.getElementById('btnGoogleLogin');
    const btnGoogleLogout = document.getElementById('btnGoogleLogout');
    const btnGoogleBackup = document.getElementById('btnGoogleBackup');
    const btnGoogleImport = document.getElementById('btnGoogleImport');
    const btnSync = document.getElementById('btnSync');
    const btnSelectiveBackup = document.getElementById('btnSelectiveBackup');
    const userInfoSection = document.getElementById('userInfo');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const lastSyncElement = document.getElementById('lastSync');
    const autoSyncToggle = document.getElementById('autoSyncToggle');
    const spinnerLogin = btnGoogleLogin ? btnGoogleLogin.querySelector('.spinner-border') : null;
    const spinnerLogout = btnGoogleLogout ? btnGoogleLogout.querySelector('.spinner-border') : null;
    const spinnerBackup = btnGoogleBackup ? btnGoogleBackup.querySelector('.spinner-border') : null;
    const spinnerImport = btnGoogleImport ? btnGoogleImport.querySelector('.spinner-border') : null;
    const spinnerSync = btnSync ? btnSync.querySelector('.spinner-border') : null;
    const spinnerSelectiveBackup = btnSelectiveBackup ? btnSelectiveBackup.querySelector('.spinner-border') : null;

    // Konfigurasi Google API
    const clientId = '362387001717-qd55fokbba192mjd97t61b3jslbvqp47.apps.googleusercontent.com'; // Gantilah dengan Client ID Anda
    const apiKey = 'AIzaSyCrnA2v4briyn9mUcRkMTcADdFJNa8CijQ'; // Gantilah dengan API Key Anda
    const scope = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile';
    let googleAuth;
    let googleUser = null;
    let isAutoSyncEnabled = localStorage.getItem('autoSync') === 'true';
    const backupFileName = 'backup_data.json';

    class GoogleDriveManager {
        constructor() {
            this.initializeGAPI();
            this.setupEventListeners();
            this.updateUI();
            this.checkAutoSync();
        }

        async initializeGAPI() {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://apis.google.com/js/api:client.js';
                script.async = true;
                script.defer = true;
                script.onload = async () => {
                    gapi.load('client:auth2', async () => {
                        try {
                            await gapi.client.init({
                                apiKey: apiKey,
                                clientId: clientId,
                                scope: scope,
                            });
                            googleAuth = gapi.auth2.getAuthInstance();
                            console.log('GAPI initialized');
                            this.checkInitialLogin();
                            resolve();
                        } catch (error) {
                            console.error('GAPI init error:', error);
                            reject(error);
                        }
                    });
                };
                script.onerror = (error) => {
                    console.error('Failed to load Google API script:', error);
                    reject(error);
                };
                document.head.appendChild(script);
            });
        }

        async checkInitialLogin() {
            if (googleAuth.isSignedIn.get()) {
                googleUser = googleAuth.currentUser.get();
                this.updateUI();
                this.enableActions();
            } else {
                this.disableActions();
            }
        }

        setupEventListeners() {
            if (btnGoogleLogin) btnGoogleLogin.addEventListener('click', () => this.handleLogin());
            if (btnGoogleLogout) btnGoogleLogout.addEventListener('click', () => this.handleLogout());
            if (btnGoogleBackup) btnGoogleBackup.addEventListener('click', () => this.backupData());
            if (btnGoogleImport) btnGoogleImport.addEventListener('click', () => this.importData());
            if (btnSync) btnSync.addEventListener('click', () => this.syncData());
            if (btnSelectiveBackup) btnSelectiveBackup.addEventListener('click', () => this.selectiveBackup());
            if (autoSyncToggle) autoSyncToggle.addEventListener('change', (e) => this.toggleAutoSync(e.target.checked));
        }

        async handleLogin() {
            try {
                this.showSpinner(spinnerLogin, true, btnGoogleLogin);
                googleUser = await googleAuth.signIn();
                this.updateUI();
                this.enableActions();
                this.showToast('Login berhasil', `Anda login sebagai ${googleUser.getBasicProfile().getName()}`, 'success');
            } catch (error) {
                console.error('Login error:', error);
                this.showAlert('Login Gagal', 'Gagal melakukan login ke Google', 'error');
            } finally {
                this.showSpinner(spinnerLogin, false, btnGoogleLogin);
            }
        }

        async handleLogout() {
            try {
                this.showSpinner(spinnerLogout, true, btnGoogleLogout);
                await googleAuth.signOut();
                googleUser = null;
                this.updateUI();
                this.disableActions();
                this.showToast('Logout berhasil', 'Anda telah logout dari Google', 'info');
            } catch (error) {
                console.error('Logout error:', error);
                this.showAlert('Logout Gagal', 'Gagal melakukan logout', 'error');
            } finally {
                this.showSpinner(spinnerLogout, false, btnGoogleLogout);
            }
        }

        updateUI() {
            const isLoggedIn = googleUser !== null;

            // Tampilkan/menyembunyikan tombol login/logout
            if (btnGoogleLogin) btnGoogleLogin.classList.toggle('d-none', isLoggedIn);
            if (userInfoSection) userInfoSection.classList.toggle('d-none', !isLoggedIn);

            // Update info user jika login
            if (isLoggedIn && googleUser) {
                const profile = googleUser.getBasicProfile();
                if (userAvatar) userAvatar.src = profile.getImageUrl();
                if (userName) userName.textContent = profile.getName();
            }

            // Update status auto sync
            if (autoSyncToggle) autoSyncToggle.checked = isAutoSyncEnabled;

            // Update last sync time
            if (lastSyncElement) {
                const lastSync = localStorage.getItem('lastSync');
                if (lastSync) {
                    lastSyncElement.textContent = `Terakhir sinkron: ${new Date(lastSync).toLocaleString()}`;
                } else {
                    lastSyncElement.textContent = 'Belum pernah sinkronisasi';
                }
            }
        }

        enableActions() {
            if (btnGoogleBackup) btnGoogleBackup.disabled = false;
            if (btnGoogleImport) btnGoogleImport.disabled = false;
            if (btnSync) btnSync.disabled = false;
            if (btnSelectiveBackup) btnSelectiveBackup.disabled = false;
        }

        disableActions() {
            if (btnGoogleBackup) btnGoogleBackup.disabled = true;
            if (btnGoogleImport) btnGoogleImport.disabled = true;
            if (btnSync) btnSync.disabled = true;
            if (btnSelectiveBackup) btnSelectiveBackup.disabled = true;
        }

        showSpinner(spinnerElement, show, button) {
            if (spinnerElement) spinnerElement.classList.toggle('d-none', !show);
            if (button) button.disabled = show;
        }

        async executeWithAuth(callback) {
            try {
                if (!googleUser) {
                    await this.handleLogin();
                }

                // Refresh token jika hampir expired (tidak bisa dilakukan dengan gapi.client.init saja)
                // Cara refresh token lebih kompleks dan biasanya ditangani oleh library atau backend jika diperlukan.
                // Untuk contoh sederhana ini, kita asumsikan token valid selama sesi.

                return await callback(googleUser.getAuthResponse().access_token);
            } catch (error) {
                console.error('Authentication error:', error);
                throw error;
            }
        }

        async getLocalData() {
            // Implementasikan logika untuk mengambil data lokal Anda di sini
            // Contoh:
            const produk = JSON.parse(localStorage.getItem('produk') || '[]');
            const nota = JSON.parse(localStorage.getItem('nota') || '[]');
            const pengaturanToko = JSON.parse(localStorage.getItem('pengaturanToko') || '{}');
            return { produk, nota, pengaturanToko };
        }

        async saveLocalData(data) {
            // Implementasikan logika untuk menyimpan data lokal Anda di sini
            // Contoh:
            localStorage.setItem('produk', JSON.stringify(data.produk || []));
            localStorage.setItem('nota', JSON.stringify(data.nota || []));
            localStorage.setItem('pengaturanToko', JSON.stringify(data.pengaturanToko || {}));
        }

        async uploadFile(data, filename) {
            return await this.executeWithAuth(async (accessToken) => {
                const boundary = '-------314159265358979323846';
                const delimiter = "\r\n--" + boundary + "\r\n";
                const close_delim = "\r\n--" + boundary + "--";
                const contentType = 'application/json';
                const metadata = {
                    'name': filename,
                    'mimeType': contentType
                };

                const multipartRequestBody =
                    delimiter +
                    'Content-Disposition: form-data; name="metadata"\r\n' +
                    'Content-Type: ' + 'application/json; charset=UTF-8' + '\r\n' +
                    '\r\n' +
                    JSON.stringify(metadata) +
                    delimiter +
                    'Content-Disposition: form-data; name="file"\r\n' +
                    'Content-Type: ' + contentType + '\r\n' +
                    '\r\n' +
                    JSON.stringify(data) +
                    close_delim;

                const request = gapi.client.request({
                    'path': '/upload/drive/v3/files',
                    'method': 'POST',
                    'params': {'uploadType': 'multipart'},
                    'headers': {
                        'Content-Type': 'multipart/related; boundary="' + boundary + '"',
                        'Authorization': `Bearer ${accessToken}`
                    },
                    'body': multipartRequestBody
                });
                return request.execute(response => {
                    if (response.error) {
                        console.error('File upload error:', response.error);
                        throw new Error(response.error.message);
                    } else {
                        console.log('File uploaded successfully:', response);
                        return response;
                    }
                });
            });
        }

        async downloadFile() {
            return await this.executeWithAuth(async (accessToken) => {
                // Cari file backup berdasarkan nama
                const fileId = await this.findFile(backupFileName);
                if (!fileId) {
                    this.showAlert('Import Gagal', 'File backup tidak ditemukan di Google Drive.', 'warning');
                    return null;
                }

                const request = gapi.client.request({
                    'path': `/drive/v3/files/${fileId}`,
                    'method': 'GET',
                    'params': {'alt': 'media'},
                    'headers': {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });

                return request.execute(response => {
                    if (response.error) {
                        console.error('File download error:', response.error);
                        this.showAlert('Import Gagal', `Gagal mengunduh file backup: ${response.error.message}`, 'error');
                        return null;
                    } else {
                        try {
                            const data = JSON.parse(response);
                            return data;
                        } catch (e) {
                            console.error('Error parsing downloaded data:', e);
                            this.showAlert('Import Gagal', 'Gagal memproses data backup.', 'error');
                            return null;
                        }
                    }
                });
            });
        }

        async findFile(filename) {
            return await this.executeWithAuth(async (accessToken) => {
                const query = `name='${filename}' and trashed=false`;
                const request = gapi.client.drive.files.list({
                    q: query,
                    spaces: 'drive',
                    fields: 'files(id, name)'
                });
                return request.execute(response => {
                    if (response.error) {
                        console.error('Error finding file:', response.error);
                        return null;
                    } else {
                        const files = response.files;
                        if (files && files.length > 0) {
                            return files[0].id;
                        } else {
                            return null;
                        }
                    }
                });
            });
        }

        async backupData() {
            try {
                this.showSpinner(spinnerBackup, true, btnGoogleBackup);
                const localData = await this.getLocalData();
                const today = new Date();
                const filename = `backup_${today.toISOString().split('T')[0]}.json`;
                await this.uploadFile(localData, filename);
                localStorage.setItem('lastSync', today.toISOString());
                this.showToast('Backup Berhasil', 'Data Anda telah disimpan ke Google Drive', 'success');
                this.updateUI();
            } catch (error) {
                console.error('Backup error:', error);
                this.showAlert('Backup Gagal', `Gagal melakukan backup: ${error.message}`, 'error');
            } finally {
                this.showSpinner(spinnerBackup, false, btnGoogleBackup);
            }
        }

        async importData() {
            try {
                this.showSpinner(spinnerImport, true, btnGoogleImport);
                const backupData = await this.downloadFile();
                if (backupData) {
                    await this.saveLocalData(backupData);
                    localStorage.setItem('lastSync', new Date().toISOString());
                    this.showToast('Import Berhasil', 'Data dari Google Drive telah dipulihkan', 'success');
                    this.updateUI();
                }
            } catch (error) {
                console.error('Import error:', error);
                this.showAlert('Import Gagal', `Gagal melakukan import: ${error.message}`, 'error');
            } finally {
                this.showSpinner(spinnerImport, false, btnGoogleImport);
            }
        }

        async syncData() {
            try {
                this.showSpinner(spinnerSync, true, btnSync);
                const localData = await this.getLocalData();
                const today = new Date();
                const filename = `sync_${today.toISOString().split('T')[0]}.json`;
                await this.uploadFile(localData, filename);
                localStorage.setItem('lastSync', today.toISOString());
                this.showToast('Sinkronisasi Berhasil', 'Data lokal telah disinkronkan ke Google Drive', 'success');
                this.updateUI();
                // Implementasikan juga logika untuk menarik data terbaru dari Drive jika diperlukan sinkronisasi dua arah
            } catch (error) {
                console.error('Sync error:', error);
                this.showAlert('Sinkronisasi Gagal', `Gagal melakukan sinkronisasi: ${error.message}`, 'error');
            } finally {
                this.showSpinner(spinnerSync, false, btnSync);
            }
        }

        async selectiveBackup() {
            try {
                this.showSpinner(spinnerSelectiveBackup, true, btnSelectiveBackup);

                const { value: options } = await Swal.fire({
                    title: 'Pilih Data untuk Backup',
                    input: 'checkbox',
                    inputOptions: {
                        produk: 'Data Produk',
                        nota: 'Data Transaksi',
                        pengaturan: 'Pengaturan Toko'
                    },
                    inputPlaceholder: 'Pilih data yang akan di-backup',
                    showCancelButton: true,
                    confirmButtonText: 'Backup',
                    cancelButtonText: 'Batal',
                    inputValidator: (result) => {
                        return !result || result.length === 0 ? 'Pilih minimal satu data' : null;
                    }
                });

                if (options && options.length > 0) {
                    const localData = await this.getLocalData();
                    const dataToBackup = {};

                    if (options.includes('produk')) dataToBackup.produk = localData.produk;
                    if (options.includes('nota')) dataToBackup.nota = localData.nota;
                    if (options.includes('pengaturan')) dataToBackup.pengaturanToko = localData.pengaturanToko;

                    const today = new Date();
                    const filename = `selective_backup_${today.toISOString().split('T')[0]}.json`;

                    await this.uploadFile(dataToBackup, filename);
                    localStorage.setItem('lastSync', today.toISOString());

                    this.showToast('Backup Selektif Berhasil', 'Data terpilih telah disimpan ke Google Drive', 'success');
                    this.updateUI();
                }
            } catch (error) {
                console.error('Selective backup error:', error);
                this.showAlert('Backup Gagal', `Gagal melakukan backup selektif: ${error.message}`, 'error');
            } finally {
                this.showSpinner(spinnerSelectiveBackup, false, btnSelectiveBackup);
            }
        }

        toggleAutoSync(enabled) {
            isAutoSyncEnabled = enabled;
            localStorage.setItem('autoSync', enabled.toString());

            if (enabled) {
                this.syncData();
                // Atau bisa juga setup interval sync
                // this.setupSyncInterval();
            } else {
                // Hentikan interval sync jika ada
                // clearInterval(this.syncInterval);
            }

            this.showToast(
                'Auto Sync ' + (enabled ? 'Diaktifkan' : 'Dimatikan'),
                `Auto sync telah ${enabled ? 'diaktifkan' : 'dimatikan'}`,
                'info'
            );
        }

        async checkAutoSync() {
            if (isAutoSyncEnabled && googleUser) {
                try {
                    await this.syncData();
                } catch (error) {
                    console.error('Auto sync error:', error);
                }
            }
        }

        showAlert(title, text, icon) {
            return Swal.fire({
                title,
                text,
                icon,
                confirmButtonText: 'OK'
            });
        }

        showToast(title, text, icon) {
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer);
                    toast.addEventListener('mouseleave', Swal.resumeTimer);
                }
            });

            Toast.fire({
                title,
                text,
                icon
            });
        }
    }

    // Inisialisasi
    const driveManager = new GoogleDriveManager();
});