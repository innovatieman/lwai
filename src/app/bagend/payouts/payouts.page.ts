import { Component, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { TranslateService } from '@ngx-translate/core';
import { FirestoreService } from 'src/app/services/firestore.service';

@Component({
  selector: 'app-payouts',
  templateUrl: './payouts.page.html',
  styleUrls: ['./payouts.page.scss'],
})
export class PayoutsPage implements OnInit {

  constructor(
    private functions:AngularFireFunctions,
    private firestore:FirestoreService,
    public translate:TranslateService

  ) { }

  ngOnInit() {
  }

  createSelfBilling(){
    let invoice:any = {
      to:'temp@alicialabs.com',
      language:this.translate.currentLang,
      from: 'AliciaLabs Finance <selfbilling@alicialabs.com>',
      data:{
        displayName: "Jenny Duijndam",
        trainerName: "De Slimme Leider",
        trainerAddress: "Essex 5",
        postal_code: '3831 EL',
        city: 'Leusden',
        country: 'Netherlands',
        trainerChamber: "85666068",
        trainerVat: "NL004129187B30",
        trainerIban: "NL42KNAB0416438385",
        invoiceNumber: "Ft6ReP - 250001",
        invoiceDate: new Date().toLocaleDateString('nl-NL'),
        invoiceDescription: "Uitbetaling AliciaLabs november 2025",
        amountExcl: 455.37,
        customerEmail: 'temp@alicialabs.com',
        emailId: "Ft6RePuwZCOJuCKlmYfCR7KLV2W2",
        userId:"Ft6RePuwZCOJuCKlmYfCR7KLV2W2"
      }
    };
    
    this.firestore.create('selfBilling', invoice).then(() => {
      console.log('Self-billing invoice request created in Firestore.');
    }).catch((error) => {
      console.error('Error creating self-billing invoice request:', error);
    });


    // const callable = this.functions.httpsCallable('generateSelfBillingInvoice');
    // callable(invoice).subscribe({
    //   next: (result) => {
    //     console.log('Invoice created successfully:', result);
    //   },
    //   error: (error) => {
    //     console.error('Error creating invoice:', error);
    //   }
    // });
  }


}
