import axios from 'axios';
import dotenv from 'dotenv';

import { getFromSecure } from './secure';
dotenv.config();

const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + getFromSecure('token') || '',
  },
});

export default instance;
