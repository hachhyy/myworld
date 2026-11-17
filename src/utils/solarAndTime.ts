import { SolarOverride, WeatherOverride } from '../store/useWorldStore';

export interface SolarEnvironment {
  timeOfDay: 'day' | 'sunset' | 'night';
  isNightMode: boolean;
  weather: 'clear' | 'snow' | 'fireworks';
  skyTopColor: string;
  skyBottomColor: string;
  ambientIntensity: number;
  sunColor: string;
  label: string;
}

export function computeSolarEnvironment(
  solarOverride: SolarOverride,
  weatherOverride: WeatherOverride,
  anniversaryDate: string,
  birthdayA: string,
  birthdayB: string
): SolarEnvironment {
  const now = new Date();
  const hour = now.getHours();
  const month = now.getMonth() + 1; // 1-12
  const mmdd = `${String(month).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  let timeOfDay: 'day' | 'sunset' | 'night' = 'day';
  if (solarOverride !== 'auto') {
    timeOfDay = solarOverride;
  } else {
    if (hour >= 21 || hour < 7) {
      timeOfDay = 'night';
    } else if (hour >= 18 && hour < 21) {
      timeOfDay = 'sunset';
    } else {
      timeOfDay = 'day';
    }
  }

  let weather: 'clear' | 'snow' | 'fireworks' = 'clear';
  if (weatherOverride !== 'auto') {
    weather = weatherOverride;
  } else {
    const isSpecialDay =
      anniversaryDate.slice(5) === mmdd ||
      birthdayA.slice(5) === mmdd ||
      birthdayB.slice(5) === mmdd;

    if (isSpecialDay) {
      weather = 'fireworks';
    } else if (month === 12 || month === 1 || month === 2) {
      weather = 'snow';
    } else {
      weather = 'clear';
    }
  }

  if (timeOfDay === 'night') {
    return {
      timeOfDay: 'night',
      isNightMode: true,
      weather,
      skyTopColor: '#212748',
      skyBottomColor: '#3B3863',
      ambientIntensity: 0.78,
      sunColor: '#FFE5B4',
      label: 'Noche Estrellada 🌙',
    };
  }

  if (timeOfDay === 'sunset') {
    return {
      timeOfDay: 'sunset',
      isNightMode: false,
      weather,
      skyTopColor: '#FFB7C5',
      skyBottomColor: '#FFF5EE',
      ambientIntensity: 1.08,
      sunColor: '#FFE4D6',
      label: 'Atardecer Rosado 🌅',
    };
  }

  return {
    timeOfDay: 'day',
    isNightMode: false,
    weather,
    skyTopColor: '#CDEEFF',
    skyBottomColor: '#FFF5EE',
    ambientIntensity: 1.12,
    sunColor: '#FFF7E0',
    label: 'Día Soleado ☀️',
  };
}

export function calculateRelationshipDuration(anniversaryDate: string) {
  const start = new Date(anniversaryDate || '2023-05-14');
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - start.getTime());
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    days: Math.max(0, days),
    totalDays,
  };
}

export function daysUntilNextDate(mmddSource: string): number {
  const parts = mmddSource.split('-');
  if (parts.length < 3) return 90;
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const now = new Date();
  let target = new Date(now.getFullYear(), month, day);
  if (target.getTime() < now.getTime() - 86400000) {
    target = new Date(now.getFullYear() + 1, month, day);
  }
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}
