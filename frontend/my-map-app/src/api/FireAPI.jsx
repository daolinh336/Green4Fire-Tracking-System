const API_CONFIG = {
  BASE_URL: 'https://vdhgbth050.execute-api.ap-southeast-2.amazonaws.com/production/firmsfire',
  //BASE_URL: '',
  TIMEOUT: 20000,
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY: 10000
};

// ========== API SERVICE ==========
const FireAPI = {
  async fetchFires(params = {}) {
    const queryParams = new URLSearchParams({
      region: 'SouthEast_Asia',
      min_conf: 50,
      ...params
    });

    const url = `${API_CONFIG.BASE_URL}?${queryParams}`;
    
    for (let attempt = 1; attempt <= API_CONFIG.RETRY_ATTEMPTS; attempt++) {
      try {
        console.log(`🔥 Fetching fires (attempt ${attempt}/${API_CONFIG.RETRY_ATTEMPTS})...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json'
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ Loaded ${data.features?.length || 0} fire points`);
        return data;

      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed:`, error.message);
        
        if (attempt === API_CONFIG.RETRY_ATTEMPTS) {
          throw new Error(`Failed after ${API_CONFIG.RETRY_ATTEMPTS} attempts: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, API_CONFIG.RETRY_DELAY));
      }
    }
  },

  convertToFirePoints(geojson) {
    if (!geojson?.features) return [];

    return geojson.features.map(feature => {
      const props = feature.properties;
      const coords = feature.geometry.coordinates;

      return {
        id: feature.id || `${coords[1]}-${coords[0]}-${props.acq_datetime_utc}`,
        latitude: coords[1],
        longitude: coords[0],
        confidence: props.confidence >= 80 ? 'high' :
                    props.confidence >= 60 ? 'medium' :
                    props.confidence >= 30 ? 'low' : 'unknown',
        location: 'Điểm cháy',
        timestamp: new Date(props.acq_datetime_utc).getTime() || 'N/A',
        brightness: props.brightness || 'N/A',
        brightness_2: props.brightness_2 || 'N/A',
        frp: props.frp || 'N/A',
        satellite: props.satellite || 'N/A',
        instrument: props.instrument || 'N/A',
        scan: props.scan || 'N/A',
        track: props.track || 'N/A',
        source: props.source || 'N/A',
        region: props.region || 'N/A'
      };
    });
  }
};

export default FireAPI;