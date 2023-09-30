const axios = require('axios').default;
const QRCode = require('qrcode');
const QrCodeTerminal = require('qrcode-terminal');
const puppeteer = require('puppeteer');
const dotenv = require('dotenv-safe');
const fs = require('fs');
const { io } = require('socket.io-client');
const { Client, RemoteAuth, LocalAuth, MessageMedia } = require('whatsapp-web.js');

dotenv.config({
    allowEmptyValues: true
});

const socket = io(process.env.SOCKET_URL);

exports.initializeClient = async(clientId) => {

    try {

        const client = new Client({
            authStrategy: new LocalAuth({
                clientId:clientId
            }),
            puppeteer:{
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--start-maximized',
                    '--no-default-browser-check',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--ignore-certificate-errors',
                    '--ignore-certificate-errors-spki-list',
                    '--disable-extensions',
                ]
            }
        });

        console.log('INICIANDO CLIENT: ' + client.authStrategy.clientId);

        client.on('qr', async(qr) => {
            let qrCodeBase64 = await QRCode.toDataURL(qr);
            socket.emit('QrCodeRecebido', qrCodeBase64);
        });

        client.on('ready', async() => {
            console.log('Client is ready!');
            socket.emit("clientReady");

        });

        client.on('disconnected', () => {
            console.log(`CLIENTE ${client.authStrategy.clientId} DESCONECTADO`);
            socket.emit("clientDisconected");
        })

        client.on('message', async(message) => {

            let getContato = await message.getContact();

            let contato = getContato.number;
            let contatoNome = getContato.pushname;
            let mensagem = message.body;
            let mediaType = false;
            let isMedia = false;

            if(message.hasMedia == true){
                isMedia = true;

                let mediaFile = await message.downloadMedia();

                mediaType = mediaFile?.mimetype;
                mensagem = mediaFile?.data;

            }else{
                mediaType = false;
                isMedia = false;
            }

            socket.emit("mensagemRecebida", mensagem, contato, contatoNome, mediaType, isMedia);
        });  

    
        client.initialize();

        socket.on("obterChatContato", async function(contact){

            let numberId = await client.getNumberId(contact);
            let numberFormatado = numberId._serialized;

            let contato = await client.getContactById(numberFormatado);
            let chat = await contato.getChat();

            let contatoNome = contato.pushname;
            let isMedia = false;
            let mediaType = null;
            let fromMe = null;

            let messages = await chat.fetchMessages({limit: 9999});

            for (let index = 0; index < messages.length; index++) {
                var messagesArray = messages[index];

                if(messagesArray.hasMedia == true){
                    isMedia = true;
                    let mediaFile = await messagesArray.downloadMedia();
                    mediaType = mediaFile?.mimetype;
                    fromMe = messagesArray.fromMe;

                    messagesArray = mediaFile?.data;

                }else{
                    mediaType = false;
                    isMedia = false;
                    fromMe = messagesArray.fromMe;
                }

                socket.emit('chatContatoObtido', messagesArray, contatoNome, isMedia, mediaType, fromMe);
                
            }
        })

        socket.on("enviarMensagem", async function (msg, contadoSelecionado, isFile, fileBase64, mimetype) {

            let numberId = await client.getNumberId(contadoSelecionado);

            let numberFormatado = numberId._serialized;

            let contato = await client.getContactById(numberFormatado);
            let chat = await contato.getChat();
            
            await chat.sendStateTyping();

            if(isFile == true){
                let base64fileSanitizado = fileBase64.replace(`data:${mimetype};base64,`, "");
                let media = new MessageMedia(mimetype, base64fileSanitizado);
                await client.sendMessage(numberFormatado, media);
                if(msg && msg != ''){
                    await client.sendMessage(numberFormatado, msg);
                }
            }else{
                await client.sendMessage(numberFormatado, msg);
            }

            await chat.clearState();

        })
        
    } catch (error) {
        console.log(error);
        return error;
    }

}