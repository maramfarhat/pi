import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
});

export async function checkPredictionApi() {
  const { data } = await client.get('/health');
  return data;
}

export async function predictBehavior(payload) {
  const { data } = await client.post('/predict/behavior', payload);
  return data;
}

export async function predictMilk(payload) {
  const { data } = await client.post('/predict/milk', payload);
  return data;
}

/** THI, CBT (cbt_temp_c), optional lying_minutes_8h or pred_behavior, cow_id. */
export async function predictStress(payload) {
  const { data } = await client.post('/predict/stress', payload);
  return data;
}

export async function simulateTick() {
  const { data } = await client.get('/simulate/tick');
  return data;
}
