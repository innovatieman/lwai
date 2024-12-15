import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'lastesAssistantItem',
})
export class LastesAssistantItemPipe implements PipeTransform {

  transform(messages: any[]): string {
    if(!messages||messages.length<1){
      return '';
    }
    let newMessages = messages.filter((message:any) => message.role === 'assistant');
    newMessages = newMessages.sort((a:any, b:any) => a.timestamp - b.timestamp);
    
    if(newMessages.length>0){
      return newMessages[newMessages.length-1].content;
    }
    return '';
  }

}
