// Activate strict mode
'use strict';

// Include "dotenv" module to initialize process env
require('dotenv').config();

// Inject Express.js framework
const express = require('express');

// Path/Routing on the server directories
const path = require('path');

// Enable GZIP compression on sent packets/responses
const compression = require('compression');

// Inject Body Parser to read information which comes from POST/PUT requests
const bodyParser = require('body-parser');

// Module to catch uncaught errors and handle to avoid applicaion crashes
const uncaught = require('uncaught');

// Initialize express.js application
const app = express();

// Initialize express router class
let router = express.Router();

// Get environment mode from system variables
const environment = process.env.NODE_ENV;

// Get application port from system variables
const port = process.env.PORT;

// Get website url from system variable
const URL = process.env.URL;

// Telegraf injection and configuration
const Telegraf = require('telegraf');
const session = require('telegraf/session');
const bot = new Telegraf(process.env.BOT_TOKEN);


// Start error exception module
uncaught.start();

// Add error "watch dog" to log unexpected errors
uncaught.addListener(function (err) {
    console.log('******* START *******');
    console.log(err);
    console.log('******* END *******');
});

// GZIP compression
app.use(compression());

// app.enable('trust proxy');

// Limit request BODY size to 1mb (temporary size)
app.use(bodyParser.json({
    limit: '1mb'
}));

app.use(bodyParser.urlencoded({
    extended: true
}));

// CORS enable in the middleware to make "public" folder available for everyone
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
});

// Host static & public files
// app.use(express.static(path.join(__dirname, 'public')));

app.all('/*', (req, res, next) => {

    if (environment === 'PRODUCTION') {
        // Restrict it to the required domain
        res.header("Access-Control-Allow-Origin", URL);
    } else {
        // Available for any origin
        res.header("Access-Control-Allow-Origin", "*");
    }

    // Allow methods
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');

    // Set custom headers for CORS
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Authorization, Content-type, Accept, X-Access-Token, X-Key');

    if (req.method == 'OPTIONS') {
        res.status(200).end();
    } else {
        next();
    }

});

process.on('SIGINT', () => {
    console.log('Application terminated');
    process.exit(0);
});

// apply the routes to application
// app.use('/', router);

// Words blacklist
let wordsBlacklist = [
    'http',
    'https',
    'www',
    '.com',
    '.io'
]

// Start session with bot
bot.use(session());

// Catch text event
bot.on('text', (ctx, next) => {

    // Variables
    let text = ctx.message.text;
    let userId = ctx.message.from.id;
    let messageId = ctx.message.message_id;

    // Check members messages to avoid spam and kick spammers off
    for (var i = 0; i < wordsBlacklist.length; i++) {
        if (text.indexOf(wordsBlacklist[i]) > -1) {

            // Kick user after first warn
            if (ctx.session.warn) {
                ctx.kickChatMember(userId, 300);
            } else {
                // Set warn to true
                ctx.session.warn = true;

                // Delete user's written message
                ctx.deleteMessage(messageId);

                // Notify user about warn and possible ban
                ctx.reply('Warn!');
            }

            // Cancel loop
            break;
        }

        // Continue on array's last iteration
        if (i === (wordsBlacklist.length - 1)) {
            next();
        }
    }

});

// Open socket
bot.startPolling();

// Host application on dedicated port
app.listen(port || 3001);
