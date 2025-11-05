import Papa from 'papaparse';
import { RandomForestRegression as RandomForest } from 'ml-random-forest';

interface TrainingData {
  features: number[][];
  labels: number[];
}

let trainedModel: any = null;
let isModelReady = false;

// Encoding maps for categorical variables
const encodingMaps = {
  transportMode: { car: 0, bike: 1, bus: 2, metro: 3, bicycle: 4, walk: 5 },
  carpool: { yes: 1, no: 0 },
  acUsage: { never: 0, occasionally: 1, daily: 2 },
  renewableEnergy: { yes: 1, no: 0 },
  localFood: { yes: 1, no: 0 },
  recycle: { yes: 1, no: 0 },
};

function encodeFeatures(data: any): number[] {
  return [
    parseFloat(data.travelKmPerDay),
    encodingMaps.transportMode[data.transportMode as keyof typeof encodingMaps.transportMode] ?? 0,
    encodingMaps.carpool[data.carpool as keyof typeof encodingMaps.carpool] ?? 0,
    parseFloat(data.electricityUnits),
    encodingMaps.acUsage[data.acUsage as keyof typeof encodingMaps.acUsage] ?? 0,
    encodingMaps.renewableEnergy[data.renewableEnergy as keyof typeof encodingMaps.renewableEnergy] ?? 0,
    parseFloat(data.meatMealsPerWeek),
    parseFloat(data.dairyLitersPerDay),
    encodingMaps.localFood[data.localFood as keyof typeof encodingMaps.localFood] ?? 0,
    parseFloat(data.wasteKgPerWeek),
    encodingMaps.recycle[data.recycle as keyof typeof encodingMaps.recycle] ?? 0,
    parseFloat(data.waterUsageLiters),
    parseFloat(data.shoppingFreq),
    parseFloat(data.onlineOrders),
  ];
}

async function loadAndPrepareData(): Promise<TrainingData> {
  const response = await fetch('/data/carbon_dataset.csv');
  const csvText = await response.text();

  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const features: number[][] = [];
        const labels: number[] = [];

        // Sample only first 500 rows for faster training
        const maxRows = Math.min(500, results.data.length);
        
        for (let i = 0; i < maxRows; i++) {
          const row: any = results.data[i];
          if (row.carbonFootprint_kg_per_month) {
            features.push(encodeFeatures(row));
            labels.push(parseFloat(row.carbonFootprint_kg_per_month));
          }
        }

        resolve({ features, labels });
      },
      error: (error) => reject(error),
    });
  });
}

export async function initializeModel(): Promise<void> {
  if (isModelReady) return;

  try {
    const { features, labels } = await loadAndPrepareData();
    
    // Train Random Forest model with fewer trees for speed
    trainedModel = new RandomForest({
      seed: 42,
      maxFeatures: 0.8,
      replacement: true,
      nEstimators: 30,
    });

    trainedModel.train(features, labels);
    isModelReady = true;
    console.log('ML model trained successfully');
  } catch (error) {
    console.error('Failed to initialize ML model:', error);
    throw error;
  }
}

export function predictCarbonFootprint(inputData: any): number {
  if (!isModelReady || !trainedModel) {
    throw new Error('Model not initialized. Call initializeModel() first.');
  }

  const features = encodeFeatures(inputData);
  const prediction = trainedModel.predict([features])[0];
  
  return Math.max(0, prediction); // Ensure non-negative predictions
}

export function isModelInitialized(): boolean {
  return isModelReady;
}
