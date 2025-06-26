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


  async caseToPdf(conversation:any){
    
    // console.log(conversation)
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
        doc.messages[i].feedbackCipher = this.getFeedbackChat(conversation,i+1,'feedbackCipher', doc.messages[i].id)
        doc.messages[i].feedback = this.getFeedbackChat(conversation,i+1,'feedback', doc.messages[i].id)
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
    if(conversation?.free_question || conversation?.free_question2 || conversation?.free_question3 || conversation?.free_question4){
      doc.free_question = conversation.free_question || '';
      doc.free_question2 = conversation.free_question2 || '';
      doc.free_question3 = conversation.free_question3 || '';
      doc.free_question4 = conversation.free_question4 || '';
      doc.free_answer = conversation.free_answer || '';
      doc.free_answer2 = conversation.free_answer2 || '';
      doc.free_answer3 = conversation.free_answer3 || '';
      doc.free_answer4 = conversation.free_answer4 || '';
    }



    this.printDoc = doc
    // console.log(doc)

    let countPages = 1


    let pdf = new jsPDF('p', 'pt', 'a4');

    pdf.addFont("./assets/fonts/PlusJakartaSans-Regular.ttf", "PlusJakartaSans", "normal");
    pdf.addFont("./assets/fonts/PlusJakartaSans-Bold.ttf", "PlusJakartaSans", "bold");
    pdf.setCharSpace(0.5);

    
    let pageHeight = pdf.internal.pageSize.height;
    let pageWidth = pdf.internal.pageSize.width;
    let margin = 72;
    let y = margin;
    let x = margin;
    pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
    
    pdf.addImage('./assets/img/logo_full_black.png', 'PNG', x+35, y, 136*2.5, 30*2.5);
    y += 150;

    pdf.setFontSize(24);
    pdf.setFont('PlusJakartaSans','bold');
    let title = pdf.splitTextToSize(doc.title, pageWidth - margin * 2);
    pdf.text(title, x, y);
    // pdf.text(doc.title, x, y);
    y += title.length * 24 + 20;
    // y += 30;

    pdf.setFontSize(20);
     pdf.setFont('PlusJakartaSans','normal');
    pdf.text(this.translate.instant('conversation.pdf.title_name') + ' ' + doc.user, x, y);
    y += 30;
    pdf.setFontSize(12);
    pdf.text(doc.date, x, y);

    if(doc.goal){
      y += 50;
      pdf.setFontSize(14);
      pdf.setFont('PlusJakartaSans','bold');
      pdf.text(this.translate.instant('conversation.goal')+':', x, y);
      y += 20;
      pdf.setFontSize(12);
      pdf.setFont('PlusJakartaSans','normal');
      //doc.goal moet passen in de breedte van de pagina
      let textLines = pdf.splitTextToSize(doc.goal.substring(0,300) + (doc.goal.length>300 ? '...' : ''), pageWidth - margin * 2);
      pdf.text(textLines, x, y);
      y += textLines.length * 14 + 10; // Adjust y position based on the number of lines
    }

    if(doc.free_question || doc.free_question2 || doc.free_question3 || doc.free_question4){
      // y += 40;
      // pdf.setFontSize(14);
      // pdf.setFont('PlusJakartaSans','bold');
      // pdf.text(this.translate.instant('conversation.free_questions').toUpperCase()+':', x, y);
      // y += 20;

      if(doc.free_question && doc.free_answer){
        pdf.setFontSize(14);
        pdf.setFont('PlusJakartaSans','bold');
        let textLines = pdf.splitTextToSize(doc.free_question, pageWidth - margin * 2);
        pdf.text(textLines, x, y);
        y += textLines.length * 14 + 10; // Adjust y position based on the number of lines
        pdf.setFontSize(12);
        pdf.setFont('PlusJakartaSans','normal');
        textLines = pdf.splitTextToSize(doc.free_answer.substring(0,300) + (doc.free_answer.length>300 ? '...' : ''), pageWidth - margin * 2);
        pdf.text(textLines, x, y);
        y += textLines.length * 12 + 20; // Adjust y position based on the number of lines
      }
      if(doc.free_question2 && doc.free_answer2){
        pdf.setFontSize(14);
        pdf.setFont('PlusJakartaSans','bold');
        let textLines = pdf.splitTextToSize(doc.free_question2, pageWidth - margin * 2);
        pdf.text(textLines, x, y);
        y += textLines.length * 14 + 10; // Adjust y position based on the number of lines
        pdf.setFontSize(12);
        pdf.setFont('PlusJakartaSans','normal');
        textLines = pdf.splitTextToSize(doc.free_answer2.substring(0,300) + (doc.free_answer2.length>300 ? '...' : ''), pageWidth - margin * 2);
        pdf.text(textLines, x, y);
        y += textLines.length * 12 + 20; // Adjust y position based on the number of lines
      }
      if(doc.free_question3 && doc.free_answer3){
        pdf.setFontSize(14);
        pdf.setFont('PlusJakartaSans','bold');
        let textLines = pdf.splitTextToSize(doc.free_question3, pageWidth - margin * 2);
        pdf.text(textLines, x, y);
        y += textLines.length * 14 + 10; // Adjust y position based on the number of lines
        pdf.setFontSize(12);
        pdf.setFont('PlusJakartaSans','normal');
        textLines = pdf.splitTextToSize(doc.free_answer3.substring(0,300) + (doc.free_answer3.length>300 ? '...' : ''), pageWidth - margin * 2);
        pdf.text(textLines, x, y);
        y += textLines.length * 12 + 20; // Adjust y position based on the number of lines
      }
      if(doc.free_question4 && doc.free_answer4){
        pdf.setFontSize(14);
        pdf.setFont('PlusJakartaSans','bold');
        let textLines = pdf.splitTextToSize(doc.free_question4, pageWidth - margin * 2);
        pdf.text(textLines, x, y);
        y += textLines.length * 14 + 10; // Adjust y position based on the number of lines
        pdf.setFontSize(12);
        pdf.setFont('PlusJakartaSans','normal');
        textLines = pdf.splitTextToSize(doc.free_answer4.substring(0,300) + (doc.free_answer4.length>300 ? '...' : ''), pageWidth - margin * 2);
        pdf.text(textLines, x, y);
        y += textLines.length * 12 + 20; // Adjust y position based on the number of lines
      }
      
    }

    pdf.addPage();
    pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
    pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
    countPages++;
    y = 55;
    pdf.setFontSize(20);
    pdf.setFont('PlusJakartaSans','bold');
    pdf.text(this.translate.instant('conversation.pdf.disclaimer').toUpperCase()+':', x, y);
    pdf.setFontSize(12);
    pdf.setFont('PlusJakartaSans','normal');
    y += 35;
    
    pdf.line(x-margin, y, pageWidth, y); // Draw line
    y += 40;

    pdf.setFontSize(12);
    pdf.setFont('PlusJakartaSans','bold');
    pdf.text(this.translate.instant('conversation.pdf.disclaimer_title')+':', x, y);
    y += 20;
    pdf.setFont('PlusJakartaSans','normal');
    let textLines = pdf.splitTextToSize(this.translate.instant('conversation.pdf.disclaimer_text'), pageWidth - margin * 2);
    pdf.text(textLines, x, y);





    pdf.addPage();
    pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
    pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
    countPages++;
    y = 55;
    pdf.setFontSize(20);
    pdf.setFont('PlusJakartaSans','bold');
    pdf.text(this.translate.instant('conversation.pdf.conversation').toUpperCase()+':', x, y);
    pdf.setFontSize(12);
    pdf.setFont('PlusJakartaSans','normal');
    y += 35;
    
    pdf.line(x-margin, y, pageWidth, y); // Draw line
    y += 40;
    // pdf.setFontSize(12);
    //  pdf.setFont('PlusJakartaSans','bold');
 

    for (let i = 0; i < doc.messages.length; i++) {
      const msg = doc.messages[i];

      // Set gemeenschappelijke instellingen
      pdf.setFontSize(12);
      const lineHeight = pdf.getLineHeight();
      const maxWidth = (pageWidth - margin * 2)// * 0.75;

      if (msg.role === 'Gesprekspartner') {

        pdf.setTextColor(0);
        pdf.setFont('PlusJakartaSans','bold');
        pdf.setFontSize(13);
        

        let answerLabel = this.translate.instant('conversation.pdf.answer').toUpperCase() + ':';
        if (y + lineHeight > pageHeight - margin) {
          pdf.addPage();
          pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
          pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
          countPages++;
          y = 55;
          pdf.setFontSize(20);
          pdf.setFont('PlusJakartaSans','bold');
          pdf.text(this.translate.instant('conversation.pdf.conversation').toUpperCase()+':', x, y);
          pdf.setFontSize(12);
          pdf.setFont('PlusJakartaSans','normal');
          y += 35;
          
          pdf.line(x-margin, y, pageWidth, y); // Draw line
          y += 40;
        }
        pdf.setFont('PlusJakartaSans','bold');
        pdf.text(answerLabel, x, y);
        y += 15;
        
        pdf.setFont('PlusJakartaSans','normal');
        pdf.setFontSize(12);

        let textLines = pdf.splitTextToSize(msg.content, maxWidth);

        for (let j = 0; j < textLines.length; j++) {
          if (y + lineHeight > pageHeight - margin) {
            pdf.addPage();
            pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
            pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
            countPages++;
            y = 55;
            pdf.setFontSize(20);
            pdf.setFont('PlusJakartaSans','bold');
            pdf.text(this.translate.instant('conversation.pdf.conversation').toUpperCase()+':', x, y);
            pdf.setFontSize(12);
            pdf.setFont('PlusJakartaSans','normal');
            y += 35;
            
            pdf.line(x-margin, y, pageWidth, y); // Draw line
            y += 40;
          }
          // pdf.setDrawColor(32, 66, 137);
          // pdf.setLineWidth(1);
          // pdf.setFillColor(255, 255, 255);
          // pdf.setTextColor(32, 66, 137);

          // if (j === 0) {
          //   let totalHeight = lineHeight * textLines.length + 20;
          //   pdf.roundedRect(x - 5, y - 10, maxWidth + 10, totalHeight, 8, 8, 'FD');
          // }

          pdf.text(textLines[j], x, y);
          y += lineHeight;
        }
        y += 30;

        // Attitude label
        pdf.setFont('PlusJakartaSans','bold');
        pdf.setFontSize(13);
        let attLabel = this.translate.instant('conversation.pdf.attitude').toUpperCase() + ':';
        if (y + lineHeight > pageHeight - margin) {
          pdf.addPage();
          pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
          pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
          countPages++;
          y = 55;
          pdf.setFontSize(20);
          pdf.setFont('PlusJakartaSans','bold');
          pdf.text(this.translate.instant('conversation.pdf.conversation').toUpperCase()+':', x, y);
          pdf.setFontSize(12);
          pdf.setFont('PlusJakartaSans','normal');
          y += 35;
          
          pdf.line(x-margin, y, pageWidth, y); // Draw line
          y += 40;
        }
        pdf.setTextColor(0);
        pdf.setFont('PlusJakartaSans','bold');
        pdf.text(attLabel, x, y);

        pdf.setFont('PlusJakartaSans','normal');
        pdf.setFontSize(12);
        y = y + 15;
        pdf.text(msg.attitude, x, y);
        
        y += 30;

        if (y + lineHeight > pageHeight - margin) {
          pdf.addPage();
          pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
          pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
          countPages++;
          y = 55;
          pdf.setFontSize(20);
          pdf.setFont('PlusJakartaSans','bold');
          pdf.text(this.translate.instant('conversation.pdf.conversation').toUpperCase()+':', x, y);
          pdf.setFontSize(12);
          pdf.setFont('PlusJakartaSans','normal');
          y += 35;
          
          pdf.line(x-margin, y, pageWidth, y); // Draw line
          y += 40;
        }

        pdf.line(x, y, pageWidth - margin, y); // Draw line
        y += 30;

      } else if (msg.role === this.auth.userInfo.displayName) {
        // const boxWidth = maxWidth;
        // const boxX = x // pageWidth - margin// - boxWidth;

        pdf.setTextColor(0);
        pdf.setFont('PlusJakartaSans','bold');
        pdf.setFontSize(13);

        let userLabel = this.translate.instant('conversation.pdf.user_input').toUpperCase() + ':';
        if (y + lineHeight > pageHeight - margin) {
          pdf.addPage();
          pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
          pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
          countPages++;
          y = 55;
          pdf.setFontSize(20);
          pdf.setFont('PlusJakartaSans','bold');
          pdf.text(this.translate.instant('conversation.pdf.conversation').toUpperCase()+':', x, y);
          pdf.setFontSize(12);
          pdf.setFont('PlusJakartaSans','normal');
          y += 35;
          
          pdf.line(x-margin, y, pageWidth, y); // Draw line
          y += 40;
        }
        pdf.setFont('PlusJakartaSans','bold');
        pdf.text(userLabel, x, y);
        y += 15;

        pdf.setFont('PlusJakartaSans','normal');
        pdf.setFontSize(12);

        // content
        let contentLines = pdf.splitTextToSize(msg.content, maxWidth);
        // pdf.setDrawColor(32, 66, 137);
        // pdf.setLineWidth(1);
        // pdf.setFillColor(116, 150, 223);
        // pdf.setTextColor(255);
        pdf.setFont('PlusJakartaSans','normal');

        for (let j = 0; j < contentLines.length; j++) {
          if (y + lineHeight + 15 > pageHeight - margin) {
            pdf.addPage();
            pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
            pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
            countPages++;
            y = 55;
            pdf.setFontSize(20);
            pdf.setFont('PlusJakartaSans','bold');
            pdf.text(this.translate.instant('conversation.pdf.conversation').toUpperCase()+':', x, y);
            pdf.setFontSize(12);
            pdf.setFont('PlusJakartaSans','normal');
            y += 35;
            
            pdf.line(x-margin, y, pageWidth, y); // Draw line
            y += 40;
          }
          // if (j === 0) {
          //   let totalHeight = lineHeight * contentLines.length + 20;
          //   pdf.roundedRect(x - 5, y - 10, maxWidth + 10, totalHeight, 8, 8, 'FD');
          // }
          pdf.text(contentLines[j], x, y);
          y += lineHeight;
          
        }

        y += 30;

        // feedbackCipher
        pdf.setTextColor(0);
        pdf.setFont('PlusJakartaSans','bold');
        pdf.setFontSize(13);

        let cipherLabel = this.translate.instant('conversation.pdf.cipher').toUpperCase() + ':';
        if (y + lineHeight > pageHeight - margin) {
          pdf.addPage();
          pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
          pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
          countPages++;
          y = 55;
          pdf.setFontSize(20);
          pdf.setFont('PlusJakartaSans','bold');
          pdf.text(this.translate.instant('conversation.pdf.conversation').toUpperCase()+':', x, y);
          pdf.setFontSize(12);
          pdf.setFont('PlusJakartaSans','normal');
          y += 35;
          
          pdf.line(x-margin, y, pageWidth, y); // Draw line
          y += 40;
        }
        pdf.setFont('PlusJakartaSans','bold');
        pdf.text(cipherLabel, x, y);
        pdf.setFont('PlusJakartaSans','normal');
        pdf.setFontSize(12);
        y += 15;
        if(msg.feedbackCipher){
          pdf.text(msg.feedbackCipher, x, y);
        }
        // pdf.text(msg.feedbackCipher, x, y);

        y += 30;

        // feedback
        pdf.setFont('PlusJakartaSans','bold');
        pdf.setFontSize(13);

        let feedbackLabel = this.translate.instant('conversation.pdf.feedback').toUpperCase() + ':';
        if (y + lineHeight > pageHeight - margin) {
          pdf.addPage();
          pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
          pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
          countPages++;
          y = 55;
          pdf.setFontSize(20);
          pdf.setFont('PlusJakartaSans','bold');
          pdf.text(this.translate.instant('conversation.pdf.conversation').toUpperCase()+':', x, y);
          pdf.setFontSize(12);
          pdf.setFont('PlusJakartaSans','normal');
          y += 35;
          
          pdf.line(x-margin, y, pageWidth, y); // Draw line
          y += 40;
        }
        pdf.setFont('PlusJakartaSans','bold');
        pdf.text(feedbackLabel, x, y);
        y += 15;
        pdf.setFont('PlusJakartaSans','normal');
        pdf.setFontSize(12);

         let feedbackLines = []
        if(msg.feedback){
          feedbackLines = pdf.splitTextToSize(msg.feedback, maxWidth);
        } else {
          feedbackLines = [];
        }

        // let feedbackLines = pdf.splitTextToSize(msg.feedback, maxWidth);

        for (let j = 0; j < feedbackLines.length; j++) {
          if (y + lineHeight > pageHeight - margin) {
            pdf.addPage();
            pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
            pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
            countPages++;
            y = 55;
            pdf.setFontSize(20);
            pdf.setFont('PlusJakartaSans','bold');
            pdf.text(this.translate.instant('conversation.pdf.conversation').toUpperCase()+':', x, y);
            pdf.setFontSize(12);
            pdf.setFont('PlusJakartaSans','normal');
            y += 35;
            
            pdf.line(x-margin, y, pageWidth, y); // Draw line
            y += 40;
          }
          pdf.text(feedbackLines[j], x, y);
          y += lineHeight;
        }

        y += 30;


      }
    }

    if (doc.close) {

      pdf.addPage();
      pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
      pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
      countPages++;
      y = 55;
      pdf.setFontSize(20);
      pdf.setFont('PlusJakartaSans','bold');
      pdf.text(this.translate.instant('conversation.pdf.evaluation').toUpperCase()+':', x, y);
      pdf.setFontSize(12);
      pdf.setFont('PlusJakartaSans','normal');
      y += 35;
      
      pdf.line(x-margin, y, pageWidth, y); // Draw line
      y += 40;

      // pdf.setFontSize(20);
      // pdf.text(this.translate.instant('conversation.pdf.evaluation'), x, y);

      // y += 30;
      pdf.setFontSize(12);


      const parser = new DOMParser();
      const htmlDoc = parser.parseFromString(doc.close, 'text/html');
      const containerDiv = htmlDoc.body.firstElementChild;
      const bodyNodes = containerDiv ? Array.from(containerDiv.childNodes) : [];
      const maxWidth = (pageWidth - margin * 2);
      const contentWidth = maxWidth // pageWidth - margin * 2;

      const renderText = (text: string, fontSize: number, fontStyle: string = '', indent = 0) => {
        if(!fontStyle){
          fontStyle = 'normal';
        }
        const lines = pdf.splitTextToSize(text, contentWidth - indent);
        pdf.setFont('PlusJakartaSans', fontStyle);
        pdf.setFontSize(fontSize);
        pdf.setTextColor(0);
        for (const line of lines) {
          if (y + pdf.getLineHeight() > pageHeight - margin) {
            pdf.addPage();
            pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
            pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
            countPages++;
            y = 55;
            pdf.setFontSize(20);
            pdf.setFont('PlusJakartaSans','bold');
            pdf.text(this.translate.instant('conversation.pdf.evaluation').toUpperCase()+':', x, y);
            pdf.setFontSize(12);
            pdf.setFont('PlusJakartaSans','normal');
            y += 35;
            
            pdf.line(x-margin, y, pageWidth, y); // Draw line
            y += 40;
          }
          pdf.text(line, x + indent, y);
          y += pdf.getLineHeight();
        }
      };

      const renderInlineText = (el: HTMLElement): string => {
        let result = '';
        el.childNodes.forEach(node => {
          if (node.nodeType === 3) {
            result += node.textContent;
          } else if (node.nodeType === 1 && (node as HTMLElement).tagName.toLowerCase() === 'strong') {
            result += '**' + (node.textContent || '') + '**'; // tijdelijk markeren
          } else if (node.nodeType === 1) {
            result += node.textContent || '';
          }
        });
        return result;
      };

      for (const node of bodyNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el:any = node as HTMLElement;
          const tag = el.tagName.toLowerCase();

          let fontSize = 12;
          let fontStyle = '';

          switch (tag) {
            case 'h3':
              fontStyle = 'bold';
              pdf.setFont('PlusJakartaSans', 'bold');
              pdf.setFontSize(13);
              renderText(el.textContent.toUpperCase() || '', fontSize, fontStyle);
              y += 10;
              break;
            case 'h4':
              fontStyle = 'bold';
              pdf.setFont('PlusJakartaSans', 'bold');
              pdf.setFontSize(13);
              renderText(el.textContent.toUpperCase() || '', fontSize, fontStyle);
              y += 10;
              break;
            case 'p':
              pdf.setFont('PlusJakartaSans', 'normal');
              renderText(el.textContent || '', 12, '');
              y += 15;
              break;
            case 'ul':
              const items = Array.from(el.querySelectorAll('li'));
              for (const li of items) {
                let fullText = renderInlineText(li as HTMLElement);
                // converteer tijdelijk gemarkeerde **tekst** naar splitsbaar
                const chunks = fullText.split(/(\*\*[^*]+\*\*)/g).filter(s => s.length > 0);

                let line = '• ';
                pdf.setFontSize(12);

                for (const chunk of chunks) {
                  if (chunk.startsWith('**') && chunk.endsWith('**')) {
                    const clean = chunk.replace(/\*\*/g, '');
                    pdf.setFont('PlusJakartaSans','bold');
                    const lines = pdf.splitTextToSize(clean, pageWidth - margin * 2 - 15);
                    for (const l of lines) {
                      if (y + pdf.getLineHeight() > pageHeight - margin) {
                        pdf.addPage();
                        pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
                        pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
                        countPages++;
                        y = 55;
                        pdf.setFontSize(20);
                        pdf.setFont('PlusJakartaSans','bold');
                        pdf.text(this.translate.instant('conversation.pdf.evaluation').toUpperCase()+':', x, y);
                        pdf.setFontSize(12);
                        pdf.setFont('PlusJakartaSans','normal');
                        y += 35;
                        
                        pdf.line(x-margin, y, pageWidth, y); // Draw line
                        y += 40;
                      }
                      pdf.text(line + l, x + 10, y);
                      line = ''; // alleen bij eerste regel bullet
                      y += pdf.getLineHeight();
                    }
                  } else {
                    pdf.setFont('PlusJakartaSans','normal');
                    const lines = pdf.splitTextToSize(chunk, pageWidth - margin * 2 - 15);
                    for (const l of lines) {
                      if (y + pdf.getLineHeight() > pageHeight - margin) {
                        pdf.addPage();
                        pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
                        pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
                        countPages++;
                        y = 55;
                        pdf.setFontSize(20);
                        pdf.setFont('PlusJakartaSans','bold');
                        pdf.text(this.translate.instant('conversation.pdf.evaluation').toUpperCase()+':', x, y);
                        pdf.setFontSize(12);
                        pdf.setFont('PlusJakartaSans','normal');
                        y += 35;
                        
                        pdf.line(x-margin, y, pageWidth, y); // Draw line
                        y += 40;
                      }
                      pdf.text(line + l, x + 10, y);
                      line = '';
                      y += pdf.getLineHeight();
                    }
                  }
                }

                y += 5;
              }
              y += 5;
              break;
            case 'ol':
              const li_items = Array.from(el.querySelectorAll('li'));
              let count_li = 0;
              y += 10;
              for (const li of li_items) {
                let fullText = renderInlineText(li as HTMLElement);
                // converteer tijdelijk gemarkeerde **tekst** naar splitsbaar
                const chunks = fullText.split(/(\*\*[^*]+\*\*)/g).filter(s => s.length > 0);
                count_li++;
                let line = count_li+'. ';
                pdf.setFontSize(12);

                for (const chunk of chunks) {
                  if (chunk.startsWith('**') && chunk.endsWith('**')) {
                    const clean = chunk.replace(/\*\*/g, '');
                    pdf.setFont('PlusJakartaSans','bold');
                    pdf.setFontSize(13);
                    const lines = pdf.splitTextToSize(clean, pageWidth - margin * 2 - 15);
                    for (const l of lines) {
                      if (y + pdf.getLineHeight() > pageHeight - margin) {
                        pdf.addPage();
                        pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
                        pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
                        countPages++;
                        y = 55;
                        pdf.setFontSize(20);
                        pdf.setFont('PlusJakartaSans','bold');
                        pdf.text(this.translate.instant('conversation.pdf.evaluation').toUpperCase()+':', x, y);
                        pdf.setFontSize(12);
                        pdf.setFont('PlusJakartaSans','normal');
                        y += 35;
                        
                        pdf.line(x-margin, y, pageWidth, y); // Draw line
                        y += 40;
                      }
                      pdf.text(line + l, x + 10, y);
                      line = ''; // alleen bij eerste regel bullet
                      y += pdf.getLineHeight();
                    }
                  } else {
                    pdf.setFont('PlusJakartaSans','normal');
                    pdf.setFontSize(12);
                    const lines = pdf.splitTextToSize(chunk, pageWidth - margin * 2 - 15);
                    for (const l of lines) {
                      if (y + pdf.getLineHeight() > pageHeight - margin) {
                        pdf.addPage();
                        pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
                        pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
                        countPages++;
                        y = 55;
                        pdf.setFontSize(20);
                        pdf.setFont('PlusJakartaSans','bold');
                        pdf.text(this.translate.instant('conversation.pdf.evaluation').toUpperCase()+':', x, y);
                        pdf.setFontSize(12);
                        pdf.setFont('PlusJakartaSans','normal');
                        y += 35;
                        
                        pdf.line(x-margin, y, pageWidth, y); // Draw line
                        y += 40;
                      }
                      pdf.text(line + l, x + 10, y);
                      line = '';
                      y += pdf.getLineHeight();
                    }
                  }
                }

                y += 10;
              }
              y += 20;
              break;
            
            default:
              renderText(el.textContent || '', 12, '');
              y += 10;
              break;
          }

        } else if (node.nodeType === Node.TEXT_NODE) {
          const text = (node.textContent || '').trim();
          if (text.length > 0) {
            pdf.setFontSize(12);
            pdf.setFont('PlusJakartaSans','normal');
            renderText(text, 12, '');
            y += 10;
          }
        }
      }

      setTimeout(() => {
        pdf.save(this.translate.instant('conversation.pdf.document_name'));
        this.toast.hideLoader();
        this.toast.show(this.translate.instant('conversation.pdf.ready'));
      }, 500);
    }



    // if(doc.close){
    //   let htmlContent = doc.close;


    //   const tempDiv = document.createElement("div");
    //   tempDiv.style.width = "600px"; // Zorg dat de breedte overeenkomt met een standaard vensterbreedte
    //   tempDiv.innerHTML = htmlContent;
    //   document.body.appendChild(tempDiv);

    //   // Ga naar de laatste pagina of voeg een nieuwe pagina toe
    //   const currentPage = pdf.getCurrentPageInfo().pageNumber;
    //   const totalPages = pdf.getNumberOfPages();

    //   if (currentPage !== totalPages) {
    //     pdf.setPage(totalPages); // Ga naar de laatste pagina
    //   }

    //   // pdf.addPage(); // Voeg een nieuwe pagina toe aan het einde

    //   // Render de HTML op de nieuwe pagina
    //   pdf.html(tempDiv, {
    //     callback: (doc) => {
    //       // Sla de PDF op na het toevoegen van de HTML
    //       setTimeout(() => {
    //         doc.save('gespreksverslag.pdf');   
    //         this.toast.hideLoader()
    //         this.toast.show('Het document is gegenereerd en wordt gedownload.')   
    //       }, 1000);
    //     },
    //     x: 50, // Marges
    //     y: ((countPages-1) * pageHeight) + 80, // Voeg de hoogte van de vorige pagina's toe
    //     width: 100, // Schaal de inhoud naar de beschikbare breedte van een A4-pagina
    //     html2canvas: {
    //       scale: 0.8, // Verhoog de schaal om de inhoud leesbaarder te maken
    //     },
    //     autoPaging: true, // Zorg ervoor dat lange inhoud wordt opgesplitst over meerdere pagina's
    //   });

    //   // Verwijder het tijdelijke element
    //   document.body.removeChild(tempDiv);
    // }
    else{
      setTimeout(() => {
        pdf.save(this.translate.instant('conversation.pdf.document_name'));
        this.toast.hideLoader()
        this.toast.show(this.translate.instant('conversation.pdf.ready'))
      }, 1000);
    }




  }


  
    // async caseToPdf(conversation:any){
    //   console.log(conversation)
    //   this.toast.showLoader(this.translate.instant('conversation.pdf.creating'))
  
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
    //   console.log(doc)
  
    //   let countPages = 1
  
  
    //   let pdf = new jsPDF('p', 'pt', 'a4');
  
    //   let pageHeight = pdf.internal.pageSize.height;
    //   let pageWidth = pdf.internal.pageSize.width;
    //   let margin = 72;
    //   let y = margin;
    //   let x = margin;
    //   pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
      
    //   pdf.addImage('./assets/img/logo_full_black.png', 'PNG', x+35, y, 136*2.5, 30*2.5);
    //   y += 150;
  
    //   pdf.setFontSize(24);
    //   pdf.text(doc.title, x, y);
    //   y += 30;
  
    //   pdf.setFontSize(20);
    //   pdf.text(this.translate.instant('conversation.pdf.title_name') + ' ' + doc.user, x, y);
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
    //   pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
    //   pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
    //   countPages++;
    //   y = 72;
    //   pdf.setFontSize(20);
    //   pdf.text(this.translate.instant('conversation.pdf.conversation')+':', x, y);
    //   y += 30;
    //   pdf.setFontSize(12);
    //   for (let i = 0; i < doc.messages.length; i++) {
    //     if (y > pageHeight - margin) {
    //       pdf.addPage();
    //       pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
    //       pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
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
    //         pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
    //         pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
  
    //         countPages++;
    //         y = margin;
    //       }
  
    //       // Tekst met zwarte border en border-radius
    //       pdf.setDrawColor(32,66,137);
    //       pdf.setLineWidth(1);
    //       let boxWidth = (pageWidth - margin * 2) * 0.75;
    //       let boxHeight = textSpace + 5;
    //       pdf.roundedRect(x, y, boxWidth+10, boxHeight, 8, 8, 'S');
    //       pdf.setTextColor(32,66,137);
    //       pdf.text(textLines, x + 5, y + 15);
    //       y += boxHeight + 20;
  
    //       pdf.setFontSize(12);
    //       // pdf.setTextColor(0);
    //       pdf.setFont('Helvetica','bold')
    //       pdf.text('Attitude:', x, y);
    //       pdf.setFont('Helvetica','')
    //       let attitudeLines = pdf.splitTextToSize(doc.messages[i].attitude, (pageWidth - margin * 2) * 0.75);
    //       pdf.text(attitudeLines, x + 50, y);
    //       y += pdf.getLineHeight() * attitudeLines.length + 10;
  
    //     } else if (doc.messages[i].role === this.auth.userInfo.displayName) {
    //       pdf.setFontSize(12);
  
    //       let text = doc.messages[i].content;
    //       let textLines = pdf.splitTextToSize(text, (pageWidth - margin * 2) * 0.75);
    //       let lineHeight = pdf.getLineHeight();
    //       let textSpace = lineHeight * textLines.length;
  
    //       if (textSpace > pageHeight - y - margin) {
    //         pdf.addPage();
    //         pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
    //         pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
    //         countPages++;
    //         y = margin;
    //       }
  
    //       // Tekst met zwarte border, border-radius en lichtgroene achtergrond
    //       pdf.setDrawColor(32,66,137);
    //       pdf.setLineWidth(1);
    //       pdf.setFillColor(116, 150, 223)
    //       // pdf.setFillColor(204, 255, 204); // Lichtgroene achtergrond
    //       let boxWidth = (pageWidth - margin * 2) * 0.75;
    //       let boxHeight = textSpace + 10;
    //       let boxX = pageWidth - margin - boxWidth;
    //       pdf.roundedRect(boxX, y, boxWidth+10, boxHeight, 8, 8, 'FD');
  
    //       pdf.setTextColor(255);
    //       pdf.text(textLines, boxX + 5, y + 15);
    //       y += boxHeight + 15;
  
    //       pdf.setTextColor(0);
    //       pdf.setFont('Helvetica','bold')
    //       pdf.text(this.translate.instant('conversation.pdf.cipher')+':', boxX, y);
    //       pdf.setFont('Helvetica','')
  
    //       let feedbackCipherLines = pdf.splitTextToSize(doc.messages[i].feedbackCipher, (pageWidth - margin * 2) * 0.75);
    //       pdf.text(feedbackCipherLines, boxX+50, y);
    //       y += pdf.getLineHeight() * feedbackCipherLines.length + 10;
  
    //       pdf.setFontSize(12);
    //       pdf.setFont('Helvetica','bold')
    //       pdf.text(this.translate.instant('conversation.pdf.feedback')+':', boxX, y);
    //       pdf.setFont('Helvetica','')
  
    //       y += 15;
    //       let feedbackLines = pdf.splitTextToSize(doc.messages[i].feedback, (pageWidth - margin * 2) * 0.75);
    //       pdf.text(feedbackLines, boxX, y);
    //       y += pdf.getLineHeight() * feedbackLines.length + 10;
  
          
    //     }
    //   }
  
    //   pdf.addPage();
    //   pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
    //   pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
    //   countPages++;
    //   y = 72;
    //   pdf.setFontSize(20);
    //   pdf.text(this.translate.instant('conversation.pdf.evaluation'), x, y);
  
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
    //       x: 50, // Marges
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

    
    feedbackHasIds(conversation:any){
      if(!conversation.feedback || conversation.feedback.length<1){
        return false;
      }
      for(let i=0;i<conversation.feedback.length;i++){
        if(conversation.feedback[i].id){
          return true;
        }
      }
      return false;
    }

    feedbackObject(conversation:any){
      let obj:any = {}
      for(let i=0;i<conversation.feedback.length;i++){
        if(conversation.feedback[i].id){
          obj[conversation.feedback[i].id] = conversation.feedback[i]
        }
      }
      return obj;
    }

    // getFeedbackChat(conversation:any,index:number,type:string,id?:string){
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
    //     // let feedback:any = {}
    //     feedback= conversation.feedback[newIndex].content.split('```json').join('').split('```').join('')
    //   }
    //   else{
    //     feedback = JSON.parse(conversation.feedback[newIndex].content)
    //   } 
    //   if(typeof feedback =='string'){
    //     feedback = JSON.parse(feedback)
    //   }
      
    //   if(type=='id'){
    //     return conversation.feedback[newIndex].id
    //   }
    //   return feedback[type];
    // }

    getFeedbackChat(conversation:any,index:number,type:string,id?:string){
      if(!conversation.messages||conversation.messages.length<1){
        return {};
      }
      let messages = JSON.parse(JSON.stringify(conversation.messages))
      if(!messages || messages.length<1){
        return {};
      }
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

      if(newIndex<0 || !conversation.feedback || conversation.feedback.length<1 || (!conversation.feedback[newIndex] && ((!id || id=='' || !this.feedbackObject(conversation)[id]) ) )){
        return '';
      }
      let feedback:any = {}
      if(!this.feedbackHasIds(conversation) || (conversation.timestamp && conversation.timestamp < 1750057716607)){ // || !id || id=='' || !this.feedbackObject[id]){

        if(conversation.feedback[newIndex].content.substring(0,1) != '{'){
          // let feedback:any = {}
          feedback= conversation.feedback[newIndex].content.split('```json').join('').split('```').join('')
        }
        else{
          feedback = JSON.parse(conversation.feedback[newIndex].content)
        }
      }
      else if(id){
        if(!this.feedbackObject(conversation)[id]){
          return '';
        }
        feedback = this.feedbackObject(conversation)[id].content;
        if(feedback.substring(0,1) != '{'){
          feedback = feedback.split('```json').join('').split('```').join('')
        }
        else{
          feedback = JSON.parse(feedback)
        }
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
