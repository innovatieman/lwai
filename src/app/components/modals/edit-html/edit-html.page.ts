import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { IconsService } from 'src/app/services/icons.service';

@Component({
  selector: 'app-edit-html',
  templateUrl: './edit-html.page.html',
  styleUrls: ['./edit-html.page.scss'],
})

export class EditHtmlPage implements OnInit {
  @Input() data:any
  configModules={
    toolbar: {
      container:[
        ['bold', 'italic', 'underline'],
        [{ 'color': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        [{ 'align': [] }],
        ['link'],
        ['clean'],
        ['HTML'],
      ],
      clipboard: {
        matchVisual: false
      }
    }
  }
  showHtml:boolean=false
  constructor(
    public modal:ModalController,
    public icon:IconsService
  ) { }

  ngOnInit() {
    this.data = JSON.parse(JSON.stringify(this.data))
    this.showEditor()
    
  }

  startEditor(event:any){
    // this.editor = event
  }

  showEditor(){
    this.showHtml = false
    setTimeout(() => {
      let elements = document.getElementsByClassName("ql-container")
      for(let i=0;i<elements.length;i++){
        elements[i].setAttribute('style','height:calc(100% - 42px);border:0;')
      }
      elements = document.getElementsByClassName("ql-toolbar")
      for(let i=0;i<elements.length;i++){
        elements[i].setAttribute('style','border:0;')
      }
      // elements = document.getElementsByClassName("ql-editor")
      // for(let i=0;i<elements.length;i++){
      //   elements[i].setAttribute('style','min-height:300px;')
      // }
      setTimeout(() => {

        let htmlBtn:any = document.querySelector('.ql-HTML');
        htmlBtn.innerHTML = 'HTML'
        htmlBtn.style.width = '50px'
        htmlBtn.addEventListener('click', (event:any)=> {
          this.data.value = this.data.value
          .split('</ol><p><br></p><p>').join('</ol>')
          .split('</p><p><br></p><ol>').join('<ol>')
          .split('</ul><p><br></p><p>').join('</ul>')
          .split('</p><p><br></p><ul>').join('<ul>')
          .split('<p><br></p>').join('<br>')
          .split('</p><br><p>').join('<br><br>')
          .split('</p><p>').join('<br>')
          .split('&nbsp;').join(' ')

          this.showHtml = true 
        });
      },300)
    },100)
  }

  dismiss(){
    if(!this.data.value){
      this.data.value = ''
    }
    this.data.value = this.data.value
    .split('</ol><p><br></p><p>').join('</ol>')
    .split('</p><p><br></p><ol>').join('<ol>')
    .split('</ul><p><br></p><p>').join('</ul>')
    .split('</p><p><br></p><ul>').join('<ul>')
    .split('<p><br></p>').join('<br>')
    .split('</p><br><p>').join('<br><br>')
    .split('</p><p>').join('<br>')
    .split('&nbsp;').join(' ')

    this.modal.dismiss(this.data)
  }
}
