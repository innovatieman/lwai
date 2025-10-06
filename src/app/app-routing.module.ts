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
    path: 'start/welcome',
    loadChildren: () => import('./auth/pages/wait-verify/wait-verify.module').then( m => m.WaitVerifyPageModule)
  }, 
  {
    path: 'start/:tab',
    loadChildren: () => import('./pages/start/start.module').then( m => m.StartPageModule),
    canActivate: [AuthGuard],
  },
  {
    path: 'start/:tab/:case_types',
    loadChildren: () => import('./pages/start/start.module').then( m => m.StartPageModule),
    canActivate: [AuthGuard],
  },
  {
    path: 'start/:tab/:training_id/:item_id',
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
    path: 'login/:type',
    loadChildren: () => import('./auth/pages/login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'unsubscribe',
    loadChildren: () => import('./pages/unsubscribe/unsubscribe.module').then( m => m.UnsubscribePageModule)
  },
  {
    path: 'bagend/cases',
    loadChildren: () => import('./bagend/cases/cases.module').then( m => m.CasesPageModule),
    canActivate: [AdminGuard],
  },
  {
    path: 'conversation/:case',
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
    path: 'account/:tab',
    loadChildren: () => import('./pages/account/account.module').then( m => m.AccountPageModule),
    canActivate: [AuthGuard],
  },
  {
    path: 'account/:tab/:status',
    loadChildren: () => import('./pages/account/account.module').then( m => m.AccountPageModule),
    canActivate: [AuthGuard],
  },
  {
    path: 'conversation-start',
    loadChildren: () => import('./components/modals/conversation-start/conversation-start.module').then( m => m.ConversationStartPageModule),
    canActivate: [AuthGuard],
  },
  {
    path: 'generate-case',
    loadChildren: () => import('./components/modals/generate-case/generate-case.module').then( m => m.GenerateCasePageModule),
    canActivate: [AuthGuard],
  },

  {
    path: 'bagend/engine',
    loadChildren: () => import('./bagend/engine/engine.module').then( m => m.EnginePageModule),
    canActivate: [AdminGuard],
  },
  {
    path: 'course/:course_id',
    loadChildren: () => import('./pages/course/course.module').then( m => m.CoursePageModule),
    canActivate: [AuthGuard],
  },

  {
    path: 'bagend/conversations',
    loadChildren: () => import('./bagend/search-conversations/search-conversations.module').then( m => m.SearchConversationsPageModule),
    canActivate: [AdminGuard],
  },
  {
    path: 'bagend/analyse-conversations',
    loadChildren: () => import('./bagend/analyse-conversations/analyse-conversations.module').then( m => m.AnalyseConversationsPageModule),
    canActivate: [AdminGuard],
  },
  {
    path: 'enlist/:course_id',
    loadChildren: () => import('./pages/enlist/enlist.module').then( m => m.EnlistPageModule),
    canActivate: [AuthGuard],
  },
  {
    path: 'verify',
    loadChildren: () => import('./auth/pages/verify/verify.module').then( m => m.VerifyPageModule),
  },
  {
    path: 'wait-verify',
    loadChildren: () => import('./auth/pages/wait-verify/wait-verify.module').then( m => m.WaitVerifyPageModule),
  }, 
  {
    path: 'bagend/types',
    loadChildren: () => import('./bagend/types/types.module').then( m => m.TypesPageModule),
    canActivate: [AdminGuard],
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
    loadChildren: () => import('./auth/pages/documents/documents.module').then( m => m.DocumentsPageModule),
    canActivate: [AuthGuard],
  },

  {
    path: 'bagend/tutorials',
    loadChildren: () => import('./bagend/tutorials/tutorials.module').then( m => m.TutorialsPageModule),
    canActivate: [AdminGuard],
  },
  {
    path: 'bagend/user-messages',
    loadChildren: () => import('./bagend/user-messages/user-messages.module').then( m => m.UserMessagesPageModule),
    canActivate: [AdminGuard],
  },
  {
    path: 'bagend/voices',
    loadChildren: () => import('./bagend/voices/voices.module').then( m => m.VoicesPageModule),
    canActivate: [AdminGuard],
  },
  {
    path: 'bagend/analytics',
    loadChildren: () => import('./bagend/analytics/analytics.module').then( m => m.AnalyticsPageModule),
    canActivate: [AdminGuard],
  },
  {
    path: 'bagend/backup',
    loadChildren: () => import('./bagend/backup/backup.module').then( m => m.BackupPageModule),
    canActivate: [AdminGuard],
  },
  {
    path: 'verifysocial/:id/:action',
    loadChildren: () => import('./bagend/verifysocial/verifysocial.module').then( m => m.VerifysocialPageModule),
    canActivate: [AdminGuard],
  },
  {
    path: 'bagend/socials',
    loadChildren: () => import('./bagend/socials/socials.module').then( m => m.SocialsPageModule),
    canActivate: [AdminGuard],
  },
  {
    path: 'bagend/ai-organisation',
    loadChildren: () => import('./bagend/ai-organisation/ai-organisation.module').then( m => m.AiOrganisationPageModule),
    canActivate: [AdminGuard],
  },
  {
    path: 'bagend/ai-organisation/:project_id',
    loadChildren: () => import('./bagend/ai-organisation/ai-organisation.module').then( m => m.AiOrganisationPageModule),
    canActivate: [AdminGuard],
  },
  {
    path: 'trainer/cases',
    loadChildren: () => import('./trainer/cases/cases.module').then( m => m.CasesPageModule),
    canActivate: [AuthGuard,TrainerGuard],
  },
  {
    path: 'trainer/modules',
    loadChildren: () => import('./trainer/modules/modules.module').then( m => m.ModulesPageModule),
    canActivate: [AuthGuard,TrainerGuard],
  },
  {
    path: 'trainer/trainings',
    loadChildren: () => import('./trainer/trainings/trainings.module').then( m => m.TrainingsPageModule),
    canActivate: [AuthGuard,TrainerGuard],
  },
  {
    path: 'trainer/trainings/:training_id',
    loadChildren: () => import('./trainer/trainings/trainings.module').then( m => m.TrainingsPageModule),
    canActivate: [AuthGuard,TrainerGuard],
  },
  {
    path: 'trainer/info-items',
    loadChildren: () => import('./trainer/info-items/info-items.module').then( m => m.InfoItemsPageModule),
    canActivate: [AuthGuard,TrainerGuard],
  },
  {
    path: 'trainer/dashboard',
    loadChildren: () => import('./trainer/dashboard/dashboard.module').then( m => m.DashboardPageModule),
     canActivate: [AuthGuard,TrainerGuard],
  },
  {
    path: 'trainer/dashboard/:part',
    loadChildren: () => import('./trainer/dashboard/dashboard.module').then( m => m.DashboardPageModule),
     canActivate: [AuthGuard,TrainerGuard],
  },
  {
    path: 'trainer/example/:type/:id',
    loadChildren: () => import('./trainer/example/example.module').then( m => m.ExamplePageModule),
     canActivate: [AuthGuard,TrainerGuard],
  },
  {
    path: 'trainer/customers',
    loadChildren: () => import('./trainer/customers/customers.module').then( m => m.CustomersPageModule),
    canActivate: [AuthGuard,TrainerGuard],
  },
  {
    path: 'marketplace',
    loadChildren: () => import('./pages/marketplace/marketplace.module').then( m => m.MarketplacePageModule),
    // canActivate: [AuthGuard],
  },
  {
    path: 'marketplace/:tab',
    loadChildren: () => import('./pages/marketplace/marketplace.module').then( m => m.MarketplacePageModule),
    // canActivate: [AuthGuard],
  },
  {
    path: 'marketplace/:tab/:item_id',
    loadChildren: () => import('./pages/marketplace/marketplace.module').then( m => m.MarketplacePageModule),
    // canActivate: [AuthGuard],
  },
  {
    path: 'checkout/:item_id',
    loadChildren: () => import('./pages/checkout/checkout.module').then( m => m.CheckoutPageModule)
  },
  {
    path: 'checkout/:item_id/:status',
    loadChildren: () => import('./pages/checkout/checkout.module').then( m => m.CheckoutPageModule)
  },
  {
    path: 'public/cases',
    loadChildren: () => import('./public/cases/cases.module').then( m => m.CasesPageModule)
  },
    {
    path: 'bagend/create-trainer',
    loadChildren: () => import('./bagend/create-trainer/create-trainer.module').then( m => m.CreateTrainerPageModule),
    canActivate: [AdminGuard],
  },
  {
    path: 'bagend/mailflow',
    loadChildren: () => import('./bagend/mailflow/mailflow.module').then( m => m.MailflowPageModule),
    canActivate: [AdminGuard],
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
  {
    path: 'achievement-horizontal',
    loadChildren: () => import('./components/achievement-horizontal/achievement-horizontal.module').then( m => m.AchievementHorizontalPageModule)
  },
  {
    path: 'caseinfo',
    loadChildren: () => import('./components/modals/caseinfo/caseinfo.module').then( m => m.CaseinfoPageModule)
  },
  {
    path: 'modules',
    loadChildren: () => import('./trainer/modules/modules.module').then( m => m.ModulesPageModule)
  },
  {
    path: 'trainings',
    loadChildren: () => import('./trainer/trainings/trainings.module').then( m => m.TrainingsPageModule)
  },
  {
    path: 'backup',
    loadChildren: () => import('./bagend/backup/backup.module').then( m => m.BackupPageModule)
  },
  {
    path: 'trainer-info',
    loadChildren: () => import('./components/modals/trainer-info/trainer-info.module').then( m => m.TrainerInfoPageModule)
  },
  {
    path: 'sales-trainings',
    loadChildren: () => import('./components/modals/sales-trainings/sales-trainings.module').then( m => m.SalesTrainingsPageModule)
  },
  {
    path: 'example',
    loadChildren: () => import('./components/modals/example/example.module').then( m => m.ExamplePageModule)
  },
  


  

  

  
  
  
  
  

  
  
  













];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
