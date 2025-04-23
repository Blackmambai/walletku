// googlebackup.js
document.addEventListener('DOMContentLoaded', () => {
    // Google Drive API configuration
    const CLIENT_ID = '362387001717-qd55fokbba192mjd97t61b3jslbvqp47.apps.googleusercontent.com';
    const API_KEY = 'AIzaSyCrnA2v4briyn9mUcRkMTcADdFJNa8CijQ';
    const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
    const SCOPES = 'https://www.googleapis.com/auth/drive.file';

    // DOM Elements
    const btnGoogleBackup = document.getElementById('btnGoogleBackup');
    const btnGoogleImport = document.getElementById('btnGoogleImport');
    const googleAuthStatus = document.getElementById('googleAuthStatus');
    
    // Track Google API initialization status
    let googleApiInitialized = false;
    let pickerApiLoaded = false;

    // Initialize Google API client
    function initGoogleClient() {
        return new Promise((resolve, reject) => {
            gapi.load('client:auth2', {
                callback: () => {
                    gapi.client.init({
                        apiKey: API_KEY,
                        clientId: CLIENT_ID,
                        discoveryDocs: DISCOVERY_DOCS,
                        scope: SCOPES,
                        // Important for desktop compatibility
                        ux_mode: 'redirect',
                        redirect_uri: window.location.origin
                    }).then(() => {
                        googleApiInitialized = true;
                        // Listen for sign-in state changes
                        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
                        // Handle initial sign-in state
                        updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
                        resolve();
                    }).catch(error => {
                        console.error('Error initializing Google API:', error);
                        showError('Gagal menginisialisasi Google API');
                        reject(error);
                    });
                },
                onerror: () => {
                    const error = new Error('Gagal memuat Google API');
                    console.error(error);
                    showError(error.message);
                    reject(error);
                },
                timeout: 5000 // 5 seconds timeout
            });
        });
    }

    // Load Picker API separately
    function loadPickerApi() {
        return new Promise((resolve, reject) => {
            gapi.load('picker', {
                callback: () => {
                    pickerApiLoaded = true;
                    resolve();
                },
                onerror: () => {
                    const error = new Error('Gagal memuat Google Picker API');
                    console.error(error);
                    showError(error.message);
                    reject(error);
                },
                timeout: 5000 // 5 seconds timeout
            });
        });
    }

    // Update UI based on sign-in status
    function updateSigninStatus(isSignedIn) {
        if (isSignedIn) {
            googleAuthStatus.innerHTML = `
                <span class="text-success">
                    <i class="fas fa-check-circle"></i> Terhubung dengan Google Drive
                </span>
            `;
            if (btnGoogleBackup) btnGoogleBackup.disabled = false;
            if (btnGoogleImport) btnGoogleImport.disabled = false;
        } else {
            googleAuthStatus.innerHTML = `
                <span class="text-danger">
                    <i class="fas fa-times-circle"></i> Tidak terhubung dengan Google Drive
                </span>
            `;
            if (btnGoogleBackup) btnGoogleBackup.disabled = true;
            if (btnGoogleImport) btnGoogleImport.disabled = true;
        }
    }

    // Handle Google Sign-In
    function handleGoogleSignIn() {
        if (!googleApiInitialized) {
            showError('Google API belum diinisialisasi');
            return;
        }
        
        gapi.auth2.getAuthInstance().signIn().then(() => {
            Swal.fire({
                title: 'Berhasil Login',
                text: 'Anda sekarang terhubung dengan Google Drive',
                icon: 'success',
                confirmButtonText: 'OK'
            });
        }).catch(error => {
            console.error('Error signing in:', error);
            showError('Gagal login ke Google: ' + error.error);
        });
    }

    // Handle Google Sign-Out
    function handleGoogleSignOut() {
        if (!googleApiInitialized) {
            showError('Google API belum diinisialisasi');
            return;
        }
        
        gapi.auth2.getAuthInstance().signOut().then(() => {
            Swal.fire({
                title: 'Berhasil Logout',
                text: 'Anda telah keluar dari Google Drive',
                icon: 'success',
                confirmButtonText: 'OK'
            });
        }).catch(error => {
            console.error('Error signing out:', error);
            showError('Gagal logout dari Google');
        });
    }

    // Backup to Google Drive
    async function backupToGoogleDrive() {
        try {
            if (!googleApiInitialized) {
                throw new Error('Google API belum diinisialisasi');
            }
            
            if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
                throw new Error('Anda harus login terlebih dahulu');
            }

            // Show loading indicator
            const swalInstance = Swal.fire({
                title: 'Membuat Backup',
                text: 'Sedang mengupload data ke Google Drive...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Prepare backup data
            const data = {
                produk: JSON.parse(localStorage.getItem('produk') || '[]'),
                nota: JSON.parse(localStorage.getItem('nota') || '[]'),
                pengaturanToko: JSON.parse(localStorage.getItem('pengaturanToko') || '{}'),
                // Add metadata for validation
                _meta: {
                    version: 1,
                    createdAt: new Date().toISOString(),
                    source: 'Aplikasi Toko'
                }
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const metadata = {
                name: `backup_${new Date().toISOString().split('T')[0]}.json`,
                mimeType: 'application/json',
                parents: ['root']
            };

            // Upload file to Google Drive
            const accessToken = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', blob);

            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true', {
                method: 'POST',
                headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
                body: form
            });

            const result = await response.json();

            // Close loading indicator
            await swalInstance.close();

            if (response.ok) {
                Swal.fire({
                    title: 'Backup Berhasil',
                    text: 'Data telah berhasil di-backup ke Google Drive',
                    icon: 'success',
                    confirmButtonText: 'OK'
                });
            } else {
                throw new Error(result.error.message || 'Gagal mengupload ke Google Drive');
            }
        } catch (error) {
            console.error('Backup error:', error);
            showError(`Gagal membuat backup: ${error.message}`);
        }
    }

    // Import from Google Drive
    async function importFromGoogleDrive() {
        try {
            if (!googleApiInitialized || !pickerApiLoaded) {
                throw new Error('Google API belum siap');
            }
            
            if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
                throw new Error('Anda harus login terlebih dahulu');
            }

            // Show file picker
            const pickerResponse = await new Promise((resolve, reject) => {
                try {
                    const picker = new google.picker.PickerBuilder()
                        .addView(new google.picker.DocsView()
                            .setMimeTypes('application/json')
                            .setIncludeFolders(true))
                        .setOAuthToken(gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token)
                        .setDeveloperKey(API_KEY)
                        .setCallback(data => {
                            if (data[google.picker.Response.ACTION] === google.picker.Action.PICKED) {
                                const docs = data[google.picker.Response.DOCUMENTS];
                                resolve(docs[0]);
                            } else if (data[google.picker.Response.ACTION] === google.picker.Action.CANCEL) {
                                reject(new Error('User canceled file selection'));
                            }
                        })
                        .setOrigin(window.location.origin)
                        .build();
                    picker.setVisible(true);
                } catch (error) {
                    reject(error);
                }
            });

            // Show loading indicator
            const swalInstance = Swal.fire({
                title: 'Mengimpor Data',
                text: 'Sedang memproses data dari Google Drive...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Download the selected file
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${pickerResponse.id}?alt=media`, {
                headers: {
                    'Authorization': `Bearer ${gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error.message || 'Gagal mengunduh file');
            }

            const data = await response.json();

            // Validate the imported data
            if (!data.produk || !data.nota || !data.pengaturanToko) {
                throw new Error('Format file tidak valid - data penting tidak ditemukan');
            }

            // Additional validation
            if (!Array.isArray(data.produk) || !Array.isArray(data.nota) || typeof data.pengaturanToko !== 'object') {
                throw new Error('Format data tidak valid');
            }

            // Confirm before overwriting data
            const confirmResult = await Swal.fire({
                title: 'Konfirmasi Import',
                text: 'Ini akan menimpa semua data yang ada. Lanjutkan?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Ya, Import',
                cancelButtonText: 'Batal'
            });

            if (!confirmResult.isConfirmed) {
                await swalInstance.close();
                return;
            }

            // Save to local storage
            localStorage.setItem('produk', JSON.stringify(data.produk));
            localStorage.setItem('nota', JSON.stringify(data.nota));
            localStorage.setItem('pengaturanToko', JSON.stringify(data.pengaturanToko));

            // Close loading indicator
            await swalInstance.close();

            Swal.fire({
                title: 'Import Berhasil',
                text: 'Data berhasil diimpor dari Google Drive! Halaman akan direfresh.',
                icon: 'success',
                confirmButtonText: 'OK'
            }).then(() => location.reload());
        } catch (error) {
            console.error('Import error:', error);
            showError(`Gagal mengimport data: ${error.message}`);
        }
    }

    // Helper function to show error messages
    function showError(message) {
        Swal.fire({
            title: 'Error',
            text: message,
            icon: 'error',
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

    // Initialize Google APIs when the script loads
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = async () => {
        try {
            await initGoogleClient();
            await loadPickerApi();
        } catch (error) {
            console.error('Failed to initialize Google APIs:', error);
            showError('Gagal memuat Google APIs');
        }
    };
    script.onerror = () => {
        showError('Gagal memuat Google API script');
    };
    document.head.appendChild(script);

    // Add Google Sign-In/Out buttons if needed
    const googleAuthContainer = document.getElementById('googleAuthContainer');
    if (googleAuthContainer) {
        googleAuthContainer.innerHTML = `
            <button id="btnGoogleSignIn" class="btn btn-success">
                <i class="fab fa-google"></i> Login Google Drive
            </button>
            <button id="btnGoogleSignOut" class="btn btn-danger">
                <i class="fab fa-google"></i> Logout Google Drive
            </button>
        `;
        
        document.getElementById('btnGoogleSignIn').addEventListener('click', handleGoogleSignIn);
        document.getElementById('btnGoogleSignOut').addEventListener('click', handleGoogleSignOut);
    }
});