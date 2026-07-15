import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`)
  .then(res => console.log('Available models:', res.data.models.map(m => m.name)))
  .catch(err => console.error('Error fetching models:', err.response?.data || err.message));
