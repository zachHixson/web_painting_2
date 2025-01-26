const express = require('express');
const socket = require('socket.io');
const fs = require('fs');

const STROKE_PATH = "./save/strokes.json";
const MAX_STROKES = 100;

var app = express();
var server = app.listen(3000);
var io = socket(server);
var strokes = {strokes : []};

app.use(express.static('public'));
io.sockets.on('connection', newConnection);
io.origins("*:*");

fs.readFile(STROKE_PATH, (err, data) => {
    if (err){
        if (!fs.existsSync(STROKE_PATH)){
            saveStrokes();
        }
        else{
            console.error(err);
        }
        return;
    }
    
    strokes = JSON.parse(data);
})

function newConnection(newSocket){
    console.log("New Connection " + newSocket.id);

    newSocket.on('getStrokes', sendStrokes);
    newSocket.on('commitBuffer', commitBuffer);
    newSocket.on('clearCanvas', clearCanvas);

    function commitBuffer(newStroke){
        strokes.strokes.push(newStroke);
        newSocket.broadcast.emit('newStroke', newStroke);

        if (strokes.strokes.length > MAX_STROKES){
            strokes.strokes.shift();
        }

        saveStrokes();
    }    

    function sendStrokes(){
        let curTime = new Date().getTime();

        //clean strokes
        for (let i = strokes.strokes.length - 1; i >= 0; i--){
            let strokeAge = curTime - strokes.strokes[i].creationTime;

            if ( strokes.strokes[i].lifeTime != null && strokeAge > strokes.strokes[i].lifeTime){
                strokes.strokes.splice(i, 1);
            }
        }

        newSocket.emit('receiveStrokes', strokes.strokes);
    }

    function clearCanvas(){
        strokes = {strokes:[]};
        io.sockets.emit('receiveStrokes', strokes.strokes);
        saveStrokes();
    }
}

function saveStrokes(){
    fs.writeFile(STROKE_PATH, JSON.stringify(strokes), (err) => {
        if (err){
            console.error(err);
        }
    });
}