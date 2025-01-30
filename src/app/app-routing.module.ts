import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AdminGuard } from './auth/admin.guard';
import { AuthGuard } from './auth/auth.guard';
import { TrainerGuard } from './auth/trainer.guard';

const routes: Routes = [

  {
    path: '',
    redirectTo: 'start',
    pathMatch: 'full'
  },

  {
    path: 'start',
    loadChildren: () => import('./pages/start/start.module').then( m => m.StartPageModule),
    canActivate: [AuthGuard],
  },
  {
    path: 'register',
    loadChildren: () => import('./auth/pages/register/register.module').then( m => m.RegisterPageModule)
  },
  {
    path: 'login',
    loadChildren: () => import('./auth/pages/login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'bagend/cases',
    loadChildren: () => import('./bagend/cases/cases.module').then( m => m.CasesPageModule),
    canActivate: [AdminGuard],
  },
  {
    path: 'conversation/:conversation/:case',
    loadChildren: () => import('./pages/conversation/conversation.module').then( m => m.ConversationPageModule),
    canActivate: [AuthGuard],
  },
  {
    path: 'bagend/users',
    loadChildren: () => import('./bagend/users/users.module').then( m => m.UsersPageModule),
    canActivate: [AdminGuard],
  },
  {
    path: 'not-authorized',
    loadChildren: () => import('./auth/pages/not-authorized/not-authorized.module').then( m => m.NotAuthorizedPageModule)
  },
  {
    path: 'account',
    loadChildren: () => import('./pages/account/account.module').then( m => m.AccountPageModule),
    canActivate: [AuthGuard],
  },
  
  {
    path: 'trainer/cases',
    loadChildren: () => import('./trainer/trainer-cases/trainer-cases.module').then( m => m.TrainerCasesPageModule),
    canActivate: [AdminGuard,TrainerGuard],
  },
  {
    path: 'conversation-start',
    loadChildren: () => import('./components/modals/conversation-start/conversation-start.module').then( m => m.ConversationStartPageModule)
  },
  {
    path: 'trainer/courses',
    loadChildren: () => import('./trainer/trainer-courses/trainer-courses.module').then( m => m.TrainerCoursesPageModule),
    canActivate: [AdminGuard,TrainerGuard],
  },
  
  {
    path: 'trainer/info-items',
    loadChildren: () => import('./trainer/trainer-info-items/trainer-info-items.module').then( m => m.TrainerInfoItemsPageModule),
    canActivate: [AdminGuard,TrainerGuard],
  },
  {
    path: 'bagend/engine',
    loadChildren: () => import('./bagend/engine/engine.module').then( m => m.EnginePageModule),
    canActivate: [AdminGuard],
  },
  {
    path: 'trainer/users',
    loadChildren: () => import('./trainer/trainer-users/trainer-users.module').then( m => m.TrainerUsersPageModule),
    canActivate: [AdminGuard,TrainerGuard],
  },
  {
    path: 'course/:course_id',
    loadChildren: () => import('./pages/course/course.module').then( m => m.CoursePageModule)
  },

  {
    path: 'bagend/conversations',
    loadChildren: () => import('./bagend/search-conversations/search-conversations.module').then( m => m.SearchConversationsPageModule),
    canActivate: [AdminGuard],
  },

  // rest of the routes
  {
    path: '**',
    redirectTo: 'start',
    pathMatch: 'full'
  },

  // modals
  {
    path: 'verification',
    loadChildren: () => import('./components/modals/verification/verification.module').then( m => m.VerificationPageModule)
  },
  {
    path: 'input-fields',
    loadChildren: () => import('./components/modals/input-fields/input-fields.module').then( m => m.InputFieldsPageModule)
  },
  {
    path: 'edit-html',
    loadChildren: () => import('./components/modals/edit-html/edit-html.module').then( m => m.EditHtmlPageModule)
  },
  {
    path: 'select-item',
    loadChildren: () => import('./components/modals/select-item/select-item.module').then( m => m.SelectItemPageModule)
  },
  {
    path: 'select-date',
    loadChildren: () => import('./components/modals/select-date/select-date.module').then( m => m.SelectDatePageModule)
  },  
  {
    path: 'popover-menu',
    loadChildren: () => import('./components/modals/popover-menu/popover-menu.module').then( m => m.PopoverMenuPageModule)
  },
  {
    path: 'info-modal',
    loadChildren: () => import('./components/modals/info-modal/info-modal.module').then( m => m.InfoModalPageModule)
  },
  {
    path: 'options-modal',
    loadChildren: () => import('./components/modals/options-modal/options-modal.module').then( m => m.OptionsModalPageModule)
  },
  {
    path: 'backup-modal',
    loadChildren: () => import('./components/modals/backup-modal/backup-modal.module').then( m => m.BackupModalPageModule)
  },
  {
    path: 'rate-learning',
    loadChildren: () => import('./components/modals/rate-learning/rate-learning.module').then( m => m.RateLearningPageModule)
  },
  {
    path: 'search-conversations',
    loadChildren: () => import('./bagend/search-conversations/search-conversations.module').then( m => m.SearchConversationsPageModule)
  },




];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
