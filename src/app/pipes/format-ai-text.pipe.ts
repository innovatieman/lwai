import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatAiText',
  standalone: false
})
export class FormatAiTextPipe implements PipeTransform {

  superscriptMap: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ',
    'g': 'ᵍ', 'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ', 'k': 'ᵏ', 'l': 'ˡ',
    'm': 'ᵐ', 'n': 'ⁿ', 'o': 'ᵒ', 'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ',
    't': 'ᵗ', 'u': 'ᵘ', 'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ'
  };

  subscriptMap: Record<string, string> = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ',
    'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ', 'p': 'ₚ', 'r': 'ᵣ',
    's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ', 'v': 'ᵥ', 'x': 'ₓ'
  };

  transform(value: string, html?: boolean): string {
    if (!value) return '';

    // return value
    // // Genummerde koppen op aparte regels, met witregels erboven en eronder
    // .replace(/(?:\r?\n)?(\d\.\s\*\*.*?\*\*)(?!\s*-)/g, '\n\n$1\n')
    // // Vetgedrukte tekst -> HOOFDLETTERS
    // .replace(/\*\*(.*?)\*\*/g, (_, p1) => p1.toUpperCase())
    // // Cursieve bullets -> "-   bullettekst"
    // .replace(/\* (.*?)\n/g, "-   $1\n")
    // .replace(/\* (.*?)$/g, "-   $1")
    // // Voeg witregel toe NA elke genummerde sectie (optioneel, alleen als geen bullet volgt)
    // .replace(/(-.*?)\n(?=\d\.)/g, '$1\n')
    // // Voeg witregel toe ná het laatste bulletblok
    // .replace(/(-.*?)\n(?=\S)/g, '$1\n')
    // // Verwijder overgebleven sterretjes (voor de zekerheid)
    // .replace(/\*/g, '')
    // // Verwijder dubbele spaties (optioneel)
    // .replace(/ +/g, ' ')
    // // Trim de uiteindes
    // .replace(/\n/g, (html ? '<br>' : '\n'))
    // .trim();
    value = value.replace(/\\frac\s*{([^{}]+)}\s*{([^{}]+)}/g, (_match, numerator, denominator) => {
      return `${numerator}/${denominator}`;
    });

    return value
    // Genummerde koppen op aparte regels, met witregels erboven en eronder
    .replace(/(?:\r?\n)?(\d\.\s\*\*.*?\*\*)(?!\s*-)/g, '\n\n$1\n')

    // Vetgedrukte tekst -> HOOFDLETTERS
    .replace(/\*\*(.*?)\*\*/g, (_, p1) => p1.toUpperCase())

    // ✅ Alleen bullets aan het begin van een regel vervangen
    .replace(/^\* (.*)$/gm, "-   $1")

    // Voeg witregel toe NA elke genummerde sectie (optioneel, alleen als geen bullet volgt)
    .replace(/(-.*?)\n(?=\d\.)/g, '$1\n')

    // Voeg witregel toe ná het laatste bulletblok
    .replace(/(-.*?)\n(?=\S)/g, '$1\n')

    // ❌ Verwijder GEEN sterretjes meer — laat * gewoon bestaan voor rekensommen

    // Verwijder dubbele spaties
    .replace(/ +/g, ' ')

    // Linebreaks naar <br> indien html gewenst
    .replace(/\n/g, (html ? '<br>' : '\n'))

    // LaTeX math: vervang \times door ×
    .replace(/\\times/g, '×')

    // Inline LaTeX: \( ... \) → gewoon tussen haakjes laten staan
    .replace(/\\\((.*?)\\\)/g, '$1')

    // Display LaTeX: \[ ... \] → op eigen regel
    .replace(/\\\[(.*?)\\\]/gs, '\n$1\n') // de 's' flag zorgt dat \n ook meedoet

    // Basis LaTeX symbolen
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\infty/g, '∞')

    // Griekse letters
    .replace(/\\pi/g, 'π')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\theta/g, 'θ')

    // Breuken: \frac{a}{b} → a/b
    .replace(/\\frac{([^{}]+)}{([^{}]+)}/g, '$1/$2')

    // Wortels: \sqrt{a} → √a
    .replace(/\\sqrt{([^{}]+)}/g, '√$1')

    // Superscript (alleen eenvoudige gevallen: ^0–9, a–z)
    .replace(/\^([0-9a-zA-Z])/g, (_, p1) => this.superscriptMap[p1] || '^' + p1)

    // Subscript (idem)
    .replace(/_([0-9a-zA-Z])/g, (_, p1) => this.subscriptMap[p1] || '_' + p1)

    // Trim uiteindes
    .trim();

  }

}
