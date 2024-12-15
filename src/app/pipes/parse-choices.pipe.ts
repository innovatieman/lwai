import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'parseChoices',
})
export class ParseChoicesPipe implements PipeTransform {

  transform(latestAssistantItem: any): { choice: string; description: string }[] {
    if (!latestAssistantItem) {
      return [];
    }

    const choices: { choice: string; description: string }[] = [];
    const choiceRegex = /{Choice \d+:.*?\[(.*?)\]\[(.*?)\]}/gs;
    let match;

    while ((match = choiceRegex.exec(latestAssistantItem)) !== null) {
      const choice = match[1].trim().replace(/^"/, '').replace(/"$/, '');             
      const description = match[2].trim().replace(/^"/, '').replace(/"$/, '');
      choices.push({ choice, description });
    }

    return choices;
  }

}
