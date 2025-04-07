import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'lastestAssistantItem',
})
export class lastestAssistantItemPipe implements PipeTransform {

  transform(messages: any[]): string {
    if(!messages||messages.length<1){
      return '';
    }
    let newMessages = messages.filter((message:any) => message.role === 'assistant' || message.role === 'model');
    newMessages = newMessages.sort((a:any, b:any) => a.timestamp - b.timestamp);
    
    if(newMessages.length>0){
      return newMessages[newMessages.length-1].content;
    }
    return '';
  }

}
