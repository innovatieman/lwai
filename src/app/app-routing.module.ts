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
    path: 'landing',
    loadChildren: () => import('./pages/landing/landing.module').then( m => m.LandingPageModule)
  },
  {
    path: 'account',
    loadChildren: () => import('./pages/account/account.module').then( m => m.AccountPageModule),
    canActivate: [AuthGuard],
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
    path: 'avatar',
    loadChildren: () => import('./pages/test-pages/avatar/avatar.module').then( m => m.AvatarPageModule)
  },
  {
    path: 'backup-modal',
    loadChildren: () => import('./components/modals/backup-modal/backup-modal.module').then( m => m.BackupModalPageModule)
  },
  {
    path: 'trainer/cases',
    loadChildren: () => import('./trainer/trainer-cases/trainer-cases.module').then( m => m.TrainerCasesPageModule),
    canActivate: [AdminGuard,TrainerGuard],
  },
  {
    path: 'bagend/agent',
    loadChildren: () => import('./bagend/agent/agent.module').then( m => m.AgentPageModule),
    canActivate: [AdminGuard],
  },
  {
    path: 'bagend/agent/:type',
    loadChildren: () => import('./bagend/agent/agent.module').then( m => m.AgentPageModule),
    canActivate: [AdminGuard],
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
    path: 'trainer/info-items',
    loadChildren: () => import('./trainer/trainer-info-items/trainer-info-items.module').then( m => m.TrainerInfoItemsPageModule),
    canActivate: [AdminGuard,TrainerGuard],
  },
  {
    path: 'bagend/engine',
    loadChildren: () => import('./bagend/engine/engine.module').then( m => m.EnginePageModule)
  },
 




  // {
  //   path: '**',
  //   redirectTo: 'conversations/transformative',
  //   pathMatch: 'full'
  // },
  



];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
