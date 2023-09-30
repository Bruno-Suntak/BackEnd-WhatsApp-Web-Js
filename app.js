const express = require('express');
const cors = require('cors');
const lodash = require('lodash');
const dotenv = require('dotenv-safe');
const { Server } = require('socket.io');
const whatsappWebController = require('./src/Controllers/client-whatsapp-web.controller.js');
const whatsappWebRoute = require('./src/routes/client-whatsapp-web.route.js');

dotenv.config({
    allowEmptyValues: true
});

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: '*'
}));

//ROUTES
app.use('/', whatsappWebRoute);

var http = require('http').Server(app);

const io = new Server(http, {
    maxHttpBufferSize: 5e64,
    cors: {
        origin:process.env.SOCKET_URL,
        methods: ["GET", "POST"],
        credentials: true
    }
});

io.on("connection", function (socket) {

    socket.emit("hello", "world");

    //EVENTOS EMITIDOS DO FRONT PARA A CONTROLLER
    socket.on("reqEnviarMensagem", function(msg, contadoSelecionado, isFile, fileBase64, mimetype){
        socket.broadcast.emit("enviarMensagem", msg, contadoSelecionado, isFile, fileBase64, mimetype);
    });

    socket.on("reqChatContato", function(contato){
        socket.broadcast.emit("obterChatContato", contato);
    });


    //EVENTOS EMITIDOS DA CONTROLLER PARA O FRONT
    socket.on("mensagemRecebida", function(msg, contato, contatoNome, mediaType, isMedia){
        socket.broadcast.emit("mensagemParaFront", msg, contato, contatoNome, mediaType, isMedia);
    });

    socket.on("chatContatoObtido", function(chat, contatoNome, isMedia, mediaType, fromMe){
        socket.broadcast.emit("chatContatoParaFront", chat, contatoNome, isMedia, mediaType, fromMe);
    });

    socket.on('QrCodeRecebido', function(qr){
        socket.broadcast.emit("QrCodeParaFront", qr);
    });

    socket.on('clientReady', function(){
        socket.broadcast.emit("clientIniciado");
    });

    socket.on('clientDisconected', function(){
        socket.broadcast.emit("clientDesconectado");
    });
});

var port = process.env.PORT ? process.env.PORT : 3020; 
http.listen(port, function(){
    console.log(`Servidor ouvindo na porta ${port}`);
  });

module.exports = app