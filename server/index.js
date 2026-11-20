import express from "express";
import cors from "cors"
import { config } from "dotenv";
config()
const app = express();
const PORT =  process.env.PORT || 5000 


// configs
import connectodb from "./config/connectDB.js";

app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173"
}))
app.use(express.json())
app.use(express.urlencoded({extended:true}))

// controllers
import { getServerHealth } from "./controllers/health.js";


app.get("/health",getServerHealth)




app.listen(PORT,async()=>{
    await connectodb()
    console.log(`app listen on the ${PORT}`)
})