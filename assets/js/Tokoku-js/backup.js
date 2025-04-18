document.addEventListener('DOMContentLoaded', () => {
    const btnBackup = document.getElementById('btnBackup');
    const btnImport = document.getElementById('btnImport');
    const btnReset = document.getElementById('btnReset');
    const fileImport = document.getElementById('fileImport');

    // Backup Data
    btnBackup.addEventListener('click', () => {
        const data = {
            produk: JSON.parse(localStorage.getItem('produk') || '[]'),
            nota: JSON.parse(localStorage.getItem('nota') || '[]'),
            pengaturanToko: JSON.parse(localStorage.getItem('pengaturanToko') || '{}')
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const today = new Date();
        // Format tanggal yyyy/mm/dd
        const formattedDate =
            `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
        a.download = `backup_${formattedDate}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Swal.fire({
            title: 'Backup Berhasil',
            text: 'Data telah berhasil di-backup',
            icon: 'success',
            confirmButtonText: 'OK'
        });
    });

    // Import Data
    btnImport.addEventListener('click', () => {
       fileImport.click();
    });

    fileImport.addEventListener('change', (e) => {
       const file = e.target.files[0];
       if (!file) return;

       const reader = new FileReader();
       reader.onload = (event) => {
           try {
               const data = JSON.parse(event.target.result);

               if (!data.produk || !data.nota || !data.pengaturanToko) {
                   throw new Error('Format file tidak valid');
               }

               localStorage.setItem('produk', JSON.stringify(data.produk));
               localStorage.setItem('nota', JSON.stringify(data.nota));
               localStorage.setItem('pengaturanToko', JSON.stringify(data.pengaturanToko));

               Swal.fire({
                   title: 'Import Berhasil',
                   text: 'Data berhasil diimpor! Halaman akan direfresh.',
                   icon: 'success',
                   confirmButtonText: 'OK'
               }).then(() => location.reload());
           } catch (error) {
                Swal.fire({
                    title:'Error',
                    text:'Gagal mengimport data : '+ error.message,
                    icon:'error',
                    confirmButtonText:'OK'
                });
           }
       };

       reader.onerror= () =>{
          Swal.fire({
              title:'Error',
              text:'Gagal membaca file',
              icon:'error',
              confirmButtonText:'OK'
          });
      };

      reader.readAsText(file);
   });

   // Reset Data
   btnReset.addEventListener("click", () =>{
     Swal.fire({
         title:"Konfirmasi Reset Data",
         text:"Apakah Anda yakin ingin mereset semua data? Semua data akan dihapus permanen!",
         icon:"warning",
         showCancelButton:true,
         confirmButtonColor:"#3085d6",
         cancelButtonColor:"#d33",
         confirmButtonText:"Ya, Reset!",
         cancelButtonText:"Batal"
     }).then((result)=>{
          if(result.isConfirmed){
             localStorage.clear();
             Swal.fire({
                 title:"Reset Berhasil",
                 text:"Data berhasil direset. Halaman akan direfresh.",
                 icon:"success",
                 confirmButtonText:"OK"
             }).then(()=>location.reload());
          }
     })
   })
});
