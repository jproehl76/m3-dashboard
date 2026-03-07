export const config = {
  ownerName: 'Jonathan Proehl',
  ownerEmail: 'jonathan.proehl@gmail.com',
  carName: '2025 BMW G80 M3 Competition xDrive',
  carLogoUrl: null as string | null,   // set to a URL string, or null to use src/assets/car-logo.jpg
  stripeColors: ['#1C69D4', '#6B2D9E', '#EF3340'] as string[],
  defaultPrimaryColor: '#1C69D4',
  defaultAccentColor: '#A855F7',
  googleDriveFolderId: '1BrltfQ6HfS5O5Rkb0xU767zSpuCtLsGM',
  healthProvider: 'whoop' as 'whoop' | 'strava' | 'oura' | null,
  whoopWorkerUrl: 'https://frosty-bar-6808.jonathan-proehl.workers.dev',
  stravaWorkerUrl: '',   // set if healthProvider === 'strava'
  // Oura uses VITE_OURA_PERSONAL_TOKEN from .env — no workerUrl needed
};
