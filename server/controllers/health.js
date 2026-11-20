import responser from "../utils/responder.js"

const getServerHealth = (req, res) => {
     try {
          return responser({
               res,
               data: [],
               message: "server is running healthy",
               status: 200,
               success: true
          })
     } catch (error) {
          return responser({
               res,
               data: [],
               message: "something went wrong",
               success: false,
               status: 3000
          })
     }
}

export{getServerHealth}