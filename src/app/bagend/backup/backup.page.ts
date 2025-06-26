import { Component, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';

@Component({
  selector: 'app-backup',
  templateUrl: './backup.page.html',
  styleUrls: ['./backup.page.scss'],
})
export class BackupPage implements OnInit {

  constructor(
    private functions:AngularFireFunctions, // Assuming you have AngularFireFunctions set up
  ) { }

  ngOnInit() {
    // this.testEmbeddingSearch("De opdracht is om een applicatie te bouwen die de gebruikers in staat stelt om hun eigen gegevens te beheren en te delen met anderen. De applicatie moet gebruiksvriendelijk zijn en een intuïtieve interface hebben. Het moet ook veilig zijn en voldoen aan de privacywetgeving.")
    // this.testEmbedding('Flierefluiters zijn een soort van kleine, kleurrijke insecten die vaak in tuinen worden aangetroffen. Ze hebben een kenmerkende manier van bewegen en kunnen soms irritant zijn, maar ze spelen ook een belangrijke rol in het ecosysteem door het bestuiven van bloemen en het helpen bij de afbraak van organisch materiaal.');
  }

  async backupFirestore() {
    this.functions.httpsCallable('manualFirestoreBackups')({}).subscribe(result=>{
      console.log('Backup successful:', result);
    })
  }

  // async testEmbedding(text: string) {
  //   let url = 'https://europe-west1-lwai-3bac8.cloudfunctions.net/testEmbeddings';
  //   const response = await fetch(url, {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //     },
  //     body: JSON.stringify({text: text}),
  //   });
  //   if (!response.body) {
  //     throw new Error("Response body is null");
  //   }
  //   if (!response.ok) {
  //     console.error("Request failed:", response.status, response.statusText);
  //     return;
  //   }

  //   try {
  //     let result = await response.json();
  //     console.log('Embedding result:', result);
  //   } catch (error) {
  //     console.error("Error parsing JSON response:", error);
  //   }
     
  // }

  // testEmbeddingSearch(text: string) {
  //   this.functions.httpsCallable('testSearchVectors')({query: text}).subscribe(result => {
  //     console.log('Search result:', result);
  //   })
  // }
}
