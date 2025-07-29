export interface DataValidationRule {
  field: string;
  type: 'required' | 'email' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
  severity: 'error' | 'warning';
}

export interface DataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  dataQuality: number;
  validationTime: number;
  rulesApplied: DataValidationRule[];
}