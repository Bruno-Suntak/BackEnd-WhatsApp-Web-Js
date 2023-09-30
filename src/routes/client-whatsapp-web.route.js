const express = require('express');
const { initializeClient } = require('../Controllers/client-whatsapp-web.controller.js');
const dotenv = require('dotenv-safe');

dotenv.config({
    allowEmptyValues: true
});

const router = express.Router();

router.post("/iniciarClient", async(req,res) => {
    try {

        let clientId = req.body?.clientId ? req.body?.clientId : undefined;
        
        if(clientId == null || clientId == undefined){
            return res.status(401).json({error: true, message:"Favor Informar um ClientId"});
        }

        res.status(200).json({error:false, message:"Iniciando Client"});

        let result;
        result = await initializeClient(clientId);

    } catch (error) {
        console.log(error);
        return error;
    }
})

module.exports = router