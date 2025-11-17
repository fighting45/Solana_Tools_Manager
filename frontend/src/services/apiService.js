import { API_BASE_URL, API_ENDPOINTS } from '../config/constants';

/**
 * API Service for backend communication
 */
class ApiService {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Generic fetch wrapper with error handling
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...options.headers,
      },
    };

    // Don't set Content-Type for FormData (browser will set it with boundary)
    if (!(options.body instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, config);
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        if (isJson) {
          try {
            const error = await response.json();
            errorMessage = error.error || errorMessage;
          } catch (e) {
            // If JSON parsing fails, try text
            const text = await response.text();
            errorMessage = text || errorMessage;
          }
        } else {
          const text = await response.text();
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }

      if (!isJson) {
        const text = await response.text();
        throw new Error(`Expected JSON response but got: ${text.substring(0, 100)}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  /**
   * Create mint transaction
   * @param {Object} transactionData - Transaction parameters
   * @param {File} imageFile - Image file to upload
   * @returns {Promise<Object>} Transaction data from backend
   */
  async createMintTransaction(transactionData, imageFile) {
    const formData = new FormData();
    
    // Add all transaction data as form fields
    Object.keys(transactionData).forEach(key => {
      formData.append(key, transactionData[key]);
    });
    
    // Add image file
    if (imageFile) {
      formData.append('image', imageFile);
    }

    return this.request(API_ENDPOINTS.CREATE_MINT, {
      method: 'POST',
      body: formData,
    });
  }

  /**
   * Create Token-2022 transaction with extensions
   * @param {Object} transactionData - Transaction parameters including extensions
   * @param {File} imageFile - Image file to upload
   * @returns {Promise<Object>} Transaction data from backend
   */
  async createToken2022Transaction(transactionData, imageFile) {
    const formData = new FormData();
    
    // Add all transaction data as form fields
    Object.keys(transactionData).forEach(key => {
      // Handle extensions field specially
      if (key === 'extensions') {
        // Send as comma-separated string if array, or as is if already a string
        const extensionsValue = Array.isArray(transactionData[key]) 
          ? transactionData[key].join(',') 
          : transactionData[key];
        formData.append(key, extensionsValue);
      } else {
        formData.append(key, transactionData[key]);
      }
    });
    
    // Add image file
    if (imageFile) {
      formData.append('image', imageFile);
    }

    // Use the endpoint that supports extensions
    const endpoint = API_ENDPOINTS.CREATE_TOKEN2022_NEW || API_ENDPOINTS.CREATE_TOKEN2022;
    return this.request(endpoint, {
      method: 'POST',
      body: formData,
    });
  }

  /**
   * Get available Token-2022 extensions
   * @returns {Promise<Object>} Available extensions
   */
  async getToken2022Extensions() {
    return this.request(API_ENDPOINTS.TOKEN2022_EXTENSIONS, {
      method: 'GET',
    });
  }

  /**
   * Health check endpoint
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    return this.request(API_ENDPOINTS.HEALTH, {
      method: 'GET',
    });
  }
}

// Export singleton instance
export default new ApiService();
