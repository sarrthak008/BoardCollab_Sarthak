
const responser = ({res,data = [], message = "boardCollab working fine",  success= true , status = 200}) => {
    return res.status(status).json({
        success : success,
        data:data,
        message:message
    })
}


export default responser;