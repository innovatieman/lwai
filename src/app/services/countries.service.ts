import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CountriesService {

  list:any[] = [
    {"code": "AF", "country": "افغانستان", "name": "Afghanistan", "ethnicity": "Persian (Iranian, Afghan-Persian)"},
    {"code": "AL", "country": "Shqipëri", "name": "Albania", "ethnicity": "Balkan"},
    {"code": "DZ", "country": "الجزائر", "name": "Algeria", "ethnicity": "Northern African"},
    {"code": "AS", "country": "American Samoa", "name": "American Samoa", "ethnicity": "Indigenous Australian & Maori"},
    {"code": "AD", "country": "Andorra", "name": "Andorra", "ethnicity": "Southern European"},
    {"code": "AO", "country": "Angola", "name": "Angola", "ethnicity": "Central African"},
    {"code": "AI", "country": "Anguilla", "name": "Anguilla", "ethnicity": "Afro-Latino"},
    {"code": "AQ", "country": "Antarctica", "name": "Antarctica", "ethnicity": "N/A"},
    {"code": "AG", "country": "Antigua and Barbuda", "name": "Antigua and Barbuda", "ethnicity": "Afro-Latino"},
    {"code": "AR", "country": "Argentina", "name": "Argentina", "ethnicity": "Hispanic - Mestizo"},
    {"code": "AM", "country": "Հայաստան", "name": "Armenia", "ethnicity": "Caucasian (Armenian, Georgian, Azerbaijani)"},
    {"code": "AU", "country": "Australia", "name": "Australia", "ethnicity": "Indigenous Australian & Maori"},
    {"code": "AT", "country": "Österreich", "name": "Austria", "ethnicity": "Central European"},
    {"code": "AZ", "country": "Azərbaycan", "name": "Azerbaijan", "ethnicity": "Caucasian (Armenian, Georgian, Azerbaijani)"},
    {"code": "BS", "country": "Bahamas", "name": "Bahamas", "ethnicity": "Afro-Latino"},
    {"code": "BH", "country": "البحرين", "name": "Bahrain", "ethnicity": "Middle Eastern - Arab"},
    {"code": "BD", "country": "বাংলাদেশ", "name": "Bangladesh", "ethnicity": "South Asian"},
    {"code": "BB", "country": "Barbados", "name": "Barbados", "ethnicity": "Afro-Latino"},
    {"code": "BY", "country": "Беларусь", "name": "Belarus", "ethnicity": "Eastern European"},
    {"code": "BE", "country": "België", "name": "Belgium", "ethnicity": "Western European"},
    {"code": "BZ", "country": "Belize", "name": "Belize", "ethnicity": "Hispanic - Mestizo"},
    {"code": "BJ", "country": "Bénin", "name": "Benin", "ethnicity": "West African"},
    {"code": "BT", "country": "འབྲུག་ཡུལ", "name": "Bhutan", "ethnicity": "South Asian"},
    {"code": "BO", "country": "Bolivia", "name": "Bolivia", "ethnicity": "Indigenous Latin American"},
    {"code": "BA", "country": "Bosna i Hercegovina", "name": "Bosnia and Herzegovina", "ethnicity": "Balkan"},
    {"code": "BW", "country": "Botswana", "name": "Botswana", "ethnicity": "Southern African"},
    {"code": "BR", "country": "Brasil", "name": "Brazil", "ethnicity": "Hispanic - Mestizo"},
    {"code": "BN", "country": "Brunei", "name": "Brunei", "ethnicity": "Southeast Asian"},
    {"code": "BG", "country": "България", "name": "Bulgaria", "ethnicity": "Balkan"},
    {"code": "BF", "country": "Burkina Faso", "name": "Burkina Faso", "ethnicity": "West African"},
    {"code": "BI", "country": "Burundi", "name": "Burundi", "ethnicity": "East African"},
    {"code": "KH", "country": "កម្ពុជា", "name": "Cambodia", "ethnicity": "Southeast Asian"},
    {"code": "CM", "country": "Cameroun", "name": "Cameroon", "ethnicity": "Central African"},
    {"code": "CA", "country": "Canada", "name": "Canada", "ethnicity": "Western European"},
    {"code": "CV", "country": "Cabo Verde", "name": "Cape Verde", "ethnicity": "West African"},
    {"code": "CF", "country": "République centrafricaine", "name": "Central African Republic", "ethnicity": "Central African"},
    {"code": "TD", "country": "Tchad", "name": "Chad", "ethnicity": "Central African"},
    {"code": "CL", "country": "Chile", "name": "Chile", "ethnicity": "Hispanic - Mestizo"},
    {"code": "CN", "country": "中国", "name": "China", "ethnicity": "East Asian"},
    {"code": "CO", "country": "Colombia", "name": "Colombia", "ethnicity": "Hispanic - Mestizo"},
    {"code": "KM", "country": "Komori", "name": "Comoros", "ethnicity": "East African"},
    {"code": "CD", "country": "Congo-Kinshasa", "name": "Democratic Republic of the Congo", "ethnicity": "Central African"},
    {"code": "CG", "country": "Congo-Brazzaville", "name": "Republic of the Congo", "ethnicity": "Central African"},
    {"code": "CR", "country": "Costa Rica", "name": "Costa Rica", "ethnicity": "Hispanic - Mestizo"},
    {"code": "HR", "country": "Hrvatska", "name": "Croatia", "ethnicity": "Balkan"},
    {"code": "CU", "country": "Cuba", "name": "Cuba", "ethnicity": "Hispanic - Mestizo"},
    {"code": "CY", "country": "Κύπρος", "name": "Cyprus", "ethnicity": "Southern European"},
    {"code": "CZ", "country": "Česko", "name": "Czech Republic", "ethnicity": "Eastern European"},
    {"code": "DK", "country": "Danmark", "name": "Denmark", "ethnicity": "Northern European"},
    {"code": "DJ", "country": "Djibouti", "name": "Djibouti", "ethnicity": "East African"},
    {"code": "DO", "country": "República Dominicana", "name": "Dominican Republic", "ethnicity": "Hispanic - Mestizo"},
    {"code": "EC", "country": "Ecuador", "name": "Ecuador", "ethnicity": "Hispanic - Mestizo"},
    {"code": "EG", "country": "مصر", "name": "Egypt", "ethnicity": "Northern African"},
    {"code": "SV", "country": "El Salvador", "name": "El Salvador", "ethnicity": "Hispanic - Mestizo"},
    {"code": "GQ", "country": "Guinea Ecuatorial", "name": "Equatorial Guinea", "ethnicity": "Central African"},
    {"code": "ER", "country": "ኤርትራ", "name": "Eritrea", "ethnicity": "East African"},
    {"code": "EE", "country": "Eesti", "name": "Estonia", "ethnicity": "Northern European"},
    {"code": "ET", "country": "ኢትዮጵያ", "name": "Ethiopia", "ethnicity": "East African"},
    {"code": "FJ", "country": "Fiji", "name": "Fiji", "ethnicity": "Indigenous Australian & Maori"},
    {"code": "FI", "country": "Suomi", "name": "Finland", "ethnicity": "Northern European"},
    {"code": "FR", "country": "France", "name": "France", "ethnicity": "Western European"},
    {"code": "GA", "country": "Gabon", "name": "Gabon", "ethnicity": "Central African"},
    {"code": "GM", "country": "Gambia", "name": "Gambia", "ethnicity": "West African"},
    {"code": "GE", "country": "საქართველო", "name": "Georgia", "ethnicity": "Caucasian (Armenian, Georgian, Azerbaijani)"},
    {"code": "DE", "country": "Deutschland", "name": "Germany", "ethnicity": "Western European"},
    {"code": "GH", "country": "Ghana", "name": "Ghana", "ethnicity": "West African"},
    {"code": "GR", "country": "Ελλάδα", "name": "Greece", "ethnicity": "Southern European"},
    {"code": "GD", "country": "Grenada", "name": "Grenada", "ethnicity": "Afro-Latino"},
    {"code": "GT", "country": "Guatemala", "name": "Guatemala", "ethnicity": "Indigenous Latin American"},
    {"code": "GN", "country": "Guinée", "name": "Guinea", "ethnicity": "West African"},
    {"code": "GW", "country": "Guiné-Bissau", "name": "Guinea-Bissau", "ethnicity": "West African"},
    {"code": "GY", "country": "Guyana", "name": "Guyana", "ethnicity": "Hispanic - Mestizo"},
    {"code": "HT", "country": "Haïti", "name": "Haiti", "ethnicity": "Afro-Latino"},
    {"code": "HN", "country": "Honduras", "name": "Honduras", "ethnicity": "Hispanic - Mestizo"},
    {"code": "HU", "country": "Magyarország", "name": "Hungary", "ethnicity": "Eastern European"},
    {"code": "IS", "country": "Ísland", "name": "Iceland", "ethnicity": "Northern European"},
    {"code": "IN", "country": "भारत", "name": "India", "ethnicity": "South Asian"},
    {"code": "ID", "country": "Indonesia", "name": "Indonesia", "ethnicity": "Southeast Asian"},
    {"code": "IR", "country": "ایران", "name": "Iran", "ethnicity": "Persian (Iranian, Afghan-Persian)"},
    {"code": "IQ", "country": "العراق", "name": "Iraq", "ethnicity": "Middle Eastern - Arab"},
    {"code": "IE", "country": "Éire", "name": "Ireland", "ethnicity": "Northern European"},
    {"code": "IL", "country": "ישראל", "name": "Israel", "ethnicity": "Jewish (Ashkenazi, Sephardic, Mizrahi)"},
    {"code": "IT", "country": "Italia", "name": "Italy", "ethnicity": "Southern European"},
    {"code": "JM", "country": "Jamaica", "name": "Jamaica", "ethnicity": "Afro-Latino"},
    {"code": "JP", "country": "日本", "name": "Japan", "ethnicity": "East Asian"},
    {"code": "JO", "country": "الأردن", "name": "Jordan", "ethnicity": "Middle Eastern - Arab"},
    {"code": "KZ", "country": "Қазақстан", "name": "Kazakhstan", "ethnicity": "Central Asian"},
    {"code": "KE", "country": "Kenya", "name": "Kenya", "ethnicity": "East African"},
    {"code": "KI", "country": "Kiribati", "name": "Kiribati", "ethnicity": "Indigenous Australian & Maori"},
    {"code": "KW", "country": "الكويت", "name": "Kuwait", "ethnicity": "Middle Eastern - Arab"},
    {"code": "KG", "country": "Кыргызстан", "name": "Kyrgyzstan", "ethnicity": "Central Asian"},
    {"code": "LA", "country": "ສປປລາວ", "name": "Laos", "ethnicity": "Southeast Asian"},
    {"code": "LV", "country": "Latvija", "name": "Latvia", "ethnicity": "Northern European"},
    {"code": "LB", "country": "لبنان", "name": "Lebanon", "ethnicity": "Middle Eastern - Arab"},
    {"code": "LS", "country": "Lesotho", "name": "Lesotho", "ethnicity": "Southern African"},
    {"code": "LR", "country": "Liberia", "name": "Liberia", "ethnicity": "West African"},
    {"code": "LY", "country": "ليبيا", "name": "Libya", "ethnicity": "Northern African"},
    {"code": "LI", "country": "Liechtenstein", "name": "Liechtenstein", "ethnicity": "Central European"},
    {"code": "LT", "country": "Lietuva", "name": "Lithuania", "ethnicity": "Northern European"},
    {"code": "LU", "country": "Luxembourg", "name": "Luxembourg", "ethnicity": "Western European"},
    {"code": "MG", "country": "Madagasikara", "name": "Madagascar", "ethnicity": "East African"},
    {"code": "MW", "country": "Malawi", "name": "Malawi", "ethnicity": "East African"},
    {"code": "MY", "country": "Malaysia", "name": "Malaysia", "ethnicity": "Southeast Asian"},
    {"code": "MV", "country": "ދިވެހިރާއްޖެ", "name": "Maldives", "ethnicity": "South Asian"},
    {"code": "ML", "country": "Mali", "name": "Mali", "ethnicity": "West African"},
    {"code": "MT", "country": "Malta", "name": "Malta", "ethnicity": "Southern European"},
    {"code": "MH", "country": "Marshall Islands", "name": "Marshall Islands", "ethnicity": "Indigenous Australian & Maori"},
    {"code": "MR", "country": "موريتانيا", "name": "Mauritania", "ethnicity": "Northern African"},
    {"code": "MU", "country": "Maurice", "name": "Mauritius", "ethnicity": "East African"},
    {"code": "MX", "country": "México", "name": "Mexico", "ethnicity": "Hispanic - Mestizo"},
    {"code": "FM", "country": "Micronesia", "name": "Micronesia", "ethnicity": "Indigenous Australian & Maori"},
    {"code": "MD", "country": "Moldova", "name": "Moldova", "ethnicity": "Eastern European"},
    {"code": "MC", "country": "Monaco", "name": "Monaco", "ethnicity": "Western European"},
    {"code": "MN", "country": "Монгол", "name": "Mongolia", "ethnicity": "East Asian"},
    {"code": "ME", "country": "Crna Gora", "name": "Montenegro", "ethnicity": "Balkan"},
    {"code": "MA", "country": "المغرب", "name": "Morocco", "ethnicity": "Northern African"},
    {"code": "MZ", "country": "Moçambique", "name": "Mozambique", "ethnicity": "Southern African"},
    {"code": "MM", "country": "မြန်မာ", "name": "Myanmar", "ethnicity": "Southeast Asian"},
    {"code": "NA", "country": "Namibia", "name": "Namibia", "ethnicity": "Southern African"},
    {"code": "NR", "country": "Nauru", "name": "Nauru", "ethnicity": "Indigenous Australian & Maori"},
    {"code": "NP", "country": "नेपाल", "name": "Nepal", "ethnicity": "South Asian"},
    {"code": "NL", "country": "Nederland", "name": "Netherlands", "ethnicity": "Western European"},
    {"code": "NZ", "country": "New Zealand", "name": "New Zealand", "ethnicity": "Indigenous Australian & Maori"},
    {"code": "NI", "country": "Nicaragua", "name": "Nicaragua", "ethnicity": "Hispanic - Mestizo"},
    {"code": "NE", "country": "Niger", "name": "Niger", "ethnicity": "West African"},
    {"code": "NG", "country": "Nigeria", "name": "Nigeria", "ethnicity": "West African"},
    {"code": "KP", "country": "조선", "name": "North Korea", "ethnicity": "East Asian"},
    {"code": "MK", "country": "Северна Македонија", "name": "North Macedonia", "ethnicity": "Balkan"},
    {"code": "NO", "country": "Norge", "name": "Norway", "ethnicity": "Northern European"},
    {"code": "OM", "country": "عمان", "name": "Oman", "ethnicity": "Middle Eastern - Arab"},
    {"code": "PK", "country": "پاکستان", "name": "Pakistan", "ethnicity": "South Asian"},
    {"code": "PW", "country": "Palau", "name": "Palau", "ethnicity": "Indigenous Australian & Maori"},
    {"code": "PS", "country": "فلسطين", "name": "Palestine", "ethnicity": "Middle Eastern - Arab"},
    {"code": "PA", "country": "Panamá", "name": "Panama", "ethnicity": "Hispanic - Mestizo"},
    {"code": "PG", "country": "Papua Niugini", "name": "Papua New Guinea", "ethnicity": "Indigenous Australian & Maori"},
    {"code": "PY", "country": "Paraguay", "name": "Paraguay", "ethnicity": "Hispanic - Mestizo"},
    {"code": "PE", "country": "Perú", "name": "Peru", "ethnicity": "Hispanic - Mestizo"},
    {"code": "PH", "country": "Pilipinas", "name": "Philippines", "ethnicity": "Southeast Asian"},
    {"code": "PL", "country": "Polska", "name": "Poland", "ethnicity": "Eastern European"},
    {"code": "PT", "country": "Portugal", "name": "Portugal", "ethnicity": "Southern European"},
    {"code": "QA", "country": "قطر", "name": "Qatar", "ethnicity": "Middle Eastern - Arab"},
    {"code": "RO", "country": "România", "name": "Romania", "ethnicity": "Eastern European"},
    {"code": "RU", "country": "Россия", "name": "Russia", "ethnicity": "Eastern European"},
    {"code": "RW", "country": "Rwanda", "name": "Rwanda", "ethnicity": "East African"},
    {"code": "KN", "country": "Saint Kitts and Nevis", "name": "Saint Kitts and Nevis", "ethnicity": "Afro-Latino"},
    {"code": "LC", "country": "Saint Lucia", "name": "Saint Lucia", "ethnicity": "Afro-Latino"},
    {"code": "VC", "country": "Saint Vincent and the Grenadines", "name": "Saint Vincent and the Grenadines", "ethnicity": "Afro-Latino"},
    {"code": "WS", "country": "Samoa", "name": "Samoa", "ethnicity": "Indigenous Australian & Maori"},
    {"code": "SM", "country": "San Marino", "name": "San Marino", "ethnicity": "Southern European"},
    {"code": "ST", "country": "São Tomé e Príncipe", "name": "São Tomé and Príncipe", "ethnicity": "Central African"},
    {"code": "SA", "country": "السعودية", "name": "Saudi Arabia", "ethnicity": "Middle Eastern - Arab"},
    {"code": "SN", "country": "Sénégal", "name": "Senegal", "ethnicity": "West African"},
    {"code": "RS", "country": "Србија", "name": "Serbia", "ethnicity": "Balkan"},
    {"code": "SC", "country": "Seychelles", "name": "Seychelles", "ethnicity": "East African"},
    {"code": "SL", "country": "Sierra Leone", "name": "Sierra Leone", "ethnicity": "West African"},
    {"code": "SG", "country": "Singapore", "name": "Singapore", "ethnicity": "Southeast Asian"},
    {"code": "SK", "country": "Slovensko", "name": "Slovakia", "ethnicity": "Eastern European"},
    {"code": "SI", "country": "Slovenija", "name": "Slovenia", "ethnicity": "Balkan"},
    {"code": "SB", "country": "Solomon Islands", "name": "Solomon Islands", "ethnicity": "Indigenous Australian & Maori"},
    {"code": "SO", "country": "Soomaaliya", "name": "Somalia", "ethnicity": "East African"},
    {"code": "ZA", "country": "South Africa", "name": "South Africa", "ethnicity": "Southern African"},
    {"code": "KR", "country": "대한민국", "name": "South Korea", "ethnicity": "East Asian"},
    {"code": "SS", "country": "South Sudan", "name": "South Sudan", "ethnicity": "East African"},
    {"code": "ES", "country": "España", "name": "Spain", "ethnicity": "Southern European"},
    {"code": "LK", "country": "ශ්‍රී ලංකාව", "name": "Sri Lanka", "ethnicity": "South Asian"},
    {"code": "SD", "country": "السودان", "name": "Sudan", "ethnicity": "Northern African"},
    {"code": "SR", "country": "Suriname", "name": "Suriname", "ethnicity": "Hispanic - Mestizo"},
    {"code": "SE", "country": "Sverige", "name": "Sweden", "ethnicity": "Northern European"},
    {"code": "CH", "country": "Schweiz", "name": "Switzerland", "ethnicity": "Western European"},
    {"code": "SY", "country": "سوريا", "name": "Syria", "ethnicity": "Middle Eastern - Arab"},
    {"code": "TW", "country": "台灣", "name": "Taiwan", "ethnicity": "East Asian"},
    {"code": "TJ", "country": "Тоҷикистон", "name": "Tajikistan", "ethnicity": "Central Asian"},
    {"code": "TZ", "country": "Tanzania", "name": "Tanzania", "ethnicity": "East African"},
    {"code": "TH", "country": "ประเทศไทย", "name": "Thailand", "ethnicity": "Southeast Asian"},
    {"code": "TL", "country": "Timor-Leste", "name": "Timor-Leste", "ethnicity": "Southeast Asian"},
    {"code": "TG", "country": "Togo", "name": "Togo", "ethnicity": "West African"},
    {"code": "TO", "country": "Tonga", "name": "Tonga", "ethnicity": "Indigenous Australian & Maori"},
    {"code": "TT", "country": "Trinidad and Tobago", "name": "Trinidad and Tobago", "ethnicity": "Afro-Latino"},
    {"code": "TN", "country": "تونس", "name": "Tunisia", "ethnicity": "Northern African"},
    {"code": "TR", "country": "Türkiye", "name": "Turkey", "ethnicity": "Turkish & Kurdish"},
    {"code": "TM", "country": "Türkmenistan", "name": "Turkmenistan", "ethnicity": "Central Asian"},
    {"code": "TV", "country": "Tuvalu", "name": "Tuvalu", "ethnicity": "Indigenous Australian & Maori"},
    {"code": "UG", "country": "Uganda", "name": "Uganda", "ethnicity": "East African"},
    {"code": "UA", "country": "Україна", "name": "Ukraine", "ethnicity": "Eastern European"},
    {"code": "AE", "country": "الإمارات العربية المتحدة", "name": "United Arab Emirates", "ethnicity": "Middle Eastern - Arab"},
    {"code": "GB", "country": "United Kingdom", "name": "United Kingdom", "ethnicity": "Western European"},
    {"code": "US", "country": "United States", "name": "United States", "ethnicity": "Western European"},
    {"code": "UY", "country": "Uruguay", "name": "Uruguay", "ethnicity": "Hispanic - Mestizo"},
    {"code": "UZ", "country": "Oʻzbekiston", "name": "Uzbekistan", "ethnicity": "Central Asian"},
    {"code": "VU", "country": "Vanuatu", "name": "Vanuatu", "ethnicity": "Indigenous Australian & Maori"},
    {"code": "VA", "country": "Vatican City", "name": "Vatican City", "ethnicity": "Southern European"},
    {"code": "VE", "country": "Venezuela", "name": "Venezuela", "ethnicity": "Hispanic - Mestizo"},
    {"code": "VN", "country": "Việt Nam", "name": "Vietnam", "ethnicity": "Southeast Asian"},
    {"code": "YE", "country": "اليمن", "name": "Yemen", "ethnicity": "Middle Eastern - Arab"},
    {"code": "ZM", "country": "Zambia", "name": "Zambia", "ethnicity": "Southern African"},
    {"code": "ZW", "country": "Zimbabwe", "name": "Zimbabwe", "ethnicity": "Southern African"}
  ]

  currencies:any[] = [
    "EUR",
    "USD",
    "GBP",
    "JPY",
    "DKK",
    "SEK",
    "AUD"
  ]
  currencyNames:any[] = [
    {code:"EUR",title: "Euro",symbol:"€"},
    {code:"USD",title: "US Dollar",symbol:"$"},
    {code:"GBP",title: "British Pound",symbol:"£"},
    {code:"JPY",title: "Japanese Yen",symbol:"¥"},
    {code:"DKK",title: "Danish Krone",symbol:"kr"},
    {code:"SEK",title: "Swedish Krona",symbol:"kr"},
    {code:"AUD",title: "Australian Dollar",symbol:"$"}
]

  constructor() { }

  currency(code:string){
    let currency = this.currencyNames.find(item => item.code === code.toUpperCase());
    if(!currency){
      return {code:"EUR",title: "Euro"}
    }
    return currency;
  }

  country(code:string){
    let country = this.list.find(item => item.code === code.toUpperCase());
    country.flag = 'assets/flags/'+country.code.toLowerCase()+'.svg';
    country.title = country.country;
    country.value = country.code;
    if(!country){
      return {}
    }
    return country;
  }

  ethnicities(code:string){
    const country = this.country(code);
    if(!country){
      return
    }
    let countryList = this.list.filter
    (item =>
      item.ethnicity === country.ethnicity
    );
  }

  availableCurrency(code:string){
    if(!code||!this.currencies.includes(code)){
      return "EUR"
    }
    return code
  }
}
