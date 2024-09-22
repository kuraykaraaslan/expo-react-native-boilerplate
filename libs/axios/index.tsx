import axios, { AxiosInstance as AxiosInstanceOrg, AxiosRequestConfig, AxiosResponse } from 'axios';

console.log( process.env.EXPO_PUBLIC_API_URL );
// Create a new Axios instance
const AxiosInstance: AxiosInstanceOrg = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL, // Set the base URL
    timeout: 5000, // Set a timeout value in milliseconds
    headers: {
        'Content-Type': 'application/json', // Set the default content type
    },
});

// Add request interceptor
AxiosInstance.interceptors.request.use(
    (config: any) => {
        // You can modify the request config here
        return config;
    },
    (error: any) => {
        // Handle request error here
        return Promise.reject(error);
    }
);

// Add response interceptor
AxiosInstance.interceptors.response.use(
    (response: AxiosResponse) => {
        // You can modify the response data here
        return response;
    },
    (error: any) => {
        // Handle response error here
        return Promise.reject(error);
    }
);

export default AxiosInstance;