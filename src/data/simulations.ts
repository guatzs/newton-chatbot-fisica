export interface ParamSpec {
  key: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

export type ParameterizedSimulationId = 'coulomb' | 'ohm';

export const SIM_SPECS: Record<ParameterizedSimulationId, ParamSpec[]> = {
  coulomb: [
    { key: 'q1', unit: 'µC', min: -10, max: 10, step: 0.1, default: 2 },
    { key: 'q2', unit: 'µC', min: -10, max: 10, step: 0.1, default: -3 },
    { key: 'r', unit: 'm', min: 0.2, max: 2.0, step: 0.01, default: 0.5 },
  ],
  ohm: [
    { key: 'v', unit: 'V', min: 0, max: 12, step: 0.1, default: 6 },
    { key: 'res', unit: 'Ω', min: 1, max: 1000, step: 1, default: 50 },
  ],
};
