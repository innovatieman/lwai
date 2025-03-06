import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'caseFilter',
})
export class CaseFilterPipe implements PipeTransform {

  transform(cases: any[], types: any[], subjectTypes: { [key: string]: any }, openToUser: boolean[]): any[] {
    if (!cases) return [];
    // console.log('Filtering cases', cases, types, subjectTypes, openToUser);
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

      const openToPublic = !openToUser.length || openToUser.includes(caseItem.public);


      // Return true als alle condities voldaan zijn
      return conversationMatch && subjectMatch && (openToUserMatch || openToPublic);
    });
  }

}
