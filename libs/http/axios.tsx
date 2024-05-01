import axios, { AxiosResponse, AxiosError } from 'axios';
import store from '../redux/store';

//get navigation
import i18n from '@/libs/localize/localize';

const instance = axios.create({
    baseURL: process.env.REACT_APP_API_URL,
});

const { t } = i18n;

instance.interceptors.request.use(
    (config) => {
        // Get token from store
        /*
        const token = store.getState().auth.token;

        // Set token to headers
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            console.log("No token found");
            // Redirect to login page
        }
        */

        return config;
    },

    (error) => {
        return Promise.reject(error);
    }
);

instance.interceptors.response.use(
    (response: AxiosResponse) => response,

    (error: AxiosError) => {
        // Handle error
        switch (error.response?.status) {
            case 401:
                // Handle 401 error
                alert("You are not authenticated");
                break;
            case 403:
                // Handle 403 error
                console.log(t('ANANAS'));
                alert(t('ANANAS'));
                break;
            case 404:
                // Handle 404 error
                alert("Page not found");
                break;
            case 500:
                // Handle 500 error
                alert("Server error");
                break;
            default:
                // Handle other errors
                alert("Something went wrong");
                break;
        }
        return Promise.reject(error);
    }
);

export default instance;