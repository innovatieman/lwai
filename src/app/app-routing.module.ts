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
    path: 'start/:tab',
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
    // canActivate: [AuthGuard],
  },
  {
    path: 'account/:tab',
    loadChildren: () => import('./pages/account/account.module').then( m => m.AccountPageModule),
    canActivate: [AuthGuard],
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
    path: 'trainer/courses/:tab',
    loadChildren: () => import('./trainer/trainer-courses/trainer-courses.module').then( m => m.TrainerCoursesPageModule),
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
    path: 'trainer/users/:course_id',
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
  {
    path: 'enlist/:course_id',
    loadChildren: () => import('./pages/enlist/enlist.module').then( m => m.EnlistPageModule)
  },
  {
    path: 'verify',
    loadChildren: () => import('./auth/pages/verify/verify.module').then( m => m.VerifyPageModule)
  },
  {
    path: 'wait-verify',
    loadChildren: () => import('./auth/pages/wait-verify/wait-verify.module').then( m => m.WaitVerifyPageModule)
  }, 
  {
    path: 'bagend/types',
    loadChildren: () => import('./bagend/types/types.module').then( m => m.TypesPageModule)
  },
  {
    path: 'bagend/photo-generator',
    loadChildren: () => import('./bagend/photo-generator/photo-generator.module').then( m => m.PhotoGeneratorPageModule),
    canActivate: [AdminGuard],
  },
  {
    path: 'bagend/token-analysis',
    loadChildren: () => import('./bagend/token-analysis/token-analysis.module').then( m => m.TokenAnalysisPageModule),
    canActivate: [AdminGuard],
  },
  {
    path: 'documents/:document_id',
    loadChildren: () => import('./auth/pages/documents/documents.module').then( m => m.DocumentsPageModule)
  },

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
  {
    path: 'select-many',
    loadChildren: () => import('./components/modals/select-many/select-many.module').then( m => m.SelectManyPageModule)
  },
  {
    path: 'token-analysis',
    loadChildren: () => import('./bagend/token-analysis/token-analysis.module').then( m => m.TokenAnalysisPageModule)
  },
  {
    path: 'achievement',
    loadChildren: () => import('./components/achievement/achievement.module').then( m => m.AchievementPageModule)
  },
  {
    path: 'evaluation',
    loadChildren: () => import('./components/modals/evaluation/evaluation.module').then( m => m.EvaluationPageModule)
  },
  {
    path: 'select-image-library',
    loadChildren: () => import('./components/modals/select-image-library/select-image-library.module').then( m => m.SelectImageLibraryPageModule)
  },











];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
