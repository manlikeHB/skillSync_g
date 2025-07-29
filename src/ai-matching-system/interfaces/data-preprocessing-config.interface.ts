export interface DataPreprocessingConfig {
  normalization: {
    enabled: boolean;
    method: 'minmax' | 'zscore' | 'robust';
    fields: string[];
  };
  encoding: {
    enabled: boolean;
    method: 'onehot' | 'label' | 'target';
    categoricalFields: string[];
  };
  featureEngineering: {
    enabled: boolean;
    features: string[];
    transformations: Record<string, string>;
  };
  outlierDetection: {
    enabled: boolean;
    method: 'iqr' | 'zscore' | 'isolation_forest';
    threshold: number;
  };
}