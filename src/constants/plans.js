// Subscription plan tiers — matches CLAUDE.md section 5
export const PLAN_CORE = 'core'
export const PLAN_FIELD = 'field'
export const PLAN_PREMIUM = 'premium'
export const PLAN_ENTERPRISE = 'enterprise'

export const PLANS = [PLAN_CORE, PLAN_FIELD, PLAN_PREMIUM, PLAN_ENTERPRISE]

export const PLAN_NAMES = {
  [PLAN_CORE]: 'Core',
  [PLAN_FIELD]: 'Field',
  [PLAN_PREMIUM]: 'Premium',
  [PLAN_ENTERPRISE]: 'Enterprise'
}

export const PLAN_ORDER = [PLAN_CORE, PLAN_FIELD, PLAN_PREMIUM, PLAN_ENTERPRISE]
