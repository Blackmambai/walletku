// googlebackup.js
document.addEventListener('DOMContentLoaded', () => {
    // Google Drive API configuration
    const CLIENT_ID = '362387001717-qd55fokbba192mjd97t61b3jslbvqp47.apps.googleusercontent.com'; // Replace with your actual client ID
    const API_KEY = 'AIzaSyCrnA2v4briyn9mUcRkMTcADdFJNa8CijQ'; // Replace with your actual API key
    const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
    const SCOPES = 'https://www.googleapis.com/auth/drive.file';

    // DOM Elements
    const btnGoogleBackup = document.getElementById('btnGoogleBackup');
    const btnGoogleImport = document.getElementById('btnGoogleImport');
    const googleAuthStatus = document.getElementById('googleAuthStatus');
    
    // Initialize Google API client
    function initGoogleClient() {
        gapi.load('client:auth2', () => {
            gapi.client.init({
                apiKey: API_KEY,
                clientId: CLIENT_ID,
                discoveryDocs: DISCOVERY_DOCS,
                scope: SCOPES
            }).then(() => {
                // Listen for sign-in state changes
                gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
                // Handle initial sign-in state
                updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
            }).catch(error => {
                console.error('Error initializing Google API:', error);
                showError('Gagal menginisialisasi Google API');
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
            btnGoogleBackup.disabled = false;
            btnGoogleImport.disabled = false;
        } else {
            googleAuthStatus.innerHTML = `
                <span class="text-danger">
                    <i class="fas fa-times-circle"></i> Tidak terhubung dengan Google Drive
                </span>
            `;
            btnGoogleBackup.disabled = true;
            btnGoogleImport.disabled = true;
        }
    }

    // Handle Google Sign-In
    function handleGoogleSignIn() {
        gapi.auth2.getAuthInstance().signIn().then(() => {
            Swal.fire({
                title: 'Berhasil Login',
                text: 'Anda sekarang terhubung dengan Google Drive',
                icon: 'success',
                confirmButtonText: 'OK'
            });
        }).catch(error => {
            console.error('Error signing in:', error);
            showError('Gagal login ke Google');
        });
    }

    // Handle Google Sign-Out
    function handleGoogleSignOut() {
        gapi.auth2.getAuthInstance().signOut().then(() => {
            Swal.fire({
                title: 'Berhasil Logout',
                text: 'Anda telah keluar dari Google Drive',
                icon: 'success',
                confirmButtonText: 'OK'
            });
        });
    }

    // Backup to Google Drive
    async function backupToGoogleDrive() {
        try {
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
                pengaturanToko: JSON.parse(localStorage.getItem('pengaturanToko') || '{}')
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const metadata = {
                name: `backup_${new Date().toISOString().split('T')[0]}.json`,
                mimeType: 'application/json',
                parents: ['root'] // You can specify a folder ID here if needed
            };

            // Upload file to Google Drive
            const accessToken = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', blob);

            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
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
            // Show file picker
            const pickerResponse = await new Promise((resolve, reject) => {
                const picker = new google.picker.PickerBuilder()
                    .addView(new google.picker.DocsView().setMimeTypes('application/json'))
                    .setOAuthToken(gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token)
                    .setDeveloperKey(API_KEY)
                    .setCallback(data => {
                        if (data.action === google.picker.Action.PICKED) {
                            resolve(data.docs[0]);
                        } else if (data.action === google.picker.Action.CANCEL) {
                            reject(new Error('User canceled file selection'));
                        }
                    })
                    .build();
                picker.setVisible(true);
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
            const response = await gapi.client.drive.files.get({
                fileId: pickerResponse.id,
                alt: 'media'
            });

            const data = response.result;

            // Validate the imported data
            if (!data.produk || !data.nota || !data.pengaturanToko) {
                throw new Error('Format file tidak valid');
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

    // Initialize Google API when the script loads
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
        initGoogleClient();
        // Also load the Picker API
        gapi.load('picker', () => {});
    };
    document.head.appendChild(script);

    // Add Google Sign-In/Out buttons if needed
    const googleAuthContainer = document.getElementById('googleAuthContainer');
    if (googleAuthContainer) {
        googleAuthContainer.innerHTML = `
            <button id="btnGoogleSignIn" class="btn btn-success border rounded" style="border-radius: 16px;padding-top: 8px;padding-bottom: 8px;padding-right: 10px;padding-left: 10px;width: 100%;" data-google-action="backup"><i class="fas fa-sign-in-alt"></i> Sign In Google </button>
            <button id="btnGoogleSignOut" class="btn btn-danger border rounded" style="border-radius: 16px;padding-top: 8px;padding-bottom: 8px;padding-right: 10px;padding-left: 10px;width: 100%;" data-google-action="backup"><i class="fas fa-sign-out-alt"></i> Logout Google</button>
        `;
        
        document.getElementById('btnGoogleSignIn').addEventListener('click', handleGoogleSignIn);
        document.getElementById('btnGoogleSignOut').addEventListener('click', handleGoogleSignOut);
    }
});