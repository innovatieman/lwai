import { Injectable } from '@angular/core';
import { Platform, PopoverController } from '@ionic/angular';
import { ModalService } from './modal.service';
import { SelectMenuService } from './select-menu.service';
import { MenuPage } from '../components/menu/menu.page';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ToastService } from './toast.service';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { finalize } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  private activeScreenSize:string = 'md'
  public screenWidth:number = window.innerWidth
  private MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB limiet
  avatarMenu: any;
  shortMenu: any;
  selectedFile: File | null = null;
  selectedVideo: File | null = null;
  private cameraContainer!: HTMLDivElement;
  private videoElement!: HTMLVideoElement;
  private canvasElement!: HTMLCanvasElement;
  private videoStream!: MediaStream | null;
  private captureButton!: HTMLButtonElement;
  private cancelButton!: HTMLButtonElement;
  

  constructor(
    public platform:Platform,
    private modalService:ModalService,
    private popoverController:PopoverController,
    private selectMenuservice:SelectMenuService,
    private functions: AngularFireFunctions,
    private toast:ToastService,
    private storage: AngularFireStorage,
    private auth:AuthService,
    private translate:TranslateService,
  ) {
    this.setScreenSize()
   }

  public get screenSize(){
    return this.activeScreenSize
  }

  get isAppleDevice() {
    return /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);
  }
  async clearCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(cache => caches.delete(cache)));
    window.location.reload();
  }
  
  videoUrl(fileName:string){
    let raw_url = 'https://firebasestorage.googleapis.com/v0/b/lwai-3bac8.firebasestorage.app/o/raw-videos%2F'
    let compressed_url = 'https://firebasestorage.googleapis.com/v0/b/lwai-3bac8.firebasestorage.app/o/videos%2F'
    let filenameItem:any = fileName.split('?')[0]
    let filename = filenameItem.split('.')[0]
    let fileTime:any = filename.split('_')[1]
    let dateTime = new Date(parseInt(fileTime))
    // als de datum jonger is dan  24 uur
    if(dateTime.getTime() > Date.now() - 24 * 60 * 60 * 1000){
      return `${raw_url}${fileName}`
    }
    else{
      return `${compressed_url}${fileName}`
    }

  }


  setScreenSize(){

    if (window.matchMedia("(max-width: 575px)").matches) {
      this.activeScreenSize = 'xs'
    } 
    else if (window.matchMedia("(max-width: 769px)").matches) {
      this.activeScreenSize = 'sm'
    } 
    else if (window.matchMedia("(max-width: 992px)").matches) {
      this.activeScreenSize = 'md'
    } 
    else if (window.matchMedia("(max-width: 1200px)").matches) {
      this.activeScreenSize = 'lg'
    } 
    else {
      this.activeScreenSize = 'xl'
    } 
  }

  get smallDevice(){
    return this.activeScreenSize == 'xs' || this.activeScreenSize == 'sm'
  }

  get browser() {
    if ((navigator.userAgent.indexOf("Opera") || navigator.userAgent.indexOf('OPR')) != -1) {
       return 'Opera';
    } else if (navigator.userAgent.toLowerCase().indexOf("chrome") != -1) {
       return 'Chrome';
    } else if (navigator.userAgent.indexOf("Safari") != -1) {
       return 'Safari';
    } else if (navigator.userAgent.indexOf("Firefox") != -1) {
       return 'Firefox';
    } else {
       return 'unknown';
    }
 }

  async selectAvatar(event:Event,callback:Function,withGeneration?:boolean){
    this.selectMenuservice.selectedItem = null
    let list = [
      {title:'Upload foto',icon:'faCloudUploadAlt',action:'upload'},
      {title:'Maak een foto',icon:'faCameraRetro',action:'camera'},
      {title:'Selecteer uit bibliotheek',icon:'faImage',action:'library'},
      {title:'Verwijder foto',icon:'faTrashAlt',action:'delete'},
    ]
    if(withGeneration){
      list.push({title:'Genereer avatar',icon:'faUserNinja',action:'generate'})
    }
    this.shortMenu = await this.popoverController.create({
      component: MenuPage,
      componentProps:{
        customMenu:true,
        pages:list,
        listShape:true
      },
      cssClass: 'customMenu',
      event: event,
      translucent: false,
    });
    this.shortMenu.shadowRoot.lastChild.lastChild['style'].cssText = 'border-radius: 24px !important;';

    await this.shortMenu.present()
    await this.shortMenu.onWillDismiss();

    if(this.selectMenuservice.selectedItem){
      switch(this.selectMenuservice.selectedItem.action){
        case 'upload':
          this.selectedFile = await this.selectFile()
          this.uploadImage(this.selectedFile,callback)
          break;
        case 'camera':
          const photoData = await this.takePhoto();
          if (photoData) {
            console.log('Foto genomen:', photoData);
            this.uploadPhoto(photoData,callback);
          }
          break;
        case 'library':
          this.selectFromLibrary(callback)
          break;
        case 'delete':
          callback('delete')
          break;
        case 'generate':
          callback('generate')
          break;
        default:
          break;
      }
    }
  }
  
  
  async uploadImage(selectedFile:any,callback:Function){

    if (this.selectedFile) {
      this.toast.showLoader()
      return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile!);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];

        const callable = this.functions.httpsCallable('uploadImage');
        callable({ fileData: base64String })
          .subscribe({
            next: (response: any) => {
              this.toast.hideLoader()
              callback(response)
            },
            error: (error) => {
              this.toast.hideLoader()
              reject(error)
            },
          });
        };
        reader.onerror = (error) => reject(error);
      });
    }
    return null;
   }

  async uploadPhoto(base64String:string,callback:Function){

    if (base64String) {
      this.toast.showLoader()
      return new Promise<string>((resolve, reject) => {

        const callable = this.functions.httpsCallable('uploadPhoto');
        callable({ fileData: base64String.replace(/^data:image\/png;base64,/, '') })
          .subscribe({
            next: (response: any) => {
              this.toast.hideLoader()
              callback(response)
            },
            error: (error) => {
              this.toast.hideLoader()
              reject(error)
            },
          });
        });

    }
    else{
      return null;
    }
   }

  selectFromLibrary(callback:Function){
    this.modalService.selectImageLibrary({},(res:any)=>{
      console.log(res)
      if(res.data){
        callback({type:'library',url:res.data.url})
      }
    })

  }


  selectFile(): Promise<File | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*'; // Alleen afbeeldingen toestaan
      input.style.display = 'none';

      document.body.appendChild(input);
      input.click();

      input.addEventListener('change', () => {
        if (input.files && input.files.length > 0) {
          resolve(input.files[0]);
        } else {
          resolve(null);
        }
        document.body.removeChild(input); // Verwijder input na selectie
      });

      input.addEventListener('cancel', () => {
        resolve(null);
        document.body.removeChild(input);
      });
    });
  }


  async takePhoto(): Promise<string | null> {
    return new Promise(async (resolve, reject) => {
      try {
        // 📌 1. Maak een container voor de camera
        this.cameraContainer = document.createElement('div');
        this.cameraContainer.style.position = 'fixed';
        this.cameraContainer.style.top = '50%';
        this.cameraContainer.style.left = '50%';
        this.cameraContainer.style.transform = 'translate(-50%, -50%)';
        this.cameraContainer.style.width = '1000px';
        this.cameraContainer.style.height = '800px';
        this.cameraContainer.style.maxWidth = '100vw';
        this.cameraContainer.style.maxHeight = '100vh';

        this.cameraContainer.style.border = '2px solid black';
        this.cameraContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.cameraContainer.style.display = 'flex';
        this.cameraContainer.style.flexDirection = 'column';
        this.cameraContainer.style.alignItems = 'center';
        this.cameraContainer.style.justifyContent = 'space-between';
        this.cameraContainer.style.padding = '10px';
        this.cameraContainer.style.zIndex = '1000';
        document.body.appendChild(this.cameraContainer);

        // 📌 2. Maak een video-element aan en plaats deze in de container
        this.videoElement = document.createElement('video');
        this.videoElement.autoplay = true;
        this.videoElement.style.width = '100%';
        this.videoElement.style.height = '100%';
        this.videoElement.style.objectFit = 'cover';
        this.cameraContainer.appendChild(this.videoElement);

        // 📌 3. Start de camera en toon de video
        this.videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        this.videoElement.srcObject = this.videoStream;

        // 📌 4. Opnameknop toevoegen
        this.captureButton = this.createButton('📷 Neem Foto', 'green', () => {
          const photoData = this.capturePhoto();
          this.cleanup();
          resolve(photoData);
        });

        // 📌 5. Annuleerknop toevoegen
        this.cancelButton = this.createButton('❌ Annuleren', 'red', () => {
          this.cleanup();
          reject(null);
        });

        // Knoppen in een div plaatsen
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        this.cameraContainer.appendChild(buttonContainer);

        buttonContainer.appendChild(this.captureButton);
        buttonContainer.appendChild(this.cancelButton);

      } catch (error) {
        console.error('Camera error:', error);
        this.cleanup();
        reject(null);
      }
    });
  }

  private capturePhoto(): string | null {
    if (!this.videoElement) return null;

    // 📌 6. Maak een canvas-element aan
    this.canvasElement = document.createElement('canvas');
    const context = this.canvasElement.getContext('2d');
    if (!context) return null;

    this.canvasElement.width = this.videoElement.videoWidth;
    this.canvasElement.height = this.videoElement.videoHeight;
    context.drawImage(this.videoElement, 0, 0, this.canvasElement.width, this.canvasElement.height);

    // 📌 7. Converteer naar Base64
    return this.canvasElement.toDataURL('image/png');
  }

  private createButton(text: string, color: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.innerText = text;
    button.style.padding = '10px 20px';
    button.style.fontSize = '16px';
    button.style.color = 'white';
    button.style.backgroundColor = color;
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';
    button.style.boxShadow = '2px 2px 10px rgba(0, 0, 0, 0.5)';
    button.addEventListener('click', onClick);
    return button;
  }

  private cleanup() {
    // 📌 8. Stop de camera en verwijder alle elementen
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
    }
    if (this.cameraContainer) {
      document.body.removeChild(this.cameraContainer);
    }
    if (this.canvasElement) {
      this.canvasElement.remove();
    }
  }

  selectVideoFile(): Promise<File | null> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'video/*';
      input.style.display = 'none';

      document.body.appendChild(input);
      input.click();

      input.addEventListener('change', () => {
        if (input.files && input.files.length > 0) {
          const file = input.files[0];

          // 📌 Bestandsgrootte controleren
          if (file.size > this.MAX_FILE_SIZE) {
            this.toast.show(`Bestand is te groot! Maximaal toegestaan: ${this.MAX_FILE_SIZE / (1024 * 1024)} MB`,6000);

            resolve(null);
          } else {
            resolve(file)
            // resolve({ file });
          }
        } else {
          resolve(null);
        }
        document.body.removeChild(input);
      });

      input.addEventListener('cancel', () => {
        resolve(null);
        document.body.removeChild(input);
      });
    });
  }

  async selectVideo(callback:Function) {
    this.selectedVideo = await this.selectVideoFile();
    if (this.selectedVideo) {
      console.log('Geselecteerde video:', this.selectedVideo.name);
      this.toast.show('Upload gestart',2000,'bottom')
      // this.toast.showLoader()
      this.uploadVideo(this.selectedVideo,callback);
    }
  }

  percentageUploadingVideo:number = 0

  uploadVideo(file: File, callback:Function) {
    this.percentageUploadingVideo = 0
    let ext = file.name.split('.').pop()
    let fileName = `${this.auth.userInfo.uid}_${Date.now()}.${ext}`
    const filePath = `raw-videos/${fileName}`;
    const fileRef = this.storage.ref(filePath);
    const task = this.storage.upload(filePath, file)

    return task.snapshotChanges().subscribe((result:any)=>{
      console.log(result)
      this.percentageUploadingVideo = Math.round((result.bytesTransferred / result.totalBytes) * 100);
      if(result.bytesTransferred == result.totalBytes){
        fileRef.getDownloadURL().subscribe((url)=>{
          // this.toast.hideLoader()
          callback({url:url})
        })
      }
    })

    // return task.snapshotChanges().pipe(
    //   finalize(async () => {
    //     const downloadURL = await fileRef.getDownloadURL().toPromise();
    //     this.toast.hideLoader()
    //     callback(downloadURL)
    //     console.log('Video geüpload:', downloadURL);
    //   })
    // );
  }

  async shareCase(caseItem:any,event:any){
    event.preventDefault()
    event.stopPropagation()
    if (navigator.share) {
      if(caseItem=='login'){
        await navigator.share({
          title:  this.translate.instant('share.basic_title'),
          text: this.translate.instant('share.basic_site'),
        });
      }
      else{

        await navigator.share({
          title:  this.translate.instant('share.basic_title'),
          text: this.translate.instant('share.basic_text_case').replace('[case_title]',caseItem.title).replace('[case_user_info]',caseItem.user_info).replace('[case_link]',`https://preview.alicialabs.com/${this.translate.currentLang}/${caseItem.id}`)
        });
      }

    } else {
      if(caseItem=='login'){
        this.showShareMenu(event,'https://www.alicialabs.com/',this.translate.instant('share.basic_site'),this.translate.instant('share.basic_title'))
      }
      else{
        this.showShareMenu(event,`https://preview.alicialabs.com/${this.translate.currentLang}/${caseItem.id}`,this.translate.instant('share.basic_text_case').replace('[case_title]',caseItem.title).replace('[case_user_info]',caseItem.user_info).replace('[case_link]',`https://preview.alicialabs.com/${this.translate.currentLang}/${caseItem.id}`),this.translate.instant('share.basic_title'))
      }
    }
  }


  shareMenu:any
  async showShareMenu(event:any,url:string,text?:any,title?:string){
    let list = [
      {
        type: 'email',
        title: 'E-mail',
        icon: 'faEnvelope',
        background: '#D44638',
        color: '#FFFFFF',
        link: 'mailto:?body={{text}}&subject={{title}}'
      },
      {
        type: 'whatsapp',
        title: 'WhatsApp',
        icon: 'faWhatsapp',
        background: '#25D366',
        color: '#FFFFFF',
        link: 'https://wa.me/?text={{text}}'
      },
      {
        type: 'facebook',
        title: 'Facebook',
        icon: 'faFacebook',
        background: '#1877F2',
        color: '#FFFFFF',
        link: 'https://www.facebook.com/sharer/sharer.php?u={{text}}'
      },
      {
        type: 'x',
        title: 'X',
        icon: 'faXTwitter',
        background: '#000000',
        color: '#FFFFFF',
        link: 'https://x.com/intent/tweet?text={{text}}'
      },
      {
        type: 'linkedin',
        title: 'LinkedIn',
        icon: 'faLinkedin',
        background: '#0A66C2',
        color: '#FFFFFF',
        link: 'https://www.linkedin.com/shareArticle?url={{url}}'
      },
      {
        type: 'telegram',
        title: 'Telegram',
        icon: 'faTelegram',
        background: '#0088CC',
        color: '#FFFFFF',
        link: 'https://t.me/share/url?url={{text}}'
      },
      {
        type: 'copy',
        title: 'Copy',
        icon: 'faCopy',
        background: '#3A76F0',
        color: '#FFFFFF',
        copy: true,
      },
    ]
    this.shareMenu = await this.popoverController.create({
      component: MenuPage,
      componentProps:{
        customMenu:true,
        pages:list,
        listShape:false,
        shareMenu:true,
      },
      cssClass: 'customMenu',
      event: event,
      translucent: false,
    });
    await this.shareMenu.present();
    await this.shareMenu.onWillDismiss();
    
    if(this.selectMenuservice.selectedItem?.link){
      let link = this.selectMenuservice.selectedItem.link
      if(link.includes('{{text}}')){
        link = link.replace('{{text}}',text)
      }
      if(link.includes('{{title}}')){
        link = link.replace('{{title}}',title)
      }
      if(link.includes('{{url}}')){
        link = link.replace('{{url}}',url)
      }
      window.open(link, '_blank');
    }
    else if(this.selectMenuservice.selectedItem?.copy){
      navigator.clipboard.writeText(text).then(() => {
        this.toast.show(this.translate.instant('share.copied'),2000)
      });
    }
  }

}
