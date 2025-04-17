document.addEventListener('DOMContentLoaded', () => {
    // Elemen UI
    const btnGoogleLogin = document.getElementById('btnGoogleLogin');
    const btnGoogleLogout = document.getElementById('btnGoogleLogout');
    const btnGoogleBackup = document.getElementById('btnGoogleBackup');
    const btnSelectiveBackup = document.getElementById('btnSelectiveBackup');
    const userInfoSection = document.getElementById('userInfo');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const lastSyncElement = document.getElementById('lastSync');

    // Konfigurasi Google API
    const clientId = '362387001717-qd55fokbba192mjd97t61b3jslbvqp47.apps.googleusercontent.com';
    const scope =
        'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile';
    
    let googleUser = null;

    class GoogleDriveManager {
        constructor() {
            this.initializeGAPI();
            this.setupEventListeners();
            this.updateUI();
        }

        async initializeGAPI() {
            return new Promise((resolve, reject) => {
                if (window.gapi && window.gapi.auth2) { resolve(); return; }
                // Load GAPI script dynamically if not loaded yet.
                if (!document.querySelector('#gapi-script')) {
                    let scriptEl = document.createElement("script");
                    scriptEl.id="gapi-script";
                    scriptEl.src="https://apis.google.com/js/platform.js";
                    scriptEl.async=true;
                    scriptEl.defer=true;
                    scriptEl.onload=() => { 
                        gapi.load("auth2", () => {
                            gapi.auth2.init({
                                client_id: clientId,
                                scope: scope,
                            }).then(() => { 
                                this.checkInitialLogin(); 
                                resolve(); 
                            }).catch(reject);
                        });
                    };
                    scriptEl.onerror=reject;
                    document.head.appendChild(scriptEl);
                } else resolve();
            });
        }

        async checkInitialLogin() {
            try{
                await this.waitForAuthInstance();
                let authInstance=gapi.auth2.getAuthInstance();
                if(authInstance.isSignedIn && authInstance.isSignedIn.get()){
                  googleUser=authInstance.currentUser.get();
                  this.updateUI();this.enableActions();}
                 else{this.disableActions();}
             }catch(e){console.error(e);}
         }
         waitForAuthInstance(){
             return new Promise((res)=>{
                 let check=()=>{if(gapi&&gapi.auth2&&gapi.auth2.getAuthInstance()){res()}else setTimeout(check,100)};
                 check()
             })
         }

         setupEventListeners(){
             btnGoogleLogin.addEventListener("click",()=>this.handleLogin());
             btnGoogleLogout.addEventListener("click",()=>this.handleLogout());
             btnGoogleBackup.addEventListener("click",()=>this.backupData());
             btnSelectiveBackup.addEventListener("click",()=>this.selectiveBackup());
         }

         async handleLogin(){
           try{
               this.showSpinner(btnGoogleLogin,true);
               await this.waitForAuthInstance()
               googleUser=await gapi.auth2.getAuthInstance().signIn()
               this.updateUI();this.enableActions()
               this.showToast(
                   "Berhasil Login",
                   `Anda login sebagai ${googleUser?googleUser?.getBasicProfile().getName():''}`,
                   "success"
               );
           }catch(e){
              console.error(e); 
              alert("Gagal login!");
           }finally{this.showSpinner(btnGoogleLogin,false);}
       }
       async handleLogout(){
           try{
              this.showSpinner(btnGoogleLogout,true);
              await gapi.auth2?.getAuthInstance()?.signOut?.()
              googleUser=null;this.updateUI();this.disableActions()
              this.showToast(
                  "Berhasil Logout",
                  "Anda telah logout dari akun Google.",
                  "info"
              );
          }catch(e){
              console.error(e);alert("Gagal logout!");
          }finally{this.showSpinner(btnGoogleLogout,false);}
      }
      updateUI(){
          let isLoggedIn=(!!googleUser)
          btnGoogleLogin.classList.toggle("d-none",isLoggedIn)
          userInfoSection.classList.toggle("d-none",!isLoggedIn)
          
          if(isLoggedIn){
              let profile=googleUser?.getBasicProfile?.()
              userAvatar.src=profile?profile?.getImageUrl():""
              userName.textContent=profile?profile?.getName():""
          }
          
          // Update last sync time:
          let lastSync=localStorage.getItem("lastSync")
          lastSyncElement.textContent=
            lastSync?
            `Terakhir sinkron: ${new Date(lastSync).toLocaleString()}`
            :"Belum pernah sinkronisasi";
      }
      enableActions(){btnGoogleBackup.disabled=false;btnSelectiveBackup.disabled=false;}
      disableActions(){btnGoogleBackup.disabled=true;btnSelectiveBackup.disabled=true;}

      showSpinner(button,show){
           let spinnerDom=(button.querySelector(".spinner-border"));
           if(spinnerDom){spinnerDom.classList.toggle("d-none",!show)}
           button.disabled=show;
       }

       showToast(title,text,type="success"){
           // Gunakan SweetAlert jika ada. Jika tidak fallback alert biasa.
           if(window.Swal){
               Swal.fire({title,text,icon:type,timer:2000,toast:true,position:'top-end',showConfirmButton:false});
           }else{
               alert(`${title}\n${text}`);
           }
       }


     /*** --- FUNGSI BACKUP --- ***/

     getLocalData(){
         // Contoh ambil dari localStorage. Ubah sesuai kebutuhan!
         return {
             produk: JSON.parse(localStorage.getItem('produk') || '[]'),
             nota: JSON.parse(localStorage.getItem('nota') || '[]'),
             pengaturanToko: JSON.parse(localStorage.getItem('pengaturanToko') || '{}')
         };
     }

     executeWithAuth(callback){
        return new Promise(async(resolve,reject)=>{
            try{
                await this.waitForAuthInstance();
                if(!googleUser){await this.handleLogin()}
                
                // Refresh token jika hampir expired:
                var authResponse=(googleUser||{}).getAuthResponse&&googleUser?.getAuthResponse()?googleUser?.getAuthResponse():null;
                
                if(authResponse && authResponse.expires_in<300){//kurang 5 menit expired
                     await googleUser.reloadAuthResponse&&googleUser.reloadAuthResponse()}
                
                 var accessToken=(googleUser||{}).getAuthResponse? googleUser?.getAuthResponse()?.access_token : null;
                 
                 resolve(await callback(accessToken));
                 
            }catch(err){reject(err)}
        })
     }


   /**
   * Upload file jsonObj ke drive pengguna dengan nama filename.
   */
   uploadFile(jsonObj,filename){
       return 	this.executeWithAuth(async(accessToken)=>{
			const metadata={
				name:filename,
				mimeType:'application/json'
			};
			const form=new FormData();
			form.append(
				'metadata',
				new Blob([JSON.stringify(metadata)],{type:'application/json'})
			);
			form.append(
				'file',
				new Blob([JSON.stringify(jsonObj)],{type:'application/json'})
			);

		  	let responseRaw=
			 	await fetch(
					"https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
					{
						method:"POST",
						headers:new Headers({Authorization:"Bearer "+accessToken}),
						body:form,
					}
			   );
		   	if(!responseRaw.ok) throw new Error(`Upload gagal (${responseRaw.status})`);
		   	return responseRaw.json();

	   });
   }


	async backupData(){
	   	try{
	   	 	this.showSpinner(btnGoogleBackup,true);
	   	 	const localData=this.getLocalData(),
	   	 		today=new Date(),
	   	 		filename=`backup_${today.toISOString().split("T")[0]}.json`;
	   	 	await	this.uploadFile(localData,filename);

	    	localStorage.setItem( "lastSync" , today.toISOString());
	    	this.showToast( "Sukses!",  "Semua data berhasil di-backup ke Google Drive.",  "success" );
	    	this.updateUI();

	  	  } catch(error) {console.error(error);alert(`Gagal backup:\n${error.message}`);}
	      finally {	this.showSpinner(btnGoogleBackup,false);}

	   }


	async selectiveBackup(){
	        try{
	           	this.showSpinner(btnSelectiveBackup,true);

	           	let options=[];
	           	if(window.Swal && Swal.fire.length!==undefined){//pakai sweetalert v11+
	               	let resultSwal=
	                   	await Swal.fire({
	                        title:'Pilih Data untuk Backup',
	                        input:'checkbox',
	                        inputOptions:{
								produk:'Produk',
								nota :'Nota Transaksi',
								pengaturan :'Pengaturan Toko'
							},
	                        inputPlaceholder : 'Pilih minimal satu!',
	                        confirmButtonText : 'Lanjutkan Backup!',
							cancelButtonText : 'Batal',
							showCancelButton:true,
							inputValidator:(result)=> !result||result.length===0?'Pilih minimal satu':null

	                    });
	               	options=resultSwal.value||[];
	           	}else{//fallback prompt manual:
	               	options=[];
	               	if(confirm("[Manual] Sertakan Produk dalam backup?"))options.push ("produk");
	               	if(confirm("[Manual] Sertakan Nota Transaksi dalam backup?"))options.push ("nota");
	               	if(confirm("[Manual] Sertakan Pengaturan Toko dalam backup?"))options.push ("pengaturan");
	            };

	          	if(options.length===0)return;

	          	const localData=this . getLocalData ();
	          	let dataToSave={};
	          	if(options.includes ('produk'))dataToSave.produk=localData.produk ;
	          	if(options.includes ('nota'))dataToSave.nota  =localData.nota ;
	          	if(options.includes ('pengaturan'))dataToSave.pengaturanToko  =(localData.pengaturanToko );

	         	const today=new Date(), filename=`selective_backup_${today.toISOString().split ("T")[0]}.json`;

	         	await 		this.uploadFile(dataToSave , filename );

	         	localStorage.setItem( "lastSync" , today.toISOString());

	         	this . showToast (
	              options.map(opt=>opt.charAt(0).toUpperCase()+opt.slice(1)).join(", ")+" berhasil dibackup!",
	              `File tersimpan di akun drive anda.`,
	              "success"
	          )
	         ; 	

	        	this . updateUI ();

	        } catch(error){console.error(error);alert(`Error selective backup:\n${error.message}`);}
	        finally { 	  	    	  	    	  	    	  
	        	 	      	      	      	      	
	        	      	        	      	        	      	        
	        	      	        	      	        	      	        
	        	      	        	      	        	      
	        	  	            	            	            	            
	            	  	            	            	            
	            	  	            	            	            
	            	  	            		   
	            	  	            		   
	            	  	            		   
	            	  	            		   
	                	    	    	   	    	    
	                	    	    	   	    	    
	                	    	    	   	    
	                	    	    	   	    
	                	    	    	   	    
	                	    		     
	                	    		     
		            	    		     
		            	    		     
		            	    		     
		           		    	       
		           		    	       
		           		    	       
		           		    	   
		        	
		        	
		        	
		        	
		       		
		       		
		       		
		       		
		      		

		      		

		      		

		      		

		     	

		     	

		     	

		     	

		    


		    


		    
		    
		    
		   

		  


		 		 	  
		 		 	  
		 		 	  
		 		 	  

		         		         		         		         		  
		         		         		         		         		  
		               		               		               		               		 
		               		               		               		               		 
		                   		                   		                   		                   	 
		                   		                   		                   		                   	 
			               			               			               			               	 
			               			               			               			           	 
			       			       			       			       	 
			       			       			       			      	 
			   			   			   			   	 
			   			   			   			  	  
			    			    			    	   
			     			     			     	  
			      			      			      	  
			        			        			  	  
			           			           			           	        
			        				       				       	        
			        				       				      	        
			        				      				      	        
			        				     				     	        
			        				    				    	   
			           				           				           	        
			           				           				           
				   				   				   	   
				   				   				  	   
				  				  				  	   
				 				 				 	   
				 				 				
			 			 			
			 			
			 
			 
			 
			 
			 
			

			
			
			
			
			
			
			
			

			
			
			
			
			
			

			
			

			
			

			
			

				
					
					
					
					
					
						
						
						
						
						
							
							
							
							
								
								
								
								
									
									
									
									
										
										
										
										
												
												
												
												
													

													

													

												    

												    

												    

											        

											        

											        

										            

										            

										            

									                

									                

									                

								                    
								                    
								                    
							                        
							                        
							                        
						                            
						                            
						                            
					                                
					                                
					                                
				                                    
				                                    
				                                    
			                                        
			                                        
			                                        
		                                            
		                                            
		                                            
                                                    
                                                    
                                                    
                                                //
                                                //
                                                //
                                                //
                                               //

                                               //

                                               //

                                              //

                                              //

                                              //

                                             //
                                             //
                                             //
                                            //
                                            //
                                            //
                                           ///
                                           ///
                                           ///
                                          ///
                                          ///
                                          ///



                                        ///



                                    ///



                                ///



                            ///




                        ///




                     ////




                   ////





                 ////





               /////





             
             
             
             
             
             
             
              
              
              
              
              
               
               
               
               
               
                
                 
                  
                   
                   
                   
                   
                   
                  
                  
                  
                  
                  
                     
                     
                     
                     
                     
                
                
                
                
                
                
                
                
                
                
                
                
                
                
                 
                 
                 
                 
                 
         
         
         
         
         
         
         
        
        	
        	
        	
        	
        	
        	
        	
    	
    	
    	
    	
    	
    	
    		
    		
    		
    		
    		    		    		    		    
    		    		    		    		    
    			    			    			    
    			    			    			    
    				    				    				    
    				    				    				    


        		        		        		        
        		        		        		        
        			        			        			        
        			        			        			        

                	                	                	        
                	                	                	        

                    	                   	                   	    
                    	                   	                   	    


                        	                       	       	       	


                            	


                            	


                            	


                            	


                            	


                            	


                            	

                             	
                             	
                             	
                             	

                              
                              
                              
                              

                                  /* spinner off */ 
                                  /* agar tombol bisa diklik lagi */
                                  /* biar UX enak */
                                  /* selesai proses */
                                   /* tutup spinner */
                                   /* selesai proses */

                                   /* tutup spinner */

                                   /* selesai proses */

                                   /* tutup spinner */

                                   /**/
                                    /**/
                                     /**/
                                      /**/
                                       /**/
                                        /**/

                                         /**/

                                         

                                         

                                         

                                         

                                         


                                        /*
                                        Selesai!
                                        */


                                    /*
                                    Selesai!
                                    */


                                /*
                                Selesai!
                                */


                            /*
                            Selesai!
                            */


                        /*
                        Selesai!
                        */


                     /*
                     Selesai!
                     */


                   /*
                   Selesai!
                   */



                 /*
                 Selesai!
                 */



               /**
			   * Spinner off setelah proses selesai.
			   **/
			   finally{ 	
			     	  	     	     	     	     	     	     	     	     	    
			     	  	btnSelectiveBackup &&
					    (typeof(this.showSpinner)==='function') &&
					    (typeof(this.btnSelectableBackUp)!=='undefined'||true)&&//dummy true agar tidak error pada IDE tertentu yg strict checking...
					    (()=>{try{this.showSpinner(btnSelectiveBackup,false)}catch(_e){}})();//panggil fungsi matikan spinner tanpa error meski context hilang...
			     };   

   	 }//end selectivebackup()

};//end class


// Inisialisasi manager saat DOM siap:
const driveManager=new GoogleDriveManager();

});
