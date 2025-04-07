import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LevelsService {

  constructor() { }

  get attitudes(){
      return {
        "1": {
          "title": "Vijandig",
          "level": 1,
          "description": "• De persoon is uitdrukkelijk tegen de ander gekant.\n• Reageert met boosheid of weerstand, zelfs bij neutrale interacties.\n• Actieve sabotering of openlijke afwijzing van de ander."
        },
        "10": {
          "title": "Wantrouwend",
          "level": 10,
          "description": "• Gelooft dat de ander verborgen motieven heeft of niet te vertrouwen is.\n• Houdt afstand en vermijdt het delen van persoonlijke informatie.\n• Zoekt naar bevestiging van eigen vermoedens."
        },
        "20": {
          "title": "Achterdochtig",
          "level": 20,
          "description": "• Toont constante twijfel over de bedoelingen van de ander.\n• Vraagt door op details om controle te houden.\n• Non-verbaal gesloten, zoals strakke lichaamshouding of vermijdend oogcontact."
        },
        "30": {
          "title": "Sceptisch",
          "level": 30,
          "description": "• Gaat voorzichtig om met wat de ander zegt of doet.\n• Is bereid tot samenwerking, maar blijft op zijn/haar hoede.\n• Houdt een neutrale, analyserende houding aan."
        },
        "40": {
          "title": "Neutraal",
          "level": 40,
          "description": "• Heeft geen uitgesproken oordeel over de ander.\n• Gedraagt zich zakelijk en feitelijk, zonder emoties of persoonlijke betrokkenheid.\n• Reageert met minimale non-verbale en verbale interactie."
        },
        "50": {
          "title": "Voorzichtig open",
          "level": 50,
          "description": "• Toont enige bereidheid om de ander te vertrouwen, maar blijft gereserveerd.\n• Luistert actief, maar deelt weinig over zichzelf.\n• Observeert eerst het gedrag van de ander."
        },
        "60": {
          "title": "Open",
          "level": 60,
          "description": "• Staat open voor interactie en toont vertrouwen in de ander.\n• Is bereid persoonlijke informatie te delen en werkt mee.\n• Non-verbaal ontspannen en betrokken, zoals een open houding en regelmatig oogcontact."
        },
        "70": {
          "title": "Meegaand",
          "level": 70,
          "description": "• Past zich aan de ander aan en toont bereidheid om samen te werken.\n• Vermijdt conflict en zoekt naar gemeenschappelijke grond.\n• Toont empathie en luistert aandachtig naar de behoeften van de ander."
        },
        "80": {
          "title": "Vertrouwend",
          "level": 80,
          "description": "• Gaat er automatisch vanuit dat de ander goede bedoelingen heeft.\n• Deelt vrij informatie en zoekt naar manieren om elkaar te ondersteunen.\n• Reageert positief op nieuwe ideeën of initiatieven van de ander."
        },
        "90": {
          "title": "Volledig afgestemd",
          "level": 90,
          "description": "• Is volledig afgestemd op de ander, met wederzijds vertrouwen en respect.\n• Toont niet alleen begrip, maar anticipeert op behoeften en emoties.\n• Laat zien dat hij/zij de ander als gelijke waardeert en ondersteunt actief samenwerking."
        },
        "100": {
          "title": "perfecte empathie",
          "level": 100,
          "description": "• Voelt en denkt precies zoals de ander, met volledige empathie en begrip.\n• Anticipeert op behoeften en emoties zonder dat de ander iets hoeft te zeggen.\n• Toont onvoorwaardelijke steun en begrip, zonder oordeel of voorbehoud."
        }
      }
  }

  levelColor(level:number){
    // let colors = [
    //   "#eae2b7",
    //   "#FFEA00",
    //   "#FFB700",
    //   "#FFAA00",
    //   "#FF7B00"
    // ]
    let colors = [
      "#FFFFFF",
      "#FFFFFF",
      "#FFFFFF",
      "#FFFFFF",
      "#FFFFFF"
    ]

    if(!level){
      level = 1
    }
    if(level>colors.length){
      level = colors.length
    }
    return colors[level-1]
  }

  levelColorText(level:number){
    let colors = [
      "#212121",
      "#212121",
      "#212121",
      "#212121",
      "#212121"
  ]
    if(!level){
      level = 1
    }
    if(level>colors.length){
      level = colors.length
    }
    return colors[level-1]
  }
  levelColorTextLevel(level:number){
    let colors = [
      "#5f5f5f",
      "#5f5f5f",
      "#5f5f5f",
      "#5f5f5f",
      "#5f5f5f"
  ]
    if(!level){
      level = 1
    }
    if(level>colors.length){
      level = colors.length
    }
    return colors[level-1]
  }
}
