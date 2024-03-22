import {config} from 'dotenv'
config();
import connectDb from './db/conn.js';
import { app } from './app.js';

//import mongoose from 'mongoose'

connectDb()
.then(() =>{
app.listen(process.env.PORT || 8000, () =>{
    console.log(`Server is running at port : ${
        process.env.PORT
    }`)
})

})
.catch((err)=>{
    console.log("Mongodb connection error",err)
})