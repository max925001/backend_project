import {config} from 'dotenv'
config();
import connectDb from './db/conn.js';

//import mongoose from 'mongoose'

connectDb()