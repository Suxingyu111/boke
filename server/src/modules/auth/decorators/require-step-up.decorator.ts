import { SetMetadata } from '@nestjs/common';

export const STEP_UP_KEY = 'auth:step-up';

export interface StepUpRequirement {
  scope: string;
}

export const RequireStepUp = (scope: string) =>
  SetMetadata(STEP_UP_KEY, {
    scope,
  } satisfies StepUpRequirement);
