import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'caseFilter',
})
export class CaseFilterPipe implements PipeTransform {

  // transform(cases: any[], types: any[], subjects: any[], openToUser: boolean[]): any[] {
  //   if (!cases) return [];

  //   let nwCases = [];

  //   for(let i=0;i<cases.length;i++){
  //     let check = true
  //     if(types.length){
  //       let subCheck = false
  //       for(let j=0;j<cases[i].conversationTypes.length;j++){
  //         if(types.includes(cases[i].conversationTypes[j])){
  //           subCheck = true
  //         }
  //       }
  //       if(!subCheck){
  //         check = false
  //       }
  //     }
  //     if(subjects.length){
  //       if(cases[i].types?.length){
  //         let subCheck = false
  //         for(let j=0;j<cases[i].types.length;j++){
  //           if(subjects.includes(cases[i].types[j])){
  //             subCheck = true
  //           }
  //         }
  //         if(!subCheck){
  //           check = false
  //         }
  //       }
  //       else{
  //         check = false
  //       }
  //     }
  //     if(openToUser.length){
  //       if(!openToUser.includes(cases[i].open_to_user)){
  //         check = false
  //       }
  //     }
      
  //     if(check){
  //       nwCases.push(cases[i])
  //     }
  //   }
  //   return nwCases;
  // }

  // transform(cases: any[], types: any[], subjects: any[], subjectTypes: { [key: string]: any }, openToUser: boolean[]): any[] {
  //   if (!cases) return [];

  //   return cases.filter(caseItem => {
  //     let conversationMatch = false;
  //     let subjectMatch = true;  // Default is true, tenzij specifieke subjects niet matchen.

  //     // Check conversationTypes
  //     if (types.length) {
  //       conversationMatch = caseItem.conversationTypes.some((convType:any) => {
  //         if (types.includes(convType)) {
  //           // Check of er specifieke subjects geselecteerd zijn binnen dit conversationType
  //           const requiredSubjects = subjectTypes[convType] || [];
  //           if (requiredSubjects.length) {
  //             // Filter op subjects binnen dit conversationType
  //             const caseSubjects = caseItem.types || [];
  //             subjectMatch = caseSubjects.some((subject:any) => requiredSubjects.includes(subject));
  //           }
  //           return true;  // ConversationType match gevonden
  //         }
  //         return false;
  //       });
  //     } else {
  //       conversationMatch = true;  // Geen types geselecteerd betekent alle cases zijn geldig.
  //     }

  //     // Check openToUser
  //     const openToUserMatch = !openToUser.length || openToUser.includes(caseItem.open_to_user);

  //     // Return true als alle condities voldaan zijn
  //     return conversationMatch && subjectMatch && openToUserMatch;
  //   });
  // }


  transform(cases: any[], types: any[], subjectTypes: { [key: string]: any }, openToUser: boolean[]): any[] {
    if (!cases) return [];

    return cases.filter(caseItem => {
      let conversationMatch = false;
      let subjectMatch = true;

      // Check conversationTypes en subjects binnen die types
      if (types.length) {
        conversationMatch = Array.isArray(caseItem.conversationTypes) && 
                            caseItem.conversationTypes.some((convType: any) => {
                              if (types.includes(convType)) {
                                // Check of er specifieke subjects geselecteerd zijn
                                const requiredSubjects = subjectTypes[convType] || [];
                                if (requiredSubjects.length) {
                                  const caseSubjects = caseItem.types || [];
                                  subjectMatch = caseSubjects.some((subject: any) => requiredSubjects.includes(subject));
                                }
                                return true;  // ConversationType match gevonden
                              }
                              return false;
                            });
      } else {
        conversationMatch = true;  // Geen types geselecteerd betekent alle cases zijn geldig.
      }

      // Check openToUser
      const openToUserMatch = !openToUser.length || openToUser.includes(caseItem.open_to_user);

      // Return true als alle condities voldaan zijn
      return conversationMatch && subjectMatch && openToUserMatch;
    });
  }

}
