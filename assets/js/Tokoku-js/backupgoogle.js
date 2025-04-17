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

    // Konfigurasi Google API
    const clientId = '362387001717-qd55fokbba192mjd97t61b3jslbvqp47.apps.googleusercontent.com';
    const scope = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile';
    let googleUser = null;
    let isAutoSyncEnabled = localStorage.getItem('autoSync') === 'true';

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
                script.src = 'https://apis.google.com/js/platform.js';
                script.async = true;
                script.defer = true;
                script.onload = () => {
                    gapi.load('auth2', () => {
                        gapi.auth2.init({
                            client_id: clientId,
                            scope: scope
                        }).then(() => {
                            console.log('GAPI initialized');
                            this.checkInitialLogin();
                            resolve();
                        }).catch(error => {
                            console.error('GAPI init error:', error);
                            reject(error);
                        });
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
            const authInstance = gapi.auth2.getAuthInstance();
            if (authInstance.isSignedIn.get()) {
                googleUser = authInstance.currentUser.get();
                this.updateUI();
                this.enableActions();
            } else {
                this.disableActions();
            }
        }

        setupEventListeners() {
            btnGoogleLogin.addEventListener('click', () => this.handleLogin());
            btnGoogleLogout.addEventListener('click', () => this.handleLogout());
            btnGoogleBackup.addEventListener('click', () => this.backupData());
            btnGoogleImport.addEventListener('click', () => this.importData());
            btnSync.addEventListener('click', () => this.syncData());
            btnSelectiveBackup.addEventListener('click', () => this.selectiveBackup());
            autoSyncToggle.addEventListener('change', (e) => this.toggleAutoSync(e.target.checked));
        }

        async handleLogin() {
            try {
                this.showSpinner(btnGoogleLogin, true);
                googleUser = await gapi.auth2.getAuthInstance().signIn();
                this.updateUI();
                this.enableActions();
                this.showToast('Login berhasil', `Anda login sebagai ${googleUser.getBasicProfile().getName()}`, 'success');
            } catch (error) {
                console.error('Login error:', error);
                this.showAlert('Login Gagal', 'Gagal melakukan login ke Google', 'error');
            } finally {
                this.showSpinner(btnGoogleLogin, false);
            }
        }

        async handleLogout() {
            try {
                this.showSpinner(btnGoogleLogout, true);
                await gapi.auth2.getAuthInstance().signOut();
                googleUser = null;
                this.updateUI();
                this.disableActions();
                this.showToast('Logout berhasil', 'Anda telah logout dari Google', 'info');
            } catch (error) {
                console.error('Logout error:', error);
                this.showAlert('Logout Gagal', 'Gagal melakukan logout', 'error');
            } finally {
                this.showSpinner(btnGoogleLogout, false);
            }
        }

        updateUI() {
            const isLoggedIn = googleUser !== null;
            
            // Tampilkan/menyembunyikan tombol login/logout
            btnGoogleLogin.classList.toggle('d-none', isLoggedIn);
            userInfoSection.classList.toggle('d-none', !isLoggedIn);
            
            // Update info user jika login
            if (isLoggedIn) {
                const profile = googleUser.getBasicProfile();
                userAvatar.src = profile.getImageUrl();
                userName.textContent = profile.getName();
            }
            
            // Update status auto sync
            autoSyncToggle.checked = isAutoSyncEnabled;
            
            // Update last sync time
            const lastSync = localStorage.getItem('lastSync');
            if (lastSync) {
                lastSyncElement.textContent = `Terakhir sinkron: ${new Date(lastSync).toLocaleString()}`;
            } else {
                lastSyncElement.textContent = 'Belum pernah sinkronisasi';
            }
        }

        enableActions() {
            btnGoogleBackup.disabled = false;
            btnGoogleImport.disabled = false;
            btnSync.disabled = false;
            btnSelectiveBackup.disabled = false;
        }

        disableActions() {
            btnGoogleBackup.disabled = true;
            btnGoogleImport.disabled = true;
            btnSync.disabled = true;
            btnSelectiveBackup.disabled = true;
        }

        showSpinner(button, show) {
            const spinner = button.querySelector('.spinner-border');
            spinner.classList.toggle('d-none', !show);
            button.disabled = show;
        }

        async executeWithAuth(callback) {
            try {
                if (!googleUser) {
                    await this.handleLogin();
                }
                
                // Refresh token jika hampir expired
                const authResponse = googleUser.getAuthResponse();
                if (authResponse.expires_in < 300) { // 5 menit sebelum expired
                    await googleUser.reloadAuthResponse();
                }
                
                return await callback(googleUser.getAuthResponse().access_token);
            } catch (error) {
                console.error('Authentication error:', error);
                throw error;
            }
        }

        // ... (Tambahkan semua method lainnya seperti backupData, importData, syncData, dll)
        // dari implementasi sebelumnya di sini...

        async selectiveBackup() {
            try {
                this.showSpinner(btnSelectiveBackup, true);
                
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
                this.showSpinner(btnSelectiveBackup, false);
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