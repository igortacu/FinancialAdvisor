type AnalyticsEvent = 
  | 'AddTransaction'
  | 'EditCategory'
  | 'CreateBudget'
  | 'ImportCSV'
  | 'HitBudgetLimit';

interface AnalyticsProperties {
  [key: string]: any;
}

export const AnalyticsService = {
  track: (event: AnalyticsEvent, properties?: AnalyticsProperties) => {
    // In a real app, this would send data to an analytics backend.
    // For now, we'll just log it to the console in development.
    if (__DEV__) {
      console.log(`[Analytics] ${event}`, properties);
    }
    // TODO: Integrate with a real analytics provider (e.g. Segment, Firebase)
    // Note: 'EditCategory' and 'ImportCSV' events are defined but not yet implemented 
    // as the corresponding features were not found in the current codebase.
  }
};
