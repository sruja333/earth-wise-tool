declare module 'ml-random-forest' {
  export class RandomForestRegression {
    constructor(options?: {
      seed?: number;
      maxFeatures?: number;
      replacement?: boolean;
      nEstimators?: number;
    });
    
    train(features: number[][], labels: number[]): void;
    predict(features: number[][]): number[];
  }
}
