/**
 * backupgoogledrive.js
 * Fungsi untuk backup dan import data ke Google Drive
 */

// Konstanta untuk konfigurasi Google Drive API
const CLIENT_ID = '362387001717-qd55fokbba192mjd97t61b3jslbvqp47.apps.googleusercontent.com'; // Ganti dengan ID aplikasi Anda
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

// Variabel global
let gapiLoaded = false;
let driveClient;

/**
 * Inisialisasi Google API Client Library
 */
function initGapiClient() {
    gapi.load('client:auth2', () => {
        gapi.client.init({
            clientId: CLIENT_ID,
            scope: SCOPES
        }).then(() => {
            gapiLoaded = true;
            console.log('Google API Client berhasil dimuat');
        });
    });
}

/**
 * Menangani proses login ke akun Google
 */
function handleAuthClick(event) {
    gapi.auth2.getAuthInstance().signIn();
}

/**
 * Membuat folder "WalletKu Backup" di Google Drive jika belum ada
 * @returns {Promise<string>} ID folder
 */
async function createOrGetBackupFolder() {
    const folderName = 'WalletKu Backup';
    const response = await gapi.client.drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id)'
    });

    let folderId;
    if (response.result.files && response.result.files.length > 0) {
        folderId = response.result.files[0].id;
    } else {
        const folderMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder'
        };
        const folderResponse = await gapi.client.drive.files.create({
            resource: folderMetadata,
            fields: 'id'
        });
        folderId = folderResponse.result.id;
    }

    return folderId;
}

/**
 * Melakukan backup data ke Google Drive
 */
async function backupToDrive() {
    if (!gapiLoaded) {
        alert('Mohon tunggu, sedang memuat Google API...');
        return;
    }

    // Autentikasi pengguna
    const authInstance = gapi.auth2.getAuthInstance();
    if (!authInstance.isSignedIn.get()) {
        authInstance.signIn();
        return;
    }

    // Ambil data dari localStorage
    const data = {
        produk: JSON.parse(localStorage.getItem('produk') || '[]'),
        nota: JSON.parse(localStorage.getItem('nota') || '[]'),
        pengaturanToko: JSON.parse(localStorage.getItem('pengaturanToko') || '{}')
    };

    // Format tanggal untuk nama file
    const today = new Date();
    const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const fileName = `backup_${formattedDate}.json`;

    // Buat folder "WalletKu Backup" jika belum ada
    const folderId = await createOrGetBackupFolder();

    // Siapkan metadata file
    const fileMetadata = {
        name: fileName,
        parents: [folderId],
        mimeType: 'application/json'
    };

    // Siapkan data file
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });

    // Upload file ke Google Drive
    const media = new gapi.client.MediaBody(blob);
    const response = await gapi.client.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id'
    });

    console.log(`File berhasil di-upload ke Google Drive dengan ID: ${response.result.id}`);
    alert('Backup berhasil disimpan di Google Drive!');
}

/**
 * Mengimpor data dari Google Drive
 */
async function importFromDrive() {
    if (!gapiLoaded) {
        alert('Mohon tunggu, sedang memuat Google API...');
        return;
    }

    // Autentikasi pengguna
    const authInstance = gapi.auth2.getAuthInstance();
    if (!authInstance.isSignedIn.get()) {
        authInstance.signIn();
        return;
    }

    // Cari file backup terbaru di folder "WalletKu Backup"
    const folderId = await createOrGetBackupFolder();
    const response = await gapi.client.drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/json' and trashed=false`,
        orderBy: 'modifiedTime desc',
        pageSize: 1,
        fields: 'files(id,name)'
    });

    if (!response.result.files || response.result.files.length === 0) {
        alert('Tidak ada backup yang ditemukan di Google Drive.');
        return;
    }

    const fileId = response.result.files[0].id;
    const fileName = response.result.files[0].name;

    // Download file dari Google Drive
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const token = gapi.auth.getToken().access_token;
    const responseBlob = await fetch(downloadUrl, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    const blobData = await responseBlob.text();

    try {
        const importedData = JSON.parse(blobData);

        // Simpan data ke localStorage
        localStorage.setItem('produk', JSON.stringify(importedData.produk));
        localStorage.setItem('nota', JSON.stringify(importedData.nota));
        localStorage.setItem('pengaturanToko', JSON.stringify(importedData.pengaturanToko));

        alert(`Data berhasil di-import dari Google Drive: ${fileName}`);
    } catch (error) {
        console.error('Error parsing file JSON:', error);
        alert('Gagal mengimport data. File tidak valid.');
    }
}

/**
 * Menginisialisasi skrip saat halaman dimuat
 */
document.addEventListener('DOMContentLoaded', () => {
    // Tambahkan tombol untuk backup dan import
    const btnBackup = document.getElementById('btnBackup');
    const btnImport = document.getElementById('btnImport');

    // Event listener untuk tombol backup
    btnBackup.addEventListener('click', async () => {
        await backupToDrive();
    });

    // Event listener untuk tombol import
    btnImport.addEventListener('click', async () => {
        await importFromDrive();
    });

    // Muat Google API Client Library
    initGapiClient();
});
