import { Component, OnInit , Input, Output, EventEmitter, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { IconsService } from 'src/app/services/icons.service';

@Component({
  selector: 'app-star-rating',
  templateUrl: './star-rating.component.html',
  styleUrls: ['./star-rating.component.scss'],
})
export class StarRatingComponent implements OnInit {
  @Input() rating: any = 0;
  @Input() readOnlyItem: boolean = false;
  @Input() fontSize: any = 50;
  @Output() ratingChanged = new EventEmitter<number>();
  @Input() starAmount: any = 5;

  stars: boolean[] = Array(5).fill(false);
  fullStars: number[] = Array(5).fill(0);
  starPercentages: number[] = [0,0,0,0,0]
  constructor(
    public icon:IconsService,
    private rf:ChangeDetectorRef
  ) { }



  ngOnInit() {
    this.stars = Array(this.starAmount).fill(false);
    this.fullStars = Array(this.starAmount).fill(0);
    this.highlightStars(); 
    this.halfStars();
  }

  rate(index: number): void {
    if(this.readOnlyItem) return;
    this.rating = index;
    // console.log(this.rating)
    this.rf.detectChanges();
    this.ratingChanged.emit(this.rating);
    setTimeout(() => {
      this.highlightStars();
      this.halfStars();
    },10)
  }

  highlightStars(): void {
      this.stars = this.stars.map((_, index) => index < this.rating);
  }

  halfStars(): void {
    // if(!this.readOnlyItem){return}
    let starsFull = parseInt(this.rating)
    let starsHalf = parseFloat(this.rating) - starsFull
    for(let star in this.fullStars){

      for(let i = 0; i < starsFull; i++){
        this.fullStars[i] = 100;
      }
      if(starsHalf > 0){
        this.fullStars[starsFull] = Math.round(starsHalf * 100);
      }
    }
  }
  



  starClass(index: number,rating:any): string {
    if(rating == 0){
      return 'unrated';
    }
    return this.stars[index] ? 'rated' : 'unrated';
  }

}
