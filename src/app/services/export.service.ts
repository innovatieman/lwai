import { Injectable } from '@angular/core';
import { jsPDF } from "jspdf";
import { ToastService } from './toast.service';
import { AuthService } from '../auth/auth.service';
import { HelpersService } from './helpers.service';
import { CleanReactionPipe } from '../pipes/clean-reaction.pipe';
import { InfoService } from './info.service';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  private printDoc:any = {}

  constructor(
    private toast:ToastService,
    private auth:AuthService,
    private helper:HelpersService,
    private cleanReactionPipe:CleanReactionPipe,
    private infoService:InfoService,
    private translate:TranslateService
  ) { }

  
    // public async caseToPdfOld(conversation:any,closing:boolean=true,skills:boolean=true,transcript:boolean=true){
    //   console.log(conversation)
    //   this.toast.showLoader('Het document wordt gegenereerd...')
  
    //   let doc:any = {
    //     title: conversation.title,
    //     user: this.auth.userInfo.displayName,
    //     messages: JSON.parse(JSON.stringify(conversation.messages)),
    //     goal:'',
    //     close:'',
    //     date: this.helper.showLocalDate(conversation.timestamp,'',0,true),
    //     photo: conversation.photo,
  
    //   }
    //   doc.messages.splice(0,1)
    //   if(conversation.close?.length>0){
    //     doc.close = conversation.close[0].content
    //   }
    //   for(let i=0;i<doc.messages.length;i++){
    //     if(doc.messages[i].role == 'user'){
    //       doc.messages[i].role = this.auth.userInfo.displayName
    //       doc.messages[i].feedbackCipher = this.getFeedbackChat(conversation,i+1,'feedbackCipher')
    //       doc.messages[i].feedback = this.getFeedbackChat(conversation,i+1,'feedback')
    //     }
    //     else if(doc.messages[i].role == 'assistant'){
    //       doc.messages[i].role = 'Gesprekspartner'
    //       doc.messages[i].attitude = this.infoService.getAttitude(this.getAttitude(conversation,i+1)).title
    //       doc.messages[i].content = this.cleanReactionPipe.transform(doc.messages[i].content)
    //     }
    //   } 
  
    //   if(conversation?.goalsItems?.free){
    //     doc.goal = conversation.goalsItems.free
    //   }
  
  
  
    //   this.printDoc = doc
  
    //   let countPages = 1
  
  
    //   let pdf = new jsPDF('p', 'pt', 'a4');
  
    //   let pageHeight = pdf.internal.pageSize.height;
    //   let pageWidth = pdf.internal.pageSize.width;
    //   let margin = 72;
    //   let y = margin;
    //   let x = margin;
      
    //   pdf.addImage('./assets/img/logo_full_black.png', 'PNG', x+35, y, 136*2.5, 30*2.5);
    //   y += 150;
  
    //   pdf.setFontSize(24);
    //   pdf.text(doc.title, x, y);
    //   y += 30;
  
    //   pdf.setFontSize(20);
    //   pdf.text(doc.user, x, y);
    //   y += 30;
    //   pdf.setFontSize(12);
    //   pdf.text(doc.date, x, y);
  
    //   if(doc.goal){
    //     y += 50;
    //     pdf.setFontSize(14);
    //     pdf.text('Doel:', x, y);
    //     y += 20;
    //     pdf.setFontSize(12);
    //     //doc.goal moet passen in de breedte van de pagina
    //     let textLines = pdf.splitTextToSize(doc.goal, pageWidth - margin * 2);
    //     pdf.text(textLines, x, y);
    //   }
  
  
  
  
    //   pdf.addPage();
    //   countPages++;
    //   y = 72;
    //   pdf.setFontSize(20);
    //   pdf.text('Het gesprek:', x, y);
    //   y += 30;
    //   pdf.setFontSize(12);
    //   for (let i = 0; i < doc.messages.length; i++) {
    //     if (y > pageHeight - margin) {
    //       pdf.addPage();
    //       countPages++;
    //       y = margin;
    //     }
  
    //     if (doc.messages[i].role === 'Gesprekspartner') {
    //       pdf.setFontSize(12);
  
    //       let text = doc.messages[i].content;
    //       let textLines = pdf.splitTextToSize(text, (pageWidth - margin * 2) * 0.75);
    //       let lineHeight = pdf.getLineHeight();
    //       let textSpace = lineHeight * textLines.length;
  
    //       if (textSpace > pageHeight - y - margin) {
    //         pdf.addPage();
    //         countPages++;
    //         y = margin;
    //       }
  
    //       // Tekst met zwarte border en border-radius
    //       pdf.setDrawColor(0);
    //       pdf.setLineWidth(1);
    //       let boxWidth = (pageWidth - margin * 2) * 0.75;
    //       let boxHeight = textSpace + 10;
    //       pdf.roundedRect(x, y, boxWidth, boxHeight, 8, 8, 'S');
  
    //       pdf.text(textLines, x + 5, y + 15);
    //       y += boxHeight + 10;
  
    //       pdf.setFontSize(10);
    //       let attitudeLines = pdf.splitTextToSize('Attitude: ' + doc.messages[i].attitude, (pageWidth - margin * 2) * 0.75);
    //       pdf.text(attitudeLines, x, y);
    //       y += pdf.getLineHeight() * attitudeLines.length + 10;
  
    //     } else if (doc.messages[i].role === this.auth.userInfo.displayName) {
    //       pdf.setFontSize(12);
  
    //       let text = doc.messages[i].content;
    //       let textLines = pdf.splitTextToSize(text, (pageWidth - margin * 2) * 0.75);
    //       let lineHeight = pdf.getLineHeight();
    //       let textSpace = lineHeight * textLines.length;
  
    //       if (textSpace > pageHeight - y - margin) {
    //         pdf.addPage();
    //         countPages++;
    //         y = margin;
    //       }
  
    //       // Tekst met zwarte border, border-radius en lichtgroene achtergrond
    //       pdf.setDrawColor(0);
    //       pdf.setLineWidth(1);
    //       pdf.setFillColor(204, 255, 204); // Lichtgroene achtergrond
    //       let boxWidth = (pageWidth - margin * 2) * 0.75;
    //       let boxHeight = textSpace + 10;
    //       let boxX = pageWidth - margin - boxWidth;
    //       pdf.roundedRect(boxX, y, boxWidth, boxHeight, 8, 8, 'FD');
  
    //       pdf.text(textLines, boxX + 5, y + 15);
    //       y += boxHeight + 10;
  
    //       pdf.setFontSize(10);
    //       let feedbackLines = pdf.splitTextToSize('Feedback: ' + doc.messages[i].feedback, (pageWidth - margin * 2) * 0.75);
    //       pdf.text(feedbackLines, boxX, y);
    //       y += pdf.getLineHeight() * feedbackLines.length + 10;
  
    //       let feedbackCipherLines = pdf.splitTextToSize('Cijfer: ' + doc.messages[i].feedbackCipher, (pageWidth - margin * 2) * 0.75);
    //       pdf.text(feedbackCipherLines, boxX, y);
    //       y += pdf.getLineHeight() * feedbackCipherLines.length + 10;
    //     }
    //   }
  
    //   pdf.addPage();
    //   countPages++;
    //   y = 72;
    //   pdf.setFontSize(20);
    //   pdf.text('Eindevaluatie', x, y);
  
    //   y += 30;
    //   pdf.setFontSize(12);
  
    //   if(doc.close){
    //     let htmlContent = doc.close;
  
  
    //     const tempDiv = document.createElement("div");
    //     tempDiv.style.width = "600px"; // Zorg dat de breedte overeenkomt met een standaard vensterbreedte
    //     tempDiv.innerHTML = htmlContent;
    //     document.body.appendChild(tempDiv);
  
    //     // Ga naar de laatste pagina of voeg een nieuwe pagina toe
    //     const currentPage = pdf.getCurrentPageInfo().pageNumber;
    //     const totalPages = pdf.getNumberOfPages();
  
    //     if (currentPage !== totalPages) {
    //       pdf.setPage(totalPages); // Ga naar de laatste pagina
    //     }
  
    //     // pdf.addPage(); // Voeg een nieuwe pagina toe aan het einde
  
    //     // Render de HTML op de nieuwe pagina
    //     pdf.html(tempDiv, {
    //       callback: (doc) => {
    //         // Sla de PDF op na het toevoegen van de HTML
    //         setTimeout(() => {
    //           doc.save('gespreksverslag.pdf');   
    //           this.toast.hideLoader()
    //           this.toast.show('Het document is gegenereerd en wordt gedownload.')   
    //         }, 1000);
    //       },
    //       x: 30, // Marges
    //       y: ((countPages-1) * pageHeight) + 80, // Voeg de hoogte van de vorige pagina's toe
    //       width: 100, // Schaal de inhoud naar de beschikbare breedte van een A4-pagina
    //       html2canvas: {
    //         scale: 0.8, // Verhoog de schaal om de inhoud leesbaarder te maken
    //       },
    //       autoPaging: true, // Zorg ervoor dat lange inhoud wordt opgesplitst over meerdere pagina's
    //     });
  
    //     // Verwijder het tijdelijke element
    //     document.body.removeChild(tempDiv);
    //   }
    //   else{
    //     setTimeout(() => {
    //       pdf.save('gespreksverslag.pdf');      
    //       this.toast.hideLoader()
    //       this.toast.show('Het document is gegenereerd en wordt gedownload.')
    //     }, 1000);
    //   }
  
  
  
  
    // }
  
    async caseToPdf(conversation:any){
      console.log(conversation)
      this.toast.showLoader(this.translate.instant('conversation.pdf.creating'))
  
      let doc:any = {
        title: conversation.title,
        user: this.auth.userInfo.displayName,
        messages: JSON.parse(JSON.stringify(conversation.messages)),
        goal:'',
        close:'',
        date: this.helper.showLocalDate(conversation.timestamp,'',0,true),
        photo: conversation.photo,
  
      }
      doc.messages.splice(0,1)
      if(conversation.close?.length>0){
        doc.close = conversation.close[0].content
      }
      for(let i=0;i<doc.messages.length;i++){
        if(doc.messages[i].role == 'user'){
          doc.messages[i].role = this.auth.userInfo.displayName
          doc.messages[i].feedbackCipher = this.getFeedbackChat(conversation,i+1,'feedbackCipher')
          doc.messages[i].feedback = this.getFeedbackChat(conversation,i+1,'feedback')
        }
        else if(doc.messages[i].role == 'assistant'){
          doc.messages[i].role = 'Gesprekspartner'
          doc.messages[i].attitude = this.infoService.getAttitude(this.getAttitude(conversation,i+1)).title
          doc.messages[i].content = this.cleanReactionPipe.transform(doc.messages[i].content)
        }
      } 
  
      if(conversation?.goalsItems?.free){
        doc.goal = conversation.goalsItems.free
      }
  
  
  
      this.printDoc = doc
      console.log(doc)
  
      let countPages = 1
  
  
      let pdf = new jsPDF('p', 'pt', 'a4');
  
      let pageHeight = pdf.internal.pageSize.height;
      let pageWidth = pdf.internal.pageSize.width;
      let margin = 72;
      let y = margin;
      let x = margin;
      pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
      
      pdf.addImage('./assets/img/logo_full_black.png', 'PNG', x+35, y, 136*2.5, 30*2.5);
      y += 150;
  
      pdf.setFontSize(24);
      pdf.text(doc.title, x, y);
      y += 30;
  
      pdf.setFontSize(20);
      pdf.text(this.translate.instant('conversation.pdf.title_name') + ' ' + doc.user, x, y);
      y += 30;
      pdf.setFontSize(12);
      pdf.text(doc.date, x, y);
  
      if(doc.goal){
        y += 50;
        pdf.setFontSize(14);
        pdf.text('Doel:', x, y);
        y += 20;
        pdf.setFontSize(12);
        //doc.goal moet passen in de breedte van de pagina
        let textLines = pdf.splitTextToSize(doc.goal, pageWidth - margin * 2);
        pdf.text(textLines, x, y);
      }
  
  
  
  
      pdf.addPage();
      pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
      pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
      countPages++;
      y = 72;
      pdf.setFontSize(20);
      pdf.text(this.translate.instant('conversation.pdf.conversation')+':', x, y);
      y += 30;
      pdf.setFontSize(12);
      for (let i = 0; i < doc.messages.length; i++) {
        if (y > pageHeight - margin) {
          pdf.addPage();
          pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
          pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
          countPages++;
          y = margin;
        }
  
        if (doc.messages[i].role === 'Gesprekspartner') {
          pdf.setFontSize(12);
  
          let text = doc.messages[i].content;
          let textLines = pdf.splitTextToSize(text, (pageWidth - margin * 2) * 0.75);
          let lineHeight = pdf.getLineHeight();
          let textSpace = lineHeight * textLines.length;
  
          if (textSpace > pageHeight - y - margin) {
            pdf.addPage();
            pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
            pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
  
            countPages++;
            y = margin;
          }
  
          // Tekst met zwarte border en border-radius
          pdf.setDrawColor(32,66,137);
          pdf.setLineWidth(1);
          let boxWidth = (pageWidth - margin * 2) * 0.75;
          let boxHeight = textSpace + 5;
          pdf.roundedRect(x, y, boxWidth+10, boxHeight, 8, 8, 'S');
          pdf.setTextColor(32,66,137);
          pdf.text(textLines, x + 5, y + 15);
          y += boxHeight + 20;
  
          pdf.setFontSize(12);
          // pdf.setTextColor(0);
          pdf.setFont('Helvetica','bold')
          pdf.text('Attitude:', x, y);
          pdf.setFont('Helvetica','')
          let attitudeLines = pdf.splitTextToSize(doc.messages[i].attitude, (pageWidth - margin * 2) * 0.75);
          pdf.text(attitudeLines, x + 50, y);
          y += pdf.getLineHeight() * attitudeLines.length + 10;
  
        } else if (doc.messages[i].role === this.auth.userInfo.displayName) {
          pdf.setFontSize(12);
  
          let text = doc.messages[i].content;
          let textLines = pdf.splitTextToSize(text, (pageWidth - margin * 2) * 0.75);
          let lineHeight = pdf.getLineHeight();
          let textSpace = lineHeight * textLines.length;
  
          if (textSpace > pageHeight - y - margin) {
            pdf.addPage();
            pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
            pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
            countPages++;
            y = margin;
          }
  
          // Tekst met zwarte border, border-radius en lichtgroene achtergrond
          pdf.setDrawColor(32,66,137);
          pdf.setLineWidth(1);
          pdf.setFillColor(116, 150, 223)
          // pdf.setFillColor(204, 255, 204); // Lichtgroene achtergrond
          let boxWidth = (pageWidth - margin * 2) * 0.75;
          let boxHeight = textSpace + 10;
          let boxX = pageWidth - margin - boxWidth;
          pdf.roundedRect(boxX, y, boxWidth+10, boxHeight, 8, 8, 'FD');
  
          pdf.setTextColor(255);
          pdf.text(textLines, boxX + 5, y + 15);
          y += boxHeight + 15;
  
          pdf.setTextColor(0);
          pdf.setFont('Helvetica','bold')
          pdf.text(this.translate.instant('conversation.pdf.cipher')+':', boxX, y);
          pdf.setFont('Helvetica','')
  
          let feedbackCipherLines = pdf.splitTextToSize(doc.messages[i].feedbackCipher, (pageWidth - margin * 2) * 0.75);
          pdf.text(feedbackCipherLines, boxX+50, y);
          y += pdf.getLineHeight() * feedbackCipherLines.length + 10;
  
          pdf.setFontSize(12);
          pdf.setFont('Helvetica','bold')
          pdf.text(this.translate.instant('conversation.pdf.feedback')+':', boxX, y);
          pdf.setFont('Helvetica','')
  
          y += 15;
          let feedbackLines = pdf.splitTextToSize(doc.messages[i].feedback, (pageWidth - margin * 2) * 0.75);
          pdf.text(feedbackLines, boxX, y);
          y += pdf.getLineHeight() * feedbackLines.length + 10;
  
          
        }
      }
  
      pdf.addPage();
      pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
      pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
      countPages++;
      y = 72;
      pdf.setFontSize(20);
      pdf.text(this.translate.instant('conversation.pdf.evaluation'), x, y);
  
      y += 30;
      pdf.setFontSize(12);
  
      if(doc.close){
        let htmlContent = doc.close;
  
  
        const tempDiv = document.createElement("div");
        tempDiv.style.width = "600px"; // Zorg dat de breedte overeenkomt met een standaard vensterbreedte
        tempDiv.innerHTML = htmlContent;
        document.body.appendChild(tempDiv);
  
        // Ga naar de laatste pagina of voeg een nieuwe pagina toe
        const currentPage = pdf.getCurrentPageInfo().pageNumber;
        const totalPages = pdf.getNumberOfPages();
  
        if (currentPage !== totalPages) {
          pdf.setPage(totalPages); // Ga naar de laatste pagina
        }
  
        // pdf.addPage(); // Voeg een nieuwe pagina toe aan het einde
  
        // Render de HTML op de nieuwe pagina
        pdf.html(tempDiv, {
          callback: (doc) => {
            // Sla de PDF op na het toevoegen van de HTML
            setTimeout(() => {
              doc.save('gespreksverslag.pdf');   
              this.toast.hideLoader()
              this.toast.show('Het document is gegenereerd en wordt gedownload.')   
            }, 1000);
          },
          x: 50, // Marges
          y: ((countPages-1) * pageHeight) + 80, // Voeg de hoogte van de vorige pagina's toe
          width: 100, // Schaal de inhoud naar de beschikbare breedte van een A4-pagina
          html2canvas: {
            scale: 0.8, // Verhoog de schaal om de inhoud leesbaarder te maken
          },
          autoPaging: true, // Zorg ervoor dat lange inhoud wordt opgesplitst over meerdere pagina's
        });
  
        // Verwijder het tijdelijke element
        document.body.removeChild(tempDiv);
      }
      else{
        setTimeout(() => {
          pdf.save('gespreksverslag.pdf');      
          this.toast.hideLoader()
          this.toast.show('Het document is gegenereerd en wordt gedownload.')
        }, 1000);
      }
  
  
  
  
    }
    
  
    async addImageToPdf(pdf:any, imageUrl:string, x:number, y:number, width:number, height:number) {
      try {
        // Stap 1: Laad de afbeelding als Blob met fetch
        const response = await fetch(imageUrl, { mode: "cors" });
        if (!response.ok) {
          throw new Error(`Kan de afbeelding niet laden: ${response.statusText}`);
        }
        const blob = await response.blob();
    
        // Stap 2: Converteer de Blob naar een Base64-string
        const base64 = await this.blobToBase64(blob);
    
        // Stap 3: Voeg de afbeelding toe aan de PDF
        pdf.addImage(base64, 'PNG', x, y, width, height);
      } catch (error) {
        console.error("Fout bij het toevoegen van de afbeelding:", error);
      }
    }
    
    private blobToBase64(blob:any) {
      return new Promise((resolve, reject) => {
        const reader:any = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(",")[1]); // Haal de Base64-string op
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }


    // private getFeedbackChatOld(conversation:any,index:number,type:string){
    //   let messages = JSON.parse(JSON.stringify(conversation.messages))
    //   let userMessages = []
    //   for(let i=0;i<messages.length;i++){
    //     if(messages[i].role == 'user'){
    //       messages[i].index = i
    //       userMessages.push(messages[i])
    //     }
    //   }
    //   let newIndex = -1
    //   for(let i=0;i<userMessages.length;i++){
    //     if(userMessages[i].index == index){
    //       newIndex = i
    //     }
    //   }
    //   if(newIndex<0 || !conversation.feedback || conversation.feedback.length<1 || !conversation.feedback[newIndex]){
    //     return '';
    //   }
    //   let feedback:any = {}
    //   if(conversation.feedback[newIndex].content.substring(0,1) != '{'){
    //   let feedback:any = {}
    //     feedback= conversation.feedback[newIndex].content.split('```json').join('').split('```').join('')
    //   }
    //   else{
    //     feedback = JSON.parse(conversation.feedback[newIndex].content)
    //   } 
    //   if(type=='id'){
    //     return conversation.feedback[newIndex].id
    //   }
    //   return feedback[type];
    // }
    
    getFeedbackChat(conversation:any,index:number,type:string){
      let messages = JSON.parse(JSON.stringify(conversation.messages))
      let userMessages = []
      for(let i=0;i<messages.length;i++){
        if(messages[i].role == 'user'){
          messages[i].index = i
          userMessages.push(messages[i])
        }
      }
      let newIndex = -1
      for(let i=0;i<userMessages.length;i++){
        if(userMessages[i].index == index){
          newIndex = i
        }
      }
  
      if(newIndex<0 || !conversation.feedback || conversation.feedback.length<1 || !conversation.feedback[newIndex]){
        return '';
      }
      let feedback:any = {}
      if(conversation.feedback[newIndex].content.substring(0,1) != '{'){
        // let feedback:any = {}
        feedback= conversation.feedback[newIndex].content.split('```json').join('').split('```').join('')
      }
      else{
        feedback = JSON.parse(conversation.feedback[newIndex].content)
      } 
      if(typeof feedback =='string'){
        feedback = JSON.parse(feedback)
      }
      
      if(type=='id'){
        return conversation.feedback[newIndex].id
      }
      return feedback[type];
    }

    getAttitude(conversation:any,index:number){
      // console.log(index)
      if(!conversation.messages||conversation.messages.length<1){
        return 0;
      }
      let messages = JSON.parse(JSON.stringify(conversation.messages))
      let assistantMessage = messages[index].content
      // console.log(index,messages,assistantMessage)
      let attitude = 0
      let attitudeString = ''
      if(assistantMessage.includes('reaction:')){
        attitudeString = assistantMessage.replace('newAttitude:','').split(', reaction:')[0]
        attitude = parseInt(this.clearStringNumbers(attitudeString))
      }
      return attitude;
    }



    clearStringNumbers(input: string) {
      return input.split('{').join('').split('}').join('')
    }
    clearStringChars(input: string) {
      return input.split('{').join('').split('}').join('')
    }
}
