import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TrainerCoursesPageRoutingModule } from './trainer-courses-routing.module';

import { TrainerCoursesPage } from './trainer-courses.page';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { ComponentsModule } from 'src/app/components/components.module';
import { QuillModule } from 'ngx-quill';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TrainerCoursesPageRoutingModule,
    ComponentsModule,
    PipesModule,
    FontAwesomeModule,
    QuillModule,
    TranslateModule
  ],
  declarations: [TrainerCoursesPage]
})
export class TrainerCoursesPageModule {}
