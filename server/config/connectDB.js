import { connect } from "mongoose";

const connectodb = async () => {
    try {
        if (!process.env.MONGO_DB_URL) {
            console.log(`mongo db url is missing`)
        }
        connect(process.env.MONGO_DB_URL);
        console.log(`Database connected successfully`);

    } catch (error) {
        console.error(`error : ${error} `)
        process.exit(1)
    }
}


export default connectodb