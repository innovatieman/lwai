import { Injectable } from '@angular/core';
import * as moment from 'moment'
import { TranslateService } from '@ngx-translate/core';
import { MediaService } from './media.service';
import { ToastService } from './toast.service';
import { LOCALE_ID, Inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class HelpersService {
  [key : string]: any;

  constructor(
    public translate:TranslateService,
    private media:MediaService,
    private toast:ToastService,
    private decimalPipe: DecimalPipe,
    @Inject(LOCALE_ID) private locale: string
  ) { }

  doNothing(event?:Event){
    if(event){
      event.stopPropagation();
      event.preventDefault();
    }
  }

  get cardSizeLarge(){
    const sizes:any = {
      xs: 12,
      sm: 6,
      md: 4,
      lg: 3,
      xl: 12/5
    }
    return sizes[this.media.screenSize]
  }

  get cardSize(){
    const sizes:any = {
      xs: 12,
      sm: 12,
      md: 4,
      lg: 3,
      xl: 3
    }
    return sizes[this.media.screenSize]
  }
  get cardSizeSmall(){
    const sizes:any = {
      xs: 12,
      sm: 12,
      md: 6,
      lg: 4,
      xl: 4
    }
    return sizes[this.media.screenSize]
  }

  get cardSizeMedium(){
    const sizes:any = {
      xs: 12,
      sm: 6,
      md: 6,
      lg: 4,
      xl: 4
    }
    return sizes[this.media.screenSize]
  }

  get cardSizeSmallPerc(){
    const sizes:any = {
      xs: '100%',
      sm: '100%',
      md: '50%',
      lg: '33.33%',
      xl: '33.33%'
    }
    return sizes[this.media.screenSize]
  }

  countWords(text:string){
    if(!text){return 0}
    let arr = text.split(" ")
    return arr.length
  }

  getDailySeed(): number {
    const today = new Date();
    const seedString = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    let hash = 0;
    for (let i = 0; i < seedString.length; i++) {
      hash = seedString.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  }

  seededRandom(seed: number): () => number {
    return function() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }
  
  convertLines(text:string){
    if(!text){return ''}
    return text.replace(/\n/g, '<br />');
  }

  convertSpaces(text:string){
    if(!text){return ''}
    return text.replace(/&nbsp;/g, ' ');
  }

  shuffleArrayDeterministic<T>(array: T[], seed: number): T[] {
    const result = [...array];
    const random = this.seededRandom(seed);
  
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
  
    return result;
  }



  get now(){
    return moment().format('yyyymmddHis')
  }
  get yesterday(){
    return moment().subtract(1, 'days')
  }

  unixToDate(unix:number){
    return moment.unix(unix)
  }

  average(array:number[]){
    if(!array||array.length==0){
      return 0
    }
    let sum = 0
    for (let i=0;i<array.length;i++) {
      sum = sum + array[i]
    }
    return Math.round(sum/array.length)

  }

  round(nr:number,keepNumber?:boolean){
    if(Number.isNaN(nr)){return 0}
    nr = nr*100
    nr = Math.round(nr)
    nr = nr / 100
    
    if(!keepNumber){return nr.toFixed(0)}
    return nr
  }
  
  isNan(nr:any):number{
    if(Number.isNaN(nr)||!nr){return 0}
    return nr
  }

  formatNumber(nr:number,digits?:string){
    if(nr===undefined||nr===null||Number.isNaN(nr)){return '0'}
    if(!digits){
      digits = '1.0-0'
    }
    return this.decimalPipe.transform(nr, digits, this.locale);
  }

  utf8ToBase64(str: string): string {
    const utf8Bytes = new TextEncoder().encode(str);
    const binary = Array.from(utf8Bytes).map(b => String.fromCharCode(b)).join('');
    return btoa(binary);
  }

  base64ToUtf8(base64: string): string {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  floor(nr:number):number{
    return Math.floor(nr)
  }
  ceil(nr:number):number{
    return Math.ceil(nr)
  }

  validEmail(email:string):boolean {
    if(!email){return false}
    let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    // let re = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-z]{2,15}$/;
    return re.test(String(email).toLowerCase());
  }

  public sortString(array:any[],key:string,descending?:boolean){
    let nwArray = JSON.parse(JSON.stringify(array))
    if(descending){
      nwArray.sort(this.dynamicSortString("-"+key))
    }
    else{
      nwArray.sort(this.dynamicSortString(key))
    }
    return nwArray
  }

  public sort(array:any[],key:string,descending?:boolean){
    let nwArray = JSON.parse(JSON.stringify(array))
    if(descending){
      nwArray.sort(this.dynamicSort("-"+key))
    }
    else{
      nwArray.sort(this.dynamicSort(key))
    }
    return nwArray
  }

  private dynamicSort(property:string) {
    var sortOrder = 1;

    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }

    return (a:any,b:any) => {
        if(sortOrder == -1){

            return b[property]-a[property];
        }else{
            return a[property]-b[property];
        }        
    }
  }

  dynamicSortString(property:string) {
    let sortOrder = 1;
    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a:any,b:any) {
        
        let result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    }
  }


  /////////////



  getWeekday(day:any){
    if(day===undefined){return ''}
    return moment.weekdays(day)
  }


  showLocalDate(date:any, format?:moment.MomentFormatSpecification,addDays?:number,unix?:boolean,lang?:string) {
    if (!date) { return '' }
    if(!this.translate&&lang){
      lang = lang
    }
    else{
      lang = this.translate.currentLang
    }
    if (!unix&&!moment(date).isValid()) { return date }
    if (unix&&!moment.unix(date).isValid()) { return date }
    if (!format) {
      format = this.translate.instant('date_formats.long')
    }
    if (format == 'fromNow') {
      if(unix){
        return moment.unix(date).locale(lang).fromNow()
      }
      return moment(date).locale(lang).fromNow()
    }
    if(!addDays){
      if(unix){
        if(date.toString().length>10){
          return moment.unix(date / 1000).locale(lang).format(format as string)
        }
        return moment.unix(date).locale(lang).format(format as string)
      }
      return moment(date).locale(lang).format(format as string)
    }
    else{
      if(unix){
        return moment.unix(date).add(addDays,'days').locale(lang).format(format as string)
      }
      return moment(date).add(addDays,'days').locale(lang).format(format as string)
    }

  }

  get todayLong(){
    return moment().locale(this.translate.currentLang).format(this.translate.instant('date_format_long'))
  }
  get todayShort(){
    return moment().locale(this.translate.currentLang).format(this.translate.instant('date_format_short'))
  }

  onlyUnique(value:any, index:number, array:any[]) {
    return array.indexOf(value) === index;
  }

  capitalizeNames(str:string,changeOnlyFirstLetter?:boolean) {
    if(changeOnlyFirstLetter){
      str = str.charAt(0).toUpperCase() + str.slice(1); 
      return str
    }
    let splitStr:any = str.toLowerCase().split(' ');
    for (var i = 0; i < splitStr.length; i++) {
        splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);     
    }
    splitStr = splitStr.join(' ');
    if(str.includes('-')){
      splitStr = str.toLowerCase().split('-');
      for (var i = 0; i < splitStr.length; i++) {
          splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);     
      }
      splitStr = splitStr.join('-');
    }
    return splitStr
 }


  convertUndefinedToEmptyString(obj:any) {
    if (typeof obj === 'object' && obj !== null) {
      for (let key in obj) {
        if (obj.hasOwnProperty(key) && obj[key] === undefined) {
          obj[key] = '';
        }
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          this.convertUndefinedToEmptyString(obj[key]);
        }
      }
    }
    return obj;
  }

  currencyChar(currency:string){
    if(!currency){return ''}
    let currencyChar = ''
    let currencyText:string = currency.split(' ')[0]
    switch(currencyText){
      case 'CREDITS':
        currencyChar = 'credits'
        break
      case 'EUR':
        currencyChar = '€'
        break
      case 'USD':
        currencyChar = '$'
        break
      case 'GBP':
        currencyChar = '£'
        break
      case 'AUD':
        currencyChar = 'A$'
        break
      case 'CAD':
        currencyChar = 'C$'
        break
      case 'NZD':
        currencyChar = 'NZ$'
        break
      case 'JPY':
        currencyChar = '¥'
        break
      case 'CNY':
        currencyChar = '¥'
        break
    }
    return currencyChar
  }

  countries:any = [
    {"code":"AF","nl":"Afghanistan","en":"Afghanistan"},
    {"code":"AX","nl":"Ålandseilanden","en":"Åland Islands"},
    {"code":"AL","nl":"Albanië","en":"Albania"},
    {"code":"DZ","nl":"Algerije","en":"Algeria"},
    {"code":"AS","nl":"Amerikaans-Samoa","en":"American Samoa"},
    {"code":"UM","nl":"Amerikaanse Kleine Pacifische eilanden","en":"United States Minor Outlying Islands (the)"},
    {"code":"VI","nl":"Amerikaanse Maagdeneilanden","en":"Virgin Islands (U.S.)"},
    {"code":"AD","nl":"Andorra","en":"Andorra"},
    {"code":"AO","nl":"Angola","en":"Angola"},
    {"code":"AI","nl":"Anguilla","en":"Anguilla"},
    {"code":"AQ","nl":"Antarctica","en":"Antarctica"},
    {"code":"AG","nl":"Antigua en Barbuda","en":"Antigua and Barbuda"},
    {"code":"AR","nl":"Argentinië","en":"Argentina"},
    {"code":"AM","nl":"Armenië","en":"Armenia"},
    {"code":"AW","nl":"Aruba","en":"Aruba"},
    {"code":"AU","nl":"Australië","en":"Australia"},
    {"code":"AZ","nl":"Azerbeidzjan","en":"Azerbaijan"},
    {"code":"BS","nl":"Bahama's","en":"Bahamas (the)"},
    {"code":"BH","nl":"Bahrein","en":"Bahrain"},
    {"code":"BD","nl":"Bangladesh","en":"Bangladesh"},
    {"code":"BB","nl":"Barbados","en":"Barbados"},
    {"code":"BE","nl":"België","en":"Belgium"},
    {"code":"BZ","nl":"Belize","en":"Belize"},
    {"code":"BJ","nl":"Benin","en":"Benin"},
    {"code":"BM","nl":"Bermuda","en":"Bermuda"},
    {"code":"BT","nl":"Bhutan","en":"Bhutan"},
    {"code":"BO","nl":"Bolivia","en":"Bolivia (Plurinational State of)"},
    {"code":"BQ","nl":"Bonaire, Sint Eustatius en Saba","en":"Bonaire, Sint Eustatius and Saba"},
    {"code":"BA","nl":"Bosnië en Herzegovina","en":"Bosnia and Herzegovina"},
    {"code":"BW","nl":"Botswana","en":"Botswana"},
    {"code":"BV","nl":"Bouvet","en":"Bouvet Island"},
    {"code":"BR","nl":"Brazilië","en":"Brazil"},
    {"code":"IO","nl":"Brits Territorium in de Indische Oceaan","en":"British Indian Ocean Territory (the)"},
    {"code":"VG","nl":"Britse Maagdeneilanden","en":"Virgin Islands (British)"},
    {"code":"BN","nl":"Brunei","en":"Brunei Darussalam"},
    {"code":"BG","nl":"Bulgarije","en":"Bulgaria"},
    {"code":"BF","nl":"Burkina Faso","en":"Burkina Faso"},
    {"code":"BI","nl":"Burundi","en":"Burundi"},
    {"code":"KH","nl":"Cambodja","en":"Cambodia"},
    {"code":"CA","nl":"Canada","en":"Canada"},
    {"code":"CF","nl":"Centraal-Afrikaanse Republiek","en":"Central African Republic (the)"},
    {"code":"CL","nl":"Chili","en":"Chile"},
    {"code":"CN","nl":"China","en":"China"},
    {"code":"CX","nl":"Christmaseiland","en":"Christmas Island"},
    {"code":"CC","nl":"Cocoseilanden","en":"Cocos (Keeling) Islands (the)"},
    {"code":"CO","nl":"Colombia","en":"Colombia"},
    {"code":"KM","nl":"Comoren","en":"Comoros (the)"},
    {"code":"CG","nl":"Congo-Brazzaville","en":"Congo (the)"},
    {"code":"CD","nl":"Congo-Kinshasa","en":"Congo (the Democratic Republic of the)"},
    {"code":"CK","nl":"Cookeilanden","en":"Cook Islands (the)"},
    {"code":"CR","nl":"Costa Rica","en":"Costa Rica"},
    {"code":"CU","nl":"Cuba","en":"Cuba"},
    {"code":"CW","nl":"Curaçao","en":"Curaçao"},
    {"code":"CY","nl":"Cyprus","en":"Cyprus"},
    {"code":"DK","nl":"Denemarken","en":"Denmark"},
    {"code":"DJ","nl":"Djibouti","en":"Djibouti"},
    {"code":"DM","nl":"Dominica","en":"Dominica"},
    {"code":"DO","nl":"Dominicaanse Republiek","en":"Dominican Republic (the)"},
    {"code":"DE","nl":"Duitsland","en":"Germany"},
    {"code":"EC","nl":"Ecuador","en":"Ecuador"},
    {"code":"EG","nl":"Egypte","en":"Egypt"},
    {"code":"SV","nl":"El Salvador","en":"El Salvador"},
    {"code":"XE","nl":"Engeland","en":"England"},
    {"code":"GQ","nl":"Equatoriaal-Guinea","en":"Equatorial Guinea"},
    {"code":"ER","nl":"Eritrea","en":"Eritrea"},
    {"code":"EE","nl":"Estland","en":"Estonia"},
    {"code":"ET","nl":"Ethiopië","en":"Ethiopia"},
    {"code":"FO","nl":"FaeröerDEN","en":"Faroe Islands (the)"},
    {"code":"FK","nl":"Falklandeilanden","en":"Falkland Islands (the) [Malvinas]"},
    {"code":"FJ","nl":"Fiji","en":"Fiji"},
    {"code":"PH","nl":"Filipijnen","en":"Philippines (the)"},
    {"code":"FI","nl":"Finland","en":"Finland"},
    {"code":"FR","nl":"Frankrijk","en":"France"},
    {"code":"GF","nl":"Frans-Guyana","en":"French Guiana"},
    {"code":"PF","nl":"Frans-Polynesië","en":"French Polynesia"},
    {"code":"TF","nl":"Franse Zuidelijke en Antarctische Gebieden","en":"French Southern Territories (the)"},
    {"code":"GA","nl":"Gabon","en":"Gabon"},
    {"code":"GM","nl":"Gambia","en":"Gambia (the)"},
    {"code":"GE","nl":"Georgië","en":"Georgia"},
    {"code":"GH","nl":"Ghana","en":"Ghana"},
    {"code":"GI","nl":"Gibraltar","en":"Gibraltar"},
    {"code":"GD","nl":"Grenada","en":"Grenada"},
    {"code":"GR","nl":"Griekenland","en":"Greece"},
    {"code":"GL","nl":"GroenlandDEN","en":"Greenland"},
    {"code":"GP","nl":"Guadeloupe","en":"Guadeloupe"},
    {"code":"GU","nl":"Guam","en":"Guam"},
    {"code":"GT","nl":"Guatemala","en":"Guatemala"},
    {"code":"GG","nl":"Guernsey","en":"Guernsey"},
    {"code":"GN","nl":"Guinee","en":"Guinea"},
    {"code":"GW","nl":"Guinee-Bissau","en":"Guinea-Bissau"},
    {"code":"GY","nl":"Guyana","en":"Guyana"},
    {"code":"HT","nl":"Haïti","en":"Haiti"},
    {"code":"HM","nl":"Heard en McDonaldeilanden","en":"Heard Island and McDonald Islands"},
    {"code":"HN","nl":"Honduras","en":"Honduras"},
    {"code":"HU","nl":"Hongarije","en":"Hungary"},
    {"code":"HK","nl":"Hongkong","en":"Hong Kong"},
    {"code":"IE","nl":"Ierland","en":"Ireland"},
    {"code":"IS","nl":"IJsland","en":"Iceland"},
    {"code":"IN","nl":"India","en":"India"},
    {"code":"ID","nl":"Indonesië","en":"Indonesia"},
    {"code":"IQ","nl":"Irak","en":"Iraq"},
    {"code":"IR","nl":"Iran","en":"Iran (Islamic Republic of)"},
    {"code":"IM","nl":"Isle of Man","en":"Isle of Man"},
    {"code":"IL","nl":"Israël","en":"Israel"},
    {"code":"IT","nl":"Italië","en":"Italy"},
    {"code":"CI","nl":"Ivoorkust","en":"Côte d'Ivoire"},
    {"code":"JM","nl":"Jamaica","en":"Jamaica"},
    {"code":"JP","nl":"Japan","en":"Japan"},
    {"code":"YE","nl":"Jemen","en":"Yemen"},
    {"code":"JE","nl":"Jersey","en":"Jersey"},
    {"code":"JO","nl":"Jordanië","en":"Jordan"},
    {"code":"KY","nl":"Kaaimaneilanden","en":"Cayman Islands (the)"},
    {"code":"CV","nl":"Kaapverdië","en":"Cabo Verde"},
    {"code":"CM","nl":"Kameroen","en":"Cameroon"},
    {"code":"KZ","nl":"Kazachstan","en":"Kazakhstan"},
    {"code":"KE","nl":"Kenia","en":"Kenya"},
    {"code":"KG","nl":"Kirgizië","en":"Kyrgyzstan"},
    {"code":"KI","nl":"Kiribati","en":"Kiribati"},
    {"code":"KW","nl":"Koeweit","en":"Kuwait"},
    {"code":"HR","nl":"Kroatië","en":"Croatia"},
    {"code":"LA","nl":"Laos","en":"Lao People's Democratic Republic (the)"},
    {"code":"LS","nl":"Lesotho","en":"Lesotho"},
    {"code":"LV","nl":"Letland","en":"Latvia"},
    {"code":"LB","nl":"Libanon","en":"Lebanon"},
    {"code":"LR","nl":"Liberia","en":"Liberia"},
    {"code":"LY","nl":"Libië","en":"Libya"},
    {"code":"LI","nl":"Liechtenstein","en":"Liechtenstein"},
    {"code":"LT","nl":"Litouwen","en":"Lithuania"},
    {"code":"LU","nl":"Luxemburg","en":"Luxembourg"},
    {"code":"MO","nl":"Macau","en":"Macao"},
    {"code":"MK","nl":"Macedonië","en":"Republic of North Macedonia"},
    {"code":"MG","nl":"Madagaskar","en":"Madagascar"},
    {"code":"MW","nl":"Malawi","en":"Malawi"},
    {"code":"MV","nl":"Maldiven","en":"Maldives"},
    {"code":"MY","nl":"Maleisië","en":"Malaysia"},
    {"code":"ML","nl":"Mali","en":"Mali"},
    {"code":"MT","nl":"Malta","en":"Malta"},
    {"code":"MA","nl":"Marokko","en":"Morocco"},
    {"code":"MH","nl":"Marshalleilanden","en":"Marshall Islands (the)"},
    {"code":"MQ","nl":"Martinique","en":"Martinique"},
    {"code":"MR","nl":"Mauritanië","en":"Mauritania"},
    {"code":"MU","nl":"Mauritius","en":"Mauritius"},
    {"code":"YT","nl":"Mayotte","en":"Mayotte"},
    {"code":"MX","nl":"Mexico","en":"Mexico"},
    {"code":"FM","nl":"Micronesia","en":"Micronesia (Federated States of)"},
    {"code":"MD","nl":"Moldavië","en":"Moldova (the Republic of)"},
    {"code":"MC","nl":"Monaco","en":"Monaco"},
    {"code":"MN","nl":"Mongolië","en":"Mongolia"},
    {"code":"ME","nl":"Montenegro","en":"Montenegro"},
    {"code":"MS","nl":"Montserrat","en":"Montserrat"},
    {"code":"MZ","nl":"Mozambique","en":"Mozambique"},
    {"code":"MM","nl":"Myanmar","en":"Myanmar"},
    {"code":"NA","nl":"Namibië","en":"Namibia"},
    {"code":"NR","nl":"Nauru","en":"Nauru"},
    {"code":"NL","nl":"Nederland","en":"Netherlands (the)"},
    {"code":"NP","nl":"Nepal","en":"Nepal"},
    {"code":"NI","nl":"Nicaragua","en":"Nicaragua"},
    {"code":"NC","nl":"Nieuw-Caledonië","en":"New Caledonia"},
    {"code":"NZ","nl":"Nieuw-Zeeland","en":"New Zealand"},
    {"code":"NE","nl":"Niger","en":"Niger (the)"},
    {"code":"NG","nl":"Nigeria","en":"Nigeria"},
    {"code":"NU","nl":"Niue","en":"Niue"},
    {"code":"XI","nl":"Noord-Ierland","en":"Northern Ireland"},
    {"code":"KP","nl":"Noord-Korea","en":"Korea (the Democratic People's Republic of)"},
    {"code":"MP","nl":"Noordelijke Marianen","en":"Northern Mariana Islands (the)"},
    {"code":"NO","nl":"Noorwegen","en":"Norway"},
    {"code":"NF","nl":"Norfolkeiland","en":"Norfolk Island"},
    {"code":"UG","nl":"Oeganda","en":"Uganda"},
    {"code":"UA","nl":"Oekraïne","en":"Ukraine"},
    {"code":"UZ","nl":"Oezbekistan","en":"Uzbekistan"},
    {"code":"OM","nl":"Oman","en":"Oman"},
    {"code":"TL","nl":"Oost-Timor","en":"Timor-Leste"},
    {"code":"AT","nl":"Oostenrijk","en":"Austria"},
    {"code":"PK","nl":"Pakistan","en":"Pakistan"},
    {"code":"PW","nl":"Palau","en":"Palau"},
    {"code":"PS","nl":"Palestina","en":"Palestine, State of"},
    {"code":"PA","nl":"Panama","en":"Panama"},
    {"code":"PG","nl":"Papoea-Nieuw-Guinea","en":"Papua New Guinea"},
    {"code":"PY","nl":"Paraguay","en":"Paraguay"},
    {"code":"PE","nl":"Peru","en":"Peru"},
    {"code":"PN","nl":"Pitcairneilanden","en":"Pitcairn"},
    {"code":"PL","nl":"Polen","en":"Poland"},
    {"code":"PT","nl":"Portugal","en":"Portugal"},
    {"code":"PR","nl":"Puerto Rico","en":"Puerto Rico"},
    {"code":"QA","nl":"Qatar","en":"Qatar"},
    {"code":"RE","nl":"Réunion","en":"Réunion"},
    {"code":"RO","nl":"Roemenië","en":"Romania"},
    {"code":"RU","nl":"Rusland","en":"Russian Federation (the)"},
    {"code":"RW","nl":"Rwanda","en":"Rwanda"},
    {"code":"KN","nl":"Saint Kitts en Nevis","en":"Saint Kitts and Nevis"},
    {"code":"BL","nl":"Saint-Barthélemy","en":"Saint Barthélemy"},
    {"code":"LC","nl":"Saint Lucia","en":"Saint Lucia"},
    {"code":"PM","nl":"Saint-Pierre en Miquelon","en":"Saint Pierre and Miquelon"},
    {"code":"VC","nl":"Saint Vincent en de Grenadines","en":"Saint Vincent and the Grenadines"},
    {"code":"SB","nl":"Salomonseilanden","en":"Solomon Islands"},
    {"code":"WS","nl":"Samoa","en":"Samoa"},
    {"code":"SM","nl":"San Marino","en":"San Marino"},
    {"code":"ST","nl":"Sao Tomé en Principe","en":"Sao Tome and Principe"},
    {"code":"SA","nl":"Saudi-Arabië","en":"Saudi Arabia"},
    {"code":"XS","nl":"Schotland","en":"Scotland"},
    {"code":"SN","nl":"Senegal","en":"Senegal"},
    {"code":"RS","nl":"Servië","en":"Serbia"},
    {"code":"SC","nl":"Seychellen","en":"Seychelles"},
    {"code":"SL","nl":"Sierra Leone","en":"Sierra Leone"},
    {"code":"SG","nl":"Singapore","en":"Singapore"},
    {"code":"SH","nl":"Sint-Helena","en":"Saint Helena, Ascension and Tristan da Cunha"},
    {"code":"SX","nl":"Sint MaartenNED","en":"Sint Maarten (Dutch part)"},
    {"code":"SI","nl":"Slovenië","en":"Slovenia"},
    {"code":"SK","nl":"Slowakije","en":"Slovakia"},
    {"code":"SO","nl":"Somalië","en":"Somalia"},
    {"code":"SD","nl":"Soedan","en":"Sudan (the)"},
    {"code":"ES","nl":"Spanje","en":"Spain"},
    {"code":"SJ","nl":"Spitsbergen en Jan Mayen","en":"Svalbard and Jan Mayen"},
    {"code":"LK","nl":"Sri Lanka","en":"Sri Lanka"},
    {"code":"SR","nl":"Suriname","en":"Suriname"},
    {"code":"SZ","nl":"Swaziland","en":"Eswatini"},
    {"code":"SY","nl":"Syrië","en":"Syrian Arab Republic"},
    {"code":"TJ","nl":"Tadzjikistan","en":"Tajikistan"},
    {"code":"PF","nl":"Tahiti","en":"French Polynesia"},
    {"code":"TW","nl":"Taiwan","en":"Taiwan"},
    {"code":"TZ","nl":"Tanzania","en":"Tanzania, United Republic of"},
    {"code":"TH","nl":"Thailand","en":"Thailand"},
    {"code":"TG","nl":"Togo","en":"Togo"},
    {"code":"TK","nl":"Tokelau","en":"Tokelau"},
    {"code":"TO","nl":"Tonga","en":"Tonga"},
    {"code":"TT","nl":"Trinidad en Tobago","en":"Trinidad and Tobago"},
    {"code":"TD","nl":"Tsjaad","en":"Chad"},
    {"code":"CZ","nl":"Tsjechië","en":"Czechia"},
    {"code":"TN","nl":"Tunesië","en":"Tunisia"},
    {"code":"TR","nl":"Turkije","en":"Turkey"},
    {"code":"TM","nl":"Turkmenistan","en":"Turkmenistan"},
    {"code":"TC","nl":"Turks- en Caicoseilanden","en":"Turks and Caicos Islands (the)"},
    {"code":"TV","nl":"Tuvalu","en":"Tuvalu"},
    {"code":"UY","nl":"Uruguay","en":"Uruguay"},
    {"code":"VU","nl":"Vanuatu","en":"Vanuatu"},
    {"code":"VA","nl":"Vaticaanstad","en":"Holy See (the)"},
    {"code":"VE","nl":"Venezuela","en":"Venezuela (Bolivarian Republic of)"},
    {"code":"GB","nl":"Verenigd Koninkrijk","en":"United Kingdom of Great Britain and Northern Ireland (the)"},
    {"code":"AE","nl":"Verenigde Arabische Emiraten","en":"United Arab Emirates (the)"},
    {"code":"US","nl":"Verenigde Staten","en":"United States of America (the)"},
    {"code":"VN","nl":"Vietnam","en":"Viet Nam"},
    {"code":"XW","nl":"Wales","en":"Wales"},
    {"code":"WF","nl":"Wallis en Futuna","en":"Wallis and Futuna"},
    {"code":"EH","nl":"Westelijke Sahara","en":"Western Sahara"},
    {"code":"BY","nl":"Wit-Rusland","en":"Belarus"},
    {"code":"ZM","nl":"Zambia","en":"Zambia"},
    {"code":"ZW","nl":"Zimbabwe","en":"Zimbabwe"},
    {"code":"ZA","nl":"Zuid-Afrika","en":"South Africa"},
    {"code":"GS","nl":"Zuid-Georgië en de Zuidelijke Sandwicheilanden","en":"South Georgia and the South Sandwich Islands"},
    {"code":"KR","nl":"Zuid-Korea","en":"Korea (the Republic of)"},
    {"code":"SS","nl":"Zuid-Soedan","en":"South Sudan"},
    {"code":"SE","nl":"Zweden","en":"Sweden"},
    {"code":"CH","nl":"Zwitserland","en":"Switzerland"},
  ]

  shuffle(array:any[]) {
    if(!array || array.length === 0) {
      return [];
    }
    const seed = this.getDailySeed();
    let cases:any = JSON.parse(JSON.stringify(array));
    cases = cases.slice(0, 15);
    return this.shuffleArrayDeterministic(cases, seed);
  }

  get countryList(){
    let list = []

    for(let i=0;i<this.countries.length;i++){
      list.push({
        value:this.countries[i].code,
        title:this.countries[i][this.translate.currentLang],
        valueOnly:true
      })
    }

    list = this.sort(list,'title',false)
    return list

  }

  countryValue(code:string){
    for(let i=0;i<this.countries.length;i++){
      if(this.countries[i].code==code){
        return this.countries[i][this.translate.currentLang]
      }
    }
    return code
  }

  str2Nr(str:any){
    if(!str){return 0}
    if(!isNaN(str)){
      return parseFloat(str)
    }
    str = str.split(',').join('.')
    return parseFloat(str)
     
  }

  async sleep(ms:number){
    return new Promise( resolve => setTimeout(resolve, ms) );
  }

  async copyToClipboard(text:string,callback?:any,toast?:boolean){
    if(!text){return}
    await navigator.clipboard.writeText(text);
    if(toast){
      this.toast.show(this.translate.instant('standards.copied_to_clipboard'))
    }
    if(callback){
      callback()
      return
    }
    return
  }

  createNumberList(start:number, end:number): number[] {
    const list: number[] = [];
    for (let i = start; i <= end; i++) {
      list.push(i);
    }
    return list;
  }

}

