import { ResolveFn } from '@angular/router';

export const subscriptionsResolver: ResolveFn<boolean> = (route, state) => {
  return true;
};
