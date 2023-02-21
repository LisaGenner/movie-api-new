const express = require('express');
const app = express();
const mongoose = require('mongoose')


app.get('/', (request, response) => {
    response.send('hello world')
})

app.listen(5500, () => console.log("listening on 5500"))