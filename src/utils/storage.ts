interface StoredData {
  simulationState: any;
  leaderboard: Array<{ name: string, wins: number, eliminations: number }>;
  submissions: Record<string, number>;
}

// Simple device fingerprinting
const getDeviceId = (): string => {
  const { userAgent, language, platform } = navigator;
  const screenProps = `${screen.width},${screen.height},${screen.colorDepth}`;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return btoa(`${userAgent}${language}${platform}${screenProps}${timeZone}`);
};

export const saveDotData = async (data: StoredData): Promise<void> => {
  try {
    localStorage.setItem('dotGamesData', JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save data:', error);
  }
};

export const getDotData = async (): Promise<StoredData | null> => {
  try {
    const data = localStorage.getItem('dotGamesData');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to load data:', error);
    return null;
  }
};

export const canSubmitDot = (): boolean => {
  try {
    const data = localStorage.getItem('dotGamesData');
    if (!data) return true;
    
    const { submissions } = JSON.parse(data);
    const deviceId = getDeviceId();
    const lastSubmission = submissions?.[deviceId] || 0;
    
    // Check if last submission was before the most recent midnight ET
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(0, 0, 0, 0);
    
    return !lastSubmission || lastSubmission < midnight.getTime();
  } catch (error) {
    console.error('Failed to check submission status:', error);
    return false;
  }
};

export const recordSubmission = (): void => {
  try {
    const data = localStorage.getItem('dotGamesData');
    const parsedData = data ? JSON.parse(data) : { submissions: {} };
    
    const deviceId = getDeviceId();
    parsedData.submissions = parsedData.submissions || {};
    parsedData.submissions[deviceId] = Date.now();
    
    localStorage.setItem('dotGamesData', JSON.stringify(parsedData));
  } catch (error) {
    console.error('Failed to record submission:', error);
  }
};